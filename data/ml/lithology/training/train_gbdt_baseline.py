"""Stage 5: gradient-boosted tree models on FORCE 2020 lithology.

XGBoost and LightGBM, measured against the Random Forest baseline that already
exists in `train_rf_baseline.py`. The point of this stage is a *comparison*, so
everything that could tilt that comparison is held fixed and declared rather
than chosen here:

* the same table, read read-only, at the same pinned commit;
* the same five log curves, and no depth, coordinate, stratigraphy, derived,
  windowed or gradient feature;
* the same encoded 12-class target, with no class merged, dropped or remapped;
* the same authoritative well-level split, fitted on the 98 train wells and
  scored on the two held-out ten-well partitions, both read only after fitting;
* the same median imputation, as the first step of a fitted sklearn Pipeline,
  with statistics learned from the training partition alone;
* the same metric functions, imported from
  `data/ml/common/force2020_lithology.py` rather than reimplemented, so a
  zero-support class is null here exactly as it is in the forest's report;
* the same artifact location, under the gitignored interim root.

What differs is the estimator and its own documented configuration, and the
class-weighting mechanism, which is the one place where the two families
genuinely cannot be identical: neither boosting library takes a `class_weight`
argument the way a forest does, so the balancing is expressed as per-row sample
weights and measured against an unweighted refit of each model rather than
assumed to transfer from the forest.

No hyperparameter search, no cross-validation, no early stopping on an
evaluation partition, and no use of `hidden_test` or `leaderboard_test` to
choose anything. Both configurations were fixed before fitting.

Requires the `ml` extra (`pip install -e .[ml]`). Note the import-order
requirement documented at the top of `data/ml/common/force2020_lithology.py`:
LightGBM must be imported before scikit-learn on this platform, and that module
handles it for every process that imports it.

    python data/ml/lithology/training/train_gbdt_baseline.py --print-summary
    python data/ml/lithology/training/train_gbdt_baseline.py --verify
    python data/ml/lithology/training/train_gbdt_baseline.py --model lgbm
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

# The shared module imports LightGBM before scikit-learn, which is required on
# this platform. Importing it here first is belt and braces: it costs nothing and
# it keeps the safe order even if the shared module is ever refactored.
import lightgbm  # noqa: F401
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "common"))

import force2020_lithology as shared  # noqa: E402

REPORT_ID = "force2020-gbdt-baseline"
STAGE = "modelling / gradient-boosted tree baseline"
PRIMARY = "primary"

# Four fits per model, the same four the Random Forest baseline ran: the primary
# logs-only model, a DEPTH_MD-only diagnostic, a missingness-mask ablation, and
# an unweighted refit of the primary. The diagnostics exist to keep the primary
# claim honest; none of them is a candidate configuration.
EXPERIMENTS: tuple[dict[str, Any], ...] = (
    {
        "key": PRIMARY,
        "kind": "primary",
        "features": shared.PRIMARY_FEATURES,
        "weighted": True,
        "title": "Primary: five log curves",
        "note": (
            "The model under test. Exactly the five approved log curves, exactly as "
            "the Random Forest baseline uses them, with balanced sample weights."
        ),
    },
    {
        "key": "depth_only",
        "kind": "diagnostic_depth",
        "features": shared.DEPTH_ONLY_FEATURES,
        "weighted": True,
        "title": "Depth-only diagnostic",
        "note": (
            "A depth diagnostic, not a lithology model. It measures how much of the "
            "task is reachable from DEPTH_MD alone, which is the number that gives a "
            "logs-only result its meaning. DEPTH_MD is never combined with the logs in "
            "the primary experiment."
        ),
    },
    {
        "key": "logs_plus_masks",
        "kind": "diagnostic_ablation",
        "features": shared.MASKED_FEATURES,
        "weighted": True,
        "title": "Missingness-mask ablation",
        "note": (
            "The five 0/1 missingness masks the dataset stage already stores, added to "
            "the five logs and to nothing else. The masks are preserved in the table and "
            "measured here; they are deliberately not in the primary comparison."
        ),
    },
    {
        "key": "primary_unweighted",
        "kind": "diagnostic_weighting",
        "features": shared.PRIMARY_FEATURES,
        "weighted": False,
        "title": "Unweighted refit",
        "note": (
            "The same features with no sample weights, fitted to settle whether the "
            "balancing was necessary for this library. A diagnostic, not a candidate "
            "configuration: the primary configuration stays the declared one."
        ),
    },
)

# Required recorded parameters, per family, so a report cannot quietly omit one.
REQUIRED_PARAMETERS: dict[str, tuple[str, ...]] = {
    "xgb": (
        "n_estimators",
        "max_depth",
        "learning_rate",
        "subsample",
        "colsample_bytree",
        "min_child_weight",
        "objective",
        "eval_metric",
        "random_state",
        "tree_method",
    ),
    "lgbm": (
        "n_estimators",
        "num_leaves",
        "max_depth",
        "learning_rate",
        "subsample",
        "subsample_freq",
        "colsample_bytree",
        "objective",
        "metric",
        "random_state",
    ),
}

FAIRNESS_CONTRACT: tuple[str, ...] = (
    "Dataset: force2020-litho-logs-v0.1, the same pinned commit and the same file, read read-only.",
    "Features: CALI, RDEP, RMED, DTC, GR. No DEPTH_MD, no X_LOC/Y_LOC/Z_LOC, no GROUP or FORMATION, "
    "no mud temperature, no FORGE Utah lithology, no derived rolling features, no gradients, no windows.",
    "Target: TARGET_ENCODED, the 12-class encoded target from the dataset-construction stage. No class "
    "merged, removed or remapped.",
    "Split: the source's own 98 / 10 / 10 well partition, unchanged. No well or row reshuffled.",
    "Missing values: SimpleImputer(strategy='median') as the first step of a fitted sklearn Pipeline, "
    "statistics from the 98 training wells only. No interpolation, no per-well statistic, and the stored "
    "dataset is not modified.",
    "Metrics: the functions in data/ml/common/force2020_lithology.py, imported rather than "
    "reimplemented, including the published penalty matrix in the competition's own index order.",
    "Artifact location: the gitignored interim root, one stem per model, with a full experiment manifest.",
)


# ---------------------------------------------------------------------------
# Small local helpers
# ---------------------------------------------------------------------------
def num(value: float | None, digits: int = 4) -> str:
    return "n/a" if value is None else f"{value:.{digits}f}"


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: Sequence[dict[str, Any]], columns: Sequence[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [",".join(columns)]
    for row in rows:
        cells = []
        for column in columns:
            value = row.get(column)
            cells.append("" if value is None else str(value).replace(",", ""))
        lines.append(",".join(cells))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(shared.REPO_ROOT).as_posix()


# ---------------------------------------------------------------------------
# Fitting and scoring
# ---------------------------------------------------------------------------
def feature_matrix(frame: Any, features: Sequence[str]) -> np.ndarray:
    shared.assert_logs_only(features, allow=(*shared.MASK_COLUMNS, shared.DEPTH))
    return frame.loc[:, list(features)].to_numpy(dtype=np.float64)


def fit_experiment(
    model: str,
    definition: dict[str, Any],
    train_frame: Any,
    frame: Any,
    wells: dict[str, list[str]],
    classes: Sequence[int],
    lookup: dict[int, str],
    matrix: Sequence[Sequence[float]],
    index_map: dict[int, int],
) -> tuple[dict[str, Any], Any, float]:
    """Fit one experiment on the training wells, then score both held-out splits.

    The order in this function is the fairness argument: everything that touches
    the estimator is derived from `train_frame` alone, and the evaluation
    partitions are indexed only after `fit` has returned.
    """
    features = list(definition["features"])
    if definition["kind"] == "primary" or definition["kind"] == "diagnostic_weighting":
        shared.assert_logs_only(features)

    y_train = train_frame[shared.TARGET].to_numpy(dtype=np.int64)
    x_train = feature_matrix(train_frame, features)
    support = shared.train_class_support(y_train, len(classes))
    weights = (
        shared.balanced_sample_weights(y_train, len(classes)) if definition["weighted"] else None
    )

    pipeline = shared.build_gbdt_pipeline(model, features)
    started = time.perf_counter()
    if weights is None:
        pipeline.fit(x_train, y_train)
    else:
        pipeline.fit(x_train, y_train, classifier__sample_weight=weights)
    elapsed = time.perf_counter() - started
    classifier = pipeline.named_steps["classifier"]
    class_check = shared.assert_twelve_classes(classifier, shared.GBDT_LABELS[model])
    medians = pipeline.named_steps["imputer"].statistics_

    results: dict[str, Any] = {}
    for split in shared.EVAL_SPLITS:
        guard = shared.assert_no_well_overlap(wells[shared.TRAIN_SPLIT], wells[split])
        part = frame.loc[frame[shared.SPLIT] == split]
        y_true = part[shared.TARGET].to_numpy(dtype=np.int64)
        y_pred = pipeline.predict(feature_matrix(part, features)).astype(np.int64)
        per_class = shared.per_class_metrics(y_true, y_pred, classes, lookup)
        counts, table = shared.confusion_frame(y_true, y_pred, classes, lookup)
        results[split] = {
            "split": split,
            "rows": int(y_true.size),
            "wells": int(part[shared.WELL].nunique()),
            "leakage_guard": guard,
            "aggregate": shared.aggregate_metrics(
                y_true, y_pred, classes, int(y_true.size), int(part[shared.WELL].nunique()), per_class
            ),
            "per_class": per_class,
            "penalty": shared.penalty_metrics(y_true, y_pred, matrix, index_map),
            "confusion_matrix": {
                "row_meaning": "true class",
                "column_meaning": "predicted class",
                "labels": [lookup[int(value)] for value in classes],
                "counts": counts.tolist(),
                "cells": table,
            },
        }

    record: dict[str, Any] = {
        "experiment": definition["key"],
        "kind": definition["kind"],
        "title": definition["title"],
        "note": definition["note"],
        "features": features,
        "feature_count": len(features),
        "class_weighting": (
            "balanced per-row sample weights from the training partition"
            if definition["weighted"]
            else None
        ),
        "imputation": {
            "strategy": shared.IMPUTER_STRATEGY,
            "fitted_on": "the 98 training wells only",
            "medians": {
                feature: shared._round(float(medians[index]), 6)
                for index, feature in enumerate(features)
            },
        },
        "train_class_support": {str(key): value for key, value in support.items()},
        "class_handling": class_check,
        "results": results,
    }
    if definition["key"] == PRIMARY:
        record["feature_importance"] = shared.feature_importance(classifier, model, features)
    return record, pipeline, elapsed


# ---------------------------------------------------------------------------
# Per-class error analysis, descriptive only
# ---------------------------------------------------------------------------
def error_analysis(experiments: dict[str, Any], classes: Sequence[int], lookup: dict[int, str]) -> dict[str, Any]:
    """Describe where a model does well, where it does badly, and what it confuses.

    Every statement here is read off the confusion matrix and the per-class
    metrics. No geological cause is asserted, because nothing in this dataset
    establishes one.
    """
    primary = experiments[PRIMARY]
    out: dict[str, Any] = {
        "method": (
            "Descriptive only. Every statement below is arithmetic on the confusion "
            "matrix and the per-class metrics. No geological or causal interpretation "
            "is offered, because nothing in this dataset supports one."
        )
    }
    for split in shared.EVAL_SPLITS:
        result = primary["results"][split]
        per_class = result["per_class"]
        cells = result["confusion_matrix"]["cells"]
        supported = [row for row in per_class if row["support"] > 0 and row["f1"] is not None]
        ranked = sorted(supported, key=lambda row: float(row["f1"]), reverse=True)
        zero_support = [row for row in per_class if row["support"] == 0]

        confusions: list[dict[str, Any]] = []
        for row in cells:
            total = int(row[0]["row_total"])
            if total == 0:
                continue
            off = [cell for cell in row if cell["predicted_encoded_id"] != row[0]["true_encoded_id"]]
            worst = max(off, key=lambda cell: int(cell["count"]))
            if int(worst["count"]) == 0:
                continue
            confusions.append(
                {
                    "true_encoded_id": int(row[0]["true_encoded_id"]),
                    "true_class": str(row[0]["true_class"]),
                    "most_confused_with": str(worst["predicted_class"]),
                    "predicted_encoded_id": int(worst["predicted_encoded_id"]),
                    "count": int(worst["count"]),
                    "share_of_true_class": round(int(worst["count"]) / total, 6),
                }
            )
        confusions.sort(key=lambda entry: int(entry["count"]), reverse=True)

        rare = {}
        for encoded_id in (10, 8):
            row = next(item for item in per_class if int(item["encoded_id"]) == encoded_id)
            name = lookup[encoded_id]
            if int(row["support"]) == 0:
                rare[name] = {
                    "encoded_id": encoded_id,
                    "support": 0,
                    "predicted": int(row["predicted"]),
                    "statement": (
                        f"{name} has no rows in {split}. Its precision, recall and F1 "
                        "are null rather than 0, and it still contributes 0 to the "
                        "12-class macro F1."
                    ),
                }
            else:
                row_cells = cells[encoded_id]
                total = int(row_cells[0]["row_total"])
                off = sorted(
                    (cell for cell in row_cells if cell["predicted_encoded_id"] != encoded_id),
                    key=lambda cell: int(cell["count"]),
                    reverse=True,
                )
                rare[name] = {
                    "encoded_id": encoded_id,
                    "support": int(row["support"]),
                    "predicted": int(row["predicted"]),
                    "precision": row["precision"],
                    "recall": row["recall"],
                    "f1": row["f1"],
                    "mostly_confused_with": str(off[0]["predicted_class"]) if off else None,
                    "mostly_confused_count": int(off[0]["count"]) if off else 0,
                    "share_of_true_class": (
                        round(int(off[0]["count"]) / total, 6) if off and total else None
                    ),
                }

        out[split] = {
            "strongest_classes": [
                {"class": row["class_name"], "f1": row["f1"], "support": int(row["support"])}
                for row in ranked[:3]
            ],
            "weakest_classes": [
                {"class": row["class_name"], "f1": row["f1"], "support": int(row["support"])}
                for row in ranked[-3:][::-1]
            ],
            "zero_support_classes": [
                {"class": row["class_name"], "predicted": int(row["predicted"])}
                for row in zero_support
            ],
            "largest_confusions": confusions[:6],
            "rare_class_detail": rare,
        }
    return out


# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------
def build_model_section(
    model: str,
    experiments: dict[str, Any],
    train_support: dict[int, int],
    train_rows: int,
) -> dict[str, Any]:
    config = shared.GBDT_CONFIGS[model]
    recorded = config.to_dict()
    parameters = recorded["parameters"]
    missing = [name for name in REQUIRED_PARAMETERS[model] if name not in parameters]
    if missing:
        raise ValueError(f"{model} configuration is missing required parameters: {missing}")

    weights = {str(key): shared._round(train_rows / (len(train_support) * value), 4) for key, value in train_support.items()}
    primary = experiments[PRIMARY]
    return {
        "model": model,
        "label": shared.GBDT_LABELS[model],
        "experiment_id": shared.experiment_id(model),
        "artifact_stem": shared.artifact_stem(model),
        "configuration": recorded,
        "required_parameters_recorded": list(REQUIRED_PARAMETERS[model]),
        "class_handling": {
            "strategy": recorded["class_handling"],
            "train_class_support": {str(key): value for key, value in train_support.items()},
            "imbalance_ratio": round(max(train_support.values()) / min(train_support.values()), 1),
            "weights_used": weights,
            "note": shared.SAMPLE_WEIGHT_NOTE,
        },
        "experiments": experiments,
        "headline": {
            split: {
                "macro_f1": primary["results"][split]["aggregate"]["macro_f1"]["value"],
                "macro_f1_supported_only": primary["results"][split]["aggregate"][
                    "macro_f1_supported_only"
                ]["value"],
                "weighted_f1": primary["results"][split]["aggregate"]["weighted_f1"]["value"],
                "balanced_accuracy": primary["results"][split]["aggregate"]["balanced_accuracy"][
                    "value"
                ],
                "penalty_score": primary["results"][split]["penalty"]["competition_score"],
            }
            for split in shared.EVAL_SPLITS
        },
        "feature_importance": primary["feature_importance"],
        "error_analysis": error_analysis(experiments, [int(row["encoded_id"]) for row in primary["results"][shared.EVAL_SPLITS[0]]["per_class"]], shared.encoded_to_class_name()),
    }


def build_report(
    model_sections: dict[str, Any],
    frame: Any,
    wells: dict[str, list[str]],
    manifest: dict[str, Any],
    matrix_record: dict[str, Any],
    train_support: dict[int, int],
) -> dict[str, Any]:
    lookup = shared.encoded_to_class_name()
    classes = [int(value) for value in train_support]
    return {
        "report_id": REPORT_ID,
        "stage": STAGE,
        "model_status": (
            "baseline comparison stage. Neither model is tuned, and neither is the best model "
            "on this dataset. Not production-ready, not deployed, not served."
        ),
        "purpose": (
            "Compare two gradient-boosted tree models against the existing Random Forest "
            "baseline on identical data, features, target, split, preprocessing and metrics. "
            "The comparison is the deliverable; neither model is being proposed as a "
            "replacement for anything."
        ),
        "experimental_fairness": {
            "identical_to_random_forest": list(FAIRNESS_CONTRACT),
            "what_differs_and_why": [
                "The estimator and its documented configuration, which is the subject of the comparison.",
                "The class-weighting mechanism. A forest takes class_weight='balanced_subsample'; "
                "neither boosting library has that argument, so the same intent is expressed as "
                "per-row sample weights. Measured per library, not carried over from the forest.",
                "The deterministic settings. LightGBM needs deterministic=True and force_row_wise=True "
                "to reproduce this report byte for byte; that is reproducibility, not accuracy.",
            ],
            "model_selection": {
                "performed": False,
                "test_partitions_used_for_selection": False,
                "note": shared.MODEL_SELECTION_NOTE,
            },
        },
        "experiment": {
            "experiment_ids": {model: shared.experiment_id(model) for model in model_sections},
            "dataset_id": shared.DATASET_ID,
            "entrypoint": "data/ml/lithology/training/train_gbdt_baseline.py",
            "artifact_root": rel(shared.ARTIFACT_ROOT),
            "dataset_sha256": manifest["sha256"],
            "dataset_rows": int(len(frame)),
            "dataset_manifest": rel(shared.FEATURE_MANIFEST),
            "source_commit": manifest["provenance"]["source_commit"],
            "source_id": manifest["provenance"]["source_id"],
            "archive_doi": manifest["provenance"].get("archive_doi"),
            "source_name": manifest["provenance"].get("source_name"),
            "licence": manifest["provenance"].get("licence"),
            "taxonomy_id": manifest["taxonomy"]["taxonomy_id"],
            "class_count": len(classes),
            "mapped_to_canonical": False,
        },
        "dataset": {
            "dataset_id": shared.DATASET_ID,
            "path": rel(shared.FEATURE_CSV),
            "sha256": manifest["sha256"],
            "rows": int(len(frame)),
            "wells": int(frame[shared.WELL].nunique()),
            "grain": "one row per (WELL, DEPTH_MD) at source grain",
            "read_only": (
                "The table is re-hashed after fitting and compared with its own manifest. "
                "A mismatch aborts the report, because this stage does not write to it, so "
                "a mismatch means something else did."
            ),
        },
        "features": {
            "primary": list(shared.PRIMARY_FEATURES),
            "primary_count": len(shared.PRIMARY_FEATURES),
            "missingness_masks": list(shared.MASK_COLUMNS),
            "depth_column_present_in_table": True,
            "depth_column_in_primary": False,
            "forbidden_columns_asserted_absent": sorted(shared.FORBIDDEN_FEATURE_COLUMNS),
            "feature_selection_performed": False,
            "derived_features_added": [],
            "excluded_and_why": {
                "DEPTH_MD": (
                    "Carried in the table so a depth diagnostic is possible, and deliberately "
                    "not a feature of the primary experiment. Measured separately as a diagnostic."
                ),
                "X_LOC, Y_LOC, Z_LOC": "Well trajectory. Not a log, and not a property of the rock.",
                "GROUP, FORMATION": "Stratigraphy, which is the label's own vocabulary in another form.",
                "mud temperature": "A contextual channel from a different dataset, not part of this logs-only set.",
                "rolling or windowed features": (
                    "Not added. This stage compares two estimators on the same five columns the "
                    "Random Forest baseline used; a window would change the feature set and make "
                    "the comparison a comparison of something else."
                ),
                "gradients": "Not added, for the same reason.",
            },
        },
        "target": {
            "column": shared.TARGET,
            "taxonomy_id": manifest["taxonomy"]["taxonomy_id"],
            "class_count": len(classes),
            "classes_merged": 0,
            "classes_removed": 0,
            "mapped_to_canonical": False,
            "encoding": (
                "encoded_id is the zero-based rank of the numeric NPD code in ascending numeric "
                "order over the source's full declared 12-class vocabulary, inherited unchanged "
                "from the dataset-construction stage."
            ),
            "classes": [
                {
                    "encoded_id": int(value),
                    "code": int(shared.encoded_to_code()[value]),
                    "class_name": lookup[value],
                }
                for value in classes
            ],
            "rare_class_policy": (
                "No class is merged, dropped, relabelled or reweighted out of the vocabulary. "
                "Both libraries are asked for all 12 classes explicitly and the fitted boosters "
                "are checked after fitting to confirm they carry 12."
            ),
        },
        "split": {
            "policy": (
                "The source's own published well-level partition, inherited unchanged. No well "
                "is reshuffled, no depth row is reshuffled, and no split is re-derived here."
            ),
            "fitted_on": shared.TRAIN_SPLIT,
            "evaluated_on": list(shared.EVAL_SPLITS),
            "wells_reshuffled": False,
            "row_level_random_split": False,
            "split_manifest": shared.split_manifest_reference(),
            "rows_by_split": {
                split: int((frame[shared.SPLIT] == split).sum()) for split in shared.ALL_SPLITS
            },
            "wells_by_split": {split: len(values) for split, values in wells.items()},
            "leakage_guards": {
                split: shared.assert_no_well_overlap(wells[shared.TRAIN_SPLIT], wells[split])
                for split in shared.EVAL_SPLITS
            },
        },
        "missing_value_handling": {
            "stored_dataset": (
                "Unchanged. The table keeps its empty cells and its 0/1 missingness masks, and "
                "this stage writes nothing back to it."
            ),
            "strategy": shared.IMPUTER_STRATEGY,
            "position": "first step of the fitted sklearn Pipeline",
            "fitted_on": "the 98 training wells only",
            "interpolation": None,
            "neighbouring_depth_rows_used": False,
            "per_well_statistics": False,
            "masks_in_primary": False,
            "masks_preserved": list(shared.MASK_COLUMNS),
            "note": shared.gbdt_imputation_note(),
        },
        "class_imbalance": {
            "train_rows": int(sum(train_support.values())),
            "largest_class": max(train_support, key=lambda key: train_support[key]),
            "smallest_class": min(train_support, key=lambda key: train_support[key]),
            "imbalance_ratio": round(max(train_support.values()) / min(train_support.values()), 1),
            "philosophy": (
                "The same philosophy as the Random Forest baseline: rebalance so that a "
                "macro-averaged metric is optimisable rather than letting a 6,998:1 "
                "imbalance decide the answer. The mechanism is necessarily different, and "
                "whether it was necessary is measured per model rather than assumed."
            ),
            "note": shared.SAMPLE_WEIGHT_NOTE,
            "not_assumed_from_random_forest": (
                "balanced_subsample is not simply copied across. A forest recomputes class "
                "weights inside every bootstrap sample; a booster applies one fixed weight per "
                "row. The two are not the same estimator behaviour, so each boosted model is "
                "also fitted unweighted and the difference is reported."
            ),
        },
        "models": model_sections,
        "penalty_matrix": {
            "matrix_id": "force2020_lithology_penalty_matrix",
            "authoritative": True,
            "homemade": False,
            "source": matrix_record.get("source", {}),
            "formula": "S = -(1/N) * sum_i A[y_true_i, y_pred_i]",
            "perfect_score": 0.0,
            "note": (
                "The published competition matrix only. No substitute matrix was constructed, "
                "and no other scoring function was used."
            ),
        },
        "limitations": [
            "These are baselines. Two fixed configurations, not searched ones, and no claim is "
            "made that either is the best gradient-boosted model available on this dataset.",
            "Both models are fitted once on 98 wells. A ten-well evaluation partition carries real "
            "between-well variance, and no confidence interval or repeated split is computed here.",
            "The two evaluation partitions disagree with each other by more than most of the "
            "differences between these three models. Any single-number comparison should be read "
            "with that in mind.",
            "Predictions are independent per depth row. Real lithology logs are autocorrelated down "
            "hole, so the effective sample size is smaller than the row count suggests. No windowing "
            "or smoothing was used.",
            "Median imputation makes a row whose curve is absent look like a row whose curve sits at "
            "the median. Both boosting libraries can handle missing values natively, and that would "
            "probably be the better model, but it would also make preprocessing differ between the "
            "three models being compared, so it was not used.",
            "Feature importance is each library's own gain attribution. It is not a causal or "
            "geological importance, and the three libraries' numbers are not comparable to each "
            "other as quantities; only the pattern is comparable.",
            "The class-weighting question is settled for one configuration per library on ten-well "
            "partitions. That is evidence about these baselines, not a settled modelling question.",
            "No CNN, no neural network, no additional dataset, no depth or formation feature in the "
            "primary experiment, no API, no frontend, and no change to the authoritative split.",
        ],
        "reproducibility": {
            "entrypoint": "make train-force2020-gbdt",
            "verify": "make verify-force2020-gbdt",
            "score": "make score-force2020-gbdt",
            "artifacts_root": rel(shared.ARTIFACT_ROOT),
            "artifacts_committed": False,
            "committed_outputs": [rel(shared.GBDT_REPORT_JSON), rel(shared.GBDT_REPORT_MD)],
            "environment": shared.gbdt_environment_facts(),
            "determinism": (
                "Every estimator carries a fixed random_state. LightGBM additionally runs with "
                "deterministic=True and force_row_wise=True, so its result does not depend on the "
                "thread count. The committed report contains no timings and no host-specific values, "
                "so a rerun either matches it byte for byte or the table or a library changed."
            ),
            "import_order_requirement": (
                "LightGBM must be imported before scikit-learn in any process that fits, loads or "
                "predicts with it. On this platform the reverse order aborts the process with an "
                "access violation from LightGBM's C layer. data/ml/common/force2020_lithology.py "
                "performs that import itself, and a test asserts the ordering."
            ),
            "installed_extra": "pip install -e .[ml]",
        },
    }


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------
def _class_names(report: dict[str, Any]) -> list[str]:
    return [str(entry["class_name"]) for entry in report["target"]["classes"]]


def _short(name: str, width: int = 7) -> str:
    return name[:width]


def render_confusion(result: dict[str, Any], names: Sequence[str]) -> list[str]:
    counts = result["confusion_matrix"]["counts"]
    lines = [
        "| true \\ pred | " + " | ".join(_short(name) for name in names) + " | support |",
        "|---" * (len(names) + 2) + "|",
    ]
    for i, name in enumerate(names):
        cells = " | ".join(f"{int(value):,}" for value in counts[i])
        lines.append(f"| **{name}** | {cells} | {int(sum(counts[i])):,} |")
    return lines


def render_markdown(report: dict[str, Any]) -> str:
    lines: list[str] = []
    a = lines.append
    names = _class_names(report)
    model_keys = list(report["models"])

    a("# FORCE 2020 lithology: gradient-boosted tree baselines")
    a("")
    a("**Models:** " + ", ".join(report["models"][key]["label"] for key in model_keys))
    a(f"**Dataset:** `{report['dataset']['dataset_id']}` "
      f"(sha256 `{report['dataset']['sha256'][:16]}...`, {report['dataset']['rows']:,} rows)")
    a(f"**Pinned source commit:** `{report['experiment']['source_commit']}`")
    a(f"**Status:** {report['model_status']}")
    a("")
    a(f"> {report['purpose']}")
    a("")
    a(f"> Comparison against the existing Random Forest baseline "
      f"(`{rel(shared.REPORT_MD)}`): hidden_test macro F1 0.3609, leaderboard_test macro F1 0.2332. "
      "That forest result is the fixed reference; it was not refitted to make this comparison easier "
      "or harder.")
    a("")

    a("## 1. What is held identical")
    a("")
    a("A comparison between model families is only worth reading if everything except the model "
      "is the same. Held identical to the Random Forest baseline:")
    a("")
    for item in report["experimental_fairness"]["identical_to_random_forest"]:
        a(f"- {item}")
    a("")
    a("What differs, and why:")
    a("")
    for item in report["experimental_fairness"]["what_differs_and_why"]:
        a(f"- {item}")
    a("")

    a("## 2. Dataset")
    a("")
    a("| | |")
    a("|---|---|")
    a(f"| Dataset id | `{report['dataset']['dataset_id']}` |")
    a(f"| Path | `{report['dataset']['path']}` (read-only for this stage) |")
    a(f"| sha256 | `{report['dataset']['sha256']}` |")
    a(f"| Rows / wells | {report['dataset']['rows']:,} / {report['dataset']['wells']} |")
    a(f"| Grain | {report['dataset']['grain']} |")
    a(f"| Pinned commit | `{report['experiment']['source_commit']}` |")
    a("")
    a(report["dataset"]["read_only"])
    a("")

    a("## 3. Features")
    a("")
    a(f"**Primary feature matrix: exactly {len(report['features']['primary'])} columns, the same "
      "five the Random Forest baseline used.**")
    a("")
    for feature in report["features"]["primary"]:
        a(f"- `{feature}`")
    a("")
    a("Excluded, and why:")
    a("")
    for column, reason in report["features"]["excluded_and_why"].items():
        a(f"- `{column}` - {reason}")
    a("")
    a(f"Feature selection performed: **{report['features']['feature_selection_performed']}**. "
      f"Derived features added: **{len(report['features']['derived_features_added'])}**.")
    a("")

    a("## 4. Target")
    a("")
    target = report["target"]
    a(f"- Column: `{target['column']}`, the encoded target from the dataset-construction stage.")
    a(f"- Taxonomy: `{target['taxonomy_id']}`, {target['class_count']} classes, unchanged.")
    a(f"- Classes merged: {target['classes_merged']}. Classes removed: {target['classes_removed']}.")
    a(f"- Mapped to the FORGE Utah vocabulary: **{target['mapped_to_canonical']}**.")
    a("")
    a(target["encoding"])
    a("")
    a("| encoded | NPD code | class |")
    a("|---:|---:|---|")
    for entry in target["classes"]:
        a(f"| {entry['encoded_id']} | {entry['code']} | {entry['class_name']} |")
    a("")
    a(target["rare_class_policy"])
    a("")

    a("## 5. Split")
    a("")
    split = report["split"]
    a(f"- Policy: {split['policy']}")
    a(f"- Fitted on: `{split['fitted_on']}`. Evaluated on: "
      + ", ".join(f"`{name}`" for name in split["evaluated_on"]) + ".")
    a(f"- Wells reshuffled: **{split['wells_reshuffled']}**. "
      f"Row-level random split: **{split['row_level_random_split']}**.")
    a(f"- Split manifest: `{split['split_manifest']['path']}` "
      f"(sha256 `{split['split_manifest']['sha256'][:16]}...`)")
    a("")
    a("| partition | rows | wells | in fit | in evaluation |")
    a("|---|---:|---:|---|---|")
    for name in shared.ALL_SPLITS:
        in_fit = "yes" if name == shared.TRAIN_SPLIT else "no"
        in_eval = "no" if name == shared.TRAIN_SPLIT else "yes"
        a(f"| `{name}` | {split['rows_by_split'][name]:,} | {split['wells_by_split'][name]} | "
          f"{in_fit} | {in_eval} |")
    a("")
    a("Leakage guard, asserted before every score:")
    a("")
    for name, guard in split["leakage_guards"].items():
        a(f"- `{name}`: {guard['fitting_wells']} fitting wells, {guard['evaluation_wells']} "
          f"evaluation wells, **{guard['shared_wells']} shared**.")
    a("")
    a("Neither evaluation partition contributed a row, a well, a sample weight, a fitted "
      "imputation statistic or a configuration decision.")
    a("")

    a("## 6. Missing-value handling")
    a("")
    missing = report["missing_value_handling"]
    a(f"- Stored dataset: {missing['stored_dataset']}")
    a(f"- Strategy: `{missing['strategy']}` {missing['position']}.")
    a(f"- Fitted on: {missing['fitted_on']}.")
    a(f"- Interpolation: {missing['interpolation']}. "
      f"Neighbouring depth rows used: **{missing['neighbouring_depth_rows_used']}**.")
    a(f"- Per-well statistics: **{missing['per_well_statistics']}**.")
    a(f"- Missingness masks in the primary experiment: **{missing['masks_in_primary']}**. "
      "They are preserved in the table and measured in the ablation.")
    a("")
    a(missing["note"])
    a("")

    a("## 7. Class imbalance and sample weighting")
    a("")
    imbalance = report["class_imbalance"]
    a(f"Training partition: {imbalance['train_rows']:,} rows, largest class "
      f"({imbalance['largest_class']}) to smallest ({imbalance['smallest_class']}) is "
      f"**{imbalance['imbalance_ratio']:,.0f}:1**.")
    a("")
    a(imbalance["philosophy"])
    a("")
    a(imbalance["not_assumed_from_random_forest"])
    a("")
    a(imbalance["note"])
    a("")

    a("## 8. What was not done")
    a("")
    selection = report["experimental_fairness"]["model_selection"]
    a(f"- Model selection performed: **{selection['performed']}**. "
      f"Evaluation partitions used for selection: **{selection['test_partitions_used_for_selection']}**.")
    a(f"- {selection['note']}")
    a("- No hyperparameter search, no early stopping, no feature selection, no threshold tuning.")
    a("- No model is called best, optimal or production-ready anywhere in this report.")
    a("")

    a("## 9. Model configuration")
    a("")
    for key in model_keys:
        section = report["models"][key]
        configuration = section["configuration"]
        parameters = configuration["parameters"]
        a(f"### {section['label']} (`{section['experiment_id']}`)")
        a("")
        a(f"`{configuration['estimator']}`, {configuration['library']} "
          f"{configuration['library_version']}, no search of any kind.")
        a("")
        a("| parameter | value |")
        a("|---|---|")
        for name in REQUIRED_PARAMETERS[key]:
            a(f"| `{name}` | `{parameters[name]}` |")
        for name in sorted(set(parameters) - set(REQUIRED_PARAMETERS[key])):
            a(f"| `{name}` | `{parameters[name]}` |")
        a("")
        a("Deviations from the library's own defaults, and why:")
        a("")
        for name, reason in configuration["deviations_from_library_defaults"].items():
            a(f"- **`{name}`**: {reason}")
        a("")
        a(f"Class handling: {configuration['class_handling']['strategy']}. "
          "Recorded as a decision, not applied silently, and measured against an unweighted refit below.")
        a("")

    a("## 10. Training support by class")
    a("")
    support = report["models"][model_keys[0]]["class_handling"]["train_class_support"]
    weights = report["models"][model_keys[0]]["class_handling"]["weights_used"]
    a(f"{sum(int(value) for value in support.values()):,} rows, 98 wells. Weights are identical for "
      "both models: the same training partition, the same counts, the same formula.")
    a("")
    a("| encoded | class | train rows | share | sample weight |")
    a("|---:|---|---:|---:|---:|")
    for entry in report["target"]["classes"]:
        key = str(entry["encoded_id"])
        rows = int(support[key])
        a(f"| {entry['encoded_id']} | {entry['class_name']} | {rows:,} | "
          f"{rows / sum(int(v) for v in support.values()):.3%} | {weights[key]} |")
    a("")

    a("## 11. Evaluation support by class")
    a("")
    a("| encoded | class | `hidden_test` rows | `leaderboard_test` rows |")
    a("|---:|---|---:|---:|")
    evaluation_support = report["models"][model_keys[0]]["experiments"][PRIMARY]["results"]
    for entry in report["target"]["classes"]:
        encoded = int(entry["encoded_id"])
        hidden = next(
            int(row["support"])
            for row in evaluation_support["hidden_test"]["per_class"]
            if int(row["encoded_id"]) == encoded
        )
        leader = next(
            int(row["support"])
            for row in evaluation_support["leaderboard_test"]["per_class"]
            if int(row["encoded_id"]) == encoded
        )
        mark = lambda value: f"**{value:,}**" if value == 0 else f"{value:,}"  # noqa: E731
        a(f"| {encoded} | {entry['class_name']} | {mark(hidden)} | {mark(leader)} |")
    a("")
    for name in shared.EVAL_SPLITS:
        aggregate = evaluation_support[name]["aggregate"]
        absent = aggregate["classes_zero_support"]
        a(f"- `{name}`: {aggregate['rows_evaluated']:,} rows, "
          f"{aggregate['wells_evaluated']} wells. Zero support: "
          + (", ".join(names[int(value)] for value in absent) if absent else "none") + ".")
    a("")
    a(f"> {shared.UNDEFINED_NOTE} The 12-class metric definition is the Random Forest baseline's, "
      "imported from the same function, so a zero-support class behaves identically in both reports.")
    a("")

    a("## 12. Results")
    a("")
    a("Headline figures, all from the primary logs-only experiment:")
    a("")
    a("| model | split | macro F1 (12) | macro F1 (supported) | weighted F1 | bal. acc. | penalty |")
    a("|---|---|---:|---:|---:|---:|---:|")
    for key in model_keys:
        for name in shared.EVAL_SPLITS:
            row = report["models"][key]["headline"][name]
            a(f"| {report['models'][key]['label']} | `{name}` | {num(row['macro_f1'])} | "
              f"{num(row['macro_f1_supported_only'])} | {num(row['weighted_f1'])} | "
              f"{num(row['balanced_accuracy'])} | {num(row['penalty_score'])} |")
    a("")
    a("The Random Forest baseline, from its own committed report, for reading alongside:")
    a("")
    a("| model | split | macro F1 (12) | macro F1 (supported) | weighted F1 | bal. acc. | penalty |")
    a("|---|---|---:|---:|---:|---:|---:|")
    forest = shared.read_rf_report()
    for name in shared.EVAL_SPLITS:
        row = forest["primary_results"][name]["aggregate"]
        a(f"| Random Forest | `{name}` | {num(row['macro_f1']['value'])} | "
          f"{num(row['macro_f1_supported_only']['value'])} | {num(row['weighted_f1']['value'])} | "
          f"{num(row['balanced_accuracy']['value'])} | {num(rf_primary_penalty(forest, name))} |")
    a("")
    a(report["cross_model_observation"]["caution"])
    a("")

    a("## 13. Per-class metrics")
    a("")
    for key in model_keys:
        for name in shared.EVAL_SPLITS:
            result = report["models"][key]["experiments"][PRIMARY]["results"][name]
            a(f"### {report['models'][key]['label']} on `{name}` "
              f"({result['rows']:,} rows, {result['wells']} wells)")
            a("")
            a("| encoded | class | support | predicted | precision | recall | F1 |")
            a("|---:|---|---:|---:|---:|---:|---:|")
            for row in result["per_class"]:
                a(f"| {row['encoded_id']} | {row['class_name']} | {row['support']:,} | "
                  f"{row['predicted']:,} | {num(row['precision'])} | {num(row['recall'])} | "
                  f"{num(row['f1'])} |")
            a("")
            a(f"Penalty-matrix score: **{num(result['penalty']['competition_score'])}** "
              f"(mean penalty {num(result['penalty']['mean_penalty'])}, perfect score 0).")
            a("")

    a("## 14. Macro F1, weighted F1, balanced accuracy")
    a("")
    a("| model | split | macro F1 (12) | classes averaged | macro F1 (supported) | weighted F1 | bal. acc. | classes in recall average |")
    a("|---|---|---:|---:|---:|---:|---:|---:|")
    for key in model_keys:
        for name in shared.EVAL_SPLITS:
            aggregate = report["models"][key]["experiments"][PRIMARY]["results"][name]["aggregate"]
            a(f"| {report['models'][key]['label']} | `{name}` | {num(aggregate['macro_f1']['value'])} | "
              f"{aggregate['classes_with_support']} of {aggregate['classes_declared']} | "
              f"{num(aggregate['macro_f1_supported_only']['value'])} | "
              f"{num(aggregate['weighted_f1']['value'])} | "
              f"{num(aggregate['balanced_accuracy']['value'])} | "
              f"{len(aggregate['balanced_accuracy']['classes_included'])} |")
    a("")
    a(forest["primary_results"][shared.EVAL_SPLITS[0]]["aggregate"]["macro_f1"]["computed_from"])
    a("")

    a("## 15. Confusion matrices")
    a("")
    for key in model_keys:
        for name in shared.EVAL_SPLITS:
            result = report["models"][key]["experiments"][PRIMARY]["results"][name]
            a(f"### {report['models'][key]['label']} on `{name}` - rows are true, columns predicted")
            a("")
            lines.extend(render_confusion(result, names))
            a("")

    a("## 16. Diagnostics")
    a("")
    for key in model_keys:
        a(f"### {report['models'][key]['label']}")
        a("")
        for experiment_key in ("depth_only", "logs_plus_masks", "primary_unweighted"):
            experiment = report["models"][key]["experiments"][experiment_key]
            a(f"**{experiment['title']}.** {experiment['note']}")
            a("")
            if experiment_key == "logs_plus_masks":
                a(f"A = {', '.join(f'`{c}`' for c in shared.PRIMARY_FEATURES)}")
                a("")
                a(f"B = A + {', '.join(f'`{c}`' for c in shared.MASK_COLUMNS)}")
                a("")
                a("| split | A: logs only | B: logs + masks | delta |")
                a("|---|---:|---:|---:|")
                for name in shared.EVAL_SPLITS:
                    primary_value = report["models"][key]["experiments"][PRIMARY]["results"][name][
                        "aggregate"
                    ]["macro_f1"]["value"]
                    value = experiment["results"][name]["aggregate"]["macro_f1"]["value"]
                    a(f"| `{name}` | {num(primary_value)} | {num(value)} | {num(value - primary_value)} |")
            else:
                a("| split | primary macro F1 | this macro F1 | delta | primary bal. acc. | this bal. acc. |")
                a("|---|---:|---:|---:|---:|---:|")
                for name in shared.EVAL_SPLITS:
                    primary_aggregate = report["models"][key]["experiments"][PRIMARY]["results"][name][
                        "aggregate"
                    ]
                    aggregate = experiment["results"][name]["aggregate"]
                    a(f"| `{name}` | {num(primary_aggregate['macro_f1']['value'])} | "
                      f"{num(aggregate['macro_f1']['value'])} | "
                      f"{num(aggregate['macro_f1']['value'] - primary_aggregate['macro_f1']['value'])} | "
                      f"{num(primary_aggregate['balanced_accuracy']['value'])} | "
                      f"{num(aggregate['balanced_accuracy']['value'])} |")
            a("")
        a(report["cross_model_observation"]["weighting_conclusions"][key])
        a("")

    a("## 17. Feature importance")
    a("")
    a("Each library's own gain attribution, and how often each feature was used in a split. "
      "Neither number is a statement about geology, and the two libraries do not define gain the "
      "same way, so the columns below are comparable as a pattern and not as a quantity.")
    a("")
    for key in model_keys:
        a(f"### {report['models'][key]['label']}")
        a("")
        a("| feature | gain | gain share | splits | split share |")
        a("|---|---:|---:|---:|---:|")
        for row in report["models"][key]["feature_importance"]:
            a(f"| `{row['feature']}` | {row['gain']:.1f} | {row['gain_share']:.4f} | "
              f"{row['splits']:,} | {row['split_share']:.4f} |")
        a("")
    forest_importance = forest["model_configuration"]["feature_importances"]
    a("Random Forest impurity-based importance, for the pattern comparison only:")
    a("")
    a("| feature | RF gain share | XGBoost gain share | LightGBM gain share |")
    a("|---|---:|---:|---:|")
    shares = {key: {row["feature"]: row["gain_share"] for row in report["models"][key]["feature_importance"]} for key in model_keys}
    for feature in shared.PRIMARY_FEATURES:
        a(f"| `{feature}` | {forest_importance[feature]:.4f} | "
          f"{shares.get('xgb', {}).get(feature, 0):.4f} | {shares.get('lgbm', {}).get(feature, 0):.4f} |")
    a("")
    a(report["cross_model_observation"]["importance"])
    a("")

    a("## 18. Per-class error analysis")
    a("")
    for key in model_keys:
        a(f"### {report['models'][key]['label']}")
        a("")
        for name in shared.EVAL_SPLITS:
            analysis = report["models"][key]["error_analysis"][name]
            a(f"**`{name}`**")
            a("")
            strongest = ", ".join(f"{row['class']} {num(row['f1'])}" for row in analysis["strongest_classes"])
            weakest = ", ".join(f"{row['class']} {num(row['f1'])}" for row in analysis["weakest_classes"])
            a(f"- Strongest: {strongest}.")
            a(f"- Weakest: {weakest}.")
            if analysis["zero_support_classes"]:
                a("- Zero ground-truth support: "
                  + ", ".join(row["class"] for row in analysis["zero_support_classes"])
                  + ". Reported as null, not as 0.")
            else:
                a("- Zero ground-truth support: none.")
            a("- Largest confusions, true class into its most common wrong prediction:")
            for entry in analysis["largest_confusions"][:4]:
                a(f"  - {entry['true_class']} -> {entry['most_confused_with']}: "
                  f"{entry['count']:,} rows, {entry['share_of_true_class']:.1%} of the class.")
            a("")
            a("Rare classes:")
            a("")
            a("| class | support | predicted | precision | recall | F1 | most confused with |")
            a("|---|---:|---:|---:|---:|---:|---|")
            for name_key, detail in analysis["rare_class_detail"].items():
                a(f"| {name_key} | {detail['support']:,} | {detail['predicted']:,} | "
                  f"{num(detail.get('precision'))} | {num(detail.get('recall'))} | "
                  f"{num(detail.get('f1'))} | {detail.get('mostly_confused_with') or 'n/a'} |")
            a("")
    a(report["cross_model_observation"]["errors"])
    a("")

    a("## 19. Limitations")
    a("")
    for limitation in report["limitations"]:
        a(f"- {limitation}")
    a("")

    a("## 20. Reproducibility and provenance")
    a("")
    reproducibility = report["reproducibility"]
    a(f"- Entry point: `{reproducibility['entrypoint']}`. Verification: `{reproducibility['verify']}`. "
      f"Rescore without refit: `{reproducibility['score']}`.")
    a(f"- Artifacts: `{reproducibility['artifacts_root']}` (gitignored, regenerated, not committed).")
    a(f"- Committed outputs: {', '.join(f'`{p}`' for p in reproducibility['committed_outputs'])}.")
    a(f"- Extra to install: `{reproducibility['installed_extra']}`.")
    a(f"- Source: `FORCE2020` at commit `{report['experiment']['source_commit']}`.")
    a(f"- Dataset sha256: `{report['dataset']['sha256']}`.")
    a(f"- Split manifest sha256: `{report['split']['split_manifest']['sha256']}`.")
    a("")
    a("| component | version |")
    a("|---|---|")
    for name, value in reproducibility["environment"].items():
        a(f"| {name} | {value} |")
    a("")
    a(reproducibility["determinism"])
    a("")
    a(f"**Import order.** {reproducibility['import_order_requirement']}")
    a("")
    a("### Penalty matrix")
    a("")
    a(f"- Matrix: `{report['penalty_matrix']['matrix_id']}`, authoritative: "
      f"**{report['penalty_matrix']['authoritative']}**, homemade: **{report['penalty_matrix']['homemade']}**.")
    a(f"- Formula: `{report['penalty_matrix']['formula']}`, perfect score {report['penalty_matrix']['perfect_score']}.")
    a(f"- {report['penalty_matrix']['note']}")
    a("")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------
def write_artifacts(
    model: str, section: dict[str, Any], pipeline: Any, manifest: dict[str, Any], runtimes: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], Path]:
    """Model, preprocessing, feature list, label map, config, metrics, manifest."""
    import joblib

    stem = shared.artifact_stem(model)
    training = shared.TRAINING_DIR
    evaluation = shared.EVALUATION_DIR
    training.mkdir(parents=True, exist_ok=True)
    evaluation.mkdir(parents=True, exist_ok=True)
    primary = section["experiments"][PRIMARY]

    pipeline_path = training / f"{stem}.pipeline.joblib"
    model_path = training / f"{stem}.model.joblib"
    features_path = training / f"{stem}.features.json"
    labels_path = training / f"{stem}.label_mapping.json"
    config_path = training / f"{stem}.config.json"
    split_path = training / f"{stem}.split_manifest_reference.json"
    metrics_path = evaluation / f"{stem}.metrics.json"
    per_class_path = evaluation / f"{stem}.per_class_metrics.csv"
    confusion_path = evaluation / f"{stem}.confusion_matrix.csv"
    importance_path = evaluation / f"{stem}.feature_importance.csv"
    manifest_path = evaluation / f"{stem}.experiment_manifest.json"

    joblib.dump(pipeline, pipeline_path)
    joblib.dump(pipeline.named_steps["classifier"], model_path)
    write_json(
        features_path,
        {
            "experiment_id": section["experiment_id"],
            "dataset_id": shared.DATASET_ID,
            "primary_feature_columns": list(shared.PRIMARY_FEATURES),
            "missingness_mask_columns": list(shared.MASK_COLUMNS),
            "target_column": shared.TARGET,
            "depth_column": shared.DEPTH,
            "depth_in_primary_features": False,
            "feature_selection_performed": False,
            "forbidden_columns_asserted_absent": sorted(shared.FORBIDDEN_FEATURE_COLUMNS),
        },
    )
    write_json(
        labels_path,
        {
            "experiment_id": section["experiment_id"],
            "taxonomy_id": manifest["taxonomy"]["taxonomy_id"],
            "class_count": 12,
            "classes_merged": 0,
            "classes_removed": 0,
            "mapping": [
                {
                    "encoded_id": int(value),
                    "npd_code": int(shared.encoded_to_code()[value]),
                    "class_name": name,
                    "competition_matrix_index": shared.penalty_index_map()[value],
                }
                for value, name in sorted(shared.encoded_to_class_name().items())
            ],
        },
    )
    write_json(
        config_path,
        {
            "experiment_id": section["experiment_id"],
            "model": model,
            "configuration": section["configuration"],
            "imputation": primary["imputation"],
            "class_handling": section["class_handling"],
            "model_selection": section["configuration"]["model_selection"],
            "tuned": False,
        },
    )
    write_json(split_path, shared.split_manifest_reference())
    write_json(
        metrics_path,
        {
            "experiment_id": section["experiment_id"],
            "model": model,
            "metrics": section["headline"],
            "per_experiment": {
                key: {
                    "features": value["features"],
                    "class_weighting": value["class_weighting"],
                    "results": {
                        name: {
                            "rows": value["results"][name]["rows"],
                            "wells": value["results"][name]["wells"],
                            "aggregate": value["results"][name]["aggregate"],
                            "penalty": value["results"][name]["penalty"],
                        }
                        for name in shared.EVAL_SPLITS
                    },
                }
                for key, value in section["experiments"].items()
            },
        },
    )
    write_csv(
        per_class_path,
        [
            {
                "model": model,
                "split": name,
                "encoded_id": row["encoded_id"],
                "class_name": row["class_name"],
                "support": row["support"],
                "predicted": row["predicted"],
                "precision": row["precision"],
                "recall": row["recall"],
                "f1": row["f1"],
                "zero_support": row["zero_support"],
                "never_predicted": row["never_predicted"],
            }
            for name in shared.EVAL_SPLITS
            for row in section["experiments"][PRIMARY]["results"][name]["per_class"]
        ],
        ["model", "split", "encoded_id", "class_name", "support", "predicted", "precision", "recall", "f1", "zero_support", "never_predicted"],
    )
    write_csv(
        confusion_path,
        [
            {
                "model": model,
                "split": name,
                "true_encoded_id": cell["true_encoded_id"],
                "true_class": cell["true_class"],
                "predicted_encoded_id": cell["predicted_encoded_id"],
                "predicted_class": cell["predicted_class"],
                "count": cell["count"],
                "row_total": cell["row_total"],
            }
            for name in shared.EVAL_SPLITS
            for row in section["experiments"][PRIMARY]["results"][name]["confusion_matrix"]["cells"]
            for cell in row
        ],
        ["model", "split", "true_encoded_id", "true_class", "predicted_encoded_id", "predicted_class", "count", "row_total"],
    )
    write_csv(
        importance_path,
        [{"model": model, **row} for row in section["feature_importance"]],
        ["model", "feature", "gain", "gain_share", "splits", "split_share"],
    )
    artifacts: list[dict[str, Any]] = [
        {"role": "model_and_preprocessing_pipeline", "path": rel(pipeline_path), "sha256": sha256(pipeline_path)},
        {"role": "model_booster_only", "path": rel(model_path), "sha256": sha256(model_path)},
        {"role": "feature_list", "path": rel(features_path), "sha256": sha256(features_path)},
        {"role": "label_mapping", "path": rel(labels_path), "sha256": sha256(labels_path)},
        {"role": "training_configuration", "path": rel(config_path), "sha256": sha256(config_path)},
        {"role": "split_manifest_reference", "path": rel(split_path), "sha256": sha256(split_path)},
        {"role": "metrics", "path": rel(metrics_path), "sha256": sha256(metrics_path)},
        {"role": "per_class_metrics", "path": rel(per_class_path), "sha256": sha256(per_class_path)},
        {"role": "confusion_matrix", "path": rel(confusion_path), "sha256": sha256(confusion_path)},
        {"role": "feature_importance", "path": rel(importance_path), "sha256": sha256(importance_path)},
        {"role": "report_json", "path": rel(shared.GBDT_REPORT_JSON), "sha256": sha256(shared.GBDT_REPORT_JSON)},
        {"role": "report_markdown", "path": rel(shared.GBDT_REPORT_MD), "sha256": sha256(shared.GBDT_REPORT_MD)},
        {"role": "experiment_manifest", "path": rel(manifest_path), "sha256": None},
    ]
    write_json(
        manifest_path,
        {
            "experiment_id": section["experiment_id"],
            "report_id": REPORT_ID,
            "stage": STAGE,
            "entrypoint": "data/ml/lithology/training/train_gbdt_baseline.py",
            "model": model,
            "model_status": "baseline. Not tuned, not the best model, not deployed.",
            "dataset": {
                "dataset_id": shared.DATASET_ID,
                "path": rel(shared.FEATURE_CSV),
                "sha256": manifest["sha256"],
                "rows": int(manifest["rows"]),
                "manifest": rel(shared.FEATURE_MANIFEST),
            },
            "source": {
                "source_id": manifest["provenance"]["source_id"],
                "resolved_commit_sha": manifest["provenance"]["source_commit"],
                "archive_doi": manifest["provenance"].get("archive_doi"),
            },
            "split_manifest_reference": shared.split_manifest_reference(),
            "target": {
                "column": shared.TARGET,
                "taxonomy_id": manifest["taxonomy"]["taxonomy_id"],
                "class_count": 12,
                "classes_merged": 0,
                "classes_removed": 0,
            },
            "features": {
                "primary": list(shared.PRIMARY_FEATURES),
                "depth_in_primary": False,
                "feature_selection_performed": False,
            },
            "pipeline_steps": list(pipeline.named_steps),
            "pipeline_note": (
                "Imputation and the booster are one fitted Pipeline, so the stored "
                "artifact cannot be used without the fitted median imputer. The imputer "
                "is the first step and the booster the last."
            ),
            "missing_value_handling": {
                "strategy": shared.IMPUTER_STRATEGY,
                "fitted_on": "train partition only",
                "medians": primary["imputation"]["medians"],
            },
            "class_handling": {
                "strategy": section["configuration"]["class_handling"]["strategy"],
                "weights_source": "training partition class counts only",
            },
            "environment": shared.gbdt_environment_facts(),
            "import_order_requirement": (
                "LightGBM must be imported before scikit-learn in any process that fits, loads "
                "or predicts with it; the shared module performs that import itself."
            ),
            "runtime_not_reproducible": runtimes,
            "artifacts": artifacts,
        },
    )
    # The manifest cannot contain its own hash, so the entry is written with a
    # null hash and filled in after the file is on disk. Update the existing
    # entry rather than appending a second one, so the returned list has one
    # row per artifact and every sha256 in it is real.
    self_entry = next(row for row in artifacts if row["role"] == "experiment_manifest")
    self_entry["sha256"] = sha256(manifest_path)
    return artifacts, manifest_path


# ---------------------------------------------------------------------------
# Cross-model reading
# ---------------------------------------------------------------------------
def rf_primary_value(forest: dict[str, Any], split: str) -> float:
    """Primary hidden/leaderboard macro F1 from the committed Random Forest report.

    The RF report nests its numbers under `aggregate`, and every metric is a
    documented node rather than a bare float, so a lookup has to go through
    `["value"]`. Written as one function so there is a single place that knows
    the RF report's shape.
    """
    return float(forest["primary_results"][split]["aggregate"]["macro_f1"]["value"])


def rf_primary_penalty(forest: dict[str, Any], split: str) -> float:
    return float(forest["primary_results"][split]["penalty"]["competition_score"])


def cross_model_observation(model_sections: dict[str, Any], forest: dict[str, Any]) -> dict[str, Any]:
    spreads = {}
    for name in shared.EVAL_SPLITS:
        values = [model_sections[key]["headline"][name]["macro_f1"] for key in model_sections]
        values.append(rf_primary_value(forest, name))
        spreads[name] = round(max(values) - min(values), 6)

    conclusions = {}
    for key in model_sections:
        rows = model_sections[key]["experiments"]
        lines = []
        for name in shared.EVAL_SPLITS:
            primary_value = rows[PRIMARY]["results"][name]["aggregate"]["macro_f1"]["value"]
            unweighted = rows["primary_unweighted"]["results"][name]["aggregate"]["macro_f1"]["value"]
            lines.append((name, round(primary_value - unweighted, 6)))
        mixed = len({value > 0 for _, value in lines}) > 1
        if mixed:
            text = (
                "Sample weighting helped on one partition and hurt on the other ("
                + ", ".join(f"`{name}` {value:+.4f}" for name, value in lines)
                + "), so this comparison does not show the balancing to be necessary. It shows "
                "the effect to be small and unstable across ten-well samples. The scheme is kept "
                "because it was declared before the fit and recorded as a decision, not because "
                "this evidence justifies it."
            )
        else:
            direction = "helped" if lines[0][1] > 0 else "hurt"
            text = (
                f"Sample weighting {direction} on both partitions ("
                + ", ".join(f"`{name}` {value:+.4f}" for name, value in lines)
                + "), consistently in sign but small in size relative to the spread between the "
                "two partitions. Kept because it was declared before the fit; one configuration on "
                "ten-well partitions is evidence about this baseline, not a settled question."
            )
        conclusions[key] = text

    return {
        "partition_spread": spreads,
        "caution": (
            "Before reading any of these numbers as a ranking: the gap between the two evaluation "
            f"partitions for a single model is {num(forest['partition_comparison']['macro_f1_spread'])} "
            "macro F1 for the Random Forest baseline, which is larger than most of the differences "
            "between the three models. A model that leads on one partition and trails on the other "
            "has not been shown to be better or worse; it has been shown to react to which ten wells "
            "were held out. No model is called best anywhere in this report."
        ),
        "importance": (
            "The Random Forest's importance is mean decrease in impurity; XGBoost's and LightGBM's "
            "are total loss reduction, computed over a different number of trees with a different "
            "growth rule. The three numbers are not on one scale and are not ranked against each "
            "other. What can be compared is the pattern: which of the five curves the model leans on "
            "most, and whether the ordering survives a change of algorithm."
        ),
        "errors": (
            "The confusion patterns above are described, not explained. This dataset contains log "
            "curves and a class label; it does not contain the core descriptions, depositional "
            "settings or laboratory analyses that would be needed to say why two classes are hard to "
            "tell apart, and no such explanation is offered here."
        ),
        "weighting_conclusions": conclusions,
    }


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------
def verify(report: dict[str, Any], markdown: str) -> int:
    for path, expected in ((shared.GBDT_REPORT_JSON, report), (shared.GBDT_REPORT_MD, markdown)):
        if not path.exists():
            print(f"  {path.name}: MISSING")
            return 1
        if path.suffix == ".json":
            actual_text = path.read_text(encoding="utf-8")
            expected_text = json.dumps(expected, indent=2, ensure_ascii=True) + "\n"
        else:
            actual_text = path.read_text(encoding="utf-8")
            expected_text = markdown
        if actual_text == expected_text:
            print(f"  {path.name}: MATCH")
        else:
            print(f"  {path.name}: DIFFERS")
            for number, (left, right) in enumerate(
                zip(actual_text.splitlines(), expected_text.splitlines(), strict=False), start=1
            ):
                if left != right:
                    print(f"    line {number}:\n      committed: {left[:160]}\n      fresh:     {right[:160]}")
                    break
            return 1
    return 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    parser.add_argument("--verify", action="store_true", help="refit and diff against the committed report")
    parser.add_argument("--print-summary", action="store_true", help="print a summary to stdout")
    parser.add_argument(
        "--model",
        choices=["xgb", "lgbm", "both"],
        default="both",
        help="which model to fit (default both)",
    )
    return parser.parse_args(argv)


def summarise(report: dict[str, Any]) -> None:
    print("FORCE 2020 gradient-boosted tree baselines")
    print(f"  dataset   : {report['dataset']['rows']:,} rows, {report['dataset']['wells']} wells, "
          f"sha256 {report['dataset']['sha256'][:16]}")
    print(f"  features  : {', '.join(report['features']['primary'])}")
    print(f"  target    : {report['target']['column']} (12 classes, unchanged)")
    print("  split     : fitted on train, scored on hidden_test and leaderboard_test, no shared wells")
    print("  selection : none. No evaluation partition was used to choose anything.")
    for section in report["models"].values():
        print(f"  {section['label']} ({section['configuration']['library']} "
              f"{section['configuration']['library_version']}), {section['configuration']['parameters']['n_estimators']} rounds:")
        for name in shared.EVAL_SPLITS:
            row = section["headline"][name]
            print(f"    {name:16s}: macro F1 {num(row['macro_f1'])} (supported-only "
                  f"{num(row['macro_f1_supported_only'])}), weighted F1 {num(row['weighted_f1'])}, "
                  f"balanced acc {num(row['balanced_accuracy'])}, penalty {num(row['penalty_score'])}")
    print(f"  report    : {rel(shared.GBDT_REPORT_JSON)}, {rel(shared.GBDT_REPORT_MD)}")
    print("  status    : baselines. Not the best model, not production-ready, not deployed.")


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    wanted = ["xgb", "lgbm"] if args.model == "both" else [args.model]

    frame = shared.load_dataset(
        [shared.WELL, shared.SPLIT, shared.DEPTH, shared.TARGET, *shared.LOG_COLUMNS, *shared.MASK_COLUMNS]
    )
    manifest = shared.read_manifest()
    matrix_record = shared.read_penalty_matrix()
    classes = [int(entry["encoded_id"]) for entry in shared.class_table()]
    lookup = shared.encoded_to_class_name()
    matrix = matrix_record["matrix"]
    index_map = shared.penalty_index_map()
    train_frame = frame.loc[frame[shared.SPLIT] == shared.TRAIN_SPLIT].reset_index(drop=True)
    wells = {
        split: sorted(str(value) for value in frame.loc[frame[shared.SPLIT] == split, shared.WELL].unique())
        for split in shared.ALL_SPLITS
    }
    for split in shared.EVAL_SPLITS:
        shared.assert_no_well_overlap(wells[shared.TRAIN_SPLIT], wells[split])
    train_support = shared.train_class_support(
        train_frame[shared.TARGET].to_numpy(dtype=np.int64), len(classes)
    )

    model_sections: dict[str, Any] = {}
    runtimes: list[dict[str, Any]] = []
    pipelines: dict[str, Any] = {}
    for model in wanted:
        experiments: dict[str, Any] = {}
        for definition in EXPERIMENTS:
            checkpoint = shared.EVALUATION_DIR / f"{shared.artifact_stem(model)}.{definition['key']}.checkpoint.json"
            print(f"  fitting {model}/{definition['key']}: {len(definition['features'])} feature(s)", flush=True)
            record, pipeline, elapsed = fit_experiment(
                model, definition, train_frame, frame, wells, classes, lookup, matrix, index_map
            )
            experiments[definition["key"]] = record
            runtimes.append({"model": model, "experiment": definition["key"], "seconds": round(elapsed, 1)})
            print(f"    fitted in {elapsed:.1f}s", flush=True)
            write_json(checkpoint, record)
            if definition["key"] == PRIMARY:
                pipelines[model] = pipeline
        section = build_model_section(model, experiments, train_support, len(train_frame))
        model_sections[model] = section

    forest = shared.read_rf_report()
    observation = cross_model_observation(model_sections, forest)
    for key, text in observation["weighting_conclusions"].items():
        model_sections[key]["weighting_conclusion"] = text

    report = build_report(model_sections, frame, wells, manifest, matrix_record, train_support)
    report["cross_model_observation"] = observation

    # The table is opened read-only. Re-hashing it proves it.
    digest = sha256(shared.FEATURE_CSV)
    if digest != manifest["sha256"]:
        raise SystemExit(
            f"the ingested table no longer hashes to the value in its own manifest "
            f"({digest} != {manifest['sha256']}). This stage does not write to it, so something "
            "else did. Refusing to report."
        )
    markdown = render_markdown(report)

    if args.verify:
        print("Verifying the committed report against a fresh fit:\n"
              f"  dataset sha256 {digest[:16]}")
        if set(model_sections) != {"xgb", "lgbm"}:
            print("  --verify covers both models; rerun without --model")
            return 1
        return verify(report, markdown)

    write_json(shared.GBDT_REPORT_JSON, report)
    shared.GBDT_REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    shared.GBDT_REPORT_MD.write_text(markdown, encoding="utf-8")

    for model, section in model_sections.items():
        entries, path = write_artifacts(model, section, pipelines[model], manifest, runtimes)
        print(f"  {model} artifacts:")
        for entry in entries:
            print(f"    {entry['role']:34s} {entry['path']}")

    if args.print_summary:
        summarise(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
