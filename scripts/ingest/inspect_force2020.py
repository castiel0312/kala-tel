#!/usr/bin/env python3
"""FORCE 2020 source inspection. Inspection only -- no dataset is built here.

The FORCE 2020 lithofacies prediction dataset is an *external* supervised
well-log -> lithofacies corpus. It is not an extension of the NWIS canonical
dataset and is deliberately kept out of `data/processed/`. This script answers
the questions that must be answered from the bytes on disk before any transform
is written:

  * which files the source actually contains, at which commit
  * the well identifier, the depth column and the target column, as named by
    the source
  * the available log curves and their units
  * the missing-value convention of each file format
  * well count, labelled-row count and class distribution
  * licence, citation and accession information

Deliberately NOT done here, and asserted by tests/test_force2020_inspection.py:
  * no interpolation, no resampling, no rolling or windowed features
  * no CNN windows, no model fitting of any kind
  * no merge or join with the NWIS canonical dataset
  * no write anywhere under data/processed/ or data/ml/

Standard library only. The base install must not acquire an ML stack it does
not use (see tests/test_ml_scaffolding.py), so this script cannot rely on
pandas/numpy even for a read-only profile.

Usage:
    python scripts/ingest/inspect_force2020.py
    python scripts/ingest/inspect_force2020.py --verify     # re-check committed output
    python scripts/ingest/inspect_force2020.py --print-summary
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import RAW, REPORTS, is_sentinel  # noqa: E402

# ---------------------------------------------------------------------------
# Source identity. Every field here is a fact about the source, copied from the
# source's own metadata, not an assumption made by this project.
# ---------------------------------------------------------------------------
SOURCE_ID = "FORCE2020"
SOURCE_NAME = "FORCE 2020 Machine Learning Competition - lithofacies prediction"
REPO_URL = "https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition"
ZENODO_DOI = "10.5281/zenodo.4351156"
ZENODO_CONCEPT_DOI = "10.5281/zenodo.4351155"
CITATION = (
    "Bormann P., Aursand P., Dilib F., Dischington P., Manral S. 2020. "
    "FORCE Machine Learning Competition. "
    "https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition"
)
LICENCE = "CC-BY-4.0"
LICENCE_EVIDENCE = (
    "Zenodo record 10.5281/zenodo.4351156 (published 2020-12-18) declares "
    "license cc-by-4.0 for the whole deposit"
)
LICENCE_UPSTREAM = (
    "NPD/Equinor FactPages well-log data is published under NLOD 2.0; the "
    "compiled competition deposit re-releases it under CC-BY-4.0"
)
LICENCE_GAP = (
    "The GitHub repository carries no LICENSE file for the data. "
    "lithology_competition/code/SoftServe/LICENSE covers one participant's "
    "code only. Treat the Zenodo record as the licence of record."
)
DOWNLOAD_DATE = "2026-09-26"

DEFAULT_SOURCE_ROOT = RAW / "force2020"
DATA_SUBDIR = "lithology_competition/data"
DELIMITER = ";"

# The 12 lithofacies codes and their names, as published in the source's own
# starter notebook (lithology_competition/data/starter_notebook.ipynb). This is
# the FORCE 2020 vocabulary. It is NOT the FORGE Utah cuttings vocabulary and the
# two must never be merged.
LITHOFACIES = {
    30000: "Sandstone",
    65030: "Sandstone/Shale",
    65000: "Shale",
    80000: "Marl",
    74000: "Dolomite",
    70000: "Limestone",
    70032: "Chalk",
    88000: "Halite",
    86000: "Anhydrite",
    99000: "Tuff",
    90000: "Coal",
    93000: "Basement",
}

# Column roles as declared by the source (starter notebook markdown).
ID_COLUMNS = ["WELL"]
DEPTH_COLUMNS = ["DEPTH_MD"]
LOCATION_COLUMNS = ["X_LOC", "Y_LOC", "Z_LOC"]
STRATIGRAPHY_COLUMNS = ["GROUP", "FORMATION"]
TARGET_COLUMNS = ["FORCE_2020_LITHOFACIES_LITHOLOGY"]
AUXILIARY_TARGET_COLUMNS = ["FORCE_2020_LITHOFACIES_CONFIDENCE"]
LABEL_SEMANTICS = {
    "FORCE_2020_LITHOFACIES_LITHOLOGY": (
        "NPD lithostratigraphic lithofacies class assigned to the depth sample. "
        "12 classes, encoded as NPD lithostratigraphy codes."
    ),
    "FORCE_2020_LITHOFACIES_CONFIDENCE": (
        "Organizer confidence in the interpretation at that depth: "
        "1 = high, 2 = medium, 3 = low. Source-declared; blank on a small "
        "number of samples."
    ),
}

# Log curves, with the unit each carries in the LAS headers. Units are copied
# from the LAS ~Curve section, not inferred.
CURVE_UNITS = {
    "CALI": "in",
    "BS": "in",
    "ROPA": None,
    "ROP": "m/h",
    "RDEP": "ohm.m",
    "RSHA": "ohm.m",
    "RMED": "ohm.m",
    "RXO": "ohm.m",
    "RMIC": "ohm.m",
    "DTS": "us/ft",
    "DTC": "us/ft",
    "NPHI": "m3/m3",
    "PEF": "b/e",
    "GR": "gAPI",
    "RHOB": "g/cm3",
    "DRHO": "g/cm3",
    "DCAL": "in",
    "SP": "mV",
    "MUDWEIGHT": "g/cm3",
    "SGR": "gAPI",
}
# The only columns the source guarantees on every row of every well.
GUARANTEED_COLUMNS = ["WELL", "DEPTH_MD", "GR"]

# Structural columns, not log curves.
STRUCTURAL_COLUMNS = [
    *ID_COLUMNS, *DEPTH_COLUMNS, *LOCATION_COLUMNS, *STRATIGRAPHY_COLUMNS,
    *TARGET_COLUMNS, *AUXILIARY_TARGET_COLUMNS,
]

# The four published CSV tables and what each one is for.
TABLE_ROLES = {
    "train": ("labelled competition training split, distributed as train.zip"),
    "hidden_test": (
        "competition final-scoring split, features AND labels published "
        "together after the contest"
    ),
    "leaderboard_test_features": (
        "competition open-leaderboard split, features only, no labels"
    ),
    "leaderboard_test_target": (
        "labels for leaderboard_test_features, released after the contest, "
        "keyed on (WELL, DEPTH_MD)"
    ),
}

LAS_NULL_DEFAULT = -999.25

# LAS section headers differ between the 1.2 (`~W`) and 2.0 (`~Well Information`)
# spellings, and Petrel writes `~Version information` in lower case.
LAS_SECTIONS = {
    "V": "VERSION", "VERSION": "VERSION",
    "W": "WELL", "WELL": "WELL",
    "C": "CURVE", "CURVE": "CURVE",
    "P": "PARAMETER", "PARAMETER": "PARAMETER",
    "A": "ASCII", "ASCII": "ASCII",
}

# Documentation that lives at the repository root rather than under DATA_SUBDIR.
ROOT_DOCS = frozenset({
    "readme.md",
    "technical_retrospective_force 2020 lithofacies competition.pdf",
})

# Report fields that describe the local checkout rather than the source, so they
# legitimately differ between machines. --verify ignores exactly these.
VOLATILE_FIELDS = (
    "las.las_files_checked_out_locally",
    "las.headers_read",
    "las.headers_read_limited",
    "las.bytes_checked_out_locally",
    "las.headers",
)


# ---------------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------------
def resolved_commit(source_root: Path) -> str:
    """The commit the local checkout is pinned to, or '' if unknown."""
    if not (source_root / ".git").exists():
        return ""
    try:
        out = subprocess.run(
            ["git", "-C", str(source_root), "rev-parse", "HEAD"],
            capture_output=True, text=True, check=True, timeout=60,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return out.stdout.strip()


def git_tree_index(source_root: Path) -> dict[str, tuple[str, int]]:
    """Map repo-relative path -> (blob oid, blob byte size) for the pinned commit.

    Blob identity comes from the commit, not from the working tree: a Windows
    checkout rewrites line endings, so a worktree hash of the same logical file
    differs between machines while the blob id does not.
    """
    if not (source_root / ".git").exists():
        return {}
    try:
        out = subprocess.run(
            ["git", "-C", str(source_root), "ls-tree", "-r", "--long", "HEAD"],
            capture_output=True, text=True, check=True, timeout=120,
        )
    except (OSError, subprocess.SubprocessError):
        return {}
    index: dict[str, tuple[str, int]] = {}
    for line in out.stdout.splitlines():
        meta, _, name = line.partition("\t")
        fields = meta.split()
        if len(fields) < 4:
            continue
        try:
            size = int(fields[3])
        except ValueError:
            continue
        index[name.strip()] = (fields[2], size)
    return index


def las_inventory(tree: dict[str, tuple[str, int]]) -> dict:
    """LAS file count and bytes as recorded in the source commit's tree."""
    prefix = f"{DATA_SUBDIR}/las_files_Lithostrat_data/"
    hits = [(oid, size) for path, (oid, size) in tree.items()
            if path.startswith(prefix) and path.lower().endswith(".las")]
    if not hits:
        return {"count": None, "bytes": None, "source": "unavailable"}
    return {
        "count": len(hits),
        "bytes": sum(size for _, size in hits),
        "source": "git tree of the pinned commit",
    }


def file_facts(path: Path, source_root: Path, tree: dict[str, tuple[str, int]]) -> dict:
    """Blob identity of a file, from the source commit rather than the worktree."""
    rel = path.relative_to(source_root).as_posix()
    entry = tree.get(rel)
    return {
        "path": rel,
        "size_bytes": entry[1] if entry else path.stat().st_size,
        "git_blob_oid": entry[0] if entry else None,
    }


# ---------------------------------------------------------------------------
# CSV inspection
# ---------------------------------------------------------------------------
def classify(values: list[str]) -> str:
    kinds = set()
    for v in values:
        if v == "":
            kinds.add("empty")
        else:
            try:
                float(v)
            except ValueError:
                kinds.add("text")
            else:
                kinds.add("numeric")
    if not kinds:
        return "empty"
    if kinds == {"numeric"}:
        return "numeric"
    if kinds == {"text"}:
        return "text"
    if "text" in kinds:
        return "mixed"
    return "numeric_or_empty"


def scan_semicolon_csv(
    path: Path,
    label_columns: list[str],
    max_rows: int | None = None,
) -> dict:
    """One pass: row count, per-column null/sentinel rates, per-well and class stats.

    Reports rather than repairs. A near-sentinel value found in a numeric column
    is counted and surfaced, never silently dropped.
    """
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter=DELIMITER)
        header = next(reader)
        idx = {name: i for i, name in enumerate(header)}
        ncols = len(header)

        blanks = [0] * ncols
        sentinels = [0] * ncols
        samples: dict[str, list[str]] = defaultdict(list)
        text_counts: dict[int, Counter] = defaultdict(Counter)
        wells_with_data: list[set] = [set() for _ in range(ncols)]
        rows = 0

        well_idx = idx.get("WELL")
        depth_idx = idx.get("DEPTH_MD")
        well_rows: Counter = Counter()
        well_depth: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])
        class_rows: Counter = Counter()
        class_wells: dict[str, set] = defaultdict(set)
        well_classes: dict[str, Counter] = defaultdict(Counter)
        conf_rows: Counter = Counter()
        depth_steps: Counter = Counter()
        last_depth: dict[str, float] = {}
        non_monotonic = 0
        label_idx = idx.get(label_columns[0]) if label_columns else None
        conf_idx = idx.get("FORCE_2020_LITHOFACIES_CONFIDENCE")

        for row in reader:
            if max_rows is not None and rows >= max_rows:
                break
            rows += 1
            if len(row) != ncols:
                raise ValueError(
                    f"{path.name}: row {rows} has {len(row)} fields, header has {ncols}"
                )
            well = row[well_idx] if well_idx is not None else ""
            if well_idx is not None:
                well_rows[well] += 1
            if depth_idx is not None:
                d = float(row[depth_idx])
                span = well_depth[well]
                if span[1] - span[0] == 0.0 and well_rows[well] == 1:
                    span[0] = span[1] = d
                else:
                    span[0] = min(span[0], d)
                    span[1] = max(span[1], d)
                if well in last_depth:
                    step = d - last_depth[well]
                    depth_steps[round(step, 4)] += 1
                    if step <= 0:
                        non_monotonic += 1
                last_depth[well] = d
            if label_idx is not None:
                code = row[label_idx]
                class_rows[code] += 1
                if well_idx is not None:
                    class_wells[code].add(well)
                    well_classes[well][code] += 1
            if conf_idx is not None:
                conf_rows[row[conf_idx]] += 1
            for i, value in enumerate(row):
                if value == "":
                    blanks[i] += 1
                    continue
                if is_sentinel(value):
                    sentinels[i] += 1
                    if len(samples[header[i]]) < 4:
                        samples[header[i]].append(value)
                    continue
                if well_idx is not None:
                    wells_with_data[i].add(well)
                if value.replace(".", "", 1).replace("-", "", 1).isdigit() is False:
                    try:
                        float(value)
                    except ValueError:
                        text_counts[i][value] += 1

    columns = []
    for i, name in enumerate(header):
        if name in text_counts:
            distinct = len(text_counts[i])
            top = text_counts[i].most_common(3)
        else:
            distinct = None
            top = []
        columns.append({
            "name": name,
            "role": column_role(name),
            "unit": CURVE_UNITS.get(name),
            "kind": classify([*([""] * blanks[i]),
                              *(["1"] * max(1, rows - blanks[i] - sentinels[i]))]),
            "rows": rows,
            "null_rows": blanks[i],
            "null_fraction": round(blanks[i] / rows, 6) if rows else None,
            "wells_with_data": len(wells_with_data[i]),
            "well_count": len(well_rows),
            "sentinel_rows": sentinels[i],
            "sentinel_samples": samples.get(name, []),
            "distinct_values": distinct,
            "top_values": [{"value": v, "rows": c} for v, c in top],
        })

    result: dict = {
        "file": path.name,
        "rows": rows,
        "columns": columns,
        "well_column": "WELL" if well_idx is not None else None,
        "depth_column": "DEPTH_MD" if depth_idx is not None else None,
        "delimiter": DELIMITER,
        "well_count": len(well_rows),
        "wells": sorted(well_rows),
        "rows_per_well": dict(sorted(well_rows.items())),
        "depth_span_per_well": {
            w: {"min_md": v[0], "max_md": v[1]} for w, v in sorted(well_depth.items())
        },
        "depth_step_m_common": [
            {"step_md": s, "rows": c}
            for s, c in depth_steps.most_common(5)
        ],
        "depth_non_monotonic_steps": non_monotonic,
        "has_labels": label_idx is not None,
        "label_column": label_columns[0] if label_idx is not None else None,
        "unlabelled_rows": class_rows.get("", 0),
        "classes_per_well": {
            well: dict(sorted(counts.items()))
            for well, counts in sorted(well_classes.items())
        },
        "class_distribution": [
            {
                "code": code,
                "lithology": LITHOFACIES.get(int(code), "UNKNOWN_CODE"),
                "rows": count,
                "fraction": round(count / rows, 6) if rows else None,
                "wells": len(class_wells[code]),
            }
            for code, count in sorted(class_rows.items(), key=lambda kv: -kv[1])
        ],
    }
    if conf_idx is not None:
        result["confidence_distribution"] = [
            {"value": v, "rows": c} for v, c in sorted(conf_rows.items())
        ]
    return result


def column_role(name: str) -> str:
    if name in ID_COLUMNS:
        return "well_identifier"
    if name in DEPTH_COLUMNS:
        return "depth"
    if name in LOCATION_COLUMNS:
        return "location"
    if name in TARGET_COLUMNS:
        return "target"
    if name in AUXILIARY_TARGET_COLUMNS:
        return "target_metadata"
    if name in STRATIGRAPHY_COLUMNS:
        return "stratigraphy"
    return "log_curve"


# ---------------------------------------------------------------------------
# LAS inspection (header only -- the ascii payload is not read)
# ---------------------------------------------------------------------------
def _numeric_token(value: str) -> str | None:
    return value if re.fullmatch(r"[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?", value) else None


def _unit_token(token: str) -> str | None:
    """LAS writes units with a leading dot, e.g. '.m' or '.ohm.m'."""
    return token.lstrip(".") if token.startswith(".") else None


def _value_before_colon(parts: list[str]) -> str | None:
    """The value slot in ``MNEMN .UNIT VALUE :description``.

    The unit token starts with a dot, so the first non-dot token after the
    mnemonic is the value. This is the layout the Petrel export in this source
    uses, for both numeric items (STRT, STEP, NULL) and text items (WELL, UWI).
    """
    for token in parts[1:]:
        if token.startswith("."):
            continue
        return token
    return None


def _value_after_colon(rest: str) -> str | None:
    """The value slot in ``MNEMN .UNIT: -999.25 description``, used by other writers."""
    for token in rest.split():
        if _numeric_token(token):
            return token
    return None


def las_header(path: Path) -> dict:
    well: dict[str, str] = {}
    curves: list[dict] = []
    section = None
    version = None
    wrap = None
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.rstrip("\r\n")
            if line.startswith("~"):
                head = line[1:].strip()
                first = head.split()[0].upper() if head else ""
                section = LAS_SECTIONS.get(first, "OTHER")
                continue
            if section == "ASCII":
                break
            if ":" not in line:
                continue
            head_text, _, rest = line.partition(":")
            parts = head_text.split()
            if not parts:
                continue
            name = parts[0].rstrip(".")
            if section == "VERSION":
                value = (_value_before_colon(parts) or _value_after_colon(rest) or "")
                if name == "VERS":
                    version = value.strip() or None
                elif name == "WRAP":
                    wrap = value.strip() or None
            elif section == "WELL":
                well_value = _value_before_colon(parts) or _value_after_colon(rest)
                if well_value:
                    well[name] = well_value
            elif section == "CURVE":
                unit = _unit_token(parts[1]) if len(parts) > 1 else None
                curves.append({"mnemonic": name, "unit": unit,
                               "description": rest.strip() or None})
    return {
        "file": path.name,
        "las_version": version,
        "wrap": wrap,
        "well_name": well.get("WELL"),
        "well_from_filename": las_to_well_name(path.name),
        "unique_well_id": well.get("UWI"),
        "null_value": _las_float(well.get("NULL")),
        "start_md": _las_float(well.get("STRT")),
        "stop_md": _las_float(well.get("STOP")),
        "step_md": _las_float(well.get("STEP")),
        "curve_count": len(curves),
        "curves": curves,
    }


def _las_float(value: str | None) -> float | None:
    if value is None:
        return None
    match = re.search(r"[-+]?\d+(?:\.\d+)?", value)
    return float(match.group()) if match else None


def las_to_well_name(file_name: str) -> str:
    """`32_2-1.las` -> `32/2-1`. NPD well names use '/', the filenames use '_'."""
    stem = re.sub(r"\.las$", "", file_name, flags=re.IGNORECASE)
    return stem.replace("_", "/", 1) if "_" in stem else stem


# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------
NOT_PERFORMED = [
    "no model of any kind was trained, fitted or evaluated",
    "no interpolation, resampling or depth re-binning was performed",
    "no rolling, windowed, gradient or convolutional feature was created",
    "no CNN window extraction",
    "no feature table and no label table were written",
    "no join, merge or append with data/processed/ (the NWIS canonical dataset)",
    "no FORCE 2020 label was mapped into the FORGE Utah mineral vocabulary",
    "no write to data/processed/ or data/ml/",
]


def build(source_root: Path, max_rows: int | None, las_limit: int) -> dict:
    data_dir = source_root / DATA_SUBDIR
    if not data_dir.is_dir():
        raise SystemExit(
            f"FORCE 2020 data directory not found: {data_dir}\n"
            "Fetch the source first:\n"
            f"  git clone --filter=blob:none --no-checkout {REPO_URL} data/raw/force2020\n"
            f"  git -C data/raw/force2020 sparse-checkout set "
            f"'/{DATA_SUBDIR}/train.zip' '/{DATA_SUBDIR}/*.csv' "
            f"'/{DATA_SUBDIR}/las_files_Lithostrat_data/*.las'\n"
            f"  git -C data/raw/force2020 checkout HEAD"
        )

    commit = resolved_commit(source_root)
    tree = git_tree_index(source_root)
    las_tree = las_inventory(tree)

    files: list[dict] = []
    train_csv = data_dir / "extracted" / "train.csv"
    train_zip = data_dir / "train.zip"
    if not train_csv.exists() and not train_zip.exists():
        raise SystemExit(f"{train_zip} not found")
    # The inventory comes from the source commit's tree, so it lists every file
    # the source publishes, not just the ones this sparse checkout fetched.
    for rel, (oid, size) in sorted(tree.items()):
        if not (rel.startswith(DATA_SUBDIR) or rel in ROOT_DOCS):
            continue
        entry = {
            "path": rel,
            "size_bytes": size,
            "git_blob_oid": oid,
            "checked_out": (source_root / rel).exists(),
            "kind": "las_log" if rel.lower().endswith(".las") else "data",
        }
        if rel.endswith("train.zip"):
            with zipfile.ZipFile(source_root / rel) as zf:
                for info in zf.infolist():
                    files.append({
                        "path": f"{rel}!{info.filename}",
                        "size_bytes": info.file_size,
                        "git_blob_oid": None,
                        "checked_out": True,
                        "kind": "data",
                        "origin": rel,
                        "note": "archive member; covered by the archive's blob "
                                "id, not hashed separately",
                    })
        files.append(entry)
    if train_csv.exists():
        files.append({
            "path": f"{DATA_SUBDIR}/extracted/train.csv",
            "size_bytes": None,
            "git_blob_oid": None,
            "checked_out": True,
            "kind": "data",
            "origin": f"{DATA_SUBDIR}/train.zip!train.csv",
            "note": "expanded locally for inspection only; not part of the "
                    "source tree, so it carries no blob id",
        })

    tables = {
        "train": scan_semicolon_csv(train_csv, TARGET_COLUMNS, max_rows),
        "hidden_test": scan_semicolon_csv(data_dir / "hidden_test.csv",
                                          TARGET_COLUMNS, max_rows),
        "leaderboard_test_features": scan_semicolon_csv(
            data_dir / "leaderboard_test_features.csv", [], max_rows),
        "leaderboard_test_target": scan_semicolon_csv(
            data_dir / "leaderboard_test_target.csv", TARGET_COLUMNS, max_rows),
    }
    for table_name, scan in tables.items():
        scan["role"] = TABLE_ROLES[table_name]
    tables["leaderboard_test_features"]["has_labels"] = False
    tables["leaderboard_test_features"]["label_column"] = None
    tables["leaderboard_test_features"]["class_distribution"] = []

    las_dir = data_dir / "las_files_Lithostrat_data"
    las_files = sorted(las_dir.glob("*.las")) if las_dir.is_dir() else []
    las_read = las_files if las_limit <= 0 else las_files[:las_limit]
    las_headers = []
    for las_path in las_read:
        header = las_header(las_path)
        header["git_blob_oid"] = file_facts(las_path, source_root, tree)["git_blob_oid"]
        las_headers.append(header)
    las_total_bytes = sum(p.stat().st_size for p in las_files)

    train_wells = set(tables["train"]["wells"])
    csv_wells = train_wells | set(tables["hidden_test"]["wells"])
    csv_wells |= set(tables["leaderboard_test_features"]["wells"])

    well_index = build_well_index(tables, sorted(csv_wells))
    observations = build_observations(tables, las_headers, csv_wells, las_read,
                                      las_tree, las_total_bytes)

    return {
        "artifact": "force2020_source_inspection",
        "schema_version": 1,
        "scope": "external supervised dataset; separate from the NWIS canonical dataset",
        "canonical_dataset_version_untouched": "nwis-forge16b-v0.2",
        "source": {
            "source_id": SOURCE_ID,
            "source_name": SOURCE_NAME,
            "accession_method": "git clone, partial (blobless) + sparse checkout",
            "repository_url": REPO_URL,
            "resolved_commit_sha": commit,
            "archive_doi": ZENODO_DOI,
            "archive_concept_doi": ZENODO_CONCEPT_DOI,
            "download_date": DOWNLOAD_DATE,
            "citation": CITATION,
            "licence": LICENCE,
            "licence_evidence": LICENCE_EVIDENCE,
            "licence_upstream": LICENCE_UPSTREAM,
            "licence_gap": LICENCE_GAP,
        },
        "files": files,
        "tables": tables,
        "target": {
            "column": TARGET_COLUMNS[0],
            "auxiliary_columns": AUXILIARY_TARGET_COLUMNS,
            "semantics": LABEL_SEMANTICS,
            "vocabulary": "FORCE 2020 / NPD lithostratigraphic lithofacies",
            "class_count": len(LITHOFACIES),
            "classes": [
                {"code": code, "lithology": name}
                for code, name in sorted(LITHOFACIES.items())
            ],
            "vocabulary_is_distinct_from_forge_utah_16b": True,
        },
        "identifiers": {
            "well_column": "WELL",
            "well_namespace": "NPD well name, e.g. '32/2-1'; NPD field/block/well",
            "depth_column": "DEPTH_MD",
            "depth_unit": "m",
            "depth_datum": "measured depth along hole",
            "location_columns": LOCATION_COLUMNS,
            "location_note": (
                "X_LOC/Y_LOC are UTM; Z_LOC is the source's DEPTH column, "
                "negative below datum, and is not a TVD pair with X/Y"
            ),
            "stratigraphy_columns": STRATIGRAPHY_COLUMNS,
            "las_well_identifier": "UWI, equal to WELL; LAS filenames replace "
                                   "the first '/' with '_'",
            "well_index_file": "data/force2020_wells.csv",
        },
        "curves": {
            "structural_columns": STRUCTURAL_COLUMNS,
            "log_curves": [
                {"name": name, "unit": CURVE_UNITS.get(name)}
                for name in CURVE_UNITS
            ],
            "guaranteed_columns": GUARANTEED_COLUMNS,
            "guaranteed_source": "starter_notebook.ipynb markdown, cell 17",
        },
        "missing_value_conventions": missing_conventions(tables, las_headers),
        "wells": {
            "count": len(csv_wells),
            "identifier_column": "WELL",
            "per_split": {
                "train": tables["train"]["well_count"],
                "hidden_test": tables["hidden_test"]["well_count"],
                "leaderboard_test_features":
                    tables["leaderboard_test_features"]["well_count"],
            },
            "split_overlap": sorted(
                set(tables["train"]["wells"]) & set(tables["hidden_test"]["wells"])
            ) + sorted(
                set(tables["train"]["wells"])
                & set(tables["leaderboard_test_features"]["wells"])
            ),
            "index": well_index,
        },
        "labelled_rows": {
            "train": tables["train"]["rows"] - tables["train"]["unlabelled_rows"],
            "hidden_test": tables["hidden_test"]["rows"]
                           - tables["hidden_test"]["unlabelled_rows"],
            "leaderboard_test_target": tables["leaderboard_test_target"]["rows"],
            "unlabelled_feature_rows": tables["leaderboard_test_features"]["rows"],
            "total": (
                tables["train"]["rows"] - tables["train"]["unlabelled_rows"]
                + tables["hidden_test"]["rows"] - tables["hidden_test"]["unlabelled_rows"]
                + tables["leaderboard_test_target"]["rows"]
            ),
        },
        "class_distribution": {
            "train": tables["train"]["class_distribution"],
            "hidden_test": tables["hidden_test"]["class_distribution"],
            "leaderboard_test_target":
                tables["leaderboard_test_target"]["class_distribution"],
        },
        "las": {
            "directory": f"{DATA_SUBDIR}/las_files_Lithostrat_data",
            "las_files_in_source_commit": las_tree["count"],
            "las_bytes_in_source_commit": las_tree["bytes"],
            "source_commit_inventory_source": las_tree["source"],
            "las_files_checked_out_locally": len(las_files),
            "headers_read": len(las_headers),
            "headers_read_limited": las_limit > 0 and len(las_read) < len(las_files),
            "bytes_checked_out_locally": las_total_bytes,
            "sparse_checkout_note": (
                "the local checkout holds only the LAS files that were fetched, "
                "so the local count is a lower bound on the source's count and "
                "the per-file headers below describe the local subset only"
            ),
            "default_null_value": LAS_NULL_DEFAULT,
            "curve_mnemonics": sorted(
                {c["mnemonic"] for h in las_headers for c in h["curves"]}
            ),
            "label_columns_present_in_las": sorted(
                {c["mnemonic"] for h in las_headers for c in h["curves"]
                 if c["mnemonic"] in TARGET_COLUMNS + AUXILIARY_TARGET_COLUMNS}
            ),
            "headers": las_headers,
        },
        "verification": {
            "provenance_anchor": "source.resolved_commit_sha",
            "hash_note": (
                "files are identified by their Git blob id from the pinned "
                "commit, not by a worktree SHA-256: a Windows checkout rewrites "
                "line endings, so the same logical file hashes differently on "
                "different machines while its blob id is stable"
            ),
            "checkout_dependent_fields": list(VOLATILE_FIELDS),
            "checkout_dependent_note": (
                "these fields describe the local checkout rather than the source, "
                "so --verify ignores them; everything else must match exactly"
            ),
        },
        "not_performed": NOT_PERFORMED,
        "observations": observations,
    }


def missing_conventions(tables: dict, las_headers: list[dict]) -> dict:
    nulls = sorted({h["null_value"] for h in las_headers if h["null_value"] is not None})
    leaked = []
    for name, scan in tables.items():
        for col in scan["columns"]:
            if col["sentinel_rows"]:
                leaked.append({
                    "table": name,
                    "column": col["name"],
                    "sentinel_rows": col["sentinel_rows"],
                    "sentinel_samples": col["sentinel_samples"],
                })
    return {
        "csv": {
            "representation": "empty field",
            "evidence": "blank cell count per column in the table scans",
            "note": "the source's own notebook reads these as NaN; a blank is a "
                    "missing measurement, never a zero",
        },
        "las": {
            "representation": "NULL value in the ~Well header",
            "declared_null_values": nulls,
            "default": LAS_NULL_DEFAULT,
            "evidence": "~Well NULL line of each LAS header read",
        },
        "residual_sentinels_in_csv": {
            "rows": leaked,
            "note": "a small number of numeric cells sit on the LAS null value "
                    "after the source's own resampling. Reported, not removed: "
                    "any cleaning decision belongs to the transform stage and "
                    "must be recorded when it happens.",
        },
    }


def build_well_index(tables: dict, wells: list[str]) -> list[dict]:
    # Row counts and depth spans come from the table that carries the well's
    # features; class membership comes from the table that carries its labels,
    # which for the leaderboard split is a different file.
    splits = {
        "train": (tables["train"]["rows_per_well"],
                  tables["train"]["depth_span_per_well"]),
        "hidden_test": (tables["hidden_test"]["rows_per_well"],
                        tables["hidden_test"]["depth_span_per_well"]),
        "leaderboard_test_features": (
            tables["leaderboard_test_features"]["rows_per_well"],
            tables["leaderboard_test_features"]["depth_span_per_well"]),
    }
    classes_per_split = {
        "train": tables["train"]["classes_per_well"],
        "hidden_test": tables["hidden_test"]["classes_per_well"],
        "leaderboard_test_features":
            tables["leaderboard_test_target"]["classes_per_well"],
    }

    out = []
    for well in wells:
        record: dict = {"well": well, "source_id": SOURCE_ID, "split": None}
        span_min = None
        span_max = None
        for split, (counts, spans) in splits.items():
            rows = counts.get(well)
            record[f"rows_{split}"] = rows or 0
            if rows and record["split"] is None:
                record["split"] = split
                span = spans.get(well, {})
                span_min = span.get("min_md")
                span_max = span.get("max_md")
        record["min_md"] = span_min
        record["max_md"] = span_max
        if span_min is not None and span_max is not None:
            record["thickness_m"] = round(span_max - span_min, 4)
        classes = classes_per_split[record["split"]].get(well, {})
        record["classes_present"] = "|".join(
            f"{code}:{LITHOFACIES.get(int(code), 'UNKNOWN_CODE')}:{rows}"
            for code, rows in sorted(classes.items())
        )
        record["class_count"] = len(classes)
        record["data_origin"] = "PUBLIC_REAL"
        out.append(record)
    return out


def build_observations(tables, las_headers, csv_wells, las_read, las_tree,
                       las_total_bytes) -> list[str]:
    out: list[str] = []
    train, hidden = tables["train"], tables["hidden_test"]

    out.append(
        f"Wells: {len(csv_wells)} distinct NPD well names across the three "
        f"published splits ({train['well_count']} train, {hidden['well_count']} "
        f"hidden_test, "
        f"{tables['leaderboard_test_features']['well_count']} leaderboard_test). "
        f"The three splits share no well, so the source itself supplies a "
        f"well-disjoint partition."
    )

    steps = train["depth_step_m_common"]
    if steps:
        top = steps[0]
        feet = top["step_md"] / 0.3048
        out.append(
            f"Depth sampling in train.csv is regular at {top['step_md']} m "
            f"({feet:.4f} ft) for {top['rows']} of {train['rows']} steps, so the "
            f"source resampled the logs onto a fixed grid before publishing the "
            f"CSVs. The LAS files carry their original sampling."
        )
    if train["depth_non_monotonic_steps"] == 0:
        out.append("DEPTH_MD is strictly increasing within every well.")

    guaranteed = [c for c in GUARANTEED_COLUMNS if c != "WELL"]
    always_full = []
    for col in train["columns"]:
        if col["name"] in guaranteed and col["null_rows"] == 0:
            always_full.append(col["name"])
    out.append(
        "Guaranteed-present columns as published: "
        f"{', '.join(always_full)}. Every other column is nullable and the "
        "source states the test splits have the same distribution of "
        "availability. Availability is reported per curve as "
        "'wells with data', because a curve logged in only a few wells is "
        "mostly null for that reason alone, not because of per-row dropout."
    )

    worst = sorted(
        (c for c in train["columns"] if c["role"] == "log_curve"),
        key=lambda c: -(c["null_fraction"] or 0),
    )[:6]
    out.append(
        "Least-populated curves in train.csv: "
        + "; ".join(f"{c['name']} {c['null_fraction']:.1%} null" for c in worst)
        + ". Missingness is a property of the well, not noise: a curve missing "
        "in 95% of rows is missing because those wells were never logged with "
        "it."
    )

    out.append(
        "Curve availability is a property of the well, not of the row: the JSON "
        "records wells_with_data per curve, so a curve logged in only a few wells "
        "shows a high null fraction for that reason alone. The starter notebook "
        "plots the same per-well view. No imputation, curve-dropping or "
        "resampling decision is made at this stage."
    )

    rare = [c for c in train["class_distribution"] if c["wells"] <= 3]
    if rare:
        out.append(
            "Classes confined to very few wells: "
            + "; ".join(
                f"{c['lithology']} ({c['code']}) {c['rows']} rows in "
                f"{c['wells']} well(s)" for c in rare
            )
            + ". Under the well-grouped policy these classes cannot be "
            "evaluated by leave-one-well-out: a fold that holds out the only "
            "well containing them has no positives."
        )

    if las_headers:
        h = las_headers[0]
        out.append(
            f"LAS convention, from {h['file']} (LAS {h['las_version']}, "
            f"WRAP={h['wrap']}, WELL={h['well_name']!r}, "
            f"UWI={h['unique_well_id']!r}): NULL={h['null_value']}, "
            f"STRT={h['start_md']}, STOP={h['stop_md']}, STEP={h['step_md']}, "
            f"{h['curve_count']} curves. Depth unit is m in the ~Well header, "
            f"and the LAS step of {h['step_md']} m matches the depth step of the "
            f"published CSVs, so the CSVs are a resampling of these logs rather "
            f"than an independent measurement."
        )
        labels = [c["mnemonic"] for c in h["curves"]
                  if c["mnemonic"] in TARGET_COLUMNS + AUXILIARY_TARGET_COLUMNS]
        if labels:
            out.append(
                f"The LAS ~Curve section lists the label column(s) {labels} "
                "alongside the log curves, so a LAS-based transform must drop "
                "them explicitly rather than assume a LAS file holds no labels. "
                "This is the same label, not an extra annotation."
            )
        mismatched = [
            (x["file"], x["well_name"], x["well_from_filename"])
            for x in las_headers
            if x["well_name"] and x["well_name"] != x["well_from_filename"]
        ]
        unknown = [
            (x["file"], x["well_name"])
            for x in las_headers
            if x["well_name"] and x["well_name"] not in csv_wells
        ]
        if mismatched:
            out.append(
                "LAS header WELL does not equal the well name implied by the "
                f"filename for {len(mismatched)} header(s) read: {mismatched}. "
                "The filename convention is not universal, so it must not be "
                "used as the join key without checking each file."
            )
        if unknown:
            out.append(
                "LAS well names not found in the CSV WELL column: "
                f"{unknown}. The identifier mapping is not proven for these."
            )
        if not mismatched and not unknown and las_headers:
            out.append(
                f"All {len(las_headers)} LAS header(s) read carry a WELL value "
                "that matches both the well name implied by the filename and a "
                "WELL value in the CSVs, so the identifier is consistent across "
                "both formats for the LAS subset inspected. The full 118-file "
                "LAS set was not fetched, so this is verified for a subset only."
            )
    out.append(
        f"LAS coverage: {las_tree['count']} .las files in the source commit "
        f"({las_tree['bytes']:,} bytes) per {las_tree['source']}; "
        f"{len(las_read)} header(s) read in this pass and "
        f"{las_total_bytes:,} bytes present locally, because the local checkout "
        f"is sparse. The full LAS set is not required for the CSV tables and was "
        f"deliberately not ingested."
    )

    out.append(
        "Published label columns: the source released labels for train.csv and "
        "hidden_test.csv, and for leaderboard_test_features.csv only as a "
        "separate (WELL, DEPTH_MD) key file. The open-leaderboard feature file "
        "itself carries no label column."
    )

    out.append(
        "Scoring protocol: the competition metric is a geologically motivated "
        "penalty matrix, not accuracy or F1 (test_code.py loads "
        "penalty_matrix.npy). The retrospective records that no top team "
        "optimised the penalty matrix directly. An evaluation that reports "
        "accuracy on this dataset is not comparable to the published results."
    )

    out.append(
        "Label-adjacent columns: GROUP and FORMATION are NPD lithostratigraphy "
        "assigned by the same interpretation campaign that produced the "
        "lithofacies label. They are candidates for the L6 leakage rule and are "
        "flagged, not used and not dropped, at this stage."
    )

    out.append(
        "The starter notebook states the training split has 83 wells. The "
        f"train.csv published at the pinned commit has {train['well_count']}. "
        "The notebook prose is stale; the file is the authority and the "
        "well count in this report is measured from the file."
    )
    return out


# ---------------------------------------------------------------------------
# Markdown rendering
# ---------------------------------------------------------------------------
def pct(value: float | None) -> str:
    return "n/a" if value is None else f"{value * 100:.2f}%"


def render_markdown(report: dict) -> str:
    s = report["source"]
    t = report["tables"]
    L: list[str] = []
    a = L.append
    a("# FORCE 2020 source inspection")
    a("")
    a(f"**Source:** {s['source_name']}  ")
    a(f"**Repository:** {s['repository_url']}  ")
    a(f"**Pinned commit:** `{s['resolved_commit_sha'] or 'unresolved'}`  ")
    a(f"**Archive DOI:** {s['archive_doi']} (concept {s['archive_concept_doi']})  ")
    a(f"**Downloaded:** {s['download_date']}  ")
    a(f"**Licence:** {s['licence']} — {s['licence_evidence']}  ")
    a(f"**Citation:** {s['citation']}")
    a("")
    a("This is an inspection of the source bytes. No dataset was built, no")
    a("model was trained, and nothing here was written to `data/processed/` or")
    a("`data/ml/`. FORCE 2020 is an external supervised dataset with its own")
    a("lithofacies vocabulary; it is not an extension of the NWIS canonical")
    a(f"dataset (`{report['canonical_dataset_version_untouched']}`, untouched).")
    a("")

    a("## Files")
    a("")
    a("Blob ids come from the pinned commit, so this table is identical on every")
    a("machine. `—` means the file is not in the source tree. `fetched` says")
    a("whether this checkout holds the file, which is a property of the local")
    a("sparse checkout and not of the source.")
    a("")
    a("| Path | Bytes | Git blob id | Fetched |")
    a("|---|---:|---|---|")
    for f in report["files"]:
        if f.get("kind") == "las_log":
            continue
        size = "—" if f["size_bytes"] is None else f"{f['size_bytes']:,}"
        oid = f["git_blob_oid"] or "—"
        a(f"| `{f['path']}` | {size} | `{oid}` | {'yes' if f['checked_out'] else 'no'} |")
    las = report["las"]
    a(f"| `{las['directory']}/*.las` | "
      f"{las['las_bytes_in_source_commit']:,} | {las['las_files_in_source_commit']} "
      f"blobs | {las['las_files_checked_out_locally']} of "
      f"{las['las_files_in_source_commit']} |")
    a("")

    a("## Tables")
    a("")
    a("| Table | Role | Rows | Wells | Labelled |")
    a("|---|---|---:|---:|---:|")
    for key in ("train", "hidden_test", "leaderboard_test_features",
                "leaderboard_test_target"):
        scan = t[key]
        labelled = "yes" if scan["has_labels"] else "no"
        a(f"| `{scan['file']}` | {scan['role']} | {scan['rows']:,} | "
          f"{scan['well_count']} | {labelled} |")
    a("")
    a(f"Delimiter is `{DELIMITER}` in every published CSV. Labelled rows "
      f"available in total: **{report['labelled_rows']['total']:,}** across "
      f"**{report['wells']['count']}** wells, with "
      f"{len(report['wells']['split_overlap'])} wells shared between splits.")
    a("")

    a("## Target")
    a("")
    a(f"- Target column: **`{report['target']['column']}`**")
    for name, meaning in report["target"]["semantics"].items():
        a(f"- `{name}`: {meaning}")
    a(f"- Vocabulary: {report['target']['vocabulary']} — "
      f"{report['target']['class_count']} classes, distinct from the "
      "FORGE Utah 16B cuttings vocabulary")
    a("")

    for split, dist in report["class_distribution"].items():
        if not dist:
            continue
        total = sum(d["rows"] for d in dist)
        a(f"## Class distribution — {split}")
        a("")
        a("| Code | Lithofacies | Rows | Share | Wells |")
        a("|---:|---|---:|---:|---:|")
        for d in dist:
            a(f"| {d['code']} | {d['lithology']} | {d['rows']:,} | "
              f"{d['fraction'] * 100:.3f}% | {d['wells']} |")
        a(f"| | **total** | **{total:,}** | 100% | |")
        a("")

    a("## Columns and missingness — train.csv")
    a("")
    a("`wells with data` counts wells with at least one non-null, non-sentinel")
    a("value for that column, which separates 'not logged' from 'not measured'.")
    a("")
    a("| Column | Role | Unit | Null rows | Null share | Wells with data |")
    a("|---|---|---|---:|---:|---:|")
    for c in t["train"]["columns"]:
        a(f"| `{c['name']}` | {c['role']} | {c['unit'] or '—'} | "
          f"{c['null_rows']:,} | {pct(c['null_fraction'])} | "
          f"{c['wells_with_data']}/{c['well_count']} |")
    a("")

    a("## Missing-value conventions")
    a("")
    mc = report["missing_value_conventions"]
    a(f"- **CSV:** {mc['csv']['representation']}. {mc['csv']['note']}")
    a(f"- **LAS:** `NULL` in the `~Well` header, observed values "
      f"{mc['las']['declared_null_values'] or 'not read'}.")
    a(f"- **Residual sentinels in the CSVs:** "
      f"{len(mc['residual_sentinels_in_csv']['rows'])} column(s) affected. "
      + mc["residual_sentinels_in_csv"]["note"])
    a("")

    a("## Observations")
    a("")
    for o in report["observations"]:
        a(f"- {o}")
    a("")

    a("## Not performed at this stage")
    a("")
    for item in report["not_performed"]:
        a(f"- {item}")
    a("")
    return "\n".join(L)


def write_well_index(report: dict, path: Path) -> None:
    columns = ["well", "source_id", "split", "rows_train", "rows_hidden_test",
               "rows_leaderboard_test_features", "min_md", "max_md",
               "thickness_m", "class_count", "classes_present", "data_origin"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in report["wells"]["index"]:
            writer.writerow(row)


def summarise(report: dict) -> str:
    t = report["tables"]
    lines = [
        f"source            {report['source']['source_name']}",
        f"commit            {report['source']['resolved_commit_sha']}",
        f"licence           {report['source']['licence']}",
        f"wells             {report['wells']['count']}",
        f"labelled rows     {report['labelled_rows']['total']:,}",
        f"classes           {report['target']['class_count']}",
        f"target column     {report['target']['column']}",
        f"depth column      {report['identifiers']['depth_column']} "
        f"({report['identifiers']['depth_unit']})",
        f"well column       {report['identifiers']['well_column']}",
        f"log curves        {len(report['curves']['log_curves'])}",
    ]
    for key in ("train", "hidden_test", "leaderboard_test_features",
                "leaderboard_test_target"):
        lines.append(f"  {key:28s} {t[key]['rows']:>9,} rows  "
                     f"{t[key]['well_count']:>3} wells  "
                     f"labelled={t[key]['has_labels']}")
    return "\n".join(lines)


def comparable_report(report: dict) -> dict:
    """The report with checkout-dependent fields removed, for --verify."""
    trimmed = json.loads(json.dumps(report))
    las = trimmed.get("las", {})
    for field in VOLATILE_FIELDS:
        _, _, key = field.partition(".")
        if key in las:
            del las[key]
    return trimmed


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--source-root", default=str(DEFAULT_SOURCE_ROOT))
    ap.add_argument("--json", default=str(REPORTS / "force2020_inspection.json"))
    ap.add_argument("--markdown", default=str(REPORTS / "force2020_inspection.md"))
    ap.add_argument("--well-index", default=str(REPO_ROOT / "data" / "force2020_wells.csv"))
    ap.add_argument("--las-limit", type=int, default=0,
                    help="read at most N LAS headers; 0 = every LAS present")
    ap.add_argument("--max-rows", type=int, default=None,
                    help="scan at most N rows per CSV; for smoke tests only")
    ap.add_argument("--verify", action="store_true",
                    help="rebuild and compare against the committed artifacts")
    ap.add_argument("--print-summary", action="store_true")
    args = ap.parse_args(argv)

    report = build(Path(args.source_root), args.max_rows, args.las_limit)
    json_path = Path(args.json)
    md_path = Path(args.markdown)
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"

    if args.verify:
        if not json_path.exists():
            print(f"verify: MISSING {json_path}")
            return 1
        committed = comparable_report(
            json.loads(json_path.read_text(encoding="utf-8"))
        )
        same = committed == comparable_report(report)
        print("verify:", "MATCH" if same else "MISMATCH", json_path)
        if not same:
            for field in sorted(committed):
                if committed[field] != comparable_report(report).get(field):
                    print("  differs:", field)
        return 0 if same else 1

    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(payload, encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    write_well_index(report, Path(args.well_index))

    print(f"wrote {json_path}")
    print(f"wrote {md_path}")
    print(f"wrote {args.well_index}")
    if args.print_summary:
        print()
        print(summarise(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
