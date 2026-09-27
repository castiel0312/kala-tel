"""Contract tests for the FORCE 2020 dataset construction.

The builder is the first FORCE 2020 stage that writes a table, so these tests
hold four things still:

1. It stays dataset construction. No model, no score, no fitted anything, and
   nothing written to the frozen or contract-only trees. The artifact root guard
   is tested directly, because "we meant to write somewhere else" is exactly the
   failure that would otherwise go unnoticed.
2. The table is the approved table. The feature columns are read back from the
   committed characterization report rather than restated here, so an
   unapproved feature cannot slip in by editing both files consistently.
3. It is a faithful record. Row accounting reconciles against the source counts
   the inspection stage measured, all 12 classes survive, the split is the
   source's own, and missingness is explicit and never filled.
4. It is reproducible. One slow test re-runs `--verify` against the pinned
   checkout; a fast one drives the builder over a synthetic source so the
   exclusion ledger and the label join are exercised on the edge cases the real
   source happens not to contain.

Most tests read the committed report rather than re-scanning 1.4M rows, so they
run in about a second. Tests that need the built CSV, which is gitignored, skip
when it has not been built in this checkout.
"""
from __future__ import annotations

import ast
import csv
import importlib.util
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")

REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "scripts" / "ingest" / "build_force2020_dataset.py"
REPORT_JSON = REPO / "reports" / "force2020_dataset.json"
REPORT_MD = REPO / "reports" / "force2020_dataset.md"
SPLIT_MANIFEST = REPO / "data" / "force2020_split_manifest.csv"
EXTERNAL_REGISTRY = REPO / "ml" / "external_datasets.yaml"
LABEL_REGISTRY = REPO / "ml" / "label_registry.yaml"
CHARACTERIZATION = REPO / "reports" / "force2020_characterization.json"
SOURCE_ROOT = REPO / "data" / "raw" / "force2020"
SOURCE_DATA = SOURCE_ROOT / "lithology_competition" / "data"

PINNED_COMMIT = "c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1"

# The published source row counts, from the accepted inspection and
# characterization passes. Re-asserted so a source change fails here rather than
# silently redefining the dataset.
EXPECTED_SOURCE_ROWS = {
    "extracted/train.csv": 1_170_511,
    "hidden_test.csv": 122_397,
    "leaderboard_test_features.csv": 136_786,
}
EXPECTED_SOURCE_WELLS = {"train": 98, "hidden_test": 10, "leaderboard_test": 10}
EXPECTED_TOTAL_ROWS = 1_429_694
EXPECTED_TOTAL_WELLS = 118

SPLIT_NAMES = ("train", "hidden_test", "leaderboard_test")

# Columns the instruction and the characterization both exclude. A table that
# grows one of these is a table that has started smuggling in either a
# trajectory proxy or a label-adjacent stratigraphy column.
EXCLUDED_COLUMNS = {
    "X_LOC", "Y_LOC", "Z_LOC", "GROUP", "FORMATION",
    "FORCE_2020_LITHOFACIES_LITHOLOGY", "FORCE_2020_LITHOFACIES_CONFIDENCE",
    "MUDWEIGHT", "SGR", "RSHA", "RHOB", "NPHI", "PEF", "SP", "BS", "ROP",
    "DTS", "DCAL", "DRHO", "RMIC", "ROPA", "RXO",
}

# The 12 NPD lithofacies codes, and the names the source publishes for them.
FORCE2020_CLASSES = {
    "30000": "Sandstone",
    "65000": "Shale",
    "65030": "Sandstone/Shale",
    "70000": "Limestone",
    "70032": "Chalk",
    "74000": "Dolomite",
    "80000": "Marl",
    "86000": "Anhydrite",
    "88000": "Halite",
    "90000": "Coal",
    "93000": "Basement",
    "99000": "Tuff",
}


def load_builder():
    """Import the builder by path, so no sys.path entry is needed."""
    spec = importlib.util.spec_from_file_location("build_force2020_dataset", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def report() -> dict:
    assert REPORT_JSON.is_file(), (
        f"{REPORT_JSON.name} is missing; run "
        "`python scripts/ingest/build_force2020_dataset.py`"
    )
    return json.loads(REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def external() -> dict:
    return yaml.safe_load(EXTERNAL_REGISTRY.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def characterization() -> dict:
    return json.loads(CHARACTERIZATION.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def split_manifest_rows() -> list[dict]:
    with open(SPLIT_MANIFEST, newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


# ---------------------------------------------------------------------------
# It must stay dataset construction
# ---------------------------------------------------------------------------
def test_script_takes_no_ml_or_dataframe_dependency():
    """Building a CSV table must not make the base install acquire an ML stack."""
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    banned = {"numpy", "pandas", "torch", "sklearn", "lightgbm", "xgboost", "scipy"}
    assert not (imported & banned), f"the builder imports {imported & banned}"


def test_script_contains_no_model_or_transform_calls():
    """No fitting, no scoring, no filling. Read the code, do not trust the prose."""
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    called: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name):
                called.add(func.id)
            elif isinstance(func, ast.Attribute):
                called.add(func.attr)
    banned = {
        "fit", "fit_transform", "predict", "predict_proba", "train",
        "train_test_split", "impute", "interpolate", "ffill", "bfill",
        "rolling", "ewm", "resample", "dropna", "fillna", "StandardScaler",
        "MinMaxScaler", "confusion_matrix", "classification_report",
        "accuracy_score", "f1_score", "roc_auc_score",
    }
    assert not (called & banned), f"the builder calls {sorted(called & banned)}"


def test_script_writes_nothing_into_the_frozen_or_contract_trees():
    """Prose describing the prohibition is fine; a file target is not."""
    literals = {
        node.value
        for node in ast.walk(ast.parse(SCRIPT.read_text(encoding="utf-8")))
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
    }
    forbidden = [
        text for text in literals
        if re.search(r"data/(processed|ml)/\S*\.\w+", text)
    ]
    assert not forbidden, (
        "the builder names a write target inside a frozen or contract-only "
        f"tree: {forbidden}"
    )


def test_artifact_root_outside_the_generated_tree_is_refused(tmp_path):
    """The guard is the point: a table must not be able to land in data/ml."""
    for destination in ("data/processed", "data/ml", "data", "data/interim_lookalike"):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--artifact-root", str(REPO / destination)],
            capture_output=True, text=True, cwd=REPO, timeout=300,
        )
        assert result.returncode != 0, f"--artifact-root {destination} was accepted"
        combined = (result.stdout + result.stderr).lower().replace("\\", "/")
        assert "data/interim" in combined, (
            f"the refusal did not point at the generated tree: {combined[:400]}"
        )


def test_report_declares_the_hard_stop(report: dict):
    """The negative claims are the contract; assert them as data."""
    joined = " ".join(report["not_performed"]).lower()
    for claim in (
        "no model of any kind was trained",
        "no accuracy",
        "no random forest",
        "no cnn code",
        "no prediction api",
        "no value was imputed",
        "no gradient",
        "no external dataset",
        "nothing was merged, joined or appended with data/processed/",
        "not merged with the forge utah canonical data",
        "no rare class was dropped",
    ):
        assert claim in joined, f"report omits the claim: {claim!r}"
    stop = " ".join(report["hard_stop"]).lower()
    for claim in ("no model is trained", "no accuracy or f1", "no cnn code"):
        assert claim in stop, f"hard stop omits: {claim!r}"


def test_no_stage_after_construction_is_claimed(report: dict):
    assert report["stage"] == (
        "dataset construction, QC and split manifest; no model stage entered"
    )
    assert report["canonical_dataset_version_untouched"] == "nwis-forge16b-v0.2"
    assert "model" not in report["dataset"], (
        "a model key in the dataset block means this stage built something it "
        "says it did not"
    )


# ---------------------------------------------------------------------------
# The schema is the approved one
# ---------------------------------------------------------------------------
def test_numeric_features_are_exactly_the_approved_core_set(report: dict, characterization: dict):
    """Read the approval back out of the characterization, do not restate it."""
    approved = characterization["proposed_feature_set"]["core_features"]
    assert report["dataset"]["numeric_feature_columns"] == approved
    assert report["feature_set_cross_check"]["agrees"] is True
    assert report["feature_set_cross_check"]["approved_core_features"] == approved


def test_the_builder_refuses_a_feature_set_the_characterization_did_not_approve(
    characterization: dict, tmp_path: Path,
):
    """The cross-check has to be able to fail, or it is decoration."""
    builder = load_builder()
    drifted = json.loads(json.dumps(characterization))
    drifted["proposed_feature_set"]["core_features"] = ["CALI", "GR", "SP"]
    path = tmp_path / "characterization.json"
    path.write_text(json.dumps(drifted), encoding="utf-8")
    with pytest.raises(SystemExit):
        builder.assert_feature_set_agrees_with_characterization(path)


def test_declared_columns_are_exactly_the_written_columns(report: dict):
    columns = [c["name"] for c in report["dataset"]["column_roles"]]
    assert len(columns) == len(set(columns)) == report["dataset"]["column_count"]
    roles = {c["name"]: c["role"] for c in report["dataset"]["column_roles"]}
    assert set(roles) == set(columns)
    features = report["dataset"]["numeric_feature_columns"]
    masks = report["dataset"]["missing_mask_columns"]
    assert [c for c in columns if c in set(features) | set(masks)] == list(features) + list(masks)


def test_no_excluded_column_reached_the_table(report: dict):
    columns = {c["name"] for c in report["dataset"]["column_roles"]}
    leaked = sorted(columns & EXCLUDED_COLUMNS)
    assert not leaked, f"excluded source columns reached the table: {leaked}"


def test_depth_is_metadata_and_not_a_feature(report: dict):
    """A depth ablation is only possible if depth is not already in the matrix."""
    features = report["dataset"]["numeric_feature_columns"]
    assert "DEPTH_MD" not in features
    matrix = report["dataset"]["feature_matrix_columns"]
    assert "DEPTH_MD" not in matrix
    roles = {c["name"]: c["role"] for c in report["dataset"]["column_roles"]}
    assert roles["DEPTH_MD"] == "depth_metadata"
    assert roles["WELL"] == "identifier"
    for name in report["dataset"]["numeric_feature_columns"]:
        assert roles[name] == "feature"


def test_every_feature_has_its_own_mask_and_no_mask_is_shared(report: dict):
    features = report["dataset"]["numeric_feature_columns"]
    masks = report["dataset"]["missing_mask_columns"]
    assert masks == [f"{name}_MISSING" for name in features]
    assert len(set(masks)) == len(masks) == len(features)
    assert report["missingness"]["mask_semantics"]


def test_every_column_role_carries_a_note(report: dict):
    for column in report["dataset"]["column_roles"]:
        assert column["role"], column
        assert column["note"].strip(), column["name"]


def test_schema_is_identical_in_the_report_and_the_manifest(report: dict):
    manifest_path = Path(report["artifacts"]["manifest"])
    if not manifest_path.is_file():
        pytest.skip("the sidecar manifest has not been built in this checkout")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["columns"] == [c["name"] for c in report["dataset"]["column_roles"]]
    assert manifest["numeric_feature_columns"] == report["dataset"]["numeric_feature_columns"]
    assert manifest["missing_mask_columns"] == report["dataset"]["missing_mask_columns"]
    assert manifest["model_stage_entered"] is False
    assert manifest["source_is_read_only"] is True


# ---------------------------------------------------------------------------
# Row accounting
# ---------------------------------------------------------------------------
def test_row_accounting_reconciles(report: dict):
    accounting = report["row_accounting"]
    assert accounting["reconciles"] is True
    assert accounting["source_rows_read"] - accounting["rows_excluded"] == (
        accounting["dataset_rows_written"]
    )
    assert accounting["rows_excluded"] == sum(
        accounting["exclusions_by_reason"].values()
    )
    assert accounting["unique_well_depth_keys_emitted"] == accounting["dataset_rows_written"]


def test_source_rows_read_match_the_inspected_tables(report: dict):
    assert report["row_accounting"]["source_rows_by_table"] == EXPECTED_SOURCE_ROWS
    assert report["row_accounting"]["source_rows_read"] == EXPECTED_TOTAL_ROWS
    assert report["dataset"]["rows"] == EXPECTED_TOTAL_ROWS
    assert report["dataset"]["wells"] == EXPECTED_TOTAL_WELLS


def test_every_exclusion_rule_is_named_and_has_a_stated_reason(report: dict):
    rules = {r["reason"]: r["rule"] for r in report["exclusion_rules"]}
    assert set(rules) == {
        "target_unavailable",
        "target_code_not_in_source_vocabulary",
        "depth_unparseable",
        "feature_value_non_numeric",
        "duplicate_well_depth",
    }
    for reason, text in rules.items():
        assert len(text) > 40, f"{reason} has no stated reason"
    assert set(report["qc"]["exclusion_samples"]) <= set(rules)


def test_the_exclusion_ledger_reconciles_with_the_report(report: dict):
    path = Path(report["artifacts"]["exclusions"])
    if not path.is_file():
        pytest.skip("the exclusion ledger has not been built in this checkout")
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        header = set(reader.fieldnames or [])
        rows = list(reader)
    assert {"reason", "source_file", "source_row", "WELL", "DEPTH_MD"} <= header
    assert len(rows) == report["row_accounting"]["rows_excluded"]
    known = {r["reason"] for r in report["exclusion_rules"]}
    assert {r["reason"] for r in rows} <= known
    for row in rows:
        assert row["source_file"] in EXPECTED_SOURCE_ROWS
        assert row["source_row"].isdigit()


def test_no_source_row_was_dropped_for_being_rare(report: dict):
    classes = report["class_distribution"]
    assert classes["no_class_dropped_for_being_rare"] is True
    assert classes["no_class_collapsed"] is True
    assert classes["all_source_classes_preserved"] is True
    assert {c["code"] for c in classes["classes"]} == set(FORCE2020_CLASSES)


# ---------------------------------------------------------------------------
# Target handling
# ---------------------------------------------------------------------------
def test_all_twelve_classes_survive_with_their_source_names(report: dict):
    classes = {c["code"]: c for c in report["class_distribution"]["classes"]}
    assert set(classes) == set(FORCE2020_CLASSES)
    for code, name in FORCE2020_CLASSES.items():
        assert classes[code]["class_name"] == name, code


def test_class_rows_reconcile_against_the_table(report: dict):
    classes = report["class_distribution"]
    assert classes["total_rows"] == report["dataset"]["rows"]
    assert sum(c["rows"] for c in classes["classes"]) == classes["total_rows"]
    for entry in classes["classes"]:
        assert sum(entry["rows_by_split"].values()) == entry["rows"], entry["code"]
        assert sum(entry["wells_by_split"].values()) <= entry["wells"]


def test_encoding_is_the_rank_of_the_published_code_list(report: dict):
    """Recompute the encoding independently of the builder's own table."""
    expected = {code: rank for rank, code in enumerate(sorted(FORCE2020_CLASSES))}
    reported = {c["code"]: c["encoded_id"] for c in report["label_encoding"]["classes"]}
    assert reported == expected
    assert report["label_encoding"]["by_code"] == expected
    assert report["label_encoding"]["name_by_code"] == FORCE2020_CLASSES
    assert report["label_encoding"]["collapse_performed"] is False


def test_the_original_label_is_kept_alongside_the_encoded_one(report: dict):
    encoding = report["label_encoding"]
    assert encoding["original_label_preserved_in"] == "TARGET_LABEL_RAW"
    assert encoding["class_name_preserved_in"] == "TARGET_CLASS"
    assert encoding["encoded_target_column"] == "TARGET_ENCODED"
    assert encoding["class_count"] == 12
    roles = {c["name"]: c["role"] for c in report["dataset"]["column_roles"]}
    assert roles["TARGET_LABEL_RAW"] == "target_raw"
    assert roles["TARGET_CLASS"] == "target_raw"
    assert roles["TARGET_ENCODED"] == "target_encoded"


def test_no_force_class_was_mapped_onto_the_canonical_vocabulary(report: dict):
    taxonomy = report["taxonomy"]
    assert taxonomy["mapped_to_canonical"] is False
    assert taxonomy["mapping_to_canonical"] is None
    assert taxonomy["canonical_vocabulary"] == "FORGE_UTAH_16B"
    assert taxonomy["class_count"] == 12
    text = LABEL_REGISTRY.read_text(encoding="utf-8")
    leaked = sorted(code for code in FORCE2020_CLASSES if code in text)
    assert not leaked, f"FORCE 2020 codes leaked into the canonical registry: {leaked}"


def test_the_leaderboard_join_is_exact_and_measured(report: dict):
    join = report["split"]["join"]
    assert join["label_duplicate_keys"] == 0
    assert join["label_rows"] == join["label_keys"] == EXPECTED_SOURCE_ROWS[
        "leaderboard_test_features.csv"
    ]
    assert join["feature_rows"] == join["rows_emitted_for_split"]
    assert join["join_is_exact"] is True
    assert join["every_feature_row_got_a_label"] is True
    assert join["label_file"] == "leaderboard_test_target.csv"
    assert join["feature_file"] == "leaderboard_test_features.csv"


def test_every_row_in_the_table_has_a_target(report: dict):
    qc = {c["id"]: c for c in report["qc"]["checks"]}
    target = qc["QC03"]["measured"]
    assert target["rows_without_a_target"] == 0
    assert target["rows_with_a_target"] == report["dataset"]["rows"]
    assert target["undeclared_target_codes"] == {}
    assert target["target_is_complete_in_the_dataset"] is True


# ---------------------------------------------------------------------------
# The split is the source's own, and well-grouped
# ---------------------------------------------------------------------------
def test_split_is_well_disjoint_and_uses_the_source_partition(report: dict):
    split = report["split"]
    verification = split["verification"]
    assert verification["no_well_in_more_than_one_split"] is True
    assert verification["wells_in_more_than_one_split"] == {}
    assert verification["wells_without_a_split"] == []
    assert verification["all_rows_inherit_their_split_from_well"] is True
    assert split["reshuffled"] is False
    assert split["unit"] == "WELL"
    assert {name: split["splits"][name]["wells"] for name in SPLIT_NAMES} == (
        EXPECTED_SOURCE_WELLS
    )
    assert {name: split["splits"][name]["rows"] for name in SPLIT_NAMES} == {
        "train": 1_170_511,
        "hidden_test": 122_397,
        "leaderboard_test": 136_786,
    }


def test_split_row_counts_reconcile_against_their_wells(report: dict):
    check = report["split"]["verification"]["rows_per_split_check"]
    for name in SPLIT_NAMES:
        assert check[name]["agrees"] is True, name
        assert check[name]["split_rows"] == check[name]["sum_of_well_rows"]
    assert sum(check[name]["split_rows"] for name in SPLIT_NAMES) == report["dataset"]["rows"]


def test_split_manifest_has_one_row_per_well_with_provenance(split_manifest_rows: list[dict]):
    assert len(split_manifest_rows) == EXPECTED_TOTAL_WELLS
    assert len({r["WELL"] for r in split_manifest_rows}) == len(split_manifest_rows)
    header = set(split_manifest_rows[0])
    assert {
        "WELL", "SPLIT", "SOURCE_ID", "SOURCE_SPLIT", "SOURCE_FILE", "LABEL_SOURCE",
        "LABELLED", "ROWS", "MIN_MD", "MAX_MD", "THICKNESS_M", "CLASS_COUNT",
        "CLASSES_PRESENT",
    } <= header
    assert all(r["SOURCE_ID"] == "FORCE2020" for r in split_manifest_rows)
    assert all(r["SPLIT"] in SPLIT_NAMES for r in split_manifest_rows)
    assert sum(int(r["ROWS"]) for r in split_manifest_rows) == EXPECTED_TOTAL_ROWS


def test_split_manifest_agrees_with_the_report(split_manifest_rows: list[dict], report: dict):
    per_split = Counter(r["SPLIT"] for r in split_manifest_rows)
    for name in SPLIT_NAMES:
        assert per_split[name] == report["split"]["splits"][name]["wells"], name
        assert (
            sum(int(r["ROWS"]) for r in split_manifest_rows if r["SPLIT"] == name)
            == report["split"]["splits"][name]["rows"]
        ), name
    for row in split_manifest_rows:
        assert float(row["MIN_MD"]) <= float(row["MAX_MD"]), row["WELL"]
        assert float(row["THICKNESS_M"]) == pytest.approx(
            float(row["MAX_MD"]) - float(row["MIN_MD"]), abs=1e-6
        ), row["WELL"]
        assert int(row["CLASS_COUNT"]) == len(row["CLASSES_PRESENT"].split("|"))


def test_the_label_source_is_recorded_only_where_one_exists(split_manifest_rows: list[dict]):
    for row in split_manifest_rows:
        if row["SPLIT"] == "leaderboard_test":
            assert row["LABEL_SOURCE"] == "leaderboard_test_target.csv"
        else:
            assert row["LABEL_SOURCE"] == ""
        assert row["LABELLED"] == "1"


# ---------------------------------------------------------------------------
# Missingness is explicit, and nothing was filled
# ---------------------------------------------------------------------------
def test_missingness_reconciles_against_the_row_count(report: dict):
    assert report["missingness"]["total_rows"] == report["dataset"]["rows"]
    for entry in report["missingness"]["by_feature"]:
        assert entry["missing"] + entry["observed"] == report["dataset"]["rows"], entry
        assert entry["missing_via_sentinel"] == 0, entry
        assert entry["missing_via_empty_source_field"] == entry["missing"], entry
        assert 0.0 <= entry["missing_fraction"] < 1.0
        assert entry["missing_fraction"] == pytest.approx(
            entry["missing"] / report["dataset"]["rows"], abs=1e-8
        )


def test_missingness_by_split_reconciles_against_the_splits(report: dict):
    for entry in report["missingness"]["by_feature_and_split"]:
        assert entry["split"] in SPLIT_NAMES
        assert entry["rows"] == report["split"]["splits"][entry["split"]]["rows"]
        assert entry["missing_cells"] == sum(f["missing"] for f in entry["features"])


def test_nothing_was_imputed(report: dict):
    policy = report["missing_value_policy"]
    joined = " ".join(policy.values()).lower()
    assert "no interpolation" in joined
    assert "no sentinel substitution" in joined
    assert report["qc"]["checks"][0]["id"] == "QC01"
    missing = {e["feature"]: e for e in report["missingness"]["by_feature"]}
    assert missing["GR"]["missing"] == 0, (
        "GR was measured complete by the characterization; a non-zero count here "
        "would mean cells were fabricated or dropped"
    )


def test_the_depth_key_exemption_is_declared_with_its_measurement(report: dict):
    """An undocumented exemption is a silent exception; a documented one is a rule."""
    text = report["missing_value_policy"]["depth_key_is_not_sentinel_tested"]
    assert "999.25000061" in text
    assert "is_sentinel" in text
    lowered = text.lower()
    assert "key" in lowered and "measurement" in lowered
    registry_dataset = yaml.safe_load(
        EXTERNAL_REGISTRY.read_text(encoding="utf-8")
    )["datasets"]["FORCE2020"]["dataset"]
    assert registry_dataset["missing_value_policy"]["depth_key_exempt_from_null_test"] is True
    assert registry_dataset["missing_value_policy"]["imputed"] is False


def test_observed_and_missing_cells_agree_in_the_built_table(report: dict):
    path = Path(report["artifacts"]["dataset"])
    if not path.is_file():
        pytest.skip("the table has not been built in this checkout")
    expected = {e["feature"]: e for e in report["missingness"]["by_feature"]}
    observed: Counter = Counter()
    with open(path, newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle)):
            if index >= 50_000:
                break
            for feature in expected:
                value = row[feature]
                mask = row[f"{feature}_MISSING"]
                assert mask in {"0", "1"}
                if mask == "1":
                    assert value == "", (feature, row["WELL"])
                else:
                    assert value != "", (feature, row["WELL"])
                    float(value)  # finite by construction
                    observed[feature] += 1
            if index == 0:
                assert row["TARGET_LABEL_RAW"] in FORCE2020_CLASSES
                assert row["TARGET_CLASS"] == FORCE2020_CLASSES[row["TARGET_LABEL_RAW"]]
                assert int(row["TARGET_ENCODED"]) == sorted(FORCE2020_CLASSES).index(
                    row["TARGET_LABEL_RAW"]
                )
    # A feature the report calls complete must be complete in the table too.
    for feature in report["missingness"]["features_with_no_missing_rows"]:
        assert observed[feature] == 50_000, feature


# ---------------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------------
def test_every_row_carries_pinned_provenance(report: dict):
    provenance = report["provenance"]
    assert provenance["source_id"] == "FORCE2020"
    assert provenance["pinned_source_commit"] == PINNED_COMMIT
    assert provenance["source_is_read_only"] is True
    assert provenance["source_modified"] is False
    assert set(provenance["per_row_provenance_columns"]) == {
        "SOURCE_ID", "SOURCE_COMMIT", "SOURCE_FILE", "SPLIT", "SOURCE_SPLIT",
    }
    assert provenance["per_row_target_column"] == "TARGET_LABEL_RAW"
    assert provenance["taxonomy_version"] == PINNED_COMMIT


def test_provenance_columns_are_a_function_of_the_source_table(report: dict):
    files = {f["path"]: f for f in report["source"]["source_files"]}
    assert set(files) == set(EXPECTED_SOURCE_ROWS)
    for path, entry in files.items():
        assert entry["source_split"], path
        assert entry["split"] in SPLIT_NAMES, path
    leaderboard = files["leaderboard_test_features.csv"]
    assert leaderboard["label_source"] == "leaderboard_test_target.csv"
    assert files["extracted/train.csv"]["label_source"] is None


def test_the_manifest_hash_matches_the_built_table(report: dict):
    table = Path(report["artifacts"]["dataset"])
    manifest_path = Path(report["artifacts"]["manifest"])
    if not table.is_file() or not manifest_path.is_file():
        pytest.skip("the table has not been built in this checkout")
    import hashlib

    digest = hashlib.sha256()
    with open(table, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["sha256"] == digest.hexdigest()
    assert report["provenance"]["dataset_sha256"] == digest.hexdigest()
    assert manifest["rows"] == report["dataset"]["rows"]
    assert manifest["wells"] == report["dataset"]["wells"]
    assert manifest["size_bytes"] == table.stat().st_size


def test_the_taxonomy_is_the_sources_own_and_not_the_canonicals(report: dict):
    taxonomy = report["taxonomy"]
    assert taxonomy["taxonomy_id"] == "FORCE2020_NPD_LITHOSTRATIGRAPHIC_LITHOFACIES"
    assert taxonomy["taxonomy_version"] == PINNED_COMMIT
    assert "FORGE Utah" in taxonomy["description"] or "FORGE" in taxonomy["description"]


# ---------------------------------------------------------------------------
# QC
# ---------------------------------------------------------------------------
def test_every_qc_check_is_identified_and_none_is_unaccounted_for(report: dict):
    qc = report["qc"]
    assert [c["id"] for c in qc["checks"]] == [f"QC{i:02d}" for i in range(1, qc["check_count"] + 1)]
    assert qc["passed"] + qc["attending"] == qc["check_count"]
    assert qc["attending_ids"] == []
    for check in qc["checks"]:
        assert check["result"] in {"pass", "attention"}, check["id"]
        assert check["measured"], check["id"]
        assert check["detail"].strip(), check["id"]
        assert check["rule"].strip(), check["id"]


def test_the_qc_checks_measure_the_claims_they_name(report: dict):
    checks = {c["id"]: c["measured"] for c in report["qc"]["checks"]}
    assert checks["QC01"]["duplicate_keys_in_table"] == 0
    assert checks["QC01"]["rows_written"] == report["dataset"]["rows"]
    assert checks["QC02"]["wells_checked"] == EXPECTED_TOTAL_WELLS
    assert checks["QC02"]["wells_affected"] == 0
    assert checks["QC04"]["non_numeric_cells"] == 0
    assert checks["QC05"]["sentinel_cells"] == 0
    assert checks["QC07"]["wells_where_depth_rows_differ_from_table_rows"] == 0
    assert checks["QC08"]["wells_in_more_than_one_split"] == {}
    assert checks["QC09"]["reconciles"] is True
    assert checks["QC09"]["rows_written"] == report["dataset"]["rows"]


def test_no_anomaly_was_repaired_in_place(report: dict):
    assert "no anomaly was corrected in place" in report["qc"]["no_silent_fixes"]
    assert report["qc"]["rules_never_triggered_because_count_was_zero"] == [
        r["reason"] for r in report["exclusion_rules"]
    ]


def test_thin_classes_are_reported_rather_than_merged(report: dict):
    classes = {c["code"]: c for c in report["class_distribution"]["classes"]}
    assert classes["93000"]["wells"] == 1, "93000 is single-well and must stay visible"
    assert classes["93000"]["rows"] > 0
    assert report["class_distribution"]["imbalance_ratio_largest_to_smallest"] > 1000
    assert report["class_distribution"]["rarity_note"]


# ---------------------------------------------------------------------------
# The registry, the artifacts and the docs agree
# ---------------------------------------------------------------------------
def test_the_registry_records_the_built_dataset(external: dict, report: dict):
    entry = external["datasets"]["FORCE2020"]
    assert entry["status"] == "INGESTED"
    assert entry["status"] in external["status_values"]
    dataset = entry["dataset"]
    assert dataset["dataset_id"] == report["provenance"]["dataset_id"]
    assert dataset["rows"] == report["dataset"]["rows"]
    assert dataset["wells"] == report["dataset"]["wells"]
    assert dataset["rows_excluded"] == report["row_accounting"]["rows_excluded"]
    assert dataset["numeric_feature_columns"] == report["dataset"]["numeric_feature_columns"]
    assert dataset["model_trained_on_it"] is False
    assert dataset["transform_script"] == "scripts/ingest/build_force2020_dataset.py"
    assert Path(REPO / dataset["transform_script"]).is_file()


def test_the_registry_artifact_root_is_where_the_builder_wrote(external: dict, report: dict):
    entry = external["datasets"]["FORCE2020"]
    root = REPO / entry["artifact_root"]
    assert root.is_relative_to(REPO / "data" / "interim")
    assert not root.is_relative_to(REPO / "data" / "ml")
    for key in ("dataset", "manifest", "exclusions"):
        generated = REPO / report["artifacts"][key]
        assert generated.is_relative_to(root), f"{key}: {generated}"
    committed = (SPLIT_MANIFEST, REPORT_JSON, REPORT_MD)
    for path in committed:
        assert not path.is_relative_to(root), path


def test_committed_artifacts_exist_and_are_under_version_control_scope(external: dict):
    entry = external["datasets"]["FORCE2020"]
    for relative in entry["committed_artifacts"]:
        path = REPO / relative
        assert path.is_file(), f"declared artifact missing: {relative}"
        assert not path.is_relative_to(REPO / "data" / "interim"), (
            f"{relative} is under the gitignored artifact root, so it is not a "
            "committed artifact"
        )


def test_the_frozen_and_contract_trees_were_not_touched(report: dict):
    """Not a snapshot: a claim in the report that no write target exists."""
    for tree in ("data/processed", "data/ml"):
        forbidden = [
            relative for relative in report["artifacts"].values()
            if relative.startswith(f"{tree}/")
        ]
        assert not forbidden, f"an artifact was written into {tree}: {forbidden}"
    assert report["not_performed"], "the report must keep stating what was not done"


def test_the_markdown_states_the_scope_and_the_hard_stop(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8")
    collapsed = " ".join(text.lower().split())
    assert PINNED_COMMIT in text
    assert f"{report['dataset']['rows']:,}" in text
    assert f"{report['dataset']['wells']}" in text
    assert "no model" in collapsed
    assert "no accuracy" in collapsed
    for feature in report["dataset"]["numeric_feature_columns"]:
        assert feature in text, feature
    for claim in ("no model was trained", "no model is trained"):
        assert claim in collapsed, claim


def test_the_markdown_tables_have_no_unescaped_pipes(report: dict):
    """A stray pipe turns a row into extra cells and the table quietly lies."""
    for line in REPORT_MD.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = re.split(r"(?<!\\)\|", stripped)
        assert cells[0] == "", f"table row does not start at a cell boundary: {line[:80]}"
        assert cells[-1] == "", f"table row does not end at a cell boundary: {line[:80]}"


def test_makefile_exposes_the_dataset_targets():
    text = (REPO / "Makefile").read_text(encoding="utf-8")
    assert "build-force2020-dataset:" in text
    assert "verify-force2020-dataset:" in text
    assert "scripts/ingest/build_force2020_dataset.py --print-summary" in text
    assert "scripts/ingest/build_force2020_dataset.py --verify" in text
    assert "build-force2020-dataset" in text.split(".PHONY")[0] + text


# ---------------------------------------------------------------------------
# The exclusion rules and the join, on a synthetic source
#
# The real source exercises none of the exclusion rules: it has no undeclared
# class, no empty target, no duplicate key and no non-numeric cell. That is good
# news about the source and bad news for the ledger, because a rule that has
# never fired is a rule nobody has seen work. This drives the same build() over a
# 30-row fixture that contains one of each, and checks the ledger.
# ---------------------------------------------------------------------------
FIXTURE_FEATURES = [
    "WELL", "DEPTH_MD", "X_LOC", "Y_LOC", "Z_LOC", "GROUP", "FORMATION",
    "CALI", "RSHA", "RMED", "RDEP", "RHOB", "GR", "SGR", "NPHI", "PEF",
    "DTC", "SP", "BS", "ROP", "DTS", "DCAL", "DRHO", "MUDWEIGHT", "RMIC",
    "ROPA", "RXO",
]


def _write_table(path: Path, rows: list[dict], labelled: bool) -> None:
    header = list(FIXTURE_FEATURES)
    if labelled:
        header += ["FORCE_2020_LITHOFACIES_LITHOLOGY", "FORCE_2020_LITHOFACIES_CONFIDENCE"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=header, delimiter=";", lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({name: row.get(name, "") for name in header})


def _fixture_rows(well: str, count: int) -> list[dict]:
    codes = sorted(FORCE2020_CLASSES)
    rows = []
    for index in range(count):
        row = {name: "1" for name in FIXTURE_FEATURES}
        row["WELL"] = well
        row["DEPTH_MD"] = f"{1000.0 + index * 0.5:.3f}"
        row["CALI"] = "" if index == 2 else "0.2"          # missing, empty cell
        row["RMED"] = "-999.25" if index == 3 else "2.5"   # missing, sentinel
        row["RDEP"] = "3.1"
        row["DTC"] = "140"
        row["GR"] = "55"
        row["X_LOC"] = "0"
        row["Y_LOC"] = "0"
        row["Z_LOC"] = "0"
        row["GROUP"] = ""
        row["FORMATION"] = ""
        row["FORCE_2020_LITHOFACIES_LITHOLOGY"] = codes[index % len(codes)]
        row["FORCE_2020_LITHOFACIES_CONFIDENCE"] = ""
        rows.append(row)
    return rows


@pytest.fixture(scope="module")
def synthetic_build(tmp_path_factory: pytest.TempPathFactory) -> dict:
    builder = load_builder()
    root = tmp_path_factory.mktemp("force2020_src")
    data = root / builder.DATA_SUBDIR

    train = _fixture_rows("WELL_A", 9)
    # One fault per exclusion rule, on rows that carry no missingness themselves,
    # so the missingness counts stay exactly one per well.
    train[0]["DEPTH_MD"] = "999.25000061"      # within 1e-6 of the +999.25 sentinel
    train[4]["FORCE_2020_LITHOFACIES_LITHOLOGY"] = ""        # no target
    train[5]["FORCE_2020_LITHOFACIES_LITHOLOGY"] = "12345"  # undeclared code
    train[6]["DTC"] = "not a number"                         # non-numeric feature
    train[7]["DEPTH_MD"] = train[0]["DEPTH_MD"]              # duplicate key
    train[8]["DEPTH_MD"] = "not a depth"                     # unparseable key
    _write_table(data / "extracted" / "train.csv", train, labelled=True)

    hidden = _fixture_rows("WELL_B", 4)
    _write_table(data / "hidden_test.csv", hidden, labelled=True)

    features = _fixture_rows("WELL_C", 5)
    _write_table(data / "leaderboard_test_features.csv", features, labelled=False)
    labels = [dict(row) for row in features]
    labels[0]["DEPTH_MD"] = f"{float(labels[0]['DEPTH_MD']):.8f}"  # same depth, other format
    _write_table(data / "leaderboard_test_target.csv", labels, labelled=True)

    artifacts = tmp_path_factory.mktemp("force2020_artifacts")
    result = builder.build(root, artifacts)
    result["source_root"] = root
    result["artifacts_dir"] = artifacts
    return result


def _ledger_rows(build: dict) -> list[dict]:
    path = Path(build["report"]["artifacts"]["exclusions"])
    with open(path, newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_synthetic_build_fires_every_exclusion_rule(synthetic_build: dict):
    """A rule that has never fired is a rule nobody has seen work."""
    counts = Counter(row["reason"] for row in _ledger_rows(synthetic_build))
    assert counts == {
        "target_unavailable": 1,
        "target_code_not_in_source_vocabulary": 1,
        "depth_unparseable": 1,
        "feature_value_non_numeric": 1,
        "duplicate_well_depth": 1,
    }
    assert set(counts) == {r["reason"] for r in synthetic_build["report"]["exclusion_rules"]}


def test_every_excluded_row_names_its_source_position(synthetic_build: dict):
    for row in _ledger_rows(synthetic_build):
        assert row["source_file"] in EXPECTED_SOURCE_ROWS
        assert row["source_row"].isdigit()
        assert row["detail"].strip()
        assert row["WELL"].strip()


def test_synthetic_build_keeps_a_real_depth_near_the_positive_sentinel(synthetic_build: dict):
    """The bug this test exists for: 999.25000061 is a measurement, not a null."""
    report = synthetic_build["report"]
    # The fixture does contain one unparseable depth, so the rule can be seen to
    # fire. What must not happen is it firing on the real depth.
    removed = [
        row for row in _ledger_rows(synthetic_build)
        if row["reason"] == "depth_unparseable"
    ]
    assert [row["DEPTH_MD"] for row in removed] == ["not a depth"]
    table = Path(report["artifacts"]["dataset"])
    keys = set()
    with open(table, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            keys.add((row["WELL"], row["DEPTH_MD"]))
    assert ("WELL_A", "999.25000061") in keys
    assert ("WELL_A", "not a depth") not in keys


def test_synthetic_build_does_still_reject_an_unparseable_depth(synthetic_build: dict):
    """Exempt from the sentinel test is not exempt from being a number."""
    builder = load_builder()
    assert builder.parse_depth("999.25000061") == pytest.approx(999.25000061)
    assert builder.parse_depth("-999.25") == pytest.approx(-999.25), (
        "a depth that IS the negative sentinel is still a finite number, so it "
        "is kept as a key rather than silently dropped"
    )
    assert builder.parse_depth("") is None
    assert builder.parse_depth("   ") is None
    assert builder.parse_depth("not a depth") is None
    assert builder.parse_depth("nan") is None
    assert builder.parse_depth("inf") is None
    assert builder.parse_depth("-inf") is None


def test_synthetic_build_survives_a_depth_written_with_other_decimals(synthetic_build: dict):
    join = synthetic_build["report"]["split"]["join"]
    assert join["join_is_exact"] is True
    assert join["every_feature_row_got_a_label"] is True
    assert join["label_duplicate_keys"] == 0


def test_synthetic_build_marks_sentinels_missing_without_inventing_values(synthetic_build: dict):
    table = Path(synthetic_build["report"]["artifacts"]["dataset"])
    found_sentinel = 0
    found_empty = 0
    with open(table, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            assert row["RMED_MISSING"] in {"0", "1"}
            if row["RMED_MISSING"] == "1":
                assert row["RMED"] == ""
                found_sentinel += 1
            if row["CALI_MISSING"] == "1":
                assert row["CALI"] == ""
                found_empty += 1
    # The fixture puts one -999.25 and one empty cell in each of three wells.
    assert found_sentinel == 3, found_sentinel
    assert found_empty == 3, found_empty
    missing = {e["feature"]: e for e in synthetic_build["report"]["missingness"]["by_feature"]}
    assert missing["RMED"]["missing_via_sentinel"] == 3
    assert missing["CALI"]["missing_via_sentinel"] == 0
    assert missing["CALI"]["missing_via_empty_source_field"] == 3
    assert synthetic_build["report"]["qc"]["checks"][4]["measured"]["sentinel_cells"] == 3


def test_synthetic_build_reconciles_and_stays_well_disjoint(synthetic_build: dict):
    report = synthetic_build["report"]
    accounting = report["row_accounting"]
    assert accounting["reconciles"] is True
    with open(
        Path(report["artifacts"]["dataset"]), newline="", encoding="utf-8"
    ) as handle:
        written = sum(1 for _ in csv.DictReader(handle))
    assert accounting["dataset_rows_written"] == written
    assert written == 13, "18 fixture source rows minus the 5 excluded ones"
    assert report["split"]["verification"]["no_well_in_more_than_one_split"] is True
    assert set(report["split"]["splits"]) == set(SPLIT_NAMES)


def test_synthetic_build_preserves_every_class_it_was_given(synthetic_build: dict):
    codes = {c["code"] for c in synthetic_build["report"]["class_distribution"]["classes"]}
    assert codes == set(FORCE2020_CLASSES)


def test_synthetic_build_is_deterministic(tmp_path: Path):
    """Two builds of the same bytes produce the same table hash."""
    builder = load_builder()
    root = tmp_path / "src"
    data = root / builder.DATA_SUBDIR
    rows = _fixture_rows("WELL_A", 6)
    _write_table(data / "extracted" / "train.csv", rows, labelled=True)
    _write_table(data / "hidden_test.csv", _fixture_rows("WELL_B", 3), labelled=True)
    features = _fixture_rows("WELL_C", 3)
    _write_table(data / "leaderboard_test_features.csv", features, labelled=False)
    _write_table(data / "leaderboard_test_target.csv", features, labelled=True)
    first = builder.build(root, tmp_path / "out_a")["report"]
    second = builder.build(root, tmp_path / "out_b")["report"]
    assert first["provenance"]["dataset_sha256"] == second["provenance"]["dataset_sha256"]
    assert first["dataset"]["rows"] == second["dataset"]["rows"]


def test_the_artifact_root_guard_is_also_enforced_inside_build(tmp_path: Path):
    """build() writes where it is told; main() is what refuses. Both are tested."""
    builder = load_builder()
    assert builder.ARTIFACT_ROOT.is_relative_to(REPO / "data" / "interim")
    assert not builder.ARTIFACT_ROOT.is_relative_to(REPO / "data" / "ml")


# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
def test_slow_marker_is_registered():
    config = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    assert "slow:" in config, "the slow marker is not registered in pyproject.toml"


@pytest.mark.slow
def test_verify_reproduces_the_committed_artifacts():
    """Runs the real comparison. Skipped when the pinned checkout is absent."""
    if not (SOURCE_ROOT / ".git").exists():
        pytest.skip("FORCE 2020 checkout is not present; cannot re-verify")
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--verify"],
        capture_output=True, text=True, cwd=REPO, timeout=3600,
    )
    assert result.returncode == 0, (
        f"the committed artifacts no longer match the source:\n{result.stdout}"
        f"{result.stderr}"
    )
