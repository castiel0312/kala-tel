#!/usr/bin/env python3
"""FORCE 2020 feature ablation. Random Forest, three feature sets, one question.

The question: do the curves added after v0.1 earn their place, and do the
missingness indicators earn theirs on top of them?

  A0  the frozen v0.1 baseline: five logs
  A1  v0.2: the five baseline logs plus every curve the inventory admitted
  A2  v0.2 plus a 0/1 availability mask for every one of those curves

A0 is *read* from the committed v0.1 report rather than retrained. Retraining it
would cost an hour and could only reproduce a number that is already frozen, and
comparing a fresh run against a stored one would confound the feature change
with any run-to-run difference. The stored A0 is the baseline, by definition of
being the thing being compared against.

Every convention comes from `data/ml/common/force2020_lithology.py` and is not
restated here: the 98/10/10 well split, the target encoding, the median imputer
fitted on training wells only, the RF hyperparameters, the metric definitions,
the penalty matrix and the leakage guard. The only thing this stage varies is the
column list, which is the entire point of an ablation.

`DTS` is reported separately. It is 85% missing on training wells and 68%
missing on the leaderboard partition, so a median-imputed column is mostly
imputation exactly where the decision is made. It cleared the coverage gate, so it
is in A1, but a reader is entitled to know whether it is carrying the result.

Usage:
    python data/ml/lithology/training/train_feature_ablation.py
    python data/ml/lithology/training/train_feature_ablation.py --sets A1 A2
    python data/ml/lithology/training/train_feature_ablation.py --print-summary
    python data/ml/lithology/training/train_feature_ablation.py --verify
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "data" / "ml" / "common"))

# LightGBM before scikit-learn, always. On this host the reverse order crashes
# the interpreter rather than raising.
import force2020_lithology as shared  # noqa: E402

REPORT_JSON = REPO_ROOT / "reports" / "force2020_feature_ablation.json"
REPORT_MD = REPO_ROOT / "reports" / "force2020_feature_ablation.md"
CACHE_DIR = REPO_ROOT / "data" / "interim" / "ml" / "force2020_litho" / "ablation_cache"

EXPERIMENT_ID = "force2020-litho-rf-feature-ablation-v0.2"

# The three feature sets. `table_version` says which built table the columns
# come from; A0's columns live in the v0.1 table and A1/A2's in the v0.2 table.
ABLATIONS: dict[str, dict[str, Any]] = {
    "A0": {
        "label": "frozen v0.1 baseline",
        "table_version": "v0.1",
        "source": "stored",
        "question": (
            "the shipped five-curve baseline, read from its committed report"
        ),
    },
    "A1": {
        "label": "expanded logs",
        "table_version": "v0.2",
        "source": "train",
        "question": (
            "do the five added curves (RHOB, NPHI, PEF, DRHO, DTS) add signal "
            "beyond the five the baseline already had"
        ),
    },
    "A2": {
        "label": "expanded logs + missingness indicators",
        "table_version": "v0.2",
        "source": "train",
        "question": (
            "does telling the model which curves were not measured, separately "
            "from what was measured, add anything on top of A1"
        ),
    },
}

# Drop-one arms. A1 won, so the open question is no longer "do the added curves
# help" but "which of them is carrying it". Each arm below is A1 with exactly one
# added curve removed, so the drop in macro F1 is the contribution of that curve
# as measured by this model on this split. These are reported separately from the
# A0/A1/A2 gate because they are a diagnostic, not candidates for release.
DROPPED_FROM_A1 = ("DRHO", "DTS", "NPHI", "PEF", "RHOB")

for _dropped in DROPPED_FROM_A1:
    ABLATIONS[f"A1-{_dropped}"] = {
        "label": f"A1 without {_dropped}",
        "table_version": "v0.2",
        "source": "train",
        "dropped": _dropped,
        "question": (
            f"how much of A1's gain over A0 survives removing {_dropped}, and so "
            f"how much of the gain that curve is responsible for"
        ),
    }
del _dropped

# A0/A1/A2 are the gate; the drop-one arms only become columns in the comparison
# tables when asked for, so the headline stays the three-arm answer.
GATE_ARMS = ("A0", "A1", "A2")

# Reported apart from the rest because of how it is sampled, not because of how
# it scores. See TRACKED_SEPARATELY_NOTE.
TRACKED_SEPARATELY = ("DTS",)
TRACKED_SEPARATELY_NOTE = (
    "DTS is reported on its own because its availability is the worst of any "
    "selected curve: 85.1% missing on training wells, 40.5% on hidden_test and "
    "68.4% on leaderboard_test. It cleared the selection stage's coverage gate "
    "(present in 8 of 10 hidden and 6 of 10 leaderboard wells), so it is in A1, "
    "but a median-imputed column that is mostly imputation on the partition used "
    "to decide retention is a different kind of evidence from one that is mostly "
    "measurement. Whether it helps is an empirical question, answered by the "
    "drop-one run rather than asserted here."
)

NO_TUNING_NOTE = (
    "no hyperparameter was searched, tuned or selected on any metric. Every "
    "model uses RFConfig() exactly as the frozen baseline did, and the only "
    "difference between the arms is the column list. That is what makes the "
    "difference in the results attributable to the features."
)

EVALUATION_NOTE = (
    "hidden_test and leaderboard_test were scored once each, after fitting, and "
    "were never used to choose a column, a curve or a hyperparameter. A0 comes "
    "from a stored report produced by the same metrics code, so the comparison "
    "is between two numbers computed by one definition."
)


def build_feature_list(name: str) -> list[str]:
    """The columns for one arm, and nothing else.

    The permitted set is passed explicitly to the shared leakage guard rather
    than bypassed: the guard still refuses depth, coordinates, stratigraphy,
    provenance and every target column, so widening what is allowed does not
    weaken what is forbidden.
    """
    spec = ABLATIONS[name]
    version = shared.feature_set(spec["table_version"])
    curves = list(version["curves"])
    if name == "A0":
        return curves
    if name in ("A1", "A2"):
        return curves + list(version["masks"]) if name == "A2" else curves
    dropped = spec.get("dropped")
    if dropped is not None:
        return [curve for curve in curves if curve != dropped]
    raise KeyError(name)


def assert_columns_are_permitted(name: str, features: Sequence[str]) -> dict:
    spec = ABLATIONS[name]
    version = shared.feature_set(spec["table_version"])
    added = set(version["added_relative_to_v0_1"])
    extra = sorted(
        (set(features) - set(shared.PRIMARY_FEATURES))
        - added
        - (set(features) & {f"{c}_MISSING" for c in version["curves"]})
    )
    if extra:
        raise ValueError(
            f"{name} carries columns that neither the frozen baseline nor the "
            f"curve inventory admitted: {extra}"
        )
    shared.assert_logs_only(
        features,
        allow=sorted(added | {f"{c}_MISSING" for c in version["curves"]}),
    )
    return {
        "features": list(features),
        "feature_count": len(features),
        "from_table_version": spec["table_version"],
        "added_relative_to_baseline": sorted(set(features) - set(shared.PRIMARY_FEATURES)),
        "leakage_guard": (
            "shared.assert_logs_only passed: no depth, coordinate, stratigraphy, "
            "provenance or target column is present"
        ),
    }


def _missingness_of(frame: Any, features: Sequence[str], split: str) -> dict:
    """Per-column missing share on one split, for the columns under test."""
    part = frame[frame[shared.SPLIT] == split]
    out = {}
    for column in features:
        if column.endswith("_MISSING"):
            continue
        series = part[column]
        out[column] = round(float(series.isna().mean()), 6)
    return {"split": split, "rows": int(len(part)), "by_column": out}


def evaluate_arm(
    name: str,
    model: Any,
    frame: Any,
    features: Sequence[str],
) -> dict:
    """Score one fitted model on both evaluation partitions."""
    lookup = shared.encoded_to_class_name()
    classes = list(shared.class_table())
    encoded_ids = [row["encoded_id"] for row in classes]
    matrix = shared.read_penalty_matrix()["matrix"]
    index_map = shared.penalty_index_map()

    train = frame[frame[shared.SPLIT] == shared.TRAIN_SPLIT]
    train_wells = sorted(train[shared.WELL].unique().tolist())

    results: dict[str, Any] = {}
    for split in shared.EVAL_SPLITS:
        part = frame[frame[shared.SPLIT] == split]
        guard = shared.assert_no_well_overlap(
            train_wells, part[shared.WELL].unique().tolist()
        )
        y_true = part[shared.TARGET].to_numpy()
        y_pred = model.predict(part[list(features)])
        per_class = shared.per_class_metrics(y_true, y_pred, encoded_ids, lookup)
        aggregate = shared.aggregate_metrics(
            y_true, y_pred, encoded_ids, int(len(part)),
            int(part[shared.WELL].nunique()), per_class,
        )
        penalty = shared.penalty_metrics(y_true, y_pred, matrix, index_map)
        counts, table = shared.confusion_frame(y_true, y_pred, encoded_ids, lookup)
        results[split] = {
            "rows": int(len(part)),
            "wells": int(part[shared.WELL].nunique()),
            "leakage_guard": guard,
            "metrics": aggregate,
            "penalty": penalty,
            "per_class": per_class,
            "confusion_counts": counts.tolist(),
            "confusion_table": table,
        }

    importances = _rf_importance(model, features)
    return {
        "ablation": name,
        "label": ABLATIONS[name]["label"],
        "question": ABLATIONS[name]["question"],
        "table_version": ABLATIONS[name]["table_version"],
        "features": list(features),
        "feature_importance": importances,
        "missingness": [
            _missingness_of(frame, features, split) for split in shared.ALL_SPLITS
        ],
        "results": results,
    }


def _rf_importance(model: Any, features: Sequence[str]) -> dict:
    """RF impurity importance, with the reason it is the weaker of the two kinds.

    Gain-based importance in a forest is computed on training data and rewards
    high-cardinality splits, so it cannot be compared across arms that have
    different column counts. Impurity importance is the number scikit-learn
    already exposes, it is what the baseline report used, and it is reported
    here for the same reason: comparability with A0, not because it is the better
    estimator of causal importance.
    """
    estimator = model[-1] if hasattr(model, "__getitem__") else model
    values = getattr(estimator, "feature_importances_", None)
    if values is None:
        return {"available": False}
    rows = sorted(
        (
            {
                "column": column,
                "importance": round(float(value), 8),
            }
            for column, value in zip(features, values, strict=False)
        ),
        key=lambda row: -row["importance"],
    )
    total = sum(row["importance"] for row in rows) or 1.0
    for row in rows:
        row["share"] = round(row["importance"] / total, 6)
    return {
        "available": True,
        "kind": "impurity, RandomForestClassifier.feature_importances_",
        "caveat": (
            "computed on training wells and not comparable across arms with "
            "different column counts; reported for within-arm ranking and for "
            "continuity with the frozen baseline"
        ),
        "by_column": rows,
    }


def _sha256_of(path: Path) -> str:
    """Content hash of a file, read in chunks so a 1.4M-row CSV stays out of RAM."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _fingerprint(name: str, features: Sequence[str], config: shared.RFConfig) -> str:
    """Identity of one arm, so a cache entry can never outlive its own inputs.

    Keyed on the column list, the model settings and the table's own SHA-256.
    Change a column or a hyperparameter and the key changes; the cache is then
    describing a different experiment and is correctly ignored.
    """
    version = shared.feature_set(ABLATIONS[name]["table_version"])
    payload = json.dumps(
        {
            "arm": name,
            "table_version": ABLATIONS[name]["table_version"],
            "features": list(features),
            "config": {
                "n_estimators": config.n_estimators,
                "max_depth": config.max_depth,
                "min_samples_split": config.min_samples_split,
                "min_samples_leaf": config.min_samples_leaf,
                "max_features": config.max_features,
                "class_weight": config.class_weight,
                "random_state": config.random_state,
                "n_jobs": config.n_jobs,
            },
            "table_sha256": _sha256_of(version["table"]),
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def _cache_path(name: str, digest: str) -> Path:
    return CACHE_DIR / f"{name}_{digest}.json"


def run_arm(name: str, config: shared.RFConfig) -> dict:
    features = build_feature_list(name)
    schema = assert_columns_are_permitted(name, features)
    version = shared.feature_set(ABLATIONS[name]["table_version"])
    digest = _fingerprint(name, features, config)
    cache = _cache_path(name, digest)
    if cache.is_file():
        cached = json.loads(cache.read_text(encoding="utf-8"))
        cached["schema"] = schema
        cached["from_cache"] = True
        return cached

    frame = shared.load_dataset(
        [shared.WELL, shared.SPLIT, shared.TARGET, *features],
        path=version["table"],
    )
    train = frame[frame[shared.SPLIT] == shared.TRAIN_SPLIT]
    pipeline = shared.build_pipeline(config, features)
    started = time.time()
    pipeline.fit(
        train[list(features)], train[shared.TARGET].to_numpy()
    )
    elapsed = time.time() - started
    arm = evaluate_arm(name, pipeline, frame, features)
    arm["schema"] = schema
    arm["fit"] = {
        "rows": int(len(train)),
        "wells": int(train[shared.WELL].nunique()),
        "seconds": round(elapsed, 2),
        "config": {
            "n_estimators": config.n_estimators,
            "max_depth": config.max_depth,
            "min_samples_split": config.min_samples_split,
            "min_samples_leaf": config.min_samples_leaf,
            "max_features": config.max_features,
            "class_weight": config.class_weight,
            "random_state": config.random_state,
        },
        "imputer": shared.IMPUTER_STRATEGY,
        "imputer_note": shared.IMPUTER_NOTE,
    }
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(
        json.dumps(arm, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    arm["from_cache"] = False
    return arm


def stored_baseline() -> dict:
    """A0, read from the frozen RF report rather than retrained.

    The stored numbers were produced by the same `shared` metric functions this
    stage uses, so A0 and the trained arms are compared by one definition rather
    than by two that happen to look alike.
    """
    report = shared.read_rf_report()
    primary = report["primary_results"]
    return {
        "ablation": "A0",
        "label": ABLATIONS["A0"]["label"],
        "question": ABLATIONS["A0"]["question"],
        "table_version": "v0.1",
        "source": "stored",
        "features": list(shared.PRIMARY_FEATURES),
        "feature_importance": None,
        "results": {
            split: {
                "rows": primary[split]["rows"],
                "wells": primary[split]["wells"],
                "leakage_guard": primary[split]["leakage_guard"],
                "metrics": primary[split]["aggregate"],
                "penalty": primary[split]["penalty"],
                "per_class": primary[split]["per_class"],
                "confusion_counts": primary[split]["confusion_matrix"]["counts"],
            }
            for split in shared.EVAL_SPLITS
        },
    }


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------
METRIC_KEYS = (
    ("macro_f1", "macro F1"),
    ("macro_f1_supported_only", "macro F1, supported only"),
    ("weighted_f1", "weighted F1"),
    ("balanced_accuracy", "balanced accuracy"),
)


def _value(arm: dict, split: str, key: str) -> float | None:
    return arm["results"][split]["metrics"][key]["value"]


def _penalty(arm: dict, split: str) -> float | None:
    return arm["results"][split]["penalty"]["mean_penalty"]


def compare(arms: dict[str, dict]) -> dict:
    """A0 against A1 and A2, per metric and per class, on both partitions."""
    rows = []
    for split in shared.EVAL_SPLITS:
        for key, label in METRIC_KEYS:
            row = {
                "partition": split,
                "metric": label,
                "metric_key": key,
                **{arm: _value(arms[arm], split, key) for arm in arms},
            }
            base = row.get("A0")
            for arm in ("A1", "A2"):
                if base is not None and row.get(arm) is not None:
                    row[f"delta_{arm}_vs_A0"] = round(row[arm] - base, 6)
            rows.append(row)
        penalty_row = {
            "partition": split,
            "metric": "mean penalty (lower is better)",
            "metric_key": "mean_penalty",
            **{arm: _penalty(arms[arm], split) for arm in arms},
        }
        for arm in ("A1", "A2"):
            if penalty_row["A0"] is not None and penalty_row[arm] is not None:
                penalty_row[f"delta_{arm}_vs_A0"] = round(
                    penalty_row[arm] - penalty_row["A0"], 6
                )
        rows.append(penalty_row)

    per_class = []
    for split in shared.EVAL_SPLITS:
        base_rows = {
            row["class_name"]: row
            for row in arms["A0"]["results"][split]["per_class"]
        }
        for arm in ("A1", "A2"):
            for row in arms[arm]["results"][split]["per_class"]:
                base = base_rows.get(row["class_name"], {})
                base_f1 = base.get("f1")
                per_class.append({
                    "partition": split,
                    "ablation": arm,
                    "class_name": row["class_name"],
                    "support": row["support"],
                    "a0_f1": base_f1,
                    "f1": row["f1"],
                    "delta_f1_vs_A0": (
                        round(row["f1"] - base_f1, 6)
                        if base_f1 is not None and row["f1"] is not None
                        else None
                    ),
                    "a0_predicted": base.get("predicted"),
                    "predicted": row["predicted"],
                })

    return {"headline": rows, "per_class": per_class}


def decision_gate(comparison: dict, arms: dict[str, dict]) -> dict:
    """Apply the stated rule to the measured numbers, and say what it decided.

    "Meaningful" is fixed before the numbers are seen: macro F1 is the primary
    criterion, a move of 0.01 or more on *both* evaluation partitions counts as
    an improvement, and balanced accuracy is required to agree in sign. Balanced
    accuracy is part of the rule rather than a tiebreaker because macro F1 rewards
    a model that keeps predicting thin classes while balanced accuracy does not.
    """
    rows = {
        (r["partition"], r["metric_key"]): r for r in comparison["headline"]
    }
    verdict: dict[str, Any] = {"threshold": 0.01, "criterion": (
        "macro F1 improves by at least 0.01 on both evaluation partitions, "
        "with balanced accuracy agreeing in sign"
    )}
    hidden_split, leader_split = shared.EVAL_SPLITS
    for arm in ("A1", "A2"):
        hidden = rows[(hidden_split, "macro_f1")].get(f"delta_{arm}_vs_A0")
        leader = rows[(leader_split, "macro_f1")].get(f"delta_{arm}_vs_A0")
        bal_hidden = rows[(hidden_split, "balanced_accuracy")].get(f"delta_{arm}_vs_A0")
        bal_leader = rows[(leader_split, "balanced_accuracy")].get(f"delta_{arm}_vs_A0")
        improved = (
            hidden is not None and leader is not None
            and hidden >= 0.01 and leader >= 0.01
        )
        agrees = (bal_hidden is None or bal_leader is None
                  or (bal_hidden >= 0 and bal_leader >= 0))
        verdict[arm] = {
            "macro_f1_delta_hidden": hidden,
            "macro_f1_delta_leaderboard": leader,
            "balanced_accuracy_delta_hidden": bal_hidden,
            "balanced_accuracy_delta_leaderboard": bal_leader,
            "meets_threshold": bool(improved and agrees),
        }
    winners = [arm for arm in ("A1", "A2") if verdict[arm]["meets_threshold"]]
    verdict["improved"] = bool(winners)
    verdict["strongest_arm"] = (
        max(
            winners,
            key=lambda arm: (
                rows[(hidden_split, "macro_f1")][arm]
                + rows[(leader_split, "macro_f1")][arm]
            ),
        )
        if winners
        else None
    )
    verdict["next_step"] = (
        f"run XGBoost and LightGBM on {verdict['strongest_arm']}'s feature set"
        if winners
        else "do not run the remaining feature combinations; go to the 1D CNN on "
        "the strongest validated feature set, which is A0 unless an arm wins"
    )
    verdict["attribution_needed"] = bool(winners)
    return verdict


def compare_drop_one(arms: dict[str, dict]) -> dict:
    """Each drop-one arm against full A1, per partition.

    The number that matters is `cost_of_removal`: A1's macro F1 minus this
    arm's. A curve that is contributing gives a positive cost; a curve that is
    dead weight gives zero or negative. Attributing it this way, rather than
    reading impurity importance, is what makes the answer falsifiable, because
    importance is a property of one fitted forest and removal is a test.
    """
    if "A1" not in arms:
        return {"rows": []}
    reference = arms["A1"]
    rows = []
    for split in shared.EVAL_SPLITS:
        full = _value(reference, split, "macro_f1")
        for curve in DROPPED_FROM_A1:
            name = f"A1-{curve}"
            if name not in arms:
                continue
            arm = arms[name]
            value = _value(arm, split, "macro_f1")
            rows.append({
                "partition": split,
                "dropped_curve": curve,
                "arm": name,
                "a1_macro_f1": full,
                "arm_macro_f1": value,
                "cost_of_removal": (
                    round(full - value, 6)
                    if full is not None and value is not None
                    else None
                ),
                "delta_vs_A0": (
                    round(value - _value(arms["A0"], split, "macro_f1"), 6)
                    if "A0" in arms and value is not None
                    else None
                ),
                "still_beats_A0": (
                    bool(value > _value(arms["A0"], split, "macro_f1"))
                    if "A0" in arms and value is not None
                    else None
                ),
            })
    return {"rows": rows}


def attribution(comparison: dict, arms: dict[str, dict]) -> dict:
    """Which added curves are actually earning their column, on both partitions."""
    by_curve: dict[str, dict[str, Any]] = {}
    for row in comparison.get("rows", []):
        entry = by_curve.setdefault(row["dropped_curve"], {})
        entry[row["partition"]] = row
    verdicts = {}
    for curve, splits in by_curve.items():
        costs = {
            split: data.get("cost_of_removal")
            for split, data in splits.items()
        }
        values = [v for v in costs.values() if v is not None]
        consistent_positive = len(values) == len(costs) and all(v > 0 for v in values)
        verdicts[curve] = {
            "cost_of_removal": costs,
            "mean_cost_of_removal": (
                round(sum(values) / len(values), 6) if values else None
            ),
            "contributes_on_both_partitions": bool(consistent_positive),
            "verdict": (
                "contributing"
                if consistent_positive
                else "does not survive removal on both partitions"
            ),
        }
    ranked = sorted(
        (
            (curve, data)
            for curve, data in verdicts.items()
            if data["mean_cost_of_removal"] is not None
        ),
        key=lambda item: -item[1]["mean_cost_of_removal"],
    )
    return {
        "by_curve": verdicts,
        "ranked_by_contribution": [
            {"curve": curve, **data} for curve, data in ranked
        ],
        "method": (
            "each row is a full A1 refit with exactly one curve removed, same "
            "config, same split, no other change. Cost of removal is A1 macro F1 "
            "minus the refit's macro F1."
        ),
    }


def environment() -> dict:
    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "sklearn": __import__("sklearn").__version__,
        "numpy": __import__("numpy").__version__,
        "lightgbm": _optional_version("lightgbm"),
        "xgboost": _optional_version("xgboost"),
    }


def _optional_version(name: str) -> str | None:
    try:
        return __import__(name).__version__
    except Exception:  # pragma: no cover - optional dependency
        return None


def build(sets: Sequence[str]) -> dict:
    config = shared.RFConfig()
    arms: dict[str, dict] = {}
    if "A0" in sets:
        arms["A0"] = stored_baseline()
    for name in sets:
        if name == "A0":
            continue
        print(f"fitting {name}: {ABLATIONS[name]['label']}", flush=True)
        arms[name] = run_arm(name, config)
        for split in shared.EVAL_SPLITS:
            value = _value(arms[name], split, "macro_f1")
            print(
                f"  {name} {split:17s} macro F1 {value:+.4f}",
                f"(A0 {_value(arms['A0'], split, 'macro_f1'):+.4f})"
                if "A0" in arms else "",
                flush=True,
            )
    for arm in arms.values():
        # Fit duration and cache provenance are facts about this run, not about
        # the experiment. They stay in the cache file and out of the committed
        # report, so `--verify` compares results rather than wall clock.
        arm.pop("from_cache", None)
        if isinstance(arm.get("fit"), dict):
            arm["fit"].pop("seconds", None)
    ordered = {name: arms[name] for name in sorted(arms)}
    gate_arms = {
        name: ordered[name] for name in GATE_ARMS if name in ordered
    }
    enough_for_gate = all(name in ordered for name in GATE_ARMS)
    comparison = (
        compare(gate_arms) if enough_for_gate else {"headline": [], "per_class": []}
    )
    gate = decision_gate(comparison, gate_arms) if enough_for_gate else {}
    drop_one = compare_drop_one(ordered) if "A1" in ordered else {"rows": []}
    return {
        "stage": "force2020_feature_ablation",
        "experiment_id": EXPERIMENT_ID,
        "model": "RandomForestClassifier",
        "arms": ordered,
        "gate_arms": list(GATE_ARMS),
        "definitions": {name: spec for name, spec in ABLATIONS.items()},
        "comparison": comparison,
        "drop_one": drop_one,
        "attribution": (
            attribution(drop_one, ordered) if drop_one["rows"] else {}
        ),
        "decision_gate": gate,
        "tracked_separately": {
            "columns": list(TRACKED_SEPARATELY),
            "note": TRACKED_SEPARATELY_NOTE,
        },
        "no_tuning": NO_TUNING_NOTE,
        "evaluation": EVALUATION_NOTE,
        "environment": environment(),
    }


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------
def _cell(value: object, places: int = 4) -> str:
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:+.{places}f}" if places == 4 else f"{value:.{places}f}"
    return str(value)


def render_markdown(report: dict) -> str:
    out: list[str] = []
    a = out.append
    a("# FORCE 2020 feature ablation: Random Forest, A0 vs A1 vs A2")
    a("")
    a("| | |")
    a("|---|---|")
    a(f"| experiment | `{report['experiment_id']}` |")
    a(f"| model | {report['model']} |")
    a("| arms | " + ", ".join(f"`{name}`" for name in report["arms"]) + " |")
    a("")
    a("## What each arm is")
    a("")
    a("| arm | table | columns | question |")
    a("|---|---|---:|---|")
    for name, spec in report["definitions"].items():
        if name not in report["arms"]:
            continue
        arm = report["arms"][name]
        a(
            f"| `{name}` | `{spec['table_version']}` | "
            f"{len(arm['features'])} | {spec['question']} |"
        )
    a("")
    a(f"**{report['no_tuning']}**")
    a("")
    a(f"**{report['evaluation']}**")
    a("")

    a("## Headline")
    a("")
    a("| partition | metric | A0 | A1 | A2 | A1 vs A0 | A2 vs A0 |")
    a("|---|---|---:|---:|---:|---:|---:|")
    for row in report["comparison"]["headline"]:
        a(
            f"| `{row['partition']}` | {row['metric']} | "
            f"{_cell(row.get('A0'))} | {_cell(row.get('A1'))} | {_cell(row.get('A2'))} | "
            f"{_cell(row.get('delta_A1_vs_A0'))} | {_cell(row.get('delta_A2_vs_A0'))} |"
        )
    a("")

    a("## Per-class F1")
    a("")
    for split in report["arms"]["A0"]["results"] if "A0" in report["arms"] else []:
        a(f"### `{split}`")
        a("")
        a("| class | support | A0 F1 | A1 F1 | A1 delta | A2 F1 | A2 delta |")
        a("|---|---:|---:|---:|---:|---:|---:|")
        rows = [r for r in report["comparison"]["per_class"] if r["partition"] == split]
        base = {
            r["class_name"]: r for r in
            report["arms"]["A0"]["results"][split]["per_class"]
        }
        for entry in sorted(base.values(), key=lambda r: -r["support"]):
            name = entry["class_name"]
            a1 = next((r for r in rows if r["ablation"] == "A1" and r["class_name"] == name), None)
            a2 = next((r for r in rows if r["ablation"] == "A2" and r["class_name"] == name), None)
            a(
                f"| {name} | {entry['support']:,} | {_cell(entry['f1'])} | "
                f"{_cell(a1['f1']) if a1 else None} | {_cell(a1['delta_f1_vs_A0']) if a1 else None} | "
                f"{_cell(a2['f1']) if a2 else None} | {_cell(a2['delta_f1_vs_A0']) if a2 else None} |"
            )
        a("")

    a("## Confusion matrices")
    a("")
    lookup = {int(k): v for k, v in shared.encoded_to_class_name().items()}
    for split in shared.EVAL_SPLITS:
        a(f"### `{split}`: rows true, columns predicted")
        a("")
        names = [lookup[i] for i in sorted(lookup)]
        a("| true \\ pred | " + " | ".join(names) + " |")
        a("|---" * (len(names) + 1) + "|")
        for arm_name, arm in report["arms"].items():
            counts = arm["results"][split]["confusion_counts"]
            a(f"**{arm_name}**")
            a("")
            for i, row in enumerate(counts):
                a(f"| {names[i]} | " + " | ".join(str(v) for v in row) + " |")
            a("")

    a("## Feature importance")
    a("")
    for name, arm in report["arms"].items():
        importance = arm.get("feature_importance") or {}
        if not importance.get("available"):
            continue
        a(f"### `{name}`")
        a("")
        a(f"*{importance['kind']}. {importance['caveat']}.*")
        a("")
        a("| column | importance | share |")
        a("|---|---:|---:|")
        for row in importance["by_column"]:
            flag = " **(tracked)**" if row["column"] in TRACKED_SEPARATELY else ""
            a(f"| `{row['column']}`{flag} | {row['importance']:.6f} | {row['share']:.4f} |")
        a("")

    a("## Tracked separately")
    a("")
    a(report["tracked_separately"]["note"])
    a("")
    for name, arm in report["arms"].items():
        if not (arm.get("feature_importance") or {}).get("available"):
            continue
        a(f"**{name}** measured availability by column, on each split:")
        a("")
        a("| column | train | hidden_test | leaderboard_test |")
        a("|---|---:|---:|---:|")
        by_split = {m["split"]: m["by_column"] for m in arm["missingness"]}
        for column in arm["features"]:
            if column.endswith("_MISSING"):
                continue
            a(
                f"| `{column}` | {by_split.get(shared.TRAIN_SPLIT, {}).get(column, 0):.4f} | "
                f"{by_split.get(shared.EVAL_SPLITS[0], {}).get(column, 0):.4f} | "
                f"{by_split.get(shared.EVAL_SPLITS[1], {}).get(column, 0):.4f} |"
            )
        a("")

    a("## Drop-one attribution")
    a("")
    drop_one = report.get("drop_one") or {"rows": []}
    attributed = report.get("attribution") or {}
    if not drop_one["rows"]:
        a("Not run. Pass `--drop-one` to measure which added curve carries A1's gain.")
    else:
        a(attributed.get("method", ""))
        a("")
        a("| dropped curve | A1 macro F1 | without it | cost of removal | still beats A0 |")
        a("|---|---|---|---:|---|")
        for row in drop_one["rows"]:
            if row["partition"] != shared.EVAL_SPLITS[0]:
                continue
            a(
                f"| `{row['dropped_curve']}` | {_cell(row['a1_macro_f1'])} | "
                f"{_cell(row['arm_macro_f1'])} | {_cell(row['cost_of_removal'])} | "
                f"{'yes' if row['still_beats_A0'] else 'no'} |"
            )
        a("")
        a("Same table for the leaderboard partition:")
        a("")
        a("| dropped curve | A1 macro F1 | without it | cost of removal | still beats A0 |")
        a("|---|---|---|---:|---|")
        for row in drop_one["rows"]:
            if row["partition"] != shared.EVAL_SPLITS[1]:
                continue
            a(
                f"| `{row['dropped_curve']}` | {_cell(row['a1_macro_f1'])} | "
                f"{_cell(row['arm_macro_f1'])} | {_cell(row['cost_of_removal'])} | "
                f"{'yes' if row['still_beats_A0'] else 'no'} |"
            )
        a("")
        a("Ranked by mean cost of removal across both partitions:")
        a("")
        a("| curve | mean cost | hidden | leaderboard | verdict |")
        a("|---|---:|---:|---:|---|")
        for entry in attributed.get("ranked_by_contribution", []):
            a(
                f"| `{entry['curve']}` | {_cell(entry['mean_cost_of_removal'])} | "
                f"{_cell(entry['cost_of_removal'][shared.EVAL_SPLITS[0]])} | "
                f"{_cell(entry['cost_of_removal'][shared.EVAL_SPLITS[1]])} | "
                f"{entry['verdict']} |"
            )
    a("")

    a("## Decision gate")
    a("")
    gate = report.get("decision_gate") or {}
    if gate:
        a(f"Criterion, fixed in advance: {gate['criterion']}.")
        a("")
        a("| arm | macro F1 Δ hidden | macro F1 Δ leader | bal acc Δ hidden | bal acc Δ leader | meets threshold |")
        a("|---|---:|---:|---:|---:|---|")
        for arm in ("A1", "A2"):
            if arm not in gate:
                continue
            row = gate[arm]
            a(
                f"| `{arm}` | {_cell(row['macro_f1_delta_hidden'])} | "
                f"{_cell(row['macro_f1_delta_leaderboard'])} | "
                f"{_cell(row['balanced_accuracy_delta_hidden'])} | "
                f"{_cell(row['balanced_accuracy_delta_leaderboard'])} | "
                f"{'yes' if row['meets_threshold'] else 'no'} |"
            )
        a("")
        a(f"**Improved:** {gate.get('improved')}.  ")
        a(f"**Strongest arm:** `{gate.get('strongest_arm')}`.  ")
        a(f"**Next step:** {gate.get('next_step')}.")
    a("")
    return "\n".join(out)


def _payload(report: dict) -> str:
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
    parser.add_argument("--sets", nargs="+", default=["A0", "A1", "A2"],
                        choices=sorted(ABLATIONS))
    parser.add_argument(
        "--drop-one", action="store_true",
        help=(
            "additionally fit A1 with each added curve removed, to attribute "
            "A1's gain. Only meaningful once A1 is in --sets."
        ),
    )
    parser.add_argument("--json", default=str(REPORT_JSON))
    parser.add_argument("--markdown", default=str(REPORT_MD))
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print-summary", action="store_true")
    args = parser.parse_args(argv)

    sets = list(args.sets)
    if args.drop_one:
        if "A1" not in sets:
            parser.error("--drop-one needs A1 in --sets to measure removal against")
        for curve in DROPPED_FROM_A1:
            name = f"A1-{curve}"
            if name not in sets:
                sets.append(name)

    report = build(sets)
    payload = _payload(report)
    markdown = render_markdown(report)

    if args.verify:
        ok = _verify("json", Path(args.json), payload)
        ok &= _verify("markdown", Path(args.markdown), markdown)
        return 0 if ok else 1

    Path(args.json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.json).write_text(payload, encoding="utf-8")
    Path(args.markdown).write_text(markdown, encoding="utf-8")
    print(f"wrote {args.json}")
    print(f"wrote {args.markdown}")
    if args.print_summary:
        print()
        print(summarise(report))
    return 0


def summarise(report: dict) -> str:
    lines = []
    for row in report["comparison"]["headline"]:
        lines.append(
            f"{row['partition']:17s} {row['metric']:34s} "
            + "  ".join(
                f"{arm}={_cell(row.get(arm))}" for arm in ("A0", "A1", "A2")
                if row.get(arm) is not None
            )
        )
    gate = report.get("decision_gate") or {}
    if gate:
        lines.append("")
        lines.append(f"improved        : {gate.get('improved')}")
        lines.append(f"strongest arm   : {gate.get('strongest_arm')}")
        lines.append(f"next step       : {gate.get('next_step')}")
    for entry in (report.get("attribution") or {}).get("ranked_by_contribution", []):
        lines.append(
            f"drop {entry['curve']:<5s}       : cost of removal "
            f"{entry['mean_cost_of_removal']:+.4f}  ({entry['verdict']})"
        )
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
