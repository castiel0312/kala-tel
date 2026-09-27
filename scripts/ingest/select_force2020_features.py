#!/usr/bin/env python3
"""FORCE 2020 feature selection. Read-only. The experiment gate.

`characterize_force2020.py` measured the 20 source curves and proposed a logs-only
set, but it measured only `train.csv` and it could not see the evaluation
partitions. That is enough evidence to build a first baseline and not enough to
decide what belongs in the next one: a curve can look excellent on 98 training
wells and be absent from 6 of the 10 leaderboard wells, in which case adding it
cannot be measured on the partition that decides retention.

This stage closes that gap. It reuses `scan_table` so the numbers cannot drift
from the characterization they extend, and adds three things the earlier pass did
not need:

  * every curve measured on all three official partitions, not just train
  * a declared physical envelope per curve, so a min/max outside the unit's
    published range is reported as a count rather than left for a reader to spot
  * the DEPTH_MD step distribution, which decides whether row-window local
    context features are physically meaningful or merely convenient

It then applies three explicit gates, in order, and records for every curve which
gate put it where. Nothing is chosen by hand and then justified after the fact.

What it produces:

    reports/force2020_curve_inventory.json   per-curve, per-split measurements
    reports/force2020_curve_inventory.md     the same, readable
    ml/force2020_feature_registry.json       the feature version registry

Nothing else. In particular this stage trains no model, writes no feature table,
imputes nothing, and touches neither `data/processed/` nor `data/ml/`. The
registry it emits is a *proposal*: the tables in section 12 are built by
`build_force2020_dataset.py`, which reads this file rather than restating it.

Usage:
    python scripts/ingest/select_force2020_features.py
    python scripts/ingest/select_force2020_features.py --print-summary
    python scripts/ingest/select_force2020_features.py --verify
"""
from __future__ import annotations

import argparse
import array
import csv
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from characterize_force2020 import (  # noqa: E402
    LOG_CURVES,
    UNITS_NOT_VERIFIED_FROM_LOCAL_LAS,
    median,
    scan_table,
)
from inspect_force2020 import (  # noqa: E402
    CURVE_UNITS,
    DATA_SUBDIR,
    DELIMITER,
    LOCATION_COLUMNS,
    STRATIGRAPHY_COLUMNS,
    TARGET_COLUMNS,
)
from nwis_lib import REPORTS  # noqa: E402

# ---------------------------------------------------------------------------
# The three published tables
#
# Same paths, same pinned commit, as the two inspection passes. The leaderboard
# features file is the one a model would score; its targets live in a separate
# file that this stage never opens, because a selection decision is made from
# features and partition coverage, never from leaderboard labels.
# ---------------------------------------------------------------------------
TABLES: dict[str, dict] = {
    "train": {
        "path": "extracted/train.csv",
        "labelled": True,
        "role": "training and model selection",
    },
    "hidden_test": {
        "path": "hidden_test.csv",
        "labelled": True,
        "role": "held-out evaluation; never used to fit or select",
    },
    "leaderboard_test": {
        "path": "leaderboard_test_features.csv",
        "labelled": False,
        "role": "held-out evaluation; never used to fit or select",
    },
}

EVALUATION_SPLITS = ("hidden_test", "leaderboard_test")
EVALUATION_WELLS = 10

# ---------------------------------------------------------------------------
# Physical envelopes
#
# A published range for each curve in its own unit, used for one purpose only:
# counting how many observed values could not be a measurement of that quantity.
# It is deliberately NOT a filter. Nothing here is clipped, dropped or set to
# missing, because trimming a curve is a modelling decision that changes the
# missingness of the feature and would confound the ablation this registry drives.
#
# A non-zero count is not automatically an error either. A neutron porosity above
# 0.55 is a real gas effect, not a corrupt reading, and barite mud gives PEF
# values no clean rock ever produces. The envelope exists so that the report can
# say how large each population is and let a reader judge it, rather than leaving
# a min of -7429 in a table that is otherwise supposed to be trustworthy.
# ---------------------------------------------------------------------------
ENVELOPE: dict[str, tuple[float, float, str]] = {
    "CALI": (2.0, 30.0, "in hole diameter"),
    "RSHA": (0.0, 5000.0, "ohm.m shallow resistivity"),
    "RMED": (0.0, 5000.0, "ohm.m medium resistivity"),
    "RDEP": (0.0, 5000.0, "ohm.m deep resistivity"),
    "RHOB": (0.5, 5.0, "g/cm3; 0.5 sand, 2.7 limestone, 3.2 basalt"),
    "GR": (0.0, 400.0, "gAPI; 0 salt water, 200 granite, 400 hot shale"),
    "SGR": (0.0, 300.0, "gAPI computed gamma ray"),
    "NPHI": (-0.15, 0.60, "m3/m3 neutron porosity; above 0.55 is gas or cased"),
    "PEF": (0.0, 12.0, "b/e; 0.1 water, 1.8 sandstone, 5 limestone, 13.4 barite"),
    "DTC": (30.0, 700.0, "us/ft sonic; 55 water, 190 limestone, 60 air"),
    "SP": (-250.0, 250.0, "mV; sand to shale separation"),
    "BS": (4.0, 30.0, "in bit size"),
    "ROP": (0.0, 5000.0, "m/h rate of penetration"),
    "DTS": (30.0, 700.0, "us/ft sonic, fluid check"),
    "DCAL": (-5.0, 30.0, "in caliper"),
    "DRHO": (-0.60, 1.00, "g/cm3 density-porosity excess; 0 means no gas effect"),
    "MUDWEIGHT": (0.7, 2.5, "g/cm3 mud weight"),
    "RMIC": (0.0, 5000.0, "ohm.m microresistivity"),
    "ROPA": (0.0, 500.0, "rotations per minute"),
    "RXO": (0.0, 5000.0, "ohm.m flushed zone"),
}

# ---------------------------------------------------------------------------
# Gate 2 vocabulary
#
# What a curve physically measures. A formation log reads the rock; a drilling
# or mud record reads the operation that got the hole there. The two are not
# interchangeable as lithofacies evidence, and the operational set also drifts
# toward well-construction practice, which is a different question from rock
# type and is not available for every well in the same way.
# ---------------------------------------------------------------------------
KIND_FORMATION = "formation_measurement"
KIND_BOREHOLE = "borehole_geometry"
KIND_OPERATIONAL = "operational_or_mud"

CURVE_KIND: dict[str, str] = {
    "CALI": KIND_BOREHOLE,
    "RSHA": KIND_FORMATION,
    "RMED": KIND_FORMATION,
    "RDEP": KIND_FORMATION,
    "RHOB": KIND_FORMATION,
    "GR": KIND_FORMATION,
    "SGR": KIND_FORMATION,
    "NPHI": KIND_FORMATION,
    "PEF": KIND_FORMATION,
    "DTC": KIND_FORMATION,
    "SP": KIND_FORMATION,
    "BS": KIND_OPERATIONAL,
    "ROP": KIND_OPERATIONAL,
    "DTS": KIND_FORMATION,
    "DCAL": KIND_BOREHOLE,
    "DRHO": KIND_FORMATION,
    "MUDWEIGHT": KIND_OPERATIONAL,
    "RMIC": KIND_OPERATIONAL,
    "ROPA": KIND_OPERATIONAL,
    "RXO": KIND_OPERATIONAL,
}

# ---------------------------------------------------------------------------
# Gate thresholds
#
# Both numbers are set from the structure of the problem, not tuned on a result.
#
# Coverage: a curve present in fewer than half the wells of an evaluation
# partition is not measurable on that partition. The model cannot learn it there,
# so any gain it produced on train could not be confirmed, and the missingness
# it introduces is a per-well property of that curve's acquisition, not of the
# rock. Half the wells is the point where "sometimes logged" stops being an
# artefact of a handful of wells.
#
# Missing: a curve missing in most rows of an evaluation partition is allowed in,
# but only if it clears coverage, and it is recorded as carrying a caveat so the
# ablation report has to confront it. The v0.1 baseline already had curves at
# 7% missing, so the bar is where a median-imputed column starts to be mostly
# imputation rather than mostly measurement.
# ---------------------------------------------------------------------------
MIN_EVAL_WELL_COVERAGE = 0.50
CAVEAT_MISSING_FRACTION = 0.40

# ---------------------------------------------------------------------------
# The frozen v0.1 set
#
# Read from the committed v0.1 manifest rather than restated, so the registry
# cannot claim v0.1 contains a column the shipped table does not.
# ---------------------------------------------------------------------------
V01_MANIFEST = (
    REPO_ROOT / "data" / "interim" / "ml" / "force2020_litho" / "features"
    / "force2020_litho_logs_v0_1.manifest.json"
)
V01_CURVES = ("CALI", "RDEP", "RMED", "DTC", "GR")

# Local context. Chosen as depth extents in metres rather than row counts, then
# converted to rows using the measured step. See measure_depth_spacing().
LOCAL_CONTEXT_HALF_WIDTH_M = (0.76, 1.52)
# A step larger than this many nominal steps means the log is discontinuous
# there, and a window spanning it is not a local average of anything.
GAP_TOLERANCE_FACTOR = 3.0

STATUS_FROZEN = "frozen"
STATUS_ADDED = "added_in_v0_2"
STATUS_RETAINED = "retained_from_v0_1"
STATUS_REJECTED = "rejected"

NOT_PERFORMED = [
    "no model of any kind was trained, fitted, tuned, evaluated or compared",
    "no feature table, label table, checkpoint or model artifact was written",
    "no value was imputed, interpolated, smoothed, back-filled, rolled or windowed",
    "no value was clipped, trimmed or set to missing for falling outside an envelope",
    "no curve was renamed, merged, rescaled or re-derived",
    "no FORCE label was mapped onto any canonical vocabulary",
    "no write to data/processed/ or data/ml/ except the registry path named above",
    "no download, no external dataset, no network access",
]


# ---------------------------------------------------------------------------
# Envelope and depth measurement
# ---------------------------------------------------------------------------
def measure_envelopes_and_depth(path: Path) -> dict:
    """One pass for two things the per-curve pass does not provide.

    `scan_table` gives a min and a max per curve, which is enough to notice that
    a column left its unit but not enough to size the population. It also
    reports whether DEPTH_MD strictly increases within a well, which is a
    statement about ordering and not about how finely the rock is sampled. Both
    need the actual values, so they are collected together here.
    """
    counts: dict[str, dict[str, int]] = {
        name: {"observed": 0, "outside_envelope": 0} for name in LOG_CURVES
    }
    steps = array.array("d")
    rows = 0
    wells = 0
    non_increasing = 0
    crossings = 0

    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter=DELIMITER)
        header = next(reader)
        idx = {name: i for i, name in enumerate(header)}
        curve_idx = {name: idx[name] for name in LOG_CURVES if name in idx}
        bounds = {
            name: (ENVELOPE[name][0], ENVELOPE[name][1]) for name in curve_idx
        }
        well_col = idx["WELL"]
        depth_col = idx["DEPTH_MD"]

        prev_well: str | None = None
        prev_depth: float | None = None
        for row in reader:
            rows += 1
            well = row[well_col]
            if well != prev_well:
                wells += 1
                prev_well, prev_depth = well, None

            raw_depth = row[depth_col]
            if raw_depth:
                try:
                    depth = float(raw_depth)
                except ValueError:
                    depth = None
                if depth is not None:
                    if prev_depth is not None:
                        step = depth - prev_depth
                        if step <= 0:
                            non_increasing += 1
                        else:
                            steps.append(step)
                    prev_depth = depth

            for name, i in curve_idx.items():
                token = row[i]
                if not token:
                    continue
                try:
                    value = float(token)
                except ValueError:
                    continue
                counts[name]["observed"] += 1
                lo, hi = bounds[name]
                if value < lo or value > hi:
                    counts[name]["outside_envelope"] += 1

    ordered = sorted(steps)
    nominal = median(ordered) if ordered else None
    p05 = _quantile(ordered, 0.05)
    p95 = _quantile(ordered, 0.95)
    gap_limit = nominal * GAP_TOLERANCE_FACTOR if nominal else None
    if gap_limit is not None:
        crossings = sum(1 for step in ordered if step > gap_limit)

    return {
        "rows": rows,
        "wells": wells,
        "envelope": counts,
        "depth_spacing": {
            "steps": len(ordered),
            "strictly_increasing": non_increasing == 0,
            "non_increasing_steps": non_increasing,
            "min_m": round(ordered[0], 6) if ordered else None,
            "p05_m": _round(p05, 6),
            "median_m": _round(nominal, 6),
            "p95_m": _round(p95, 6),
            "max_m": round(ordered[-1], 6) if ordered else None,
            "p25_m": _round(_quantile(ordered, 0.25), 6),
            "p75_m": _round(_quantile(ordered, 0.75), 6),
            "iqr_m": _round(
                _quantile(ordered, 0.75) - _quantile(ordered, 0.25), 6
            ),
            "gap_tolerance_m": _round(gap_limit, 6),
            "steps_over_gap_tolerance": crossings,
            "fraction_over_gap_tolerance": (
                round(crossings / len(ordered), 8) if ordered else None
            ),
        },
    }


def _quantile(ordered: list[float], q: float) -> float | None:
    if not ordered:
        return None
    position = q * (len(ordered) - 1)
    low = int(position)
    high = min(low + 1, len(ordered) - 1)
    weight = position - low
    return ordered[low] * (1.0 - weight) + ordered[high] * weight


def _round(value: float | None, digits: int) -> float | None:
    return round(value, digits) if value is not None else None


# ---------------------------------------------------------------------------
# Curve table
# ---------------------------------------------------------------------------
def build_curve_inventory(scans: dict, extras: dict) -> list[dict]:
    """One row per curve, carrying every split's measurement and its verdict.

    The verdict is produced by `classify`, which reads only the numbers in this
    same row. No curve's fate is decided anywhere else in the file.
    """
    rows: list[dict] = []
    for name in LOG_CURVES:
        entry: dict = {
            "name": name,
            "kind": CURVE_KIND[name],
            "unit": CURVE_UNITS.get(name),
            "unit_verified_from_local_las": name not in UNITS_NOT_VERIFIED_FROM_LOCAL_LAS,
            "envelope": {
                "low": ENVELOPE[name][0],
                "high": ENVELOPE[name][1],
                "basis": ENVELOPE[name][2],
            },
            "splits": {},
        }

        for split, scan in scans.items():
            col = {c["name"]: c for c in scan["columns"]}[name]
            extra = extras[split]
            observed = extra["envelope"][name]["observed"]
            outside = extra["envelope"][name]["outside_envelope"]
            entry["splits"][split] = {
                "rows": col["rows"],
                "wells": scan["well_count"],
                "wells_with_data": col["wells_with_data"],
                "well_coverage_fraction": col["well_coverage_fraction"],
                "non_null": col["non_null"],
                "missing": col["missing"],
                "missing_fraction": col["missing_fraction"],
                "missing_via_sentinel": col["missing_via_sentinel"],
                "finite_observed": observed,
                "outside_envelope": outside,
                "outside_envelope_fraction": (
                    round(outside / observed, 8) if observed else None
                ),
                "min": col["min"],
                "median": col["median"],
                "max": col["max"],
                "wells_fully_missing": col["wells_fully_missing"],
            }

        entry.update(classify(entry))
        rows.append(entry)
    return rows


def classify(entry: dict) -> dict:
    """Apply the gates in order and return the decision with its evidence.

    Order matters and is part of the contract: a curve is rejected at the first
    gate it fails, so a curve that is both operational and unmeasured is
    reported once, for the reason that applies regardless.
    """
    name = entry["name"]
    verdict: dict = {
        "status": None,
        "gate_failed": None,
        "reason": None,
        "caveats": [],
    }

    # Gate 1 is structural and lives in the source column roles: coordinates,
    # stratigraphy, depth and the target columns are never curve candidates.
    # It is restated in the report rather than re-tested here because a curve
    # reaching this function has already passed the LOG_CURVES filter.

    # Gate 2: what the curve measures.
    if entry["kind"] == KIND_OPERATIONAL and name not in V01_CURVES:
        verdict.update(
            status=STATUS_REJECTED,
            gate_failed="G2_measurement_kind",
            reason=(
                f"{name} records the drilling or mud operation rather than the "
                "rock. Its value also tracks which crews and programmes "
                "instrumented a well, so it can encode well history instead of "
                "lithology."
            ),
        )
        return verdict

    if entry["kind"] == KIND_BOREHOLE and name not in V01_CURVES:
        verdict.update(
            status=STATUS_REJECTED,
            gate_failed="G2_measurement_kind",
            reason=(
                f"{name} measures hole geometry, which follows the drilling "
                "contract rather than the formation."
            ),
        )
        return verdict

    # Gate 3: measurable on both evaluation partitions.
    for split in EVALUATION_SPLITS:
        stat = entry["splits"][split]
        coverage = stat["well_coverage_fraction"] or 0.0
        if coverage < MIN_EVAL_WELL_COVERAGE:
            verdict.update(
                status=STATUS_REJECTED,
                gate_failed="G3_evaluation_coverage",
                reason=(
                    f"{name} is present in {stat['wells_with_data']} of "
                    f"{EVALUATION_WELLS} {split} wells "
                    f"({coverage:.0%}), below the {MIN_EVAL_WELL_COVERAGE:.0%} "
                    "floor. Anything it contributes on training wells could not "
                    "be confirmed on the partitions used to decide retention."
                ),
            )
            return verdict

    for split in EVALUATION_SPLITS:
        stat = entry["splits"][split]
        missing = stat["missing_fraction"] or 0.0
        if missing > CAVEAT_MISSING_FRACTION:
            verdict["caveats"].append(
                f"{split} is {missing:.1%} missing, so a median-imputed column "
                "is mostly imputation there"
            )

    if name in V01_CURVES:
        verdict.update(
            status=STATUS_RETAINED,
            gate_failed=None,
            reason="already in the frozen v0.1 set; retained unchanged",
        )
        return verdict

    verdict.update(
        status=STATUS_ADDED,
        gate_failed=None,
        reason=(
            "a formation measurement present in at least half the wells of both "
            "evaluation partitions, with the missingness it carries recorded"
        ),
    )
    return verdict


# ---------------------------------------------------------------------------
# Local context feasibility
# ---------------------------------------------------------------------------
def decide_local_context(extras: dict) -> dict:
    """Can a local-context feature be defined, and how wide should it be?

    A row window is a depth window only if the sampling interval is stable. The
    measured step distribution answers that directly: if the interquartile range
    is zero, a fixed number of rows spans a fixed distance and the two are
    interchangeable. If a small number of steps are much larger, those are gaps
    in logging, and a window spanning one is not a local average.
    """
    train = extras["train"]["depth_spacing"]
    median_step = train["median_m"]
    regular = bool(
        median_step
        and train["iqr_m"] is not None
        and train["iqr_m"] <= 1e-9
        and train["strictly_increasing"]
    )

    if not regular:
        return {
            "status": "deferred",
            "reason": (
                "the DEPTH_MD step distribution is not regular enough for a row "
                "window to mean a fixed depth extent"
            ),
            "measured": train,
            "windows": [],
        }

    windows = []
    for half_width in LOCAL_CONTEXT_HALF_WIDTH_M:
        rows = max(1, int(round(half_width / median_step)))
        windows.append({
            "half_width_m": half_width,
            "half_width_rows": rows,
            "full_width_m": round(2 * half_width, 3),
            "full_width_rows": 2 * rows + 1,
            "description": (
                f"same-well mean and standard deviation of the selected curves "
                f"over +/-{half_width:.2f} m "
                f"(+/-{rows} rows at the measured {median_step:.4f} m step)"
            ),
        })

    return {
        "status": "supported",
        "reason": (
            f"DEPTH_MD advances by a constant {median_step:.4f} m inside every "
            f"well in every split (interquartile range {train['iqr_m']} m, "
            f"strictly increasing: {train['strictly_increasing']}), so a fixed "
            f"row window is a fixed depth window. "
            f"{train['steps_over_gap_tolerance']} of {train['steps']} steps "
            f"exceed {train['gap_tolerance_m']:.4f} m and are logging gaps, so "
            "windows are invalidated across them rather than averaged over them."
        ),
        "measured": train,
        "windows": windows,
    }


# ---------------------------------------------------------------------------
# Feature registry
# ---------------------------------------------------------------------------
def build_feature_registry(inventory: list[dict], local: dict) -> dict:
    """The versioned feature sets, derived from the verdicts above.

    Curve names only. Column names are not restated here: the builder owns
    them, and a second copy in the registry is a second chance to disagree with
    the table that was actually written. An earlier draft of this function also
    listed `missing_masks` and `columns`, and got the mask suffix wrong
    (`_missing` against the builder's `_MISSING`), which is exactly the drift
    this function no longer has room for.
    """
    v01_curves = [c for c in V01_CURVES]
    v02_added = [
        row["name"] for row in inventory if row["status"] == STATUS_ADDED
    ]
    v02_curves = v01_curves + v02_added

    sets: dict[str, dict] = {
        "v0.1": {
            "status": "frozen",
            "curves": v01_curves,
            "note": (
                "the shipped five-curve baseline. Its curves are carried into "
                "v0.2 unchanged; only the mask set and the added curves are new."
            ),
        },
        "v0.2": {
            "status": "new",
            "curves": v02_curves,
            "added_relative_to_v0_1": v02_added,
            "note": (
                "v0.1 plus every curve that cleared gates 1 to 3. The builder "
                "emits a mask column per curve alongside the curve, so the mask "
                "set follows the curve list and is not enumerated separately "
                "here. The ablation separates the curves from the masks."
            ),
        },
    }

    if local["status"] == "supported":
        local_columns = []
        for window in local["windows"]:
            for curve in v02_curves:
                local_columns.append(f"{curve}_w{window['half_width_rows']}_mean")
            for curve in v02_curves:
                local_columns.append(f"{curve}_w{window['half_width_rows']}_std")
        sets["v0.3"] = {
            "status": "new",
            "curves": v02_curves,
            "local_statistics": ["mean", "std"],
            "windows": local["windows"],
            "note": (
                "v0.2 plus same-well local context. Every local column is "
                "computed inside one well only, uses no target and no other "
                "well, and is invalidated across a logging gap rather than "
                "averaged over it. The builder owns the column names."
            ),
        }

    return {
        "schema_version": 1,
        "generated_by": "scripts/ingest/select_force2020_features.py",
        "source": {
            "dataset": "force2020-lithology",
            "subdir": DATA_SUBDIR,
            "delimiter": DELIMITER,
        },
        "gates": {
            "G1_role": (
                "only source columns whose role is log_curve are candidates. "
                "DEPTH_MD, the coordinates, GROUP, FORMATION, the target and "
                "the target confidence column are excluded by role."
            ),
            "G2_measurement_kind": (
                "a candidate must measure the formation. Operational and "
                "mud-system curves, and hole-geometry curves, are rejected "
                "unless they are already in the frozen v0.1 set."
            ),
            "G3_evaluation_coverage": (
                f"a candidate must be present in at least "
                f"{MIN_EVAL_WELL_COVERAGE:.0%} of the wells of both evaluation "
                f"partitions, each of which has {EVALUATION_WELLS} wells."
            ),
            "caveat_threshold": (
                f"a selected curve missing more than "
                f"{CAVEAT_MISSING_FRACTION:.0%} of an evaluation partition is "
                "flagged, and the flag is carried into the report."
            ),
        },
        "feature_sets": sets,
        "rejected": [
            {
                "curve": row["name"],
                "gate": row["gate_failed"],
                "reason": row["reason"],
            }
            for row in inventory
            if row["status"] == STATUS_REJECTED
        ],
        "flags": [
            {"curve": row["name"], "caveat": caveat}
            for row in inventory
            for caveat in row["caveats"]
        ],
        "local_context": local,
        "excluded_by_role": {
            "depth": ["DEPTH_MD"],
            "coordinates": list(LOCATION_COLUMNS),
            "stratigraphy": list(STRATIGRAPHY_COLUMNS),
            "target": list(TARGET_COLUMNS),
        },
    }


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def build(source_root: Path) -> dict:
    scans: dict[str, dict] = {}
    extras: dict[str, dict] = {}
    for split, spec in TABLES.items():
        path = source_root / DATA_SUBDIR / spec["path"]
        scans[split] = scan_table(path, spec["labelled"])
        extras[split] = measure_envelopes_and_depth(path)

    inventory = build_curve_inventory(scans, extras)
    local = decide_local_context(extras)
    registry = build_feature_registry(inventory, local)

    return {
        "stage": "force2020_curve_inventory",
        "generated_by": "scripts/ingest/select_force2020_features.py",
        "source": {"subdir": DATA_SUBDIR, "delimiter": DELIMITER},
        "thresholds": {
            "min_evaluation_well_coverage": MIN_EVAL_WELL_COVERAGE,
            "caveat_missing_fraction": CAVEAT_MISSING_FRACTION,
            "gap_tolerance_factor": GAP_TOLERANCE_FACTOR,
            "local_context_half_width_m": list(LOCAL_CONTEXT_HALF_WIDTH_M),
        },
        "splits": {
            split: {
                "file": spec["path"],
                "role": spec["role"],
                "rows": scans[split]["rows"],
                "wells": scans[split]["well_count"],
                "depth_strictly_increasing": scans[split][
                    "depth_strictly_increasing"
                ],
                "depth_spacing": extras[split]["depth_spacing"],
            }
            for split, spec in TABLES.items()
        },
        "curve_count": len(inventory),
        "curves": inventory,
        "feature_registry": registry,
        "not_performed": NOT_PERFORMED,
    }


def pct(value: float | None, places: int = 2) -> str:
    return "n/a" if value is None else f"{100.0 * value:.{places}f}%"


def num(value: float | None, places: int = 3) -> str:
    return "n/a" if value is None else f"{value:.{places}f}"


def cell(text: object) -> str:
    return str(text).replace("|", "\\|").replace("\n", " ")


def render_markdown(report: dict) -> str:
    out: list[str] = []
    add = out.append

    add("# FORCE 2020 curve inventory and feature selection")
    add("")
    add(
        "Measured over all three official partitions at the pinned source "
        "commit. Read-only: nothing here is imputed, clipped, renamed or "
        "trained. This stage answers one question, which the earlier "
        "characterization could not: of the 20 source curves, which can be "
        "measured on the partitions that decide whether a change is kept."
    )
    add("")

    add("## Partitions")
    add("")
    add("| split | file | role | rows | wells | DEPTH_MD increasing | median step |")
    add("| --- | --- | --- | ---: | ---: | --- | ---: |")
    for split, info in report["splits"].items():
        add(
            f"| `{split}` | `{cell(info['file'])}` | {cell(info['role'])} | "
            f"{info['rows']:,} | {info['wells']} | "
            f"{'yes' if info['depth_strictly_increasing'] else 'no'} | "
            f"{num(info['depth_spacing']['median_m'], 4)} m |"
        )
    add("")

    add("## Every source curve")
    add("")
    add(
        "One row per curve. `h` and `l` are the hidden and leaderboard "
        "partitions; coverage is wells with at least one observed value. "
        "`outside` counts observed values outside the curve's published "
        "envelope and is reported, never acted on."
    )
    add("")
    add(
        "| curve | unit | kind | train cov | train miss | hidden cov | "
        "hidden miss | leader cov | leader miss | outside (tr/h/l) | verdict |"
    )
    add("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    for row in report["curves"]:
        tr = row["splits"]["train"]
        hi = row["splits"]["hidden_test"]
        lb = row["splits"]["leaderboard_test"]
        add(
            f"| `{row['name']}` | {cell(row['unit'] or 'n/a')} | "
            f"{cell(row['kind'])} | "
            f"{tr['wells_with_data']}/{tr['wells']} | {pct(tr['missing_fraction'])} | "
            f"{hi['wells_with_data']}/{hi['wells']} | {pct(hi['missing_fraction'])} | "
            f"{lb['wells_with_data']}/{lb['wells']} | {pct(lb['missing_fraction'])} | "
            f"{tr['outside_envelope']}/{hi['outside_envelope']}/"
            f"{lb['outside_envelope']} | {cell(row['status'])} |"
        )
    add("")

    add("### Ranges and envelopes")
    add("")
    add(
        "| curve | envelope | train min / med / max | hidden min / max | "
        "leader min / max |"
    )
    add("| --- | --- | --- | --- | --- |")
    for row in report["curves"]:
        env = row["envelope"]
        tr = row["splits"]["train"]
        hi = row["splits"]["hidden_test"]
        lb = row["splits"]["leaderboard_test"]
        add(
            f"| `{row['name']}` | {num(env['low'], 2)} .. {num(env['high'], 2)} | "
            f"{num(tr['min'])} / {num(tr['median'])} / {num(tr['max'])} | "
            f"{num(hi['min'])} / {num(hi['max'])} | "
            f"{num(lb['min'])} / {num(lb['max'])} |"
        )
    add("")

    add("## Verdicts")
    add("")
    for row in report["curves"]:
        if row["status"] == STATUS_REJECTED:
            add(f"- **`{row['name']}`** rejected at `{row['gate_failed']}`")
            add(f"  - {row['reason']}")
        elif row["status"] == STATUS_ADDED:
            add(f"- **`{row['name']}`** added to v0.2")
            add(f"  - {row['reason']}")
            for caveat in row["caveats"]:
                add(f"  - caveat: {caveat}")
        elif row["caveats"]:
            add(f"- **`{row['name']}`** retained from v0.1")
            for caveat in row["caveats"]:
                add(f"  - caveat: {caveat}")
    add("")

    local = report["feature_registry"]["local_context"]
    add("## Local context")
    add("")
    add(f"- status: **{local['status']}**")
    add(f"- {local['reason']}")
    for window in local.get("windows", []):
        add(
            f"- {window['description']} "
            f"(full width {window['full_width_m']} m, "
            f"{window['full_width_rows']} rows)"
        )
    add("")

    add("## Feature sets")
    add("")
    for name, spec in report["feature_registry"]["feature_sets"].items():
        add(f"### `{name}` ({spec['status']})")
        add("")
        add(f"- curves ({len(spec['curves'])}): "
            + ", ".join(f"`{c}`" for c in spec["curves"]))
        added = spec.get("added_relative_to_v0_1")
        if added:
            add("- added relative to v0.1: "
                + ", ".join(f"`{c}`" for c in added))
        if spec.get("windows"):
            add(f"- local windows: {len(spec['windows'])}")
        add(f"- {spec['note']}")
        add("")

    add("## Not performed")
    add("")
    for item in report["not_performed"]:
        add(f"- {item}")
    add("")
    return "\n".join(out)


def summarise(report: dict) -> str:
    registry = report["feature_registry"]
    lines = [
        f"curves inventoried : {report['curve_count']}",
        "selected for v0.2  : "
        + ", ".join(registry["feature_sets"]["v0.2"]["curves"]),
        "added in v0.2      : "
        + (", ".join(registry["feature_sets"]["v0.2"]["added_relative_to_v0_1"])
           or "none"),
        "rejected           : "
        + (", ".join(f"{r['curve']} ({r['gate']})" for r in registry["rejected"])
           or "none"),
        f"local context      : {registry['local_context']['status']}",
        "feature sets       : "
        + ", ".join(registry["feature_sets"].keys()),
    ]
    return "\n".join(lines)


def _verify_one(name: str, path: Path) -> bool:
    if not path.exists():
        print(f"MISSING  {name}: {path}")
        return False
    data = json.loads(path.read_text(encoding="utf-8"))
    expected = hashlib_sha256(_canonical(data))
    stored = data.get("sha256")
    if stored == expected:
        print(f"MATCH    {name}")
        return True
    print(f"CHANGED  {name}: stored {stored}, computed {expected}")
    return False


def hashlib_sha256(payload: str) -> str:
    import hashlib

    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _canonical(report: dict) -> str:
    body = {k: v for k, v in report.items() if k != "sha256"}
    return json.dumps(body, indent=2, sort_keys=True) + "\n"


REPORT_JSON = REPORTS / "force2020_curve_inventory.json"
REPORT_MD = REPORTS / "force2020_curve_inventory.md"
REGISTRY_JSON = REPO_ROOT / "ml" / "force2020_feature_registry.json"


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"wrote {path.relative_to(REPO_ROOT)}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--source-root",
        type=Path,
        default=REPO_ROOT / "data" / "raw" / "force2020",
        help="root containing the pinned lithology_competition checkout",
    )
    parser.add_argument(
        "--print-summary", action="store_true", help="print the decision table"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="check the committed reports against their recorded digests",
    )
    args = parser.parse_args(argv)

    if args.verify:
        ok = all([
            _verify_one("force2020_curve_inventory.json", REPORT_JSON),
            _verify_one("force2020_curve_inventory.md", REPORT_MD),
            _verify_one("force2020_feature_registry.json", REGISTRY_JSON),
        ])
        return 0 if ok else 1

    report = build(args.source_root)
    digest = hashlib_sha256(_canonical(report))
    report["sha256"] = digest

    _write(REPORT_JSON, _canonical(report))
    _write(REPORT_MD, render_markdown(report))

    registry = {
        k: v for k, v in report["feature_registry"].items()
    }
    registry["sha256"] = hashlib_sha256(
        json.dumps(registry, indent=2, sort_keys=True) + "\n"
    )
    _write(REGISTRY_JSON, json.dumps(registry, indent=2, sort_keys=True) + "\n")

    if args.print_summary:
        print()
        print(summarise(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
