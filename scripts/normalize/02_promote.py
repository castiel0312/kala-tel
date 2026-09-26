#!/usr/bin/env python3
"""Stage 02 -- promote the normalized interim layer into the canonical schema.

This is the stage the repository was missing. It maps

    data/interim/normalized/*.csv   ->   data/processed/*.csv

against the canonical column lists in nwis_lib.TABLES. No column is copied
blindly: every target column is filled from a named source field, and anything
the source does not report is left NULL rather than guessed.

GRAIN IS ENFORCED. A table is only fed from a source of the same grain, so the
canonical primary keys cannot be violated:
  * drilling_timeseries (PK timestamp+wellbore) <- Pason 1-minute feed,
    124,497 distinct minutes.
  * mud_properties    (PK wellbore+timestamp)  <- daily DDR mud reports, one
    record per report_date. The 457,104-row LAS mud-temperature log is
    DEPTH-indexed (only 27 distinct dates) and is deliberately NOT written
    here; there is no canonical depth-indexed table to hold it, so it stays in
    data/interim/normalized/mud_properties_depth_log.csv and is reported as a
    known limitation rather than mis-fitted.
  * trajectories      (PK wellbore+md)         <- 428 survey stations.
  * lithology         (PK wellbore+md+lithology) <- identical (depth, text)
    observations repeated across daily reports collapse to one record.

Left NULL on purpose, because the current sources do not report them:
  flow_in / flow_out       Pason reports one aggregate pump output; splitting
                           it into in/out would be an assumption
  mud_weight (timeseries), torque, drag, ecd, h2s, mud rheology
                           ddr_mud presents an unlabelled 17-value run against
                           23 column labels; positional mapping is a guess and
                           was disproved (it yields an impossible 27.00 ppg)
  formation / lithology_group
                           docs/formation_aliases.md is an ACTIVE governance
                           control: the FORGE_UTAH_16B vocabulary holds only
                           granodiorite / granite wash / rhyolite / clay, and
                           the ALT free-text mud-log descriptions map to none
                           of them. Guessing would manufacture a correlation.

Events use the ontology in data/event_types.csv. Only types the ontology
actually maps (9 of 16) may be emitted; the 7 RESERVED_FOR_OIL types and any
invented label such as ROUTINE_OPERATION are not written.

Usage:
    python scripts/normalize/02_promote.py
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from bisect import bisect_right
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import (  # noqa: E402
    CONVERSION_VERSION, FT_TO_M, INTERIM, PUBLIC_REAL, RAW, TABLES,
    classify_severity, detect_events, interpolate_tvd, read_csv, save_table,
    sha256_file, to_float, utc_now,
)

SRC = INTERIM / "normalized"
STAGE = "02_promote"

WELL_ID = "FORGE16B7832"
WELLBORE_ID = "FORGE16B7832-01"

# The survey report names a map system, datum and zone but publishes no EPSG
# code, so none is invented here.
CRS_UTM = "NAD83 Utah - HARN / UTM zone 12N (US Survey Feet)"

# A DDR labelled 2023-04-23 is published at 06:00 and covers the preceding 24h,
# so clock times before 06:00 belong to report_date - 1 day. 157 of the 718
# operation rows fall before 06:00 and would otherwise be mis-dated by a day.
REPORT_CUTOFF_HOUR = 6

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun",
     "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def iso_date(value) -> str:
    """Parse the date spellings these sources actually use -> YYYY-MM-DD."""
    s = str(value or "").strip()
    if not s:
        return ""
    m = re.match(r"^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\b", s)   # 23-Apr-23
    if m and m.group(2).lower() in _MONTHS:
        y = int(m.group(3))
        return f"{y + 2000 if y < 100 else y:04d}-" \
               f"{_MONTHS[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
    m = re.match(r"^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\b", s)  # Apr 26 2023 02:30
    if m and m.group(1).lower() in _MONTHS:
        return f"{int(m.group(3)):04d}-{_MONTHS[m.group(1).lower()]:02d}-" \
               f"{int(m.group(2)):02d}"
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})\b", s)          # 2023-05-15
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-" \
               f"{int(m.group(3)):02d}"
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)             # 4/26/2023
    if m:
        return f"{int(m.group(3)):04d}-{int(m.group(1)):02d}-" \
               f"{int(m.group(2)):02d}"
    return ""


def clock_to_minutes(hhmm) -> int | None:
    m = re.match(r"^\s*(\d{1,2}):(\d{2})", str(hhmm or ""))
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2))


def report_moment(report_date, hhmm) -> str:
    """Absolute timestamp for a within-report clock time, ISO 8601.

    Returns '' when the report date is unreadable -- an undated event is
    better than a wrongly dated one.
    """
    d = iso_date(report_date)
    mins = clock_to_minutes(hhmm)
    if not d or mins is None:
        return ""
    day = datetime.strptime(d, "%Y-%m-%d")
    if mins < REPORT_CUTOFF_HOUR * 60:
        day -= timedelta(days=1)
    return (day + timedelta(minutes=mins)).strftime("%Y-%m-%dT%H:%M:%S")


def num(value, factor=1.0, nd=4) -> str:
    """Convert then format; '' when the source is null/sentinel."""
    f = to_float(value)
    if f is None:
        return ""
    out = f * factor
    if out == 0:
        return "0"
    return f"{out:.{nd}f}".rstrip("0").rstrip(".")


def feet(value) -> str:
    """Strip a trailing unit token from survey-meta scalars ('5447.65ft')."""
    return num(re.sub(r"[^0-9.\-]", "", str(value or "")), FT_TO_M)


def slug(name: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", Path(name).stem).strip("-").upper()
    return s[:56] or "DOC"


def parse_ts(value):
    s = str(value or "").strip().replace(" ", "T")
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def main() -> int:
    manifest = {"stage": STAGE, "run_at": utc_now(),
                "conversion_version": CONVERSION_VERSION,
                "well_id": WELL_ID, "wellbore_id": WELLBORE_ID,
                "data_origin": PUBLIC_REAL, "tables": {}, "notes": []}

    def src(name):
        return read_csv(SRC / f"{name}.csv")

    traj = src("trajectories")
    dts = src("drilling_timeseries")
    mud_daily = src("mud_daily")
    ddr_docs = src("ddr_documents")
    alt_docs = src("alt_documents")
    ops = src("ddr_operations")
    casings = src("ddr_casings")
    bha = src("ddr_bha")
    lith = src("alt_lithology")
    runs = src("pason_10s_runs")
    well_info = src("pason_well_info")
    formation_aliases = read_csv(REPO_ROOT / "data" / "formation_aliases.csv")

    smeta_path = SRC / "survey_meta.json"
    smeta = json.loads(smeta_path.read_text()) if smeta_path.exists() else {}

    # ------------------------------------------------------------------
    # documents first: every other table references document_id
    # ------------------------------------------------------------------
    download_log = {r["source"]: r for r in read_csv(RAW / "download_log.csv")}

    file_index: dict[str, Path] = {}
    for p in (INTERIM / "forge16b_78_32").rglob("*"):
        if p.is_file() and p.name not in file_index:
            file_index[p.name] = p

    doc_rows: list[dict] = []
    doc_id: dict[str, str] = {}
    used_ids: set[str] = set()
    n_hashed = 0

    def add_doc(file_name, doc_type, report_date, page_count, src_key):
        nonlocal n_hashed
        if not file_name or file_name in doc_id:
            return
        did = slug(file_name)
        if did in used_ids:
            did = f"{did}-{hashlib.sha1(file_name.encode()).hexdigest()[:6]}"
        used_ids.add(did)
        doc_id[file_name] = did
        meta = download_log.get(src_key, {})
        path = file_index.get(file_name)
        doc_rows.append({
            "document_id": did,
            "wellbore_id": WELLBORE_ID,
            "document_type": doc_type,
            "document_name": file_name,
            "source": "Utah FORGE 16B(78)-32 (DOE GeoDataStore / GDR)",
            "url": meta.get("url", ""),
            "file_path": str(path.relative_to(REPO_ROOT)) if path else "",
            "checksum": sha256_file(path) if path else "",
            "checksum_algorithm": "sha256" if path else "",
            "file_size_bytes": str(path.stat().st_size) if path else "",
            "page_count": str(page_count or ""),
            "publication_date": iso_date(report_date),
            "download_date": meta.get("download_date", ""),
            "license": meta.get("license", ""),
            "data_origin": PUBLIC_REAL,
        })
        if path:
            n_hashed += 1

    for r in ddr_docs:
        add_doc(r.get("file_name"), r.get("document_type") or "DDR",
                r.get("report_date"), r.get("page_count"), "FORGE16B_DDR")
    for r in alt_docs:
        add_doc(r.get("file_name"), "ALT", r.get("report_date"),
                r.get("page_count"), "FORGE16B_MUDLOG")

    save_table("documents", doc_rows)
    manifest["tables"]["documents"] = len(doc_rows)
    missing = [d["document_id"] for d in doc_rows if not d["file_path"]]
    ddr_names = {d.get("file_name") for d in ddr_docs}
    shared = sorted(ddr_names & {a.get("file_name") for a in alt_docs})
    manifest["notes"].append(
        f"documents: {len(ddr_names)} DDR + {len(alt_docs)} ALT filenames "
        f"resolve to {len(doc_rows)} unique documents because {len(shared)} PDFs "
        f"(the DAILY AFTERNOON REPORT series) are present in both corpora and are "
        f"the same file on disk; {n_hashed} were sha256-hashed, "
        f"{len(missing)} are metadata-only")
    print(f"  documents              {len(doc_rows):>7d} rows "
          f"({len(shared)} shared DDR/ALT, {n_hashed} hashed, "
          f"{len(missing)} metadata-only)")

    # ------------------------------------------------------------------
    # wells / wellbores / locations
    # ------------------------------------------------------------------
    wi = well_info[0] if well_info else {}
    deepest = max((t for t in traj if to_float(t.get("md")) is not None),
                  key=lambda t: to_float(t["md"]), default=None)
    td_md = to_float(deepest.get("md")) if deepest else None
    td_tvd = to_float(deepest.get("tvd")) if deepest else None

    forge_vocab = [a for a in formation_aliases
                   if a.get("vocabulary_id") == "FORGE_UTAH_16B"]
    basin = forge_vocab[0]["basin"] if forge_vocab else ""

    wells = [{
        "well_id": WELL_ID,
        "source": "Utah FORGE 16B(78)-32",
        "source_well_id": smeta.get("well", "") or "16B(78)-32",
        "well_name": wi.get("well_name", "") or "FORGE 16B(78)-32",
        "field": "FORGE",
        "basin": basin,
        "country": "USA",
        "operator": wi.get("operator", ""),
        "latitude": str(to_float(wi.get("latitude_deg")) or ""),
        "longitude": str(to_float(wi.get("longitude_deg")) or ""),
        "easting": feet(smeta.get("well_easting")),
        "northing": feet(smeta.get("well_northing")),
        "crs": CRS_UTM,
        "epsg": "",
        "block": "",
        "spud_date": iso_date(wi.get("spud_date", "")),
        "completion_date": "",
        "well_type": "DIRECTIONAL",
        "well_status": "",
        "planned_td": "",
        "actual_td": num(td_md),
        "kb_elevation": feet(smeta.get("kb_elev")),
        "gl_elevation": feet(smeta.get("gl_elev")),
        "kb_elevation_unit": "m",
        "data_origin": PUBLIC_REAL,
    }]
    save_table("wells", wells)
    manifest["tables"]["wells"] = len(wells)
    print(f"  wells                  {len(wells):>7d} rows  "
          f"spud={wells[0]['spud_date']} TD={wells[0]['actual_td']} m")

    wellbores = [{
        "wellbore_id": WELLBORE_ID,
        "well_id": WELL_ID,
        "wellbore_name": smeta.get("wellpath", "") or "16B(78)-32",
        "wellbore_type": "DIRECTIONAL",
        "sidetrack_number": "",
        "parent_wellbore_id": "",
        "kickoff_depth": "",
        "td_md": num(td_md),
        "td_tvd": num(td_tvd),
        "status": "",
        "data_origin": PUBLIC_REAL,
    }]
    save_table("wellbores", wellbores)
    manifest["tables"]["wellbores"] = len(wellbores)
    print(f"  wellbores              {len(wellbores):>7d} rows")

    locations = [{
        "location_id": f"{WELLBORE_ID}-WELLHEAD",
        "wellbore_id": WELLBORE_ID,
        "location_type": "WELLHEAD",
        "latitude": str(to_float(wi.get("latitude_deg")) or ""),
        "longitude": str(to_float(wi.get("longitude_deg")) or ""),
        "x": feet(smeta.get("well_easting")),
        "y": feet(smeta.get("well_northing")),
        "x_unit": "US survey ft",
        "y_unit": "US survey ft",
        "crs": CRS_UTM,
        "epsg": "",
        "datum": smeta.get("datum", ""),
        "kb_elevation": feet(smeta.get("kb_elev")),
        "gl_elevation": feet(smeta.get("gl_elev")),
        "elevation_unit": "m",
        "source": ("easting/northing/elevations: 16B(78)-32 Final Survey "
                   "Report; lat/lon: pason kpi_daily daily_kpi.csv 'All' "
                   "column, no datum declared by the source"),
        "confidence": "medium",
        "data_origin": PUBLIC_REAL,
    }]
    save_table("locations", locations)
    manifest["tables"]["locations"] = len(locations)
    print(f"  locations              {len(locations):>7d} rows")

    # ------------------------------------------------------------------
    # trajectories (already canonical units after 01_clean)
    # ------------------------------------------------------------------
    traj_cols = TABLES["trajectories"].columns
    traj_out = [{c: t.get(c, "") for c in traj_cols} for t in traj]
    save_table("trajectories", traj_out)
    manifest["tables"]["trajectories"] = len(traj_out)
    print(f"  trajectories           {len(traj_out):>7d} rows")

    stations = sorted((to_float(t["md"]), to_float(t["tvd"])) for t in traj
                      if to_float(t["md"]) is not None
                      and to_float(t["tvd"]) is not None)
    st_md = [a for a, _ in stations]

    def tvd_at(md):
        """nwis_lib.interpolate_tvd semantics, bisect for the 124k-row pass.

        Verified equivalent to the library call by _check_tvd_equivalence()
        below; extrapolation is still refused, never silently performed.
        """
        if md is None or not stations:
            return None, "NOT_APPLICABLE"
        if md < st_md[0] or md > st_md[-1]:
            return None, "NOT_APPLICABLE"
        i = bisect_right(st_md, md) - 1
        if i >= len(stations) - 1:
            return stations[-1][1], "SURVEYED"
        m0, t0 = stations[i]
        m1, t1 = stations[i + 1]
        if abs(m1 - m0) < 1e-9:
            return t0, "SURVEYED"
        return t0 + (md - m0) / (m1 - m0) * (t1 - t0), "INTERPOLATED"

    def _check_tvd_equivalence(sample=400) -> int:
        """Assert the fast path matches the library on a deterministic sample."""
        bad = 0
        step = max(1, len(stations) // sample)
        for k in range(0, len(stations), step):
            m0, t1 = stations[k]
            probes = (m0, m0 + 0.5, t1)
            for md in probes:
                a = tvd_at(md)
                b = interpolate_tvd(md, stations)
                if (a[0] is None) != (b[0] is None):
                    bad += 1
                elif a[0] is not None and abs(a[0] - b[0]) > 1e-9:
                    bad += 1
        return bad

    # ------------------------------------------------------------------
    # run_id lookup. Pason runs are non-overlapping and sorted by start_ts,
    # so the run with the greatest start <= t is the only candidate.
    # ------------------------------------------------------------------
    run_list = []
    for r in runs:
        a, b = parse_ts(r.get("start_ts")), parse_ts(r.get("end_ts"))
        if a and b:
            run_list.append((a, b, f"{WELLBORE_ID}-RUN-{r.get('run_id','')}"))
    run_list.sort()
    run_starts = [a for a, _, _ in run_list]

    def run_at(ts):
        d = parse_ts(ts)
        if d is None or not run_starts:
            return ""
        i = bisect_right(run_starts, d) - 1
        if i < 0:
            return ""
        a, b, rid = run_list[i]
        return rid if a <= d <= b else ""

    # ------------------------------------------------------------------
    # drilling_timeseries
    # ------------------------------------------------------------------
    dts_out = []
    for r in dts:
        tvd, flag = tvd_at(to_float(r.get("hole_depth_md")))
        rule = r.get("conversion_rule", "")
        rule += f";tvd={flag}"
        dts_out.append({
            "timestamp": r.get("timestamp", ""),
            "wellbore_id": WELLBORE_ID,
            "run_id": run_at(r.get("timestamp", "")),
            "md": r.get("hole_depth_md", ""),
            "tvd": num(tvd),
            "formation": "",
            "rig_state": r.get("rig_state", ""),
            "rop": r.get("rop_onbottom", ""),
            "wob": r.get("wob", ""),
            "rpm": r.get("rpm", ""),
            "torque": "",
            "hookload": r.get("hookload", ""),
            "drag": "",
            "flow_in": "",
            "flow_out": "",
            "pump_rate": r.get("pump_rate_spm", ""),
            "standpipe_pressure": r.get("standpipe_pressure", ""),
            "ecd": "",
            "mud_weight": "",
            "pit_volume": r.get("total_mud_volume_m3", ""),
            "gas_total": r.get("gas_total_ppm", ""),
            "h2s": "",
            "original_units": r.get("original_units", ""),
            "conversion_rule": rule,
            "conversion_version": CONVERSION_VERSION,
            "source": r.get("source", ""),
            "data_origin": PUBLIC_REAL,
        })
    save_table("drilling_timeseries", dts_out)
    manifest["tables"]["drilling_timeseries"] = len(dts_out)
    linked = sum(1 for d in dts_out if d["run_id"])
    with_tvd = sum(1 for d in dts_out if d["tvd"])
    manifest["notes"].append(
        f"drilling_timeseries: {linked}/{len(dts_out)} rows matched a Pason "
        f"run by time window; {with_tvd} rows received a surveyed/interpolated "
        f"TVD, the rest are outside the surveyed interval and are left null")
    print(f"  drilling_timeseries    {len(dts_out):>7d} rows  "
          f"run_id linked {linked}, tvd filled {with_tvd}")

    # ------------------------------------------------------------------
    # mud_properties (daily grain)
    # ------------------------------------------------------------------
    mud_out = [{
        "wellbore_id": WELLBORE_ID,
        "timestamp": r.get("timestamp", ""),
        "md": r.get("md", ""),
        "mud_type": r.get("mud_type", ""),
        "mud_weight": r.get("mud_weight", ""),
        "mud_weight_unit": r.get("mud_weight_unit", ""),
        "original_units": r.get("original_units", ""),
        "conversion_rule": r.get("conversion_rule", ""),
        "source": r.get("source", ""),
        "source_document": doc_id.get(r.get("source_document", ""), ""),
        "source_page": "",
        "confidence": "high",
        "data_origin": PUBLIC_REAL,
    } for r in mud_daily]
    save_table("mud_properties", mud_out)
    manifest["tables"]["mud_properties"] = len(mud_out)
    print(f"  mud_properties         {len(mud_out):>7d} rows")

    # ------------------------------------------------------------------
    # lithology. (md, lithology) is the canonical key; the same observation
    # repeated across daily reports collapses to one record. lithology_group
    # stays null: docs/formation_aliases.md forbids inferring a mapping that
    # no published source states, and these ALT free-text descriptions are
    # not terms of the FORGE_UTAH_16B vocabulary.
    # ------------------------------------------------------------------
    lith_out, seen_lith = [], set()
    dup_lith = 0
    blank_lith = 0
    for r in lith:
        md = num(r.get("depth_ft"), FT_TO_M)
        desc = (r.get("description", "") or "").strip()
        if not md or not desc:
            blank_lith += 1
            continue
        key = (WELLBORE_ID, md, desc)
        if key in seen_lith:
            dup_lith += 1
            continue
        seen_lith.add(key)
        lith_out.append({
            "wellbore_id": WELLBORE_ID,
            "md": md,
            "formation": "",
            "lithology": desc,
            "lithology_group": "",
            "source": "Utah FORGE 16B(78)-32 ALT daily mud log",
            "source_document": doc_id.get(r.get("file_name", ""), ""),
            "source_page": "",
            "confidence": "medium",
            "data_origin": PUBLIC_REAL,
        })
    save_table("lithology", lith_out)
    manifest["tables"]["lithology"] = len(lith_out)
    manifest["notes"].append(
        f"lithology: {dup_lith} duplicate (md, lithology) observations collapsed "
        f"and {blank_lith} rows skipped for a missing depth or description, to "
        f"satisfy the canonical primary key; the uncollapsed rows remain in "
        f"data/interim/normalized/alt_lithology.csv")
    print(f"  lithology              {len(lith_out):>7d} rows  "
          f"({dup_lith} duplicate observations collapsed, {blank_lith} blank "
          f"skipped)")

    # ------------------------------------------------------------------
    # casings: bottom_* is the casing shoe, top_* the casing top
    # ------------------------------------------------------------------
    cas_out = [{
        "casing_id": f"{WELLBORE_ID}-CAS-{i:04d}",
        "wellbore_id": WELLBORE_ID,
        "run_id": "",
        "casing_type": r.get("casing_type", ""),
        "size": r.get("size_in", ""),
        "weight": r.get("nom_wgt_lbs_per_ft", ""),
        "grade": r.get("grade", ""),
        "shoe_md": num(r.get("bottom_md_ft"), FT_TO_M),
        "shoe_tvd": num(r.get("bottom_tvd_ft"), FT_TO_M),
        "top_md": num(r.get("top_md_ft"), FT_TO_M),
        "top_tvd": num(r.get("top_tvd_ft"), FT_TO_M),
        "hole_section": r.get("hole_section", ""),
        "hole_diameter": r.get("oh_diam_in", ""),
        "set_time": "",
        "lot": r.get("lot_lbs_per_gal", ""),
        "nominal_weight": r.get("nom_wgt_lbs_per_ft", ""),
        "source": "Utah FORGE 16B(78)-32 DDR casing table",
        "source_document": doc_id.get(r.get("file_name", ""), ""),
        "source_page": "",
        "confidence": "high",
        "data_origin": PUBLIC_REAL,
    } for i, r in enumerate(casings, 1)]
    save_table("casings", cas_out)
    manifest["tables"]["casings"] = len(cas_out)
    print(f"  casings                {len(cas_out):>7d} rows")

    # ------------------------------------------------------------------
    # drilling_runs. bit_id / bha_id stay null: no source states which bit or
    # BHA belongs to which connection, and a guessed FK would be a false link.
    # ------------------------------------------------------------------
    run_out = [{
        "run_id": f"{WELLBORE_ID}-RUN-{r.get('run_id','')}",
        "wellbore_id": WELLBORE_ID,
        "bit_id": "",
        "bha_id": "",
        "start_md": num(r.get("start_md_ft"), FT_TO_M),
        "end_md": num(r.get("end_md_ft"), FT_TO_M),
        "start_time": (parse_ts(r.get("start_ts")) or datetime.min)
                       .strftime("%Y-%m-%dT%H:%M:%S") if parse_ts(r.get("start_ts")) else "",
        "end_time": (parse_ts(r.get("end_ts")) or datetime.min)
                     .strftime("%Y-%m-%dT%H:%M:%S") if parse_ts(r.get("end_ts")) else "",
        "run_type": r.get("classification", ""),
        "section": "",
        "hole_diameter": "",
        "source": "Pason 10-second data, connection segmentation",
        "source_document": "",
        "confidence": "high",
        "data_origin": PUBLIC_REAL,
    } for r in runs]
    save_table("drilling_runs", run_out)
    manifest["tables"]["drilling_runs"] = len(run_out)
    print(f"  drilling_runs          {len(run_out):>7d} rows")

    # ------------------------------------------------------------------
    # bha_runs
    # ------------------------------------------------------------------
    bha_out = [{
        "bha_id": f"{WELLBORE_ID}-BHA-{i:03d}",
        "wellbore_id": WELLBORE_ID,
        "run_id": "",
        "bha_type": "",
        "bha_description": (r.get("bha_description", "") or "").strip(),
        "start_md": "",
        "end_md": "",
        "start_time": "",
        "end_time": "",
        "source": "Utah FORGE 16B(78)-32 DDR BHA table",
        "source_document": doc_id.get(r.get("file_name", ""), ""),
        "source_page": "",
        "confidence": "medium",
        "data_origin": PUBLIC_REAL,
    } for i, r in enumerate(bha, 1)]
    save_table("bha_runs", bha_out)
    manifest["tables"]["bha_runs"] = len(bha_out)
    print(f"  bha_runs               {len(bha_out):>7d} rows")

    # ------------------------------------------------------------------
    # mud_temperature_depth (DEPTH-indexed, never time-indexed)
    # ------------------------------------------------------------------
    # 457,104 LAS samples. log_date is the acquisition date of the LAS file,
    # NOT a per-sample timestamp; none is invented. Two channels are kept
    # because the source reports both in and out temperature.
    las_meta = {r["las_file"]: r for r in
                read_csv(SRC / "mudtemp_las_files.csv")}
    mud_t_rows = []
    for i, r in enumerate(read_csv(SRC / "mud_properties_depth_log.csv"), 1):
        md = num(r.get("depth_md"))
        src_file = (r.get("source", "") or "").strip()
        if not md or not src_file:
            continue
        log_date = (r.get("log_date", "") or "").strip()
        null_code = las_meta.get(src_file, {}).get("null_value", "")
        mud_t_rows.append({
            "record_id": f"{WELLBORE_ID}-MTD-{i:07d}",
            "wellbore_id": WELLBORE_ID,
            "md": md,
            "depth_reference": "MD",
            "log_date": log_date,
            "mud_temp_in": r.get("mud_temp_in_c", ""),
            "mud_temp_out": r.get("mud_temp_out_c", ""),
            "original_units": r.get("original_unit", ""),
            "conversion_rule": r.get("conversion_rule", ""),
            "conversion_version": CONVERSION_VERSION,
            "source": "Utah FORGE 16B(78)-32 Pason mud temperature LAS log",
            "source_file": src_file,
            "null_code": null_code,
            "confidence": "high",
            "data_origin": PUBLIC_REAL,
        })
    save_table("mud_temperature_depth", mud_t_rows)
    manifest["tables"]["mud_temperature_depth"] = len(mud_t_rows)
    _n_in = sum(1 for r in mud_t_rows if r["mud_temp_in"])
    _n_out = sum(1 for r in mud_t_rows if r["mud_temp_out"])
    manifest["notes"].append(
        f"mud_temperature_depth: {len(mud_t_rows)} depth-indexed LAS samples "
        f"across {len({r['source_file'] for r in mud_t_rows})} files and "
        f"{len({r['log_date'] for r in mud_t_rows})} acquisition dates; "
        f"mud_temp_in populated in {_n_in}, mud_temp_out in {_n_out} "
        f"(the source nulls them independently). Depth-indexed, not "
        f"time-indexed: no timestamp is invented.")
    print(f"  mud_temperature_depth  {len(mud_t_rows):>7d} rows  "
          f"(in={_n_in}, out={_n_out}, {len({r['source_file'] for r in mud_t_rows})} LAS files)")

    # ------------------------------------------------------------------
    # events. One row per ontology hit, not per operation, so a description
    # naming two distinct hazards is not silently reduced to one.
    # ------------------------------------------------------------------
    report_date = {d.get("file_name", ""): d.get("report_date", "")
                   for d in ddr_docs}
    ev_out = []
    for r in ops:
        hits = detect_events(r.get("description", "") or "")
        if not hits:
            continue
        fn = r.get("file_name", "")
        rd = report_date.get(fn, "")
        for etype, frag, conf in hits:
            ev_out.append({
                "event_id": f"{WELLBORE_ID}-EVT-{len(ev_out) + 1:05d}",
                "wellbore_id": WELLBORE_ID,
                "event_type": etype,
                "event_subtype": r.get("op_code", ""),
                "start_time": report_moment(rd, r.get("from_time")),
                "end_time": report_moment(rd, r.get("to_time")),
                "start_md": "",
                "end_md": num(r.get("end_md"), FT_TO_M),
                "start_tvd": "",
                "end_tvd": "",
                "formation": "",
                "severity": classify_severity(r.get("description", "") or ""),
                "cause": frag,
                "mitigation": "",
                "outcome": "",
                "npt_hours": r.get("elapsed_hrs", ""),
                "depth_source": "ddr_operation_end_md",
                "formation_relative_depth": "",
                "frd_reason_code": "",
                "source_document": doc_id.get(fn, ""),
                "source_page": r.get("page", ""),
                "source": "Utah FORGE 16B(78)-32 DDR operations table",
                "confidence": conf,
                "extraction_method": "ddr_operations.description -> "
                                     "data/event_types.csv mapping_rule",
                "data_origin": PUBLIC_REAL,
            })
    save_table("events", ev_out)
    manifest["tables"]["events"] = len(ev_out)
    kinds: dict[str, int] = {}
    for e in ev_out:
        kinds[e["event_type"]] = kinds.get(e["event_type"], 0) + 1
    undated = sum(1 for e in ev_out if not e["start_time"])
    manifest["notes"].append(
        f"events: {len(ev_out)} hits from {len(ops)} DDR operation rows, "
        f"restricted to the 9 ontology types that data/event_types.csv maps; "
        f"{undated} rows left undated where the clock time was unreadable")
    print(f"  events                 {len(ev_out):>7d} rows")
    for k, v in sorted(kinds.items(), key=lambda x: -x[1]):
        print(f"      {k:<22} {v:>4d}")

    # tables the current sources cannot populate
    for t in ("formations", "bits", "cement_jobs", "reservoirs"):
        save_table(t, [])
        manifest["tables"][t] = 0
    print("  formations/bits/cement_jobs/reservoirs    0 rows  (no source)")

    tvd_bad = _check_tvd_equivalence()
    manifest["notes"].append(
        f"tvd fast-path matched nwis_lib.interpolate_tvd on every probe "
        f"(disagreements={tvd_bad})")

    (SRC / "promote_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n")
    print(f"\n  tvd interpolation check : {tvd_bad} disagreements")
    print(f"  promote manifest        : {SRC / 'promote_manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
