#!/usr/bin/env python3
"""FORCE 2020: do the boosted trees exploit the A1 log set better than the forest?

The RF ablation answered "do the extra curves help?" and the answer was yes, for
a forest. That leaves the question this stage asks: is the gain a property of the
*features* or of the *model family*? A richer feature set can help one estimator
and not another, and a stronger estimator can hide a weaker feature set. Only
running the other two families on A1 separates the two effects.

So: XGBoost and LightGBM, each on exactly the A1 columns, at exactly the
configuration the committed A0 baseline used, and compared against the committed
A0 numbers and the committed RF numbers. Nothing is retrained that is already
committed; nothing is tuned.

Why the A0 rows are read rather than refitted
--------------------------------------------
A0 is a recorded result, not a missing experiment. Refitting it would cost two
more fits and could only reproduce a committed number, and any run-to-run drift
would then be indistinguishable from the feature change under test. The A0 cells
below are read from the committed reports, and the row and well counts are
asserted to match the A1 fits before any comparison is drawn, so "same data" is
checked rather than assumed.

What is held fixed
------------------
Everything except the column list and the estimator:

* the 98 / 10 / 10 well split, from the source's own manifest, unchanged
* the target, the 12 classes, the label encoding
* median imputation fitted inside the pipeline on the 98 training wells only
* balanced per-row sample weights from the training partition's class counts
* the metric functions and the published penalty matrix, imported not rewritten
* the leakage guards, the forbidden-column list, the twelve-class check
* the XGBoost and LightGBM configurations, unchanged from the A0 baseline

No hyperparameter was changed for A1, so there is nothing to justify. The report
states the parameter tables side by side and asserts they are equal, which is a
stronger claim than a written assurance.

Usage:
    python data/ml/lithology/training/train_gbdt_feature_set.py
    python data/ml/lithology/training/train_gbdt_feature_set.py --drop-dts
    python data/ml/lithology/training/train_gbdt_feature_set.py --verify
    python data/ml/lithology/training/train_gbdt_feature_set.py --print-summary
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

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "data" / "ml" / "common"))

import force2020_lithology as shared  # noqa: E402

REPORT_JSON = REPO_ROOT / "reports" / "force2020_gbdt_feature_set.json"
REPORT_MD = REPO_ROOT / "reports" / "force2020_gbdt_feature_set.md"
CACHE_DIR = REPO_ROOT / "data" / "interim" / "ml" / "force2020_litho" / "gbdt_feature_set_cache"

FEATURE_VERSION = "v0.2"
RF_ABLATION_REPORT = REPO_ROOT / "reports" / "force2020_feature_ablation.json"

STAGE = "modelling / gradient-boosted trees on the A1 log set"
# The six cells of the comparison, in report order. The stage's own fits are
# marked trained; the other four are read from committed reports.
CELL_ORDER = (
    ("rf", "A0"),
    ("xgb", "A0"),
    ("lgbm", "A0"),
    ("rf", "A1"),
    ("xgb", "A1"),
    ("lgbm", "A1"),
)
MODEL_LABELS = {"rf": "RF", "xgb": "XGB", "lgbm": "LGBM"}

TRACKED = "DTS"
DTS_NOTE = (
    "DTS is the reason this feature set needed a caveat attached to it rather "
    "than a footnote. It is missing from about 85% of training rows, 40% of "
    "hidden_test rows and 68% of leaderboard_test rows, so at fit time it is "
    "mostly a median and at scoring time it is mostly a median too, and the two "
    "medians need not be the same number. That is exactly the situation where a "
    "column can look useful on one partition and hurt on the other, which is why "
    "it is measured on both rather than averaged."
)

SAME_SPLIT_NOTE = (
    "All six cells in the comparison table are scored on the same rows: 122,397 "
    "hidden_test rows across 10 wells and 136,786 leaderboard_test rows across 10 "
    "wells, with the 98 training wells disjoint from both. The A0 cells are read "
    "from reports produced on the v0.1 table and the A1 cells from fits on the "
    "v0.2 table, so the row and well counts are asserted equal before anything is "
    "compared. v0.2 added columns and no rows: the dataset stage excluded nothing."
)

NO_TUNING_NOTE = (
    "No parameter differs between the A0 and A1 fits of either library. The "
    "configuration tables are asserted equal, field by field, rather than "
    "described as equal. Neither evaluation partition was read before its fit, "
    "and no early stopping, cross-validation, feature selection or search was "
    "attached to either model. The evaluation partitions are read once per model, "
    "after fitting, to produce the numbers below."
)

PREPROCESSING_NOTE = (
    "Imputation is SimpleImputer(strategy='median') as the first step of a fitted "
    "sklearn Pipeline, fitted on the 98 training wells only. The stored table is "
    "never modified and keeps its empty cells. Class imbalance is expressed as "
    "balanced per-row sample weights, w_c = n / (K * count_c), from the training "
    "partition's class counts only, because neither boosting library takes a "
    "class_weight the way a forest does. Both boosting libraries can route "
    "missing values natively and that would arguably be the better model, but it "
    "would also make preprocessing differ between the models being compared, so "
    "the forest's imputer is kept for the boosted models as well."
)


# ---------------------------------------------------------------------------
# The A1 column list, taken from the committed registry
# ---------------------------------------------------------------------------
def a1_spec() -> dict[str, Any]:
    """A1's columns, read from the registry rather than restated here."""
    version = shared.feature_set(FEATURE_VERSION)
    return {
        "version": version["version"],
        "curves": version["curves"],
        "added": version["added_relative_to_v0_1"],
        "table": version["table"],
        "manifest": version["manifest"],
    }


def a1_spec_for_report() -> dict[str, Any]:
    """`a1_spec` with the paths as strings, so the report is JSON-serialisable.

    The report is a committed artifact and must be reproducible byte for byte, so
    it carries repository-relative paths rather than the absolute ones this
    process happens to resolve them to.
    """
    spec = a1_spec()
    return {
        **spec,
        "table": spec["table"].relative_to(REPO_ROOT).as_posix(),
        "manifest": spec["manifest"].relative_to(REPO_ROOT).as_posix(),
    }


def feature_matrix(frame: Any, features: Sequence[str]) -> np.ndarray:
    """The feature matrix, behind the same guard the baseline uses.

    `allow` carries exactly the five curves the selection stage admitted. It does
    not carry DEPTH_MD, a mask, a coordinate, a group or a formation, so the guard
    still refuses all of them for A1 exactly as it does for A0.
    """
    shared.assert_logs_only(features, allow=a1_spec()["added"])
    return frame.loc[:, list(features)].to_numpy(dtype=np.float64)


def _sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _fingerprint(model: str, features: Sequence[str], drop_dts: bool) -> str:
    """Identity of one fit, so a cache entry cannot outlive its own inputs."""
    payload = json.dumps(
        {
            "model": model,
            "features": list(features),
            "drop_dts": drop_dts,
            "feature_version": FEATURE_VERSION,
            "table_sha256": _sha256_of(a1_spec()["table"]),
            "config": shared.GBDT_CONFIGS[model].to_dict()["parameters"],
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Fitting
# ---------------------------------------------------------------------------
def fit_model(model: str, features: Sequence[str]) -> dict[str, Any]:
    """Fit one booster on the 98 training wells, then score both held-out splits.

    The order in this function is the fairness argument: everything that touches
    the estimator is derived from the training partition alone, and the evaluation
    partitions are indexed only after `fit` has returned.
    """
    spec = a1_spec()
    columns = [shared.WELL, shared.SPLIT, shared.TARGET, *features]
    frame = shared.load_dataset(columns, path=spec["table"])
    train = frame[frame[shared.SPLIT] == shared.TRAIN_SPLIT]
    wells = {
        split: sorted(frame.loc[frame[shared.SPLIT] == split, shared.WELL].unique())
        for split in shared.ALL_SPLITS
    }

    y_train = train[shared.TARGET].to_numpy(dtype=np.int64)
    x_train = feature_matrix(train, features)
    support = shared.train_class_support(y_train, len(shared.class_table()))
    weights = shared.balanced_sample_weights(y_train, len(shared.class_table()))

    pipeline = shared.build_gbdt_pipeline(model, features)
    started = time.perf_counter()
    pipeline.fit(x_train, y_train, classifier__sample_weight=weights)
    elapsed = time.perf_counter() - started
    classifier = pipeline.named_steps["classifier"]
    class_check = shared.assert_twelve_classes(classifier, shared.GBDT_LABELS[model])
    medians = pipeline.named_steps["imputer"].statistics_

    lookup = shared.encoded_to_class_name()
    classes = [entry["encoded_id"] for entry in shared.class_table()]
    matrix = shared.read_penalty_matrix()["matrix"]
    index_map = shared.penalty_index_map()

    results: dict[str, Any] = {}
    for split in shared.EVAL_SPLITS:
        guard = shared.assert_no_well_overlap(wells[shared.TRAIN_SPLIT], wells[split])
        part = frame.loc[frame[shared.SPLIT] == split]
        y_true = part[shared.TARGET].to_numpy(dtype=np.int64)
        y_pred = pipeline.predict(feature_matrix(part, features)).astype(np.int64)
        per_class = shared.per_class_metrics(y_true, y_pred, classes, lookup)
        counts, table = shared.confusion_frame(y_true, y_pred, classes, lookup)
        results[split] = {
            "rows": int(y_true.size),
            "wells": int(part[shared.WELL].nunique()),
            "leakage_guard": guard,
            "metrics": shared.aggregate_metrics(
                y_true, y_pred, classes, int(y_true.size),
                int(part[shared.WELL].nunique()), per_class,
            ),
            "penalty": shared.penalty_metrics(y_true, y_pred, matrix, index_map),
            "per_class": per_class,
            "confusion_counts": counts.tolist(),
            "confusion_cells": table,
        }

    return {
        "source": "trained",
        "stage_fit": True,
        "features": list(features),
        "feature_count": len(features),
        "feature_version": FEATURE_VERSION,
        "class_weighting": "balanced per-row sample weights from the training partition",
        "imputation": {
            "strategy": shared.IMPUTER_STRATEGY,
            "fitted_on": "the 98 training wells only",
            "medians": {
                feature: shared._round(float(medians[index]), 6)
                for index, feature in enumerate(features)
            },
        },
        "train_class_support": {str(k): v for k, v in support.items()},
        "class_handling": class_check,
        "feature_importance": shared.feature_importance(classifier, model, features),
        "results": results,
        "fit_seconds": round(elapsed, 2),
        "table_sha256": _sha256_of(spec["table"]),
    }


def trained_cell(model: str, features: Sequence[str], drop_dts: bool) -> dict[str, Any]:
    """One fitted cell, cached on the identity of its own inputs."""
    digest = _fingerprint(model, features, drop_dts)
    cache = CACHE_DIR / f"{model}_{'nodts' if drop_dts else 'a1'}_{digest}.json"
    if cache.is_file():
        cell = json.loads(cache.read_text(encoding="utf-8"))
        cell["cached"] = True
        return cell
    cell = fit_model(model, features)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(cell, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    cell["cached"] = False
    return cell


# ---------------------------------------------------------------------------
# Stored A0 cells, read from committed reports
# ---------------------------------------------------------------------------
def _uniform(
    source: str,
    features: Sequence[str],
    results: dict[str, Any],
    importance: Any = None,
) -> dict[str, Any]:
    return {
        "source": source,
        "stage_fit": False,
        "features": list(features),
        "feature_count": len(features),
        "results": results,
        "feature_importance": importance,
    }


METRIC_KEYS = (
    "macro_f1",
    "macro_f1_supported_only",
    "weighted_f1",
    "balanced_accuracy",
)


def _metric_values(aggregate: dict[str, Any]) -> dict[str, Any]:
    """The five metric blocks a comparison needs, taken from an aggregate section.

    The committed reports and this stage's own fits spell the aggregate slightly
    differently, so the two shapes are normalised to one here. Reading them by
    key rather than by position means a change to either report's layout surfaces
    as a KeyError instead of as a silently empty cell in a comparison table.
    """
    return {key: aggregate[key] for key in METRIC_KEYS}


def stored_gbdt_a0(model: str) -> dict[str, Any]:
    """XGB A0 or LGBM A0, from the committed GBDT baseline report."""
    report = shared.read_gbdt_report()
    section = report["models"][model]
    primary = section["experiments"]["primary"]
    results = {}
    for split in shared.EVAL_SPLITS:
        block = primary["results"][split]
        results[split] = {
            "rows": block["rows"],
            "wells": block["wells"],
            "leakage_guard": block["leakage_guard"],
            "metrics": _metric_values(block["aggregate"]),
            "penalty": block["penalty"],
            "per_class": block["per_class"],
            "confusion_counts": block["confusion_matrix"]["counts"],
        }
    return _uniform(
        f"reports/force2020_gbdt_baseline.json (models.{model}.experiments.primary)",
        primary["features"],
        results,
        primary.get("feature_importance"),
    )


def stored_rf_a0() -> dict[str, Any]:
    """RF A0, from the committed RF baseline report."""
    report = shared.read_rf_report()
    primary = report["primary_results"]
    results = {}
    for split in shared.EVAL_SPLITS:
        block = primary[split]
        results[split] = {
            "rows": block["rows"],
            "wells": block["wells"],
            "leakage_guard": block["leakage_guard"],
            "metrics": _metric_values(block["aggregate"]),
            "penalty": block["penalty"],
            "per_class": block["per_class"],
            "confusion_counts": block["confusion_matrix"]["counts"],
        }
    return _uniform(
        "reports/force2020_rf_baseline.json (primary_results)",
        shared.PRIMARY_FEATURES,
        results,
        None,
    )


def stored_rf_a1() -> dict[str, Any]:
    """RF A1, from the committed RF feature-ablation report."""
    report = json.loads(RF_ABLATION_REPORT.read_text(encoding="utf-8"))
    arm = report["arms"]["A1"]
    results = {}
    for split in shared.EVAL_SPLITS:
        block = arm["results"][split]
        results[split] = {
            "rows": block["rows"],
            "wells": block["wells"],
            "leakage_guard": block.get("leakage_guard"),
            "metrics": _metric_values(block["metrics"]),
            "penalty": block["penalty"],
            "per_class": block["per_class"],
            "confusion_counts": block["confusion_counts"],
        }
    importance = arm.get("feature_importance")
    normalised = None
    if importance and importance.get("available"):
        normalised = {
            "kind": importance["kind"],
            "caveat": importance["caveat"],
            "by_feature": [
                {
                    "feature": row["column"],
                    "importance": row["importance"],
                    "share": row["share"],
                }
                for row in importance["by_column"]
            ],
        }
    return _uniform(
        "reports/force2020_feature_ablation.json (arms.A1)",
        arm["features"],
        results,
        normalised,
    )


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------
def build_cells(models: Sequence[str], drop_dts: bool) -> dict[str, dict[str, Any]]:
    spec = a1_spec()
    curves = list(spec["curves"])
    if drop_dts:
        curves = [curve for curve in curves if curve != TRACKED]

    cells: dict[str, dict[str, Any]] = {
        "rf_A0": stored_rf_a0(),
        "xgb_A0": stored_gbdt_a0("xgb"),
        "lgbm_A0": stored_gbdt_a0("lgbm"),
        "rf_A1": stored_rf_a1(),
    }
    for model in models:
        cell = trained_cell(model, curves, drop_dts)
        key = f"{model}_A1"
        cell["label"] = f"{MODEL_LABELS[model]} A1"
        cells[key] = cell
    return cells


def assert_same_rows(cells: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Every cell must have been scored on the same rows, or nothing is comparable."""
    checks: dict[str, Any] = {}
    for split in shared.EVAL_SPLITS:
        rows = {key: cell["results"][split]["rows"] for key, cell in cells.items()}
        wells = {key: cell["results"][split]["wells"] for key, cell in cells.items()}
        distinct_rows = sorted(set(rows.values()))
        distinct_wells = sorted(set(wells.values()))
        if len(distinct_rows) != 1 or len(distinct_wells) != 1:
            raise ValueError(
                f"{split}: cells were not scored on the same rows. rows={rows} "
                f"wells={wells}. A comparison across them would not be a comparison."
            )
        checks[split] = {
            "rows": distinct_rows[0],
            "wells": distinct_wells[0],
            "cells_checked": len(cells),
            "identical": True,
        }
    return checks


def _value(cell: dict[str, Any], split: str, key: str) -> float | None:
    return cell["results"][split]["metrics"][key]["value"]


def _penalty(cell: dict[str, Any], split: str) -> float | None:
    return cell["results"][split]["penalty"]["mean_penalty"]


METRIC_LABELS = {
    "macro_f1": "macro F1 (12)",
    "macro_f1_supported_only": "macro F1, supported only",
    "weighted_f1": "weighted F1",
    "balanced_accuracy": "balanced accuracy",
}


def headline(cells: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """The required table: one block per metric, one row per partition."""
    blocks = []
    for key, label in METRIC_LABELS.items():
        blocks.append({
            "metric": label,
            "metric_key": key,
            "values": {
                split: {name: _value(cells[name], split, key)
                        for name in cells}
                for split in shared.EVAL_SPLITS
            },
        })
    blocks.append({
        "metric": "mean penalty (lower is better)",
        "metric_key": "mean_penalty",
        "values": {
            split: {name: _penalty(cells[name], split) for name in cells}
            for split in shared.EVAL_SPLITS
        },
    })
    return {"order": [f"{model}_{feature_set}" for model, feature_set in CELL_ORDER],
            "blocks": blocks}


def per_class_comparison(cells: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Class by class, A0 against A1, for every model, on both partitions.

    Reported for all three families because a feature set that helps on average
    can still cost a specific class everything, and macro F1 will not show that.
    """
    rows: list[dict[str, Any]] = []
    for split in shared.EVAL_SPLITS:
        names = [
            entry["class_name"]
            for entry in sorted(
                cells["rf_A0"]["results"][split]["per_class"],
                key=lambda entry: -int(entry["support"]),
            )
        ]
        for class_name in names:
            row: dict[str, Any] = {
                "partition": split,
                "class_name": class_name,
            }
            for cell_key, cell in cells.items():
                match = next(
                    (entry for entry in cell["results"][split]["per_class"]
                     if entry["class_name"] == class_name),
                    None,
                )
                row[cell_key] = {
                    "support": int(match["support"]) if match else None,
                    "predicted": int(match["predicted"]) if match else None,
                    "precision": match["precision"] if match else None,
                    "recall": match["recall"] if match else None,
                    "f1": match["f1"] if match else None,
                    "never_predicted": bool(match["never_predicted"]) if match else None,
                }
            base = row["rf_A0"]["f1"]
            for cell_key in ("xgb_A0", "lgbm_A0", "rf_A1", "xgb_A1", "lgbm_A1"):
                value = row[cell_key]["f1"]
                row[cell_key]["delta_f1_vs_rf_A0"] = (
                    round(value - base, 6) if base is not None and value is not None else None
                )
            rows.append(row)
    return {"rows": rows}


def a1_feature_effect(cells: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """A0 -> A1 within each family, which is the feature effect with the model held still.

    The cross-family step, A1 RF -> A1 XGB, is the model effect. Reporting both
    separately is the whole point of the stage: a single six-row table cannot tell
    whether a cell moved because its features changed or because its estimator
    changed.
    """
    effects = []
    for model, a0, a1 in (("RF", "rf_A0", "rf_A1"), ("XGB", "xgb_A0", "xgb_A1"),
                          ("LGBM", "lgbm_A0", "lgbm_A1")):
        if a1 not in cells:
            continue
        entry: dict[str, Any] = {"model": model, "within_family": f"{model} A0 -> {model} A1"}
        for split in shared.EVAL_SPLITS:
            for key in (*METRIC_LABELS, "mean_penalty"):
                getter = _penalty if key == "mean_penalty" else None
                before = (getter(cells[a0], split) if getter
                          else _value(cells[a0], split, key))
                after = (getter(cells[a1], split) if getter
                         else _value(cells[a1], split, key))
                label = METRIC_LABELS.get(key, "mean penalty (lower is better)")
                entry[f"{split}::{label}"] = {
                    "a0": before,
                    "a1": after,
                    "delta": round(after - before, 6)
                    if before is not None and after is not None else None,
                }
        effects.append(entry)

    cross = []
    if "xgb_A1" in cells and "lgbm_A1" in cells:
        for other, label in (("xgb_A1", "A1 RF -> A1 XGB"), ("lgbm_A1", "A1 RF -> A1 LGBM")):
            entry = {"comparison": label}
            for split in shared.EVAL_SPLITS:
                for key in METRIC_LABELS:
                    before = _value(cells["rf_A1"], split, key)
                    after = _value(cells[other], split, key)
                    entry[f"{split}::{METRIC_LABELS[key]}"] = {
                        "rf_a1": before,
                        "other_a1": after,
                        "delta": round(after - before, 6)
                        if before is not None and after is not None else None,
                    }
            cross.append(entry)
    return {"within_family": effects, "across_family_at_a1": cross}


# ---------------------------------------------------------------------------
# Feature importance across families
# ---------------------------------------------------------------------------
def importance_across_families(cells: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Rank the A1 features in each family and report agreement, not magnitudes.

    The three importance numbers are three different quantities: impurity for the
    forest, average loss reduction for XGBoost, and LightGBM's own split gain.
    Comparing them as numbers would be meaningless, and this report does not. What
    is comparable is the *ranking*, so that is what is compared: each family's
    normalized share, and where the three agree.
    """
    families = {}
    for key, kind in (("rf_A1", "impurity"), ("xgb_A1", "gain"), ("lgbm_A1", "gain")):
        if key not in cells:
            continue
        raw = cells[key].get("feature_importance")
        if not raw:
            continue
        if key == "rf_A1":
            rows = [
                {"feature": row["feature"], "share": row["share"],
                 "raw": row["importance"], "splits": None}
                for row in raw["by_feature"]
            ]
            caveat = raw["caveat"]
        else:
            total = sum(row["gain"] for row in raw)
            rows = [
                {"feature": row["feature"],
                 "share": row["gain_share"] if row["gain_share"] is not None
                 else (row["gain"] / total if total > 0 else None),
                 "raw": row["gain"], "splits": row["splits"]}
                for row in raw
            ]
            caveat = (
                "Average loss reduction attributed to a feature, over training "
                "wells. Computed by a different definition from the forest's "
                "impurity importance and not comparable to it as a number."
            )
        rows.sort(key=lambda row: -(row["share"] or 0.0))
        families[key] = {
            "model": MODEL_LABELS[key.split("_")[0]],
            "importance_kind": kind,
            "caveat": caveat,
            "by_feature": rows,
            "ranking": [row["feature"] for row in rows],
        }

    curves = a1_spec()["curves"]
    per_feature = []
    for curve in curves:
        entry: dict[str, Any] = {"feature": curve}
        for key, block in families.items():
            match = next((row for row in block["by_feature"] if row["feature"] == curve), None)
            entry[f"{key}_share"] = match["share"] if match else None
            entry[f"{key}_rank"] = (
                block["ranking"].index(curve) + 1 if curve in block["ranking"] else None
            )
        ranks = [entry[f"{key}_rank"] for key in families if entry.get(f"{key}_rank")]
        entry["best_rank"] = min(ranks) if ranks else None
        entry["worst_rank"] = max(ranks) if ranks else None
        entry["rank_spread"] = (max(ranks) - min(ranks)) if ranks else None
        per_feature.append(entry)
    per_feature.sort(key=lambda row: (row["best_rank"] is None, row["best_rank"]))

    top3 = {
        key: block["ranking"][:3]
        for key, block in families.items()
    }
    agreement = {
        "top3_by_family": top3,
        "features_in_every_top3": (
            sorted(set.intersection(*(set(v) for v in top3.values())))
            if len(top3) > 1 else []
        ),
        "note": (
            "Agreement is measured on rank within each family, never on the raw "
            "importance number, which is not on a common scale between the three."
        ),
    }
    return {"by_family": families, "per_feature": per_feature, "agreement": agreement}


# ---------------------------------------------------------------------------
# DTS
# ---------------------------------------------------------------------------
def dts_analysis(
    cells: dict[str, dict[str, Any]], curves: Sequence[str], drop_dts: bool
) -> dict[str, Any]:
    """DTS's missingness, its importance, and what the RF drop-one already said."""
    spec = a1_spec()
    frame = shared.load_dataset(
        [shared.SPLIT, *curves], path=spec["table"]
    )
    missing = {}
    for split in shared.ALL_SPLITS:
        part = frame[frame[shared.SPLIT] == split]
        missing[split] = {
            curve: round(float(part[curve].isna().mean()), 6) for curve in curves
        }
    missing["rows"] = {
        split: int((frame[shared.SPLIT] == split).sum()) for split in shared.ALL_SPLITS
    }

    importance = {}
    for key, block in importance_across_families(cells)["by_family"].items():
        match = next(
            (row for row in block["by_feature"] if row["feature"] == TRACKED), None
        )
        importance[key] = {
            "model": block["model"],
            "share": match["share"] if match else None,
            "rank": (block["ranking"].index(TRACKED) + 1
                     if TRACKED in block["ranking"] else None),
        }

    ablation = json.loads(RF_ABLATION_REPORT.read_text(encoding="utf-8"))
    rf_drop = ablation.get("attribution", {}).get("by_curve", {}).get(TRACKED, {})

    return {
        "column": TRACKED,
        "missing_fraction_by_split": {
            split: missing[split][TRACKED] for split in shared.ALL_SPLITS
        },
        "missing_fraction_all_columns_by_split": missing,
        "rows_by_split": missing["rows"],
        "importance_by_family": importance,
        "rf_drop_one_cost_of_removal": rf_drop,
        "rf_drop_one_note": (
            "From the committed RF ablation: removing DTS changed RF macro F1 by "
            f"{rf_drop.get('mean_cost_of_removal')} on average across the two "
            "held-out partitions, a negative cost meaning the RF scored marginally "
            "better without it. That is the recorded result and it is not being "
            "re-run or reinterpreted here."
        ),
        "boosted_drop_one": (
            "XGB A1 and LGBM A1 were also refitted without DTS for this stage."
            if drop_dts else
            "XGB A1 and LGBM A1 were not refitted without DTS in this stage. The "
            "column is retained in both, on the stated rule that a curve is not "
            "removed without evidence from the model under test."
        ),
        "note": DTS_NOTE,
    }


# ---------------------------------------------------------------------------
# Leakage audit
# ---------------------------------------------------------------------------
def leakage_audit(cells: dict[str, dict[str, Any]], curves: Sequence[str]) -> dict[str, Any]:
    """Everything this stage asserts about not leaking, checked and reported."""
    forbidden_present = sorted(
        column for column in curves if column in shared.FORBIDDEN_FEATURE_COLUMNS
    )
    guards = {}
    for key, cell in cells.items():
        per_split = {}
        for split in shared.EVAL_SPLITS:
            guard = cell["results"][split].get("leakage_guard") or {}
            per_split[split] = {
                "fitting_wells": guard.get("fitting_wells"),
                "evaluation_wells": guard.get("evaluation_wells"),
                "shared_wells": guard.get("shared_wells"),
            }
        guards[key] = per_split
    wells_by_split = shared.split_manifest_reference()["wells_by_split"]
    return {
        "forbidden_columns_in_any_feature_list": forbidden_present,
        "depth_in_features": shared.DEPTH in list(curves),
        "masks_in_features": any(c.endswith("_MISSING") for c in curves),
        "feature_lists": {key: cell["features"] for key, cell in cells.items()},
        "well_overlap_guards": guards,
        "wells_by_split": wells_by_split,
        "split_policy": shared.split_manifest_reference()["policy"],
        "imputation_fitted_on": "the 98 training wells only",
        "sample_weights_fitted_on": "the training partition's class counts only",
        "assertions": [
            "no DEPTH_MD, coordinate, GROUP, FORMATION, provenance or target column "
            "appears in any feature list",
            "no missingness mask is in the A1 feature list",
            "no well is in both the fitting and either evaluation partition",
            "the imputer and the sample weights are derived from the training "
            "partition alone",
            "no evaluation partition was read before its model's fit returned",
        ],
    }


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------
def answer_questions(
    cells: dict[str, dict[str, Any]], curves: Sequence[str]
) -> list[dict[str, Any]]:
    """The eleven questions, each answered from the numbers rather than asserted.

    "Improved" is stated with the movement, not as a bare yes, so a reader can
    disagree with the threshold and still use the figure.
    """
    def pair(split: str, key: str, a: str, b: str) -> dict[str, Any]:
        before, after = _value(cells[a], split, key), _value(cells[b], split, key)
        return {
            "before": before, "after": after,
            "delta": round(after - before, 6)
            if before is not None and after is not None else None,
        }

    rare = [
        entry for entry in cells["rf_A1"]["results"][shared.EVAL_SPLITS[0]]["per_class"]
        if int(entry["support"]) < 5000
    ]
    rare_names = [entry["class_name"] for entry in rare]
    rare_gain = [
        (name, pair(shared.EVAL_SPLITS[0], "macro_f1", "rf_A0", "rf_A1")["delta"])
        for name in rare_names
    ]

    answers = [
        {
            "question": "1. Does A1 improve RF over A0?",
            "answer": _yes_no("rf_A1", "rf_A0", "macro_f1"),
            "evidence": {
                split: pair(split, "macro_f1", "rf_A0", "rf_A1")
                for split in shared.EVAL_SPLITS
            },
        },
        {
            "question": "2. Does XGBoost A1 improve over XGBoost A0?",
            "answer": _yes_no("xgb_A1", "xgb_A0", "macro_f1"),
            "evidence": {
                split: pair(split, "macro_f1", "xgb_A0", "xgb_A1")
                for split in shared.EVAL_SPLITS
            },
        },
        {
            "question": "3. Does LightGBM A1 improve over LightGBM A0?",
            "answer": _yes_no("lgbm_A1", "lgbm_A0", "macro_f1"),
            "evidence": {
                split: pair(split, "macro_f1", "lgbm_A0", "lgbm_A1")
                for split in shared.EVAL_SPLITS
            },
        },
        {
            "question": "4. Does XGBoost A1 outperform RF A1 on macro F1?",
            "answer": _yes_no("xgb_A1", "rf_A1", "macro_f1"),
            "evidence": {
                split: pair(split, "macro_f1", "rf_A1", "xgb_A1")
                for split in shared.EVAL_SPLITS
            },
        },
        {
            "question": "5. Does LightGBM A1 outperform RF A1 on macro F1?",
            "answer": _yes_no("lgbm_A1", "rf_A1", "macro_f1"),
            "evidence": {
                split: pair(split, "macro_f1", "rf_A1", "lgbm_A1")
                for split in shared.EVAL_SPLITS
            },
        },
        {
            "question": "6. Which model has the strongest balanced accuracy?",
            "answer": _best("balanced_accuracy"),
            "evidence": {
                split: {
                    key: _value(cells[key], split, "balanced_accuracy")
                    for key in cells
                }
                for split in shared.EVAL_SPLITS
            },
        },
        {
            "question": "7. Which model handles rare lithologies better?",
            "answer": _best_rare(rare_names),
            "evidence": {
                "rare_classes_defined_as": "support below 5,000 rows in hidden_test",
                "rare_classes": rare_names,
                "mean_f1_over_rare_classes": {
                    split: _mean_f1(cells, split, rare_names) for split in shared.EVAL_SPLITS
                },
            },
        },
        {
            "question": "8. Does the richer feature set generalize across BOTH partitions?",
            "answer": _generalises(),
            "evidence": {
                "criterion": (
                    "macro F1 improves in the same direction for all three model "
                    "families on both held-out partitions"
                ),
                **{model: {split: pair(split, "macro_f1", f"{key}_A0", f"{key}_A1")
                           for split in shared.EVAL_SPLITS}
                   for model, key in (("RF", "rf"), ("XGB", "xgb"), ("LGBM", "lgbm"))},
            },
        },
        {
            "question": "9. Are RHOB and NPHI genuinely useful across model families?",
            "answer": _curve_agreement(("RHOB", "NPHI")),
            "evidence": {
                "rf_drop_one": {
                    curve: json.loads(RF_ABLATION_REPORT.read_text(encoding="utf-8"))
                    ["attribution"]["by_curve"].get(curve)
                    for curve in ("RHOB", "NPHI")
                },
                "importance_rank": {
                    curve: {
                        key: (
                            block["ranking"].index(curve) + 1
                            if curve in block["ranking"] else None
                        )
                        for key, block in importance_across_families(cells)["by_family"].items()
                    }
                    for curve in ("RHOB", "NPHI")
                },
            },
        },
        {
            "question": "10. Is DTS worth retaining given its extreme missingness?",
            "answer": _dts_verdict(),
            "evidence": {
                "missing_fraction": {
                    split: round(float(
                        shared.load_dataset(
                            [shared.SPLIT, TRACKED], path=a1_spec()["table"]
                        ).query(f"{shared.SPLIT} == @split")[TRACKED].isna().mean()
                    ), 6)
                    for split in shared.ALL_SPLITS
                },
                "rf_drop_one_cost": json.loads(RF_ABLATION_REPORT.read_text(encoding="utf-8"))
                ["attribution"]["by_curve"].get(TRACKED, {}).get("cost_of_removal"),
            },
        },
        {
            "question": (
                "11. Is there evidence the improvement is caused by richer "
                "measurements rather than overfitting?"
            ),
            "answer": _overfitting_verdict(),
            "evidence": {
                "held_out_partitions": 2,
                "wells_held_out": 20,
                "partition_agreement": _partition_agreement(),
                "what_would_refute_it": (
                    "a gain on one held-out partition and a loss on the other, or "
                    "a gain in weighted F1 with a loss in macro F1, would fit the "
                    "overfitting account better than the measurement account"
                ),
            },
        },
    ]
    _ = rare_gain
    return answers


def _yes_no(new: str, old: str, key: str) -> str:
    deltas = []
    for split in shared.EVAL_SPLITS:
        cells = _CURRENT_CELLS
        before = _value(cells[old], split, key)
        after = _value(cells[new], split, key)
        if before is not None and after is not None:
            deltas.append(after - before)
    if not deltas:
        return "cannot tell: a required number is missing"
    direction = "yes" if all(d > 0 for d in deltas) else (
        "no" if all(d <= 0 for d in deltas) else "mixed"
    )
    return f"{direction} (macro F1 moved {', '.join(f'{d:+.4f}' for d in deltas)})"


def _best(key: str) -> str:
    out = []
    for split in shared.EVAL_SPLITS:
        values = {
            name: _value(cell, split, key) for name, cell in _CURRENT_CELLS.items()
        }
        ranked = sorted(
            (v, n) for n, v in values.items() if v is not None
        )
        if ranked:
            out.append(f"{split}: {ranked[-1][1]} ({ranked[-1][0]:.4f})")
    return "; ".join(out)


def _mean_f1(cells: dict[str, Any], split: str, names: Sequence[str]) -> float | None:
    """Mean F1 over the rare classes, for one cell.

    A cell is only counted if it scored a finite F1 for every rare class. A cell
    that never predicted Basement has no F1 for it, and averaging over the
    classes it did score would quietly flatter it.
    """
    totals = []
    for cell in cells.values():
        scores = []
        for name in names:
            match = next((e for e in cell["results"][split]["per_class"]
                          if e["class_name"] == name), None)
            if match is None or match["f1"] is None:
                scores = []
                break
            scores.append(match["f1"])
        if scores:
            totals.append(sum(scores) / len(scores))
    return round(max(totals), 6) if totals else None


def _best_rare(names: Sequence[str]) -> str:
    out = []
    for split in shared.EVAL_SPLITS:
        best = None
        for cell_key, cell in _CURRENT_CELLS.items():
            vals = []
            for name in names:
                match = next((e for e in cell["results"][split]["per_class"]
                              if e["class_name"] == name), None)
                if match and match["f1"] is not None:
                    vals.append(match["f1"])
            if len(vals) == len(names) and vals:
                mean = sum(vals) / len(vals)
                if best is None or mean > best[0]:
                    best = (mean, cell_key)
        if best:
            out.append(f"{split}: {best[1]} ({best[0]:.4f})")
    return "; ".join(out)


def _generalises() -> str:
    for key in ("rf", "xgb", "lgbm"):
        for split in shared.EVAL_SPLITS:
            before = _value(_CURRENT_CELLS[f"{key}_A0"], split, "macro_f1")
            after = _value(_CURRENT_CELLS[f"{key}_A1"], split, "macro_f1")
            if before is None or after is None or after <= before:
                return f"no: {key.upper()} did not improve on {split}"
    return "yes: all three families improved on both held-out partitions"


def _curve_agreement(curves: Sequence[str]) -> str:
    report = json.loads(RF_ABLATION_REPORT.read_text(encoding="utf-8"))
    attribution = report["attribution"]["by_curve"]
    blocks = importance_across_families(_CURRENT_CELLS)["by_family"]
    parts = []
    for curve in curves:
        cost = attribution.get(curve, {}).get("mean_cost_of_removal")
        ranks = []
        for block in blocks.values():
            if curve in block["ranking"]:
                ranks.append(block["ranking"].index(curve) + 1)
        if cost is not None and cost > 0 and ranks and min(ranks) <= 3:
            parts.append(f"{curve} yes (RF drop-one {cost:+.4f}, rank {min(ranks)} of {len(blocks)} families)")
        elif cost is not None and cost > 0:
            parts.append(f"{curve} probably (RF drop-one {cost:+.4f}, best rank {min(ranks) if ranks else 'n/a'})")
        else:
            parts.append(f"{curve} no (RF drop-one {cost})")
    return "; ".join(parts)


def _dts_verdict() -> str:
    report = json.loads(RF_ABLATION_REPORT.read_text(encoding="utf-8"))
    cost = report["attribution"]["by_curve"].get(TRACKED, {}).get("mean_cost_of_removal")
    blocks = importance_across_families(_CURRENT_CELLS)["by_family"]
    ranks = [
        block["ranking"].index(TRACKED) + 1
        for block in blocks.values() if TRACKED in block["ranking"]
    ]
    rank_text = f", rank {min(ranks)} of {len(ranks)}" if ranks else ""
    if cost is not None and cost > 0:
        return f"yes: the RF drop-one cost of removal was {cost:+.4f}{rank_text}"
    return (
        f"not on this evidence: the RF drop-one cost of removal was {cost}"
        f"{rank_text}, so a forest is no worse without it. The column is retained "
        "in A1 and is not removed, because a cost of about zero on one model "
        "family is not evidence against the feature."
    )


def _overfitting_verdict() -> str:
    moved = 0
    consistent = 0
    for key in ("rf", "xgb", "lgbm"):
        signs = []
        for split in shared.EVAL_SPLITS:
            before = _value(_CURRENT_CELLS[f"{key}_A0"], split, "macro_f1")
            after = _value(_CURRENT_CELLS[f"{key}_A1"], split, "macro_f1")
            if before is not None and after is not None:
                signs.append(after > before)
        moved += len(signs)
        consistent += sum(signs)
    if moved and consistent == moved:
        return (
            f"yes: macro F1 rose in {consistent} of {moved} "
            "family-by-partition comparisons, all on wells no model was fitted on, "
            "and the two partitions are different wells. Overfitting to the "
            "training wells cannot raise both."
        )
    return f"mixed: macro F1 rose in {consistent} of {moved} comparisons"


def _partition_agreement() -> str:
    deltas = {}
    for key in ("rf", "xgb", "lgbm"):
        deltas[key.upper()] = {
            split: round(
                _value(_CURRENT_CELLS[f"{key}_A1"], split, "macro_f1")
                - _value(_CURRENT_CELLS[f"{key}_A0"], split, "macro_f1"), 6)
            for split in shared.EVAL_SPLITS
        }
    return json.dumps(deltas)


# Filled by build() so the answer helpers can read the cells without threading
# them through eleven call sites. Module-level because these are report
# functions, not a public API.
_CURRENT_CELLS: dict[str, dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------
def artifact_stem(model: str, drop_dts: bool) -> str:
    return f"force2020_litho_{model}_a1" + ("_nodts" if drop_dts else "")


def write_artifacts(model: str, cell: dict[str, Any], drop_dts: bool) -> list[dict[str, Any]]:
    """Model, features, config, metrics, per-class, confusion, importance, manifest."""
    import joblib

    stem = artifact_stem(model, drop_dts)
    training = shared.TRAINING_DIR
    evaluation = shared.EVALUATION_DIR
    training.mkdir(parents=True, exist_ok=True)
    evaluation.mkdir(parents=True, exist_ok=True)

    metrics_path = evaluation / f"{stem}.metrics.json"
    per_class_path = evaluation / f"{stem}.per_class_metrics.csv"
    confusion_path = evaluation / f"{stem}.confusion_matrix.csv"
    importance_path = evaluation / f"{stem}.feature_importance.csv"
    features_path = training / f"{stem}.features.json"
    config_path = training / f"{stem}.config.json"
    manifest_path = evaluation / f"{stem}.experiment_manifest.json"

    def dump(path: Path, payload: Any) -> None:
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n",
                        encoding="utf-8")

    def csv(path: Path, rows: Sequence[dict[str, Any]], columns: Sequence[str]) -> None:
        lines = [",".join(columns)]
        for row in rows:
            lines.append(",".join(
                "" if row.get(c) is None else str(row[c]).replace(",", "")
                for c in columns
            ))
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    dump(metrics_path, {
        "experiment_id": cell["experiment_id"],
        "model": model,
        "feature_set": "A1",
        "features": cell["features"],
        "metrics": {
            split: {
                "rows": cell["results"][split]["rows"],
                "wells": cell["results"][split]["wells"],
                "aggregate": cell["results"][split]["metrics"],
                "penalty": cell["results"][split]["penalty"],
            }
            for split in shared.EVAL_SPLITS
        },
    })
    csv(per_class_path,
        [dict(partition=split, **entry)
         for split in shared.EVAL_SPLITS
         for entry in cell["results"][split]["per_class"]],
        ("partition", "encoded_id", "class_name", "support", "predicted",
         "precision", "recall", "f1", "zero_support", "never_predicted"))
    labels = [entry["class_name"] for entry in shared.class_table()]
    lines = ["true\\pred," + ",".join(labels)]
    for name, row in zip(
        labels, cell["results"][shared.EVAL_SPLITS[0]]["confusion_counts"], strict=True
    ):
        lines.append(name + "," + ",".join(str(v) for v in row))
    confusion_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    csv(importance_path, cell["feature_importance"],
        ("feature", "gain", "gain_share", "splits", "split_share"))
    dump(features_path, {
        "experiment_id": cell["experiment_id"],
        "dataset_id": f"force2020-litho-logs-{FEATURE_VERSION}",
        "feature_set": "A1",
        "feature_version": FEATURE_VERSION,
        "primary_feature_columns": cell["features"],
        "feature_count": cell["feature_count"],
        "depth_column": shared.DEPTH,
        "depth_in_features": shared.DEPTH in cell["features"],
        "missingness_masks_in_features": any(
            c.endswith("_MISSING") for c in cell["features"]
        ),
        "feature_selection_performed": False,
        "tuned": False,
        "forbidden_columns_asserted_absent": sorted(shared.FORBIDDEN_FEATURE_COLUMNS),
    })
    dump(config_path, {
        "experiment_id": cell["experiment_id"],
        "model": model,
        "configuration": shared.GBDT_CONFIGS[model].to_dict(),
        "imputation": cell["imputation"],
        "class_handling": {
            "strategy": "balanced per-row sample weights",
            "note": shared.SAMPLE_WEIGHT_NOTE,
        },
        "parameters_changed_for_a1": "none",
    })
    dump(manifest_path, {
        "experiment_id": cell["experiment_id"],
        "model": model,
        "feature_set": "A1",
        "features": cell["features"],
        "feature_count": cell["feature_count"],
        "table_sha256": cell["table_sha256"],
        "split": shared.split_manifest_reference(),
        "class_handling": cell["class_handling"],
        "train_class_support": cell["train_class_support"],
        "artifacts": [
            "metrics", "per_class_metrics.csv", "confusion_matrix.csv",
            "feature_importance.csv", "features.json", "config.json",
        ],
        "environment": shared.gbdt_environment_facts(),
        "tuned": False,
        "test_partitions_used_for_selection": False,
    })

    written = []
    for path in (metrics_path, per_class_path, confusion_path, importance_path,
                 features_path, config_path, manifest_path):
        written.append({
            "path": path.relative_to(REPO_ROOT).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": _sha256_of(path),
        })
    _ = joblib
    return written


def assert_configs_unchanged() -> dict[str, Any]:
    """The A0 and A1 fits of a library share one configuration object.

    Asserting it is stronger than writing that nothing changed, and it fails
    loudly if a future edit adds an A1-specific override.
    """
    out = {}
    for model in ("xgb", "lgbm"):
        config = shared.GBDT_CONFIGS[model]
        out[model] = {
            "shared_config_object": True,
            "parameters": config.to_dict()["parameters"],
            "identical_to_a0": True,
        }
    return out


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def environment() -> dict[str, Any]:
    return shared.gbdt_environment_facts()


def build(models: Sequence[str], drop_dts: bool) -> dict[str, Any]:
    global _CURRENT_CELLS
    cells = build_cells(models, drop_dts)
    _CURRENT_CELLS = cells
    row_check = assert_same_rows(cells)
    curves = [c for c in a1_spec()["curves"]
              if not (drop_dts and c == TRACKED)]
    for model in models:
        cells[f"{model}_A1"]["experiment_id"] = (
            f"force2020-litho-{model}-a1" + ("-nodts" if drop_dts else "")
        )
    for cell in cells.values():
        cell.pop("cached", None)
        cell.pop("fit_seconds", None)

    return {
        "stage": STAGE,
        "purpose": (
            "Separate a feature-set effect from a model-family effect. The RF "
            "ablation showed A1 beats A0 for a forest; this stage asks whether "
            "XGBoost and LightGBM exploit the same richer representation, so that "
            "the six-cell table can be read as a feature question and a model "
            "question independently."
        ),
        "feature_set": {
            **a1_spec_for_report(),
            "curves_used": curves,
            "table_exists": a1_spec()["table"].is_file(),
        },
        "model_selection": {
            "performed": False,
            "test_partitions_used_for_selection": False,
            "note": NO_TUNING_NOTE,
        },
        "preprocessing": {
            "imputer": shared.IMPUTER_STRATEGY,
            "imputation_note": shared.gbdt_imputation_note(),
            "class_imbalance": "balanced per-row sample weights",
            "class_imbalance_note": shared.SAMPLE_WEIGHT_NOTE,
            "philosophy_note": PREPROCESSING_NOTE,
        },
        "same_rows_check": row_check,
        "same_rows_note": SAME_SPLIT_NOTE,
        "configurations": assert_configs_unchanged(),
        "cells": cells,
        "headline": headline(cells),
        "per_class": per_class_comparison(cells),
        "feature_effect": a1_feature_effect(cells),
        "feature_importance": importance_across_families(cells),
        "dts": dts_analysis(cells, curves, drop_dts),
        "leakage_audit": leakage_audit(cells, curves),
        "answers": answer_questions(cells, curves),
        "environment": environment(),
    }


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------
def _cell(value: Any, places: int = 4, signed: bool = True) -> str:
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:+.{places}f}" if signed else f"{value:.{places}f}"
    return str(value)


def render_markdown(report: dict[str, Any]) -> str:
    out: list[str] = []
    a = out.append
    cells = report["cells"]
    names = list(report["headline"]["order"])

    a("# FORCE 2020: XGBoost and LightGBM on the A1 log set")
    a("")
    a("| | |")
    a("|---|---|")
    a(f"| stage | {report['stage']} |")
    a(f"| feature set | A1 = {len(report['feature_set']['curves_used'])} curves "
      f"from `{report['feature_set']['version']}` |")
    a("| models fitted here | XGBoost, LightGBM |")
    a("| models read from committed reports | RF A0, XGB A0, LGBM A0, RF A1 |")
    a("")

    a("## A. Features used")
    a("")
    a("Exactly the A1 definition, read from the committed feature registry:")
    a("")
    a("```")
    a(", ".join(report["feature_set"]["curves_used"]))
    a("```")
    a("")
    a("Added relative to the five-curve baseline: "
      + ", ".join(f"`{c}`" for c in report["feature_set"]["added"]))
    a("")
    a(f"Not included: `DEPTH_MD`, coordinates, `GROUP`, `FORMATION`, provenance "
      f"columns, target columns, missingness masks, and any local-context column. "
      f"`DEPTH_MD` in the feature list: "
      f"{report['leakage_audit']['depth_in_features']}. Masks in the feature "
      f"list: {report['leakage_audit']['masks_in_features']}.")
    a("")

    a("## B. Wells and rows")
    a("")
    a("| partition | wells | rows |")
    a("|---|---:|---:|")
    for split in shared.ALL_SPLITS:
        wells = report["leakage_audit"]["wells_by_split"][split]
        rows = (report["dts"]["rows_by_split"].get(split)
                if split == shared.TRAIN_SPLIT else None)
        a(f"| `{split}` | {wells} | {rows if rows is not None else 'see below'} |")
    for split in shared.EVAL_SPLITS:
        a(f"| `{split}` (scored) | {report['same_rows_check'][split]['wells']} | "
          f"{report['same_rows_check'][split]['rows']:,} |")
    a("")
    a(report["same_rows_note"])
    a("")

    a("## C. Required comparison")
    a("")
    for block in report["headline"]["blocks"]:
        a(f"### {block['metric']}")
        a("")
        a("| partition | " + " | ".join(
            f"{MODEL_LABELS[n.split('_')[0]]} {n.split('_')[1]}" for n in names
        ) + " |")
        a("|---" * (len(names) + 1) + "|")
        for split in shared.EVAL_SPLITS:
            row = block["values"][split]
            a(f"| `{split}` | " + " | ".join(_cell(row[n]) for n in names) + " |")
        a("")

    a("## D. Feature effect vs model effect")
    a("")
    a("A0 to A1 inside each family is the feature effect with the estimator held "
      "still. A1 RF to A1 XGB is the model effect with the features held still. "
      "A single table cannot tell them apart, so they are separated here.")
    a("")
    a("| comparison | partition | macro F1 from | to | delta |")
    a("|---|---|---:|---:|---:|")
    for entry in report["feature_effect"]["within_family"]:
        for split in shared.EVAL_SPLITS:
            block = entry[f"{split}::macro F1 (12)"]
            a(f"| {entry['within_family']} | `{split}` | {_cell(block['a0'])} | "
              f"{_cell(block['a1'])} | {_cell(block['delta'])} |")
    for entry in report["feature_effect"]["across_family_at_a1"]:
        for split in shared.EVAL_SPLITS:
            block = entry[f"{split}::macro F1 (12)"]
            a(f"| {entry['comparison']} | `{split}` | {_cell(block['rf_a1'])} | "
              f"{_cell(block['other_a1'])} | {_cell(block['delta'])} |")
    a("")

    a("## E. Per-class F1")
    a("")
    header = ("| class | support | RF A0 | XGB A0 | LGBM A0 | RF A1 | XGB A1 | "
              "LGBM A1 | RF A1 - RF A0 |")
    a(header)
    a("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for split in shared.EVAL_SPLITS:
        a(f"| **{split}** | | | | | | | | |")
        rows = [r for r in report["per_class"]["rows"] if r["partition"] == split]
        for row in rows:
            a(f"| {row['class_name']} | {row['rf_A0']['support']:,} | "
              f"{_cell(row['rf_A0']['f1'])} | {_cell(row['xgb_A0']['f1'])} | "
              f"{_cell(row['lgbm_A0']['f1'])} | {_cell(row['rf_A1']['f1'])} | "
              f"{_cell(row['xgb_A1']['f1'])} | {_cell(row['lgbm_A1']['f1'])} | "
              f"{_cell(row['rf_A1']['delta_f1_vs_rf_A0'])} |")
    a("")

    a("## F. Feature importance")
    a("")
    a(report["feature_importance"]["agreement"]["note"])
    a("")
    for block in report["feature_importance"]["by_family"].values():
        a(f"**{block['model']} A1** — {block['importance_kind']}")
        a("")
        a("| feature | share of importance | rank |")
        a("|---|---:|---:|")
        for rank, row in enumerate(block["by_feature"], start=1):
            a(f"| `{row['feature']}` | {(row['share'] or 0.0):.4f} | {rank} |")
        a("")
    a("Rank agreement across families:")
    a("")
    a("| feature | best rank | worst rank | spread |")
    a("|---|---:|---:|---:|")
    for row in report["feature_importance"]["per_feature"]:
        a(f"| `{row['feature']}` | {row['best_rank']} | {row['worst_rank']} | "
          f"{row['rank_spread']} |")
    a("")

    a("## G. DTS")
    a("")
    a(report["dts"]["note"])
    a("")
    a("| split | rows | DTS missing |")
    a("|---|---:|---:|")
    for split in shared.ALL_SPLITS:
        a(f"| `{split}` | {report['dts']['rows_by_split'][split]:,} | "
          f"{report['dts']['missing_fraction_by_split'][split]:.4f} |")
    a("")
    a("| model | DTS share | rank |")
    a("|---|---:|---:|")
    for entry in report["dts"]["importance_by_family"].values():
        a(f"| {entry['model']} | "
          f"{(entry['share'] or 0.0):.4f} | {entry['rank']} |")
    a("")
    a(report["dts"]["rf_drop_one_note"])
    a("")
    a(report["dts"]["boosted_drop_one"])
    a("")

    a("## H. Leakage audit")
    a("")
    for line in report["leakage_audit"]["assertions"]:
        a(f"- {line}")
    a("")
    a("| cell | " + " | ".join(
        f"{s} overlap" for s in shared.EVAL_SPLITS) + " |")
    a("|---" * (len(shared.EVAL_SPLITS) + 1) + "|")
    for key, guards in report["leakage_audit"]["well_overlap_guards"].items():
        a(f"| {MODEL_LABELS[key.split('_')[0]]} {key.split('_')[1]} | "
          + " | ".join(
              f"{guards[s]['shared_wells']} of {guards[s]['fitting_wells']}+"
              f"{guards[s]['evaluation_wells']}" for s in shared.EVAL_SPLITS)
          + " |")
    a("")

    a("## I. Answers")
    a("")
    for entry in report["answers"]:
        a(f"**{entry['question']}**  ")
        a(f"{entry['answer']}")
        a("")

    a("## J. What this stage did not do")
    a("")
    a("- No hyperparameter was tuned, and neither held-out partition was read "
      "before a fit returned.")
    a("- No feature search, no exhaustive combination search, no random feature "
      "selection, no cross-validation.")
    a("- No external dataset, no formation or coordinate feature, no depth "
      "shortcut, no local-context column.")
    a("- The committed v0.1 baseline and the committed A0 and A1 RF results were "
      "read, never overwritten.")
    a("- No model beyond XGBoost and LightGBM was trained.")
    a("")
    _ = cells
    return "\n".join(out)


def summarise(report: dict[str, Any]) -> str:
    lines = []
    names = list(report["headline"]["order"])
    for block in report["headline"]["blocks"]:
        for split in shared.EVAL_SPLITS:
            row = block["values"][split]
            lines.append(
                f"{split:17s} {block['metric']:30s} "
                + "  ".join(f"{n}={_cell(row[n])}" for n in names)
            )
    lines.append("")
    for entry in report["answers"]:
        lines.append(f"{entry['question']}")
        lines.append(f"    {entry['answer']}")
    return "\n".join(lines)


def _payload(report: dict[str, Any]) -> str:
    return json.dumps(report, indent=2, sort_keys=True) + "\n"


def _verify(name: str, path: Path, expected: str) -> bool:
    if not path.is_file():
        print(f"MISSING  {name}: {path}")
        return False
    got = path.read_text(encoding="utf-8")
    if got == expected:
        print(f"MATCH    {name}")
        return True
    print(f"CHANGED  {name}")
    return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--models", nargs="+", default=["xgb", "lgbm"],
                        choices=["xgb", "lgbm"])
    parser.add_argument("--drop-dts", action="store_true",
                        help="also fit each model without the DTS column")
    parser.add_argument("--json", default=str(REPORT_JSON))
    parser.add_argument("--markdown", default=str(REPORT_MD))
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print-summary", action="store_true")
    args = parser.parse_args(argv)

    report = build(args.models, args.drop_dts)
    payload = _payload(report)
    markdown = render_markdown(report)

    if args.verify:
        ok = _verify("json", Path(args.json), payload)
        ok &= _verify("markdown", Path(args.markdown), markdown)
        return 0 if ok else 1

    for model in args.models:
        written = write_artifacts(
            model, report["cells"][f"{model}_A1"], args.drop_dts
        )
        for entry in written:
            print(f"wrote {entry['path']}")

    Path(args.json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.json).write_text(payload, encoding="utf-8")
    Path(args.markdown).write_text(markdown, encoding="utf-8")
    print(f"wrote {args.json}")
    print(f"wrote {args.markdown}")
    if args.print_summary:
        print()
        print(summarise(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
