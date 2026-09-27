"""Build the Random Forest versus XGBoost versus LightGBM comparison report.

Reads the three committed baseline reports and writes
`reports/force2020_model_comparison.json` and `.md`.

This script fits nothing. It exists so the comparison is derived from the
committed reports rather than retyped, which is the only way the comparison can
stay true as the individual reports change: if a baseline report is wrong, this
report is wrong in the same way, visibly, rather than quietly disagreeing with
it.

The comparison refuses to name a winner. The gap between the two ten-well
evaluation partitions for a single model is larger than the gap between the
models on either partition, so a single-number ranking would be reporting which
wells were held out rather than which model is better.

    python scripts/reports/build_model_comparison.py
    python scripts/reports/build_model_comparison.py --check
"""
from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "data" / "ml" / "common"))

import force2020_lithology as shared  # noqa: E402

REPORT_ID = "force2020-model-comparison"
STAGE = "modelling / cross-model comparison"

SOURCES = (
    ("rf", "Random Forest", shared.REPORT_JSON, shared.EXPERIMENT_ID),
    ("xgb", "XGBoost", shared.GBDT_REPORT_JSON, shared.XGB_EXPERIMENT_ID),
    ("lgbm", "LightGBM", shared.GBDT_REPORT_JSON, shared.LGBM_EXPERIMENT_ID),
)

HEADLINE_METRICS = (
    ("macro_f1", "Macro F1 (all 12 classes)"),
    ("macro_f1_supported_only", "Macro F1 (classes with support)"),
    ("weighted_f1", "Weighted F1"),
    ("balanced_accuracy", "Balanced accuracy"),
)

DIAGNOSTICS = (
    ("primary", "Primary: five log curves"),
    ("depth_only", "Depth-only diagnostic"),
    ("logs_plus_masks", "Logs plus missingness masks"),
    ("primary_unweighted", "Primary, unweighted refit"),
)


def num(value: float | None, digits: int = 4) -> str:
    return "n/a" if value is None else f"{value:.{digits}f}"


def rf_value(forest: dict[str, Any], split: str, metric: str) -> float | None:
    node = forest["primary_results"][split]["aggregate"][metric]
    return float(node["value"])


def gbdt_value(report: dict[str, Any], model: str, split: str, metric: str) -> float | None:
    results = report["models"][model]["experiments"]["primary"]["results"][split]
    return float(results["aggregate"][metric]["value"])


def rf_penalty(forest: dict[str, Any], split: str) -> float:
    return float(forest["primary_results"][split]["penalty"]["competition_score"])


def gbdt_penalty(report: dict[str, Any], model: str, split: str) -> float:
    results = report["models"][model]["experiments"]["primary"]["results"][split]
    return float(results["penalty"]["competition_score"])


def collect() -> dict[str, dict[str, Any]]:
    """Headline numbers per model per partition, read from the committed reports."""
    forest = shared.read_rf_report()
    boosters = shared.read_gbdt_report()
    collected: dict[str, dict[str, Any]] = {}

    for key, label, path, experiment_id in SOURCES:
        if not path.exists():
            raise SystemExit(
                f"{path} is missing. The comparison is derived from the baseline reports and "
                f"cannot be built without {label}'s."
            )
        rows: dict[str, Any] = {}
        for split in shared.EVAL_SPLITS:
            if key == "rf":
                values = {metric: rf_value(forest, split, metric) for metric, _ in HEADLINE_METRICS}
                penalty = rf_penalty(forest, split)
                evaluated = forest["primary_results"][split]
            else:
                values = {
                    metric: gbdt_value(boosters, key, split, metric) for metric, _ in HEADLINE_METRICS
                }
                penalty = gbdt_penalty(boosters, key, split)
                evaluated = boosters["models"][key]["experiments"]["primary"]["results"][split]
            rows[split] = {
                "rows": int(evaluated["rows"]),
                "wells": int(evaluated["wells"]),
                "metrics": values,
                "penalty_score": penalty,
                "classes_zero_support": list(evaluated["aggregate"]["classes_zero_support"]),
            }
        collected[key] = {
            "label": label,
            "source_report": path.relative_to(REPO_ROOT).as_posix(),
            "experiment_id": experiment_id,
            "results": rows,
        }
    return collected


def diagnostics_section() -> dict[str, Any]:
    """The four experiments, for the two boosters. The forest's are in its own report."""
    boosters = shared.read_gbdt_report()
    out: dict[str, Any] = {}
    for model in ("xgb", "lgbm"):
        rows: dict[str, Any] = {}
        for key, title in DIAGNOSTICS:
            if key not in boosters["models"][model]["experiments"]:
                continue
            experiment = boosters["models"][model]["experiments"][key]
            rows[key] = {
                "title": title,
                "features": list(experiment["features"]),
                "class_weighting": experiment["class_weighting"],
                "results": {
                    split: {
                        "macro_f1": float(
                            experiment["results"][split]["aggregate"]["macro_f1"]["value"]
                        ),
                        "balanced_accuracy": float(
                            experiment["results"][split]["aggregate"]["balanced_accuracy"]["value"]
                        ),
                    }
                    for split in shared.EVAL_SPLITS
                },
            }
        out[model] = rows
    return out


def spread(collected: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """How far apart the models are, against how far apart the partitions are."""
    metrics: dict[str, Any] = {}
    for metric, _ in HEADLINE_METRICS:
        per_split = {}
        for split in shared.EVAL_SPLITS:
            values = [collected[key]["results"][split]["metrics"][metric] for key in collected]
            per_split[split] = {
                "values": values,
                "spread": round(max(values) - min(values), 6),
            }
        partition_spread = {
            key: abs(collected[key]["results"]["hidden_test"]["metrics"][metric]
                     - collected[key]["results"]["leaderboard_test"]["metrics"][metric])
            for key in collected
        }
        between = max(row["spread"] for row in per_split.values())
        within = max(partition_spread.values())
        metrics[metric] = {
            "between_models_by_split": per_split,
            "within_model_between_partitions": {
                key: round(value, 6) for key, value in partition_spread.items()
            },
            "between_models_max": round(between, 6),
            "within_model_between_partitions_max": round(within, 6),
            "partition_effect_dominates": between < within,
            "reading": (
                f"For {metric}, the three models sit within {between:.4f} of each other on "
                f"either partition, while a single model moves by up to {within:.4f} between the "
                f"two partitions. The partition choice is the larger effect."
                if between < within
                else
                f"For {metric}, the three models sit within {between:.4f} of each other on "
                f"either partition, while a single model moves by up to {within:.4f} between the "
                f"two partitions. Here the model choice is the larger effect, so this metric "
                f"does separate the three models more than the partition choice does. It is "
                f"still not a ranking: one number per model on ten wells carries no interval, "
                f"and the ordering on the other partition is not tested."
            ),
        }
    return metrics


def _guards_by_split(report: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Leakage guards keyed by split.

    The two baseline reports record the same guards in different shapes: the
    forest as a list of rows, the boosters as a mapping. Normalised here so the
    comparison checks one thing rather than two spellings of it.
    """
    guards = report["split"]["leakage_guards"]
    if isinstance(guards, list):
        return {str(row["split"]): row for row in guards}
    return {str(split): row for split, row in guards.items()}


def build_report() -> dict[str, Any]:
    collected = collect()
    forest = shared.read_rf_report()
    boosters = shared.read_gbdt_report()

    # The split facts come from the split manifest and the dataset manifest, not
    # from either baseline report, and then both reports are checked against
    # them. A comparison that quoted one report's copy of the split would inherit
    # that report's mistakes without showing them.
    reference = shared.split_manifest_reference()
    summary = shared.read_manifest()["split_summary"]
    wells_by_split = {split: int(summary[split]["wells"]) for split in shared.ALL_SPLITS}
    rows_by_split = {split: int(summary[split]["rows"]) for split in shared.ALL_SPLITS}
    if wells_by_split != {split: int(value) for split, value in reference["wells_by_split"].items()}:
        raise SystemExit(
            "the split manifest and the dataset manifest disagree on well counts; refusing to "
            "write a comparison that picks one of them"
        )
    for name, report in (("Random Forest", forest), ("gradient-boosted", boosters)):
        for split, guard in _guards_by_split(report).items():
            if guard["shared_wells"] != 0:
                raise SystemExit(f"{name} reports shared wells in {split}; comparison aborted")
        if report["split"]["fitted_on"] != "train":
            raise SystemExit(f"{name} does not record fitting on the train partition")
        if report["split"]["row_level_random_split"] is not False:
            raise SystemExit(f"{name} does not record an unchanged well-level split")
    if boosters["split"]["wells_by_split"] != wells_by_split:
        raise SystemExit("the gradient-boosted report's well counts differ from the manifests")
    if boosters["split"]["rows_by_split"] != rows_by_split:
        raise SystemExit("the gradient-boosted report's row counts differ from the manifests")

    report_spread = spread(collected)
    dominant = [
        title for metric, title in HEADLINE_METRICS
        if report_spread[metric]["partition_effect_dominates"]
    ]
    exceptions = [
        title for metric, title in HEADLINE_METRICS
        if not report_spread[metric]["partition_effect_dominates"]
    ]

    held_identical = {
        "dataset_id": shared.DATASET_ID,
        "dataset_sha256": shared.read_manifest()["sha256"],
        "primary_features": list(shared.PRIMARY_FEATURES),
        "target": shared.TARGET,
        "target_classes": 12,
        "split_policy": reference["policy"],
        "split_manifest": reference["path"],
        "split_manifest_sha256": reference["sha256"],
        "wells_by_split": wells_by_split,
        "rows_by_split": rows_by_split,
        "imputation": shared.IMPUTER_STRATEGY,
        "imputation_fitted_on": "training wells only",
        "metrics": [metric for metric, _ in HEADLINE_METRICS] + ["penalty_score"],
        "metric_implementation": "one shared module, data/ml/common/force2020_lithology.py",
        "model_selection_performed": False,
    }

    differing = [
        "The estimator and its fixed configuration. That is the subject of the comparison.",
        "The class-balancing mechanism. A forest takes class_weight='balanced_subsample'; "
        "neither boosting library has that argument, so the same intent is per-row sample "
        "weights. Each library was measured, not assumed to behave like the forest.",
        "LightGBM's deterministic=True and force_row_wise=True, which are reproducibility "
        "settings rather than accuracy choices.",
    ]

    dominant = sorted(
        title for metric, title in HEADLINE_METRICS if report_spread[metric]["partition_effect_dominates"]
    )
    exceptions = sorted(
        title for metric, title in HEADLINE_METRICS if not report_spread[metric]["partition_effect_dominates"]
    )

    return {
        "report_id": REPORT_ID,
        "stage": STAGE,
        "model_status": (
            "Comparison of three untuned baselines. None of them is the best model on this "
            "dataset, none is production-ready, and none is deployed or served."
        ),
        "purpose": (
            "Place the two gradient-boosted tree baselines next to the existing Random Forest "
            "baseline on identical data, features, target, split, preprocessing and metrics, "
            "and state what the comparison can and cannot support."
        ),
        "derivation": {
            "entrypoint": "scripts/reports/build_model_comparison.py",
            "fits_anything": False,
            "note": (
                "Every number here is read out of a committed baseline report. This script "
                "recomputes nothing, so the comparison cannot silently disagree with the "
                "reports it compares."
            ),
            "sources": [
                {"model": key, "label": label, "report": path.relative_to(REPO_ROOT).as_posix()}
                for key, label, path, _ in SOURCES
            ],
        },
        "held_identical": held_identical,
        "what_differs_and_why": differing,
        "models": collected,
        "spread": report_spread,
        "diagnostics": diagnostics_section(),
        "feature_importance_pattern": {
            "features": list(shared.PRIMARY_FEATURES),
            "random_forest_impurity_share": forest["model_configuration"]["feature_importances"],
            "xgboost_gain_share": {
                row["feature"]: row["gain_share"]
                for row in boosters["models"]["xgb"]["feature_importance"]
            },
            "lightgbm_gain_share": {
                row["feature"]: row["gain_share"]
                for row in boosters["models"]["lgbm"]["feature_importance"]
            },
            "caution": (
                "The forest's number is mean decrease in impurity; the boosters' is total loss "
                "reduction over a different number of trees with a different growth rule. These "
                "are three different quantities and are not ranked against each other. Only the "
                "pattern is comparable: which curve each model leans on most."
            ),
        },
        "no_winner": {
            "declared": True,
            "metrics_where_partition_effect_dominates": dominant,
            "metrics_where_model_effect_dominates": exceptions,
            "reason": (
                "Each model is scored on two ten-well partitions. For "
                + ", ".join(dominant)
                + " the gap between the two partitions, for a single model, is larger than the "
                "gap between the three models, so a difference of the size seen here does not "
                "distinguish the models: it distinguishes which ten wells were held out. A model "
                "that leads on one partition and trails on the other is reporting the wells, not "
                "its own quality. No model is called best, and no average across the two "
                "partitions is computed, because that average would hide the disagreement it "
                "exists to resolve."
            ),
            "exceptions_stated_plainly": (
                "This is not true of every metric. On "
                + ", ".join(exceptions)
                + " the gap between the models is larger than the gap between the partitions, so "
                "that metric does separate the three models more than the partition choice does. "
                "It is reported as a difference, not as a ranking, for two reasons: a single "
                "number per model on ten wells carries no interval, and weighted F1 is dominated "
                "by the two large classes, so it is the metric least able to see the rare classes "
                "that account for most of the difficulty in this task. Where the metric and the "
                "reading disagree, the reading above is the one that governs."
            ),
        },
        "limitations": [
            "Three fixed configurations on one dataset. Nothing here bounds how much a tuned "
            "model of any of these three families could reach.",
            "Each model is fitted once on 98 wells. No repeated split, no cross-validation "
            "inside the training wells, and therefore no confidence interval on any number here.",
            "The two evaluation partitions disagree with each other by more than most of the "
            "differences between the three models, so small gaps are not interpretable.",
            "Feature importance is reported per library and is not comparable across the three "
            "as a number.",
            "The comparison covers five log curves. It says nothing about any other feature set, "
            "and in particular nothing about a model that uses DEPTH_MD, which the Random Forest "
            "stage found to be strong on its own.",
        ],
        "reproducibility": {
            "regenerate": "python scripts/reports/build_model_comparison.py",
            "verify": "python scripts/reports/build_model_comparison.py --check",
            "deterministic": True,
            "contains_timings": False,
        },
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines: list[str] = []

    def a(text: str = "") -> None:
        lines.append(text)

    models = report["models"]
    keys = list(models)
    a("# FORCE 2020 lithology: three baselines compared")
    a("")
    a(f"**Stage:** {report['stage']}")
    a("")
    a(f"**Status:** {report['model_status']}")
    a("")
    a(report["purpose"])
    a("")
    a("## 1. What is held identical")
    a("")
    identical = report["held_identical"]
    a("| item | value |")
    a("|---|---|")
    a(f"| dataset | `{identical['dataset_id']}` |")
    a(f"| dataset sha256 | `{identical['dataset_sha256'][:16]}...` |")
    a(f"| features | {', '.join(f'`{name}`' for name in identical['primary_features'])} |")
    a(f"| target | `{identical['target']}`, {identical['target_classes']} classes, unchanged |")
    a(f"| split | {identical['wells_by_split']} wells, {identical['rows_by_split']} rows |")
    a(f"| split manifest | `{identical['split_manifest']}` "
      f"(sha256 `{identical['split_manifest_sha256'][:16]}...`) |")
    a(f"| imputation | {identical['imputation']}, {identical['imputation_fitted_on']} |")
    a(f"| metrics | {', '.join(f'`{name}`' for name in identical['metrics'])} |")
    a(f"| metric code | {identical['metric_implementation']} |")
    a(f"| model selection | {'none' if not identical['model_selection_performed'] else 'PERFORMED'} |")
    a("")
    a("What differs, and why:")
    a("")
    for line in report["what_differs_and_why"]:
        a(f"- {line}")
    a("")
    a("## 2. Results")
    a("")
    for split in shared.EVAL_SPLITS:
        a(f"### `{split}`")
        a("")
        rows = {key: models[key]["results"][split] for key in keys}
        a("| model | rows | wells | " + " | ".join(title for _, title in HEADLINE_METRICS) + " | penalty |")
        a("|---|---:|---:|" + "---:|" * (len(HEADLINE_METRICS) + 1))
        for key in keys:
            row = rows[key]
            cells = " | ".join(num(row["metrics"][metric]) for metric, _ in HEADLINE_METRICS)
            a(f"| {models[key]['label']} | {row['rows']:,} | {row['wells']} | {cells} | "
              f"{num(row['penalty_score'])} |")
        a("")
        zero = sorted({cid for key in keys for cid in rows[key]["classes_zero_support"]})
        if zero:
            names = ", ".join(shared.encoded_to_class_name()[cid] for cid in zero)
            a(f"Classes with no rows in this partition: {names}.")
            a("")
    a("## 3. Why no model is called best")
    a("")
    a(report["no_winner"]["reason"])
    a("")
    a("| metric | spread between models (max) | spread within a model, between partitions (max) | larger effect |")
    a("|---|---:|---:|---|")
    for metric, title in HEADLINE_METRICS:
        entry = report["spread"][metric]
        between = entry["between_models_max"]
        within = entry["within_model_between_partitions_max"]
        larger = "partition" if entry["partition_effect_dominates"] else "model"
        a(f"| {title} | {num(between)} | {num(within)} | {larger} |")
    a("")
    a(report["no_winner"]["exceptions_stated_plainly"])
    a("")
    a("## 4. Diagnostics")
    a("")
    a(
        "The Random Forest ran the same four fits and its results are in its own report; these "
        "are the two boosters'."
    )
    a("")
    for model in ("xgb", "lgbm"):
        a(f"### {models[model]['label']}")
        a("")
        a("| experiment | features | " + " | ".join(f"macro F1 `{s}`" for s in shared.EVAL_SPLITS) + " |")
        a("|---|---:|" + "---:|" * len(shared.EVAL_SPLITS))
        for key, title in DIAGNOSTICS:
            row = report["diagnostics"][model].get(key)
            if row is None:
                continue
            cells = " | ".join(num(row["results"][split]["macro_f1"]) for split in shared.EVAL_SPLITS)
            a(f"| {title} | {len(row['features'])} | {cells} |")
        a("")
    a("## 5. Feature importance, as a pattern only")
    a("")
    importance = report["feature_importance_pattern"]
    a("| feature | RF impurity share | XGBoost gain share | LightGBM gain share |")
    a("|---|---:|---:|---:|")
    for feature in importance["features"]:
        a(
            f"| `{feature}` | {importance['random_forest_impurity_share'][feature]:.4f} | "
            f"{importance['xgboost_gain_share'].get(feature, 0):.4f} | "
            f"{importance['lightgbm_gain_share'].get(feature, 0):.4f} |"
        )
    a("")
    a(importance["caution"])
    a("")
    a("## 6. Limitations")
    a("")
    for line in report["limitations"]:
        a(f"- {line}")
    a("")
    a("## 7. Reproducibility")
    a("")
    a(f"- Regenerate: `{report['reproducibility']['regenerate']}`")
    a(f"- Verify: `{report['reproducibility']['verify']}`")
    a(f"- Contains timings: {'yes' if report['reproducibility']['contains_timings'] else 'no'}")
    a("- Nothing in this report was used to choose anything. It is a description of three fits "
      "that were already committed.")
    a("")
    return "\n".join(lines) + "\n"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit non-zero if the committed comparison is not what this script builds",
    )
    args = parser.parse_args(argv)

    report = build_report()
    markdown = render_markdown(report)
    payload = json.dumps(report, indent=2, ensure_ascii=True) + "\n"

    if args.check:
        problems: list[str] = []
        for path, expected in (
            (shared.COMPARISON_REPORT_JSON, payload),
            (shared.COMPARISON_REPORT_MD, markdown),
        ):
            if not path.exists():
                problems.append(f"{path.name} is missing")
                continue
            if path.read_text(encoding="utf-8") != expected:
                problems.append(f"{path.name} differs from a fresh build")
        if problems:
            print("Comparison report is not reproducible:")
            for line in problems:
                print(f"  {line}")
            return 1
        print("reports/force2020_model_comparison.json: MATCH")
        print("reports/force2020_model_comparison.md: MATCH")
        return 0

    shared.COMPARISON_REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    shared.COMPARISON_REPORT_JSON.write_text(payload, encoding="utf-8")
    shared.COMPARISON_REPORT_MD.write_text(markdown, encoding="utf-8")
    print(f"Wrote {shared.COMPARISON_REPORT_JSON.relative_to(REPO_ROOT).as_posix()}")
    print(f"Wrote {shared.COMPARISON_REPORT_MD.relative_to(REPO_ROOT).as_posix()}")
    print()
    for split in shared.EVAL_SPLITS:
        print(f"  {split}:")
        for entry in report["models"].values():
            row = entry["results"][split]
            print(
                f"    {entry['label']:14s} macro F1 {num(row['metrics']['macro_f1'])}, "
                f"supported-only {num(row['metrics']['macro_f1_supported_only'])}, "
                f"weighted F1 {num(row['metrics']['weighted_f1'])}, "
                f"balanced acc {num(row['metrics']['balanced_accuracy'])}, "
                f"penalty {num(row['penalty_score'])}"
            )
    print()
    print("No model is named best; see section 3 of the report for why.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
