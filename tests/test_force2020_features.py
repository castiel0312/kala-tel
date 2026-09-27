"""The FORCE 2020 feature-version stages: selection and versioned construction.

Two things are checked here that nothing else checks.

The first is that a curve reached a feature set through a measured gate rather
than by hand, and that the gate is reproducible from the committed inventory. A
feature set that cannot be re-derived is a feature set nobody can audit.

The second is that a local-context column means what its name says. That is not
hypothetical: the header order and the value order of the derived columns
disagreed by one nesting level twice while this was being built, and a table
whose header says `GR_W5_MEAN` while the value is a rolling standard deviation is
indistinguishable from a working one until you recompute it. The recomputation
below is the independent check, and it is the reason the local columns can be
trusted at all.

Nothing here trains a model or reads a label for a modelling decision.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]

INVENTORY_JSON = REPO / "reports" / "force2020_curve_inventory.json"
INVENTORY_MD = REPO / "reports" / "force2020_curve_inventory.md"
REGISTRY_JSON = REPO / "ml" / "force2020_feature_registry.json"

FEATURES_DIR = (
    REPO / "data" / "interim" / "ml" / "force2020_litho" / "features"
)


@pytest.fixture(scope="module")
def inventory() -> dict:
    return json.loads(INVENTORY_JSON.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def registry() -> dict:
    return json.loads(REGISTRY_JSON.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# The inventory covers everything the instruction asks to see
# ---------------------------------------------------------------------------
def test_every_source_curve_is_inventoried_on_every_split(inventory: dict):
    assert inventory["curve_count"] == 20
    names = {row["name"] for row in inventory["curves"]}
    assert len(names) == 20
    for row in inventory["curves"]:
        assert set(row["splits"]) == {"train", "hidden_test", "leaderboard_test"}
        for stat in row["splits"].values():
            # rows, wells, coverage, missing, sentinels, envelope and range
            for key in (
                "rows", "wells", "wells_with_data", "well_coverage_fraction",
                "non_null", "missing", "missing_fraction",
                "missing_via_sentinel", "finite_observed", "outside_envelope",
                "min", "median", "max",
            ):
                assert key in stat, f"{row['name']} split stat missing {key}"


def test_no_excluded_source_column_appears_as_a_curve(inventory: dict):
    names = {row["name"] for row in inventory["curves"]}
    for banned in (
        "DEPTH_MD", "X_LOC", "Y_LOC", "Z_LOC", "GROUP", "FORMATION",
        "FORCE_2020_LITHOFACIES_LITHOLOGY", "FORCE_2020_LITHOFACIES_CONFIDENCE",
    ):
        assert banned not in names


def test_the_registry_names_curves_and_the_builder_owns_column_names(registry: dict):
    for name, spec in registry["feature_sets"].items():
        assert "curves" in spec
        # Column names are derived by the builder, so the registry must not also
        # carry a second, competing spelling of them.
        assert "missing_masks" not in spec, name
        assert "columns" not in spec, name


def test_v0_2_is_a_strict_superset_of_v0_1(registry: dict):
    v01 = registry["feature_sets"]["v0.1"]["curves"]
    v02 = registry["feature_sets"]["v0.2"]["curves"]
    assert set(v01) < set(v02)
    assert v02[: len(v01)] == v01, "v0.1 curves must keep their leading position"


def test_every_rejected_curve_names_the_gate_that_rejected_it(registry: dict):
    rejected = registry["rejected"]
    assert rejected, "the selection rejected something, and must say why"
    for entry in rejected:
        assert entry["gate"] in {
            "G2_measurement_kind", "G3_evaluation_coverage",
        }
        assert entry["reason"]


def test_no_rejected_curve_reached_a_feature_set(registry: dict):
    blocked = {entry["curve"] for entry in registry["rejected"]}
    for spec in registry["feature_sets"].values():
        assert not (blocked & set(spec["curves"]))


def test_local_context_is_only_claimed_when_the_spacing_supports_it(
    registry: dict, inventory: dict,
):
    local = registry["local_context"]
    measured = local["measured"]
    if local["status"] == "supported":
        # A row window is a depth window only if the step is constant.
        assert measured["iqr_m"] == 0.0
        assert measured["strictly_increasing"] is True
        assert local["windows"]
        for window in local["windows"]:
            assert window["full_width_rows"] == 2 * window["half_width_rows"] + 1
    else:
        assert local["reason"]


# ---------------------------------------------------------------------------
# Versioned construction
# ---------------------------------------------------------------------------
def test_v0_1_artifacts_are_still_the_frozen_ones():
    assert (FEATURES_DIR / "force2020_litho_logs_v0_1.csv").is_file()
    assert (FEATURES_DIR / "force2020_litho_logs_v0_1.manifest.json").is_file()


@pytest.mark.parametrize("version", ["v0.2", "v0.3"])
def test_a_later_version_has_its_own_artifacts(version: str):
    stem = f"force2020_litho_logs_{version.replace('.', '_')}"
    for suffix in (".csv", ".manifest.json", ".exclusions.csv"):
        assert (FEATURES_DIR / f"{stem}{suffix}").is_file(), f"{stem}{suffix}"


def test_a_later_version_keeps_the_official_row_count_and_drops_nothing(
    registry: dict,
):
    v01 = json.loads(
        (FEATURES_DIR / "force2020_litho_logs_v0_1.manifest.json")
        .read_text(encoding="utf-8")
    )
    v02 = json.loads(
        (FEATURES_DIR / "force2020_litho_logs_v0_2.manifest.json")
        .read_text(encoding="utf-8")
    )
    v03 = json.loads(
        (FEATURES_DIR / "force2020_litho_logs_v0_3.manifest.json")
        .read_text(encoding="utf-8")
    )
    for manifest in (v02, v03):
        assert manifest["rows"] == v01["rows"]
        assert manifest["row_accounting"]["rows_excluded"] == 0
        assert manifest["split_summary"] == v01["split_summary"]


def test_no_built_version_contains_a_derived_column_v0_1_lacks(registry: dict):
    v01 = json.loads(
        (FEATURES_DIR / "force2020_litho_logs_v0_1.manifest.json")
        .read_text(encoding="utf-8")
    )
    v01_columns = set(v01["columns"])
    for version, spec in registry["feature_sets"].items():
        if version == "v0.1":
            continue
        manifest = json.loads(
            (FEATURES_DIR
             / f"force2020_litho_logs_{version.replace('.', '_')}.manifest.json")
            .read_text(encoding="utf-8")
        )
        columns = set(manifest["columns"])
        assert v01_columns <= columns, f"{version} dropped a v0.1 column"
        assert columns - v01_columns, f"{version} added nothing"


def test_depth_stays_out_of_every_feature_matrix(registry: dict):
    for version in registry["feature_sets"]:
        stem = f"force2020_litho_logs_{version.replace('.', '_')}"
        manifest = json.loads(
            (FEATURES_DIR / f"{stem}.manifest.json").read_text(encoding="utf-8")
        )
        matrix = manifest["feature_matrix_columns"]
        assert "DEPTH_MD" not in matrix, version
        for coordinate in ("X_LOC", "Y_LOC", "Z_LOC"):
            assert coordinate not in matrix, f"{version} leaked {coordinate}"
        for label_adjacent in ("GROUP", "FORMATION"):
            assert label_adjacent not in matrix, f"{version} leaked {label_adjacent}"


# ---------------------------------------------------------------------------
# Local context: the recomputation that makes the columns trustworthy
# ---------------------------------------------------------------------------
@pytest.mark.skipif(
    not (FEATURES_DIR / "force2020_litho_logs_v0_3.csv").is_file(),
    reason="v0.3 has not been built",
)
def test_local_context_columns_are_the_rolling_aggregate_they_are_named():
    """Recompute a sample of local columns from the raw curves in the same file.

    This is the check that would have caught the header/value ordering bug. It
    reads the table's own raw curve columns, so it is independent of the code
    that produced the derived ones.
    """
    import numpy as np
    import pandas as pd

    manifest = json.loads(
        (FEATURES_DIR / "force2020_litho_logs_v0_3.manifest.json")
        .read_text(encoding="utf-8")
    )
    curves = manifest["numeric_feature_columns"]
    half_widths = [5, 10]

    table = pd.read_csv(
        FEATURES_DIR / "force2020_litho_logs_v0_3.csv",
        sep=",", low_memory=False,
        usecols=["WELL", "DEPTH_MD", *curves,
                 *[f"{c}_W{h}_{s}" for h in half_widths
                   for s in ("MEAN", "STD") for c in curves]],
    )

    # Wells are contiguous in the table, so a window cannot have reached across
    # a well boundary. Asserted rather than assumed.
    blocks = int(table["WELL"].ne(table["WELL"].shift()).sum())
    assert blocks == table["WELL"].nunique()

    rng = np.random.default_rng(20260927)
    wells = table["WELL"].unique()
    checked = 0
    matched = 0
    withheld = 0
    for well in rng.choice(wells, size=3, replace=False):
        frame = table[table["WELL"] == well].reset_index(drop=True)
        rows = rng.choice(len(frame), size=40, replace=False)
        depths = frame["DEPTH_MD"].to_numpy()
        gaps = np.concatenate(([False], np.diff(depths) > 0.456))
        for index in rows:
            for half in half_widths:
                lo = max(0, index - half)
                hi = min(len(frame), index + half + 1)
                for curve in curves:
                    window = frame[curve].to_numpy()[lo:hi]
                    observed = window[~np.isnan(window)]
                    crosses_gap = bool(gaps[lo:hi].any())
                    # The builder's contract: a window needs at least two
                    # observed samples to describe a spread, and any window
                    # spanning a step larger than the gap tolerance is withheld
                    # rather than averaged across the hole. Both are deliberate;
                    # the recomputation below encodes the same two rules.
                    usable = len(observed) >= 2 and not crosses_gap
                    if usable:
                        mean = observed.mean()
                        # Population standard deviation, matching the builder.
                        # pandas' default is the sample form, which differs
                        # enough to fail this comparison and mean nothing.
                        std = float(
                            np.sqrt(((observed - mean) ** 2).sum() / len(observed))
                        )
                    for stat, value in (("MEAN", mean), ("STD", std)):
                        got = frame[f"{curve}_W{half}_{stat}"].iloc[index]
                        checked += 1
                        if usable:
                            assert not np.isnan(got), (
                                f"{curve}_W{half}_{stat} at row {index} of {well}: "
                                f"expected {value}, got missing"
                            )
                            assert abs(got - value) < 1e-4, (
                                f"{curve}_W{half}_{stat} at row {index} of "
                                f"{well}: expected {value}, got {got}"
                            )
                            matched += 1
                        else:
                            assert np.isnan(got), (
                                f"{curve}_W{half}_{stat} at row {index} of {well}: "
                                f"expected missing, got {got}"
                            )
                            withheld += 1
    # A run of samples that only ever checked the withheld branch would pass
    # while proving nothing, so require both outcomes to have been exercised.
    assert checked > 1000
    assert matched > 100
    assert withheld > 0


@pytest.mark.skipif(
    not (FEATURES_DIR / "force2020_litho_logs_v0_3.csv").is_file(),
    reason="v0.3 has not been built",
)
def test_local_context_never_crosses_a_well_boundary():
    """The first row of a well has a one-sided window, not a wrapped one.

    If a window had been allowed to reach the previous well, the first rows would
    carry a mean diluted by a different borehole. Checking row 0 of every well is
    the cheapest place that mistake would show.
    """
    import numpy as np
    import pandas as pd

    manifest = json.loads(
        (FEATURES_DIR / "force2020_litho_logs_v0_3.manifest.json")
        .read_text(encoding="utf-8")
    )
    curves = manifest["numeric_feature_columns"]
    table = pd.read_csv(
        FEATURES_DIR / "force2020_litho_logs_v0_3.csv",
        sep=",", low_memory=False,
        usecols=["WELL", *curves, *[f"{c}_W5_MEAN" for c in curves]],
    )
    firsts = table.groupby("WELL", sort=False).head(1)
    for curve in curves:
        # A one-sided window over 6 rows is a mean; over the whole file it would
        # not be. Assert the value equals the mean of that well's first 6 rows.
        for _, block in table.groupby("WELL", sort=False):
            head = block[curve].to_numpy()[:6]
            observed = head[~np.isnan(head)]
            got = block[f"{curve}_W5_MEAN"].iloc[0]
            if len(observed) >= 2:
                assert abs(got - observed.mean()) < 1e-4, curve
            else:
                assert np.isnan(got), curve
    assert len(firsts) == table["WELL"].nunique()
