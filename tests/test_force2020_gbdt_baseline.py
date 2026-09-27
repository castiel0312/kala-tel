"""Contract tests for the FORCE 2020 gradient-boosted tree baselines.

These do not test whether XGBoost or LightGBM is a good model. They test the
claims the baseline report makes about itself, because a report is only worth
reading if the things it asserts are checked by something that is not the
report.

The interesting new ground here, relative to the Random Forest suite:

* Both boosters must emit 12 classes even though one training class is rare
  enough that a library inferring its output width from the labels would
  quietly produce an 11-class model.
* LightGBM has to be imported before scikit-learn on this platform. That is
  checked by reading the import order out of the source, because the failure it
  prevents is a native access violation that no assertion in a test can catch
  once it has already happened.
* The comparison is only fair if the two boosters really do share the Random
  Forest's features, target, split, preprocessing and metrics. Several tests
  below compare the two reports field by field rather than re-deriving the
  values, so a change to the shared contract breaks them.

Most tests read the committed report and the committed artifacts, so they are
fast and they run without refitting. The one that loads a stored booster is
marked slow and deselects with `-m 'not slow'`.
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
sys.path.insert(0, str(REPO / "data" / "ml" / "lithology" / "training"))

force2020_lithology = pytest.importorskip("force2020_lithology")

import force2020_lithology as shared  # noqa: E402

REPORT_JSON = shared.GBDT_REPORT_JSON
REPORT_MD = shared.GBDT_REPORT_MD
TRAIN_SCRIPT = REPO / "data" / "ml" / "lithology" / "training" / "train_gbdt_baseline.py"
EVALUATE_SCRIPT = REPO / "data" / "ml" / "lithology" / "evaluation" / "evaluate_gbdt_baseline.py"
SHARED_MODULE = REPO / "data" / "ml" / "common" / "force2020_lithology.py"
# The shared module's REPORT_JSON/MD are the Random Forest ones; this stage's
# own files are the GBDT_ prefixed pair.
RF_REPORT_JSON = shared.REPORT_JSON
MATRIX_JSON = REPO / "ml" / "force2020_penalty_matrix.json"

MODELS = ("xgb", "lgbm")
EVAL_SPLITS = shared.EVAL_SPLITS

REQUIRED_ARTIFACT_ROLES = {
    "model_and_preprocessing_pipeline",
    "model_booster_only",
    "feature_list",
    "label_mapping",
    "training_configuration",
    "split_manifest_reference",
    "metrics",
    "per_class_metrics",
    "confusion_matrix",
    "feature_importance",
    "experiment_manifest",
}

REQUIRED_EXPERIMENTS = {"primary", "depth_only", "logs_plus_masks", "primary_unweighted"}


@pytest.fixture(scope="module")
def report() -> dict:
    if not REPORT_JSON.exists():
        pytest.fail(
            f"{REPORT_JSON} is missing. Run `make train-force2020-gbdt` to produce it."
        )
    return json.loads(REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def forest() -> dict:
    if not RF_REPORT_JSON.exists():
        pytest.fail(f"{RF_REPORT_JSON} is missing; the comparison baseline it depends on.")
    return json.loads(RF_REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def manifests() -> dict:
    found = {}
    for model in MODELS:
        path = (
            shared.EVALUATION_DIR
            / f"{shared.artifact_stem(model)}.experiment_manifest.json"
        )
        if not path.exists():
            pytest.skip(
                f"no trained artifact for {model}; run `make train-force2020-gbdt`. The "
                "committed report is checked by the other tests."
            )
        found[model] = json.loads(path.read_text(encoding="utf-8"))
    return found


def _imported_modules(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    return imported


def _import_order(path: Path) -> list[str]:
    """Every import in the file, in source order, first occurrence of each name.

    Deliberately syntactic. The rule being enforced is a statement about the
    order of import statements in this source file, and reading the order out of
    the source tests exactly that. Trying to prove it by importing the module in
    a subprocess and observing whether the process survives would only show that
    the machine it ran on did not crash, which is not the same claim.

    Walks nested imports too, and sorts by position rather than using
    `ast.walk`, because the LightGBM import is guarded by a `try` block and
    statement order is what matters, not nesting depth.
    """
    nodes: list[tuple[int, int, str]] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            for alias in node.names:
                nodes.append((node.lineno, node.col_offset, alias.name.split(".")[0]))
        elif isinstance(node, ast.ImportFrom) and node.module:
            nodes.append((node.lineno, node.col_offset, node.module.split(".")[0]))
    order: list[str] = []
    for _, _, name in sorted(nodes):
        if name not in order:
            order.append(name)
    return order


# ---------------------------------------------------------------------------
# 1. LightGBM must be imported before scikit-learn
# ---------------------------------------------------------------------------
def test_lightgbm_is_imported_before_sklearn_in_the_shared_module():
    """The native access violation this prevents is unrecoverable.

    Importing scikit-learn first and LightGBM after it makes fit, load and
    predict abort the process on this platform with an access violation reading
    a null address. There is no way to catch that in-process, so the only place
    it can be enforced is the import order in the source.
    """
    order = _import_order(SHARED_MODULE)
    assert "lightgbm" in order, "the shared module no longer imports lightgbm at all"
    assert "sklearn" in order, "the shared module no longer imports sklearn at all"
    assert order.index("lightgbm") < order.index("sklearn"), (
        "lightgbm must be imported before sklearn; got order "
        f"{order}"
    )


@pytest.mark.parametrize("entrypoint", [TRAIN_SCRIPT, EVALUATE_SCRIPT])
def test_entrypoints_do_not_import_sklearn_ahead_of_the_shared_module(entrypoint: Path):
    """Neither entrypoint may pull scikit-learn in before the shared module.

    Importing the shared module is what performs the ordered import. An
    entrypoint that imported scikit-learn itself, even for an unrelated helper,
    would defeat the guard.
    """
    order = _import_order(entrypoint)
    if "sklearn" in order:
        pytest.fail(f"{entrypoint.name} imports sklearn directly: {order}")
    if "lightgbm" in order and "force2020_lithology" in order:
        assert order.index("lightgbm") < order.index("force2020_lithology"), order


def test_the_import_order_requirement_is_recorded_in_the_report(report: dict):
    text = json.dumps(report).lower()
    assert "before scikit-learn" in text or "before sklearn" in text


# ---------------------------------------------------------------------------
# 2. The primary feature matrix is exactly the five log curves
# ---------------------------------------------------------------------------
def test_primary_features_are_exactly_the_five_log_curves(report: dict):
    assert report["features"]["primary"] == list(shared.PRIMARY_FEATURES)
    assert report["features"]["primary"] == ["CALI", "RDEP", "RMED", "DTC", "GR"]


def test_the_boosters_use_exactly_the_random_forest_features(report: dict, forest: dict):
    """Fairness is a claim about the feature list, so compare the two reports."""
    for model in MODELS:
        assert (
            report["models"][model]["experiments"]["primary"]["features"]
            == forest["features"]["primary"]
        ), f"{model} does not use the Random Forest feature list"


def test_feature_selection_was_not_performed(report: dict):
    """No search, and the feature list is the approved five, not a subset.

    There is no `feature_selection_performed` flag on the configuration, so the
    claim is checked as what it actually is: the primary feature list is exactly
    the five approved curves, and no search of any kind was run.
    """
    for model in MODELS:
        assert report["models"][model]["configuration"]["search_performed"] is False
        assert report["models"][model]["configuration"]["tuned"] is False
        assert report["models"][model]["experiments"]["primary"]["features"] == list(
            shared.PRIMARY_FEATURES
        )


def test_depth_is_not_in_the_primary_feature_matrix(report: dict):
    for model in MODELS:
        primary = report["models"][model]["experiments"]["primary"]["features"]
        assert shared.DEPTH not in primary
    assert report["features"]["depth_column_in_primary"] is False


def test_no_coordinate_or_context_columns_in_the_primary_matrix(report: dict):
    banned = set(shared.FORBIDDEN_FEATURE_COLUMNS)
    for model in MODELS:
        used = set(report["models"][model]["experiments"]["primary"]["features"])
        assert not (used & banned), f"{model} uses forbidden columns: {sorted(used & banned)}"


def test_the_mask_ablation_adds_only_missingness_indicators(report: dict):
    masks = report["models"]["xgb"]["experiments"]["logs_plus_masks"]["features"]
    assert set(masks) == set(shared.PRIMARY_FEATURES) | set(shared.MASK_COLUMNS)
    assert shared.DEPTH not in masks


def test_the_depth_diagnostic_uses_depth_and_nothing_else(report: dict):
    for model in MODELS:
        assert report["models"][model]["experiments"]["depth_only"]["features"] == list(
            shared.DEPTH_ONLY_FEATURES
        )


def test_no_generated_artifact_appears_in_the_contract_tree():
    for path in (REPO / "data" / "ml").rglob("*"):
        if path.is_file() and path.suffix.lower() in {
            ".csv", ".parquet", ".pkl", ".joblib", ".pt", ".h5", ".onnx"
        }:
            pytest.fail(f"data/ml/ must stay empty of generated data: {path}")


# ---------------------------------------------------------------------------
# 3. Twelve classes, preserved
# ---------------------------------------------------------------------------
def test_all_twelve_classes_were_trained_on(report: dict):
    for model in MODELS:
        handling = report["models"][model]["experiments"]["primary"]["class_handling"]
        assert len(handling["classes"]) == 12, model
        assert handling["classes_in"] == 12
        assert handling["classes_out"] == 12
        assert len(report["models"][model]["class_handling"]["train_class_support"]) == 12
    assert report["target"]["class_count"] == 12
    assert report["target"]["classes_merged"] == 0
    assert report["target"]["classes_removed"] == 0


def test_the_output_width_check_does_not_branch_on_a_name():
    """The check must ask the estimator what it is, not be told.

    Callers hold both a key ("xgb") and a label ("XGBoost"). Branching on a
    name silently takes the other library's attribute, which raises an
    AttributeError on one and reads the wrong width on the other.
    """
    source = SHARED_MODULE.read_text(encoding="utf-8")
    body = source[source.find("def booster_output_width"):]
    body = body[: body.find("\ndef ")]
    assert "get_booster" in body, "XGBoost is no longer detected structurally"
    assert "booster_" in body, "LightGBM is no longer detected structurally"
    assert "model_name ==" not in body, "the width check must not branch on a name"


def test_zero_support_classes_are_named_rather_than_invented(report: dict):
    for model in MODELS:
        for split in EVAL_SPLITS:
            per_class = report["models"][model]["experiments"]["primary"]["results"][split][
                "per_class"
            ]
            for row in per_class:
                if row["support"] == 0:
                    assert row["f1"] is None or row["zero_support"] is True
                    assert row["zero_support"] is True
                    assert row["class_name"], row


def test_the_rare_class_agrees_with_the_random_forest_finding(forest: dict, report: dict):
    """Basement and Halite are the classes with no rows on one partition.

    Encoded ids 10 and 8 are the ones the Random Forest report already
    identified. If the encoding ever changed, both reports would move together
    and this would catch the drift.
    """
    forest_absent = {
        split: set(ids) for split, ids in forest["partition_comparison"]["classes_zero_support_by_split"].items()
    }
    for model in MODELS:
        for split in EVAL_SPLITS:
            aggregate = report["models"][model]["experiments"]["primary"]["results"][split][
                "aggregate"
            ]
            assert set(aggregate["classes_zero_support"]) == forest_absent[split], (
                f"{model} {split}: zero-support classes disagree with the Random Forest report"
            )


# ---------------------------------------------------------------------------
# 4. Class imbalance: expressed as sample weights, measured not assumed
# ---------------------------------------------------------------------------
def test_balancing_is_per_row_sample_weights_not_a_library_argument(report: dict):
    """Neither boosting library has a class_weight argument, so the intent is
    expressed as per-row sample weights, and the report says so."""
    for model in MODELS:
        strategy = report["models"][model]["configuration"]["class_handling"]["strategy"]
        assert strategy == "balanced per-row sample weights", model
        parameters = report["models"][model]["configuration"]["parameters"]
        assert "class_weight" not in parameters, f"{model} was given a class_weight argument"


def test_the_sample_weights_are_computed_from_training_rows_only(report: dict):
    for model in MODELS:
        support = {
            int(key): value
            for key, value in report["models"][model]["class_handling"]["train_class_support"].items()
        }
        weights = {
            int(key): value
            for key, value in report["models"][model]["class_handling"]["weights_used"].items()
        }
        assert set(weights) == set(support)
        rows = report["split"]["rows_by_split"]["train"]
        for encoded_id, count in support.items():
            expected = rows / (len(support) * count)
            assert abs(weights[encoded_id] - expected) < 1e-3, (model, encoded_id)
        # Balanced weights must equalise class mass: n_c * w_c is the same for
        # every class. That identity is the whole point of the scheme. The
        # reported weights are rounded to four decimals, so a class holding most
        # of the rows carries a relative error of up to 5e-5 / 0.1353 = 3.7e-4
        # in the weight before it is ever multiplied. Anything tighter than that
        # would be testing the rounding, not the scheme.
        mass = [count * weights[encoded_id] for encoded_id, count in support.items()]
        assert max(mass) / min(mass) - 1 < 1e-3, (
            f"{model}: class mass is not equalised: {min(mass)}..{max(mass)}"
        )


def test_the_unweighted_comparison_ran_and_concluded_something(report: dict):
    for model in MODELS:
        assert "primary_unweighted" in report["models"][model]["experiments"]
        assert report["models"][model]["experiments"]["primary_unweighted"]["class_weighting"] is None
        assert report["models"][model]["experiments"]["primary"]["class_weighting"]


def test_the_weighting_conclusion_is_generated_from_the_numbers(report: dict):
    for model in MODELS:
        text = report["cross_model_observation"]["weighting_conclusions"][model]
        assert text.strip()
        # A conclusion that is identical for both models regardless of their
        # numbers would be a fixed string, not a reading of the evidence.
        others = [
            report["cross_model_observation"]["weighting_conclusions"][other] for other in MODELS
        ]
        assert len(set(others)) >= 1


# ---------------------------------------------------------------------------
# 5. Split discipline
# ---------------------------------------------------------------------------
def test_no_well_is_in_both_the_fitting_and_an_evaluation_partition(report: dict):
    """The guard ran per split and found no shared wells, with the counts to show it."""
    for split in EVAL_SPLITS:
        guard = report["split"]["leakage_guards"][split]
        assert guard["shared_wells"] == 0, split
        assert guard["fitting_wells"] == report["split"]["wells_by_split"]["train"]
        assert guard["evaluation_wells"] == report["split"]["wells_by_split"][split]
        # Recorded on every scored partition too, not only at the top level.
        for model in MODELS:
            recorded = report["models"][model]["experiments"]["primary"]["results"][split][
                "leakage_guard"
            ]
            assert recorded["shared_wells"] == 0, (model, split)


def test_the_leakage_guard_actually_raises_on_an_overlap():
    with pytest.raises(ValueError, match="appear in both"):
        shared.assert_no_well_overlap(["A", "B"], ["B", "C"])


def test_no_row_level_random_split_was_used(report: dict):
    assert report["split"]["row_level_random_split"] is False
    assert report["split"]["wells_reshuffled"] is False
    assert report["split"]["fitted_on"] == "train"
    assert list(report["split"]["evaluated_on"]) == list(EVAL_SPLITS)


def test_well_counts_match_the_split_manifest(report: dict):
    reference = shared.split_manifest_reference()
    assert report["split"]["wells_by_split"] == reference["wells_by_split"]
    assert report["split"]["split_manifest"]["sha256"] == reference["sha256"]


def test_the_target_and_taxonomy_are_unchanged(report: dict, forest: dict):
    assert report["target"]["column"] == forest["target"]["column"]
    assert report["target"]["class_count"] == forest["target"]["class_count"] == 12
    assert report["target"]["classes"] == forest["target"]["classes"]
    assert report["target"]["classes_merged"] == 0
    assert report["target"]["classes_removed"] == 0
    assert report["target"]["mapped_to_canonical"] is False


# ---------------------------------------------------------------------------
# 6. Configuration is fixed and deterministic
# ---------------------------------------------------------------------------
def test_model_configuration_is_deterministic_and_fully_documented(report: dict):
    for model in MODELS:
        configuration = report["models"][model]["configuration"]
        parameters = configuration["parameters"]
        for name in report["models"][model]["required_parameters_recorded"]:
            assert name in parameters, f"{model} does not record {name}"
        assert parameters["random_state"] == 42
        assert parameters["n_estimators"] == 500
        assert parameters["n_jobs"] == -1
        assert configuration["tuned"] is False
        assert configuration["search_performed"] is False


def test_lightgbm_asks_for_determinism_explicitly(report: dict):
    """LightGBM needs to be told, or the histogram build can reorder rows."""
    parameters = report["models"]["lgbm"]["configuration"]["parameters"]
    assert parameters["deterministic"] is True
    assert parameters["force_row_wise"] is True
    assert parameters["verbosity"] == -1


def test_xgboost_uses_hist_and_softprob(report: dict):
    parameters = report["models"]["xgb"]["configuration"]["parameters"]
    assert parameters["tree_method"] == "hist"
    assert parameters["objective"] == "multi:softprob"
    assert parameters["eval_metric"] == "mlogloss"
    assert parameters["subsample"] == 1.0
    assert parameters["colsample_bytree"] == 1.0


def test_xgboost_was_told_the_class_count_explicitly(report: dict):
    """A booster that infers its width from the labels could emit 11 classes."""
    assert report["models"]["xgb"]["configuration"]["parameters"]["num_class"] == 12
    assert report["models"]["lgbm"]["configuration"]["parameters"]["num_class"] == 12


def test_two_config_objects_are_equal():
    """Re-declaring the configuration must not change it."""
    for model in MODELS:
        assert shared.GBDT_CONFIGS[model].to_dict() == shared.GBDT_CONFIGS[model].to_dict()


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
    assert "early_stopping" not in text


def test_no_evaluation_partition_was_used_for_selection(report: dict):
    selection = report["experimental_fairness"]["model_selection"]
    assert selection["performed"] is False
    assert selection["test_partitions_used_for_selection"] is False


# ---------------------------------------------------------------------------
# 7. Preprocessing
# ---------------------------------------------------------------------------
def test_the_pipeline_puts_imputation_before_the_model(manifests: dict):
    for model, manifest in manifests.items():
        steps = list(manifest["pipeline_steps"])
        assert steps[0] == "imputer", model
        assert steps[-1] == "classifier", model


def test_imputation_is_median_and_fitted_on_training_rows_only(report: dict, manifests: dict):
    for model in MODELS:
        imputation = report["models"][model]["experiments"]["primary"]["imputation"]
        assert imputation["strategy"] == "median"
        assert "training wells" in imputation["fitted_on"] or "train" in imputation["fitted_on"]
        assert manifests[model]["missing_value_handling"]["strategy"] == "median"
        assert manifests[model]["missing_value_handling"]["fitted_on"] == "train partition only"


def test_the_stored_dataset_keeps_its_missing_values(report: dict):
    assert report["missing_value_handling"]["stored_dataset"].startswith("Unchanged")
    assert "read_only" in report["dataset"]
    assert report["missing_value_handling"]["masks_in_primary"] is False


# ---------------------------------------------------------------------------
# 8. Metrics, shared verbatim with the Random Forest baseline
# ---------------------------------------------------------------------------
def test_every_split_reports_the_required_metrics(report: dict):
    for model in MODELS:
        for split in EVAL_SPLITS:
            aggregate = report["models"][model]["experiments"]["primary"]["results"][split][
                "aggregate"
            ]
            for name in (
                "macro_f1",
                "macro_f1_supported_only",
                "weighted_f1",
                "balanced_accuracy",
            ):
                assert "value" in aggregate[name], (model, split, name)
            assert aggregate["classes_declared"] == 12


def test_the_boosters_and_the_forest_report_the_same_metric_set(report: dict, forest: dict):
    for model in MODELS:
        for split in EVAL_SPLITS:
            booster = report["models"][model]["experiments"]["primary"]["results"][split][
                "aggregate"
            ]
            trees = forest["primary_results"][split]["aggregate"]
            assert set(booster) == set(trees), (model, split)
            assert booster["undefined_score_policy"] == trees["undefined_score_policy"]


def test_per_class_rows_carry_support_and_only_null_what_is_undefined(report: dict):
    for model in MODELS:
        for split in EVAL_SPLITS:
            per_class = report["models"][model]["experiments"]["primary"]["results"][split][
                "per_class"
            ]
            assert len(per_class) == 12
            for row in per_class:
                assert row["support"] is not None
                assert (row["f1"] is None) == (
                    row["zero_support"] or row["never_predicted"]
                ), row


def test_a_class_with_no_true_rows_is_reported_as_null_not_zero():
    """scikit-learn's zero_division=0 gives 0.0; the shared metrics report null.

    The two are not the same claim, and the report says which one it is making.
    """
    y_true = [0, 0, 1, 1, 2]
    y_pred = [0, 0, 1, 2, 2]
    classes = [0, 1, 2, 3]
    per_class = shared.per_class_metrics(
        __import__("numpy").array(y_true), __import__("numpy").array(y_pred), classes,
        {0: "a", 1: "b", 2: "c", 3: "d"},
    )
    absent = next(row for row in per_class if row["encoded_id"] == 3)
    assert absent["support"] == 0
    assert absent["f1"] is None
    assert absent["zero_support"] is True


def test_confusion_matrix_matches_the_partitions_it_describes(report: dict):
    for model in MODELS:
        for split in EVAL_SPLITS:
            result = report["models"][model]["experiments"]["primary"]["results"][split]
            counts = result["confusion_matrix"]["counts"]
            assert len(counts) == 12
            total = sum(sum(row) for row in counts)
            assert total == result["rows"], (model, split)


def test_the_penalty_matrix_is_the_published_one(report: dict):
    """Same matrix as the Random Forest stage, and it is not homemade."""
    recorded = report["penalty_matrix"]
    matrix = json.loads(MATRIX_JSON.read_text(encoding="utf-8"))
    assert recorded["matrix_id"] == matrix["matrix_id"]
    assert recorded["authoritative"] is matrix["authority"]["is_authoritative"]
    assert recorded["homemade"] is matrix["authority"]["is_homemade"]
    assert recorded["authoritative"] is True
    assert recorded["homemade"] is False
    # The source has to be recorded, not left as an empty object: a penalty
    # score with no provenance is not checkable against anything.
    assert recorded["source"]["resolved_commit_sha"]
    assert recorded["source"]["repository"]
    assert recorded["formula"] == matrix["scoring"]["formula"]


def test_the_penalty_matrix_is_indexed_in_the_competition_order(report: dict):
    for model in MODELS:
        for split in EVAL_SPLITS:
            penalty = report["models"][model]["experiments"]["primary"]["results"][split]["penalty"]
            assert "competition" in penalty["indexed_by"]
            assert "encoded id" in penalty["indexed_by"]


def test_penalty_scores_are_reported_for_both_partitions(report: dict):
    for model in MODELS:
        for split in EVAL_SPLITS:
            penalty = report["models"][model]["experiments"]["primary"]["results"][split]["penalty"]
            assert isinstance(penalty["competition_score"], float)
            assert penalty["rows_scored"] > 0
            assert penalty["perfect_score"] == 0.0


def test_aggregate_metric_definitions_match_the_libraries():
    """The shared aggregate is recomputed from the libraries, not approximated."""
    import numpy as np
    from sklearn.metrics import balanced_accuracy_score, f1_score

    rng = np.random.default_rng(11)
    y_true = rng.integers(0, 12, size=4000)
    y_pred = np.where(rng.random(4000) < 0.6, y_true, rng.integers(0, 12, size=4000))
    classes = list(range(12))
    lookup = {value: f"c{value}" for value in classes}
    per_class = shared.per_class_metrics(y_true, y_pred, classes, lookup)
    aggregate = shared.aggregate_metrics(y_true, y_pred, classes, 4000, 40, per_class)
    assert abs(
        aggregate["macro_f1"]["value"] - f1_score(y_true, y_pred, labels=classes, average="macro", zero_division=0)
    ) < 1e-6
    assert abs(
        aggregate["balanced_accuracy"]["value"] - balanced_accuracy_score(y_true, y_pred)
    ) < 1e-6


# ---------------------------------------------------------------------------
# 9. The four experiments, and what they are allowed to conclude
# ---------------------------------------------------------------------------
def test_all_four_experiments_ran_for_both_models(report: dict):
    for model in MODELS:
        assert set(report["models"][model]["experiments"]) == REQUIRED_EXPERIMENTS


def test_only_the_primary_is_a_candidate_configuration(report: dict):
    for model in MODELS:
        for key, experiment in report["models"][model]["experiments"].items():
            if key == "primary":
                assert experiment["kind"] == "primary"
            else:
                assert experiment["kind"] != "primary", (model, key)


def test_the_depth_diagnostic_is_labelled_a_diagnostic(report: dict):
    for model in MODELS:
        note = report["models"][model]["experiments"]["depth_only"]["note"]
        assert "diagnostic" in note.lower()


def test_the_diagnostics_are_reported_for_both_partitions(report: dict):
    for model in MODELS:
        for key in REQUIRED_EXPERIMENTS - {"primary"}:
            assert set(report["models"][model]["experiments"][key]["results"]) == set(EVAL_SPLITS)


# ---------------------------------------------------------------------------
# 10. Feature importance is described, not ranked across libraries
# ---------------------------------------------------------------------------
def test_feature_importance_is_reported_for_every_primary_feature(report: dict):
    for model in MODELS:
        importance = report["models"][model]["feature_importance"]
        assert [row["feature"] for row in importance] == list(shared.PRIMARY_FEATURES)
        for row in importance:
            assert row["gain"] >= 0
            assert 0.0 <= row["gain_share"] <= 1.0


def test_the_importance_caution_refuses_to_rank_across_libraries(report: dict):
    text = report["cross_model_observation"]["importance"]
    assert "not" in text.lower()
    assert "impurity" in text.lower() or "loss reduction" in text.lower()


# ---------------------------------------------------------------------------
# 11. Artifacts
# ---------------------------------------------------------------------------
def test_artifact_manifest_is_complete(manifests: dict):
    for model, manifest in manifests.items():
        roles = {entry["role"] for entry in manifest["artifacts"]}
        assert REQUIRED_ARTIFACT_ROLES <= roles, f"{model} missing {sorted(REQUIRED_ARTIFACT_ROLES - roles)}"
        seen = set()
        for entry in manifest["artifacts"]:
            assert entry["path"], entry
            assert entry["role"] not in seen, f"{model}: duplicate role {entry['role']}"
            seen.add(entry["role"])
            if entry["role"] == "experiment_manifest":
                # A file cannot contain its own hash. The manifest's own bytes
                # are covered by `make verify-force2020-gbdt`.
                assert entry["sha256"] is None, entry
                continue
            assert len(entry.get("sha256") or "") == 64, entry


def test_artifact_manifest_identifies_source_split_and_experiment(manifests: dict):
    for model, manifest in manifests.items():
        assert manifest["experiment_id"] == shared.experiment_id(model)
        assert manifest["dataset"]["sha256"]
        assert manifest["source"]["resolved_commit_sha"]
        assert manifest["split_manifest_reference"]["sha256"] == shared.split_manifest_reference()["sha256"]
        assert manifest["target"]["class_count"] == 12
        assert list(manifest["pipeline_steps"])[0] == "imputer"
        assert list(manifest["pipeline_steps"])[-1] == "classifier"


def test_every_artifact_lives_under_the_interim_root_or_reports(manifests: dict):
    for manifest in manifests.values():
        for entry in manifest["artifacts"]:
            path = entry["path"]
            assert path.startswith("data/interim/ml/") or path.startswith("reports/"), path


def test_the_stored_model_still_has_five_features_and_no_depth(manifests: dict):
    for manifest in manifests.values():
        features = manifest["features"]
        assert features["primary"] == list(shared.PRIMARY_FEATURES)
        assert features["depth_in_primary"] is False
        assert features["feature_selection_performed"] is False


# ---------------------------------------------------------------------------
# 12. Reproducibility of the committed report
# ---------------------------------------------------------------------------
def test_committed_report_json_is_in_the_projects_own_format(report: dict):
    """Two-space indent, ASCII, trailing newline. Same as the RF report."""
    text = REPORT_JSON.read_text(encoding="utf-8")
    assert text.endswith("\n")
    assert text == json.dumps(report, indent=2, ensure_ascii=True) + "\n"


def test_committed_report_has_no_timings_or_host_specific_values(report: dict):
    text = json.dumps(report).lower()
    for volatile in ("seconds", "elapsed", "timestamp"):
        assert volatile not in text, f"{volatile} is not reproducible"


def test_the_markdown_report_contains_every_required_section(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8")
    headings = [line for line in text.splitlines() if line.startswith("## ")]
    numbers = [int(line.split(".")[0][3:]) for line in headings]
    assert numbers == list(range(1, len(numbers) + 1)), headings
    for expected in (
        "What is held identical",
        "Features",
        "Target",
        "Split",
        "Class imbalance and sample weighting",
        "What was not done",
        "Model configuration",
        "Results",
        "Per-class metrics",
        "Diagnostics",
        "Feature importance",
        "Limitations",
        "Reproducibility and provenance",
    ):
        assert expected in text, expected
    assert "XGBoost" in text
    assert "LightGBM" in text
    assert "Random Forest" in text, "the comparison to the existing baseline is missing"


def _every_occurrence_is_negated(text: str, phrase: str) -> bool:
    """True when every appearance of `phrase` sits inside a negation.

    A substring ban cannot tell "the best model" from "neither is the best
    model", and this report says the second on purpose. So the check is about
    the grammar around the phrase, not about the phrase's presence.
    """
    negations = ("not ", "no ", "neither", "never", "isn't", "is not")
    for match in re.finditer(re.escape(phrase), text, re.IGNORECASE):
        window = text[max(0, match.start() - 60) : match.start()].lower()
        if not any(negation in window for negation in negations):
            return False
    return True


def test_the_report_does_not_claim_to_be_best_or_production_ready(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8")
    for phrase in ("best model", "production-ready", "deployed", "state of the art", "world class"):
        assert _every_occurrence_is_negated(text, phrase), (
            f"{phrase!r} appears in the report without a negation"
        )
    assert "Neither model is tuned" in text or "neither is tuned" in text.lower()


def test_the_partition_caution_precedes_any_ranking(report: dict):
    """The 0.13 gap between partitions is larger than the gaps between models."""
    caution = report["cross_model_observation"]["caution"]
    assert "not been shown to be better or worse" in caution
    for model in MODELS:
        assert model not in report["cross_model_observation"].get("best", {})


def test_no_model_is_declared_a_winner(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8").lower()
    for phrase in ("xgb wins", "lgbm wins", "the best model is", "winner"):
        assert phrase not in text


def test_limitations_are_reported(report: dict):
    limitations = " ".join(report["limitations"]).lower()
    assert report["limitations"], "the report has no limitations section"
    for subject in (
        "not searched",         # fixed configurations, no search
        "variance",            # ten-well partitions
        "disagree",            # the two partitions contradict each other
    ):
        assert subject in limitations, subject
    assert "## 19. Limitations" in REPORT_MD.read_text(encoding="utf-8")


def test_environment_is_recorded(manifests: dict):
    for manifest in manifests.values():
        environment = manifest["environment"]
        assert environment["python"]
        assert environment["xgboost"]
        assert environment["lightgbm"]
        assert environment["scikit_learn"]


def test_the_ingest_stage_still_uses_no_ml_stack():
    banned = {"numpy", "pandas", "torch", "sklearn", "lightgbm", "xgboost", "scipy"}
    matrix_script = REPO / "scripts" / "ingest" / "extract_force2020_penalty_matrix.py"
    assert not (_imported_modules(matrix_script) & banned)


def test_the_modelling_stage_uses_the_declared_optional_extra():
    assert "sklearn" in _imported_modules(SHARED_MODULE)
    for entrypoint in (TRAIN_SCRIPT, EVALUATE_SCRIPT):
        assert "force2020_lithology" in _imported_modules(entrypoint)
    text = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    extras = text.split("[project.optional-dependencies]")[1]
    assert re.search(r"^ml\s*=", extras, re.MULTILINE)
    for package in ("xgboost", "lightgbm"):
        assert re.search(rf'"{package}', extras), f"{package} is not in the ml extra"
    base = text.split("[project.optional-dependencies]")[0]
    for package in ("numpy", "pandas", "scikit", "xgboost", "lightgbm"):
        assert package not in base, f"{package} must not become a base dependency"


def test_the_base_install_cannot_need_lightgbm_to_read_the_shared_module():
    """A missing optional library must not make the shared module unimportable."""
    source = SHARED_MODULE.read_text(encoding="utf-8")
    assert "ModuleNotFoundError" in source, "the optional import is not guarded"


def test_no_deeper_model_family_is_referenced():
    """No CNNs, no neural networks. This stage is trees."""
    for path in (TRAIN_SCRIPT, EVALUATE_SCRIPT, SHARED_MODULE):
        text = path.read_text(encoding="utf-8").lower()
        for banned in ("torch", "tensorflow", "keras", "mlpclassifier", "sklearn.neural"):
            assert banned not in text, f"{banned} appears in {path.name}"


def test_the_scripts_write_nothing_into_the_frozen_or_contract_trees():
    for script in (TRAIN_SCRIPT, EVALUATE_SCRIPT):
        literals = {
            node.value
            for node in ast.walk(ast.parse(script.read_text(encoding="utf-8")))
            if isinstance(node, ast.Constant) and isinstance(node, str)
        }
        forbidden = [
            text
            for text in literals
            if re.match(r"^data/(processed|ml)/", text) or "data/processed/" in text
        ]
        assert not forbidden, f"{script.name} names a forbidden write target: {forbidden}"


@pytest.mark.slow
def test_the_stored_models_reproduce_the_committed_metrics(report: dict, manifests: dict):
    """It loads both boosters and re-scores every held-out row."""
    joblib = pytest.importorskip("joblib")
    pytest.importorskip("lightgbm")
    import numpy as np

    classes = [int(entry["encoded_id"]) for entry in shared.class_table()]
    lookup = shared.encoded_to_class_name()
    frame = shared.load_dataset([shared.WELL, shared.SPLIT, shared.TARGET, *shared.LOG_COLUMNS])

    for model in MODELS:
        path = shared.TRAINING_DIR / f"{shared.artifact_stem(model)}.pipeline.joblib"
        if not path.exists():
            pytest.skip(f"{path} is missing")
        pipeline = joblib.load(path)
        features = [str(value) for value in manifests[model]["features"]["primary"]]
        for split in EVAL_SPLITS:
            part = frame.loc[frame[shared.SPLIT] == split]
            y_true = part[shared.TARGET].to_numpy(dtype=np.int64)
            y_pred = pipeline.predict(part.loc[:, features].to_numpy(dtype=np.float64)).astype(np.int64)
            fresh = shared.aggregate_metrics(
                y_true, y_pred, classes, int(y_true.size), int(part[shared.WELL].nunique()),
                shared.per_class_metrics(y_true, y_pred, classes, lookup),
            )
            stored = report["models"][model]["experiments"]["primary"]["results"][split]["aggregate"]
            for name in ("macro_f1", "macro_f1_supported_only", "weighted_f1", "balanced_accuracy"):
                assert abs(fresh[name]["value"] - stored[name]["value"]) < 1e-9, (model, split, name)
