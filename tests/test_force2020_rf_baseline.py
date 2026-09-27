"""Contract tests for the FORCE 2020 Random Forest baseline.

These do not test whether Random Forest is a good model. They test the claims
the baseline report makes about itself, because a report is only worth reading
if the things it asserts are checked by something that is not the report.

The nine gates the stage was asked for are, in order: the exact five primary
feature columns, target-encoding consistency, no DEPTH_MD, no coordinate
columns, no cross-well leakage, a deterministic label mapping, a deterministic
model configuration, artifact-manifest completeness, and metric/report
reproducibility.

Most tests here read the committed report and the committed artifacts, so they
are fast and they run without scikit-learn being fitted. The two that need the
stored 1.4 GB forest are marked slow and deselect with `-m 'not slow'`.
"""
from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "data" / "ml" / "common"))

force2020_lithology = pytest.importorskip("force2020_lithology")

import force2020_lithology as shared  # noqa: E402

REPORT_JSON = shared.REPORT_JSON
REPORT_MD = shared.REPORT_MD
MANIFEST = shared.ARTIFACT_ROOT / "evaluation" / f"{shared.ARTIFACT_STEM}.experiment_manifest.json"
PIPELINE = shared.TRAINING_DIR / f"{shared.ARTIFACT_STEM}.pipeline.joblib"
TRAIN_SCRIPT = REPO / "data" / "ml" / "lithology" / "training" / "train_rf_baseline.py"
EVALUATE_SCRIPT = REPO / "data" / "ml" / "lithology" / "evaluation" / "evaluate_rf_baseline.py"
MATRIX_SCRIPT = REPO / "scripts" / "ingest" / "extract_force2020_penalty_matrix.py"
MATRIX_JSON = REPO / "ml" / "force2020_penalty_matrix.json"

REQUIRED_ARTIFACT_ROLES = {
    "model_and_preprocessing_pipeline",
    "model_forest_only",
    "feature_list",
    "label_mapping",
    "training_configuration",
    "split_manifest_reference",
    "metrics",
    "per_class_metrics",
    "confusion_matrix",
    "experiment_manifest",
}


@pytest.fixture(scope="module")
def report() -> dict:
    if not REPORT_JSON.exists():
        pytest.fail(
            f"{REPORT_JSON} is missing. Run `make train-force2020-rf` to produce the baseline."
        )
    return json.loads(REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def artifacts() -> dict:
    if not MANIFEST.exists():
        pytest.skip(
            "no trained artifact manifest; run `make train-force2020-rf` to produce the "
            "stored model. The committed report is checked by the other tests."
        )
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# 1. The primary feature matrix is exactly the five log curves
# ---------------------------------------------------------------------------
def test_primary_features_are_exactly_the_five_log_curves(report: dict):
    assert report["features"]["primary"] == ["CALI", "RDEP", "RMED", "DTC", "GR"]
    assert report["features"]["primary"] == list(shared.PRIMARY_FEATURES)
    assert report["features"]["primary_count"] == 5
    assert len(set(report["features"]["primary"])) == 5, "a feature is repeated"
    # The guard the training code runs must accept this list, and nothing wider.
    shared.assert_logs_only(report["features"]["primary"])


def test_feature_selection_was_not_performed(report: dict):
    assert report["features"]["feature_selection_performed"] is False
    assert report["features"]["primary"] == list(shared.LOG_COLUMNS)


def test_the_diagnostics_add_only_what_they_are_allowed_to_add(report: dict):
    depth = report["depth_only_diagnostic"]
    masked = report["missingness_diagnostic"]
    unweighted = report["weighting_diagnostic"]
    assert depth["features"] == ["DEPTH_MD"]
    assert depth["kind"] == "diagnostic"
    assert masked["features"] == list(shared.LOG_COLUMNS) + list(shared.MASK_COLUMNS)
    assert masked["kind"] == "diagnostic_ablation"
    assert unweighted["features"] == list(shared.LOG_COLUMNS)
    assert unweighted["kind"] == "diagnostic_weighting"
    # The primary was not quietly promoted to one of the variants.
    assert report["features"]["primary"] == list(shared.LOG_COLUMNS)


# ---------------------------------------------------------------------------
# 2. Target encoding consistency, and an unchanged taxonomy
# ---------------------------------------------------------------------------
def test_target_encoding_matches_the_dataset_stage(report: dict):
    """The label is the one the dataset stage wrote, byte for byte in meaning."""
    assert report["target"]["column"] == shared.TARGET
    assert report["target"]["class_count"] == 12
    manifest_encoding = shared.read_manifest()["label_encoding"]
    report_codes = {entry["encoded_id"]: entry["code"] for entry in report["target"]["classes"]}
    manifest_codes = {
        int(entry["encoded_id"]): int(entry["code"]) for entry in manifest_encoding["classes"]
    }
    assert report_codes == manifest_codes
    assert report_codes == shared.encoded_to_code()
    # Ascending rank of the numeric NPD code: a pure function of the class list.
    assert sorted(report_codes) == list(range(12))
    assert [report_codes[index] for index in range(12)] == sorted(report_codes.values())


def test_label_mapping_is_deterministic_and_order_independent():
    """Same mapping every time, whatever order the source lists the codes in."""
    first = shared.penalty_index_map()
    second = shared.penalty_index_map()
    assert first == second
    assert sorted(first) == list(range(12))
    entries = {int(entry["encoded_id"]): entry for entry in shared.read_manifest()["label_encoding"]["classes"]}
    for encoded_id, code in shared.encoded_to_code().items():
        assert entries[encoded_id]["code"] == str(code)
        assert entries[encoded_id]["class_name"] == shared.encoded_to_class_name()[encoded_id]


def test_the_taxonomy_was_not_renarrowed_or_mapped(report: dict):
    assert report["target"]["classes_merged"] == []
    assert report["target"]["classes_removed"] == []
    assert report["experiment"]["class_count"] == 12
    assert report["experiment"]["mapped_to_canonical"] is False
    names = {entry["class_name"] for entry in report["target"]["classes"]}
    assert "Basement" in names and "Halite" in names, "a class was dropped from the taxonomy"


# ---------------------------------------------------------------------------
# 3. No DEPTH_MD in the primary model
# ---------------------------------------------------------------------------
def test_depth_is_not_in_the_primary_feature_matrix(report: dict):
    assert "DEPTH_MD" not in report["features"]["primary"]
    assert report["features"]["depth_column_in_primary"] is False
    # Depth is carried in the table on purpose, which is what makes this
    # testable at all: a column that is not there cannot leak by accident.
    assert report["features"]["depth_column_present_in_table"] is True
    assert report["missing_value_handling"]["masks_used_by_primary_model"] is False


def test_the_guard_would_reject_a_leaky_feature_list():
    """The prohibition is enforced in code, not just stated in prose."""
    for bad in (
        ["CALI", "DEPTH_MD"],
        ["DEPTH_MD"],
        list(shared.LOG_COLUMNS) + ["X_LOC"],
    ):
        with pytest.raises(ValueError):
            shared.assert_logs_only(bad)
    # And the one diagnostic that is allowed depth says so explicitly.
    shared.assert_logs_only(["DEPTH_MD"], allow=["DEPTH_MD"])
    shared.assert_logs_only(
        list(shared.LOG_COLUMNS) + list(shared.MASK_COLUMNS),
        allow=list(shared.MASK_COLUMNS),
    )


# ---------------------------------------------------------------------------
# 4. No coordinate or contextual columns
# ---------------------------------------------------------------------------
def test_no_coordinate_or_context_columns_in_the_primary_matrix(report: dict):
    features = report["features"]["primary"]
    for column in ("X_LOC", "Y_LOC", "Z_LOC", "GROUP", "FORMATION"):
        assert column not in features
    for column in features:
        assert column not in shared.FORBIDDEN_FEATURE_COLUMNS


def test_no_mud_temperature_or_other_contextual_feature_appears_anywhere(report: dict):
    """The primary and both diagnostics draw on the log table and nothing else."""
    allowed = (
        set(shared.LOG_COLUMNS)
        | set(shared.MASK_COLUMNS)
        | {shared.DEPTH}
    )
    for block in (
        report["depth_only_diagnostic"],
        report["missingness_diagnostic"],
        report["weighting_diagnostic"],
    ):
        assert set(block["features"]) <= allowed, block["features"]
    for column in report["features"]["primary"]:
        assert "TEMP" not in column.upper()


# ---------------------------------------------------------------------------
# 5. No cross-well leakage
# ---------------------------------------------------------------------------
def test_no_well_is_in_both_the_fitting_and_an_evaluation_partition(report: dict):
    frame = shared.read_split_manifest()
    train_wells = set(frame.loc[frame.SPLIT == "train", "WELL"])
    for split in shared.EVAL_SPLITS:
        evaluation = set(frame.loc[frame.SPLIT == split, "WELL"])
        shared.assert_no_well_overlap(train_wells, evaluation)
    for guard in report["split"]["leakage_guards"]:
        assert guard["shared_wells"] == 0
        assert guard["fitting_wells"] > 0 and guard["evaluation_wells"] > 0


def test_the_leakage_guard_actually_raises_on_an_overlap():
    with pytest.raises(ValueError, match="appear in both"):
        shared.assert_no_well_overlap(["A", "B"], ["B", "C"])


def test_no_row_level_random_split_was_used(report: dict):
    assert report["split"]["reshuffled"] is False
    assert report["split"]["row_level_random_split"] is False
    assert report["split"]["fitted_on"] == "train"
    assert list(report["split"]["evaluated_on"]) == list(shared.EVAL_SPLITS)


def test_well_counts_match_the_split_manifest(report: dict):
    frame = shared.read_split_manifest()
    expected = {
        split: int(frame.loc[frame.SPLIT == split, "WELL"].nunique())
        for split in shared.ALL_SPLITS
    }
    assert expected == {"train": 98, "hidden_test": 10, "leaderboard_test": 10}
    reference = report["split"]["reference"]
    assert reference["wells_by_split"] == expected
    assert reference["sha256"] == shared.split_manifest_reference()["sha256"]


# ---------------------------------------------------------------------------
# 6. Deterministic model configuration
# ---------------------------------------------------------------------------
def test_model_configuration_is_deterministic_and_fully_documented(report: dict):
    parameters = report["model_configuration"]["primary"]["parameters"]
    config = shared.RFConfig()
    assert parameters == config.to_dict()["parameters"]
    for name in (
        "n_estimators",
        "max_depth",
        "min_samples_split",
        "min_samples_leaf",
        "max_features",
        "class_weight",
        "random_state",
        "n_jobs",
    ):
        assert name in parameters, f"{name} is not documented"
    assert parameters["random_state"] == 42
    assert report["model_configuration"]["primary"]["tuned"] is False
    assert report["model_configuration"]["primary"]["search_performed"] is False
    assert report["model_status"]["is_tuned"] is False


def test_two_config_objects_are_equal():
    assert shared.RFConfig() == shared.RFConfig()
    assert shared.build_pipeline(shared.RFConfig(), shared.PRIMARY_FEATURES) is not None


def test_the_pipeline_puts_imputation_before_the_model():
    pipeline = shared.build_pipeline(shared.RFConfig(), shared.PRIMARY_FEATURES)
    assert list(pipeline.named_steps) == ["imputer", "classifier"]
    assert pipeline.named_steps["imputer"].strategy == "median"


# ---------------------------------------------------------------------------
# 7. Missing-value handling
# ---------------------------------------------------------------------------
def test_imputation_is_inside_the_pipeline_and_fitted_on_training_rows_only(report: dict):
    missing = report["missing_value_handling"]
    assert missing["strategy"] == "median"
    assert "train" in missing["statistics_fitted_on"]
    assert missing["interpolation"] == "none"
    assert missing["neighbouring_depth_rows_used"] is False
    assert missing["per_well_statistics"] is False
    assert missing["masks_preserved"] == list(shared.MASK_COLUMNS)
    assert sorted(missing["medians_fitted"]) == sorted(shared.LOG_COLUMNS)


def test_the_stored_dataset_keeps_its_missing_values(report: dict):
    """Imputation happened in memory. The table on disk is untouched."""
    assert report["dataset"]["written_to_by_this_stage"] == []
    assert report["missing_value_handling"]["stored_dataset"].startswith("Unchanged")
    assert "masks_used_by_primary_model" in report["missing_value_handling"]


# ---------------------------------------------------------------------------
# 8. Class imbalance: preserved, investigated, recorded
# ---------------------------------------------------------------------------
def test_all_twelve_classes_were_trained_on(report: dict):
    support = report["training_support"]["by_class"]
    assert len(support) == 12
    assert all(entry["rows"] > 0 for entry in support), "a class had no training rows"


def test_class_weighting_was_documented_not_silent(report: dict):
    weighting = report["class_weighting"]
    assert weighting["investigated"] is True
    assert weighting["recorded_not_silent"] is True
    assert weighting["decision"] == "balanced_subsample"
    assert weighting["imbalance_ratio"] > 100
    assert len(weighting["weights_used"]) == 12
    assert report["model_configuration"]["primary"]["parameters"]["class_weight"] == "balanced_subsample"


def test_the_unweighted_comparison_actually_concluded_something(report: dict):
    comparison = report["class_weighting"]["unweighted_comparison"]
    assert comparison["kind"] == "diagnostic, not a candidate configuration"
    assert comparison["purpose"]
    assert comparison["conclusion"], "the weighting decision was asserted, not measured"
    for split in shared.EVAL_SPLITS:
        assert split in comparison["results"]


# ---------------------------------------------------------------------------
# 9. Evaluation reporting quality
# ---------------------------------------------------------------------------
def test_every_split_reports_the_required_metrics(report: dict):
    for split in shared.EVAL_SPLITS:
        block = report["primary_results"][split]
        assert block["rows"] > 0
        assert block["wells"] > 0
        aggregate = block["aggregate"]
        for name in ("macro_f1", "weighted_f1", "balanced_accuracy"):
            assert aggregate[name]["value"] is not None
            assert aggregate[name]["computed_from"], f"{name} does not say what it averaged"
        assert aggregate["rows_evaluated"] == block["rows"]
        assert aggregate["wells_evaluated"] == block["wells"]
        assert len(block["per_class"]) == 12


def test_per_class_rows_carry_support_and_only_null_what_is_undefined(report: dict):
    for split in shared.EVAL_SPLITS:
        for row in report["primary_results"][split]["per_class"]:
            assert row["support"] >= 0
            assert isinstance(row["zero_support"], bool)
            if row["precision"] is None:
                assert row["never_predicted"], row
            if row["recall"] is None:
                assert row["zero_support"], row
            if row["f1"] is None:
                assert row["precision"] is None or row["recall"] is None, row
            else:
                assert row["support"] > 0


def test_zero_support_classes_are_named_rather_than_invented(report: dict):
    found = False
    for split in shared.EVAL_SPLITS:
        block = report["primary_results"][split]
        absent = [row for row in block["per_class"] if row["zero_support"]]
        assert block["aggregate"]["classes_zero_support"] == [row["encoded_id"] for row in absent]
        for row in absent:
            assert row["recall"] is None and row["f1"] is None
            found = True
    if found:
        assert report["missing_value_handling"] is not None
        assert "null" in json.dumps(report).lower()


def test_accuracy_is_not_reported_as_the_headline(report: dict):
    keys = {key for split in shared.EVAL_SPLITS for key in report["primary_results"][split]["aggregate"]}
    assert "accuracy" not in keys
    assert "macro_f1" in keys


def test_confusion_matrix_matches_the_partitions_it_describes(report: dict):
    for split in shared.EVAL_SPLITS:
        block = report["confusion_matrix"][split]
        assert block["row_meaning"] == "true class"
        assert block["column_meaning"] == "predicted class"
        assert len(block["labels"]) == 12
        total = sum(sum(row) for row in block["counts"])
        assert total == report["primary_results"][split]["rows"]


# ---------------------------------------------------------------------------
# 10. The penalty matrix
# ---------------------------------------------------------------------------
def test_the_penalty_matrix_is_the_published_one():
    record = json.loads(MATRIX_JSON.read_text(encoding="utf-8"))
    assert record["authority"]["is_authoritative"] is True
    assert record["authority"]["is_homemade"] is False
    assert record["status"] == "authoritative"
    assert record["shape"] == [12, 12]
    matrix = record["matrix"]
    assert all(row[i] == 0.0 for i, row in enumerate(matrix))
    assert all(matrix[i][j] == matrix[j][i] for i in range(12) for j in range(12))
    off_diagonal = {matrix[i][j] for i in range(12) for j in range(12) if i != j}
    assert len(off_diagonal) > 3, "a flat matrix is not the published one"
    assert record["source"]["resolved_commit_sha"]
    assert record["source"]["notebook_git_blob_oid"]


def test_the_penalty_matrix_is_indexed_in_the_competition_order(report: dict):
    index_map = shared.penalty_index_map()
    assert sorted(index_map) == list(range(12))
    # The two orders are genuinely different, which is the whole risk here.
    encoded_to_code = shared.encoded_to_code()
    code_to_index = {code: index_map[encoded] for encoded, code in encoded_to_code.items()}
    assert sorted(code_to_index.values()) == list(range(12))
    assert code_to_index[30000] == 0
    assert code_to_index[65030] == 1
    assert code_to_index[65000] == 2
    assert code_to_index[93000] == 11
    assert code_to_index != {code: encoded for encoded, code in encoded_to_code.items()}
    assert report["penalty_matrix"]["is_homemade"] is False


def test_penalty_scores_are_reported_for_both_partitions(report: dict):
    for split in shared.EVAL_SPLITS:
        penalty = report["penalty_matrix"]["results"][split]
        assert penalty["rows_scored"] == report["primary_results"][split]["rows"]
        assert penalty["competition_score"] == -penalty["mean_penalty"]
        assert penalty["competition_score"] <= 0.0


def test_no_homemade_penalty_matrix_was_substituted(report: dict):
    assert report["penalty_matrix"]["used"] is True
    assert report["penalty_matrix"]["is_homemade"] is False
    assert report["penalty_matrix"]["is_authoritative"] is True
    assert report["penalty_matrix"]["matrix_id"] == "force2020_lithology_penalty_matrix"
    assert report["penalty_matrix"]["npy_present_in_checkout"] is False
    assert report["penalty_matrix"]["notebook"]


# ---------------------------------------------------------------------------
# 11. Diagnostics were run and labelled
# ---------------------------------------------------------------------------
def test_the_depth_only_diagnostic_ran_separately(report: dict):
    depth = report["depth_only_diagnostic"]
    assert "not a lithology model" in depth["note"]
    for split in shared.EVAL_SPLITS:
        assert depth["results"][split]["rows"] > 0
        comparison = depth["against_primary"][split]
        assert comparison["diagnostic_macro_f1"] != comparison["primary_macro_f1"]
    # Depth alone must not be as good as the logs, or the logs-only claim is hollow.
    for split in shared.EVAL_SPLITS:
        assert (
            depth["against_primary"][split]["diagnostic_macro_f1"]
            < depth["against_primary"][split]["primary_macro_f1"]
        ), "a depth-only model matched the logs-only model; the report must say so loudly"


def test_the_missingness_ablation_ran_and_added_nothing_else(report: dict):
    masked = report["missingness_diagnostic"]
    assert masked["kind"] == "diagnostic_ablation"
    assert masked["features"] == list(shared.LOG_COLUMNS) + list(shared.MASK_COLUMNS)
    for split in shared.EVAL_SPLITS:
        assert masked["results"][split]["rows"] > 0
        assert "diagnostic_macro_f1" in masked["against_primary"][split]


# ---------------------------------------------------------------------------
# 12. Artifacts
# ---------------------------------------------------------------------------
def test_artifact_manifest_is_complete(artifacts: dict):
    roles = {entry["role"] for entry in artifacts["artifacts"]}
    assert REQUIRED_ARTIFACT_ROLES <= roles, f"missing: {sorted(REQUIRED_ARTIFACT_ROLES - roles)}"
    for entry in artifacts["artifacts"]:
        assert entry["path"], entry
        if entry["role"] == "experiment_manifest":
            # Listed by role and path, no digest: a file cannot contain its own
            # hash. The manifest's own bytes are covered by `make verify`.
            assert entry["sha256"] is None, entry
            continue
        if entry["role"] in ("report_json", "report_markdown"):
            continue
        assert len(entry.get("sha256") or "") == 64, entry


def test_artifact_manifest_identifies_source_split_and_experiment(artifacts: dict):
    assert artifacts["experiment_id"] == shared.EXPERIMENT_ID
    assert artifacts["source"]["resolved_commit_sha"]
    assert artifacts["dataset"]["sha256"] == shared.read_manifest()["sha256"]
    assert artifacts["split_manifest_reference"]["sha256"]
    assert artifacts["split_manifest_reference"]["wells_by_split"] == {
        "train": 98,
        "hidden_test": 10,
        "leaderboard_test": 10,
    }
    assert artifacts["features"]["depth_in_primary"] is False
    assert artifacts["features"]["feature_selection_performed"] is False
    assert artifacts["target"]["class_count"] == 12
    assert artifacts["missing_value_handling"]["fitted_on"] == "train partition only"
    assert artifacts["missing_value_handling"]["strategy"] == "median"


def test_every_artifact_lives_under_the_interim_root_or_reports(artifacts: dict):
    """Never in the frozen canonical tree, never in the hand-off contract tree."""
    for entry in artifacts["artifacts"]:
        path = entry["path"]
        assert not path.startswith("data/processed/"), path
        assert not path.startswith("data/ml/"), path
        assert path.startswith("data/interim/") or path.startswith("reports/"), path


def test_the_stored_model_still_has_five_features_and_no_depth(artifacts: dict):
    entry = next(
        (item for item in artifacts["artifacts"] if item["role"] == "feature_list"), None
    )
    assert entry is not None, "no feature_list artifact in the manifest"
    listing = json.loads((REPO / entry["path"]).read_text(encoding="utf-8"))
    assert listing["primary_feature_columns"] == list(shared.LOG_COLUMNS)
    assert listing["depth_in_primary_features"] is False
    assert listing["feature_selection_performed"] is False
    assert listing["target_column"] == shared.TARGET


def test_no_generated_artifact_appears_in_the_contract_tree():
    """data/ml/ holds code and contracts, never data. Nothing here is data."""
    for path in (REPO / "data" / "ml").rglob("*"):
        if path.is_file() and path.suffix.lower() in {".csv", ".parquet", ".pkl", ".joblib", ".pt", ".h5", ".onnx"}:
            pytest.fail(f"data/ml/ must stay empty of generated data: {path}")


# ---------------------------------------------------------------------------
# 13. Reproducibility of the committed report
# ---------------------------------------------------------------------------
def test_committed_report_json_is_in_the_projects_own_format():
    raw = REPORT_JSON.read_text(encoding="utf-8")
    assert raw == json.dumps(json.loads(raw), indent=2, ensure_ascii=True) + "\n"


def test_committed_report_has_no_timings_or_host_specific_values(report: dict):
    """A timing in the report would make every verification fail."""
    text = json.dumps(report).lower()
    for volatile in ("seconds", "elapsed", "runtime", "timestamp"):
        assert volatile not in text, f"{volatile} is not reproducible"


def test_the_markdown_report_contains_every_required_section():
    assert REPORT_MD.exists(), "no markdown report"
    text = REPORT_MD.read_text(encoding="utf-8")
    headings = [
        "## 1. Dataset",
        "## 2. Features",
        "## 3. Target",
        "## 4. Split",
        "## 5. Missing-value handling",
        "## 6. Model configuration",
        "## 7. Training support by class",
        "## 8. Evaluation support by class",
        "## 9. Per-class metrics",
        "## 10. Macro F1",
        "## 11. Weighted F1",
        "## 12. Balanced accuracy",
        "## 13. Confusion matrix",
        "## 14. Depth-only diagnostic",
        "## 15. Missingness-mask diagnostic",
        "## 16. Limitations",
        "## 17. Reproducibility and provenance",
    ]
    for heading in headings:
        assert heading in text, f"missing report section: {heading}"


def test_the_report_does_not_claim_to_be_best_or_production_ready(report: dict):
    status = report["model_status"]
    assert status["is_best_model"] is False
    assert status["is_production_ready"] is False
    assert status["deployed"] is False
    assert status["role"] == "baseline"
    text = REPORT_MD.read_text(encoding="utf-8").lower()
    for line in text.splitlines():
        for word in ("optimal", "production-ready", "best model", "state of the art", "sota"):
            if word in line:
                assert re.search(r"\b(not|never|no|nothing)\b", line), (
                    f"unqualified claim {word!r} in: {line[:120]}"
                )


def test_limitations_are_reported(report: dict):
    limitations = report["limitations"]
    assert len(limitations) >= 5
    joined = " ".join(limitations).lower()
    assert "baseline" in joined
    assert "thin" in joined or "103" in joined
    assert "not the same" in joined or "ten wells" in joined


def test_environment_is_recorded(report: dict):
    environment = report["reproducibility"]["environment"]
    for key in ("python", "scikit_learn", "numpy", "pandas", "platform"):
        assert key in environment
    assert environment["scikit_learn"]


# ---------------------------------------------------------------------------
# 14. The stage stays inside its own boundaries
# ---------------------------------------------------------------------------
def _imported_modules(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    return imported


def test_the_ingest_stage_still_uses_no_ml_stack():
    """Reading a source constant must not make the base install need sklearn."""
    banned = {"numpy", "pandas", "torch", "sklearn", "lightgbm", "xgboost", "scipy"}
    assert not (_imported_modules(MATRIX_SCRIPT) & banned)


def test_the_modelling_stage_uses_the_declared_optional_extra():
    """The model is built in the shared module, so that is where sklearn is imported.

    The entrypoints import the shared module rather than scikit-learn directly;
    asserting the import against them would only force a copy of the pipeline
    definition into two more files.
    """
    shared_module = REPO / "data" / "ml" / "common" / "force2020_lithology.py"
    assert "sklearn" in _imported_modules(shared_module)
    for entrypoint in (TRAIN_SCRIPT, EVALUATE_SCRIPT):
        assert "force2020_lithology" in _imported_modules(entrypoint)
    text = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    extras = text.split("[project.optional-dependencies]")[1]
    assert re.search(r"^ml\s*=", extras, re.MULTILINE), "no `ml` extra is declared"
    base = text.split("[project.optional-dependencies]")[0]
    for package in ("numpy", "pandas", "scikit"):
        assert package not in base, f"{package} must not become a base dependency"


def test_no_other_model_family_is_referenced():
    """This stage is a Random Forest baseline and nothing else."""
    text = TRAIN_SCRIPT.read_text(encoding="utf-8") + EVALUATE_SCRIPT.read_text(encoding="utf-8")
    for banned in ("xgboost", "lightgbm", "torch", "keras", "tensorflow", "MLPClassifier"):
        assert banned not in text, f"{banned} appears in the modelling stage"


def test_no_hyperparameter_search_is_present():
    text = TRAIN_SCRIPT.read_text(encoding="utf-8")
    for banned in (
        "GridSearchCV",
        "RandomizedSearchCV",
        "HalvingRandomSearchCV",
        "OptunaSearchCV",
        "optuna",
        "hyperopt",
    ):
        assert banned not in text, f"{banned} appears in the baseline"
    assert "tuned" in text


def test_the_scripts_write_nothing_into_the_frozen_or_contract_trees():
    """Read the code, do not trust the prose."""
    literals = {
        node.value
        for node in ast.walk(ast.parse(TRAIN_SCRIPT.read_text(encoding="utf-8")))
        if isinstance(node, ast.Constant) and isinstance(node, str)
    }
    forbidden = [
        text
        for text in literals
        if re.match(r"^data/(processed|ml)/", text) or "data/processed/" in text
    ]
    assert not forbidden, f"the trainer names a forbidden write target: {forbidden}"


# ---------------------------------------------------------------------------
# 15. Metric definitions, checked against scikit-learn
# ---------------------------------------------------------------------------
def test_aggregate_metric_definitions_match_the_libraries():
    """The report's aggregates are the standard ones, computed on known input."""
    import numpy as np
    from sklearn.metrics import balanced_accuracy_score, f1_score

    y_true = np.array([0, 0, 1, 1, 2, 2, 2, 3, 1])
    y_pred = np.array([0, 1, 1, 1, 2, 2, 0, 0, 3])
    classes = list(range(4))
    per_class = shared.per_class_metrics(y_true, y_pred, classes, {index: str(index) for index in classes})
    aggregate = shared.aggregate_metrics(y_true, y_pred, classes, len(y_true), 2, per_class)
    assert aggregate["macro_f1"]["value"] == pytest.approx(
        f1_score(y_true, y_pred, labels=classes, average="macro", zero_division=0), abs=1e-6
    )
    assert aggregate["weighted_f1"]["value"] == pytest.approx(
        f1_score(y_true, y_pred, labels=classes, average="weighted", zero_division=0), abs=1e-6
    )
    assert aggregate["balanced_accuracy"]["value"] == pytest.approx(
        balanced_accuracy_score(y_true, y_pred), abs=1e-6
    )
    # Class 3 has support and is predicted once, wrongly: a real zero, not null.
    assert per_class[3]["precision"] == 0.0 and per_class[3]["recall"] == 0.0
    assert per_class[2]["support"] == 3


def test_a_class_with_no_true_rows_is_reported_as_null_not_zero():
    import numpy as np

    y_true = np.array([0, 0, 1, 1])
    y_pred = np.array([0, 0, 1, 2])
    classes = [0, 1, 2, 3]
    rows = shared.per_class_metrics(y_true, y_pred, classes, {index: str(index) for index in classes})
    absent = rows[2]
    assert absent["zero_support"] is True
    assert absent["recall"] is None and absent["f1"] is None
    assert absent["precision"] == 0.0  # predicted once, never correct: a real zero
    never = rows[3]
    assert never["never_predicted"] is True
    assert never["precision"] is None and never["f1"] is None
    assert never["recall"] is None


def test_confusion_matrix_rows_sum_to_the_evaluated_rows():
    import numpy as np

    y_true = np.array([0, 1, 1, 2, 2, 2, 0, 1])
    y_pred = np.array([0, 1, 2, 2, 2, 0, 0, 1])
    classes = list(range(4))
    counts, table = shared.confusion_frame(y_true, y_pred, classes, {i: str(i) for i in classes})
    assert counts.sum() == y_true.size
    for index, row in enumerate(table):
        assert all(cell["row_total"] == counts[index].sum() for cell in row)


# ---------------------------------------------------------------------------
# 16. Slow: the stored model must still reproduce the committed numbers
# ---------------------------------------------------------------------------
@pytest.mark.slow
def test_the_stored_model_reproduces_the_committed_metrics(report: dict, artifacts: dict):
    """Re-scores the saved artifact. No refit, so this is about the artifact."""
    if not PIPELINE.exists():
        pytest.skip("no fitted pipeline; run `make train-force2020-rf`")
    import joblib

    sys.path.insert(0, str(EVALUATE_SCRIPT.parent))
    import evaluate_rf_baseline

    rescore = evaluate_rf_baseline.score_stored_model(joblib.load(PIPELINE))
    for split in shared.EVAL_SPLITS:
        committed = report["primary_results"][split]
        fresh = rescore["results"][split]
        assert fresh["aggregate"] == committed["aggregate"], split
        assert fresh["per_class"] == committed["per_class"], split
        assert fresh["penalty"] == committed["penalty"], split
        assert fresh["confusion_matrix"]["counts"] == committed["confusion_matrix"]["counts"], split
    assert artifacts["dataset"]["sha256"] == shared.read_manifest()["sha256"]
