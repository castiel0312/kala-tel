"""Contract tests for the FORCE 2020 source inspection.

FORCE 2020 is an *external* dataset. These tests exist to stop three specific
mistakes, none of which are about model quality:

1. Claiming the canonical NWIS dataset contains FORCE 2020 data. The canonical
   dataset is frozen and its `lithology_group` column is deliberately all null;
   an external lithofacies vocabulary must never be poured into it.
2. Letting the inspection quietly become a transform. It reports the bytes; it
   must not repair them, interpolate them, or write a feature or label table.
3. Letting the committed report drift from the source. The report is the
   provenance record, so it has to be checkable against the pinned commit.

The tests read the committed report rather than re-scanning 1.4M rows, so they
run in under a second and need no network. Tests that genuinely require the
local source checkout skip when it is absent.
"""
from __future__ import annotations

import ast
import csv
import json
import re
from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")

REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "scripts" / "ingest" / "inspect_force2020.py"
REPORT_JSON = REPO / "reports" / "force2020_inspection.json"
REPORT_MD = REPO / "reports" / "force2020_inspection.md"
WELL_INDEX = REPO / "data" / "force2020_wells.csv"
EXTERNAL_REGISTRY = REPO / "ml" / "external_datasets.yaml"
LABEL_REGISTRY = REPO / "ml" / "label_registry.yaml"
SOURCE_ROOT = REPO / "data" / "raw" / "force2020"

FORCE2020_CODES = {
    "30000", "65030", "65000", "80000", "74000", "70000",
    "70032", "88000", "86000", "99000", "90000", "93000",
}


@pytest.fixture(scope="module")
def report() -> dict:
    assert REPORT_JSON.is_file(), (
        f"{REPORT_JSON.name} is missing; run "
        "`python scripts/ingest/inspect_force2020.py`"
    )
    return json.loads(REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def external() -> dict:
    return yaml.safe_load(EXTERNAL_REGISTRY.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# The inspection must stay an inspection
# ---------------------------------------------------------------------------
def test_script_writes_nothing_into_the_frozen_or_contract_trees():
    """No literal may name a file target under data/processed or data/ml.

    Prose that *describes* the prohibition is fine, so this looks for a path
    with a file extension rather than the bare directory name.
    """
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
        "the inspection script names a write target inside a frozen or "
        f"contract-only tree: {forbidden}"
    )


def test_script_takes_no_ml_or_dataframe_dependency():
    """The base install must not acquire an ML stack to profile a CSV."""
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    banned = {"numpy", "pandas", "torch", "sklearn", "lightgbm", "xgboost", "scipy"}
    assert not (imported & banned), f"inspection script imports {imported & banned}"


def test_report_declares_what_it_did_not_do(report: dict):
    """The negative claims are the point of the report; assert them as data."""
    joined = " ".join(report["not_performed"])
    for claim in (
        "no model",
        "no interpolation",
        "no rolling",
        "no cnn",
        "no join, merge or append with data/processed/",
        "no force 2020 label was mapped",
    ):
        assert claim in joined.lower(), f"report omits the claim: {claim!r}"


def test_canonical_lithology_is_untouched():
    """The frozen canonical taxonomy must not have absorbed FORCE classes."""
    path = REPO / "data" / "processed" / "lithology.csv"
    if not path.is_file():
        pytest.skip("canonical lithology.csv is not present in this checkout")
    with open(path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    column = "lithology_group" if "lithology_group" in (rows[0] if rows else {}) else None
    if column is None:
        pytest.skip("lithology.csv has no lithology_group column")
    filled = [r[column] for r in rows if (r.get(column) or "").strip()]
    assert not filled, (
        f"{len(filled)} canonical rows have a lithology_group; an external "
        "lithofacies vocabulary must not be written into the frozen dataset"
    )


# ---------------------------------------------------------------------------
# Internal consistency of the committed report
# ---------------------------------------------------------------------------
def test_split_row_counts_sum_to_the_labelled_total(report: dict):
    tables = report["tables"]
    labelled = report["labelled_rows"]
    assert labelled["train"] == tables["train"]["rows"] - tables["train"]["unlabelled_rows"]
    assert labelled["hidden_test"] == (
        tables["hidden_test"]["rows"] - tables["hidden_test"]["unlabelled_rows"]
    )
    assert labelled["total"] == (
        labelled["train"] + labelled["hidden_test"] + labelled["leaderboard_test_target"]
    )


def test_class_rows_sum_to_the_table_rows(report: dict):
    for name in ("train", "hidden_test", "leaderboard_test_target"):
        table = report["tables"][name]
        total = sum(c["rows"] for c in table["class_distribution"])
        assert total == table["rows"], f"{name}: class rows {total} != {table['rows']}"


def test_class_shares_sum_to_one(report: dict):
    for name in ("train", "hidden_test", "leaderboard_test_target"):
        total = sum(c["fraction"] for c in report["tables"][name]["class_distribution"])
        assert abs(total - 1.0) < 1e-3, f"{name}: class shares sum to {total}"


def test_only_declared_force_codes_appear(report: dict):
    for name in ("train", "hidden_test", "leaderboard_test_target"):
        for entry in report["tables"][name]["class_distribution"]:
            assert entry["code"] in FORCE2020_CODES, f"{name}: undeclared code {entry['code']}"
            assert entry["lithology"] != "UNKNOWN_CODE", (
                f"{name}: code {entry['code']} has no name in the report vocabulary"
            )


def test_splits_are_well_disjoint(report: dict):
    """The source's own partition is the one the well-grouped policy needs."""
    train = set(report["tables"]["train"]["wells"])
    hidden = set(report["tables"]["hidden_test"]["wells"])
    board = set(report["tables"]["leaderboard_test_features"]["wells"])
    assert not train & hidden, f"train/hidden_test share wells: {sorted(train & hidden)}"
    assert not train & board, f"train/leaderboard share wells: {sorted(train & board)}"
    assert not hidden & board, f"hidden/leaderboard share wells: {sorted(hidden & board)}"
    assert report["wells"]["split_overlap"] == []
    assert report["wells"]["count"] == len(train | hidden | board)


def test_leaderboard_features_carry_no_label(report: dict):
    features = report["tables"]["leaderboard_test_features"]
    assert features["has_labels"] is False
    assert features["label_column"] is None
    assert features["class_distribution"] == []
    # ...and the labels for those rows exist in the separate target file.
    assert report["tables"]["leaderboard_test_target"]["has_labels"] is True


def test_per_well_classes_are_genuinely_per_well(report: dict):
    """Guards a real bug: class membership must come from each well's own rows.

    Deriving it from the split-wide class list would give every well in a split
    the same class set, which would silently overstate class coverage.
    """
    counts = set()
    for table in report["tables"].values():
        for classes in table["classes_per_well"].values():
            counts.add(len(classes))
    assert len(counts) > 1, (
        "every well has the same number of classes, so class membership was "
        "not computed per well"
    )
    for table in report["tables"].values():
        for well, classes in table["classes_per_well"].items():
            assert sum(classes.values()) == table["rows_per_well"][well], (
                f"{table['file']} well {well}: class rows do not sum to its row count"
            )


def test_class_well_counts_never_exceed_the_split_well_count(report: dict):
    for name in ("train", "hidden_test"):
        table = report["tables"][name]
        for entry in table["class_distribution"]:
            assert entry["wells"] <= table["well_count"], (
                f"{name}: class {entry['code']} claims {entry['wells']} wells in a "
                f"{table['well_count']}-well split"
            )


def test_missing_value_conventions_are_recorded(report: dict):
    conventions = report["missing_value_conventions"]
    assert conventions["csv"]["representation"] == "empty field"
    assert conventions["las"]["default"] == report["las"]["default_null_value"]
    # Residual sentinels must be surfaced, not silently dropped.
    assert "note" in conventions["residual_sentinels_in_csv"]


def test_source_provenance_is_pinned_and_licensed(report: dict):
    source = report["source"]
    assert re.fullmatch(r"[0-9a-f]{40}", source["resolved_commit_sha"]), (
        "the source commit must be a full 40-character sha, not an abbreviation"
    )
    assert source["archive_doi"]
    assert source["licence"]
    assert source["licence_evidence"]
    assert source["citation"]


def test_las_inventory_comes_from_the_commit_not_the_checkout(report: dict):
    """A sparse checkout is not evidence of how many files the source has."""
    las = report["las"]
    assert las["las_files_in_source_commit"] is not None
    assert las["las_bytes_in_source_commit"] > 0
    assert "git" in las["source_commit_inventory_source"]
    assert las["las_files_checked_out_locally"] <= las["las_files_in_source_commit"]
    assert "local checkout" in las["sparse_checkout_note"]


def test_every_source_file_carries_a_blob_id(report: dict):
    """Blob identity, not a worktree hash, is what makes the report portable.

    Archive members and the local expansion of `train.zip` are legitimately
    without one: they are covered by the archive's blob id instead.
    """
    uncovered = [
        f["path"] for f in report["files"]
        if not f["git_blob_oid"]
        and "!" not in f["path"]
        and "/extracted/" not in f["path"]
    ]
    assert not uncovered, f"source-tree files without a blob id: {uncovered}"
    derived = [f for f in report["files"] if not f["git_blob_oid"]]
    assert all(f.get("note") for f in derived), (
        "a file without a blob id must say why in its note"
    )


# ---------------------------------------------------------------------------
# The registry must agree with the report
# ---------------------------------------------------------------------------
def test_external_registry_and_report_agree(external: dict, report: dict):
    entry = external["datasets"]["FORCE2020"]
    # INSPECTED was the state at the end of the inspection stage. The entry has
    # since moved to INGESTED, because the dataset stage built the table. Either
    # is a legitimate state for the *inspection* report; what must hold is that
    # the status is a declared one and the source facts still agree.
    assert entry["status"] in {"INSPECTED", "INGESTED"}
    assert entry["status"] in external["status_values"]
    assert entry["source"]["resolved_commit_sha"] == report["source"]["resolved_commit_sha"]

    what = entry["what_it_is"]
    assert what["wells"] == report["wells"]["count"]
    assert what["classes"] == report["target"]["class_count"]
    assert what["labelled_rows"] == report["labelled_rows"]["total"]
    assert what["log_curves"] == len(report["curves"]["log_curves"])
    for split, declared in what["splits"].items():
        assert declared["rows"] == report["tables"][split]["rows"], split
        assert declared["wells"] == report["tables"][split]["well_count"], split
        assert declared["labelled"] == report["tables"][split]["has_labels"], split
    assert set(entry["label_vocabulary"]["codes"]) == FORCE2020_CODES


def test_external_vocabulary_is_not_merged_into_the_canonical_one(external: dict):
    """Rule X2. A mapping would have to exist as a file, and it must not."""
    labels = external["datasets"]["FORCE2020"]["label_vocabulary"]
    assert labels["distinct_from_canonical"] is True
    assert labels["mapping_to_canonical"] is None
    canonical = yaml.safe_load(LABEL_REGISTRY.read_text(encoding="utf-8"))
    canonical_codes = set(canonical["models"]["lithology"].get("classes", {}) or {})
    assert not (set(labels["codes"]) & canonical_codes), (
        "a FORCE 2020 code appears in the canonical label registry"
    )


def test_force_codes_are_absent_from_the_canonical_label_registry():
    text = LABEL_REGISTRY.read_text(encoding="utf-8")
    leaked = sorted(code for code in FORCE2020_CODES if code in text)
    assert not leaked, f"FORCE 2020 codes leaked into the canonical registry: {leaked}"


def test_declared_artifact_root_is_gitignored_and_unpopulated(external: dict):
    """Rule X3: generated external data lives under data/interim/, not data/ml.

    The emptiness half of this only holds while the source is merely INSPECTED.
    Once a later stage is allowed to build the table, the root is expected to
    hold files, and the contract that matters is the location, not the emptiness.
    """
    entry = external["datasets"]["FORCE2020"]
    root = REPO / entry["artifact_root"]
    assert root.is_relative_to(REPO / "data" / "interim"), (
        f"{root} must live under the gitignored data/interim/ root"
    )
    assert not root.is_relative_to(REPO / "data" / "ml")
    if entry["status"] == "INGESTED":
        # Ingested: the root is populated, and only by the declared subtrees.
        assert root.is_dir(), f"status is INGESTED but {root} does not exist"
        produced = sorted(
            str(path.relative_to(REPO)) for path in root.rglob("*") if path.is_file()
        )
        assert produced, f"status is INGESTED but {root} holds no file"
        for relative in produced:
            assert not (REPO / relative).is_relative_to(REPO / "data" / "ml")
        return
    if root.exists():
        produced = [p for p in root.rglob("*") if p.is_file()]
        assert not produced, (
            f"status is {entry['status']} but {root} already holds "
            f"{len(produced)} file(s); building a dataset is a separate, "
            "explicit decision"
        )


def test_committed_artifacts_exist(external: dict):
    for relative in external["datasets"]["FORCE2020"]["committed_artifacts"]:
        assert (REPO / relative).is_file(), f"declared artifact missing: {relative}"


# ---------------------------------------------------------------------------
# The well index is the machine-readable half of the report
# ---------------------------------------------------------------------------
def test_well_index_matches_the_report(report: dict):
    with open(WELL_INDEX, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == report["wells"]["count"]
    assert len({r["well"] for r in rows}) == len(rows), "well index has duplicate wells"
    assert [r["well"] for r in rows] == [w["well"] for w in report["wells"]["index"]]
    assert all(r["split"] in {"train", "hidden_test", "leaderboard_test_features"}
               for r in rows)
    assert all(r["data_origin"] == "PUBLIC_REAL" for r in rows)


def test_well_index_class_counts_vary_per_well():
    """A per-well column that is constant would mean it was not computed per well."""
    with open(WELL_INDEX, newline="", encoding="utf-8") as fh:
        counts = {int(r["class_count"]) for r in csv.DictReader(fh)}
    assert len(counts) > 1, "class_count is identical for every well"
    assert min(counts) >= 1


def test_well_index_records_provenance_columns():
    with open(WELL_INDEX, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        header = set(reader.fieldnames or [])
    assert {"well", "source_id", "split", "min_md", "max_md", "thickness_m"} <= header
    assert {"rows_train", "rows_hidden_test", "rows_leaderboard_test_features"} <= header


# ---------------------------------------------------------------------------
# The markdown report must not drift from the JSON
# ---------------------------------------------------------------------------
def test_markdown_states_the_pinned_commit_and_counts(report: dict):
    text = REPORT_MD.read_text(encoding="utf-8")
    assert report["source"]["resolved_commit_sha"] in text
    assert f"{report['labelled_rows']['total']:,}" in text
    assert f"{report['wells']['count']}" in text
    for entry in report["tables"]["train"]["class_distribution"]:
        assert f"{entry['rows']:,}" in text, f"train class {entry['code']} missing from md"


def test_markdown_does_not_claim_work_was_done():
    # The report is hard-wrapped, so compare against collapsed whitespace.
    lowered = " ".join(REPORT_MD.read_text(encoding="utf-8").lower().split())
    assert "no dataset was built" in lowered
    assert "no model was trained" in lowered
    for phrase in ("random forest", "xgboost", "lightgbm", "pytorch", "cnn trained"):
        assert phrase not in lowered, f"report claims forbidden work: {phrase}"


# ---------------------------------------------------------------------------
# The Makefile must work on the platform it is run on
# ---------------------------------------------------------------------------
def test_makefile_selects_the_interpreter_per_platform():
    text = (REPO / "Makefile").read_text(encoding="utf-8")
    assert "ifeq ($(OS),Windows_NT)" in text, "no Windows branch in the Makefile"
    assert re.search(r"PY \?= python\b", text), "Windows branch must not require python3"
    assert re.search(r"PY \?= python3\b", text), "POSIX branch should keep python3"
    assert "PY := python3" not in text, (
        "a hard assignment overrides the command line, so `make PY=py` cannot work"
    )


def test_makefile_exposes_the_inspection_targets():
    text = (REPO / "Makefile").read_text(encoding="utf-8")
    assert "inspect-force2020:" in text
    assert "verify-force2020:" in text
    assert "scripts/ingest/inspect_force2020.py" in text


# ---------------------------------------------------------------------------
# Verification must be meaningful, and honest about what it ignores
# ---------------------------------------------------------------------------
def test_verify_ignores_only_checkout_dependent_fields(report: dict):
    volatile = set(report["verification"]["checkout_dependent_fields"])
    assert volatile, "no checkout-dependent fields declared"
    assert all(field.startswith("las.") for field in volatile), (
        f"a non-LAS field was excluded from verification: {volatile}"
    )
    assert "las.las_files_in_source_commit" not in volatile, (
        "the source-commit LAS count must be verified, not skipped"
    )


def test_verify_actually_reproduces_the_committed_report(report: dict):
    """Runs the real comparison. Skipped when the source checkout is absent."""
    if not (SOURCE_ROOT / ".git").exists():
        pytest.skip("FORCE 2020 checkout is not present; cannot re-verify")
    import subprocess

    result = subprocess.run(
        ["python", str(SCRIPT), "--verify"],
        capture_output=True, text=True, cwd=REPO, timeout=1800,
    )
    assert result.returncode == 0, (
        f"the committed report no longer matches the source:\n{result.stdout}"
        f"{result.stderr}"
    )
    assert "MATCH" in result.stdout
