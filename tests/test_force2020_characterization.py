"""Contract tests for the FORCE 2020 dataset characterization.

The characterization is a *measurement* stage, and these tests hold three
things still:

1. The measurements are internally consistent. Every count in the report is
   checked against another count in the report: non-null + missing = rows,
   per-split rows = the total, shares = 1, min <= median <= max, per-well
   counts = the global count. A report that is internally inconsistent is
   worse than no report, because it looks authoritative.
2. The proposal is derived, not chosen. The core feature set is read off the
   measured tiers, and a test recomputes the tiers from the declared
   thresholds. If someone hand-picks a feature set and re-runs, the test fails
   rather than quietly changing what "the proposal" means.
3. It stays a measurement. No model, no feature table, no filled value, and
   nothing written to the frozen or contract trees.

The tests read the committed artifacts rather than re-scanning 1.4M rows, so
they run in about a second. The one test that re-derives the report from the
source is marked slow and skips when the sparse checkout is absent.
"""
from __future__ import annotations

import ast
import csv
import json
import re
from collections import Counter
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "scripts" / "ingest" / "characterize_force2020.py"
REPORT_JSON = REPO / "reports" / "force2020_characterization.json"
REPORT_MD = REPO / "reports" / "force2020_characterization.md"
WELL_MISSINGNESS = REPO / "data" / "force2020_well_missingness.csv"
SOURCE_ROOT = REPO / "data" / "raw" / "force2020"
TRAIN_CSV = SOURCE_ROOT / "lithology_competition" / "data" / "extracted" / "train.csv"

# The 12 NPD lithofacies codes the source publishes, and nothing else.
FORCE2020_CODES = {
    "30000", "65030", "65000", "80000", "74000", "70000",
    "70032", "88000", "86000", "99000", "90000", "93000",
}

# The 20 log curves in the published CSVs.
CURVES = {
    "CALI", "BS", "ROPA", "ROP", "RDEP", "RSHA", "RMED", "DTS", "DTC",
    "NPHI", "PEF", "GR", "RHOB", "DRHO", "SGR", "SP", "MUDWEIGHT",
    "RMIC", "DCAL", "RXO",
}

STRUCTURAL = {
    "WELL", "DEPTH_MD", "X_LOC", "Y_LOC", "Z_LOC", "GROUP", "FORMATION",
    "FORCE_2020_LITHOFACIES_LITHOLOGY", "FORCE_2020_LITHOFACIES_CONFIDENCE",
}

# Facts established by the accepted inspection pass, which this report builds
# on. Re-asserted here so a change in the source would fail loudly here rather
# than silently redefine the baseline.
EXPECTED_ROWS = {
    "train": 1_170_511,
    "hidden_test": 122_397,
    "leaderboard_test_features": 136_786,
    "leaderboard_test_target": 136_786,
}
EXPECTED_WELLS = {
    "train": 98,
    "hidden_test": 10,
    "leaderboard_test_features": 10,
    "leaderboard_test_target": 10,
}
EXPECTED_CLASS_ROWS = {
    "65000": 720_803,
    "30000": 168_937,
    "65030": 150_455,
    "70000": 56_320,
    "80000": 33_329,
    "99000": 15_245,
    "70032": 10_513,
    "88000": 8_213,
    "90000": 3_820,
    "74000": 1_688,
    "86000": 1_085,
    "93000": 103,
}
EXPECTED_TRAIN_MISSING = {
    "CALI": 0.07508, "RSHA": 0.46122, "RMED": 0.03331, "RDEP": 0.00941,
    "RHOB": 0.13778, "GR": 0.0, "SGR": 0.94075, "NPHI": 0.34609,
    "PEF": 0.42615, "DTC": 0.06908, "SP": 0.26165, "BS": 0.41679,
    "ROP": 0.54287, "DTS": 0.85082, "DCAL": 0.74470, "DRHO": 0.15605,
    "MUDWEIGHT": 0.72990, "RMIC": 0.84950, "ROPA": 0.83569, "RXO": 0.72027,
}

LABELLED_SPLITS = ("train", "hidden_test", "leaderboard_test_target")


@pytest.fixture(scope="module")
def report() -> dict:
    assert REPORT_JSON.is_file(), (
        f"{REPORT_JSON.name} is missing; run "
        "`python scripts/ingest/characterize_force2020.py`"
    )
    return json.loads(REPORT_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def curves(report: dict) -> dict:
    return {c["name"]: c for c in report["curve_table"]["curves"]}


@pytest.fixture(scope="module")
def classes(report: dict) -> dict:
    return {c["code"]: c for c in report["class_table"]["classes"]}


# ---------------------------------------------------------------------------
# It must stay a measurement
# ---------------------------------------------------------------------------
def test_script_takes_no_ml_or_dataframe_dependency():
    """Profiling a CSV must not make the base install acquire an ML stack."""
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    banned = {"numpy", "pandas", "torch", "sklearn", "lightgbm", "xgboost", "scipy"}
    assert not (imported & banned), f"characterization imports {imported & banned}"


def test_script_contains_no_model_or_transform_calls():
    """No fitting, no imputation, no windowing. Read it, don't trust the prose."""
    source = SCRIPT.read_text(encoding="utf-8")
    tree = ast.parse(source)
    called: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name):
                called.add(func.id)
            elif isinstance(func, ast.Attribute):
                called.add(func.attr)
    banned = {
        "fit", "fit_transform", "predict", "train", "train_test_split",
        "impute", "interpolate", "ffill", "bfill", "rolling", "ewm",
        "resample", "StandardScaler", "MinMaxScaler", "dropna", "fillna",
    }
    assert not (called & banned), f"characterization calls {called & banned}"


def test_script_writes_nothing_into_the_frozen_or_contract_trees():
    """Every output path is a report or a data/ CSV, never processed/ or ml/."""
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    forbidden = {"processed", "ml", "interim"}
    written: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if node.func.attr == "write_text":
                for arg in node.args:
                    if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                        written.append(arg.value)
    joined = " ".join(written)
    for name in forbidden:
        assert f"{name}{'/'}" not in joined.replace("\\", "/"), (
            f"characterization writes into a protected tree: {written}"
        )


def test_report_declares_what_it_did_not_do(report: dict):
    joined = " ".join(report["not_performed"]).lower()
    for claim in (
        "no model",
        "no feature table",
        "no value was imputed",
        "no window",
        "no force 2020 label was mapped",
        "no write to data/processed/ or data/ml/",
        "no new dataset was downloaded",
    ):
        assert claim in joined, f"report omits the claim: {claim!r}"


def test_canonical_lithology_is_untouched():
    """The frozen canonical taxonomy must not have absorbed FORCE classes."""
    path = REPO / "data" / "processed" / "lithology.csv"
    if not path.is_file():
        pytest.skip("canonical lithology.csv is not present in this checkout")
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        assert "lithology_group" in (reader.fieldnames or [])
        for row in reader:
            assert not (row.get("lithology_group") or "").strip(), (
                "lithology_group is no longer all null; a FORCE or Utah code "
                "may have been poured into the frozen canonical file"
            )


# ---------------------------------------------------------------------------
# Counts: every number must agree with another number
# ---------------------------------------------------------------------------
def test_row_counts_match_the_inspected_source(report: dict):
    counts = report["proposed_ml_row_schema"]["row_counts"]
    assert counts == EXPECTED_ROWS


def test_labelled_rows_are_the_sum_of_the_three_labelled_splits(report: dict):
    total = report["class_table"]["labelled_rows_total"]
    assert total == sum(EXPECTED_ROWS[s] for s in LABELLED_SPLITS)
    assert total == 1_429_694


def test_class_rows_match_the_inspected_source(classes: dict):
    assert set(classes) == FORCE2020_CODES
    for code, expected in EXPECTED_CLASS_ROWS.items():
        train = classes[code]["rows_by_split"]["train"]
        assert train == expected, f"class {code} train rows {train} != {expected}"


def test_class_rows_sum_to_the_labelled_total(classes: dict):
    total = sum(c["rows"] for c in classes.values())
    assert total == sum(EXPECTED_ROWS[s] for s in LABELLED_SPLITS)


def test_class_shares_sum_to_one(classes: dict):
    assert sum(c["share_of_labelled"] for c in classes.values()) == pytest.approx(1.0, abs=1e-6)


def test_class_rows_by_split_sum_to_each_class_total(classes: dict):
    for code, c in classes.items():
        per_split = sum(c["rows_by_split"][s] for s in LABELLED_SPLITS)
        assert per_split == c["rows"], f"class {code} split rows disagree"


def test_class_wells_by_split_never_exceed_the_split_well_count(classes: dict):
    for code, c in classes.items():
        for split, wells in c["wells_by_split"].items():
            limit = EXPECTED_WELLS[split]
            assert wells <= limit, f"class {code} claims {wells} {split} wells > {limit}"


def test_class_well_counts_are_not_all_zero(classes: dict):
    """Guards the specific bug where per-well class membership went missing."""
    for code, c in classes.items():
        assert c["rows"] > 0, f"class {code} has no rows"
        assert c["wells"] >= 1, f"class {code} claims no wells despite having rows"


def test_class_depth_span_brackets_its_own_rows(classes: dict):
    for code, c in classes.items():
        assert c["min_md"] is not None and c["max_md"] is not None, code
        assert c["min_md"] <= c["max_md"], code
        assert c["thickness_m"] == pytest.approx(
            c["max_md"] - c["min_md"], abs=1e-3
        ), code


def test_no_class_is_absent_from_train(classes: dict):
    """Every class has train rows, so a train-only baseline is definable."""
    absent = [code for code, c in classes.items() if c["rows_by_split"]["train"] == 0]
    assert absent == [], f"classes absent from train: {absent}"


# ---------------------------------------------------------------------------
# Curves
# ---------------------------------------------------------------------------
def test_the_twenty_curves_are_the_source_curves(curves: dict):
    assert set(curves) == CURVES
    assert len(curves) == 20


def test_curve_counts_reconcile_against_train_rows(curves: dict, report: dict):
    train_rows = report["curve_table"]["train_rows"]
    assert train_rows == EXPECTED_ROWS["train"]
    for name, c in curves.items():
        assert c["non_null"] + c["missing"] == train_rows, f"{name} does not reconcile"
        assert c["missing_via_sentinel"] <= c["missing"]


def test_curve_missing_fractions_match_the_inspected_source(curves: dict):
    for name, expected in EXPECTED_TRAIN_MISSING.items():
        got = curves[name]["missing_fraction"]
        assert got == pytest.approx(expected, abs=5e-5), (
            f"{name} missing_fraction {got} != {expected}"
        )


def test_curve_ordering_statistics_are_monotonic(curves: dict):
    for name, c in curves.items():
        lo, mid, hi = c["min"], c["median"], c["max"]
        assert lo is not None and mid is not None and hi is not None, name
        assert lo <= mid <= hi, f"{name}: {lo} <= {mid} <= {hi} violated"


def test_curve_well_coverage_is_consistent_with_missingness(curves: dict):
    for name, c in curves.items():
        assert 0 <= c["wells_with_data"] <= c["train_well_count"]
        if c["missing_fraction"] == 0:
            assert c["wells_with_data"] == c["train_well_count"], name
        if c["well_coverage_fraction"] == 1.0:
            assert c["missing_fraction"] < 1.0, name


def test_fully_missing_wells_plus_partial_never_exceeds_well_count(curves: dict):
    for name, c in curves.items():
        covered = c["wells_with_data"]
        partial = c["wells_partially_missing"]
        assert partial <= covered, (
            f"{name}: {partial} partially-missing wells exceeds {covered} wells "
            "with data; a well cannot lose part of a curve it does not have"
        )


def test_curves_with_no_missing_rows_are_guaranteed_columns(curves: dict):
    """The source guarantees WELL, DEPTH_MD and GR on every row of every well."""
    complete = {n for n, c in curves.items() if c["missing"] == 0}
    assert "GR" in complete, "GR is guaranteed by the source and must be complete"
    assert complete <= {"GR"}, f"unexpected fully complete curves: {complete - {'GR'}}"


def test_no_sentinel_cell_survives_in_the_published_csvs(curves: dict, report: dict):
    """The LAS NULL convention does not leak into the CSVs.

    The source LAS uses NULL = -999.25. The published CSVs do not: a missing
    value is an empty field, and no cell equals a known sentinel. That was
    measured, not assumed, and it is why the missing counts and the
    sentinel counts are reported as separate columns. A regression here would
    mean a real -999.25 was being fed to a statistic as if it were a
    measurement, which is the failure this report exists to prevent.
    """
    survivors = {n: c["missing_via_sentinel"] for n, c in curves.items()
                 if c["missing_via_sentinel"] > 0}
    assert survivors == {}, f"sentinel cells appeared in the CSVs: {survivors}"
    assert report["missingness"]["sentinel_cells_in_published_csvs"] == 0
    assert "empty CSV field" in report["missingness"]["basis"]


# ---------------------------------------------------------------------------
# The proposal must be derived, not chosen
# ---------------------------------------------------------------------------
def test_core_feature_set_is_exactly_the_curves_clearing_the_thresholds(
    curves: dict, report: dict
):
    """Recompute the tiers from the declared thresholds and demand agreement."""
    th = report["curve_table"]["thresholds"]
    expected_core = sorted(
        name for name, c in curves.items()
        if c["well_coverage_fraction"] >= th["core_min_well_coverage"]
        and c["missing_fraction"] <= th["core_max_missing_fraction"]
    )
    fs = report["proposed_feature_set"]
    assert sorted(fs["core_features"]) == expected_core, (
        "the core feature set is not the set the stated thresholds produce; "
        "either the thresholds or the set was changed by hand"
    )
    assert fs["core_feature_count"] == len(expected_core)


def test_every_curve_lands_in_exactly_one_tier(curves: dict, report: dict):
    fs = report["proposed_feature_set"]
    listed = (
        list(fs["core_features"])
        + list(fs["masked_candidates"])
        + list(fs["sparse_candidates"])
    )
    assert sorted(listed) == sorted(CURVES), (
        "the three candidate lists must partition the 20 curves"
    )
    assert len(listed) == len(set(listed)), "a curve appears in two tiers"


def test_feature_set_is_logs_only(curves: dict, report: dict):
    """No depth, no stratigraphy, no coordinates, no label, no well id."""
    fs = report["proposed_feature_set"]
    every = (
        list(fs["core_features"]) + list(fs["masked_candidates"])
        + list(fs["sparse_candidates"])
    )
    for name in every:
        assert name in CURVES, f"{name} is not one of the 20 log curves"
        assert name not in STRUCTURAL
    assert "DEPTH_MD" not in every
    assert "GROUP" not in every and "FORMATION" not in every
    for held in ("DEPTH_MD", "WELL", "X_LOC", "Y_LOC", "Z_LOC", "GROUP",
                 "FORMATION", "FORCE_2020_LITHOFACIES_LITHOLOGY",
                 "FORCE_2020_LITHOFACIES_CONFIDENCE"):
        assert held in fs["held_out"], f"{held} is not accounted for as held out"


def test_feature_set_evidence_matches_the_curve_table(curves: dict, report: dict):
    fs = report["proposed_feature_set"]
    pairs = (
        ("core_features", "core_evidence"),
        ("masked_candidates", "masked_evidence"),
        ("sparse_candidates", "sparse_evidence"),
    )
    for list_key, evidence_key in pairs:
        assert set(fs[evidence_key]) == set(fs[list_key]), (
            f"{evidence_key} does not describe the curves in {list_key}"
        )
        for name, ev in fs[evidence_key].items():
            assert ev["wells_with_data"] == curves[name]["wells_with_data"]
            assert ev["missing_fraction"] == curves[name]["missing_fraction"]


def test_held_out_reasons_are_given_for_every_structural_column(report: dict):
    fs = report["proposed_feature_set"]
    assert set(fs["held_out"]) == STRUCTURAL, (
        "every structural column needs a stated reason for exclusion"
    )
    for column, reason in fs["held_out"].items():
        assert reason.strip(), f"{column} is held out with no reason"


def test_column_roles_cover_every_published_column(report: dict):
    roles = report["column_roles"]
    names = [c["name"] for c in roles["columns"]]
    assert sorted(names) == sorted(STRUCTURAL | CURVES)
    assert len(names) == 29, "the source header has 29 columns"
    by_name = {c["name"]: c for c in roles["columns"]}
    assert by_name["WELL"]["role"] == "identifier"
    assert by_name["DEPTH_MD"]["role"] == "depth"
    assert by_name["FORCE_2020_LITHOFACIES_LITHOLOGY"]["role"] == "target"
    assert by_name["FORCE_2020_LITHOFACIES_CONFIDENCE"]["role"] == "target_metadata"
    for name in CURVES:
        assert by_name[name]["role"] == "log_curve"


# ---------------------------------------------------------------------------
# Split
# ---------------------------------------------------------------------------
def test_split_is_well_disjoint_and_matches_the_inspected_counts(report: dict):
    sp = report["split"]
    assert sp["disjoint"], f"wells in multiple splits: {sp['wells_in_multiple_splits']}"
    assert sp["wells_in_multiple_splits"] == {}
    assert sp["train_wells"] == EXPECTED_WELLS["train"]
    assert sp["hidden_test_wells"] == EXPECTED_WELLS["hidden_test"]
    assert sp["leaderboard_wells"] == EXPECTED_WELLS["leaderboard_test_features"]
    assert sp["leaderboard_target_wells"] == EXPECTED_WELLS["leaderboard_test_target"]
    assert sp["total_wells"] == 118
    assert sp["counts_match_expectation"]
    assert sp["leaderboard_features_and_target_agree"]


def test_every_well_is_assigned_to_exactly_one_split(report: dict):
    sp = report["split"]
    assert len(sp["split_by_well"]) == 118
    assert set(sp["split_by_well"].values()) == {
        "train", "hidden_test", "leaderboard_test_features"
    }


# ---------------------------------------------------------------------------
# Missingness
# ---------------------------------------------------------------------------
def test_per_well_missing_counts_reconcile_with_the_global_counts(
    report: dict, curves: dict
):
    """Train per-well counts must sum to the train global count, exactly.

    The curve table is measured on train.csv only, so only the train wells are
    comparable. The other splits are checked separately by asserting their own
    rows are present and disjoint.
    """
    counts = report["missingness"]["per_well_missing_counts"]
    assert counts, "per-well missing counts were not collected"
    totals: dict[str, int] = {}
    splits = Counter(r["split"] for r in counts.values())
    for record in counts.values():
        if record["split"] != "train":
            continue
        for curve, n in record["missing"].items():
            totals[curve] = totals.get(curve, 0) + n
    assert totals, "no train wells in the per-well missingness table"
    for name, total in totals.items():
        assert total == curves[name]["missing"], (
            f"{name}: train per-well counts sum to {total} but the global "
            f"train missing count is {curves[name]['missing']}"
        )
    assert splits["train"] == EXPECTED_WELLS["train"]
    assert splits["hidden_test"] == EXPECTED_WELLS["hidden_test"]
    assert splits["leaderboard_test_features"] == EXPECTED_WELLS[
        "leaderboard_test_features"
    ]
    assert sum(splits.values()) == 118


def test_per_well_missing_counts_cover_all_twenty_curves(report: dict):
    for well, record in report["missingness"]["per_well_missing_counts"].items():
        assert set(record["missing"]) == CURVES, f"{well} is missing curve columns"


def test_per_well_counts_are_bounded_by_each_wells_own_rows(report: dict):
    for well, record in report["missingness"]["per_well_missing_counts"].items():
        for curve, n in record["missing"].items():
            assert 0 <= n <= record["rows"], f"{well}/{curve}: {n} of {record['rows']}"


def test_per_well_missing_range_is_ordered(report: dict):
    for row in report["missingness"]["per_well_missing_range_by_curve"]:
        lo, mid, hi = row["min"], row["median"], row["max"]
        assert lo is not None and mid is not None and hi is not None, row["name"]
        assert 0.0 <= lo <= mid <= hi <= 1.0, row["name"]


def test_no_value_was_filled_anywhere_in_the_report(report: dict, curves: dict):
    """A filled curve would show as missing == 0 while the source disagrees."""
    for name, expected in EXPECTED_TRAIN_MISSING.items():
        if expected > 0:
            assert curves[name]["missing"] > 0, (
                f"{name} reports no missing rows but the source has "
                f"{expected:.2%}; something was filled"
            )


# ---------------------------------------------------------------------------
# Imbalance
# ---------------------------------------------------------------------------
def test_imbalance_matches_the_class_table(report: dict, classes: dict):
    imb = report["imbalance"]
    assert imb["labelled_rows_total"] == report["class_table"]["labelled_rows_total"]
    assert imb["largest_class"]["rows"] == max(c["rows"] for c in classes.values())
    assert imb["smallest_class"]["rows"] == min(c["rows"] for c in classes.values())
    assert imb["imbalance_ratio_largest_to_smallest"] == pytest.approx(
        imb["largest_class"]["rows"] / imb["smallest_class"]["rows"], abs=0.05
    )
    assert len(imb["cumulative_share_by_rank"]) == len(classes)
    assert imb["cumulative_share_by_rank"][-1]["cumulative_share"] == pytest.approx(
        1.0, abs=1e-6
    )


def test_single_well_classes_are_reported_as_a_concern(report: dict, classes: dict):
    """Basement sits in one well, so its per-class score is undefined."""
    single = {code for code, c in classes.items() if c["wells"] == 1}
    assert single, "the source is known to have a one-well class"
    concern_ids = {c["id"] for c in report["data_quality_concerns"]}
    assert "DQ_SINGLE_WELL_CLASSES" in concern_ids
    detail = next(
        c["detail"] for c in report["data_quality_concerns"]
        if c["id"] == "DQ_SINGLE_WELL_CLASSES"
    )
    for code in single:
        assert code in detail, f"concern does not name the class {code}"


def test_rare_class_findings_are_consistent_with_the_class_table(
    report: dict, classes: dict
):
    imb = report["imbalance"]
    below = {c["code"] for c in imb["classes_below_1_percent_of_rows"]}
    assert below == {
        code for code, c in classes.items() if c["share_of_labelled"] < 0.01
    }
    few_wells = {c["code"] for c in imb["classes_in_three_or_fewer_wells"]}
    assert few_wells == {code for code, c in classes.items() if c["wells"] <= 3}


# ---------------------------------------------------------------------------
# Concerns
# ---------------------------------------------------------------------------
def test_location_columns_are_measured_as_depth_proxies(report: dict):
    """The coordinates are NOT well-level, and that was measured, not assumed.

    An earlier draft of the inspection asserted the location columns were
    constant within a well. They are not: they track the borehole trajectory.
    The test pins the measured behaviour so the old, wrong claim cannot come
    back, and so the reason for excluding them stays accurate.
    """
    constancy = report["column_roles"]["location_constancy_measured_on_train"]
    assert set(constancy) == {"X_LOC", "Y_LOC", "Z_LOC"}
    for name, c in constancy.items():
        assert c["wells_with_any_value"] == EXPECTED_WELLS["train"], (
            f"{name} has a value in only {c['wells_with_any_value']} wells"
        )
        assert c["wells_varying_within_well"] > 0, (
            f"{name} is constant in every well; if that has become true the "
            "exclusion reason and the concern both need rewriting"
        )
        assert c["within_well_spread_max_m"] > c["within_well_spread_min_m"]
        assert c["within_well_spread_median_m"] is not None
    # Z_LOC is the source's own signed depth column: it varies everywhere.
    assert constancy["Z_LOC"]["wells_varying_within_well"] == EXPECTED_WELLS["train"]


def test_coordinate_exclusion_reason_does_not_claim_constancy(report: dict):
    """The stated reason must match the measurement, or it misleads the reader."""
    held = report["proposed_feature_set"]["held_out"]
    for name in ("X_LOC", "Y_LOC", "Z_LOC"):
        reason = held[name].lower()
        assert "constant within a well" not in reason, (
            f"{name} is excluded with a stale 'constant within a well' reason"
        )
    concern = next(
        c for c in report["data_quality_concerns"]
        if c["id"] == "DQ_COORDINATES_TRACK_TRAJECTORY"
    )
    assert concern["severity"] in {"low", "medium", "high"}
    assert "trajectory" in concern["detail"]


def test_data_quality_concerns_are_unique_and_measured(report: dict):
    concerns = report["data_quality_concerns"]
    ids = [c["id"] for c in concerns]
    assert len(ids) == len(set(ids)), "a concern id is duplicated"
    for c in concerns:
        assert c["severity"] in {"low", "medium", "high"}
        assert len(c["detail"]) > 40, f"{c['id']} has no substantive detail"
        assert any(ch.isdigit() for ch in c["detail"]), (
            f"{c['id']} asserts a concern without quoting a measurement"
        )


def test_label_adjacent_stratigraphy_is_flagged_with_a_measurement(report: dict):
    """The highest-severity concern in this dataset is the leakage risk."""
    concerns = {c["id"]: c for c in report["data_quality_concerns"]}
    assert "DQ_LABEL_ADJACENT_STRATIGRAPHY" in concerns
    for required in ("DQ_LAS_CARRIES_LABELS", "DQ_SINGLE_WELL_CLASSES",
                     "DQ_PARTIAL_CURVE_GAPS", "DQ_COORDINATES_TRACK_TRAJECTORY"):
        assert required in concerns, f"the report dropped the concern {required}"


def test_label_adjacent_stratigraphy_concern_quotes_measured_cardinality(report: dict):
    """A leakage claim is only credible if it says how coarse the leak is."""
    concern = next(
        c for c in report["data_quality_concerns"]
        if c["id"] == "DQ_LABEL_ADJACENT_STRATIGRAPHY"
    )
    assert concern["severity"] == "high"
    detail = concern["detail"]
    assert "GROUP" in detail and "FORMATION" in detail
    for token in ("distinct", "block"):
        assert token in detail, f"the concern does not mention {token!r}"
    assert any(ch.isdigit() for ch in detail), (
        "the leakage concern quotes no measured cardinality"
    )


# ---------------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------------
def test_source_is_pinned_and_licensed(report: dict):
    src = report["source"]
    assert src["source_id"] == "FORCE2020"
    assert len(src["resolved_commit_sha"]) == 40
    assert src["archive_doi"] == "10.5281/zenodo.4351156"
    assert src["licence"] == "CC-BY-4.0"
    assert "NLOD" in src["licence_upstream"]
    assert "no dataset-level LICENSE" in src["licence_gap"]
    assert src["las_in_source_commit"] == 118


def test_characterization_is_scoped_as_external_and_read_only(report: dict):
    assert report["canonical_dataset_version_untouched"] == "nwis-forge16b-v0.2"
    assert "read-only" in report["scope"]
    assert "no model stage entered" in report["stage"]


def test_row_schema_key_is_justified_by_measurement(report: dict):
    schema = report["proposed_ml_row_schema"]
    assert schema["key"] == ["WELL", "DEPTH_MD"]
    assert schema["key_is_unique_in_source"]
    assert "strictly increasing" in schema["key_uniqueness_argument"]
    names = [c["name"] for c in schema["columns"]]
    for required in ("SPLIT", "SOURCE_ID", "SOURCE_COMMIT", "LABELLED"):
        assert required in names, f"the row schema omits {required}"


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------
def test_all_three_artifacts_exist():
    for path in (REPORT_JSON, REPORT_MD, WELL_MISSINGNESS):
        assert path.is_file(), f"{path} is missing"


def test_well_missingness_csv_has_one_row_per_well_with_all_twenty_curves():
    with open(WELL_MISSINGNESS, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        curve_cols = [c for c in (reader.fieldnames or [])
                      if c not in {"well", "rows", "split", "source_file"}]
        assert set(curve_cols) == CURVES
        assert len(curve_cols) == 20
        rows = list(reader)
    assert len(rows) == 118
    assert len({r["well"] for r in rows}) == 118
    for r in rows:
        assert r["split"] in {"train", "hidden_test", "leaderboard_test_features"}
        assert int(r["rows"]) > 0
        for c in curve_cols:
            assert 0 <= int(r[c]) <= int(r["rows"]), f"{r['well']}/{c}"


def test_well_missingness_csv_agrees_with_the_report(report: dict):
    with open(WELL_MISSINGNESS, newline="", encoding="utf-8") as fh:
        rows = {r["well"]: r for r in csv.DictReader(fh)}
    counts = report["missingness"]["per_well_missing_counts"]
    assert set(rows) == set(counts)
    for well, record in counts.items():
        assert int(rows[well]["rows"]) == record["rows"]
        assert rows[well]["split"] == record["split"]
        for curve, n in record["missing"].items():
            assert int(rows[well][curve]) == n, f"{well}/{curve}"


def test_markdown_states_the_scope_and_the_derivation(report: dict):
    md = REPORT_MD.read_text(encoding="utf-8")
    assert report["source"]["resolved_commit_sha"] in md
    assert "no model was trained" in md.lower()
    for heading in (
        "## 1. Target classes",
        "## 2. Log curves",
        "## 3. Column roles",
        "## 4. Well-level split",
        "## 5. Class imbalance",
        "## 6. Missingness",
        "## 7. Proposed initial feature set",
        "## 8. Proposed canonical ML row schema",
        "## 9. Data-quality concerns",
        "## 10. Not performed at this stage",
    ):
        assert heading in md, f"markdown is missing the section {heading!r}"


def test_markdown_tables_have_no_unescaped_pipes_in_cells():
    """A stray pipe silently creates a column and the table starts lying.

    Each markdown table is a run of consecutive '|' lines, so the check is per
    block: within a block every row must have the same cell count as its header.
    Different tables legitimately have different widths.
    """
    md = REPORT_MD.read_text(encoding="utf-8")
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in md.splitlines():
        if line.startswith("|"):
            current.append(line)
        elif current:
            blocks.append(current)
            current = []
    if current:
        blocks.append(current)
    assert blocks, "no markdown tables found"

    def cells(line: str) -> list[str]:
        return re.split(r"(?<!\\)\|", line)

    for block in blocks:
        table = [ln for ln in block if ln.startswith("|")]
        if len(table) < 2:
            continue
        width = len(cells(table[0]))
        for ln in table:
            assert len(cells(ln)) == width, (
                f"markdown table row has {len(cells(ln))} cells, header has "
                f"{width}; an unescaped '|' is in: {ln[:90]}"
            )


def test_makefile_exposes_the_characterization_targets():
    text = (REPO / "Makefile").read_text(encoding="utf-8")
    assert "characterize-force2020:" in text
    assert "verify-force2020-characterization:" in text
    assert "scripts/ingest/characterize_force2020.py --print-summary" in text
    assert "scripts/ingest/characterize_force2020.py --verify" in text
    # The new script must be inside the enforced lint scope, or it is
    # unlinted by default and can rot.
    lint_line = next(
        ln for ln in text.splitlines()
        if ln.strip().startswith("$(PY) -m ruff check")
    )
    assert "scripts/ingest/characterize_force2020.py" in lint_line


def test_slow_marker_is_registered():
    """An unregistered marker makes -m filtering silently match nothing."""
    text = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    assert "markers" in text
    assert "slow:" in text


@pytest.mark.slow
def test_verify_reproduces_the_committed_artifacts():
    """Rebuild from the source and demand all three artifacts match."""
    if not TRAIN_CSV.is_file():
        pytest.skip("FORCE 2020 train.csv is not present in this checkout")
    import subprocess
    result = subprocess.run(
        ["python", str(SCRIPT), "--verify"],
        cwd=REPO, capture_output=True, text=True, timeout=1800,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "MISMATCH" not in result.stdout
    assert result.stdout.count("MATCH") >= 4
