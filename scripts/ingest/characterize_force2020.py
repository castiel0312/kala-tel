#!/usr/bin/env python3
"""FORCE 2020 dataset characterization. Read-only.

This is the second half of the inspection stage: the first pass established
*what* the source contains, this one measures *what the values look like* so
that a feature set can be proposed from evidence rather than assumption.

Everything here is measured from the bytes at the pinned commit. Nothing is
repaired, filled, interpolated or resampled: a missing curve is reported as
missing, and a sentinel is reported as a sentinel. Standard library only, so
the base install does not acquire an ML stack it does not use.

What it produces:

  * the 12-class target table: rows, share of all labelled rows, well count and
    the depth interval the class occupies
  * the 20-curve table: units, non-null/missing counts, well coverage, and
    min / median / max
  * a column-role map, so nobody has to guess which columns are identifiers
  * a verified well-level split, including the proof that no WELL appears in
    two splits
  * class imbalance and missingness analysis, both descriptive only
  * a proposed logs-only initial feature set, with the data-based reason for
    every include and every exclude
  * a proposed canonical ML row schema
  * data-quality concerns, each one measured rather than asserted

Deliberately NOT done, and asserted by tests/test_force2020_characterization.py:
  * no model of any kind is trained, fitted, tuned or compared
  * no feature table, label table or model artifact is written
  * no value is imputed, interpolated, smoothed, rolled or windowed
  * nothing is written to data/processed/ or data/ml/
  * no FORCE label is mapped onto any canonical vocabulary

Usage:
    python scripts/ingest/characterize_force2020.py
    python scripts/ingest/characterize_force2020.py --print-summary
    python scripts/ingest/characterize_force2020.py --verify
"""
from __future__ import annotations

import argparse
import array
import csv
import io
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

# The class vocabulary, curve units and source layout have exactly one home, in
# the inspection pass. Importing rather than copying keeps the two reports from
# disagreeing about what the source contains. LITHOFACIES is the source's own
# NPD codes and has nothing to do with the canonical FORGE_UTAH_16B vocabulary.
from inspect_force2020 import (  # noqa: E402
    AUXILIARY_TARGET_COLUMNS,
    CURVE_UNITS,
    DATA_SUBDIR,
    DELIMITER,
    LITHOFACIES,
    LOCATION_COLUMNS,
    TARGET_COLUMNS,
    git_tree_index,
    las_inventory,
    resolved_commit,
)
from nwis_lib import REPORTS, is_sentinel  # noqa: E402

# ---------------------------------------------------------------------------
# Column roles
#
# The source header has 29 columns: 9 structural/label columns and 20 log
# curves. Their role is a reading of the source's own documentation plus the
# header contents, not a guess: WELL repeats per row within a well, DEPTH_MD
# increases, GROUP/FORMATION repeat in contiguous depth blocks, and the two
# FORCE_2020_* columns take 12 and 3 distinct values.
# ---------------------------------------------------------------------------
ROLE_IDENTIFIER = "identifier"
ROLE_DEPTH = "depth"
ROLE_COORDINATE = "coordinate"
ROLE_TARGET = "target"
ROLE_TARGET_METADATA = "target_metadata"
ROLE_STRATIGRAPHY = "stratigraphy"
ROLE_LOG_CURVE = "log_curve"

COLUMN_ROLES: dict[str, tuple[str, str]] = {
    "WELL": (ROLE_IDENTIFIER,
             "NPD well name, e.g. '32/2-1' (field/block/well). The join key "
             "across the CSVs, the LAS UWI and the well index. Constant within "
             "a well, so it is a grouping key, never a feature."),
    "DEPTH_MD": (ROLE_DEPTH,
                 "Measured depth along the hole, metres. Strictly increasing "
                 "within every well. Held out of the feature set so a "
                 "depth-ablation experiment stays possible."),
    "X_LOC": (ROLE_COORDINATE,
              "Easting, UTM. Measured, not assumed: it is constant within only "
              "a few wells and drifts with depth in the rest, because it tracks "
              "the borehole trajectory as the bit drills away from the "
              "wellhead. A property of the hole, not of the rock."),
    "Y_LOC": (ROLE_COORDINATE, "Northing, UTM. Varies with depth like X_LOC."),
    "Z_LOC": (ROLE_COORDINATE,
              "The source's own signed depth column, negative downwards, and it "
              "varies in every well. It is not TVD paired with X/Y and not "
              "measured depth, but it is a depth proxy, which is why it is held "
              "out of the feature set."),
    "GROUP": (ROLE_STRATIGRAPHY,
              "NPD lithostratigraphic group. Constant in depth blocks, and "
              "assigned by the same interpretation campaign that produced the "
              "label, so it is label-adjacent. Excluded from a logs-only "
              "baseline."),
    "FORMATION": (ROLE_STRATIGRAPHY,
                  "NPD lithostratigraphic formation, a refinement of GROUP. "
                  "Label-adjacent on the same grounds. Excluded from a "
                  "logs-only baseline."),
    "FORCE_2020_LITHOFACIES_LITHOLOGY": (
        ROLE_TARGET,
        "The supervised target: NPD lithostratigraphic lithofacies, one of 12 "
        "codes. Never a feature."),
    "FORCE_2020_LITHOFACIES_CONFIDENCE": (
        ROLE_TARGET_METADATA,
        "Organizer confidence in the interpretation: 1 high, 2 medium, 3 low. "
        "A property of the label, so it is not a feature either. It is a "
        "weighting hint for a future loss, not an input."),
}

LOG_CURVES: tuple[str, ...] = tuple(CURVE_UNITS)

# The one LAS file in the sparse checkout names 14 of these 20 curves. The units
# of the remaining 6 were transcribed by the inspection pass from the source's
# own documentation rather than from a locally parsed ~Curve header, and ROPA
# carries no unit in the source at all. Naming them lets the report say so,
# instead of letting a full unit column imply every unit was read off a header.
UNITS_NOT_VERIFIED_FROM_LOCAL_LAS: tuple[str, ...] = (
    "DCAL", "MUDWEIGHT", "RMIC", "RXO", "SGR", "SP",
)

# ---------------------------------------------------------------------------
# Availability thresholds for the proposed first feature set
#
# These are stated as constants with their reasoning, because a feature-set
# proposal that cannot be re-derived from a threshold is just an opinion. They
# describe DATA availability only. They say nothing about which model is better.
# ---------------------------------------------------------------------------

# A curve is core when it is present in nearly every well and almost never null.
# At this level a missing value is a real gap in the log, not a structural
# absence, so a first baseline can use it without a masking decision.
CORE_MIN_WELL_COVERAGE = 0.80
CORE_MAX_MISSING_FRACTION = 0.10

# A curve is masked when it is genuinely logged in a minority of wells. It is
# usable, but only with an explicit availability mask and a stated decision, so
# it is not in the *initial* set and is not silently dropped either.
MASKED_MIN_WELL_COVERAGE = 0.25
MASKED_MAX_MISSING_FRACTION = 0.90

BASELINE_TIER_CORE = "core"
BASELINE_TIER_MASKED = "masked"
BASELINE_TIER_SPARSE = "sparse"

NOT_PERFORMED = [
    "no model of any kind was trained, fitted, tuned, evaluated or compared",
    "no feature table, label table, checkpoint or model artifact was written",
    "no value was imputed, interpolated, smoothed, back-filled or rolled",
    "no window, windowed sample or convolutional input was created",
    "no FORCE 2020 label was mapped onto any canonical vocabulary",
    "no write to data/processed/ or data/ml/",
    "no new dataset was downloaded; only the commit already pinned was read",
]


def median(sorted_values: list[float]) -> float | None:
    if not sorted_values:
        return None
    mid = len(sorted_values) // 2
    if len(sorted_values) % 2:
        return sorted_values[mid]
    return (sorted_values[mid - 1] + sorted_values[mid]) / 2.0


# ---------------------------------------------------------------------------
# The single pass
# ---------------------------------------------------------------------------
def scan_table(path: Path, labelled: bool) -> dict:
    """Measure one published CSV in one pass.

    Column statistics are collected into typed arrays rather than lists, because
    20 curves x 1.17M rows of Python floats would cost about 700 MB. The arrays
    hold C doubles, so the same measurement costs about 190 MB and is freed when
    this function returns.
    """
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter=DELIMITER)
        header = next(reader)
        idx = {name: i for i, name in enumerate(header)}
        ncols = len(header)

        missing = [0] * ncols
        sentinel_only = [0] * ncols
        wells_with_data: list[set] = [set() for _ in range(ncols)]
        values: list[array.array | None] = [None] * ncols
        text_values: list[Counter] = [Counter() for _ in range(ncols)]

        well_idx = idx.get("WELL")
        depth_idx = idx.get("DEPTH_MD")
        label_idx = idx.get(TARGET_COLUMNS[0]) if labelled else None
        conf_idx = idx.get(AUXILIARY_TARGET_COLUMNS[0]) if labelled else None
        # The claim "the coordinates are well-level, not per-depth" is worth
        # making only if it is measured, so track each location column's span
        # inside every well and count the wells where min == max.
        loc_idx = [i for i, c in enumerate(header) if c in LOCATION_COLUMNS]
        loc_slot = {i: n for n, i in enumerate(loc_idx)}
        loc_set = set(loc_idx)
        loc_span: dict[str, list[list[float | None]]] = {}

        rows = 0
        rows_by_well: Counter = Counter()
        missing_by_well: dict[str, array.array] = {}
        depth_by_well: dict[str, list[float]] = {}
        last_depth: dict[str, float] = {}
        non_monotonic = 0
        class_rows: Counter = Counter()
        class_wells: dict[str, set] = defaultdict(set)
        class_depth: dict[str, list[float]] = {}
        confidence_rows: Counter = Counter()

        for row in reader:
            rows += 1
            if len(row) != ncols:
                raise ValueError(
                    f"{path.name}: row {rows} has {len(row)} fields, header has {ncols}"
                )
            well = row[well_idx] if well_idx is not None else ""
            if well_idx is not None:
                rows_by_well[well] += 1
                if well not in missing_by_well:
                    missing_by_well[well] = array.array("i", bytes(4 * ncols))
                    if loc_idx:
                        loc_span[well] = [[None, None] for _ in loc_idx]
            if depth_idx is not None:
                depth = float(row[depth_idx])
                span = depth_by_well.setdefault(well, [depth, depth])
                span[0] = min(span[0], depth)
                span[1] = max(span[1], depth)
                if well in last_depth:
                    if depth <= last_depth[well]:
                        non_monotonic += 1
                last_depth[well] = depth
            if label_idx is not None:
                code = row[label_idx]
                class_rows[code] += 1
                class_wells[code].add(well)
                if depth_idx is not None:
                    span = class_depth.setdefault(code, [depth, depth])
                    span[0] = min(span[0], depth)
                    span[1] = max(span[1], depth)
            if conf_idx is not None:
                confidence_rows[row[conf_idx]] += 1

            well_missing = missing_by_well.get(well)
            for i, raw in enumerate(row):
                if raw == "":
                    missing[i] += 1
                    if well_missing is not None:
                        well_missing[i] += 1
                    continue
                if is_sentinel(raw):
                    # A sentinel is a null-equivalent that survived the source's
                    # own resampling. Counted separately so it is visible, and
                    # never treated as a measurement.
                    missing[i] += 1
                    sentinel_only[i] += 1
                    if well_missing is not None:
                        well_missing[i] += 1
                    continue
                if well_idx is not None:
                    wells_with_data[i].add(well)
                try:
                    value = float(raw)
                except ValueError:
                    text_values[i][raw] += 1
                    continue
                column = values[i]
                if column is None:
                    column = values[i] = array.array("d")
                column.append(value)
                if i in loc_set:
                    loc_box = loc_span[well][loc_slot[i]]
                    cur_lo, cur_hi = loc_box[0], loc_box[1]
                    if cur_lo is None or cur_hi is None:
                        loc_box[0] = loc_box[1] = value
                    else:
                        loc_box[0] = min(cur_lo, value)
                        loc_box[1] = max(cur_hi, value)

    columns = []
    for i, name in enumerate(header):
        column_values = values[i]
        ordered = sorted(column_values) if column_values else []
        role, note = COLUMN_ROLES.get(name, (ROLE_LOG_CURVE, ""))
        is_numeric = bool(column_values) or not text_values[i]
        per_well_missing = {
            well: counts[i] for well, counts in missing_by_well.items()
        }
        fractions = [
            per_well_missing.get(well, 0) / rows_by_well[well]
            for well in rows_by_well
            if rows_by_well[well]
        ]
        fractions.sort()
        columns.append({
            "name": name,
            "role": role,
            "note": note,
            "unit": CURVE_UNITS.get(name),
            "is_numeric": is_numeric,
            "rows": rows,
            "non_null": rows - missing[i],
            "missing": missing[i],
            "missing_fraction": round(missing[i] / rows, 8) if rows else None,
            "missing_via_sentinel": sentinel_only[i],
            "wells_with_data": len(wells_with_data[i]),
            "well_coverage_fraction": (
                round(len(wells_with_data[i]) / len(rows_by_well), 8)
                if rows_by_well else None
            ),
            "min": ordered[0] if ordered else None,
            "median": median(ordered),
            "max": ordered[-1] if ordered else None,
            "distinct_text_values": len(text_values[i]) or None,
            "top_text_values": text_values[i].most_common(5) or None,
            "per_well_missing_min": round(min(fractions), 6) if fractions else None,
            "per_well_missing_median": _round(median(fractions), 6),
            "per_well_missing_max": round(max(fractions), 6) if fractions else None,
            "wells_fully_missing": sum(
                1 for well, count in per_well_missing.items() if count == rows_by_well[well]
            ),
            "wells_partially_missing": sum(
                1 for well, count in per_well_missing.items()
                if 0 < count < rows_by_well[well]
            ),
        })

    classes = []
    for code, count in sorted(class_rows.items(), key=lambda kv: -kv[1]):
        lo_md, hi_md = class_depth.get(code, (None, None))
        classes.append({
            "code": code,
            "lithology": LITHOFACIES.get(int(code), "UNKNOWN_CODE"),
            "rows": count,
            "wells": len(class_wells[code]),
            "wells_with_class": sorted(class_wells[code]),
            "min_md": lo_md,
            "max_md": hi_md,
        })

    per_well_rows = {}
    if missing_by_well:
        for well, counts in missing_by_well.items():
            per_well_rows[well] = {
                "rows": rows_by_well[well],
                "missing": {
                    name: counts[i] for i, name in enumerate(header)
                    if name in LOG_CURVES
                },
            }

    location_constancy = {}
    for slot, i in enumerate(loc_idx):
        name = header[i]
        constant = varying = unmeasured = 0
        spreads: list[float] = []
        for spans in loc_span.values():
            lo, hi = spans[slot]
            if lo is None or hi is None:
                unmeasured += 1
            elif lo == hi:
                constant += 1
            else:
                varying += 1
                spreads.append(hi - lo)
        spreads.sort()
        location_constancy[name] = {
            "wells_with_any_value": constant + varying,
            "wells_constant_within_well": constant,
            "wells_varying_within_well": varying,
            "within_well_spread_min_m": round(spreads[0], 4) if spreads else None,
            "within_well_spread_median_m": _round(median(spreads), 4),
            "within_well_spread_max_m": round(spreads[-1], 4) if spreads else None,
        }

    return {
        "file": path.name,
        "rows": rows,
        "well_count": len(rows_by_well),
        "wells": sorted(rows_by_well),
        "rows_by_well": dict(sorted(rows_by_well.items())),
        "per_well_curve_missing": per_well_rows,
        "location_constancy": location_constancy,
        "depth_span_by_well": {
            well: {"min_md": span[0], "max_md": span[1],
                   "thickness_m": round(span[1] - span[0], 4)}
            for well, span in sorted(depth_by_well.items())
        },
        "depth_strictly_increasing": non_monotonic == 0,
        "non_monotonic_steps": non_monotonic,
        "well_depth_key_is_unique": non_monotonic == 0,
        "columns": columns,
        "class_distribution": classes,
        "confidence_distribution": dict(sorted(confidence_rows.items())),
    }


# ---------------------------------------------------------------------------
# Aggregation across the published tables
# ---------------------------------------------------------------------------
def build_class_table(tables: dict) -> dict:
    """One row per class, over every labelled row the source publishes."""
    labelled_tables = ("train", "hidden_test", "leaderboard_test_target")
    total = sum(
        sum(c["rows"] for c in tables[name]["class_distribution"])
        for name in labelled_tables
    )
    rows = []
    for code in sorted(LITHOFACIES, key=lambda c: str(c)):
        key = str(code)
        per_split = {}
        per_split_wells = {}
        count = 0
        wells: set[str] = set()
        min_md: float | None = None
        max_md: float | None = None
        for name in labelled_tables:
            entry = next(
                (c for c in tables[name]["class_distribution"] if c["code"] == key),
                None,
            )
            if entry is None:
                per_split[name] = 0
                per_split_wells[name] = 0
                continue
            per_split[name] = entry["rows"]
            per_split_wells[name] = entry["wells"]
            count += entry["rows"]
            # The splits are well-disjoint, so the union of the per-split well
            # lists is the set of wells the class appears in at all.
            wells |= set(entry["wells_with_class"])
            if entry["min_md"] is not None:
                lo: float = entry["min_md"]
                hi: float = entry["max_md"]
                min_md = lo if min_md is None else min(min_md, lo)
                max_md = hi if max_md is None else max(max_md, hi)
        rows.append({
            "code": key,
            "lithology": LITHOFACIES[code],
            "rows": count,
            "share_of_labelled": round(count / total, 8) if total else None,
            "wells": len(wells),
            "well_share": round(len(wells) / len(_all_wells(tables)), 8),
            "wells_by_split": per_split_wells,
            "rows_by_split": per_split,
            "min_md": min_md,
            "max_md": max_md,
            "thickness_m": round(max_md - min_md, 4)
            if min_md is not None and max_md is not None else None,
        })
    rows.sort(key=lambda r: -int(str(r["rows"])))
    return {
        "labelled_rows_total": total,
        "class_count": len(rows),
        "distinct_wells_total": len(_all_wells(tables)),
        "classes": rows,
    }


def _all_wells(tables: dict) -> list[str]:
    wells: set[str] = set()
    for name in ("train", "hidden_test", "leaderboard_test_features"):
        wells |= set(tables[name]["wells"])
    return sorted(wells)


def build_curve_table(tables: dict) -> dict:
    """The 20 log curves, measured on train.csv, with cross-split coverage."""
    train = tables["train"]
    by_name = {c["name"]: c for c in train["columns"]}
    train_wells = train["well_count"]
    rows = []
    for curve in LOG_CURVES:
        column = by_name[curve]
        coverage = column["well_coverage_fraction"] or 0.0
        missing_fraction = column["missing_fraction"] or 0.0
        if coverage >= CORE_MIN_WELL_COVERAGE and missing_fraction <= CORE_MAX_MISSING_FRACTION:
            tier = BASELINE_TIER_CORE
            reason = (
                f"present in {column['wells_with_data']}/{train_wells} wells "
                f"({coverage:.1%}) and {column['missing']:,} missing rows "
                f"({missing_fraction:.2%}), inside the core thresholds "
                f"(>={CORE_MIN_WELL_COVERAGE:.0%} of wells, "
                f"<={CORE_MAX_MISSING_FRACTION:.0%} missing)"
            )
        elif (coverage >= MASKED_MIN_WELL_COVERAGE
              and missing_fraction <= MASKED_MAX_MISSING_FRACTION):
            tier = BASELINE_TIER_MASKED
            reason = (
                f"present in only {column['wells_with_data']}/{train_wells} wells "
                f"({coverage:.1%}) with {missing_fraction:.1%} missing rows: "
                "genuinely logged in a minority of wells, so it needs an "
                "explicit availability-mask decision before use and is held out "
                "of the initial set"
            )
        else:
            tier = BASELINE_TIER_SPARSE
            reason = (
                f"present in {column['wells_with_data']}/{train_wells} wells "
                f"({coverage:.1%}) with {missing_fraction:.1%} missing rows: "
                "too sparse for a first baseline without a masking decision that "
                "has not been made"
            )
        rows.append({
            "name": curve,
            "unit": column["unit"],
            "non_null": column["non_null"],
            "missing": column["missing"],
            "missing_fraction": column["missing_fraction"],
            "missing_via_sentinel": column["missing_via_sentinel"],
            "wells_with_data": column["wells_with_data"],
            "train_well_count": train_wells,
            "well_coverage_fraction": coverage,
            "wells_fully_missing": column["wells_fully_missing"],
            "wells_partially_missing": column["wells_partially_missing"],
            "min": column["min"],
            "median": column["median"],
            "max": column["max"],
            "baseline_tier": tier,
            "baseline_reason": reason,
            "wells_hidden_test": _coverage(tables["hidden_test"], curve),
            "wells_leaderboard": _coverage(tables["leaderboard_test_features"], curve),
        })
    return {
        "measured_on": "train.csv",
        "train_rows": train["rows"],
        "curve_count": len(rows),
        "thresholds": {
            "core_min_well_coverage": CORE_MIN_WELL_COVERAGE,
            "core_max_missing_fraction": CORE_MAX_MISSING_FRACTION,
            "masked_min_well_coverage": MASKED_MIN_WELL_COVERAGE,
            "masked_max_missing_fraction": MASKED_MAX_MISSING_FRACTION,
            "basis": "data availability only; no model comparison is implied",
        },
        "curves": rows,
    }


def _coverage(table: dict, column_name: str) -> int:
    for column in table["columns"]:
        if column["name"] == column_name:
            return column["wells_with_data"]
    return 0


def verify_split(tables: dict) -> dict:
    """Prove the split is well-disjoint rather than asserting it."""
    train = set(tables["train"]["wells"])
    hidden = set(tables["hidden_test"]["wells"])
    board = set(tables["leaderboard_test_features"]["wells"])
    board_labels = set(tables["leaderboard_test_target"]["wells"])
    per_well: dict[str, list[str]] = defaultdict(list)
    for name, wells in (
        ("train", train), ("hidden_test", hidden),
        ("leaderboard_test_features", board),
    ):
        for well in wells:
            per_well[well].append(name)
    duplicated = {w: s for w, s in per_well.items() if len(s) > 1}
    return {
        "train_wells": len(train),
        "hidden_test_wells": len(hidden),
        "leaderboard_wells": len(board),
        "leaderboard_target_wells": len(board_labels),
        "expected": {"train": 98, "hidden_test": 10, "leaderboard_test_features": 10},
        "counts_match_expectation": (
            len(train) == 98 and len(hidden) == 10 and len(board) == 10
        ),
        "total_wells": len(per_well),
        "wells_in_multiple_splits": duplicated,
        "disjoint": not duplicated,
        "leaderboard_features_and_target_agree": board == board_labels,
        "split_by_well": {w: s[0] for w, s in sorted(per_well.items())},
    }


def analyse_imbalance(class_table: dict, tables: dict) -> dict:
    """Describe the distribution. Name no model, rank no approach."""
    classes = class_table["classes"]
    total = class_table["labelled_rows_total"]
    counts = sorted((c["rows"] for c in classes), reverse=True)
    top = classes[0]
    bottom = classes[-1]
    # A class is rare by row count, by well count, or both. These are different
    # failure modes and a model team needs to see which is which.
    rare_rows = [c for c in classes if c["share_of_labelled"] < 0.01]
    rare_wells = [c for c in classes if c["wells"] <= 3]
    single_well = [c for c in classes if c["wells"] == 1]
    train_wells = tables["train"]["well_count"]
    evaluable = [
        c for c in classes
        if c["wells"] >= 2 and c["rows_by_split"]["train"] > 0
    ]
    return {
        "labelled_rows_total": total,
        "class_count": len(classes),
        "largest_class": {
            "code": top["code"], "lithology": top["lithology"],
            "rows": top["rows"], "share": top["share_of_labelled"],
        },
        "smallest_class": {
            "code": bottom["code"], "lithology": bottom["lithology"],
            "rows": bottom["rows"], "share": bottom["share_of_labelled"],
        },
        "imbalance_ratio_largest_to_smallest": round(
            top["rows"] / bottom["rows"], 1
        ) if bottom["rows"] else None,
        "median_class_rows": median(sorted(c["rows"] for c in classes)),
        "classes_below_1_percent_of_rows": [
            {"code": c["code"], "lithology": c["lithology"],
             "rows": c["rows"], "share": c["share_of_labelled"]}
            for c in rare_rows
        ],
        "classes_in_three_or_fewer_wells": [
            {"code": c["code"], "lithology": c["lithology"],
             "rows": c["rows"], "wells": c["wells"]}
            for c in rare_wells
        ],
        "classes_in_exactly_one_well": [
            {"code": c["code"], "lithology": c["lithology"], "rows": c["rows"]}
            for c in single_well
        ],
        "classes_present_in_train": sum(
            1 for c in classes if c["rows_by_split"]["train"] > 0
        ),
        "classes_absent_from_train": [
            {"code": c["code"], "lithology": c["lithology"]}
            for c in classes if c["rows_by_split"]["train"] == 0
        ],
        "classes_appearing_in_multiple_splits": [
            {"code": c["code"], "lithology": c["lithology"],
             "splits": sorted(k for k, v in c["rows_by_split"].items() if v)}
            for c in classes
            if sum(1 for v in c["rows_by_split"].values() if v) > 1
        ],
        "train_well_count": train_wells,
        "classes_with_at_least_two_wells_in_train": len(evaluable),
        "row_share_of_top_three": round(
            sum(counts[:3]) / total, 6
        ) if total else None,
        "cumulative_share_by_rank": _cumulative(counts, total),
    }


def _cumulative(counts: list[int], total: int) -> list[dict]:
    out = []
    running = 0
    for rank, count in enumerate(counts, start=1):
        running += count
        out.append({
            "rank": rank, "rows": count,
            "cumulative_share": round(running / total, 6) if total else None,
        })
    return out


def analyse_missingness(curve_table: dict, tables: dict) -> dict:
    curves = curve_table["curves"]
    extreme = [c for c in curves if (c["missing_fraction"] or 0) > 0.5]
    near_absent = [c for c in curves
                   if (c["well_coverage_fraction"] or 0) < 0.5]
    with_missing = [c for c in curves if c["missing"]]
    sentinels = {c["name"]: c["missing_via_sentinel"] for c in curves
                 if c["missing_via_sentinel"]}
    return {
        "basis": (
            "A missing value is an empty CSV field. The source LAS declares "
            "NULL = -999.25, but no cell in any published CSV equals a known "
            "sentinel, so the LAS null convention does not leak into these "
            "tables; the sentinel counters below are reported separately and "
            "are zero. Nothing is filled. Per-well figures are the fraction of "
            "a well's own rows that are missing for that curve, so a curve "
            "logged in a minority of wells separates 'absent from this well' "
            "from 'dropped inside this well'."
        ),
        "sentinel_cells_in_published_csvs": sum(sentinels.values()),
        "curves_with_sentinel_cells": sentinels,
        "global_by_curve": [
            {"name": c["name"], "missing": c["missing"],
             "non_null": c["non_null"], "missing_fraction": c["missing_fraction"],
             "wells_with_data": c["wells_with_data"],
             "well_coverage_fraction": c["well_coverage_fraction"]}
            for c in curves
        ],
        "per_well_missing_range_by_curve": [
            {"name": c["name"],
             "min": _per_well(tables["train"], c["name"], "min"),
             "median": _per_well(tables["train"], c["name"], "median"),
             "max": _per_well(tables["train"], c["name"], "max"),
             "wells_fully_missing": c["wells_fully_missing"],
             "wells_partially_missing": c["wells_partially_missing"]}
            for c in curves
        ],
        "curves_above_50_percent_missing": [
            {"name": c["name"], "missing_fraction": c["missing_fraction"],
             "wells_with_data": c["wells_with_data"],
             "well_coverage_fraction": c["well_coverage_fraction"]}
            for c in extreme
        ],
        "curves_in_fewer_than_half_the_wells": [
            {"name": c["name"], "wells_with_data": c["wells_with_data"],
             "well_coverage_fraction": c["well_coverage_fraction"]}
            for c in near_absent
        ],
        "curves_with_no_missing_rows": [
            c["name"] for c in curves if c["missing"] == 0
        ],
        "curves_with_any_missing_rows": [c["name"] for c in with_missing],
    }


def _per_well(table: dict, column_name: str, which: str) -> float | None:
    for column in table["columns"]:
        if column["name"] == column_name:
            return column[f"per_well_missing_{which}"]
    return None


# The three tables that carry log curves. leaderboard_test_target holds the
# label and key only, so it contributes no curve-missing counts and no
# per-well curve row; a well appears exactly once across these three.
CURVE_TABLES = ("train", "hidden_test", "leaderboard_test_features")


def _per_well_missing_counts(tables: dict, split: dict) -> dict:
    """Per-well, per-curve missing cell counts, for every well that has curves.

    This is the raw material behind the per-well columns of the missingness
    table, and it is kept in the JSON so the range figures can be re-derived
    from something other than themselves. data/force2020_well_missingness.csv is
    a flat view of exactly these numbers.
    """
    out: dict[str, dict] = {}
    for name in CURVE_TABLES:
        for well, record in tables[name]["per_well_curve_missing"].items():
            out[well] = {
                "split": split["split_by_well"].get(well, name),
                "source_file": tables[name]["file"],
                "rows": record["rows"],
                "missing": record["missing"],
            }
    return dict(sorted(out.items()))


# ---------------------------------------------------------------------------
# The two proposals
#
# Both are proposals derived from the measured tables above, and both are
# committed so a test can hold them to the measurements. Nothing here is a
# statement about which model is better; these are statements about what the
# data can supply without a decision that has not been made yet.
# ---------------------------------------------------------------------------
HELD_OUT_FROM_FEATURES: dict[str, str] = {
    "DEPTH_MD": (
        "kept as a column but excluded from the feature set so a "
        "depth-ablation experiment can measure what the model gets from depth "
        "alone"
    ),
    "WELL": "grouping key, not a feature",
    "X_LOC": "borehole trajectory, a function of depth; excluded so depth cannot re-enter through the back door",
    "Y_LOC": "borehole trajectory, a function of depth; same reason as X_LOC",
    "Z_LOC": "the source's own signed depth column, a depth proxy; excluded for the same reason",
    "GROUP": "label-adjacent NPD stratigraphy from the interpretation campaign",
    "FORMATION": "label-adjacent NPD stratigraphy from the interpretation campaign",
    "FORCE_2020_LITHOFACIES_LITHOLOGY": "the target",
    "FORCE_2020_LITHOFACIES_CONFIDENCE": "a property of the label, not an input",
}

ML_ROW_SCHEMA: tuple[tuple[str, str, str, str], ...] = (
    ("WELL", "str", "identifier",
     "NPD well name. Grouping key; every row of a well shares a split."),
    ("DEPTH_MD", "float", "depth",
     "Measured depth, m. Monotonic within a well; the join key to LAS and the "
     "ablation axis."),
    ("SPLIT", "str", "provenance",
     "train | hidden_test | leaderboard_test_features. Assigned by well, never "
     "by row."),
    ("SOURCE_ID", "str", "provenance",
     "'FORCE2020', from ml/external_datasets.yaml."),
    ("SOURCE_COMMIT", "str", "provenance",
     "The pinned source commit the row was read from."),
    ("FORCE_2020_LITHOFACIES_LITHOLOGY", "int", "target",
     "NPD lithostratigraphic code. Null for leaderboard_test_features, which "
     "ships without labels."),
    ("FORCE_2020_LITHOFACIES_CONFIDENCE", "int", "target_metadata",
     "1 high, 2 medium, 3 low. Null for unlabelled rows."),
    ("LABELLED", "bool", "provenance",
     "False for the open-leaderboard feature rows only."),
    ("<log curve>", "float", "feature",
     "One column per selected curve, 20 candidates, of which the core set is "
     "proposed for the first baseline. Null means missing; never filled."),
    ("<curve>_PRESENT", "bool", "feature_metadata",
     "Availability mask per curve per well, so a masked curve is distinguishable "
     "from an unlogged one. Derived from measurement, not from a threshold on "
     "the value."),
)


def build_feature_set(curve_table: dict) -> dict:
    """The logs-only proposal, derived from the measured tiers.

    The core set is not chosen here; it is read off the curve table, so the
    proposal cannot drift from the measurements. Whatever clears the core
    thresholds is in it, and whatever does not is named in the masked or sparse
    list with the number that put it there. A curve is not silently dropped: a
    curve missing from most wells is a fact a modelling decision has to
    confront, not a detail to omit.

    This is a statement about data availability only. No model, architecture or
    evaluation is proposed, recommended or compared.
    """
    curves = curve_table["curves"]
    core = [c for c in curves if c["baseline_tier"] == BASELINE_TIER_CORE]
    masked = [c for c in curves if c["baseline_tier"] == BASELINE_TIER_MASKED]
    sparse = [c for c in curves if c["baseline_tier"] == BASELINE_TIER_SPARSE]
    return {
        "kind": "logs only, no depth, no stratigraphy, no coordinates",
        "measured_on": curve_table["measured_on"],
        "derivation": (
            "read directly off curve_table baseline_tier, which is itself "
            "computed from the thresholds in curve_table.thresholds"
        ),
        "core_features": [c["name"] for c in core],
        "core_feature_count": len(core),
        "core_evidence": {
            c["name"]: {
                "wells_with_data": c["wells_with_data"],
                "train_well_count": c["train_well_count"],
                "missing_fraction": c["missing_fraction"],
            }
            for c in core
        },
        "masked_candidates": [c["name"] for c in masked],
        "masked_evidence": {
            c["name"]: {
                "wells_with_data": c["wells_with_data"],
                "train_well_count": c["train_well_count"],
                "missing_fraction": c["missing_fraction"],
            }
            for c in masked
        },
        "sparse_candidates": [c["name"] for c in sparse],
        "sparse_evidence": {
            c["name"]: {
                "wells_with_data": c["wells_with_data"],
                "train_well_count": c["train_well_count"],
                "missing_fraction": c["missing_fraction"],
            }
            for c in sparse
        },
        "held_out": HELD_OUT_FROM_FEATURES,
        "core_set_is_derived_not_chosen": True,
        "rationale": (
            "A curve is core when it clears both stated availability thresholds, "
            "so the set is re-derivable from the measurements rather than picked. "
            "The set is deliberately small: a first baseline should not need an "
            "availability-mask decision that has not been made yet. Note what "
            "this costs. Several curves that a petrophysicist would reach for are "
            "NOT in the core set, because they fail a threshold on this data; "
            "they are named in the masked list with their measurements, so the "
            "decision to mask them is visible and can be reversed deliberately. "
            "No model is proposed or compared."
        ),
        "masked_decision_deferred": (
            "Admitting a masked curve needs a stated availability-mask policy and "
            "an agreed missing-value treatment. Neither exists yet, so the curves "
            "are listed and held out rather than quietly included or dropped."
        ),
        "depth_ablation": (
            "DEPTH_MD is carried in the row schema and excluded from the feature "
            "set, so a depth-only baseline and a depth-ablation run are both "
            "possible without reshaping the table. X_LOC, Y_LOC and Z_LOC are "
            "excluded for the same purpose: measured, they track the borehole "
            "trajectory and vary with depth, so leaving them in would smuggle "
            "depth back in behind DEPTH_MD and make the ablation meaningless."
        ),
    }


def build(source_root: Path) -> dict:
    data_dir = source_root / DATA_SUBDIR
    if not data_dir.is_dir():
        raise SystemExit(
            f"FORCE 2020 data directory not found: {data_dir}\n"
            "The source must already be present from the inspection stage; this "
            "script downloads nothing."
        )
    train_csv = data_dir / "extracted" / "train.csv"
    if not train_csv.exists():
        raise SystemExit(
            f"{train_csv} not found; expand train.zip as the inspection stage did"
        )

    tables = {
        "train": scan_table(train_csv, labelled=True),
        "hidden_test": scan_table(data_dir / "hidden_test.csv", labelled=True),
        "leaderboard_test_features": scan_table(
            data_dir / "leaderboard_test_features.csv", labelled=False
        ),
        "leaderboard_test_target": scan_table(
            data_dir / "leaderboard_test_target.csv", labelled=True
        ),
    }

    class_table = build_class_table(tables)
    curve_table = build_curve_table(tables)
    split = verify_split(tables)
    imbalance = analyse_imbalance(class_table, tables)
    missingness = analyse_missingness(curve_table, tables)
    missingness["per_well_missing_counts"] = _per_well_missing_counts(tables, split)

    return {
        "artifact": "force2020_dataset_characterization",
        "schema_version": 1,
        "scope": (
            "read-only characterization of an external dataset; separate from "
            "the NWIS canonical dataset"
        ),
        "canonical_dataset_version_untouched": "nwis-forge16b-v0.2",
        "stage": "characterization, no model stage entered",
        "source": {
            "source_id": "FORCE2020",
            "resolved_commit_sha": resolved_commit(source_root),
            "archive_doi": "10.5281/zenodo.4351156",
            "licence": "CC-BY-4.0",
            "licence_upstream": "NPD/Equinor logs are NLOD 2.0",
            "licence_gap": (
                "the GitHub repository carries no dataset-level LICENSE file; "
                "the CC-BY-4.0 is the Zenodo deposit licence"
            ),
            "characterized_files": [
                t["file"] for t in tables.values()
            ],
            "las_in_source_commit": las_inventory(git_tree_index(source_root))["count"],
        },
        "class_table": class_table,
        "curve_table": curve_table,
        "column_roles": {
            "definitions": {
                ROLE_IDENTIFIER: "joins rows to a well; never a feature",
                ROLE_DEPTH: "measured depth along the hole, m",
                ROLE_COORDINATE: "well location, constant within a well here",
                ROLE_TARGET: "the supervised label",
                ROLE_TARGET_METADATA: "a property of the label, not an input",
                ROLE_STRATIGRAPHY: "label-adjacent stratigraphy from the "
                                   "interpretation campaign",
                ROLE_LOG_CURVE: "a measured log curve; the feature candidates",
            },
            "columns": [
                {"name": column["name"],
                 "role": COLUMN_ROLES.get(
                     column["name"],
                     (ROLE_LOG_CURVE, "one of the source's 20 measured log curves"),
                 )[0],
                 "unit": CURVE_UNITS.get(column["name"]),
                 "note": COLUMN_ROLES.get(column["name"], (ROLE_LOG_CURVE, ""))[1]
                 or "one of the source's 20 measured log curves; a feature "
                    "candidate, subject to the availability tiers above"}
                for column in tables["train"]["columns"]
            ],
            "counts": _role_counts(tables["train"]),
            "location_constancy_measured_on_train": tables["train"][
                "location_constancy"
            ],
        },
        "split": split,
        "imbalance": imbalance,
        "missingness": missingness,
        "proposed_feature_set": build_feature_set(curve_table),
        "proposed_ml_row_schema": {
            "grain": "one row per (WELL, DEPTH_MD) sample, as published",
            "key": ["WELL", "DEPTH_MD"],
            "key_is_unique_in_source": all(
                t["well_depth_key_is_unique"] for t in tables.values()
            ),
            "key_uniqueness_argument": (
                "DEPTH_MD is strictly increasing within every well in every "
                "published table, so (WELL, DEPTH_MD) is unique without a "
                "separate duplicate check."
            ),
            "columns": [
                {"name": name, "dtype": dtype, "role": role, "note": note}
                for name, dtype, role, note in ML_ROW_SCHEMA
            ],
            "row_counts": {name: t["rows"] for name, t in tables.items()},
            "notes": [
                "Features and labels stay in one table at source grain; nothing "
                "is widened, windowed or resampled to make a table.",
                "SPLIT is a function of WELL alone, which is what makes the "
                "evaluation well-grouped by construction.",
                "Missing curves stay null. A <curve>_PRESENT mask records "
                "availability; it does not stand in for a value.",
            ],
        },
        "data_quality_concerns": build_concerns(tables, class_table, curve_table,
                                                split, missingness),
        "not_performed": NOT_PERFORMED,
    }


def _round(value: float | None, digits: int) -> float | None:
    """Round only when there is a value, so an absent measurement stays absent."""
    return None if value is None else round(value, digits)


def _role_counts(table: dict) -> dict[str, int]:
    counts: Counter = Counter()
    for column in table["columns"]:
        role = COLUMN_ROLES.get(column["name"], (ROLE_LOG_CURVE, ""))[0]
        counts[role] += 1
    return dict(sorted(counts.items()))


def build_concerns(tables: dict, class_table: dict, curve_table: dict,
                   split: dict, missingness: dict) -> list[dict]:
    """Concerns measured from the data, each with the number that raises it."""
    concerns: list[dict] = []
    train = tables["train"]

    for name, table in tables.items():
        if not table["depth_strictly_increasing"]:
            concerns.append({
                "id": "DQ_DEPTH_ORDER",
                "severity": "medium",
                "where": name,
                "detail": (
                    f"{table['non_monotonic_steps']} steps where DEPTH_MD did "
                    f"not increase within a well, so (WELL, DEPTH_MD) is not "
                    f"unique and a depth join must be checked."
                ),
            })

    sentinel_columns = [
        c for c in curve_table["curves"] if c["missing_via_sentinel"]
    ]
    if sentinel_columns:
        concerns.append({
            "id": "DQ_RESIDUAL_SENTINELS",
            "severity": "medium",
            "where": "train.csv",
            "detail": (
                "sentinel values survive in "
                + ", ".join(
                    f"{c['name']} ({c['missing_via_sentinel']:,} cells)"
                    for c in sentinel_columns
                )
                + ". They are counted as missing here, not removed, because a "
                "cleaning decision belongs to a transform stage that does not "
                "exist yet."
            ),
        })
    else:
        concerns.append({
            "id": "DQ_NO_SENTINELS_IN_CSVS",
            "severity": "low",
            "where": "train.csv",
            "detail": (
                "the source LAS declares NULL = -999.25, but 0 of the "
                f"{curve_table['train_rows']:,} train cells hold a known "
                "sentinel; every missing value in the published CSVs is an "
                "empty field. This is worth recording because it means the LAS "
                "null convention does not leak into these tables, and it is why "
                "the sentinel counters are reported separately and read zero. "
                "A LAS-derived table would need the check re-run, since this "
                "measurement covers the CSVs only."
            ),
        })

    single_well = [
        c for c in class_table["classes"] if c["wells"] == 1
    ]
    if single_well:
        listed = ", ".join(
            "{lithology} ({code}, {rows:,} rows, {splits})".format(
                lithology=c["lithology"], code=c["code"], rows=c["rows"],
                splits=c["rows_by_split"],
            )
            for c in single_well
        )
        concerns.append({
            "id": "DQ_SINGLE_WELL_CLASSES",
            "severity": "high",
            "where": "target",
            "detail": (
                f"classes present in exactly one well: {listed}. Under any "
                "well-grouped split, a fold that holds out that well has no "
                "positives for the class at all, so a per-class score for it is "
                "undefined rather than low."
            ),
        })

    absent = [
        c for c in class_table["classes"]
        if c["rows_by_split"]["train"] == 0
    ]
    if absent:
        concerns.append({
            "id": "DQ_CLASS_ABSENT_FROM_TRAIN",
            "severity": "medium",
            "where": "train.csv",
            "detail": (
                "classes with no train rows: "
                + ", ".join(f"{c['lithology']} ({c['code']})" for c in absent)
                + ". They exist only in the released evaluation splits."
            ),
        })

    by_name = {c["name"]: c for c in train["columns"]}
    group_values = by_name["GROUP"]["distinct_text_values"]
    formation_values = by_name["FORMATION"]["distinct_text_values"]
    label_values = len(train["class_distribution"])
    concerns.append({
        "id": "DQ_LABEL_ADJACENT_STRATIGRAPHY",
        "severity": "high",
        "where": "train.csv, hidden_test.csv",
        "detail": (
            f"GROUP takes {group_values} distinct values in train and "
            f"FORMATION {formation_values}, against {label_values} lithofacies "
            "classes, and they change only in contiguous depth blocks. They are "
            "NPD stratigraphy from the same interpretation campaign as the "
            "label, so they are a near-complete stand-in for it: a model given "
            "them can score well by reading the interpreter's mind rather than "
            "the rock. They are excluded from the proposed logs-only feature "
            "set and flagged, not deleted."
        ),
    })

    partial = [
        c for c in curve_table["curves"] if c["wells_partially_missing"]
    ]
    if partial:
        concerns.append({
            "id": "DQ_PARTIAL_CURVE_GAPS",
            "severity": "medium",
            "where": "train.csv",
            "detail": (
                f"{len(partial)} of {curve_table['curve_count']} curves are "
                "present but not continuous within the wells that have them, so "
                "missingness is a mixture of 'not logged in this well' and "
                "'dropped inside this well'. The per-well columns of the "
                "missingness table separate the two; no value is filled."
            ),
        })

    concerns.append({
        "id": "DQ_SOURCE_DOC_MISMATCH",
        "severity": "low",
        "where": "starter_notebook.ipynb",
        "detail": (
            "the source's own notebook states 83 training wells; the pinned "
            f"train.csv holds {train['well_count']}. The file is authoritative "
            "and the notebook prose is stale."
        ),
    })

    concerns.append({
        "id": "DQ_LAS_CARRIES_LABELS",
        "severity": "low",
        "where": "las_files_Lithostrat_data",
        "detail": (
            "the LAS ~Curve sections list "
            "FORCE_2020_LITHOFACIES_LITHOLOGY and _CONFIDENCE as curves, so a "
            "LAS-derived table would import the label as a feature unless it is "
            "dropped explicitly. The CSVs are used for this characterization, "
            "so it does not affect these numbers."
        ),
    })

    constancy = train["location_constancy"]
    measured = "; ".join(
        f"{name} constant in only {c['wells_constant_within_well']}/"
        f"{train['well_count']} wells, varying in {c['wells_varying_within_well']}, "
        f"within-well spread median {c['within_well_spread_median_m']:,.1f} m "
        f"(max {c['within_well_spread_max_m']:,.1f} m)"
        for name, c in constancy.items()
    )
    concerns.append({
        "id": "DQ_COORDINATES_TRACK_TRAJECTORY",
        "severity": "medium",
        "where": "X_LOC, Y_LOC, Z_LOC",
        "detail": (
            f"measured in train.csv: {measured}. These are not well-level "
            "locators: they track the borehole trajectory as the bit drills "
            "away from the wellhead, so they vary row to row. That makes them "
            "a depth proxy and a well fingerprint rather than a rock "
            "measurement, and it means a logs-only feature set that included "
            "them would smuggle depth back in behind DEPTH_MD while also giving "
            "a model a way to recognise the well. All three are held out for "
            "that reason, and the depth ablation is only honest while they "
            "stay out."
        ),
    })
    return concerns


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def pct(value: float | None, places: int = 2) -> str:
    return "n/a" if value is None else f"{value * 100:.{places}f}%"


def num(value: float | None, places: int = 4) -> str:
    if value is None:
        return "n/a"
    if value == int(value) and abs(value) < 1e15:
        return f"{int(value):,}"
    return f"{value:,.{places}f}"


def cell(text: object) -> str:
    """Escape a value for use inside a markdown table cell.

    A literal pipe would silently start a new column, so a note containing
    'train | hidden_test' would render as three cells instead of one and the
    table would quietly lie about its own contents.
    """
    return str(text).replace("|", "\\|")


def render_markdown(report: dict) -> str:
    L: list[str] = []
    a = L.append
    source = report["source"]

    a("# FORCE 2020 dataset characterization")
    a("")
    a(f"**Source commit:** `{source['resolved_commit_sha']}`  ")
    a(f"**Archive:** {source['archive_doi']}  ")
    a(f"**Licence:** {source['licence']} (upstream: {source['licence_upstream']})  ")
    a(f"**Stage:** {report['stage']}  ")
    a(f"**Canonical dataset:** `{report['canonical_dataset_version_untouched']}`, untouched")
    a("")
    a("A read-only characterization of the source bytes. No model was trained, no")
    a("dataset was built, no value was filled, and nothing was written to")
    a("`data/processed/` or `data/ml/`. FORCE 2020 is an external dataset with its")
    a("own lithofacies vocabulary; it is not an extension of the NWIS canonical")
    a("dataset and its labels are not mapped onto `FORGE_UTAH_16B`.")
    a("")

    a("## 1. Target classes")
    a("")
    ct = report["class_table"]
    a(f"{ct['class_count']} classes over **{ct['labelled_rows_total']:,}** labelled rows "
      f"(train + hidden_test + leaderboard_test_target), across "
      f"{ct['distinct_wells_total']} distinct wells. Well counts are distinct "
      f"wells per class, so they do not sum to {ct['distinct_wells_total']}.")
    a("")
    a("| # | Code | Class | Rows | Share of labelled | Wells | Min MD (m) | Max MD (m) | Thickness (m) |")
    a("|--:|---:|---|---:|---:|---:|---:|---:|---:|")
    for rank, c in enumerate(ct["classes"], start=1):
        a(f"| {rank} | `{c['code']}` | {c['lithology']} | {c['rows']:,} | "
          f"{pct(c['share_of_labelled'], 3)} | {c['wells']} | "
          f"{num(c['min_md'], 2)} | {num(c['max_md'], 2)} | {num(c['thickness_m'], 1)} |")
    a(f"| | | **total** | **{ct['labelled_rows_total']:,}** | 100% | | | | |")
    a("")
    a("### Rows by published split")
    a("")
    a("| Code | Class | train | hidden_test | leaderboard_test_target | Wells in train | Wells in hidden_test | Wells in leaderboard |")
    a("|---:|---|---:|---:|---:|---:|---:|---:|")
    for c in ct["classes"]:
        r = c["rows_by_split"]
        w = c["wells_by_split"]
        a(f"| `{c['code']}` | {c['lithology']} | {r['train']:,} | "
          f"{r['hidden_test']:,} | {r['leaderboard_test_target']:,} | "
          f"{w['train']} | {w['hidden_test']} | {w['leaderboard_test_target']} |")
    a("")

    a("## 2. Log curves")
    a("")
    cu = report["curve_table"]
    a(f"Measured on {cu['measured_on']} ({cu['train_rows']:,} rows). Units are "
      f"carried over from the inspection pass, where they were transcribed from "
      f"the source's own LAS `~Curve` sections. Caveat worth stating: the local "
      f"checkout is sparse and holds 1 of the source's 118 LAS files, which names "
      f"14 of these 20 curves. For the other "
      f"{len(UNITS_NOT_VERIFIED_FROM_LOCAL_LAS)} the unit comes from the source's "
      f"documentation rather than a locally parsed header "
      f"({', '.join('`' + c + '`' for c in UNITS_NOT_VERIFIED_FROM_LOCAL_LAS)}), and "
      f"`ROPA` carries no unit in the source, so it shows as `—`.")
    a("")
    a("| Curve | Unit | Non-null | Missing | Missing % | Wells | Cov % | Min | Median | Max | Sentinel cells |")
    a("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for c in cu["curves"]:
        a(f"| `{c['name']}` | {c['unit'] or '—'} | {c['non_null']:,} | "
          f"{c['missing']:,} | {pct(c['missing_fraction'])} | "
          f"{c['wells_with_data']}/{c['train_well_count']} | "
          f"{pct(c['well_coverage_fraction'], 1)} | {num(c['min'], 3)} | "
          f"{num(c['median'], 3)} | {num(c['max'], 3)} | "
          f"{c['missing_via_sentinel']:,} |")
    a("")
    a("### Data-availability verdict per curve")
    a("")
    a(f"Thresholds: core = present in >= {cu['thresholds']['core_min_well_coverage']:.0%} "
      f"of wells and <= {cu['thresholds']['core_max_missing_fraction']:.0%} missing; "
      f"masked = >= {cu['thresholds']['masked_min_well_coverage']:.0%} of wells and "
      f"<= {cu['thresholds']['masked_max_missing_fraction']:.0%} missing; "
      f"anything sparser is `sparse`.")
    a("")
    a(f"**{cu['thresholds']['basis']}.**")
    a("")
    a("| Curve | Tier | Measured reason |")
    a("|---|---|---|")
    for c in cu["curves"]:
        a(f"| `{c['name']}` | `{c['baseline_tier']}` | {cell(c['baseline_reason'])} |")
    a("")

    a("## 3. Column roles")
    a("")
    roles = report["column_roles"]
    a("| Role | Meaning | Columns |")
    a("|---|---|---|")
    grouped: dict[str, list[str]] = {}
    for column in roles["columns"]:
        grouped.setdefault(column["role"], []).append(column["name"])
    for role, meaning in roles["definitions"].items():
        names = grouped.get(role, [])
        a(f"| `{role}` | {cell(meaning)} | "
          f"{', '.join(f'`{n}`' for n in names) if names else '—'} |")
    a("")
    a("Role counts: " + ", ".join(f"{k} {v}" for k, v in roles["counts"].items()) + ".")
    a("")
    a("Per-column notes:")
    a("")
    for column in roles["columns"]:
        if column["note"]:
            a(f"- `{column['name']}` — {column['note']}")
    a("")

    a("## 4. Well-level split")
    a("")
    sp = report["split"]
    a("| Split | Wells | Expected | Matches |")
    a("|---|---:|---:|---|")
    actual_wells = {
        "train": sp["train_wells"],
        "hidden_test": sp["hidden_test_wells"],
        "leaderboard_test_features": sp["leaderboard_wells"],
    }
    for name, expected in sp["expected"].items():
        actual = actual_wells[name]
        a(f"| `{name}` | {actual} | {expected} | {'yes' if actual == expected else 'NO'} |")
    a("")
    a(f"- Total distinct wells: **{sp['total_wells']}**")
    a(f"- Wells occurring in more than one split: **{len(sp['wells_in_multiple_splits'])}**")
    a(f"- Split is well-disjoint: **{'yes' if sp['disjoint'] else 'NO'}**")
    a(f"- `leaderboard_test_features` and `leaderboard_test_target` cover the same "
      f"wells: **{'yes' if sp['leaderboard_features_and_target_agree'] else 'NO'}**")
    a(f"- Per-well split assignment for all {len(sp['split_by_well'])} wells is recorded "
      f"in the JSON artifact under `split.split_by_well`, and per well in "
      f"`data/force2020_wells.csv`.")
    a("")

    a("## 5. Class imbalance")
    a("")
    imb = report["imbalance"]
    a("Descriptive only. No model is proposed, ranked or compared here.")
    a("")
    a(f"- Largest class: **{imb['largest_class']['lithology']}** "
      f"(`{imb['largest_class']['code']}`), {imb['largest_class']['rows']:,} rows, "
      f"{pct(imb['largest_class']['share'], 3)} of labelled rows")
    a(f"- Smallest class: **{imb['smallest_class']['lithology']}** "
      f"(`{imb['smallest_class']['code']}`), {imb['smallest_class']['rows']:,} rows, "
      f"{pct(imb['smallest_class']['share'], 3)}")
    a(f"- Largest-to-smallest ratio: **{imb['imbalance_ratio_largest_to_smallest']}x**")
    a(f"- Median class size: {imb['median_class_rows']:,.0f} rows")
    a(f"- Top three classes hold {pct(imb['row_share_of_top_three'], 2)} of all labelled rows")
    a(f"- Classes present in train: {imb['classes_present_in_train']} of {imb['class_count']}")
    a("")
    a("### Cumulative share by rank")
    a("")
    a("| Rank | Rows | Cumulative share |")
    a("|---:|---:|---:|")
    for row in imb["cumulative_share_by_rank"]:
        a(f"| {row['rank']} | {row['rows']:,} | {pct(row['cumulative_share'], 2)} |")
    a("")
    a("### Rare classes")
    a("")
    a(f"- Below 1% of labelled rows ({len(imb['classes_below_1_percent_of_rows'])}): "
      + ("; ".join(f"{c['lithology']} ({c['code']}) {c['rows']:,} rows "
                   f"{pct(c['share'], 3)}"
                   for c in imb["classes_below_1_percent_of_rows"]) or "none"))
    a(f"- In three or fewer wells ({len(imb['classes_in_three_or_fewer_wells'])}): "
      + ("; ".join(f"{c['lithology']} ({c['code']}) in {c['wells']} well(s)"
                   for c in imb["classes_in_three_or_fewer_wells"]) or "none"))
    a(f"- In exactly one well ({len(imb['classes_in_exactly_one_well'])}): "
      + ("; ".join(f"{c['lithology']} ({c['code']}) {c['rows']:,} rows"
                   for c in imb["classes_in_exactly_one_well"]) or "none"))
    absent = imb["classes_absent_from_train"]
    a(f"- Absent from train entirely ({len(absent)}): "
      + ("; ".join(f"{c['lithology']} ({c['code']})" for c in absent) or "none"))
    a("")
    evaluable = imb["classes_with_at_least_two_wells_in_train"]
    undefinable = imb["class_count"] - evaluable
    a(f"{evaluable} of {imb['class_count']} classes have at least two wells in "
      f"train. "
      + (f"For the other {undefinable}, a per-class score computed over a "
         "well-grouped split is undefined rather than low, because a fold that "
         "holds out the only well containing the class has no positives for it. "
         "That is a property of the data, stated here so it is not discovered "
         "later."
         if undefinable else
         "Every class therefore has at least two wells to be scored across a "
         "well-grouped split, which is a property of the data rather than a "
         "claim about any method."))
    a("")

    a("## 6. Missingness")
    a("")
    mi = report["missingness"]
    a(mi["basis"])
    a("")
    a("### Global missingness and per-well range (train.csv)")
    a("")
    per_well = {r["name"]: r for r in mi["per_well_missing_range_by_curve"]}
    a("| Curve | Global missing % | Wells with data | Per-well missing min | median | max | Wells fully missing | Wells partly missing |")
    a("|---|---:|---:|---:|---:|---:|---:|---:|")
    for row in mi["global_by_curve"]:
        pw = per_well[row["name"]]
        a(f"| `{row['name']}` | {pct(row['missing_fraction'])} | "
          f"{row['wells_with_data']} | {pct(pw['min'], 1)} | {pct(pw['median'], 1)} | "
          f"{pct(pw['max'], 1)} | {pw['wells_fully_missing']} | "
          f"{pw['wells_partially_missing']} |")
    a("")
    a("### Curves with extreme missingness")
    a("")
    a("Above 50% missing rows: "
      + ("; ".join(f"`{c['name']}` {pct(c['missing_fraction'], 1)} in "
                   f"{c['wells_with_data']} well(s)"
                   for c in mi["curves_above_50_percent_missing"]) or "none"))
    a("")
    a("Present in fewer than half the wells: "
      + ("; ".join(f"`{c['name']}` {c['wells_with_data']} wells "
                   f"({pct(c['well_coverage_fraction'], 1)})"
                   for c in mi["curves_in_fewer_than_half_the_wells"]) or "none"))
    a("")
    complete = mi["curves_with_no_missing_rows"]
    a(f"Curves with no missing rows at all: "
      f"{', '.join(f'`{c}`' for c in complete) if complete else 'none'}.")
    a("")
    a(f"Sentinel cells in the published CSVs: "
      f"**{mi['sentinel_cells_in_published_csvs']}**. The source LAS declares "
      f"`NULL = -999.25`, but no published CSV cell equals a known sentinel, so "
      f"every missing value counted above is an empty field. The per-curve "
      f"sentinel column is reported anyway, so a future release that does carry "
      f"them cannot pass unnoticed.")
    a("")
    a("No value is filled, imputed or interpolated at this stage. Every null above")
    a("is still null in the source.")
    a("")
    a("### Per-well audit trail")
    a("")
    counts = mi["per_well_missing_counts"]
    a(f"The per-well min/median/max above are computed from {len(counts)} per-well "
      "missing cell counts, one record per well that appears in a table carrying "
      "log curves (train, hidden_test, leaderboard_test_features). Those counts are "
      "kept in the JSON under `missingness.per_well_missing_counts` and written "
      "flat to `data/force2020_well_missingness.csv`, whose 20 curve columns match "
      "the curve table above. Counts, not fractions: a count is checkable "
      "against the well's own row count, which is also in the file.")
    a("")

    a("## 7. Proposed initial feature set (logs only)")
    a("")
    fs = report["proposed_feature_set"]
    a(f"**Core set, {fs['core_feature_count']} curves:** "
      + ", ".join(f"`{c}`" for c in fs["core_features"]))
    a("")
    a(f"*Derivation:* {fs['derivation']}.")
    a("")
    a(fs["rationale"])
    a("")
    a("### Core set, with the numbers that put each curve in it")
    a("")
    a("| Curve | Wells with data | Missing % |")
    a("|---|---:|---:|")
    for name, ev in fs["core_evidence"].items():
        a(f"| `{name}` | {ev['wells_with_data']}/{ev['train_well_count']} | "
          f"{pct(ev['missing_fraction'])} |")
    a("")
    a("### Masked candidates, with the numbers that keep them out for now")
    a("")
    if fs["masked_candidates"]:
        a("| Curve | Wells with data | Missing % |")
        a("|---|---:|---:|")
        for name, ev in fs["masked_evidence"].items():
            a(f"| `{name}` | {ev['wells_with_data']}/{ev['train_well_count']} | "
              f"{pct(ev['missing_fraction'])} |")
    else:
        a("None.")
    a("")
    a("- Masked candidates needing an explicit availability decision: "
      + (", ".join(f"`{c}`" for c in fs["masked_candidates"]) or "none"))
    a("- Sparse candidates held out of a first baseline: "
      + (", ".join(f"`{c}`" for c in fs["sparse_candidates"]) or "none"))
    a("")
    a(f"**Deferred decision:** {fs['masked_decision_deferred']}")
    a("")
    a("**Deliberately excluded, with the reason:**")
    a("")
    a("| Column | Reason |")
    a("|---|---|")
    for column, reason in fs["held_out"].items():
        a(f"| `{column}` | {cell(reason)} |")
    a("")
    a(f"**Depth ablation:** {fs['depth_ablation']}")
    a("")

    a("## 8. Proposed canonical ML row schema")
    a("")
    schema = report["proposed_ml_row_schema"]
    a(f"Grain: {schema['grain']}. Key: "
      + " + ".join(f"`{k}`" for k in schema["key"]) + ".")
    a("")
    a(f"Key is unique in the source: **{'yes' if schema['key_is_unique_in_source'] else 'NO'}**. "
      f"{schema['key_uniqueness_argument']}")
    a("")
    a("| Column | Type | Role | Note |")
    a("|---|---|---|---|")
    for column in schema["columns"]:
        a(f"| `{column['name']}` | `{column['dtype']}` | `{column['role']}` | "
          f"{cell(column['note'])} |")
    a("")
    a("Row counts at source grain: "
      + ", ".join(f"`{k}` {v:,}" for k, v in schema["row_counts"].items()) + ".")
    a("")
    for note in schema["notes"]:
        a(f"- {note}")
    a("")

    a("## 9. Data-quality concerns")
    a("")
    a("| ID | Severity | Where | Concern |")
    a("|---|---|---|---|")
    for concern in report["data_quality_concerns"]:
        a(f"| `{concern['id']}` | {concern['severity']} | `{concern['where']}` | "
          f"{cell(concern['detail'])} |")
    a("")

    a("## 10. Not performed at this stage")
    a("")
    for item in report["not_performed"]:
        a(f"- {item}")
    a("")
    return "\n".join(L)


def summarise(report: dict) -> str:
    ct = report["curve_table"]
    lines = [
        f"source            FORCE 2020 @ {report['source']['resolved_commit_sha'][:12]}",
        f"labelled rows     {report['class_table']['labelled_rows_total']:,}",
        f"classes           {report['class_table']['class_count']}",
        f"log curves        {ct['curve_count']}",
        f"core features     {report['proposed_feature_set']['core_feature_count']} "
        f"({', '.join(report['proposed_feature_set']['core_features'])})",
        f"masked candidates {len(report['proposed_feature_set']['masked_candidates'])}",
        f"sparse candidates {len(report['proposed_feature_set']['sparse_candidates'])}",
        f"split disjoint    {report['split']['disjoint']}",
        f"concerns          {len(report['data_quality_concerns'])}",
    ]
    return "\n".join(lines)


def render_well_missingness(report: dict) -> str:
    """Per-well, per-curve missing counts, so availability is auditable.

    Missing cell counts, not fractions: a count is checkable against the well's
    own row count, and a fraction loses the sample size that makes it
    interpretable. All 20 source curves get a column, in the same order as the
    curve table above, so no curve can be silently dropped from the audit trail.
    """
    counts = report["missingness"]["per_well_missing_counts"]
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(["well", "rows", "split", "source_file"] + list(LOG_CURVES))
    for well in sorted(counts):
        record = counts[well]
        writer.writerow([well, record["rows"], record["split"],
                         record["source_file"]]
                        + [record["missing"][c] for c in LOG_CURVES])
    return out.getvalue()


def _verify_one(name: str, path: Path, expected: str) -> bool:
    if not path.exists():
        print(f"  {name}: MISSING {path}")
        return False
    actual = path.read_text(encoding="utf-8")
    if actual == expected:
        print(f"  {name}: MATCH")
        return True
    print(f"  {name}: MISMATCH {path}")
    expected_lines = expected.splitlines()
    actual_lines = actual.splitlines()
    print(f"    {len(expected_lines)} expected lines, {len(actual_lines)} on disk")
    for i, (want, got) in enumerate(zip(expected_lines, actual_lines, strict=False), start=1):
        if want != got:
            print(f"    first difference at line {i}:")
            print(f"      expected: {want[:200]}")
            print(f"      on disk : {got[:200]}")
            break
    return False


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--source-root",
                    default=str(REPO_ROOT / "data" / "raw" / "force2020"),
                    help="FORCE 2020 checkout to read; nothing is downloaded")
    ap.add_argument("--json", default=str(REPORTS / "force2020_characterization.json"))
    ap.add_argument("--markdown",
                    default=str(REPORTS / "force2020_characterization.md"))
    ap.add_argument("--well-missingness",
                    default=str(REPO_ROOT / "data" / "force2020_well_missingness.csv"))
    ap.add_argument("--verify", action="store_true",
                    help="rebuild and compare against the committed artifacts")
    ap.add_argument("--print-summary", action="store_true")
    args = ap.parse_args(argv)

    report = build(Path(args.source_root))
    json_path = Path(args.json)
    md_path = Path(args.markdown)
    csv_path = Path(args.well_missingness)
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    markdown = render_markdown(report)
    well_csv = render_well_missingness(report)

    if args.verify:
        print("verify:")
        ok = True
        if not json_path.exists():
            print(f"  json: MISSING {json_path}")
            ok = False
        else:
            committed = json.loads(json_path.read_text(encoding="utf-8"))
            same = committed == report
            print(f"  json: {'MATCH' if same else 'MISMATCH'} {json_path}")
            if not same:
                ok = False
                for field in sorted(set(committed) | set(report)):
                    if committed.get(field) != report.get(field):
                        print(f"    differs: {field}")
        ok &= _verify_one("markdown", md_path, markdown)
        ok &= _verify_one("well-missingness", csv_path, well_csv)
        print("verify:", "MATCH" if ok else "MISMATCH")
        return 0 if ok else 1

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(payload, encoding="utf-8")
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(markdown, encoding="utf-8")
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(well_csv, encoding="utf-8")
    print(f"wrote {json_path}")
    print(f"wrote {md_path}")
    print(f"wrote {csv_path}")
    if args.print_summary:
        print()
        print(summarise(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
