#!/usr/bin/env python3
"""FORCE 2020 lithology: Random Forest baseline. Fit, score, and stop.

This is the first modelling stage and it is deliberately one model: a
Random Forest on the five log curves the dataset-construction stage approved.
It establishes a reproducible floor to measure later stages against. It is not
a tuned model, not the best model, and not a production model, and the report it
writes says so in those words.

What it does:

  * fits on the source's own `train` wells and scores the two held-out
    well-disjoint partitions, unchanged
  * imputes inside an sklearn Pipeline so every fitted statistic comes from
    training rows only
  * scores with per-class precision/recall/F1, macro F1, weighted F1, balanced
    accuracy, a confusion matrix, and the FORCE 2020 published penalty matrix
  * runs two diagnostics the stage was asked for, and labels them as
    diagnostics: DEPTH_MD alone, and the five missingness masks
  * runs one more diagnostic, the unweighted refit, so the class-weighting
    decision is measured rather than asserted

What it does not do: no hyperparameter search, no feature selection, no other
model family, no API, no second dataset, no merge with FORGE Utah, and no
change to the 12-class taxonomy. The stored table is opened read-only and is
never written.

Artifacts land under the gitignored interim root for this dataset
(`data/interim/ml/force2020_litho/{training,evaluation}`), never in the frozen
`data/processed/` and never in the hand-off contract tree `data/ml/`. The
committed outputs are the report pair under `reports/`.

Usage:
    python data/ml/lithology/training/train_rf_baseline.py --print-summary
    python data/ml/lithology/training/train_rf_baseline.py --verify
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "data" / "ml" / "common"))

import force2020_lithology as shared  # noqa: E402
from force2020_lithology import RFConfig  # noqa: E402

EXPERIMENTS: dict[str, dict[str, Any]] = {
    "primary": {
        "title": "Primary: five log curves",
        "features": shared.PRIMARY_FEATURES,
        "kind": "primary",
        "class_weight": "balanced_subsample",
        "note": (
            "The lithology model. Logs only, no DEPTH_MD, no coordinates, no masks."
        ),
    },
    "depth_only": {
        "title": "Diagnostic: DEPTH_MD alone",
        "features": shared.DEPTH_ONLY_FEATURES,
        "kind": "diagnostic",
        "class_weight": "balanced_subsample",
        "note": (
            "A depth-only diagnostic, not a lithology model. It exists to measure how much "
            "of the task is solvable from depth by itself, which is the number that makes "
            "any later logs-only claim meaningful. DEPTH_MD is never combined with the logs "
            "in this stage."
        ),
    },
    "logs_plus_masks": {
        "title": "Diagnostic: five log curves plus the five missingness masks",
        "features": shared.MASKED_FEATURES,
        "kind": "diagnostic_ablation",
        "class_weight": "balanced_subsample",
        "note": (
            "An ablation against the primary, and the only two feature sets compared here. "
            "The masks are the 0/1 columns the dataset stage already stores; no other feature "
            "is added."
        ),
    },
    "primary_unweighted": {
        "title": "Diagnostic: primary feature set, unweighted",
        "features": shared.PRIMARY_FEATURES,
        "kind": "diagnostic_weighting",
        "class_weight": None,
        "note": (
            "The unweighted refit that settles whether class_weight was necessary. It is a "
            "diagnostic, not a candidate configuration: the primary configuration stays the "
            "one declared in the report."
        ),
    },
}

REPORT_ID = "force2020-rf-baseline"
STAGE = "first modelling stage: Random Forest baseline, then stop"
LIMITS = [
    "This is a baseline. It is the reproducible floor this repository measures later stages "
    "against, not a tuned or selected model, and no claim of being the best available model "
    "is made or implied.",
    "The 12-class taxonomy is the source's NPD lithostratigraphic vocabulary, unchanged. It "
    "is not the FORGE Utah 16B cuttings vocabulary, and no mapping to it exists or is "
    "proposed.",
    "Two classes are thin in the training partition: Basement (103 rows) and Halite (8,213 "
    "rows over three wells). Per-class scores for those classes are estimates from very "
    "little data and are reported with their support so they can be discounted.",
    "Balanced class weights were applied and are recorded. A single unweighted refit is "
    "included as a diagnostic, but deciding the weighting scheme properly, like every other "
    "hyperparameter, belongs to a later tuning stage that this stage does not enter.",
    "The evaluation partitions are ten wells each. A well-disjoint score on ten wells has "
    "real variance between well sets, and no confidence interval is computed here.",
    "Predictions are independent per depth row. Real lithology logs are autocorrelated down "
    "hole, so the effective sample size is smaller than the row count suggests. No "
    "windowing or smoothing was used, and none is proposed, because it would change the "
    "feature set this stage was given.",
    "Missing curves are imputed with a training-median inside the pipeline. A row whose "
    "curve is absent therefore looks like a row whose curve sits at the median, which is a "
    "known weakness of median imputation rather than a property of the data.",
    "The penalty score is computed against the published FORCE 2020 matrix, but this table "
    "is not the competition's own evaluation set and the score is not comparable to any "
    "published leaderboard result.",
    "No model is deployed, served or integrated anywhere. There is no API endpoint and no "
    "frontend change in this stage.",
]


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 22), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: Sequence[dict[str, Any]], columns: Sequence[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(columns), lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def pct(value: float | None) -> str:
    return "n/a" if value is None else f"{value * 100:.3f}%"


def num(value: float | None, digits: int = 4) -> str:
    return "n/a" if value is None else f"{value:.{digits}f}"


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
def load_partitions() -> tuple[pd.DataFrame, dict[str, list[str]]]:
    """The table, plus the well list of every split, for the leakage guard."""
    frame = shared.load_dataset()
    wells = {
        split: sorted(str(value) for value in frame.loc[frame.SPLIT == split, shared.WELL].unique())
        for split in shared.ALL_SPLITS
    }
    return frame, wells


def feature_matrix(frame: pd.DataFrame, features: Sequence[str]) -> np.ndarray:
    return frame.loc[:, list(features)].to_numpy(dtype=np.float64)


# ---------------------------------------------------------------------------
# One experiment: fit on train, score on both held-out partitions
# ---------------------------------------------------------------------------
def run_experiment(
    key: str,
    definition: dict[str, Any],
    frame: pd.DataFrame,
    wells: dict[str, list[str]],
    base_config: RFConfig,
    classes: Sequence[int],
    lookup: dict[int, str],
    matrix: Any,
    index_map: dict[int, int],
) -> tuple[dict[str, Any], Any, dict[str, Any]]:
    features = list(definition["features"])
    allow = [column for column in features if column not in shared.PRIMARY_FEATURES]
    shared.assert_logs_only(features, allow=allow)

    config = RFConfig(**{**base_config.__dict__, "class_weight": definition["class_weight"]})
    pipeline = shared.build_pipeline(config, features)

    train = frame.loc[frame.SPLIT == shared.TRAIN_SPLIT]
    x_train = feature_matrix(train, features)
    y_train = train[shared.TARGET].to_numpy(dtype=np.int64)

    started = time.perf_counter()
    pipeline.fit(x_train, y_train)
    fit_seconds = time.perf_counter() - started

    imputer = pipeline.named_steps["imputer"]
    if len(imputer.statistics_) != len(features):
        raise SystemExit(
            f"{key}: the imputer produced {len(imputer.statistics_)} columns for "
            f"{len(features)} features. A column that is entirely missing in train is "
            "dropped by SimpleImputer, which would silently change the feature set."
        )
    forest = pipeline.named_steps["classifier"]
    fitted_classes = [int(value) for value in forest.classes_]
    if fitted_classes != list(classes):
        raise SystemExit(
            f"{key}: the forest was fitted on classes {fitted_classes}, not the declared "
            f"{list(classes)}. A class absent from train would silently vanish."
        )

    support = {
        int(encoded): int(count)
        for encoded, count in zip(*np.unique(y_train, return_counts=True), strict=True)
    }
    weights = (
        _class_weight_table(classes, lookup, y_train, config.class_weight)
        if config.class_weight is not None
        else None
    )

    results: dict[str, Any] = {}
    for split in shared.EVAL_SPLITS:
        evaluation = frame.loc[frame.SPLIT == split]
        guard = shared.assert_no_well_overlap(wells[shared.TRAIN_SPLIT], wells[split])
        started = time.perf_counter()
        y_pred = pipeline.predict(feature_matrix(evaluation, features)).astype(np.int64)
        predict_seconds = time.perf_counter() - started
        y_true = evaluation[shared.TARGET].to_numpy(dtype=np.int64)
        results[split] = _score(
            split, y_true, y_pred, evaluation, classes, lookup, matrix, index_map, guard
        )
        results[split]["runtime_predict_seconds"] = round(predict_seconds, 1)

    training: dict[str, Any] = {
        "experiment_key": key,
        "title": definition["title"],
        "kind": definition["kind"],
        "note": definition["note"],
        "features": features,
        "feature_count": len(features),
        "configuration": config.to_dict(),
        "rows_fitted": int(len(train)),
        "wells_fitted": int(train[shared.WELL].nunique()),
        "class_weight_applied": config.class_weight,
        "class_weights": weights,
        "train_class_support": [
            {
                "encoded_id": int(encoded),
                "class_name": lookup[int(encoded)],
                "rows": support.get(int(encoded), 0),
            }
            for encoded in classes
        ],
        "imputation": {
            "strategy": shared.IMPUTER_STRATEGY,
            "fitted_on": "train partition rows only",
            "medians": {
                column: float(value) for column, value in zip(features, imputer.statistics_, strict=True)
            },
            "columns_produced": len(imputer.statistics_),
            "note": shared.IMPUTER_NOTE,
        },
        "feature_importances": {
            column: round(float(value), 6)
            for column, value in zip(features, forest.feature_importances_, strict=True)
        },
        "results": results,
    }
    runtime = {
        "experiment_key": key,
        "fit_seconds": round(fit_seconds, 1),
        "predict_seconds_by_split": {
            split: round(results[split]["runtime_predict_seconds"], 1) for split in shared.EVAL_SPLITS
        },
    }
    for split in shared.EVAL_SPLITS:
        results[split].pop("runtime_predict_seconds")
    return training, pipeline, runtime


def _class_weight_table(
    classes: Sequence[int], lookup: dict[int, str], y_train: np.ndarray, scheme: str
) -> list[dict[str, Any]]:
    """The weights the forest actually used, so the decision is measurable.

    `balanced_subsample` is recomputed inside every bootstrap draw, so this is
    the balanced rule evaluated on the full fitting partition: it is what the
    scheme is defined by, not a sample of the per-tree weights.
    """
    if scheme != "balanced_subsample":
        raise SystemExit(f"unexpected weighting scheme {scheme!r}")
    counts = np.bincount(y_train, minlength=max(classes) + 1)
    weights = y_train.size / (len(classes) * np.maximum(counts, 1))
    return [
        {
            "encoded_id": int(encoded),
            "class_name": lookup[int(encoded)],
            "train_rows": int(counts[encoded]),
            "weight": round(float(weights[encoded]), 4),
        }
        for encoded in classes
    ]


def _score(
    split: str,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    evaluation: pd.DataFrame,
    classes: Sequence[int],
    lookup: dict[int, str],
    matrix: Any,
    index_map: dict[int, int],
    guard: dict[str, Any],
) -> dict[str, Any]:
    wells = int(evaluation[shared.WELL].nunique())
    per_class = shared.per_class_metrics(y_true, y_pred, classes, lookup)
    counts, table = shared.confusion_frame(y_true, y_pred, classes, lookup)
    return {
        "split": split,
        "rows": int(y_true.size),
        "wells": wells,
        "leakage_guard": guard,
        "aggregate": shared.aggregate_metrics(y_true, y_pred, classes, int(y_true.size), wells, per_class),
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


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def build_report(
    experiments: dict[str, dict[str, Any]],
    frame: pd.DataFrame,
    wells: dict[str, list[str]],
    manifest: dict,
    classes: Sequence[int],
    lookup: dict[int, str],
    matrix_record: dict,
    base_config: RFConfig,
) -> dict:
    primary = experiments["primary"]
    depth = experiments["depth_only"]
    masked = experiments["logs_plus_masks"]
    unweighted = experiments["primary_unweighted"]
    support = np.array([row["rows"] for row in primary["train_class_support"]])
    ratio = float(support.max() / max(int(support.min()), 1))

    return {
        "report_id": REPORT_ID,
        "stage": STAGE,
        "model_status": {
            "role": "baseline",
            "is_best_model": False,
            "is_tuned": False,
            "is_production_ready": False,
            "deployed": False,
            "statement": (
                "This is the Random Forest baseline. It exists to be a reproducible floor "
                "that later stages can be measured against, and nothing in this repository "
                "should describe it as the best, optimal or production-ready model."
            ),
        },
        "experiment": {
            "experiment_id": shared.EXPERIMENT_ID,
            "dataset_id": shared.DATASET_ID,
            "entrypoint": "data/ml/lithology/training/train_rf_baseline.py",
            "artifact_root": shared.ARTIFACT_ROOT.relative_to(REPO_ROOT).as_posix(),
            "dataset_sha256": manifest["sha256"],
            "dataset_rows": manifest["rows"],
            "dataset_manifest": shared.FEATURE_MANIFEST.relative_to(REPO_ROOT).as_posix(),
            "source_commit": manifest["provenance"]["source_commit"],
            "source_id": manifest["provenance"]["source_id"],
            "archive_doi": manifest["provenance"]["archive_doi"],
            "taxonomy_id": manifest["taxonomy"]["taxonomy_id"],
            "class_count": manifest["taxonomy"]["class_count"],
            "mapped_to_canonical": manifest["taxonomy"]["mapped_to_canonical"],
        },
        "dataset": {
            "dataset_id": shared.DATASET_ID,
            "grain": manifest["grain"],
            "rows": manifest["rows"],
            "wells": manifest["wells"],
            "path": shared.FEATURE_CSV.relative_to(REPO_ROOT).as_posix(),
            "source": {
                "source_id": manifest["provenance"]["source_id"],
                "source_name": manifest["provenance"]["source_name"],
                "resolved_commit_sha": manifest["provenance"]["source_commit"],
                "archive_doi": manifest["provenance"]["archive_doi"],
                "licence": manifest["provenance"]["licence"],
            },
            "written_to_by_this_stage": [],
        },
        "features": {
            "primary": list(shared.PRIMARY_FEATURES),
            "primary_count": len(shared.PRIMARY_FEATURES),
            "missingness_masks": list(shared.MASK_COLUMNS),
            "depth_column_present_in_table": True,
            "depth_column_in_primary": False,
            "excluded_and_why": {
                shared.DEPTH: (
                    "Carried in the table so a depth diagnostic is possible, and deliberately "
                    "not a feature of the primary model. Measured separately as a diagnostic."
                ),
                "X_LOC, Y_LOC, Z_LOC": "Well trajectory. Not a log, and not a property of the rock.",
                "GROUP, FORMATION": "Stratigraphy, which is the label's own vocabulary in another form.",
                "mud temperature": (
                    "A contextual channel from a different dataset, not part of this "
                    "logs-only feature set."
                ),
            },
            "forbidden_columns_asserted_absent": sorted(shared.FORBIDDEN_FEATURE_COLUMNS),
            "feature_selection_performed": False,
        },
        "target": {
            "column": shared.TARGET,
            "encoding": manifest["label_encoding"]["rule"],
            "class_count": manifest["taxonomy"]["class_count"],
            "classes": [
                {
                    "encoded_id": int(encoded),
                    "code": code,
                    "class_name": lookup[int(encoded)],
                }
                for encoded, code in sorted(shared.encoded_to_code().items())
            ],
            "taxonomy": manifest["taxonomy"]["taxonomy_id"],
            "classes_merged": [],
            "classes_removed": [],
        },
        "split": {
            "policy": shared.split_manifest_reference()["policy"],
            "reference": shared.split_manifest_reference(),
            "reshuffled": False,
            "row_level_random_split": False,
            "fitted_on": shared.TRAIN_SPLIT,
            "evaluated_on": list(shared.EVAL_SPLITS),
            "leakage_guards": [
                {
                    "split": split,
                    **shared.assert_no_well_overlap(
                        wells[shared.TRAIN_SPLIT], wells[split]
                    ),
                }
                for split in shared.EVAL_SPLITS
            ],
            "note": (
                "Neither evaluation partition contributed a single row, a well, a fitted "
                "imputation statistic, a class weight or a feature decision. Both were read "
                "once, after fitting, to produce the numbers in this report."
            ),
        },
        "missing_value_handling": {
            "stored_dataset": (
                "Unchanged. The table keeps empty cells for absent curve samples and a 0/1 "
                "mask per curve, and this stage writes nothing back to it."
            ),
            "policy": shared.IMPUTER_NOTE,
            "strategy": shared.IMPUTER_STRATEGY,
            "where": "first step of the fitted sklearn Pipeline",
            "statistics_fitted_on": "the 1,170,511 train rows only",
            "medians_fitted": primary["imputation"]["medians"],
            "interpolation": "none",
            "neighbouring_depth_rows_used": False,
            "per_well_statistics": False,
            "masks_used_by_primary_model": False,
            "masks_preserved": list(shared.MASK_COLUMNS),
        },
        "model_configuration": {
            "primary": primary["configuration"],
            "imputation": {k: v for k, v in primary["imputation"].items() if k != "note"},
            "feature_importances": primary["feature_importances"],
            "hardware": shared.environment_facts(),
            "deterministic": (
                "random_state is fixed on the estimator and the imputer holds no state "
                "beyond the fitted medians, so a rerun on the same table with the same "
                "scikit-learn version reproduces these numbers."
            ),
        },
        "class_weighting": {
            "investigated": True,
            "decision": primary["class_weight_applied"],
            "recorded_not_silent": True,
            "train_class_support": primary["train_class_support"],
            "largest_class": primary["train_class_support"][int(np.argmax(support))]["class_name"],
            "smallest_class": primary["train_class_support"][int(np.argmin(support))]["class_name"],
            "imbalance_ratio": round(ratio, 1),
            "reasoning": (
                f"The training partition spans {ratio:,.0f}:1 between its largest and "
                "smallest class. The headline metric is macro-averaged, and an unweighted "
                "forest optimises the majority. balanced_subsample is the Random Forest "
                "convention for this: it reweights each bootstrap sample, so the weight is "
                "not applied twice to the same row."
            ),
            "weights_used": primary["class_weights"],
            "unweighted_comparison": {
                "purpose": "measure whether the weighting decision was necessary",
                "kind": "diagnostic, not a candidate configuration",
                "results": {
                    split: _comparison_row(
                        primary["results"][split]["aggregate"],
                        unweighted["results"][split]["aggregate"],
                    )
                    for split in shared.EVAL_SPLITS
                },
                "conclusion": None,
            },
        },
        "training_support": {
            "split": shared.TRAIN_SPLIT,
            "rows": primary["rows_fitted"],
            "wells": primary["wells_fitted"],
            "by_class": primary["train_class_support"],
            "missing_by_feature": {
                column: round(float(frame.loc[frame.SPLIT == shared.TRAIN_SPLIT, column].isna().mean()), 6)
                for column in shared.LOG_COLUMNS
            },
        },
        "evaluation_support": {
            split: {
                "rows": experiments["primary"]["results"][split]["rows"],
                "wells": experiments["primary"]["results"][split]["wells"],
                "by_class": [
                    {
                        "encoded_id": row["encoded_id"],
                        "class_name": row["class_name"],
                        "rows": row["support"],
                    }
                    for row in experiments["primary"]["results"][split]["per_class"]
                ],
            }
            for split in shared.EVAL_SPLITS
        },
        "primary_results": primary["results"],
        "partition_comparison": _partition_comparison(primary),
        "confusion_matrix": {
            split: experiments["primary"]["results"][split]["confusion_matrix"]
            for split in shared.EVAL_SPLITS
        },
        "depth_only_diagnostic": _diagnostic_block(depth, primary),
        "missingness_diagnostic": _diagnostic_block(masked, primary),
        "weighting_diagnostic": {
            "title": unweighted["title"],
            "kind": unweighted["kind"],
            "note": unweighted["note"],
            "features": unweighted["features"],
            "class_weight_applied": unweighted["class_weight_applied"],
            "results": unweighted["results"],
        },
        "penalty_matrix": {
            "used": True,
            "is_authoritative": matrix_record["authority"]["is_authoritative"],
            "is_homemade": matrix_record["authority"]["is_homemade"],
            "matrix_id": matrix_record["matrix_id"],
            "matrix_version": matrix_record["matrix_version"],
            "source_of_values": matrix_record["extraction"]["method"],
            "npy_present_in_checkout": matrix_record["extraction"]["npy_file_in_checkout"],
            "pinned_commit": matrix_record["source"]["resolved_commit_sha"],
            "notebook": matrix_record["source"]["notebook_path"],
            "notebook_git_blob_oid": matrix_record["source"]["notebook_git_blob_oid"],
            "recorded_at": shared.PENALTY_MATRIX_JSON.relative_to(REPO_ROOT).as_posix(),
            "formula": matrix_record["scoring"]["formula"],
            "index_order_warning": matrix_record["index_order"]["warning"],
            "symmetric": matrix_record["properties"]["symmetric"],
            "results": {
                split: primary["results"][split]["penalty"] for split in shared.EVAL_SPLITS
            },
        },
        "limitations": LIMITS,
        "reproducibility": {
            "entrypoint": "make train-force2020-rf",
            "verify": "make verify-force2020-rf",
            "artifacts_root": shared.ARTIFACT_ROOT.relative_to(REPO_ROOT).as_posix(),
            "artifacts_committed": False,
            "committed_outputs": [
                shared.REPORT_JSON.relative_to(REPO_ROOT).as_posix(),
                shared.REPORT_MD.relative_to(REPO_ROOT).as_posix(),
            ],
            "environment": shared.environment_facts(),
            "determinism": (
                "Every estimator carries random_state=42. Refitting on the same table with "
                "the same library versions reproduces these metrics exactly; the committed "
                "report contains no timings or host-specific values, so a rerun either "
                "matches it byte for byte or the table changed."
            ),
            "installed_extra": "pip install -e .[ml]",
        },
    }


def _partition_comparison(primary: dict[str, Any]) -> dict[str, Any]:
    """How far apart the two held-out partitions are, stated as a fact.

    Two ten-well partitions are two small samples. If they disagree by more than
    any plausible model change, then the disagreement is the honest headline
    and a single number would be misleading.
    """
    values = {
        split: primary["results"][split]["aggregate"]["macro_f1"]["value"]
        for split in shared.EVAL_SPLITS
    }
    defined = [value for value in values.values() if value is not None]
    spread = (max(defined) - min(defined)) if len(defined) > 1 else None
    absent = {
        split: primary["results"][split]["aggregate"]["classes_zero_support"]
        for split in shared.EVAL_SPLITS
    }
    return {
        "macro_f1_by_split": values,
        "macro_f1_spread": None if spread is None else round(spread, 6),
        "classes_zero_support_by_split": absent,
        "observation": (
            "The two partitions are scored by the same model on the same features, so the "
            "gap between them is a property of which ten wells landed where, not of the "
            "model. Any later stage that reports a single macro F1 without saying which "
            "partition it came from is hiding this."
        ),
    }


def _comparison_row(weighted: dict, unweighted: dict) -> dict[str, Any]:
    return {
        "macro_f1_weighted": weighted["macro_f1"]["value"],
        "macro_f1_unweighted": unweighted["macro_f1"]["value"],
        "macro_f1_delta": (
            None
            if weighted["macro_f1"]["value"] is None or unweighted["macro_f1"]["value"] is None
            else round(weighted["macro_f1"]["value"] - unweighted["macro_f1"]["value"], 6)
        ),
        "balanced_accuracy_weighted": weighted["balanced_accuracy"]["value"],
        "balanced_accuracy_unweighted": unweighted["balanced_accuracy"]["value"],
        "weighted_f1_weighted": weighted["weighted_f1"]["value"],
        "weighted_f1_unweighted": unweighted["weighted_f1"]["value"],
    }


def _diagnostic_block(diagnostic: dict[str, Any], primary: dict[str, Any]) -> dict[str, Any]:
    comparison = {}
    for split in shared.EVAL_SPLITS:
        row = _comparison_row(diagnostic["results"][split]["aggregate"], primary["results"][split]["aggregate"])
        comparison[split] = {
            "diagnostic_macro_f1": diagnostic["results"][split]["aggregate"]["macro_f1"]["value"],
            "diagnostic_balanced_accuracy": diagnostic["results"][split]["aggregate"]["balanced_accuracy"]["value"],
            "primary_macro_f1": primary["results"][split]["aggregate"]["macro_f1"]["value"],
            "primary_balanced_accuracy": primary["results"][split]["aggregate"]["balanced_accuracy"]["value"],
            "macro_f1_delta": row["macro_f1_delta"],
        }
    return {
        "title": diagnostic["title"],
        "kind": diagnostic["kind"],
        "note": diagnostic["note"],
        "features": diagnostic["features"],
        "results": diagnostic["results"],
        "against_primary": comparison,
    }


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------
def render_markdown(report: dict) -> str:
    lines: list[str] = []
    a = lines.append
    experiment = report["experiment"]
    split = report["split"]
    config = report["model_configuration"]["primary"]
    parameters = config["parameters"]
    primary = report["primary_results"]
    weighting = report["class_weighting"]
    matrix = report["penalty_matrix"]

    a("# FORCE 2020 lithology: Random Forest baseline")
    a("")
    a(f"**Experiment:** `{experiment['experiment_id']}`  ")
    a(f"**Dataset:** `{experiment['dataset_id']}` "
      f"(sha256 `{experiment['dataset_sha256'][:16]}...`, {experiment['dataset_rows']:,} rows)  ")
    a(f"**Pinned source commit:** `{experiment['source_commit']}`  ")
    a("**Status:** baseline. Not tuned, not the best model, not production-ready, not deployed.  ")
    a("")
    a(f"> {report['model_status']['statement']}")
    a("")

    a("## 1. Dataset")
    a("")
    dataset = report["dataset"]
    a("| | |")
    a("|---|---|")
    a(f"| Dataset id | `{dataset['dataset_id']}` |")
    a(f"| Path | `{dataset['path']}` (read-only for this stage) |")
    a(f"| Rows / wells | {dataset['rows']:,} / {dataset['wells']} |")
    a(f"| Grain | {dataset['grain']} |")
    a(f"| Source | {dataset['source']['source_name']} |")
    a(f"| Pinned commit | `{dataset['source']['resolved_commit_sha']}` |")
    a(f"| DOI / licence | {dataset['source']['archive_doi']} / {dataset['source']['licence']} |")
    a("")
    a("This is the logs-only table built by the dataset-construction stage. No row, well,")
    a("label or taxonomy was changed here, and nothing was written back to the table.")
    a("")

    a("## 2. Features")
    a("")
    features = report["features"]
    a(f"**Primary feature matrix: exactly {features['primary_count']} columns.**")
    a("")
    for column in features["primary"]:
        a(f"- `{column}`")
    a("")
    a("Excluded, and why:")
    a("")
    for column, reason in features["excluded_and_why"].items():
        a(f"- `{column}` - {reason}")
    a("")
    a(f"Feature selection performed: **{features['feature_selection_performed']}**.")
    a("")

    a("## 3. Target")
    a("")
    target = report["target"]
    a(f"- Column: `{target['column']}`, the encoded label from the dataset-construction stage.")
    a(f"- Taxonomy: `{target['taxonomy']}`, {target['class_count']} classes, unchanged.")
    a(f"- Encoding: {target['encoding']}")
    a(f"- Classes merged: {len(target['classes_merged'])}. Classes removed: {len(target['classes_removed'])}.")
    a(f"- Mapped to the FORGE Utah vocabulary: **{report['experiment']['mapped_to_canonical']}**.")
    a("")
    a("| encoded | NPD code | class |")
    a("|---:|---:|---|")
    for entry in target["classes"]:
        a(f"| {entry['encoded_id']} | {entry['code']} | {entry['class_name']} |")
    a("")

    a("## 4. Split")
    a("")
    reference = split["reference"]
    a(f"- Policy: {split['policy']}")
    a(f"- Fitted on: `{split['fitted_on']}`. Evaluated on: {', '.join(f'`{s}`' for s in split['evaluated_on'])}.")
    a(f"- Wells reshuffled: **{split['reshuffled']}**. Row-level random split: **{split['row_level_random_split']}**.")
    a(f"- Split manifest: `{reference['path']}` (sha256 `{reference['sha256'][:16]}...`, {reference['rows']} wells)")
    a("")
    a("| partition | wells | in fit | in evaluation |")
    a("|---|---:|---:|---:|")
    manifest_wells = shared.read_split_manifest()
    for name in shared.ALL_SPLITS:
        count = int(manifest_wells.loc[manifest_wells.SPLIT == name, "WELL"].nunique())
        a(f"| `{name}` | {count} "
          f"| {'yes' if name == shared.TRAIN_SPLIT else 'no'} "
          f"| {'no' if name == shared.TRAIN_SPLIT else 'yes'} |")
    a("")
    a("Leakage guard, asserted before every score:")
    a("")
    for guard in split["leakage_guards"]:
        a(f"- `{guard['split']}`: {guard['fitting_wells']} fitting wells, "
          f"{guard['evaluation_wells']} evaluation wells, **{guard['shared_wells']} shared**.")
    a("")
    a(split["note"])
    a("")

    a("## 5. Missing-value handling")
    a("")
    missing = report["missing_value_handling"]
    a(f"- Stored dataset: {missing['stored_dataset']}")
    a(f"- Strategy: `{missing['strategy']}` inside the pipeline, at `{missing['where']}`.")
    a(f"- Statistics fitted on: {missing['statistics_fitted_on']}.")
    a(f"- Interpolation: {missing['interpolation']}. Neighbouring depth rows used: "
      f"**{missing['neighbouring_depth_rows_used']}**.")
    a(f"- Per-well statistics: **{missing['per_well_statistics']}**.")
    a(f"- Missingness masks used by the primary model: **{missing['masks_used_by_primary_model']}**. "
      f"They are preserved in the table: {', '.join(f'`{c}`' for c in missing['masks_preserved'])}.")
    a("")
    a("Medians fitted on the training partition:")
    a("")
    a("| feature | training median |")
    a("|---|---:|")
    for column, value in missing["medians_fitted"].items():
        a(f"| `{column}` | {value:.6g} |")
    a("")

    a("## 6. Model configuration")
    a("")
    a(f"`{config['estimator']}`, scikit-learn {config['sklearn_version']}, no search of any kind.")
    a("")
    a("| parameter | value |")
    a("|---|---|")
    for name, value in parameters.items():
        a(f"| `{name}` | `{value}` |")
    a(f"| imputation | `{report['model_configuration']['imputation']['strategy']}` "
      f"(pipeline step 1, train rows only) |")
    a("")
    a("Deviations from the library defaults, and why:")
    a("")
    for name, reason in config["deviations_from_sklearn_defaults"].items():
        a(f"- **`{name}`**: {reason}")
    a("")
    a("Feature importances (mean decrease in impurity, impurity-weighted):")
    a("")
    a("| feature | importance |")
    a("|---|---:|")
    for column, value in report["model_configuration"]["feature_importances"].items():
        a(f"| `{column}` | {value:.4f} |")
    a("")

    a("## 7. Training support by class")
    a("")
    training = report["training_support"]
    a(f"{training['rows']:,} rows, {training['wells']} wells.")
    a("")
    a("| encoded | class | train rows | share | weight used |")
    a("|---:|---|---:|---:|---:|")
    weights = {entry["encoded_id"]: entry["weight"] for entry in weighting["weights_used"]}
    for entry in training["by_class"]:
        share = entry["rows"] / training["rows"]
        a(f"| {entry['encoded_id']} | {entry['class_name']} | {entry['rows']:,} | "
          f"{share * 100:.3f}% | {weights[entry['encoded_id']]:.2f} |")
    a("")
    a(f"Largest class {weighting['largest_class']}, smallest {weighting['smallest_class']}, "
      f"ratio **{weighting['imbalance_ratio']:,.0f}:1**.")
    a("")
    a("Missing values per feature in the training partition:")
    a("")
    a("| feature | missing |")
    a("|---|---:|")
    for column, value in training["missing_by_feature"].items():
        a(f"| `{column}` | {pct(value)} |")
    a("")

    a("## 8. Evaluation support by class")
    a("")
    a("| encoded | class | " + " | ".join(f"`{s}` rows" for s in shared.EVAL_SPLITS) + " |")
    a("|---:|---|" + "---:|" * len(shared.EVAL_SPLITS))
    for index, entry in enumerate(report["training_support"]["by_class"]):
        cells = []
        for split_name in shared.EVAL_SPLITS:
            support = report["evaluation_support"][split_name]["by_class"][index]["rows"]
            cells.append(f"{support:,}" if support else "**0**")
        a(f"| {entry['encoded_id']} | {entry['class_name']} | " + " | ".join(cells) + " |")
    a("")
    for split_name in shared.EVAL_SPLITS:
        block = report["evaluation_support"][split_name]
        absent = [row["class_name"] for row in block["by_class"] if row["rows"] == 0]
        a(f"- `{split_name}`: {block['rows']:,} rows, {block['wells']} wells"
          + (f". Zero support: {', '.join(absent)}." if absent else ". All 12 classes present."))
    a("")
    for split_name in shared.EVAL_SPLITS:
        aggregate = primary[split_name]["aggregate"]
        if aggregate["classes_zero_support"]:
            a(f"> `{split_name}` has no rows for encoded id(s) "
              f"{aggregate['classes_zero_support']}. Their precision, recall and F1 are reported "
              "as `null`, not as 0, and they still enter the 12-class macro F1 as 0, which is "
              "why `macro_f1_supported_only` is reported beside it.")
            a("")

    a("## 9. Per-class metrics")
    a("")
    for split_name in shared.EVAL_SPLITS:
        block = primary[split_name]
        a(f"### `{split_name}` ({block['rows']:,} rows, {block['wells']} wells)")
        a("")
        a("| encoded | class | support | predicted | precision | recall | F1 |")
        a("|---:|---|---:|---:|---:|---:|---:|")
        for row in block["per_class"]:
            a(f"| {row['encoded_id']} | {row['class_name']} | {row['support']:,} | {row['predicted']:,} | "
              f"{num(row['precision'])} | {num(row['recall'])} | {num(row['f1'])} |")
        a("")
        a(f"Penalty-matrix score: **{num(block['penalty']['competition_score'])}** "
          f"(mean penalty {num(block['penalty']['mean_penalty'])}, perfect score 0).")
        a("")

    a("## 10. Macro F1")
    a("")
    a("| split | macro F1 (12 classes) | macro F1 (supported only) | classes averaged |")
    a("|---|---:|---:|---:|")
    for split_name in shared.EVAL_SPLITS:
        aggregate = primary[split_name]["aggregate"]
        a(f"| `{split_name}` | **{num(aggregate['macro_f1']['value'])}** | "
          f"{num(aggregate['macro_f1_supported_only']['value'])} | "
          f"{aggregate['classes_with_support']} of {aggregate['classes_declared']} |")
    a("")
    a(f"- 12-class figure: {primary[shared.EVAL_SPLITS[0]]['aggregate']['macro_f1']['computed_from']}")
    a(f"- Supported-only figure: {primary[shared.EVAL_SPLITS[0]]['aggregate']['macro_f1_supported_only']['computed_from']}")
    a("")
    comparison = report["partition_comparison"]
    a(f"The two partitions differ by **{num(comparison['macro_f1_spread'])}** macro F1 "
      + "between them. " + comparison["observation"])
    a("")

    a("## 11. Weighted F1")
    a("")
    a("| split | weighted F1 | total weight (rows) |")
    a("|---|---:|---:|")
    for split_name in shared.EVAL_SPLITS:
        aggregate = primary[split_name]["aggregate"]
        a(f"| `{split_name}` | {num(aggregate['weighted_f1']['value'])} | {aggregate['weighted_f1']['total_weight']:,} |")
    a("")
    a(f"{primary[shared.EVAL_SPLITS[0]]['aggregate']['weighted_f1']['computed_from']}")
    a("")

    a("## 12. Balanced accuracy")
    a("")
    a("| split | balanced accuracy | classes in the recall average |")
    a("|---|---:|---:|")
    for split_name in shared.EVAL_SPLITS:
        aggregate = primary[split_name]["aggregate"]
        a(f"| `{split_name}` | {num(aggregate['balanced_accuracy']['value'])} | "
          f"{aggregate['classes_with_support']} |")
    a("")
    a(f"{primary[shared.EVAL_SPLITS[0]]['aggregate']['balanced_accuracy']['computed_from']}")
    a("")

    a("## 13. Confusion matrix")
    a("")
    for split_name in shared.EVAL_SPLITS:
        block = report["confusion_matrix"][split_name]
        a(f"### `{split_name}` - rows are the true class, columns the predicted class")
        a("")
        header = "| true \\ pred | " + " | ".join(
            f"{entry['class_name'][:6]}" for entry in block["labels"]
        ) + " | support |"
        a(header)
        a("|---" * (len(block["labels"]) + 2) + "|")
        for row in block["rows"]:
            counts_line = " | ".join(f"{cell['count']:,}" for cell in row)
            a(f"| **{row[0]['true_class']}** | {counts_line} | {row[0]['row_total']:,} |")
        a("")
    a("Per-class errors are the practical reading of this table: the off-diagonal mass in")
    a("each row is what the model confused with that class.")
    a("")

    a("## 14. Depth-only diagnostic")
    a("")
    depth = report["depth_only_diagnostic"]
    a(f"**{depth['note']}**")
    a("")
    a(f"Features: {', '.join(f'`{c}`' for c in depth['features'])}. "
      "Identical configuration otherwise, so the only change is the input.")
    a("")
    a("| split | depth-only macro F1 | depth-only balanced acc. | logs-only macro F1 | delta |")
    a("|---|---:|---:|---:|---:|")
    for split_name in shared.EVAL_SPLITS:
        row = depth["against_primary"][split_name]
        a(f"| `{split_name}` | {num(row['diagnostic_macro_f1'])} | "
          f"{num(row['diagnostic_balanced_accuracy'])} | {num(row['primary_macro_f1'])} | "
          f"{num(row['macro_f1_delta'])} |")
    a("")
    a("This is the number that gives the logs-only result its meaning: a depth-only model")
    a("recovers part of the task from geometry alone, so a high logs-only score is not")
    a("evidence by itself that the curves carry the information. It is also the reason")
    a("`DEPTH_MD` is not a feature of the primary model: a logs-only claim needs a logs-only model.")
    a("")

    a("## 15. Missingness-mask diagnostic")
    a("")
    masked = report["missingness_diagnostic"]
    a(f"**Ablation. {masked['note']}**")
    a("")
    a("A = " + ", ".join(f"`{c}`" for c in shared.PRIMARY_FEATURES))
    a("")
    a("B = A + " + ", ".join(f"`{c}`" for c in shared.MASK_COLUMNS))
    a("")
    a("| split | A: logs only | B: logs + masks | delta | B balanced acc. |")
    a("|---|---:|---:|---:|---:|")
    for split_name in shared.EVAL_SPLITS:
        row = masked["against_primary"][split_name]
        a(f"| `{split_name}` | {num(row['primary_macro_f1'])} | {num(row['diagnostic_macro_f1'])} | "
          f"{num(row['macro_f1_delta'])} | {num(row['diagnostic_balanced_accuracy'])} |")
    a("")

    a("### Class-weighting diagnostic")
    a("")
    unweighted = report["weighting_diagnostic"]
    a(f"**{unweighted['note']}**")
    a("")
    a("| split | balanced macro F1 | unweighted macro F1 | delta | balanced bal. acc. | unweighted bal. acc. |")
    a("|---|---:|---:|---:|---:|---:|")
    for split_name in shared.EVAL_SPLITS:
        row = weighting["unweighted_comparison"]["results"][split_name]
        a(f"| `{split_name}` | {num(row['macro_f1_weighted'])} | {num(row['macro_f1_unweighted'])} | "
          f"{num(row['macro_f1_delta'])} | {num(row['balanced_accuracy_weighted'])} | "
          f"{num(row['balanced_accuracy_unweighted'])} |")
    a("")
    a(weighting["reasoning"])
    a("")
    a(weighting["unweighted_comparison"]["conclusion"])
    a("")

    a("## 16. Limitations")
    a("")
    for limitation in report["limitations"]:
        a(f"- {limitation}")
    a("")

    a("## 17. Reproducibility and provenance")
    a("")
    reproducibility = report["reproducibility"]
    a(f"- Entry point: `{reproducibility['entrypoint']}`. Verification: `{reproducibility['verify']}`.")
    a(f"- Artifacts: `{reproducibility['artifacts_root']}` (gitignored, regenerated, not committed).")
    a(f"- Committed outputs: {', '.join(f'`{p}`' for p in reproducibility['committed_outputs'])}.")
    a(f"- Extra to install: `{reproducibility['installed_extra']}`.")
    a(f"- Source: `{experiment['source_id']}` at commit `{experiment['source_commit']}`, "
      f"DOI {experiment['archive_doi']}.")
    a(f"- Dataset: sha256 `{experiment['dataset_sha256']}`.")
    a(f"- Split manifest: `{reference['path']}`, sha256 `{reference['sha256']}`.")
    a("")
    a("| component | version |")
    a("|---|---|")
    for name, value in reproducibility["environment"].items():
        a(f"| {name} | {value} |")
    a("")
    a(reproducibility["determinism"])
    a("")
    a("### Penalty matrix")
    a("")
    a(f"- Matrix: `{matrix['matrix_id']}` v{matrix['matrix_version']}, "
      f"authoritative: **{matrix['is_authoritative']}**, homemade: **{matrix['is_homemade']}**.")
    a(f"- Values: {matrix['source_of_values']}.")
    a(f"- `penalty_matrix.npy` present in the checkout: **{matrix['npy_present_in_checkout']}**. "
      "The published values are recorded from the pinned source and committed at "
      f"`{matrix['recorded_at']}`.")
    a(f"- Source: `{matrix['notebook']}` (git blob `{matrix['notebook_git_blob_oid']}`) at pinned "
      f"commit `{matrix['pinned_commit']}`.")
    a(f"- Formula: `{matrix['formula']}`, perfect score {matrix['results'][shared.EVAL_SPLITS[0]]['perfect_score']}.")
    a(f"- {matrix['index_order_warning']}")
    a(f"- Symmetric: {matrix['symmetric']}, so the notebook's prose and the competition's code agree on direction.")
    a("")
    a("| split | competition score | mean penalty | rows scored |")
    a("|---|---:|---:|---:|")
    for split_name in shared.EVAL_SPLITS:
        penalty = matrix["results"][split_name]
        a(f"| `{split_name}` | {num(penalty['competition_score'])} | "
          f"{num(penalty['mean_penalty'])} | {penalty['rows_scored']:,} |")
    a("")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------
def write_artifacts(
    report: dict,
    experiments: dict[str, dict[str, Any]],
    pipeline: Any,
    runtimes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Model, preprocessing, feature list, label map, config, metrics, manifest."""
    import joblib

    training_dir = shared.TRAINING_DIR
    evaluation_dir = shared.EVALUATION_DIR
    training_dir.mkdir(parents=True, exist_ok=True)
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    stem = shared.ARTIFACT_STEM
    primary = experiments["primary"]

    pipeline_path = training_dir / f"{stem}.pipeline.joblib"
    model_path = training_dir / f"{stem}.model.joblib"
    features_path = training_dir / f"{stem}.features.json"
    labels_path = training_dir / f"{stem}.label_mapping.json"
    config_path = training_dir / f"{stem}.config.json"
    split_ref_path = training_dir / f"{stem}.split_manifest_reference.json"
    metrics_path = evaluation_dir / f"{stem}.metrics.json"
    per_class_path = evaluation_dir / f"{stem}.per_class_metrics.csv"
    confusion_path = evaluation_dir / f"{stem}.confusion_matrix.csv"
    manifest_path = evaluation_dir / f"{stem}.experiment_manifest.json"

    # The pipeline is the model of record: imputer and forest fitted together on
    # train rows only. The bare forest is saved beside it so a consumer that
    # wants its own preprocessing is not forced to reuse this one.
    joblib.dump(pipeline, pipeline_path, compress=0)
    joblib.dump(pipeline.named_steps["classifier"], model_path, compress=0)

    write_json(
        features_path,
        {
            "experiment_id": shared.EXPERIMENT_ID,
            "dataset_id": shared.DATASET_ID,
            "primary_feature_columns": list(shared.PRIMARY_FEATURES),
            "missingness_mask_columns": list(shared.MASK_COLUMNS),
            "target_column": shared.TARGET,
            "depth_column": shared.DEPTH,
            "depth_in_primary_features": False,
            "forbidden_columns": sorted(shared.FORBIDDEN_FEATURE_COLUMNS),
            "feature_selection_performed": False,
            "feature_importances": primary["feature_importances"],
            "diagnostics": {
                "depth_only": list(shared.DEPTH_ONLY_FEATURES),
                "logs_plus_masks": list(shared.MASKED_FEATURES),
            },
        },
    )
    write_json(
        labels_path,
        {
            "experiment_id": shared.EXPERIMENT_ID,
            "taxonomy_id": report["experiment"]["taxonomy_id"],
            "target_column": shared.TARGET,
            "target_raw_column": shared.TARGET_CODE,
            "target_class_column": shared.TARGET_CLASS,
            "class_count": report["target"]["class_count"],
            "encoding_rule": report["target"]["encoding"],
            "classes": report["target"]["classes"],
            "competition_index_order": shared.read_penalty_matrix()["index_order"],
            "encoded_to_competition_index": {
                str(key): value for key, value in shared.penalty_index_map().items()
            },
            "classes_merged": [],
            "classes_removed": [],
        },
    )
    write_json(
        config_path,
        {
            "experiment_id": shared.EXPERIMENT_ID,
            "model_status": report["model_status"],
            "primary": {
                "configuration": primary["configuration"],
                "imputation": primary["imputation"],
                "class_weight_applied": primary["class_weight_applied"],
                "class_weights": primary["class_weights"],
                "rows_fitted": primary["rows_fitted"],
                "wells_fitted": primary["wells_fitted"],
            },
            "experiments": {
                key: {
                    "title": value["title"],
                    "kind": value["kind"],
                    "features": value["features"],
                    "class_weight_applied": value["configuration"]["parameters"]["class_weight"],
                    "note": value["note"],
                }
                for key, value in experiments.items()
            },
            "environment": shared.environment_facts(),
            "source_commit": report["experiment"]["source_commit"],
            "dataset_sha256": report["experiment"]["dataset_sha256"],
        },
    )
    write_json(split_ref_path, shared.split_manifest_reference())

    write_json(
        metrics_path,
        {
            "experiment_id": shared.EXPERIMENT_ID,
            "dataset_id": shared.DATASET_ID,
            "primary": report["primary_results"],
            "depth_only_diagnostic": report["depth_only_diagnostic"],
            "missingness_diagnostic": report["missingness_diagnostic"],
            "weighting_diagnostic": report["weighting_diagnostic"],
            "penalty_matrix": report["penalty_matrix"],
            "undefined_score_policy": shared.UNDEFINED_NOTE,
        },
    )

    per_class_rows: list[dict[str, Any]] = []
    confusion_rows: list[dict[str, Any]] = []
    for experiment_key, experiment in experiments.items():
        for split_name, block in experiment["results"].items():
            for row in block["per_class"]:
                per_class_rows.append({"experiment": experiment_key, "split": split_name, **row})
            for row in block["confusion_matrix"]["rows"]:
                for cell in row:
                    confusion_rows.append({"experiment": experiment_key, "split": split_name, **cell})
    per_class_columns = [
        "experiment", "split", "encoded_id", "class_name", "support", "predicted",
        "precision", "recall", "f1", "zero_support", "never_predicted",
    ]
    confusion_columns = [
        "experiment", "split", "true_encoded_id", "true_class",
        "predicted_encoded_id", "predicted_class", "count", "row_total",
    ]
    write_csv(per_class_path, per_class_rows, per_class_columns)
    write_csv(confusion_path, confusion_rows, confusion_columns)

    artifacts: list[dict[str, Any]] = [
        {"role": "model_and_preprocessing_pipeline", "path": _rel(pipeline_path), "bytes": pipeline_path.stat().st_size, "sha256": sha256(pipeline_path)},
        {"role": "model_forest_only", "path": _rel(model_path), "bytes": model_path.stat().st_size, "sha256": sha256(model_path)},
        {"role": "feature_list", "path": _rel(features_path), "sha256": sha256(features_path)},
        {"role": "label_mapping", "path": _rel(labels_path), "sha256": sha256(labels_path)},
        {"role": "training_configuration", "path": _rel(config_path), "sha256": sha256(config_path)},
        {"role": "split_manifest_reference", "path": _rel(split_ref_path), "sha256": sha256(split_ref_path)},
        {"role": "metrics", "path": _rel(metrics_path), "sha256": sha256(metrics_path)},
        {"role": "per_class_metrics", "path": _rel(per_class_path), "sha256": sha256(per_class_path)},
        {"role": "confusion_matrix", "path": _rel(confusion_path), "sha256": sha256(confusion_path)},
        {"role": "report_json", "path": _rel(shared.REPORT_JSON), "sha256": sha256(shared.REPORT_JSON)},
        {"role": "report_markdown", "path": _rel(shared.REPORT_MD), "sha256": sha256(shared.REPORT_MD)},
        # The manifest cannot contain its own hash, so it lists itself by role
        # and path only rather than pretending to a digest it cannot know.
        {"role": "experiment_manifest", "path": _rel(manifest_path), "sha256": None},
    ]
    write_json(
        manifest_path,
        {
            "experiment_id": shared.EXPERIMENT_ID,
            "report_id": REPORT_ID,
            "stage": STAGE,
            "entrypoint": "data/ml/lithology/training/train_rf_baseline.py",
            "model_status": report["model_status"],
            "dataset": {
                "dataset_id": shared.DATASET_ID,
                "path": _rel(shared.FEATURE_CSV),
                "sha256": report["experiment"]["dataset_sha256"],
                "rows": report["experiment"]["dataset_rows"],
                "manifest": _rel(shared.FEATURE_MANIFEST),
            },
            "source": {
                "source_id": report["experiment"]["source_id"],
                "resolved_commit_sha": report["experiment"]["source_commit"],
                "archive_doi": report["experiment"]["archive_doi"],
            },
            "split_manifest_reference": shared.split_manifest_reference(),
            "target": {
                "column": shared.TARGET,
                "taxonomy_id": report["experiment"]["taxonomy_id"],
                "class_count": report["experiment"]["class_count"],
            },
            "features": {
                "primary": list(shared.PRIMARY_FEATURES),
                "depth_in_primary": False,
                "feature_selection_performed": False,
            },
            "missing_value_handling": {
                "strategy": shared.IMPUTER_STRATEGY,
                "fitted_on": "train partition only",
                "medians": primary["imputation"]["medians"],
            },
            "environment": shared.environment_facts(),
            "runtime_not_reproducible": runtimes,
            "artifacts": artifacts,
        },
    )
    artifacts.append(
        {"role": "experiment_manifest", "path": _rel(manifest_path), "sha256": sha256(manifest_path)}
    )
    return artifacts


def _rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def summarise(report: dict) -> None:
    primary = report["primary_results"]
    a = print
    a("FORCE 2020 Random Forest baseline")
    a(f"  experiment   : {report['experiment']['experiment_id']} (baseline, untuned)")
    a(f"  dataset      : {report['dataset']['rows']:,} rows, {report['dataset']['wells']} wells, "
      f"sha256 {report['experiment']['dataset_sha256'][:16]}")
    a(f"  features     : {', '.join(report['features']['primary'])}")
    a(f"  target       : {report['target']['column']} "
      f"({report['target']['class_count']} classes, unchanged)")
    a(f"  split        : fitted on {report['split']['fitted_on']}, scored on "
      f"{', '.join(report['split']['evaluated_on'])}, no shared wells")
    a(f"  missing      : {report['missing_value_handling']['strategy']} inside the pipeline, "
      "train rows only, no interpolation")
    a(f"  class weight : {report['class_weighting']['decision']} "
      f"({report['class_weighting']['imbalance_ratio']:,.0f}:1 imbalance)")
    for split in shared.EVAL_SPLITS:
        block = primary[split]
        aggregate = block["aggregate"]
        a(f"  {split:<16}: macro F1 {num(aggregate['macro_f1']['value'])} "
          f"(supported-only {num(aggregate['macro_f1_supported_only']['value'])}), "
          f"weighted F1 {num(aggregate['weighted_f1']['value'])}, "
          f"balanced acc {num(aggregate['balanced_accuracy']['value'])}, "
          f"penalty score {num(block['penalty']['competition_score'])} "
          f"over {block['rows']:,} rows / {block['wells']} wells")
    a(f"  depth-only   : macro F1 "
      f"{num(report['depth_only_diagnostic']['against_primary'][shared.EVAL_SPLITS[0]]['diagnostic_macro_f1'])} "
      f"on {shared.EVAL_SPLITS[0]} (diagnostic)")
    a(f"  + masks      : macro F1 "
      f"{num(report['missingness_diagnostic']['against_primary'][shared.EVAL_SPLITS[0]]['diagnostic_macro_f1'])} "
      f"on {shared.EVAL_SPLITS[0]} (ablation)")
    a(f"  report       : {_rel(shared.REPORT_JSON)}, {_rel(shared.REPORT_MD)}")
    a("  status       : baseline. Not the best model, not production-ready, not deployed.")


def verify(expected_json: dict, expected_md: str) -> int:
    failures = 0
    for name, path, expected in (
        ("report json", shared.REPORT_JSON, json.dumps(expected_json, indent=2, ensure_ascii=True) + "\n"),
        ("report markdown", shared.REPORT_MD, expected_md),
    ):
        if not path.exists():
            print(f"  {name}: MISSING {path}")
            failures += 1
            continue
        if path.read_text(encoding="utf-8") == expected:
            print(f"  {name}: MATCH")
        else:
            print(f"  {name}: MISMATCH {path}")
            failures += 1
    return failures


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--config", choices=["baseline"], default="baseline",
                        help="only the documented baseline configuration exists in this stage")
    parser.add_argument("--verify", action="store_true",
                        help="refit and diff against the committed report pair")
    parser.add_argument("--print-summary", action="store_true")
    args = parser.parse_args(argv)

    base_config = RFConfig()
    manifest = shared.read_manifest()
    matrix_record = shared.read_penalty_matrix()
    if not matrix_record["authority"]["is_authoritative"]:
        raise SystemExit(
            "the penalty matrix record is not marked authoritative. Refusing to score "
            "against a matrix this repository cannot vouch for."
        )
    classes = [entry["encoded_id"] for entry in shared.class_table()]
    lookup = shared.encoded_to_class_name()
    index_map = shared.penalty_index_map()
    if sorted(index_map) != classes:
        raise SystemExit("the penalty matrix index order does not cover all 12 classes")

    frame, wells = load_partitions()
    if frame[shared.TARGET].isna().any():
        raise SystemExit("the table has unlabelled rows; this stage scores labelled partitions only")

    experiments: dict[str, dict[str, Any]] = {}
    runtimes: list[dict[str, Any]] = []
    checkpoint_dir = shared.EVALUATION_DIR
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    pipeline = None
    for key, definition in EXPERIMENTS.items():
        training, fitted, runtime = run_experiment(
            key, definition, frame, wells, base_config, classes, lookup,
            matrix_record["matrix"], index_map,
        )
        experiments[key] = training
        runtimes.append(runtime)
        # Checkpoint each experiment as it lands. A fit of this size takes minutes,
        # and losing twelve minutes of a run to an interrupt should not also mean
        # redoing the arithmetic.
        write_json(
            checkpoint_dir / f"{shared.ARTIFACT_STEM}.{key}.json",
            {"experiment": training, "runtime": runtime},
        )
        print(
            f"  fitted {key}: {training['rows_fitted']:,} rows, "
            f"{training['feature_count']} feature(s), {runtime['fit_seconds']}s",
            flush=True,
        )
        if key == "primary":
            pipeline = fitted
        else:
            # The diagnostics are reproducible from this entrypoint, their
            # configuration and their recorded metrics, so their weights are not
            # persisted: 100 trees of a diagnostic is gigabytes nobody asked for.
            del fitted

    report = build_report(
        experiments, frame, wells, manifest, classes, lookup, matrix_record, base_config
    )
    report["class_weighting"]["unweighted_comparison"]["conclusion"] = _weighting_conclusion(report)

    # The table is opened read-only. Re-hashing it proves it: if a model stage
    # ever imputed a value back into the dataset, this is where it would show.
    digest = sha256(shared.FEATURE_CSV)
    if digest != manifest["sha256"]:
        raise SystemExit(
            f"the ingested table no longer hashes to the value in its own manifest "
            f"({digest} != {manifest['sha256']}). This stage does not write to it, so "
            "something else did. Refusing to report."
        )

    markdown = render_markdown(report)

    if args.verify:
        # Compare before writing. A verify that rewrites the artifact it is
        # checking proves nothing.
        print(
            "Verifying the committed report against a fresh fit:\n"
            f"  dataset sha256 {digest[:16]}"
        )
        return verify(report, markdown)

    write_json(shared.REPORT_JSON, report)
    shared.REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    shared.REPORT_MD.write_text(markdown, encoding="utf-8")
    artifacts = write_artifacts(report, experiments, pipeline, runtimes)
    print(f"Wrote {_rel(shared.REPORT_JSON)} and {_rel(shared.REPORT_MD)}")
    for artifact in artifacts:
        print(f"  {artifact['role']:<34} {artifact['path']}")
    if args.print_summary:
        summarise(report)
    return 0


def _weighting_conclusion(report: dict) -> str:
    """State what the unweighted refit showed, including when it showed nothing.

    The temptation with a diagnostic like this is to write whichever sentence
    supports the configuration that was already chosen. The comparison here can
    come out either way, so the conclusion is generated from the numbers and
    says so when they disagree.
    """
    rows = report["class_weighting"]["unweighted_comparison"]["results"]
    observed = {
        split: row["macro_f1_delta"]
        for split, row in rows.items()
        if row["macro_f1_delta"] is not None
    }
    if not observed:
        return (
            "Not measurable: both fits produced an undefined macro F1, so the "
            "weighting scheme could not be compared on this data."
        )
    detail = ", ".join(f"`{split}` {delta:+.4f}" for split, delta in sorted(observed.items()))
    positives = [delta for delta in observed.values() if delta > 0]
    negatives = [delta for delta in observed.values() if delta < 0]
    primary = report["primary_results"]
    spread = max(
        primary[split]["aggregate"]["macro_f1"]["value"] for split in observed
    ) - min(primary[split]["aggregate"]["macro_f1"]["value"] for split in observed)

    if positives and negatives:
        verdict = (
            f"Balanced weighting helped on one partition and hurt on the other ({detail}), "
            f"and both moves are smaller than the {spread:.3f} spread between the two "
            "partitions' macro F1 themselves. So this comparison does not show class "
            "weighting to be necessary: it shows the effect to be small and unstable "
            "across ten-well samples. The scheme is retained because it was declared "
            "before the fit and recorded as a decision, not because this evidence "
            "justifies it."
        )
    elif positives:
        verdict = (
            f"Balanced weighting raised macro F1 on every held-out partition ({detail}), "
            "which is consistent with the declared decision. One configuration on ten "
            "wells per partition is a single observation, not a tuned result."
        )
    else:
        verdict = (
            f"Balanced weighting lowered macro F1 on every held-out partition ({detail}), "
            "so the evidence does not support the weighting that was applied. It is kept "
            "for the baseline because the scheme was fixed before the fit and a baseline "
            "is not revised after seeing its score; a later stage should treat the "
            "weighting scheme as an open hyperparameter, not a settled one."
        )
    return (
        f"{verdict} Either way, one configuration on ten-well partitions is evidence "
        "about this baseline, not a settled question; the weighting scheme is a "
        "hyperparameter like any other and belongs to a later tuning stage."
    )


if __name__ == "__main__":
    raise SystemExit(main())
