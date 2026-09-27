"""Re-score the stored gradient-boosted models against their committed metrics.

Loads each saved pipeline, predicts the two held-out partitions and compares the
result with `reports/force2020_gbdt_baseline.json`. No refit, so this is the fast
half of the reproducibility check: `train_gbdt_baseline.py --verify` is the slow
half, and this file is what proves that the artifact on disk is the model the
report describes.

The metrics come from `data/ml/common/force2020_lithology.py`, the same functions
the Random Forest baseline and the training script use, so a difference in a
number here is a difference in the model and never in the scoring.

Requires the `ml` extra. LightGBM must be imported before scikit-learn; the
shared module does that, and a test asserts the ordering.

    python data/ml/lithology/evaluation/evaluate_gbdt_baseline.py --print-summary
    python data/ml/lithology/evaluation/evaluate_gbdt_baseline.py --check
"""
from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import lightgbm  # noqa: F401  (imported first on purpose; see the shared module)
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "common"))

import force2020_lithology as shared  # noqa: E402

TOLERANCE = 1e-9


def num(value: float | None, digits: int = 4) -> str:
    return "n/a" if value is None else f"{value:.{digits}f}"


def pipeline_path(model: str) -> Path:
    return shared.TRAINING_DIR / f"{shared.artifact_stem(model)}.pipeline.joblib"


def stored_features(model: str) -> list[str]:
    path = shared.TRAINING_DIR / f"{shared.artifact_stem(model)}.features.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload["depth_in_primary_features"] is not False:
        raise ValueError(f"{model}: stored feature list claims a depth feature")
    if payload["feature_selection_performed"] is not False:
        raise ValueError(f"{model}: stored feature list claims feature selection")
    return [str(value) for value in payload["primary_feature_columns"]]


def score_stored_model(model: str, pipeline: Any) -> dict[str, Any]:
    """Predict the held-out partitions with a stored pipeline and score them."""
    label = shared.GBDT_LABELS[model]
    classes = [int(entry["encoded_id"]) for entry in shared.class_table()]
    lookup = shared.encoded_to_class_name()
    matrix = shared.read_penalty_matrix()["matrix"]
    index_map = shared.penalty_index_map()

    features = stored_features(model)
    shared.assert_logs_only(features)
    report = shared.read_gbdt_report()
    committed_features = [str(value) for value in report["features"]["primary"]]
    if features != committed_features:
        raise ValueError(
            f"{label}: stored features {features} do not match the committed report "
            f"{committed_features}"
        )
    classifier = pipeline.named_steps["classifier"]
    class_check = shared.assert_twelve_classes(classifier, label)

    frame = shared.load_dataset([shared.WELL, shared.SPLIT, shared.TARGET, *shared.LOG_COLUMNS])
    wells = {
        split: sorted(str(value) for value in frame.loc[frame[shared.SPLIT] == split, shared.WELL].unique())
        for split in shared.ALL_SPLITS
    }
    results: dict[str, Any] = {}
    for split in shared.EVAL_SPLITS:
        guard = shared.assert_no_well_overlap(wells[shared.TRAIN_SPLIT], wells[split])
        part = frame.loc[frame[shared.SPLIT] == split]
        y_true = part[shared.TARGET].to_numpy(dtype=np.int64)
        y_pred = pipeline.predict(part.loc[:, features].to_numpy(dtype=np.float64)).astype(np.int64)
        per_class = shared.per_class_metrics(y_true, y_pred, classes, lookup)
        results[split] = {
            "rows": int(y_true.size),
            "wells": int(part[shared.WELL].nunique()),
            "leakage_guard": guard,
            "aggregate": shared.aggregate_metrics(
                y_true, y_pred, classes, int(y_true.size), int(part[shared.WELL].nunique()), per_class
            ),
            "per_class": per_class,
            "penalty": shared.penalty_metrics(y_true, y_pred, matrix, index_map),
        }
    return {"model": model, "label": label, "class_handling": class_check, "results": results}


def compare(rescore: dict[str, Any], committed: dict[str, Any]) -> list[str]:
    """Every headline and per-class number, compared at full float precision."""
    problems: list[str] = []
    label = rescore["label"]
    for split in shared.EVAL_SPLITS:
        fresh = rescore["results"][split]
        stored = committed["results"][split]
        for path, left, right in (
            ("rows", fresh["rows"], stored["rows"]),
            ("wells", fresh["wells"], stored["wells"]),
            (
                "macro_f1",
                fresh["aggregate"]["macro_f1"]["value"],
                stored["aggregate"]["macro_f1"]["value"],
            ),
            (
                "macro_f1_supported_only",
                fresh["aggregate"]["macro_f1_supported_only"]["value"],
                stored["aggregate"]["macro_f1_supported_only"]["value"],
            ),
            (
                "weighted_f1",
                fresh["aggregate"]["weighted_f1"]["value"],
                stored["aggregate"]["weighted_f1"]["value"],
            ),
            (
                "balanced_accuracy",
                fresh["aggregate"]["balanced_accuracy"]["value"],
                stored["aggregate"]["balanced_accuracy"]["value"],
            ),
            (
                "penalty",
                fresh["penalty"]["competition_score"],
                stored["penalty"]["competition_score"],
            ),
        ):
            if isinstance(left, float) or isinstance(right, float):
                if left is None or right is None:
                    if left is not right:
                        problems.append(f"{label} {split} {path}: {left} != {right}")
                elif abs(float(left) - float(right)) > TOLERANCE:
                    problems.append(f"{label} {split} {path}: {left} != {right}")
            elif left != right:
                problems.append(f"{label} {split} {path}: {left} != {right}")

        fresh_classes = {int(row["encoded_id"]): row for row in fresh["per_class"]}
        for row in stored["per_class"]:
            encoded = int(row["encoded_id"])
            other = fresh_classes[encoded]
            for field in ("support", "predicted", "precision", "recall", "f1"):
                left, right = other[field], row[field]
                if left is None or right is None:
                    # A null is a claim about undefinedness, not a number to
                    # interpolate: both sides must agree that it is undefined.
                    if (left is None) != (right is None):
                        problems.append(
                            f"{label} {split} class {encoded} {field}: {left} != {right}"
                        )
                elif isinstance(left, float) and abs(float(left) - float(right)) > 1e-6:
                    problems.append(f"{label} {split} class {encoded} {field}: {left} != {right}")
                elif not isinstance(left, float) and left != right:
                    problems.append(f"{label} {split} class {encoded} {field}: {left} != {right}")
    return problems


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail if the stored model does not reproduce the committed metrics",
    )
    parser.add_argument("--print-summary", action="store_true", help="print a summary to stdout")
    parser.add_argument("--model", choices=["xgb", "lgbm", "both"], default="both")
    args = parser.parse_args(argv)
    wanted = ["xgb", "lgbm"] if args.model == "both" else [args.model]

    import joblib

    report = shared.read_gbdt_report()
    payload: dict[str, Any] = {}
    problems: list[str] = []
    for model in wanted:
        if model not in report["models"]:
            raise SystemExit(f"the committed report has no {shared.GBDT_LABELS[model]} section")
        path = pipeline_path(model)
        if not path.exists():
            raise SystemExit(
                f"{path} does not exist. Fit the model first: make train-force2020-gbdt"
            )
        rescore = score_stored_model(model, joblib.load(path))
        payload[model] = rescore
        # compare() wants the whole primary experiment, because it reaches into
        # the per-split "results" block itself.
        problems.extend(
            compare(rescore, report["models"][model]["experiments"]["primary"])
        )

    out = shared.EVALUATION_DIR / "force2020_gbdt_baseline.rescore.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "report_id": "force2020-gbdt-rescore",
                "committed_report": shared.GBDT_REPORT_JSON.relative_to(shared.REPO_ROOT).as_posix(),
                "models": {
                    model: {
                        "label": value["label"],
                        "class_handling": value["class_handling"],
                        "results": {
                            split: {
                                "rows": value["results"][split]["rows"],
                                "wells": value["results"][split]["wells"],
                                "macro_f1": value["results"][split]["aggregate"]["macro_f1"]["value"],
                                "macro_f1_supported_only": value["results"][split]["aggregate"][
                                    "macro_f1_supported_only"
                                ]["value"],
                                "weighted_f1": value["results"][split]["aggregate"]["weighted_f1"][
                                    "value"
                                ],
                                "balanced_accuracy": value["results"][split]["aggregate"][
                                    "balanced_accuracy"
                                ]["value"],
                                "penalty_score": value["results"][split]["penalty"][
                                    "competition_score"
                                ],
                            }
                            for split in shared.EVAL_SPLITS
                        },
                    }
                    for model, value in payload.items()
                },
            },
            indent=2,
            ensure_ascii=True,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {out.relative_to(shared.REPO_ROOT).as_posix()}")

    for value in payload.values():
        for split in shared.EVAL_SPLITS:
            row = value["results"][split]["aggregate"]
            print(
                f"  {value['label']:9s} {split:16s}: macro F1 {num(row['macro_f1']['value'])}, "
                f"supported-only {num(row['macro_f1_supported_only']['value'])}, weighted F1 "
                f"{num(row['weighted_f1']['value'])}, balanced acc "
                f"{num(row['balanced_accuracy']['value'])}, penalty "
                f"{num(value['results'][split]['penalty']['competition_score'])} over "
                f"{value['results'][split]['rows']:,} rows / {value['results'][split]['wells']} wells"
            )

    if problems:
        print(f"\n{len(problems)} mismatch(es) against the committed report:")
        for line in problems:
            print(f"  {line}")
        return 1
    print("\nStored models reproduce the committed metrics exactly.")
    return 0 if not args.check else 0


if __name__ == "__main__":
    raise SystemExit(main())
