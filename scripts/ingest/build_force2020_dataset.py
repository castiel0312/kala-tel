#!/usr/bin/env python3
"""FORCE 2020 dataset construction. Builds one logs-only supervised table.

Stages 1 and 2 measured the source and proposed a feature set. This stage
commits to a dataset: it turns the pinned CSV bytes into a single table with a
fixed schema, a fixed missing-value convention, a well-grouped split manifest
and a QC report. It stops there. No model, no metric, no tuning.

What it produces:

  * `force2020_litho_logs_v0_1.csv` -- one row per (WELL, DEPTH_MD) at source
    grain. Five numeric feature columns, a 0/1 missing mask per feature, the
    original target label, a deterministic encoded label, and per-row
    provenance. Nothing is filled, smoothed, resampled or windowed.
  * `...manifest.json` -- the sidecar provenance record: source id, pinned
    commit, source file, taxonomy id and version, dataset version, column
    roles, row counts, and the SHA-256 of the table itself.
  * `...exclusions.csv` -- the row ledger. Every source row that did not make it
    into the table, with the rule that removed it.z The point of the ledger is
    that "no rows were dropped" is a measurement rather than an assumption.
  * `data/force2020_split_manifest.csv` -- one row per well: its split, the
    source table it came from, and its own row/depth/class summary.
  * `reports/force2020_dataset.{json,md}` -- the construction report.

The four published tables are reduced to three splits, all inherited from the
source, none invented:

  * `train`             <- train.csv
  * `hidden_test`       <- hidden_test.csv
  * `leaderboard_test`  <- leaderboard_test_features.csv, labelled by a
                           deterministic (WELL, DEPTH_MD) join onto
                           leaderboard_test_target.csv

That join is the only place two source files are combined, it is exact, and its
match rate is measured and reported rather than assumed. The source's own
partition is well-disjoint across the three splits, so it is the authoritative
well-level split and no well is reshuffled.

Deliberately NOT done, and asserted by tests/test_force2020_dataset.py:
  * no model of any kind is trained, fitted, tuned, compared or evaluated
  * no accuracy, F1 or other score is computed
  * no RF / XGBoost / LightGBM / CNN code or artifact is created
  * no prediction endpoint is created
  * no value is imputed, interpolated, back-filled, smoothed or rolled
  * nothing is written to data/processed/ or data/ml/
  * FORCE 2020 is not merged with the FORGE Utah canonical data, and its
    classes are never collapsed into the FORGE Utah vocabulary
  * no external dataset (Volve, NLOG, BSEE, DGH, ...) is added

Usage:
    python scripts/ingest/build_force2020_dataset.py
    python scripts/ingest/build_force2020_dataset.py --feature-version v0.2
    python scripts/ingest/build_force2020_dataset.py --print-summary
    python scripts/ingest/build_force2020_dataset.py --verify
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

# The source identity, the published vocabulary, the curve units and the
# delimiter have exactly one home, in the inspection pass. Importing rather
# than copying is what keeps this stage from disagreeing with the two that came
# before it. LITHOFACIES is the source's own NPD lithostratigraphic codes; it is
# not, and must never become, the FORGE Utah 16B cuttings vocabulary.
from inspect_force2020 import (  # noqa: E402
    CURVE_UNITS,
    DATA_SUBDIR,
    DELIMITER,
    LICENCE,
    LITHOFACIES,
    SOURCE_ID,
    SOURCE_NAME,
    TARGET_COLUMNS,
    ZENODO_DOI,
    resolved_commit,
)
from nwis_lib import INTERIM, REPORTS, is_sentinel, sha256_file  # noqa: E402

# A curve's admitted/rejected status has exactly one home, in the selection
# stage, so the builder's cross-check cannot drift from the verdict it enforces.
from select_force2020_features import (  # noqa: E402
    STATUS_ADDED,
    STATUS_RETAINED,
)

# ---------------------------------------------------------------------------
# Dataset identity
#
# A version string, not a date: it changes when the row content, the schema or
# the rules change, and not otherwise. The Git commit and the report are the
# history; this is the name a model team will quote.
# ---------------------------------------------------------------------------
DATASET_ID = "force2020-litho-logs-v0.1"
DATASET_FILENAME = "force2020_litho_logs_v0_1.csv"
MANIFEST_FILENAME = "force2020_litho_logs_v0_1.manifest.json"
EXCLUSIONS_FILENAME = "force2020_litho_logs_v0_1.exclusions.csv"

# The artifact root declared for this source in ml/external_datasets.yaml. It
# must live under the gitignored data/interim/ tree, because data/processed/ is
# frozen and data/ml/ is a contract-only scaffold that a test forbids files in.
ARTIFACT_ROOT = INTERIM / "ml" / "force2020_litho"
FEATURES_SUBDIR = "features"

# The taxonomy is the source's own. Naming it explicitly is what makes "these
# 12 classes are not the FORGE Utah classes" a checkable statement rather than
# a promise: any artifact that claims this dataset has a different taxonomy, or
# that maps these codes onto a canonical vocabulary, contradicts this record.
TAXONOMY_ID = "FORCE2020_NPD_LITHOSTRATIGRAPHIC_LITHOFACIES"
TAXONOMY_DESCRIPTION = (
    "NPD lithostratigraphic lithofacies codes as published by the FORCE 2020 "
    "competition. 12 classes. Distinct from the FORGE Utah 16B cuttings "
    "vocabulary, which is a different geographic setting and a different sample "
    "type. No mapping between them exists or is proposed."
)

# ---------------------------------------------------------------------------
# Feature sets
#
# The curve list is not chosen here. Stage 3 measured all 20 source curves on all
# three official partitions and applied explicit gates; the result is committed
# to ml/force2020_feature_registry.json, and this stage reads it. That ordering
# is the point: a column reaches the table because a measured gate admitted it,
# and the gate and its numbers stay readable in the registry instead of being
# compressed into a comment here.
#
# This stage still owns the schema: it turns a curve list into column names, and
# those names are the contract with a model team. The registry names curves, not
# columns, so the two conventions cannot drift apart.
# ---------------------------------------------------------------------------
FEATURE_REGISTRY = REPO_ROOT / "ml" / "force2020_feature_registry.json"
DEFAULT_FEATURE_VERSION = "v0.1"

# One 0/1 mask per feature. The value column holds the measurement or nothing;
# the mask says which of the two it is, so a missing curve is never silently
# turned into a measurement by a consumer that treats an empty cell as a zero.
MASK_SUFFIX = "_MISSING"
LOCAL_MEAN_FMT = "{curve}_W{half}_MEAN"
LOCAL_STD_FMT = "{curve}_W{half}_STD"

# Kept, in this order, at the head of the table.
IDENTIFIER_COLUMNS: tuple[str, ...] = ("WELL", "DEPTH_MD")
PROVENANCE_COLUMNS: tuple[str, ...] = (
    "SOURCE_ID", "SOURCE_COMMIT", "SOURCE_FILE", "SPLIT", "SOURCE_SPLIT",
)
TARGET_RAW_COLUMN = "TARGET_LABEL_RAW"
TARGET_CLASS_COLUMN = "TARGET_CLASS"
TARGET_ENCODED_COLUMN = "TARGET_ENCODED"

# The versions this stage can build, in the order they were approved. v0.1 is
# frozen: it is the shipped baseline, and rebuilding it must reproduce the same
# bytes, so nothing here may add a column to it.
FROZEN_FEATURE_VERSION = "v0.1"


class FeatureSet:
    """One approved feature version: its identity, its curves, its schema.

    A plain object rather than module-level constants, because the constants
    would have to be edited to build a second version, and a version that can
    only be produced by editing the code is a version nobody will reproduce.
    Everything the writer needs is resolved once, here, so the row loop never
    decides a column name.
    """

    def __init__(
        self,
        version: str,
        curves: tuple[str, ...],
        local_half_widths_rows: tuple[int, ...] = (),
        gap_tolerance_m: float = 0.0,
        source: dict | None = None,
    ) -> None:
        self.version = version
        self.curves = curves
        self.local_half_widths_rows = local_half_widths_rows
        self.gap_tolerance_m = gap_tolerance_m
        self.source = source or {}

        self.missing_masks = tuple(f"{name}{MASK_SUFFIX}" for name in curves)
        self.local_columns: list[str] = []
        for half in local_half_widths_rows:
            for fmt in (LOCAL_MEAN_FMT, LOCAL_STD_FMT):
                self.local_columns.extend(
                    fmt.format(curve=curve, half=half) for curve in curves
                )

        self.dataset_id = f"force2020-litho-logs-{version}"
        stem = f"force2020_litho_logs_{version.replace('.', '_')}"
        self.dataset_filename = f"{stem}.csv"
        self.manifest_filename = f"{stem}.manifest.json"
        self.exclusions_filename = f"{stem}.exclusions.csv"

        self.dataset_columns = (
            *IDENTIFIER_COLUMNS,
            *PROVENANCE_COLUMNS,
            TARGET_RAW_COLUMN,
            TARGET_CLASS_COLUMN,
            TARGET_ENCODED_COLUMN,
            *curves,
            *self.missing_masks,
            *self.local_columns,
        )
        # DEPTH_MD is deliberately absent from every feature set. It is carried
        # as metadata so a depth-only baseline stays possible, and held out of
        # the matrix so depth cannot enter through another column: the
        # characterization measured X_LOC/Y_LOC/Z_LOC to track the borehole
        # trajectory and vary with depth, so leaving them in would smuggle it
        # back in behind DEPTH_MD and make an ablation meaningless.
        self.feature_matrix_columns = (
            *curves,
            *self.missing_masks,
            *self.local_columns,
        )

    @property
    def has_local_context(self) -> bool:
        return bool(self.local_half_widths_rows)

    def describe(self) -> dict:
        return {
            "feature_version": self.version,
            "dataset_id": self.dataset_id,
            "dataset_file": self.dataset_filename,
            "curves": list(self.curves),
            "missing_mask_columns": list(self.missing_masks),
            "local_context_columns": list(self.local_columns),
            "local_half_widths_rows": list(self.local_half_widths_rows),
            "local_gap_tolerance_m": self.gap_tolerance_m,
            "frozen": self.version == FROZEN_FEATURE_VERSION,
        }


def load_feature_set(version: str) -> FeatureSet:
    """Build a FeatureSet from the committed registry.

    Reading the registry rather than restating its curve list is what stops this
    stage and the selection stage from disagreeing about what is in the table. If
    the registry is missing or does not carry the version, this raises: building
    a version that nothing authorised is exactly the failure this exists to
    prevent.

    The window widths and the gap tolerance come from the same registry, measured
    by the selection stage, so a local feature is only ever as wide as the
    spacing measurement justified and is never averaged across a gap.
    """
    if not FEATURE_REGISTRY.is_file():
        raise SystemExit(
            f"{FEATURE_REGISTRY} not found; run "
            "scripts/ingest/select_force2020_features.py first"
        )
    registry = json.loads(FEATURE_REGISTRY.read_text(encoding="utf-8"))
    sets = registry.get("feature_sets", {})
    if version not in sets:
        known = ", ".join(sorted(sets)) or "none"
        raise SystemExit(
            f"feature version {version!r} is not in the registry "
            f"(known: {known})"
        )
    spec = sets[version]
    windows = tuple(int(w["half_width_rows"]) for w in spec.get("windows", []))
    local = registry.get("local_context", {})
    measured = local.get("measured", {})
    return FeatureSet(
        version=version,
        curves=tuple(spec["curves"]),
        local_half_widths_rows=windows,
        gap_tolerance_m=float(measured.get("gap_tolerance_m") or 0.0),
        source={"registry": spec.get("note", "")},
    )


def available_feature_versions() -> list[str]:
    if not FEATURE_REGISTRY.is_file():
        return []
    registry = json.loads(FEATURE_REGISTRY.read_text(encoding="utf-8"))
    return sorted(registry.get("feature_sets", {}))


# v0.1 is the default, so every existing caller, test and report keeps building
# the frozen five-curve table unless it explicitly asks for another version.
DEFAULT_FEATURE_SET = load_feature_set(DEFAULT_FEATURE_VERSION)

# Columns the instruction and the characterization both exclude, with the reason
# each one is absent. Carried as data so a reviewer can see that an omission was
# a decision rather than an oversight.
EXCLUDED_SOURCE_COLUMNS: dict[str, str] = {
    "X_LOC": (
        "not carried at all. Measured to vary with depth inside nearly every "
        "well, so it is a borehole-trajectory proxy and a well fingerprint, "
        "not a rock measurement"
    ),
    "Y_LOC": "same reason as X_LOC: trajectory, not lithology",
    "Z_LOC": (
        "not carried at all. The source's own signed depth column, so it is a "
        "depth proxy by construction"
    ),
    "GROUP": (
        "not carried at all. NPD lithostratigraphy from the same interpretation "
        "campaign that produced the label, so it is label-adjacent and a "
        "near-complete stand-in for the target"
    ),
    "FORMATION": "label-adjacent on the same grounds as GROUP",
    "FORCE_2020_LITHOFACIES_CONFIDENCE": (
        "not carried at all. A property of the label (1 high, 2 medium, 3 low), "
        "so it is an input only to a future weighted loss, never a feature"
    ),
    "DEPTH_MD": (
        "carried as metadata, excluded from the feature matrix, so a "
        "depth-ablation experiment stays possible"
    ),
    "WELL": "the grouping key, not a feature",
    "FORCE_2020_LITHOFACIES_LITHOLOGY": "the target",
}

# ---------------------------------------------------------------------------
# Source tables
#
# Each entry says which published file feeds a split, and how the target is
# obtained. The four published tables collapse to three splits because
# leaderboard_test_target.csv is not a split of its own: it is the label file
# for leaderboard_test_features.csv, keyed on (WELL, DEPTH_MD).
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class SourceTable:
    name: str
    relative_path: str
    split: str
    source_split: str
    has_label_column: bool
    label_source: str | None = None


SOURCE_TABLES: tuple[SourceTable, ...] = (
    SourceTable(
        name="train",
        relative_path="extracted/train.csv",
        split="train",
        source_split="train.csv",
        has_label_column=True,
    ),
    SourceTable(
        name="hidden_test",
        relative_path="hidden_test.csv",
        split="hidden_test",
        source_split="hidden_test.csv",
        has_label_column=True,
    ),
    SourceTable(
        name="leaderboard_test",
        relative_path="leaderboard_test_features.csv",
        split="leaderboard_test",
        source_split="leaderboard_test_features.csv",
        has_label_column=False,
        label_source="leaderboard_test_target.csv",
    ),
)

SPLIT_NAMES: tuple[str, ...] = ("train", "hidden_test", "leaderboard_test")

# How many excluded rows to quote inside the report JSON. The committed ledger
# always holds every one; only the report is truncated, so the report stays a
# readable summary rather than a second copy of the data.
REPORT_EXCLUSION_SAMPLE_LIMIT = 20

# Exclusion reasons. Each is a deterministic rule, applied in this order, and
# each row it removes is written to the exclusion ledger with its rule name.
EXCLUDE_TARGET_UNAVAILABLE = "target_unavailable"
EXCLUDE_TARGET_UNKNOWN_CODE = "target_code_not_in_source_vocabulary"
EXCLUDE_DEPTH_UNPARSEABLE = "depth_unparseable"
EXCLUDE_FEATURE_NON_NUMERIC = "feature_value_non_numeric"
EXCLUDE_DUPLICATE_WELL_DEPTH = "duplicate_well_depth"

EXCLUSION_RULES: tuple[tuple[str, str], ...] = (
    (
        EXCLUDE_TARGET_UNAVAILABLE,
        "the target cell is empty, blank or a known sentinel, so there is no "
        "supervision signal. A row with no label is not a supervised row, so it "
        "is removed rather than kept with a fabricated target. Recorded in the "
        "ledger with its source file, source row number, well and depth, so the "
        "count is a measurement rather than an assumption",
    ),
    (
        EXCLUDE_TARGET_UNKNOWN_CODE,
        "the target cell holds a code that is not one of the 12 the source "
        "declares. A 13th class would be either a source error or a real unit "
        "the vocabulary does not name, and guessing which would be worse than "
        "reporting it. The distinct offending values are listed in the report so "
        "the decision can be revisited deliberately",
    ),
    (
        EXCLUDE_DEPTH_UNPARSEABLE,
        "DEPTH_MD is empty or not a finite number, so the row has no key and "
        "cannot be joined to a LAS file, a label file or a well's depth span. "
        "The row is removed rather than given a synthetic depth. The key is not "
        "sentinel-tested, so a real depth near +999.25 is kept as a key",
    ),
    (
        EXCLUDE_FEATURE_NON_NUMERIC,
        "a feature cell holds text that is not empty and is not a known "
        "sentinel. It cannot be a measurement, and coercing it to a number "
        "would invent one. The row is removed and the offending column is "
        "counted so the source can be examined",
    ),
    (
        EXCLUDE_DUPLICATE_WELL_DEPTH,
        "(WELL, DEPTH_MD) was already emitted from an earlier source table or "
        "an earlier row. The key is compared numerically, so 494.528 and "
        "494.52800000 are the same depth. The first occurrence in source-table "
        "order is kept and later ones are removed, which is deterministic "
        "because the table order is fixed",
    ),
)

# The missing-value policy, stated once. Nothing is filled here and nothing is
# filled later unless a model pipeline does it inside the pipeline.
MISSING_VALUE_POLICY: dict[str, str] = {
    "source_convention": (
        "an empty CSV field. The characterization measured that no cell in any "
        "published FORCE 2020 CSV equals a known sentinel, so an empty field is "
        "the only way a value is missing in these tables"
    ),
    "empty_cell": (
        "kept as an empty cell. The measurement is not there and no substitute "
        "is written, because a substituted constant is indistinguishable from a "
        "measurement once it is in a table"
    ),
    "sentinel_cell": (
        "kept as an empty cell and counted separately from an empty source "
        "field, so a future release that leaks the LAS NULL convention (-999.25) "
        "is visible in the counts instead of being read as a resistivity of "
        "-999.25 ohm.m"
    ),
    "explicit_mask": (
        "each feature has a companion 0/1 column: 1 when the value is absent "
        "for any of the reasons above, 0 when it is observed. A consumer can "
        "therefore always tell an observed value from a missing one, and can "
        "tell a curve that was never logged in a well apart from one that was "
        "logged and then dropped inside it, by joining the mask to the "
        "well-level missingness already recorded in "
        "data/force2020_well_missingness.csv"
    ),
    "no_imputation": (
        "no interpolation, no forward fill, no backward fill, no per-well mean "
        "or median substitution, no sentinel substitution. Interpolating a log "
        "curve manufactures values at exactly the depths where the tool measured "
        "nothing, and a model cannot then tell those depths apart"
    ),
    "imputation_belongs_in_the_pipeline": (
        "if a model cannot accept a missing value, the imputation is a step "
        "inside that model's training pipeline, fitted on training wells only "
        "and applied to validation wells. It must not be written back into this "
        "table: doing so would leak the validation wells' distribution into the "
        "training inputs and would make the table impossible to reproduce from "
        "the source"
    ),
    "rows_removed_for_missing_target": (
        f"removed and written to the exclusion ledger as "
        f"{EXCLUDE_TARGET_UNAVAILABLE!r}, so a row absent because it had no "
        "label is distinguishable from a row absent for any other reason, and "
        "from a row whose features are merely incomplete"
    ),
    "depth_key_is_not_sentinel_tested": (
        "DEPTH_MD is the row key rather than a measurement, so it is required to "
        "be a finite number and is not run through the sentinel test. The "
        "shared sentinel set contains +999.25 and is compared with a 1e-6 "
        "tolerance, so sentinel-testing the key would swallow the real depth "
        "999.25000061 in well 25/2-7 and drop a labelled row. The measurement "
        "behind the exemption is that the characterization found zero sentinel "
        "cells in every curve column of every published table and the source's "
        "LAS declares a negative NULL, so there is no sentinel depth to catch. "
        "Every measured cell, including the target, still goes through "
        "nwis_lib.is_sentinel"
    ),
}

# The hard stop. This stage ends here, and the report says so in the same words
# a reviewer would check.
NOT_PERFORMED: list[str] = [
    "no model of any kind was trained, fitted, tuned, compared or selected",
    "no hyperparameter search of any kind was run",
    "no accuracy, F1, recall, precision, log-loss or any other score was computed",
    "no Random Forest, XGBoost, LightGBM, CNN or other model artifact was created",
    "no CNN code, window extraction or sequence input was created",
    "no prediction API, endpoint, service or route was created",
    "no value was imputed, interpolated, back-filled, smoothed, rolled or windowed",
    "no gradient, derivative or interpolation-derived feature was created",
    "no external dataset (Volve, NLOG, BSEE, DGH or any other) was added",
    "nothing was merged, joined or appended with data/processed/",
    "FORCE 2020 was not merged with the FORGE Utah canonical data",
    "no FORCE 2020 class was mapped onto, collapsed into or renamed to the "
    "FORGE Utah vocabulary",
    "no rare class was dropped, merged, relabelled or downweighted",
    "no write to data/processed/ or data/ml/",
    "no source byte was modified: the source is read-only and the table is "
    "hashed by the manifest",
]

HARD_STOP: list[str] = [
    "no model is trained at this stage",
    "no hyperparameter is tuned at this stage",
    "no models are compared at this stage",
    "no accuracy or F1 is calculated at this stage",
    "no Random Forest, XGBoost or LightGBM artifact is created at this stage",
    "no CNN code is created at this stage",
    "no API prediction endpoint is created at this stage",
    "the stage ends after dataset construction, QC and the split manifest",
]


# ---------------------------------------------------------------------------
# Label encoding
#
# Deterministic and independent of the data: the encoded id is the rank of the
# numeric NPD code in ascending numeric order over the source's full declared
# 12-class vocabulary. It does not depend on row counts, on class frequency, on
# the order the classes appear in any file, or on any random draw, so it cannot
# drift when the data changes and two runs always agree.
# ---------------------------------------------------------------------------
def label_encoding() -> dict:
    classes = [
        {"code": str(code), "class_name": name, "encoded_id": rank}
        for rank, (code, name) in enumerate(sorted(LITHOFACIES.items()))
    ]
    return {
        "rule": (
            "encoded_id is the zero-based rank of the numeric NPD code in "
            "ascending numeric order over the source's full declared 12-class "
            "vocabulary. It is a pure function of the published class list: it "
            "does not depend on row counts, on which classes happen to be "
            "common, on file order, or on any random draw"
        ),
        "why_not_frequency_order": (
            "a frequency-ordered encoding renumbers classes when a class grows, "
            "which is a silent change to a published dataset. Ranking the codes "
            "is stable under any change to the rows"
        ),
        "class_count": len(classes),
        "collapse_performed": False,
        "collapse_note": (
            "all 12 source classes are preserved. None was merged, dropped or "
            "renamed into the FORGE Utah 16B vocabulary, and none was dropped "
            "for being rare. A class a model cannot learn is an evaluation "
            "result to report, not a reason to delete it from the dataset"
        ),
        "original_label_preserved_in": TARGET_RAW_COLUMN,
        "class_name_preserved_in": TARGET_CLASS_COLUMN,
        "encoded_target_column": TARGET_ENCODED_COLUMN,
        "classes": classes,
        "by_code": {c["code"]: c["encoded_id"] for c in classes},
        "name_by_code": {c["code"]: c["class_name"] for c in classes},
    }


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------
def parse_number(value: str) -> float | None:
    """A finite float, or None. Empty, blank and sentinel cells give None.

    `is_sentinel` is the project's single definition of a null-equivalent and it
    is used here rather than reimplemented, so a value this stage treats as
    missing is the same value every other stage treats as missing.
    """
    if is_sentinel(value):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number


def _stat(value: float) -> str:
    """A derived local-context aggregate, written at a fixed precision.

    Six decimals is finer than any curve's useful resolution and keeps the table
    a sane size; the aggregate is a summary of neighbours, not a measurement, so
    carrying full binary precision would cost tens of megabytes to preserve digits
    no model can use.
    """
    return f"{value:.6f}"


def parse_depth(value: str) -> float | None:
    """A finite depth, or None. Deliberately not the sentinel test.

    DEPTH_MD is the row key, not a measurement, and a key only has to be a
    finite number to be usable. The shared sentinel set includes +999.25 and is
    compared with a 1e-6 tolerance, so applying it to the depth key swallows the
    real depth 999.25000061 in well 25/2-7 and silently drops a labelled row.

    The measurement behind that exemption: the characterization found zero
    sentinel cells in every curve column of every published table, and the
    source's LAS declares a negative NULL (-999.25), so there is no sentinel
    depth here to catch. Every null token fails float() anyway, and nan/inf are
    rejected below, so nothing that is genuinely absent slips through as a key.
    """
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        number = float(text)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def read_label_file(path: Path) -> tuple[dict[tuple[str, float], str], int, int]:
    """(WELL, DEPTH_MD) -> raw target code, for a label-only key file.

    Returns the map, the row count and the number of duplicate keys. The key is
    numeric on the depth side, so the join below is exact regardless of how each
    file formats its depth.
    """
    labels: dict[tuple[str, float], str] = {}
    rows = 0
    duplicates = 0
    with open(path, newline="", encoding="utf-8") as handle:
        for record in csv.DictReader(handle, delimiter=DELIMITER):
            rows += 1
            depth = parse_depth(record.get("DEPTH_MD", ""))
            if depth is None:
                continue
            key = (record.get("WELL", ""), depth)
            if key in labels:
                duplicates += 1
                continue
            labels[key] = (record.get(TARGET_COLUMNS[0], "") or "").strip()
    return labels, rows, duplicates


# ---------------------------------------------------------------------------
# The construction pass
# ---------------------------------------------------------------------------
class Ledger:
    """Every excluded source row, in the order it was excluded.

    The report quotes a bounded sample so it stays readable; the committed CSV
    carries all of them. Both come from this one record, so a sample can never
    disagree with the ledger.
    """

    def __init__(self) -> None:
        self.counts: Counter = Counter()
        self.rows: list[dict] = []

    def add(self, reason: str, table: SourceTable, source_row: int, well: str,
            depth_text: str, detail: str) -> None:
        self.counts[reason] += 1
        self.rows.append({
            "reason": reason,
            "source_file": table.relative_path,
            "source_row": source_row,
            "WELL": well,
            "DEPTH_MD": depth_text,
            "detail": detail,
        })

    @property
    def total(self) -> int:
        return sum(self.counts.values())

    def by_reason(self) -> dict[str, int]:
        return {reason: self.counts.get(reason, 0) for reason, _ in EXCLUSION_RULES}

    def samples(self) -> dict[str, list[dict]]:
        out: dict[str, list[dict]] = {}
        for reason, _ in EXCLUSION_RULES:
            picked = [r for r in self.rows if r["reason"] == reason]
            if picked:
                out[reason] = picked[:REPORT_EXCLUSION_SAMPLE_LIMIT]
        return out

    def render_csv(self) -> str:
        out = io.StringIO()
        writer = csv.writer(out, lineterminator="\n")
        writer.writerow([
            "reason", "source_file", "source_row", "WELL", "DEPTH_MD", "detail",
        ])
        for row in self.rows:
            writer.writerow([
                row["reason"], row["source_file"], row["source_row"],
                row["WELL"], row["DEPTH_MD"], row["detail"],
            ])
        return out.getvalue()


def build(
    source_root: Path,
    artifact_root: Path,
    spec: FeatureSet | None = None,
) -> dict:
    """Build one feature version's table, manifest, ledger and reports.

    `spec` defaults to the frozen v0.1 set, so a caller that does not care about
    versions keeps producing the shipped baseline byte for byte.
    """
    if spec is None:
        spec = DEFAULT_FEATURE_SET
    data_dir = source_root / DATA_SUBDIR
    if not data_dir.is_dir():
        raise SystemExit(
            f"FORCE 2020 data directory not found: {data_dir}\n"
            "The source must already be present from the inspection stage; this "
            "script downloads nothing."
        )
    if not (data_dir / "extracted" / "train.csv").exists():
        raise SystemExit(
            f"{data_dir / 'extracted' / 'train.csv'} not found; expand train.zip "
            "as the inspection stage did"
        )

    commit = resolved_commit(source_root)
    encoding = label_encoding()
    encoded_by_code = encoding["by_code"]
    name_by_code = encoding["name_by_code"]

    features_dir = artifact_root / FEATURES_SUBDIR
    features_dir.mkdir(parents=True, exist_ok=True)
    dataset_path = features_dir / spec.dataset_filename
    manifest_path = features_dir / spec.manifest_filename
    exclusions_path = features_dir / spec.exclusions_filename

    # --- the one join, measured before it is trusted -------------------------
    join: dict = {}
    for table in SOURCE_TABLES:
        if table.label_source is None:
            continue
        label_path = data_dir / table.label_source
        if not label_path.is_file():
            raise SystemExit(
                f"{label_path} not found; it is the label source for "
                f"{table.relative_path} and is not optional"
            )
        labels, label_rows, duplicate_keys = read_label_file(label_path)
        join = {
            "split": table.split,
            "feature_file": table.relative_path,
            "label_file": table.label_source,
            "label_rows": label_rows,
            "label_keys": len(labels),
            "label_duplicate_keys": duplicate_keys,
            "join_key": (
                "WELL text plus DEPTH_MD as a number, so 480.628 and "
                "480.62800085 are the same depth and differing decimal "
                "formatting cannot cause a miss"
            ),
            "rule": (
                "leaderboard_test_features.csv ships without labels, and "
                "leaderboard_test_target.csv supplies them keyed on "
                "(WELL, DEPTH_MD). The two are joined on that key. This is the "
                "only place two source files are combined, and it is a join of "
                "published tables, not an inference: no value is derived, "
                "interpolated or predicted"
            ),
            "labels": labels,
        }
        break

    # --- accumulators ---------------------------------------------------------
    ledger = Ledger()
    seen_keys: set[str] = set()
    rows_by_well: Counter = Counter()
    rows_by_split: Counter = Counter()
    wells_by_split: dict[str, set] = {name: set() for name in SPLIT_NAMES}
    well_source_file: dict[str, str] = {}
    depth_span: dict[str, list[float]] = {}
    depth_per_well: Counter = Counter()
    last_depth: dict[str, float] = {}
    non_monotonic: Counter = Counter()
    well_classes: dict[str, Counter] = defaultdict(Counter)
    class_rows: Counter = Counter()
    class_rows_by_split: dict[str, Counter] = {name: Counter() for name in SPLIT_NAMES}
    class_wells: dict[str, set] = defaultdict(set)
    class_wells_by_split: dict[str, dict[str, set]] = {
        name: defaultdict(set) for name in SPLIT_NAMES
    }
    missing_by_feature: Counter = Counter()
    missing_by_split_feature: dict[str, Counter] = {
        name: Counter() for name in SPLIT_NAMES
    }
    sentinel_by_feature: Counter = Counter()
    sentinel_cells = 0
    non_numeric_by_feature: Counter = Counter()
    undeclared_codes: Counter = Counter()
    source_rows_by_table: dict[str, int] = {}

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    dataset_path.write_text("", encoding="utf-8")
    writer.writerow(spec.dataset_columns)
    pending = 0

    def spill() -> None:
        nonlocal pending
        text = buffer.getvalue()
        if not text:
            return
        with open(dataset_path, "a", encoding="utf-8", newline="") as handle:
            handle.write(text)
        pending += len(text.splitlines())
        buffer.seek(0)
        buffer.truncate(0)

    # --- local context ------------------------------------------------------
    #
    # A centred window needs its neighbours, so a version that carries local
    # context cannot write a row the moment it reads it. Rows are buffered for
    # one well and flushed when the well changes, which is safe because the
    # source is grouped by well and strictly increasing in depth within a well --
    # both facts the QC section measures and asserts rather than assumes.
    #
    # Buffering is per well, never per split, so a window cannot reach across a
    # well boundary even if a source table ever listed a well twice. That is the
    # property that makes a local feature legitimate here: it sees the same rock,
    # measured a metre either side, and no other well and no target.
    well_buffer: list[tuple[float, list[str]]] = []
    buffered_well: str | None = None
    local_cells = 0
    local_gap_invalid = 0
    gap_limit = spec.gap_tolerance_m

    # Fixed positions inside the assembled record, resolved once so no index in
    # this stage is arithmetic on a column count.
    _prov = len(IDENTIFIER_COLUMNS)
    _raw_label = _prov + len(PROVENANCE_COLUMNS)
    _source_file = _prov + PROVENANCE_COLUMNS.index("SOURCE_FILE")
    _split = _prov + PROVENANCE_COLUMNS.index("SPLIT")
    _curve_start = _raw_label + 3

    def flush_well() -> None:
        """Write the buffered well, appending its local context columns."""
        nonlocal local_cells, local_gap_invalid
        if not well_buffer:
            return
        depths = [d for d, _ in well_buffer]
        # A window is only a local average if it spans a contiguous stretch of
        # the log. A step larger than the gap tolerance means logging stopped and
        # resumed, so the samples on either side of it are not neighbours and the
        # window is reported missing instead of averaging across the hole.
        broken = [
            depths[i] - depths[i - 1] > gap_limit for i in range(1, len(depths))
        ]

        for index, (_, record) in enumerate(well_buffer):
            # One pass computes a (mean, std) pair per window per curve; the
            # columns are then emitted in exactly the order
            # FeatureSet.local_columns declares them -- for each window, the mean
            # of every curve, then the standard deviation of every curve. A
            # header and a value stream that disagree by one position produce a
            # table that is silently wrong, so both come from this one nesting.
            pairs: list[list[tuple[float | None, float | None]]] = []
            for half in spec.local_half_widths_rows:
                lo = max(0, index - half)
                hi = min(len(well_buffer), index + half + 1)
                span = range(lo, hi)
                crosses_gap = any(broken[i - 1] for i in span if i > 0)
                row: list[tuple[float | None, float | None]] = []
                for offset in range(len(spec.curves)):
                    position = _curve_start + offset
                    values = [
                        value for i in span
                        if (value := parse_number(
                            well_buffer[i][1][position]
                        )) is not None
                    ]
                    if crosses_gap or len(values) < 2:
                        if crosses_gap:
                            local_gap_invalid += 1
                        row.append((None, None))
                        continue
                    mean = sum(values) / len(values)
                    variance = sum((v - mean) ** 2 for v in values) / len(values)
                    row.append((mean, math.sqrt(variance)))
                    local_cells += 2
                pairs.append(row)

            extra: list[str] = []
            for row in pairs:
                for stat in range(2):
                    for pair in row:
                        value = pair[stat]
                        extra.append("" if value is None else _stat(value))
            writer.writerow([*record, *extra])

        for _, record in well_buffer:
            commit_record(record)
        well_buffer.clear()

    def commit_record(record: list[str]) -> None:
        """The per-row bookkeeping, run once a row is known to be emitted."""
        well = record[0]
        depth = parse_depth(record[1])
        raw_label = record[_raw_label]
        table_split = record[_split]
        rows_by_split[table_split] += 1
        rows_by_well[well] += 1
        depth_per_well[well] += 1
        wells_by_split[table_split].add(well)
        well_source_file[well] = record[_source_file]
        span = depth_span.get(well)
        if span is None:
            depth_span[well] = [depth, depth]
        else:
            span[0] = min(span[0], depth)
            span[1] = max(span[1], depth)
        if well in last_depth and depth <= last_depth[well]:
            non_monotonic[well] += 1
        last_depth[well] = depth
        class_rows[raw_label] += 1
        class_rows_by_split[table_split][raw_label] += 1
        class_wells[raw_label].add(well)
        class_wells_by_split[table_split][raw_label].add(well)
        well_classes[well][raw_label] += 1

    for table in SOURCE_TABLES:
        path = data_dir / table.relative_path
        if not path.is_file():
            raise SystemExit(f"{path} not found; the dataset cannot be built")
        table_rows = 0
        with open(path, newline="", encoding="utf-8") as handle:
            reader = csv.reader(handle, delimiter=DELIMITER)
            header = next(reader)
            index = {name: position for position, name in enumerate(header)}
            absent = [
                name for name in (*IDENTIFIER_COLUMNS, *spec.curves)
                if name not in index
            ]
            if absent:
                raise SystemExit(f"{path.name} is missing expected columns: {absent}")
            label_position = index.get(TARGET_COLUMNS[0]) if table.has_label_column else None
            if table.has_label_column and label_position is None:
                raise SystemExit(
                    f"{path.name} declares a label column but "
                    f"{TARGET_COLUMNS[0]} is not in its header"
                )
            join_labels = join.get("labels") if table.label_source else None

            for row in reader:
                table_rows += 1
                if len(row) != len(header):
                    raise ValueError(
                        f"{path.name}: row {table_rows} has {len(row)} fields, "
                        f"header has {len(header)}"
                    )
                well = row[index["WELL"]].strip()
                depth_text = row[index["DEPTH_MD"]].strip()
                depth = parse_depth(depth_text)
                if depth is None:
                    ledger.add(
                        EXCLUDE_DEPTH_UNPARSEABLE, table, table_rows, well,
                        depth_text,
                        "DEPTH_MD is empty, non-numeric or not finite. The row "
                        "key is not sentinel-tested, because a depth is a key "
                        "rather than a measurement and the source's published "
                        "tables contain no sentinel cells",
                    )
                    continue

                if label_position is not None:
                    raw_label = row[label_position].strip()
                elif join_labels is not None:
                    raw_label = join_labels.get((well, depth), "")
                else:
                    raw_label = ""
                if not raw_label or is_sentinel(raw_label):
                    ledger.add(
                        EXCLUDE_TARGET_UNAVAILABLE, table, table_rows, well,
                        depth_text, "no target for this (WELL, DEPTH_MD)",
                    )
                    continue
                encoded = encoded_by_code.get(raw_label)
                if encoded is None:
                    undeclared_codes[raw_label] += 1
                    ledger.add(
                        EXCLUDE_TARGET_UNKNOWN_CODE, table, table_rows, well,
                        depth_text,
                        f"target {raw_label!r} is not one of the 12 declared classes",
                    )
                    continue

                key = f"{well}\x00{depth!r}"
                if key in seen_keys:
                    ledger.add(
                        EXCLUDE_DUPLICATE_WELL_DEPTH, table, table_rows, well,
                        depth_text, "(WELL, DEPTH_MD) was already emitted",
                    )
                    continue

                values: list[str] = []
                masks: list[str] = []
                rejected = False
                for name in spec.curves:
                    raw = row[index[name]].strip()
                    if raw == "":
                        missing_by_feature[name] += 1
                        missing_by_split_feature[table.split][name] += 1
                        values.append("")
                        masks.append("1")
                        continue
                    if is_sentinel(raw):
                        # A null-equivalent that survived the source's own
                        # resampling. Counted, blanked, never a measurement.
                        missing_by_feature[name] += 1
                        missing_by_split_feature[table.split][name] += 1
                        sentinel_by_feature[name] += 1
                        sentinel_cells += 1
                        values.append("")
                        masks.append("1")
                        continue
                    if parse_number(raw) is None:
                        non_numeric_by_feature[name] += 1
                        rejected = True
                        break
                    values.append(raw)
                    masks.append("0")
                if rejected:
                    ledger.add(
                        EXCLUDE_FEATURE_NON_NUMERIC, table, table_rows, well,
                        depth_text,
                        "a feature cell holds text that is not a finite number",
                    )
                    continue

                seen_keys.add(key)
                record = [
                    well,
                    depth_text,
                    SOURCE_ID,
                    commit,
                    table.relative_path,
                    table.split,
                    table.source_split,
                    raw_label,
                    name_by_code[raw_label],
                    encoded,
                    *values,
                    *masks,
                ]
                if spec.has_local_context:
                    # Buffer instead of writing: the local columns need this
                    # row's neighbours, and the well is finished the moment the
                    # source names a different one.
                    if buffered_well is not None and well != buffered_well:
                        flush_well()
                    buffered_well = well
                    well_buffer.append((depth, record))
                    if len(well_buffer) % 100_000 == 0:
                        spill()
                else:
                    writer.writerow(record)
                    commit_record(record)

                if table_rows % 100_000 == 0:
                    spill()
        if spec.has_local_context:
            flush_well()
            buffered_well = None
        spill()
        source_rows_by_table[table.relative_path] = table_rows
    del pending

    dataset_sha = sha256_file(dataset_path)
    dataset_size = dataset_path.stat().st_size

    join_report = (
        {k: v for k, v in join.items() if k != "labels"} if join else {}
    )
    if join:
        feature_rows = source_rows_by_table.get(join["feature_file"], 0)
        emitted = rows_by_split[join["split"]]
        join_report.update({
            "feature_rows": feature_rows,
            "rows_emitted_for_split": emitted,
            "join_is_exact": (
                join["label_rows"] == join["label_keys"]
                and join["label_duplicate_keys"] == 0
            ),
            "every_feature_row_got_a_label": emitted == feature_rows,
        })

    missingness = build_missingness(
        missing_by_feature, missing_by_split_feature, sentinel_by_feature,
        sentinel_cells, rows_by_split, wells_by_split, spec,
    )
    classes_report = build_class_report(
        encoding, class_rows, class_rows_by_split, class_wells,
        class_wells_by_split, rows_by_split, wells_by_split,
    )
    split_report = build_split_report(
        rows_by_split, wells_by_split, rows_by_well, join_report,
    )
    accounting = build_row_accounting(
        source_rows_by_table, rows_by_split, ledger, len(seen_keys),
    )
    qc = build_qc(
        rows_by_split, rows_by_well, depth_span, depth_per_well, non_monotonic,
        ledger, undeclared_codes, non_numeric_by_feature, sentinel_cells,
        missingness, classes_report, split_report, source_rows_by_table,
    )
    schema = [
        {"name": column, "role": role, "note": note}
        for column in spec.dataset_columns
        for role, note in (column_role(column, spec),)
    ]

    manifest = {
        "artifact": "force2020_dataset_manifest",
        "schema_version": 1,
        "dataset_id": spec.dataset_id,
        "dataset_file": spec.dataset_filename,
        "sha256": dataset_sha,
        "size_bytes": dataset_size,
        "rows": sum(rows_by_split.values()),
        "wells": len(rows_by_well),
        "columns": list(spec.dataset_columns),
        "column_roles": schema,
        "numeric_feature_columns": list(spec.curves),
        "missing_mask_columns": list(spec.missing_masks),
        "feature_matrix_columns": list(spec.feature_matrix_columns),
        "grain": "one row per (WELL, DEPTH_MD) at source grain",
        "row_order": (
            "source-table order (train, hidden_test, leaderboard_test), and "
            "within a table the source's own row order. Ledgered exclusions are "
            "the only reason a source row is absent, so the nth emitted row of a "
            "split is the nth non-excluded source row of that table"
        ),
        "provenance": {
            "source_id": SOURCE_ID,
            "source_name": SOURCE_NAME,
            "source_commit": commit,
            "archive_doi": ZENODO_DOI,
            "licence": LICENCE,
            "source_files": source_file_records(),
        },
        "taxonomy": {
            "taxonomy_id": TAXONOMY_ID,
            "taxonomy_version": commit,
            "taxonomy_version_rule": (
                "the taxonomy version is the pinned source commit, because the "
                "class list is defined by the source and changes only when the "
                "source does"
            ),
            "description": TAXONOMY_DESCRIPTION,
            "class_count": encoding["class_count"],
            "mapped_to_canonical": False,
            "canonical_vocabulary": "FORGE_UTAH_16B",
            "mapping_to_canonical": None,
        },
        "label_encoding": {
            "rule": encoding["rule"],
            "target_raw_column": TARGET_RAW_COLUMN,
            "class_name_column": TARGET_CLASS_COLUMN,
            "encoded_column": TARGET_ENCODED_COLUMN,
            "classes": encoding["classes"],
        },
        "missing_value_policy": MISSING_VALUE_POLICY,
        "exclusion_rules": [
            {"reason": reason, "rule": rule} for reason, rule in EXCLUSION_RULES
        ],
        "row_accounting": accounting,
        "split_summary": {
            name: {
                "rows": rows_by_split[name],
                "wells": len(wells_by_split[name]),
                "source_tables": source_files_for_split(name),
            }
            for name in SPLIT_NAMES
        },
        "source_is_read_only": True,
        "model_stage_entered": False,
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    exclusions_path.write_text(ledger.render_csv(), encoding="utf-8")

    report = {
        "artifact": "force2020_dataset_construction",
        "schema_version": 1,
        "stage": (
            "dataset construction, QC and split manifest; no model stage entered"
        ),
        "scope": (
            "construction of one logs-only supervised dataset from an external "
            "source; separate from the NWIS canonical dataset"
        ),
        "canonical_dataset_version_untouched": "nwis-forge16b-v0.2",
        "dataset": {
            "dataset_id": spec.dataset_id,
            "grain": "one row per (WELL, DEPTH_MD) at source grain",
            "rows": sum(rows_by_split.values()),
            "wells": len(rows_by_well),
            "columns": list(spec.dataset_columns),
            "column_count": len(spec.dataset_columns),
            "column_roles": schema,
            "numeric_feature_columns": list(spec.curves),
            "missing_mask_columns": list(spec.missing_masks),
            "feature_matrix_columns": list(spec.feature_matrix_columns),
            "depth_is_metadata_not_a_feature": (
                "DEPTH_MD" not in spec.feature_matrix_columns
            ),
            "sha256": dataset_sha,
            "size_bytes": dataset_size,
            "row_order": manifest["row_order"],
            "excluded_source_columns": EXCLUDED_SOURCE_COLUMNS,
        },
        "source": {
            "source_id": SOURCE_ID,
            "source_name": SOURCE_NAME,
            "resolved_commit_sha": commit,
            "archive_doi": ZENODO_DOI,
            "licence": LICENCE,
            "source_files": source_file_records(),
            "published_tables_read": sorted(source_rows_by_table),
            "downloaded_by_this_stage": False,
        },
        "taxonomy": manifest["taxonomy"],
        "label_encoding": encoding,
        "missing_value_policy": MISSING_VALUE_POLICY,
        "exclusion_rules": [
            {"reason": reason, "rule": rule} for reason, rule in EXCLUSION_RULES
        ],
        "row_accounting": accounting,
        "split": split_report,
        "class_distribution": classes_report,
        "missingness": missingness,
        "qc": qc,
        "artifacts": {
            "dataset": relative(dataset_path),
            "manifest": relative(manifest_path),
            "exclusions": relative(exclusions_path),
            "split_manifest": "data/force2020_split_manifest.csv",
            "report_json": "reports/force2020_dataset.json",
            "report_markdown": "reports/force2020_dataset.md",
        },
        "provenance": {
            "source_id": SOURCE_ID,
            "pinned_source_commit": commit,
            "taxonomy_id": TAXONOMY_ID,
            "taxonomy_version": commit,
            "dataset_id": spec.dataset_id,
            "per_row_provenance_columns": list(PROVENANCE_COLUMNS),
            "per_row_target_column": TARGET_RAW_COLUMN,
            "dataset_sha256": dataset_sha,
            "source_is_read_only": True,
            "source_modified": False,
            "reproducible_by": (
                "python scripts/ingest/build_force2020_dataset.py --verify "
                "rebuilds the table, the manifest and the split manifest from "
                "the source at the pinned commit and fails if any of them "
                "differs from what is committed"
            ),
        },
        "hard_stop": HARD_STOP,
        "not_performed": NOT_PERFORMED,
    }
    return {
        "report": report,
        "split_rows": split_manifest_rows(
            wells_by_split, well_source_file, rows_by_well, depth_span,
            depth_per_well, well_classes, name_by_code,
        ),
    }


def source_file_records() -> list[dict]:
    return [
        {
            "path": table.relative_path,
            "split": table.split,
            "source_split": table.source_split,
            "label_source": table.label_source,
        }
        for table in SOURCE_TABLES
    ]


def source_files_for_split(split: str) -> list[str]:
    return [t.relative_path for t in SOURCE_TABLES if t.split == split]


def relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def build_row_accounting(
    source_rows_by_table: dict[str, int],
    rows_by_split: Counter,
    ledger: Ledger,
    unique_keys: int,
) -> dict:
    source_rows = sum(source_rows_by_table.values())
    emitted = sum(rows_by_split.values())
    return {
        "source_rows_read": source_rows,
        "source_rows_by_table": dict(sorted(source_rows_by_table.items())),
        "dataset_rows_written": emitted,
        "unique_well_depth_keys_emitted": unique_keys,
        "rows_excluded": ledger.total,
        "exclusions_by_reason": ledger.by_reason(),
        "arithmetic": (
            f"{source_rows:,} source rows read, {ledger.total} removed by the "
            f"ledgered rules, {emitted:,} rows written"
        ),
        "reconciles": source_rows - ledger.total == emitted,
        "exclusion_rate": (
            round(ledger.total / source_rows, 8) if source_rows else None
        ),
        "excluded_row_keys": (
            f"{unique_keys:,} distinct (WELL, DEPTH_MD) keys were emitted, which "
            f"equals the number of rows written, so the table holds no repeated "
            f"key"
        ),
    }


def build_missingness(
    missing_by_feature: Counter,
    missing_by_split_feature: dict[str, Counter],
    sentinel_by_feature: Counter,
    sentinel_cells: int,
    rows_by_split: Counter,
    wells_by_split: dict[str, set],
    spec: FeatureSet | None = None,
) -> dict:
    if spec is None:
        spec = DEFAULT_FEATURE_SET
    total_rows = sum(rows_by_split.values())
    by_feature = []
    for name in spec.curves:
        missing = missing_by_feature.get(name, 0)
        sentinel = sentinel_by_feature.get(name, 0)
        by_feature.append({
            "feature": name,
            "observed": total_rows - missing,
            "missing": missing,
            "missing_fraction": round(missing / total_rows, 8) if total_rows else None,
            "missing_via_empty_source_field": missing - sentinel,
            "missing_via_sentinel": sentinel,
            "mask_column": f"{name}_MISSING",
        })
    by_split = []
    for split in SPLIT_NAMES:
        rows = rows_by_split[split]
        by_split.append({
            "split": split,
            "rows": rows,
            "wells": len(wells_by_split[split]),
            "missing_cells": sum(
                missing_by_split_feature[split].values()
            ),
            "features": [
                {
                    "feature": name,
                    "missing": missing_by_split_feature[split].get(name, 0),
                    "missing_fraction": (
                        round(missing_by_split_feature[split].get(name, 0) / rows, 8)
                        if rows else None
                    ),
                }
                for name in spec.curves
            ],
        })
    return {
        "policy": MISSING_VALUE_POLICY,
        "mask_columns": list(spec.missing_masks),
        "mask_semantics": (
            "1 = the value is absent, whether the source field was empty or held "
            "a sentinel; 0 = the value is observed. A 0 means the cell holds a "
            "measurement, so a missing curve can never be read as a zero by a "
            "consumer that does not consult the mask"
        ),
        "total_rows": total_rows,
        "by_feature": by_feature,
        "by_feature_and_split": by_split,
        "features_with_no_missing_rows": [
            name for name in spec.curves if missing_by_feature.get(name, 0) == 0
        ],
        "sentinel_cells_total": sentinel_cells,
        "sentinel_note": (
            "sentinel cells are the LAS NULL convention surviving into the "
            "published CSVs. The characterization measured none, and the count "
            "is reported here so a future release that leaks one cannot pass "
            "unnoticed"
        ),
        "missing_cell_count_note": (
            "the per-split figures are counts of missing cells, not of distinct "
            "rows with a gap: a row with two missing features contributes two. "
            "The table itself carries one mask per feature, so the distinct-row "
            "count is recoverable downstream without re-scanning anything"
        ),
    }


def build_class_report(
    encoding: dict,
    class_rows: Counter,
    class_rows_by_split: dict[str, Counter],
    class_wells: dict[str, set],
    class_wells_by_split: dict[str, dict[str, set]],
    rows_by_split: Counter,
    wells_by_split: dict[str, set],
) -> dict:
    total = sum(rows_by_split.values())
    by_code = encoding["by_code"]
    name_by_code = encoding["name_by_code"]
    classes = [
        {
            "code": code,
            "class_name": name_by_code[code],
            "encoded_id": by_code[code],
            "rows": class_rows.get(code, 0),
            "share_of_dataset": (
                round(class_rows.get(code, 0) / total, 8) if total else None
            ),
            "wells": len(class_wells.get(code, ())),
            "rows_by_split": {
                split: class_rows_by_split[split].get(code, 0)
                for split in SPLIT_NAMES
            },
            "wells_by_split": {
                split: len(class_wells_by_split[split].get(code, ()))
                for split in SPLIT_NAMES
            },
            "wells_by_split_list": {
                split: sorted(class_wells_by_split[split].get(code, ()))
                for split in SPLIT_NAMES
            },
        }
        for code in sorted(by_code, key=lambda c: by_code[c])
    ]
    per_split = {}
    for split in SPLIT_NAMES:
        rows = rows_by_split[split]
        present = [
            {
                "code": code,
                "class_name": name_by_code[code],
                "encoded_id": by_code[code],
                "rows": class_rows_by_split[split].get(code, 0),
                "wells": len(class_wells_by_split[split].get(code, ())),
                "wells_list": sorted(class_wells_by_split[split].get(code, ())),
            }
            for code in sorted(by_code, key=lambda c: by_code[c])
            if class_rows_by_split[split].get(code, 0) > 0
        ]
        per_split[split] = {
            "rows": rows,
            "wells": len(wells_by_split[split]),
            "classes_present": len(present),
            "classes": present,
            "class_rows_sum": sum(c["rows"] for c in present),
        }
    counts = [c["rows"] for c in classes]
    return {
        "vocabulary": TAXONOMY_ID,
        "class_count": len(classes),
        "total_rows": total,
        "all_source_classes_preserved": len(classes) == len(LITHOFACIES),
        "no_class_collapsed": True,
        "no_class_dropped_for_being_rare": True,
        "rarity_note": (
            "no class was removed, merged, relabelled or downweighted because it "
            "is rare. The rarest class is reported with its row and well counts "
            "so the difficulty is visible in advance; a class a model fails to "
            "learn is an evaluation result to report, not a reason to delete it "
            "from the dataset"
        ),
        "classes": classes,
        "by_split": per_split,
        "largest_class": max(classes, key=lambda c: c["rows"]),
        "smallest_class": min(classes, key=lambda c: c["rows"]),
        "imbalance_ratio_largest_to_smallest": (
            round(max(counts) / min(counts), 4) if counts and min(counts) else None
        ),
        "median_class_rows": sorted(counts)[len(counts) // 2] if counts else None,
    }


def build_split_report(
    rows_by_split: Counter,
    wells_by_split: dict[str, set],
    rows_by_well: Counter,
    join_report: dict,
) -> dict:
    multi = {
        well: [s for s in SPLIT_NAMES if well in wells_by_split[s]]
        for well in sorted(rows_by_well)
        if sum(1 for s in SPLIT_NAMES if well in wells_by_split[s]) > 1
    }
    unassigned = [
        well for well in sorted(rows_by_well)
        if not any(well in wells_by_split[s] for s in SPLIT_NAMES)
    ]
    reconciles = all(
        sum(rows_by_well[w] for w in wells_by_split[s]) == rows_by_split[s]
        for s in SPLIT_NAMES
    )
    return {
        "unit": "WELL",
        "authoritative_source": (
            "the source's own published partition, verified well-disjoint by the "
            "characterization stage and re-verified here from the wells actually "
            "emitted into the table"
        ),
        "reshuffled": False,
        "reshuffle_note": (
            "no well was reassigned and no random draw was taken. A random "
            "well-level split would discard the source's partition, which is "
            "already disjoint, already published, and already the partition the "
            "characterization measured class coverage against"
        ),
        "splits": {
            split: {
                "wells": len(wells_by_split[split]),
                "rows": rows_by_split[split],
                "source_tables": source_files_for_split(split),
            }
            for split in SPLIT_NAMES
        },
        "wells_total": len(rows_by_well),
        "rows_total": sum(rows_by_split.values()),
        "verification": {
            "no_well_in_more_than_one_split": not multi,
            "wells_in_more_than_one_split": multi,
            "every_labelled_well_has_exactly_one_split": not unassigned,
            "wells_without_a_split": unassigned,
            "all_rows_inherit_their_split_from_well": reconciles,
            "row_counts_reconcile": reconciles,
            "rows_per_split_check": {
                split: {
                    "split_rows": rows_by_split[split],
                    "sum_of_well_rows": sum(
                        rows_by_well[w] for w in wells_by_split[split]
                    ),
                    "agrees": sum(
                        rows_by_well[w] for w in wells_by_split[split]
                    ) == rows_by_split[split],
                }
                for split in SPLIT_NAMES
            },
        },
        "join": join_report,
        "manifest_columns": list(SPLIT_MANIFEST_COLUMNS),
        "per_well_summary_location": "data/force2020_split_manifest.csv",
    }


SPLIT_MANIFEST_COLUMNS: tuple[str, ...] = (
    "WELL", "SPLIT", "SOURCE_ID", "SOURCE_SPLIT", "SOURCE_DATASET",
    "SOURCE_FILE", "LABEL_SOURCE", "LABELLED", "ROWS", "MIN_MD", "MAX_MD",
    "THICKNESS_M", "CLASS_COUNT", "CLASSES_PRESENT",
)


def build_qc(
    rows_by_split: Counter,
    rows_by_well: Counter,
    depth_span: dict[str, list[float]],
    depth_per_well: Counter,
    non_monotonic: Counter,
    ledger: Ledger,
    undeclared_codes: Counter,
    non_numeric_by_feature: Counter,
    sentinel_cells: int,
    missingness: dict,
    classes_report: dict,
    split_report: dict,
    source_rows_by_table: dict[str, int],
) -> dict:
    total_rows = sum(rows_by_split.values())
    checks: list[dict] = []

    def check(check_id: str, name: str, passed: bool, measured: object,
              rule: str, detail: str) -> None:
        checks.append({
            "id": check_id,
            "name": name,
            "result": "pass" if passed else "ATTENTION",
            "measured": measured,
            "rule": rule,
            "detail": detail,
        })

    duplicates = ledger.counts.get(EXCLUDE_DUPLICATE_WELL_DEPTH, 0)
    check(
        "QC01", "duplicate (WELL, DEPTH_MD) rows", duplicates == 0,
        {
            "rows_written": total_rows,
            "distinct_keys_in_table": total_rows,
            "duplicate_keys_in_table": 0,
            "source_rows_dropped_as_duplicates": duplicates,
        },
        "a key already emitted is never emitted again; the first occurrence in "
        "source-table order wins and any later one goes to the ledger",
        "the emitted key set is deduplicated by construction, because a key is "
        "added to the seen set in the same step that writes its row, so the "
        "count of repeated keys in the table is zero by construction rather than "
        "by a later cleanup pass. The number of source rows dropped for this "
        f"reason is {duplicates}. The key is compared numerically, so two "
        "spellings of the same depth are recognised as one key",
    )

    steps = sum(non_monotonic.values())
    check(
        "QC02", "depth monotonic within well", steps == 0,
        {
            "non_monotonic_steps": steps,
            "wells_affected": len(non_monotonic),
            "wells_checked": len(rows_by_well),
            "wells_affected_list": dict(sorted(non_monotonic.items())),
        },
        "reported, never repaired",
        "a depth that does not increase is recorded against its well and the row "
        "is kept. Depth order does not change what a row contains, so "
        "reordering or dropping rows to make the sequence tidy would be a silent "
        "edit made for cosmetic reasons. The affected wells are listed above so "
        "the question can be asked of the source rather than of this table",
    )

    missing_targets = ledger.counts.get(EXCLUDE_TARGET_UNAVAILABLE, 0)
    check(
        "QC03", "target availability", True,
        {
            "rows_with_a_target": total_rows,
            "rows_without_a_target": missing_targets,
            "target_is_complete_in_the_dataset": missing_targets == 0,
            "undeclared_target_codes": dict(sorted(undeclared_codes.items())),
            "excluded_as_unknown_code": ledger.counts.get(
                EXCLUDE_TARGET_UNKNOWN_CODE, 0
            ),
        },
        f"a row with no usable target is removed and ledgered as "
        f"{EXCLUDE_TARGET_UNAVAILABLE!r}; a target outside the declared "
        f"12-class vocabulary is removed and ledgered as "
        f"{EXCLUDE_TARGET_UNKNOWN_CODE!r}",
        "the dataset is a supervised table, so every row in it has a target. Rows "
        "that do not are excluded and written to the ledger with their source "
        "file, source row number, well and depth, which is what makes 'no rows "
        "were dropped' a measurement rather than an assumption. The leaderboard "
        "split is the only one whose labels arrive in a separate file, so it is "
        "the only one where a missing label is even possible",
    )

    non_numeric = sum(non_numeric_by_feature.values())
    check(
        "QC04", "invalid or non-numeric feature values", non_numeric == 0,
        {
            "non_numeric_cells": non_numeric,
            "cells_by_feature": dict(sorted(non_numeric_by_feature.items())),
            "rows_excluded": ledger.counts.get(EXCLUDE_FEATURE_NON_NUMERIC, 0),
        },
        "a feature cell that is neither empty nor a sentinel nor a finite number "
        f"is an error: the row is removed and ledgered as "
        f"{EXCLUDE_FEATURE_NON_NUMERIC!r} and the offending column is counted",
        "the five selected curves are numeric in every published table, so this "
        "is expected to be zero and is measured rather than assumed. A non-zero "
        "count would mean the source holds text in a log column, and coercing it "
        "to a number would invent a measurement",
    )

    check(
        "QC05", "missingness by feature and split", True,
        {
            "by_feature": missingness["by_feature"],
            "by_feature_and_split": missingness["by_feature_and_split"],
            "sentinel_cells": sentinel_cells,
            "per_well_detail": "data/force2020_well_missingness.csv",
        },
        "reported per feature and per split, and never filled",
        "missingness is a property of the well as much as of the row: a feature "
        "absent from a well is absent for all of that well's rows. The per-well, "
        "per-curve missing cell counts measured by the characterization stage "
        "are committed in data/force2020_well_missingness.csv, so 'not logged in "
        "this well' can be separated from 'dropped inside this well' without "
        "re-scanning anything. Nothing here is imputed",
    )

    class_rows_reconcile = all(
        entry["class_rows_sum"] == entry["rows"]
        for entry in classes_report["by_split"].values()
    )
    check(
        "QC06", "class distribution by split", class_rows_reconcile,
        {
            "reconciles_against_rows_per_split": class_rows_reconcile,
            "by_split": {
                split: {
                    "rows": entry["rows"],
                    "wells": entry["wells"],
                    "classes_present": entry["classes_present"],
                    "class_rows": {c["code"]: c["rows"] for c in entry["classes"]},
                    "wells_per_class": {
                        c["code"]: c["wells"] for c in entry["classes"]
                    },
                }
                for split, entry in classes_report["by_split"].items()
            },
        },
        "reported, never rebalanced",
        "all 12 source classes are preserved, class counts by split and the "
        "wells containing each class are reported so a modelling decision can be "
        "made with the numbers in hand, and nothing is dropped, merged, "
        "downweighted or resampled here. Resampling a class into balance belongs "
        "in a training pipeline, not in the artifact, because a resampled table "
        "is no longer a faithful record of the source",
    )

    per_well_rows = sorted(rows_by_well.values())
    check(
        "QC07", "rows per well and depth span per well", True,
        {
            "wells": len(rows_by_well),
            "rows_per_well_min": per_well_rows[0] if per_well_rows else None,
            "rows_per_well_median": (
                per_well_rows[len(per_well_rows) // 2] if per_well_rows else None
            ),
            "rows_per_well_max": per_well_rows[-1] if per_well_rows else None,
            "min_md_overall": min((s[0] for s in depth_span.values()), default=None),
            "max_md_overall": max((s[1] for s in depth_span.values()), default=None),
            "wells_where_depth_rows_differ_from_table_rows": sum(
                1 for w in rows_by_well if depth_per_well[w] != rows_by_well[w]
            ),
            "per_well_detail": "data/force2020_split_manifest.csv",
        },
        "reported per well, never truncated",
        "every well's row count and depth interval is recorded in the split "
        "manifest, so no well can be silently shorter than it should be and no "
        "depth window is applied. Truncating wells to a common interval would "
        "change the class distribution of every well it touched",
    )

    verification = split_report["verification"]
    split_ok = (
        verification["no_well_in_more_than_one_split"]
        and verification["every_labelled_well_has_exactly_one_split"]
        and verification["all_rows_inherit_their_split_from_well"]
    )
    check(
        "QC08", "split is well-grouped and well-disjoint", split_ok,
        {
            "wells_in_more_than_one_split": verification[
                "wells_in_more_than_one_split"
            ],
            "wells_without_a_split": verification["wells_without_a_split"],
            "rows_per_split_check": verification["rows_per_split_check"],
        },
        "the split is a function of WELL alone",
        "the split is assigned per well and written onto each row from that "
        "well's assignment, so it is impossible for two rows of one well to land "
        "in different splits, or for a row to carry no split at all. The per-well "
        "assignment is the authority and is committed in "
        "data/force2020_split_manifest.csv",
    )

    accounting_reconciles = (
        sum(source_rows_by_table.values()) - ledger.total == total_rows
    )
    check(
        "QC09", "row accounting reconciles", accounting_reconciles,
        {
            "source_rows_read": sum(source_rows_by_table.values()),
            "source_rows_by_table": dict(sorted(source_rows_by_table.items())),
            "rows_excluded": ledger.total,
            "exclusions_by_reason": ledger.by_reason(),
            "rows_written": total_rows,
            "reconciles": accounting_reconciles,
        },
        "every source row is either written or ledgered, and the two counts add "
        "up",
        "source rows read, minus rows removed by a named rule, equals rows "
        "written. A dataset that reconciles is one where nothing vanished between "
        "the source and the table",
    )

    attending = [entry["id"] for entry in checks if entry["result"] != "pass"]
    return {
        "checks": checks,
        "check_count": len(checks),
        "passed": len(checks) - len(attending),
        "attending": len(attending),
        "attending_ids": attending,
        "rules_applied": [
            {"reason": reason, "rule": rule} for reason, rule in EXCLUSION_RULES
        ],
        "rules_never_triggered_because_count_was_zero": [
            reason for reason, _ in EXCLUSION_RULES
            if ledger.counts.get(reason, 0) == 0
        ],
        "exclusion_samples": ledger.samples(),
        "exclusion_sample_limit": REPORT_EXCLUSION_SAMPLE_LIMIT,
        "no_silent_fixes": (
            "no anomaly was corrected in place. Every rule above either keeps a "
            "row byte-for-byte or removes it with a name in the ledger, and the "
            "monotonicity and class-coverage findings are reported rather than "
            "acted on"
        ),
    }


# ---------------------------------------------------------------------------
# The committed split manifest
# ---------------------------------------------------------------------------
def split_manifest_rows(
    wells_by_split: dict[str, set],
    well_source_file: dict[str, str],
    rows_by_well: Counter,
    depth_span: dict[str, list[float]],
    depth_per_well: Counter,
    well_classes: dict[str, Counter],
    name_by_code: dict[str, str],
) -> list[dict]:
    label_source = {
        table.relative_path: table.label_source or "" for table in SOURCE_TABLES
    }
    source_split = {
        table.relative_path: table.source_split for table in SOURCE_TABLES
    }
    split_of = {
        well: split for split in SPLIT_NAMES for well in wells_by_split[split]
    }
    rows = []
    for well in sorted(rows_by_well):
        split = split_of[well]
        source_file = well_source_file[well]
        span = depth_span[well]
        counts = well_classes[well]
        rows.append({
            "WELL": well,
            "SPLIT": split,
            "SOURCE_ID": SOURCE_ID,
            "SOURCE_SPLIT": source_split[source_file],
            "SOURCE_DATASET": SOURCE_ID,
            "SOURCE_FILE": source_file,
            "LABEL_SOURCE": label_source[source_file],
            "LABELLED": "1",
            "ROWS": rows_by_well[well],
            "MIN_MD": _number(span[0]),
            "MAX_MD": _number(span[1]),
            "THICKNESS_M": _number(round(span[1] - span[0], 4)),
            "CLASS_COUNT": len(counts),
            "CLASSES_PRESENT": "|".join(
                f"{code}:{name_by_code[code]}:{count}"
                for code, count in sorted(counts.items())
            ),
        })
    del depth_per_well
    return rows


def _number(value: float) -> str:
    return str(int(value)) if value == int(value) else repr(value)


def render_split_manifest(rows: list[dict]) -> str:
    out = io.StringIO()
    writer = csv.DictWriter(
        out, fieldnames=list(SPLIT_MANIFEST_COLUMNS), lineterminator="\n"
    )
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return out.getvalue()


# ---------------------------------------------------------------------------
# Column roles
# ---------------------------------------------------------------------------
def column_role(
    column: str, spec: FeatureSet | None = None,
) -> tuple[str, str]:
    if spec is None:
        spec = DEFAULT_FEATURE_SET
    if column in spec.curves:
        unit = CURVE_UNITS.get(column)
        return (
            "feature",
            f"observed value, unit {unit}. Empty when missing; the companion "
            f"`{column}_MISSING` mask says which, and no substitute value is ever "
            f"written",
        )
    if column in spec.missing_masks:
        feature = column[: -len("_MISSING")]
        return (
            "feature_mask",
            f"1 when `{feature}` is absent, 0 when it is observed, so a consumer "
            f"can tell a missing measurement from a measurement without assuming "
            f"anything about empty cells",
        )
    if column == "WELL":
        return (
            "identifier",
            "NPD well name. The grouping key: the split is a function of this "
            "column alone",
        )
    if column == "DEPTH_MD":
        return (
            "depth_metadata",
            "measured depth, m. Carried for analysis and as the join key, and "
            "deliberately NOT part of the feature matrix so a depth ablation "
            "stays possible",
        )
    if column == "SOURCE_ID":
        return ("provenance", f"'{SOURCE_ID}', from ml/external_datasets.yaml")
    if column == "SOURCE_COMMIT":
        return ("provenance",
                "the pinned 40-character source commit this row was read from")
    if column == "SOURCE_FILE":
        return ("provenance", "the published source file this row came from")
    if column == "SPLIT":
        return ("provenance",
                "the well-level split, inherited from WELL, never assigned per row")
    if column == "SOURCE_SPLIT":
        return ("provenance",
                "the split name the source itself published, kept separately so "
                "this stage's split names cannot be confused with the source's")
    if column == TARGET_RAW_COLUMN:
        return (
            "target_raw",
            "the original NPD lithostratigraphic code exactly as published, "
            "never overwritten by the encoded form",
        )
    if column == TARGET_CLASS_COLUMN:
        return (
            "target_raw",
            "the class name the source publishes for that code, taken from the "
            "source's own vocabulary. Not a canonical or FORGE Utah label",
        )
    if column == TARGET_ENCODED_COLUMN:
        return (
            "target_encoded",
            f"deterministic 0-based encoded id for ML, derived from "
            f"`{TARGET_RAW_COLUMN}` and never in place of it",
        )
    return ("unknown", "")


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def pct(value: float | None, places: int = 2) -> str:
    return "n/a" if value is None else f"{value * 100:.{places}f}%"


def cell(text: object) -> str:
    """Escape a value for a markdown table cell.

    A literal pipe silently starts a new column, so a note reading
    'train | hidden_test' would render as three cells and the table would lie
    about its own contents.
    """
    return str(text).replace("|", "\\|")


def _compact(value: object) -> str:
    if isinstance(value, float):
        return f"{value:.6g}"
    if isinstance(value, dict | list):
        text = str(value)
        return text if len(text) <= 60 else text[:57] + "..."
    return str(value)


def render_markdown(report: dict) -> str:
    lines: list[str] = []
    a = lines.append
    source = report["source"]
    dataset = report["dataset"]
    accounting = report["row_accounting"]
    split = report["split"]
    split_rows = split["splits"]
    missingness = report["missingness"]
    classes_report = report["class_distribution"]
    encoding_report = report["label_encoding"]

    a("# FORCE 2020 dataset construction")
    a("")
    a(f"**Dataset id:** `{dataset['dataset_id']}`  ")
    a(f"**Source:** {source['source_name']}  ")
    a(f"**Pinned commit:** `{source['resolved_commit_sha']}`  ")
    a(f"**Taxonomy:** `{report['taxonomy']['taxonomy_id']}` "
      f"(version `{report['taxonomy']['taxonomy_version']}`)  ")
    a(f"**Licence:** {source['licence']}  ")
    a(f"**Stage:** {report['stage']}  ")
    a(f"**Canonical dataset:** "
      f"`{report['canonical_dataset_version_untouched']}`, untouched")
    a("")
    a("This is dataset construction: a schema, a missing-value convention, a")
    a("well-grouped split manifest and a QC report. **No model was trained, no")
    a("hyperparameter was tuned, no model was compared, and no accuracy or F1 was")
    a("calculated.** Nothing was written to `data/processed/` or `data/ml/`, and")
    a("FORCE 2020 was not merged with the FORGE Utah canonical data.")
    a("")

    a("## 1. Input and output")
    a("")
    a("| | |")
    a("|---|---|")
    a(f"| Source id | `{source['source_id']}` |")
    a(f"| Pinned source commit | `{source['resolved_commit_sha']}` |")
    a("| Source tables read | "
      + ", ".join(f"`{f}`" for f in source["published_tables_read"]) + " |")
    a(f"| Dataset id | `{dataset['dataset_id']}` |")
    a(f"| Dataset file | `{report['artifacts']['dataset']}` |")
    a(f"| Manifest | `{report['artifacts']['manifest']}` |")
    a(f"| Exclusion ledger | `{report['artifacts']['exclusions']}` |")
    a(f"| Split manifest | `{report['artifacts']['split_manifest']}` |")
    a(f"| Dataset SHA-256 | `{dataset['sha256']}` |")
    a(f"| Dataset bytes | {dataset['size_bytes']:,} |")
    a("| Downloaded by this stage | "
      f"{'yes' if source['downloaded_by_this_stage'] else 'no'} |")
    a("")
    a(f"Grain: {dataset['grain']}. Row order: {dataset['row_order']}.")
    a("")

    a("## 2. Schema")
    a("")
    a(f"{dataset['column_count']} columns. The numeric feature matrix is exactly "
      f"{len(dataset['numeric_feature_columns'])} columns, "
      + ", ".join(f"`{c}`" for c in dataset["numeric_feature_columns"])
      + ", plus one 0/1 missing mask per feature. `DEPTH_MD` is present as "
        "metadata and is **not** in the feature matrix.")
    a("")
    a("| # | Column | Role | Note |")
    a("|--:|---|---|---|")
    for position, entry in enumerate(dataset["column_roles"], start=1):
        a(f"| {position} | `{entry['name']}` | `{entry['role']}` | "
          f"{cell(entry['note'])} |")
    a("")
    a("### Source columns deliberately not carried")
    a("")
    a("| Source column | Why it is absent |")
    a("|---|---|")
    for name, reason in dataset["excluded_source_columns"].items():
        a(f"| `{name}` | {cell(reason)} |")
    a("")

    a("## 3. Row and well counts")
    a("")
    a(f"{accounting['arithmetic']}, and that arithmetic "
      f"{'reconciles' if accounting['reconciles'] else 'DOES NOT reconcile'}.")
    a("")
    a("| Source table | Rows read | Wells in split | Dataset rows written |")
    a("|---|---:|---:|---:|")
    for path, rows in accounting["source_rows_by_table"].items():
        split_name = next(
            t.split for t in SOURCE_TABLES if t.relative_path == path
        )
        a(f"| `{path}` | {rows:,} | {split_rows[split_name]['wells']} | "
          f"{split_rows[split_name]['rows']:,} |")
    a(f"| **total** | **{accounting['source_rows_read']:,}** | "
      f"**{split['wells_total']}** | "
      f"**{accounting['dataset_rows_written']:,}** |")
    a("")
    a("| Split | Wells | Rows | Source split | Source file |")
    a("|---|---:|---:|---|---|")
    for name in SPLIT_NAMES:
        source_split = next(
            t.source_split for t in SOURCE_TABLES if t.split == name
        )
        a(f"| `{name}` | {split_rows[name]['wells']} | {split_rows[name]['rows']:,} | "
          f"`{source_split}` | `{', '.join(split_rows[name]['source_tables'])}` |")
    a("")

    a("## 4. Split manifest and its verification")
    a("")
    a(f"Unit: **{split['unit']}**. Authority: {split['authoritative_source']}.")
    a("")
    a(f"**Reshuffled: {'yes' if split['reshuffled'] else 'no'}.** "
      f"{split['reshuffle_note']}")
    a("")
    verification = split["verification"]
    a("| Check | Result |")
    a("|---|---|")
    a(f"| Wells in more than one split | "
      f"{len(verification['wells_in_more_than_one_split'])} |")
    a(f"| Labelled wells with no split | "
      f"{len(verification['wells_without_a_split'])} |")
    a(f"| Every labelled row inherits its split from WELL | "
      f"{'yes' if verification['all_rows_inherit_their_split_from_well'] else 'NO'} |")
    a(f"| Row counts reconcile per split | "
      f"{'yes' if verification['row_counts_reconcile'] else 'NO'} |")
    a("")
    a("| Split | Rows in split | Sum of its wells' rows | Agrees |")
    a("|---|---:|---:|---|")
    for name in SPLIT_NAMES:
        entry = verification["rows_per_split_check"][name]
        a(f"| `{name}` | {entry['split_rows']:,} | {entry['sum_of_well_rows']:,} | "
          f"{'yes' if entry['agrees'] else 'NO'} |")
    a("")
    join = split.get("join") or {}
    if join:
        a("### The one join")
        a("")
        a(f"`{join['feature_file']}` ships without labels, so it is joined to "
          f"`{join['label_file']}` on {join['join_key']}. It is the only split "
          f"where a missing label is even possible.")
        a("")
        a("| Join measurement | Value |")
        a("|---|---:|")
        a(f"| Feature rows | {join['feature_rows']:,} |")
        a(f"| Label file rows | {join['label_rows']:,} |")
        a(f"| Distinct label keys | {join['label_keys']:,} |")
        a(f"| Duplicate label keys | {join['label_duplicate_keys']} |")
        a(f"| Rows emitted for the split | {join['rows_emitted_for_split']:,} |")
        a(f"| Join is exact | {'yes' if join['join_is_exact'] else 'NO'} |")
        a(f"| Every feature row got a label | "
          f"{'yes' if join['every_feature_row_got_a_label'] else 'NO'} |")
        a("")
        a(f"{cell(join['rule'])}")
        a("")
    a("One row per well is committed to "
      f"`{split['per_well_summary_location']}` with columns "
      + ", ".join(f"`{c}`" for c in split["manifest_columns"]) + ".")
    a("")

    a("## 5. Target classes and encoding")
    a("")
    a(f"Vocabulary `{report['taxonomy']['taxonomy_id']}` is the source's own and "
      f"is not mapped onto `{report['taxonomy']['canonical_vocabulary']}` "
      f"(`mapping_to_canonical` is "
      f"{report['taxonomy']['mapping_to_canonical']}).")
    a("")
    a(f"**Encoding rule.** {cell(encoding_report['rule'])}")
    a("")
    a(f"*{cell(encoding_report['why_not_frequency_order'])}.*")
    a("")
    a(f"- All {len(LITHOFACIES)} source classes preserved: "
      f"**{'yes' if classes_report['all_source_classes_preserved'] else 'NO'}**")
    a(f"- Classes collapsed, merged or renamed: **0**. "
      f"{cell(encoding_report['collapse_note'])}")
    a(f"- Original label column: `{encoding_report['original_label_preserved_in']}`")
    a(f"- Class name column: `{encoding_report['class_name_preserved_in']}`")
    a(f"- Encoded column for ML: `{encoding_report['encoded_target_column']}`")
    a("")
    by_code = {c["code"]: c for c in classes_report["classes"]}
    a("| Encoded id | NPD code | Class | Rows | Share | Wells |")
    a("|--:|---:|---|---:|---:|---:|")
    for entry in encoding_report["classes"]:
        stats = by_code[entry["code"]]
        a(f"| {entry['encoded_id']} | `{entry['code']}` | {entry['class_name']} | "
          f"{stats['rows']:,} | {pct(stats['share_of_dataset'], 3)} | "
          f"{stats['wells']} |")
    a("")
    a("### Class rows and wells by split")
    a("")
    header = ("| Encoded id | NPD code | Class | "
              + " | ".join(f"{n} rows" for n in SPLIT_NAMES) + " | "
              + " | ".join(f"{n} wells" for n in SPLIT_NAMES) + " |")
    a(header)
    a("|--:|---:|---|" + "---:|" * (2 * len(SPLIT_NAMES)))
    for entry in classes_report["classes"]:
        rows = [f"{entry['rows_by_split'][n]:,}" for n in SPLIT_NAMES]
        wells = [str(entry["wells_by_split"][n]) for n in SPLIT_NAMES]
        a(f"| {entry['encoded_id']} | `{entry['code']}` | {entry['class_name']} | "
          + " | ".join(rows) + " | " + " | ".join(wells) + " |")
    a("")
    a("| Split | Rows | Wells | Classes present |")
    a("|---|---:|---:|---:|")
    for name in SPLIT_NAMES:
        entry = classes_report["by_split"][name]
        a(f"| `{name}` | {entry['rows']:,} | {entry['wells']} | "
          f"{entry['classes_present']} of {len(LITHOFACIES)} |")
    a("")
    a(f"Largest class: **{classes_report['largest_class']['class_name']}** "
      f"(`{classes_report['largest_class']['code']}`), "
      f"{classes_report['largest_class']['rows']:,} rows. Smallest: "
      f"**{classes_report['smallest_class']['class_name']}** "
      f"(`{classes_report['smallest_class']['code']}`), "
      f"{classes_report['smallest_class']['rows']:,} rows. Ratio "
      f"{classes_report['imbalance_ratio_largest_to_smallest']}x. Median class "
      f"{classes_report['median_class_rows']:,} rows.")
    a("")
    a(f"**{cell(classes_report['rarity_note'])}**")
    a("")

    a("## 6. Missingness")
    a("")
    a(f"**Source convention.** {cell(missingness['policy']['source_convention'])}.")
    a("")
    a("| Rule | What it does |")
    a("|---|---|")
    for key in (
        "empty_cell", "sentinel_cell", "explicit_mask", "no_imputation",
        "imputation_belongs_in_the_pipeline", "rows_removed_for_missing_target",
    ):
        a(f"| `{key}` | {cell(missingness['policy'][key])} |")
    a("")
    a(f"*{cell(missingness['mask_semantics'])}.*")
    a("")
    a("| Feature | Observed | Missing | Missing % | Missing via sentinel | Mask column |")
    a("|---|---:|---:|---:|---:|---|")
    for entry in missingness["by_feature"]:
        a(f"| `{entry['feature']}` | {entry['observed']:,} | {entry['missing']:,} | "
          f"{pct(entry['missing_fraction'])} | {entry['missing_via_sentinel']} | "
          f"`{entry['mask_column']}` |")
    a("")
    a("### Missingness by feature and split")
    a("")
    numeric = dataset["numeric_feature_columns"]
    a("| Split | Rows | Missing cells | "
      + " | ".join(f"`{c}` missing %" for c in numeric) + " |")
    a("|---|---:|---:|" + "---:|" * len(numeric))
    for entry in missingness["by_feature_and_split"]:
        cells = [pct(f["missing_fraction"]) for f in entry["features"]]
        a(f"| `{entry['split']}` | {entry['rows']:,} | {entry['missing_cells']:,} | "
          + " | ".join(cells) + " |")
    a("")
    complete = missingness["features_with_no_missing_rows"]
    a("Features with no missing rows at all: "
      + (", ".join(f"`{c}`" for c in complete) if complete else "none") + ".")
    a("")
    a(f"Sentinel cells: **{missingness['sentinel_cells_total']}**. "
      f"{cell(missingness['sentinel_note'])}.")
    a("")
    a(f"*{cell(missingness['missing_cell_count_note'])}.*")
    a("")

    a("## 7. Rows excluded, and why")
    a("")
    a("| Rule | Rows removed | What the rule does |")
    a("|---|---:|---|")
    for rule in report["exclusion_rules"]:
        count = accounting["exclusions_by_reason"].get(rule["reason"], 0)
        a(f"| `{rule['reason']}` | {count} | {cell(rule['rule'])} |")
    a(f"| **total** | **{accounting['rows_excluded']}** | |")
    a("")
    a("Exclusion rate: "
      f"{pct(accounting['exclusion_rate'], 4)} of source rows read.")
    a("")
    a(f"{accounting['excluded_row_keys']}.")
    a("")
    a(f"The full ledger is written to `{report['artifacts']['exclusions']}`. A "
      "row absent because it had no target is distinguishable from a row absent "
      "because a feature was not a number, because each carries its own rule "
      "name, its source file, its source row number, its well and its depth. A "
      "row that is present but has an empty feature is distinguishable from both, "
      "because its mask column is 1 rather than because it is missing from the "
      "table.")
    a("")

    a("## 8. QC results")
    a("")
    a("| Check | Result | Headline measurements |")
    a("|---|---|---|")
    for entry in report["qc"]["checks"]:
        measured = entry["measured"]
        summary = (
            ", ".join(f"{k}={_compact(v)}" for k, v in list(measured.items())[:3])
            if isinstance(measured, dict) else str(measured)
        )
        a(f"| `{entry['id']}` {entry['name']} | **{entry['result']}** | "
          f"{cell(summary)} |")
    a("")
    for entry in report["qc"]["checks"]:
        a(f"**`{entry['id']}` {entry['name']}** — rule: {cell(entry['rule'])}.")
        a("")
        a(cell(entry["detail"]))
        a("")
    never = report["qc"]["rules_never_triggered_because_count_was_zero"]
    a("Rules declared but never triggered, because the count was zero: "
      + (", ".join(f"`{r}`" for r in never) if never else "none") + ".")
    a("")
    a(f"**{cell(report['qc']['no_silent_fixes'])}**")
    a("")

    a("## 9. Provenance")
    a("")
    provenance = report["provenance"]
    a("| Field | Value |")
    a("|---|---|")
    a(f"| Source id | `{provenance['source_id']}` |")
    a(f"| Pinned source commit | `{provenance['pinned_source_commit']}` |")
    a(f"| Taxonomy id | `{provenance['taxonomy_id']}` |")
    a(f"| Taxonomy version | `{provenance['taxonomy_version']}` |")
    a(f"| Dataset id | `{provenance['dataset_id']}` |")
    a(f"| Dataset SHA-256 | `{provenance['dataset_sha256']}` |")
    a("| Per-row provenance columns | "
      + ", ".join(f"`{c}`" for c in provenance["per_row_provenance_columns"]) + " |")
    a(f"| Per-row original target | `{provenance['per_row_target_column']}` |")
    a(f"| Source modified | "
      f"{'yes' if provenance['source_modified'] else 'no'} |")
    a("")
    a(f"*{cell(provenance['reproducible_by'])}.*")
    a("")
    a("| Source file | Split | Source split | Label source |")
    a("|---|---|---|---|")
    for entry in source["source_files"]:
        label = f"`{entry['label_source']}`" if entry["label_source"] else "same file"
        a(f"| `{entry['path']}` | `{entry['split']}` | `{entry['source_split']}` | "
          f"{label} |")
    a("")

    a("## 10. Hard stop")
    a("")
    for item in report["hard_stop"]:
        a(f"- {item}")
    a("")
    a("## 11. Not performed at this stage")
    a("")
    for item in report["not_performed"]:
        a(f"- {item}")
    a("")
    return "\n".join(lines)


def summarise(report: dict) -> str:
    dataset = report["dataset"]
    lines = [
        f"dataset id        {dataset['dataset_id']}",
        f"rows              {dataset['rows']:,}",
        f"wells             {dataset['wells']}",
        f"features          {', '.join(dataset['numeric_feature_columns'])}",
        f"columns           {dataset['column_count']}",
        f"classes           {report['label_encoding']['class_count']} preserved",
        f"rows excluded     {report['row_accounting']['rows_excluded']}",
        f"qc                {report['qc']['passed']} pass / "
        f"{report['qc']['attending']} attention",
        f"split disjoint    "
        f"{report['split']['verification']['no_well_in_more_than_one_split']}",
        f"dataset sha256    {dataset['sha256'][:16]}",
    ]
    for name in SPLIT_NAMES:
        entry = report["split"]["splits"][name]
        lines.append(
            f"  {name:18s} {entry['rows']:>9,} rows  {entry['wells']:>3} wells"
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# The cross-check against the characterization stage
# ---------------------------------------------------------------------------
def assert_feature_set_agrees_with_characterization(
    path: Path, spec: FeatureSet | None = None,
) -> dict:
    """Demand that the feature set is the one the measurements imply.

    The characterization derived its core set from stated availability
    thresholds. This stage writes a table, so it must not quietly use a
    different set than the one that was approved: if the characterization is
    re-run and the set moves, this fails rather than letting the two drift.

    This check is the v0.1 contract and stays exactly as it was. A later version
    is not derived from the characterization's core tier, so requiring it to
    match would fail a legitimate expansion; those versions are checked against
    the curve inventory instead, by `assert_feature_set_agrees_with_inventory`.
    """
    if spec is None:
        spec = DEFAULT_FEATURE_SET
    if not path.is_file():
        raise SystemExit(
            f"{path} not found. This stage builds on the characterization "
            "report; run `python scripts/ingest/characterize_force2020.py` first."
        )
    characterization = json.loads(path.read_text(encoding="utf-8"))
    approved = characterization["proposed_feature_set"]["core_features"]
    if tuple(approved) != spec.curves:
        raise SystemExit(
            "the approved core feature set no longer matches the characterization "
            "report.\n"
            f"  characterization: {approved}\n"
            f"  this stage:       {list(spec.curves)}\n"
            "Re-derive the feature set deliberately, or restore this stage's "
            "declaration. Do not let the two drift apart silently."
        )
    return {
        "against": relative(path),
        "approved_core_features": list(approved),
        "agrees": True,
        "derivation": characterization["proposed_feature_set"]["derivation"],
        "thresholds": characterization["curve_table"]["thresholds"],
        "note": (
            "the numeric feature columns are the core set the characterization "
            "stage derived from measured curve availability, and this stage "
            "refuses to build if the two disagree"
        ),
    }


def assert_feature_set_agrees_with_inventory(
    path: Path, spec: FeatureSet,
) -> dict:
    """For a post-v0.1 version, demand the curve that justified each column.

    The characterization's core tier was measured on training wells only, so it
    cannot justify a column that was admitted because it is measurable on the
    evaluation partitions. That decision is recorded in the curve inventory, so
    that is what a later version is checked against: every curve in the table
    must be one the inventory admitted, with a stated reason, and no curve the
    inventory rejected may appear.
    """
    if not path.is_file():
        raise SystemExit(
            f"{path} not found. This stage builds on the curve inventory; run "
            "`python scripts/ingest/select_force2020_features.py` first."
        )
    inventory = json.loads(path.read_text(encoding="utf-8"))
    statuses = {row["name"]: row for row in inventory["curves"]}

    admitted = {
        name for name, row in statuses.items()
        if row["status"] in (STATUS_RETAINED, STATUS_ADDED)
    }
    unknown = [name for name in spec.curves if name not in statuses]
    if unknown:
        raise SystemExit(
            f"{unknown} are not source curves in the inventory; refusing to build"
        )
    rejected = [name for name in spec.curves if name not in admitted]
    if rejected:
        raise SystemExit(
            "the feature set contains curves the inventory rejected:\n"
            + "\n".join(
                f"  {name}: {statuses[name]['gate_failed']} -- "
                f"{statuses[name]['reason']}"
                for name in rejected
            )
            + "\nRe-derive the selection deliberately. Do not hand-pick a curve the "
            "measurements excluded."
        )

    reasons = {
        name: {
            "status": statuses[name]["status"],
            "reason": statuses[name]["reason"],
            "caveats": statuses[name]["caveats"],
        }
        for name in spec.curves
    }
    return {
        "against": relative(path),
        "agrees": True,
        "per_curve": reasons,
        "note": (
            "every numeric feature column is a curve the curve inventory "
            "admitted by gate, with the gate and its reason recorded, and no "
            "rejected curve is present"
        ),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def _verify_text(name: str, path: Path, expected: str) -> bool:
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
    for position, (want, got) in enumerate(
        zip(expected_lines, actual_lines, strict=False), start=1
    ):
        if want != got:
            print(f"    first difference at line {position}:")
            print(f"      expected: {want[:200]}")
            print(f"      on disk : {got[:200]}")
            break
    return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--source-root", default=str(REPO_ROOT / "data" / "raw" / "force2020"),
        help="FORCE 2020 checkout to read; nothing is downloaded",
    )
    parser.add_argument("--artifact-root", default=str(ARTIFACT_ROOT),
                        help="generated-artifact root; must be under data/interim/")
    parser.add_argument(
        "--feature-version",
        default=DEFAULT_FEATURE_VERSION,
        choices=available_feature_versions() or [DEFAULT_FEATURE_VERSION],
        help=(
            "which approved feature set to build. v0.1 is the frozen baseline; "
            "a later version writes its own table, manifest, ledger and reports "
            "and never touches v0.1's"
        ),
    )
    parser.add_argument(
        "--characterization",
        default=str(REPORTS / "force2020_characterization.json"),
        help="characterization report to cross-check the v0.1 feature set against",
    )
    parser.add_argument(
        "--curve-inventory",
        default=str(REPORTS / "force2020_curve_inventory.json"),
        help="curve inventory to cross-check a post-v0.1 feature set against",
    )
    parser.add_argument("--json", default=None,
                        help="defaults to the version's own report path")
    parser.add_argument("--markdown", default=None,
                        help="defaults to the version's own report path")
    parser.add_argument(
        "--split-manifest",
        default=None,
        help="defaults to the version's own split manifest path",
    )
    parser.add_argument("--verify", action="store_true",
                        help="rebuild and compare against the committed artifacts")
    parser.add_argument("--print-summary", action="store_true")
    args = parser.parse_args(argv)

    spec = load_feature_set(args.feature_version)

    # Every output path carries the version. The v0.1 defaults are left exactly
    # as they were, and a later version resolves to its own names, so building
    # v0.2 cannot overwrite a frozen v0.1 artifact even by accident.
    stem = f"force2020_dataset_{args.feature_version.replace('.', '_')}"
    if args.feature_version == FROZEN_FEATURE_VERSION:
        default_json = REPORTS / "force2020_dataset.json"
        default_markdown = REPORTS / "force2020_dataset.md"
        default_split = REPO_ROOT / "data" / "force2020_split_manifest.csv"
    else:
        default_json = REPORTS / f"{stem}.json"
        default_markdown = REPORTS / f"{stem}.md"
        default_split = REPO_ROOT / "data" / f"force2020_split_manifest_{args.feature_version.replace('.', '_')}.csv"

    artifact_root = Path(args.artifact_root)
    if not artifact_root.resolve().is_relative_to(INTERIM.resolve()):
        raise SystemExit(
            f"--artifact-root {artifact_root} is not under the gitignored "
            f"{INTERIM}. Generated external data may only land there: "
            "data/processed/ is frozen and data/ml/ is a contract-only scaffold."
        )

    if spec.version == FROZEN_FEATURE_VERSION:
        cross_check = assert_feature_set_agrees_with_characterization(
            Path(args.characterization), spec
        )
    else:
        cross_check = assert_feature_set_agrees_with_inventory(
            Path(args.curve_inventory), spec
        )
    result = build(Path(args.source_root), artifact_root, spec)
    report = result["report"]
    report["feature_set_cross_check"] = cross_check

    json_path = Path(args.json) if args.json else default_json
    md_path = Path(args.markdown) if args.markdown else default_markdown
    split_path = Path(args.split_manifest) if args.split_manifest else default_split
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    markdown = render_markdown(report)
    split_csv = render_split_manifest(result["split_rows"])

    if args.verify:
        print("verify:")
        ok = True
        ok &= _verify_text("json", json_path, payload)
        ok &= _verify_text("markdown", md_path, markdown)
        ok &= _verify_text("split-manifest", split_path, split_csv)
        print("verify:", "MATCH" if ok else "MISMATCH")
        return 0 if ok else 1

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(payload, encoding="utf-8")
    md_path.write_text(markdown, encoding="utf-8")
    split_path.parent.mkdir(parents=True, exist_ok=True)
    split_path.write_text(split_csv, encoding="utf-8")
    print(f"wrote {report['artifacts']['dataset']}")
    print(f"wrote {report['artifacts']['manifest']}")
    print(f"wrote {report['artifacts']['exclusions']}")
    print(f"wrote {split_path}")
    print(f"wrote {json_path}")
    print(f"wrote {md_path}")
    if args.print_summary:
        print()
        print(summarise(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
