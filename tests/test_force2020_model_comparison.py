"""Contract tests for the three-model comparison report.

The comparison is the deliverable of this stage, so it gets the same treatment
the individual baselines got: the claims it makes about itself are checked by
something that is not the comparison.

The load-bearing idea here is that the comparison must not become a ranking. Two
of these tests exist only to stop that, because a comparison report is exactly
the kind of artefact that grows a "winner" section by accident.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "data" / "ml" / "common"))

force2020_lithology = pytest.importorskip("force2020_lithology")

import force2020_lithology as shared  # noqa: E402

sys.path.insert(0, str(REPO / "scripts" / "reports"))

REPORT_JSON = shared.COMPARISON_REPORT_JSON
REPORT_MD = shared.COMPARISON_REPORT_MD
BUILDER = REPO / "scripts" / "reports" / "build_model_comparison.py"
MODELS = ("rf", "xgb", "lgbm")


@pytest.fixture(scope="module")
def report() -> dict:
    if not REPORT_JSON.exists():
        pytest.fail(
            f"{REPORT_JSON} is missing. Run `python scripts/reports/build_model_comparison.py`."
        )
    return json.loads(REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def forest() -> dict:
    return json.loads(shared.REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def boosters() -> dict:
    return shared.read_gbdt_report()


# ---------------------------------------------------------------------------
# 1. The comparison is derived, not retyped
# ---------------------------------------------------------------------------
def test_every_number_comes_from_a_committed_baseline_report(report: dict, forest: dict, boosters: dict):
    """Each headline figure must equal the one in the report it is copied from."""
    for split in shared.EVAL_SPLITS:
        row = report["models"]["rf"]["results"][split]
        source = forest["primary_results"][split]
        assert row["metrics"]["macro_f1"] == source["aggregate"]["macro_f1"]["value"]
        assert row["metrics"]["weighted_f1"] == source["aggregate"]["weighted_f1"]["value"]
        assert row["metrics"]["balanced_accuracy"] == source["aggregate"]["balanced_accuracy"]["value"]
        assert row["penalty_score"] == source["penalty"]["competition_score"]
        assert row["rows"] == source["rows"]
        assert row["wells"] == source["wells"]

        for model in ("xgb", "lgbm"):
            row = report["models"][model]["results"][split]
            source = boosters["models"][model]["experiments"]["primary"]["results"][split]
            assert row["metrics"]["macro_f1"] == source["aggregate"]["macro_f1"]["value"]
            assert (
                row["metrics"]["macro_f1_supported_only"]
                == source["aggregate"]["macro_f1_supported_only"]["value"]
            )
            assert row["metrics"]["weighted_f1"] == source["aggregate"]["weighted_f1"]["value"]
            assert row["metrics"]["balanced_accuracy"] == source["aggregate"]["balanced_accuracy"]["value"]
            assert row["penalty_score"] == source["penalty"]["competition_score"]
            assert row["rows"] == source["rows"]
            assert row["wells"] == source["wells"]


def test_the_builder_fits_nothing():
    """The comparison must not be able to change a model's number by re-fitting it."""
    text = BUILDER.read_text(encoding="utf-8")
    for banned in (".fit(", "GridSearchCV", "import xgboost", "import lightgbm", "import sklearn", "joblib"):
        assert banned not in text, f"{banned} appears in the comparison builder"


def test_the_builder_reads_both_baseline_reports(report: dict):
    sources = {entry["model"]: entry["report"] for entry in report["derivation"]["sources"]}
    assert set(sources) == set(MODELS)
    assert sources["rf"] == "reports/force2020_rf_baseline.json"
    assert sources["xgb"] == "reports/force2020_gbdt_baseline.json"
    assert sources["lgbm"] == "reports/force2020_gbdt_baseline.json"


# ---------------------------------------------------------------------------
# 2. Fairness: the three really do share everything
# ---------------------------------------------------------------------------
def test_all_three_models_are_present(report: dict):
    assert set(report["models"]) == set(MODELS)
    assert [report["models"][key]["label"] for key in MODELS] == [
        "Random Forest",
        "XGBoost",
        "LightGBM",
    ]


def test_the_comparison_records_what_is_held_identical(report: dict):
    identical = report["held_identical"]
    assert identical["primary_features"] == list(shared.PRIMARY_FEATURES)
    assert identical["target"] == shared.TARGET
    assert identical["target_classes"] == 12
    assert identical["imputation"] == "median"
    assert identical["model_selection_performed"] is False
    assert identical["dataset_sha256"] == shared.read_manifest()["sha256"]


def test_the_split_counts_come_from_the_manifests_not_a_report(report: dict):
    summary = shared.read_manifest()["split_summary"]
    for split in shared.ALL_SPLITS:
        assert report["held_identical"]["wells_by_split"][split] == int(summary[split]["wells"])
        assert report["held_identical"]["rows_by_split"][split] == int(summary[split]["rows"])
    reference = shared.split_manifest_reference()
    assert report["held_identical"]["split_manifest_sha256"] == reference["sha256"]


def test_the_boosters_really_do_use_the_forest_features(report: dict, forest: dict):
    assert forest["features"]["primary"] == report["held_identical"]["primary_features"]


def test_the_differences_are_declared_rather_than_glossed(report: dict):
    lines = report["what_differs_and_why"]
    assert len(lines) >= 3
    joined = " ".join(lines).lower()
    assert "class_weight" in joined, "the class-balancing mechanism is not discussed"
    assert "estimator" in joined


def test_the_metric_implementation_is_shared_not_duplicated(report: dict):
    """One module computes the metrics, or the comparison is not a fair one."""
    assert "force2020_lithology" in report["held_identical"]["metric_implementation"]


# ---------------------------------------------------------------------------
# 3. No winner. The load-bearing part.
# ---------------------------------------------------------------------------
def test_the_headline_metrics_are_not_separated_by_the_partition_choice(report: dict):
    """The no-winner claim rests on this, for the class-balanced metrics.

    Scoped to the metrics it actually covers. Weighted F1 is the exception and
    has its own test below, because pretending the claim is universal is exactly
    the kind of overstatement this report exists to avoid.
    """
    for metric in ("macro_f1", "macro_f1_supported_only", "balanced_accuracy"):
        entry = report["spread"][metric]
        assert entry["partition_effect_dominates"] is True, (
            f"{metric}: the models differ by {entry['between_models_max']} and the partitions by "
            f"{entry['within_model_between_partitions_max']}. If that ever inverts, the "
            "no-winner claim in this report is stale and the report must be rewritten rather "
            "than left to stand."
        )


def test_the_metric_where_the_model_effect_dominates_is_stated_plainly(report: dict):
    """Weighted F1 separates the models more than the partition does.

    The report has to say so out loud. A blanket "the partitions swamp
    everything" would be false here, and a reader checking the table would find
    it.
    """
    entry = report["spread"]["weighted_f1"]
    assert entry["partition_effect_dominates"] is False
    assert entry["between_models_max"] > entry["within_model_between_partitions_max"]
    assert "Weighted F1" in report["no_winner"]["metrics_where_model_effect_dominates"]
    exceptions = report["no_winner"]["exceptions_stated_plainly"]
    assert "weighted f1" in exceptions.lower()
    assert "larger than" in exceptions.lower()
    assert exceptions in REPORT_MD.read_text(encoding="utf-8")


def test_no_winner_is_declared_and_explained(report: dict):
    assert report["no_winner"]["declared"] is True
    reason = report["no_winner"]["reason"]
    assert "held out" in reason or "wells" in reason
    assert "average" in reason.lower()
    assert report["no_winner"]["metrics_where_partition_effect_dominates"]


def test_the_report_names_no_best_model(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8")
    for phrase in ("xgb wins", "lgbm wins", "random forest wins", "the best model is", "winner is"):
        assert phrase not in text.lower()
    assert "Why no model is called best" in text


def test_no_model_is_marked_best_anywhere_in_the_structure(report: dict):
    for key, entry in report["models"].items():
        assert "best" not in entry, key
        assert "rank" not in entry, key
        assert "winner" not in entry, key


def test_the_report_does_not_average_across_the_partitions(report: dict):
    """An average of two disagreeing partitions hides the disagreement."""
    text = json.dumps(report).lower()
    for banned in ("mean_of_splits", "average_across_splits", "overall_score"):
        assert banned not in text
    for split in shared.EVAL_SPLITS:
        assert split in REPORT_MD.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# 4. Diagnostics and importance
# ---------------------------------------------------------------------------
def test_the_four_diagnostics_appear_for_both_boosters(report: dict):
    for model in ("xgb", "lgbm"):
        assert set(report["diagnostics"][model]) == {
            "primary",
            "depth_only",
            "logs_plus_masks",
            "primary_unweighted",
        }
        for row in report["diagnostics"][model].values():
            assert set(row["results"]) == set(shared.EVAL_SPLITS)
            assert row["features"]


def test_the_diagnostics_are_labelled_as_diagnostics_not_candidates(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8").lower()
    assert "diagnostic" in text
    assert "depth-only diagnostic" in text


def test_importance_is_compared_as_a_pattern_only(report: dict):
    importance = report["feature_importance_pattern"]
    assert importance["features"] == list(shared.PRIMARY_FEATURES)
    caution = importance["caution"].lower()
    assert "not" in caution
    assert "impurity" in caution
    assert "loss reduction" in caution
    # Every feature is present in all three, or the pattern is not comparable.
    for source in ("random_forest_impurity_share", "xgboost_gain_share", "lightgbm_gain_share"):
        assert set(importance[source]) == set(shared.PRIMARY_FEATURES), source


# ---------------------------------------------------------------------------
# 5. Reproducibility
# ---------------------------------------------------------------------------
def test_the_committed_json_is_a_fresh_build(report: dict):
    payload = BUILDER.read_text(encoding="utf-8")
    assert "def build_report" in payload
    text = REPORT_JSON.read_text(encoding="utf-8")
    assert text.endswith("\n")
    assert text == json.dumps(report, indent=2, ensure_ascii=True) + "\n"


def test_the_comparison_has_no_timings(report: dict):
    text = json.dumps(report).lower()
    for volatile in ("seconds", "elapsed", "timestamp", "runtime"):
        assert volatile not in text, volatile
    assert report["reproducibility"]["contains_timings"] is False


def test_the_builder_reports_a_mismatch_in_check_mode():
    """--check has to be able to fail, or it proves nothing when it passes."""
    text = BUILDER.read_text(encoding="utf-8")
    assert "differs from a fresh build" in text
    assert "return 1" in text


def test_the_comparison_is_deterministic_across_builds():
    """Two consecutive builds must produce identical bytes."""
    import subprocess
    import sys as interpreter

    before = REPORT_JSON.read_bytes(), REPORT_MD.read_bytes()
    first = subprocess.run(
        [interpreter.executable, str(BUILDER)], capture_output=True, text=True, cwd=REPO
    )
    assert first.returncode == 0, first.stderr
    after = REPORT_JSON.read_bytes(), REPORT_MD.read_bytes()
    assert before == after, "a rebuild changed the committed comparison report"


def test_the_comparison_check_mode_passes():
    import subprocess
    import sys as interpreter

    result = subprocess.run(
        [interpreter.executable, str(BUILDER), "--check"], capture_output=True, text=True, cwd=REPO
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "MATCH" in result.stdout


# ---------------------------------------------------------------------------
# 6. Provenance and scope
# ---------------------------------------------------------------------------
def test_limitations_are_reported(report: dict):
    joined = " ".join(report["limitations"]).lower()
    for subject in ("confidence interval", "tuned", "disagree", "importance"):
        assert subject in joined, subject
    assert "## 6. Limitations" in REPORT_MD.read_text(encoding="utf-8")


def test_the_report_says_none_of_them_is_production_ready(report: dict):
    status = report["model_status"].lower()
    assert "none of them is the best model" in status
    assert "none is production-ready" in status
    assert "none is deployed" in status


def test_the_comparison_covers_only_the_five_log_curves(report: dict):
    """It must not be read as a statement about depth-aware models."""
    assert report["held_identical"]["primary_features"] == list(shared.PRIMARY_FEATURES)
    limitations = " ".join(report["limitations"])
    assert shared.DEPTH in limitations


def test_no_generated_artifact_appears_in_the_contract_tree():
    for path in (REPO / "data" / "ml", REPO / "scripts" / "reports"):
        for candidate in path.rglob("*"):
            if candidate.is_file() and candidate.suffix.lower() in {
                ".csv", ".parquet", ".pkl", ".joblib", ".pt", ".h5", ".onnx"
            }:
                pytest.fail(f"contract tree must stay empty of generated data: {candidate}")


def test_the_markdown_has_every_section(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8")
    headings = [line for line in text.splitlines() if line.startswith("## ")]
    numbers = [int(line.split(".")[0][3:]) for line in headings]
    assert numbers == list(range(1, len(numbers) + 1)), headings
    for expected in (
        "What is held identical",
        "Results",
        "Why no model is called best",
        "Diagnostics",
        "Feature importance",
        "Limitations",
        "Reproducibility",
    ):
        assert expected in text, expected
    for label in ("Random Forest", "XGBoost", "LightGBM"):
        assert label in text, label


def test_no_pen_ultimate_claim_survives_in_the_prose(report: dict):
    """The two reports this reads are honest; this one has to stay honest too."""
    text = REPORT_MD.read_text(encoding="utf-8")
    negations = ("not ", "no ", "none", "neither", "never")
    for phrase in ("best model", "production-ready", "deployed", "outperform"):
        for match in re.finditer(re.escape(phrase), text, re.IGNORECASE):
            window = text[max(0, match.start() - 60) : match.start()].lower()
            assert any(negation in window for negation in negations), (
                f"{phrase!r} appears without a negation: ...{window[-60:]}{phrase}..."
            )
