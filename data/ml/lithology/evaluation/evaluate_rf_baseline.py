#!/usr/bin/env python3
"""Score the saved FORCE 2020 Random Forest baseline. No fitting happens here.

This is the `evaluation/` half of the lithology hand-off contract, and it exists
because scoring a model and training it are different jobs with different
failure modes. It loads the fitted pipeline the training stage saved, re-runs it
over the two held-out well-disjoint partitions, and writes the same metric
blocks again. Nothing is refitted, so if the numbers here disagree with the
committed report, either the artifact or the table changed under the model.

Two uses:

  * an integrator scores a stored artifact without a training run
  * `--check` proves the committed report still describes the stored model,
    which is a reproducibility claim about the *artifact* rather than about a
    refit

Usage:
    python data/ml/lithology/evaluation/evaluate_rf_baseline.py --print-summary
    python data/ml/lithology/evaluation/evaluate_rf_baseline.py --check
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "data" / "ml" / "common"))

import force2020_lithology as shared  # noqa: E402

RESCORE_JSON = shared.EVALUATION_DIR / f"{shared.ARTIFACT_STEM}.rescore.json"
PIPELINE_PATH = shared.TRAINING_DIR / f"{shared.ARTIFACT_STEM}.pipeline.joblib"


def num(value: float | None, digits: int = 4) -> str:
    return "n/a" if value is None else f"{value:.{digits}f}"


def score_stored_model(pipeline: Any) -> dict[str, Any]:

    classes = [entry["encoded_id"] for entry in shared.class_table()]
    lookup = shared.encoded_to_class_name()
    matrix = shared.read_penalty_matrix()["matrix"]
    index_map = shared.penalty_index_map()
    features_path = shared.TRAINING_DIR / f"{shared.ARTIFACT_STEM}.features.json"
    stored_features = json.loads(features_path.read_text(encoding="utf-8"))
    features = list(stored_features["primary_feature_columns"])
    shared.assert_logs_only(features)
    if stored_features["depth_in_primary_features"] is not False:
        raise ValueError("stored feature list claims a depth feature")
    committed = json.loads(shared.REPORT_JSON.read_text(encoding="utf-8"))["features"]["primary"]
    if list(features) != list(committed):
        raise ValueError(
            f"stored feature list {list(features)} does not match the committed report {list(committed)}"
        )

    frame = shared.load_dataset()
    wells = {
        split: sorted(str(value) for value in frame.loc[frame.SPLIT == split, shared.WELL].unique())
        for split in shared.ALL_SPLITS
    }
    results: dict[str, Any] = {}
    for split in shared.EVAL_SPLITS:
        guard = shared.assert_no_well_overlap(wells[shared.TRAIN_SPLIT], wells[split])
        evaluation = frame.loc[frame.SPLIT == split]
        y_true = evaluation[shared.TARGET].to_numpy(dtype=np.int64)
        y_pred = pipeline.predict(evaluation.loc[:, features].to_numpy(dtype=np.float64)).astype(np.int64)
        per_class = shared.per_class_metrics(y_true, y_pred, classes, lookup)
        counts, table = shared.confusion_frame(y_true, y_pred, classes, lookup)
        results[split] = {
            "split": split,
            "rows": int(y_true.size),
            "wells": int(evaluation[shared.WELL].nunique()),
            "leakage_guard": guard,
            "aggregate": shared.aggregate_metrics(
                y_true, y_pred, classes, int(y_true.size), int(evaluation[shared.WELL].nunique()), per_class
            ),
            "per_class": per_class,
            "penalty": shared.penalty_metrics(y_true, y_pred, matrix, index_map),
            "confusion_matrix": {
                "row_meaning": "true class",
                "column_meaning": "predicted class",
                "labels": [
                    {"encoded_id": int(encoded), "class_name": lookup[int(encoded)]} for encoded in classes
                ],
                "counts": counts.tolist(),
                "rows": table,
            },
        }
        del evaluation
    return {
        "experiment_id": shared.EXPERIMENT_ID,
        "scored_artifact": PIPELINE_PATH.relative_to(REPO_ROOT).as_posix(),
        "features": features,
        "fitted_on_partition": shared.TRAIN_SPLIT,
        "refitted": False,
        "results": results,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--json", default=str(RESCORE_JSON), help="where to write the rescore")
    parser.add_argument(
        "--check",
        action="store_true",
        help="compare against the committed report and change nothing",
    )
    parser.add_argument("--print-summary", action="store_true")
    args = parser.parse_args(argv)

    if not PIPELINE_PATH.exists():
        raise SystemExit(
            f"no fitted pipeline at {PIPELINE_PATH}. Run "
            "`python data/ml/lithology/training/train_rf_baseline.py` first."
        )

    import joblib

    rescore = score_stored_model(joblib.load(PIPELINE_PATH))

    if args.check:
        report = json.loads(shared.REPORT_JSON.read_text(encoding="utf-8"))
        failures = 0
        for split in shared.EVAL_SPLITS:
            committed = report["primary_results"][split]
            fresh = rescore["results"][split]
            for field in ("aggregate", "per_class", "penalty", "confusion_matrix"):
                if committed[field] != fresh[field]:
                    print(f"  {split} {field}: MISMATCH between the committed report and the stored model")
                    failures += 1
                else:
                    print(f"  {split} {field}: MATCH")
            for key in ("rows", "wells"):
                if committed[key] != fresh[key]:
                    print(f"  {split} {key}: MISMATCH {committed[key]} != {fresh[key]}")
                    failures += 1
        if failures:
            print(f"  {failures} mismatch(es). The stored model no longer describes the committed report.")
            return 1
        print("  the stored model reproduces the committed report exactly")
        return 0

    out = Path(args.json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rescore, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"Wrote {out.relative_to(REPO_ROOT).as_posix()}")
    if args.print_summary:
        for split in shared.EVAL_SPLITS:
            block = rescore["results"][split]
            aggregate = block["aggregate"]
            print(
                f"  {split:<16}: macro F1 {num(aggregate['macro_f1']['value'])}, "
                f"balanced acc {num(aggregate['balanced_accuracy']['value'])}, "
                f"penalty {num(block['penalty']['competition_score'])} "
                f"over {block['rows']:,} rows / {block['wells']} wells"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
