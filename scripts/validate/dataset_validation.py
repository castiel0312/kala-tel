#!/usr/bin/env python3
"""NWIS dataset validator.

Dataset states
--------------
  EMPTY   - no canonical table holds a single record. Nothing was validated.
  PARTIAL - some required tables are below their minimum row count.
  VALID   - every required table is populated and every check passed.
  INVALID - at least one check failed.

An EMPTY dataset is NEVER reported as VALID or PASS. This is the defect that
made the v0.1 validator print "STATUS: PASS" against eight header-only tables.

Exit codes
----------
  0  VALID
  1  INVALID  (a check failed)
  2  EMPTY    (no data to validate)
  3  PARTIAL  (populated, but below required thresholds)

Usage
-----
  python scripts/validate/dataset_validation.py
  python scripts/validate/dataset_validation.py --allow-empty     # schema dev only
  python scripts/validate/dataset_validation.py --bootstrap       # PARTIAL is ok
  python scripts/validate/dataset_validation.py --json report.json
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import (  # noqa: E402
    ALLOWED_ORIGINS, CORE_TABLES, NON_OPERATIONAL_ORIGINS, TABLES, is_sentinel,
    load_table, read_csv, to_float, table_path,
)

EMPTY, PARTIAL, VALID, INVALID = "EMPTY", "PARTIAL", "VALID", "INVALID"

SEV_CRIT, SEV_HIGH, SEV_MED, SEV_LOW = "CRITICAL", "HIGH", "MEDIUM", "LOW"


@dataclass
class Finding:
    check: str
    severity: str
    table: str
    message: str
    evidence: str = ""
    n_affected: int = 0
    fatal: bool = True


@dataclass
class Report:
    state: str = EMPTY
    findings: list[Finding] = field(default_factory=list)
    row_counts: dict = field(default_factory=dict)
    checked_tables: list[str] = field(default_factory=list)

    def add(self, check, severity, table, message, evidence="", n=0, fatal=True):
        self.findings.append(Finding(check, severity, table, message, evidence, n, fatal))

    @property
    def fatal_findings(self):
        return [f for f in self.findings if f.fatal]

    @property
    def worst(self):
        order = {SEV_CRIT: 0, SEV_HIGH: 1, SEV_MED: 2, SEV_LOW: 3}
        fatal = self.fatal_findings
        pool = fatal or self.findings
        if not pool:
            return None
        return min(pool, key=lambda f: order.get(f.severity, 9))


def check_population(rep: Report, allow_empty: bool) -> bool:
    """Row counts + required-table population."""
    total = 0
    for name, table in TABLES.items():
        rows = load_table(name)
        rep.row_counts[name] = len(rows)
        rep.checked_tables.append(name)
        total += len(rows)

    for name, table in TABLES.items():
        p = table_path(name)
        if not p.exists():
            rep.add("table_present", SEV_HIGH, name,
                    f"{p.name} does not exist", fatal=True)
            continue
        if rep.row_counts[name] == 0:
            sev = SEV_CRIT if name in ("wells", "wellbores") else SEV_MED
            rep.add("table_empty", sev, name,
                    f"{p.name} has header only (0 rows)", fatal=False)

    core_empty = [n for n in ("wells", "wellbores") if rep.row_counts.get(n, 0) == 0]
    if core_empty and total == 0:
        rep.add("dataset_empty", SEV_CRIT, ",".join(core_empty),
                "no canonical table contains a single record; "
                "nothing has been ingested or normalized", fatal=True)
        return False

    if total == 0:
        return False

    # Minimum-row thresholds are a COMPLETENESS contract for the core
    # identity tables only. formations / bits / cement_jobs are declared in
    # TABLES but no public source in this repository reports them, so failing
    # them as HIGH would make an otherwise-correct ingest permanently
    # INVALID and would pressure someone to fabricate rows. They stay
    # covered by the advisory table_empty finding above, and a genuinely
    # missing core table still fails hard here.
    short = [n for n in CORE_TABLES
             if TABLES[n].min_rows_for_valid
             and rep.row_counts.get(n, 0) < TABLES[n].min_rows_for_valid]
    if short:
        rep.add("below_threshold", SEV_HIGH, ",".join(short),
                "core table(s) below minimum rows for a valid dataset: " +
                ", ".join(f"{n}={rep.row_counts.get(n, 0)}/{TABLES[n].min_rows_for_valid}"
                          for n in short), fatal=True)
    return True


def check_schema(rep: Report) -> None:
    """Every populated table must carry its declared columns and data_origin."""
    for name, table in TABLES.items():
        rows = load_table(name)
        if not rows:
            continue
        missing = [c for c in table.columns if c not in rows[0]]
        if missing:
            rep.add("missing_columns", SEV_CRIT, name,
                    f"{len(missing)} declared column(s) absent: "
                    f"{', '.join(missing[:6])}", fatal=True)
        if "data_origin" in table.columns and "data_origin" not in rows[0]:
            rep.add("data_origin_column", SEV_CRIT, name,
                    "table has no data_origin column", fatal=True)


def check_data_origin(rep: Report) -> None:
    """data_origin must be present, from the allowed set, on every record."""
    for name, table in TABLES.items():
        if "data_origin" not in table.columns:
            continue
        rows = load_table(name)
        if not rows:
            continue
        bad = [r for r in rows if not (r.get("data_origin") or "").strip()]
        if bad:
            rep.add("data_origin_missing", SEV_CRIT, name,
                    f"{len(bad)}/{len(rows)} records have empty data_origin",
                    n=len(bad))
        invalid = {r.get("data_origin") for r in rows
                   if r.get("data_origin") and r["data_origin"] not in ALLOWED_ORIGINS}
        if invalid:
            rep.add("data_origin_invalid", SEV_CRIT, name,
                    f"illegal data_origin value(s): {sorted(invalid)}",
                    evidence=f"allowed={sorted(ALLOWED_ORIGINS)}")
        nonop = [r for r in rows
                 if r.get("data_origin") in NON_OPERATIONAL_ORIGINS]
        if nonop and name in ("events", "drilling_timeseries"):
            rep.add("synthetic_in_operational_table", SEV_HIGH, name,
                    f"{len(nonop)} SYNTHETIC/INJECTED_EVENT record(s) in an "
                    f"operational table; must be filtered before any ML use",
                    n=len(nonop))


def check_keys(rep: Report) -> None:
    """Null and duplicate primary keys."""
    for name, table in TABLES.items():
        if not table.primary_key:
            continue
        rows = load_table(name)
        if not rows:
            continue
        cols = [c for c in table.primary_key if c in rows[0]]
        if not cols:
            continue
        nulls = [r for r in rows if any(not (r.get(c) or "").strip() for c in cols)]
        if nulls:
            rep.add("null_primary_key", SEV_CRIT, name,
                    f"{len(nulls)}/{len(rows)} records have a null component in "
                    f"PK {'+'.join(cols)}", n=len(nulls))
        seen: dict[tuple, int] = {}
        for r in rows:
            k = tuple((r.get(c) or "").strip() for c in cols)
            seen[k] = seen.get(k, 0) + 1
        dups = {k: v for k, v in seen.items() if v > 1}
        if dups:
            ex = "; ".join(f"{'/'.join(k)} x{v}" for k, v in list(dups.items())[:3])
            rep.add("duplicate_primary_key", SEV_CRIT, name,
                    f"{len(dups)} duplicated PK combination(s)", evidence=ex,
                    n=len(dups))


def check_foreign_keys(rep: Report) -> None:
    """Declared FK targets must exist. The event->document join is checked here."""
    for name, table in TABLES.items():
        rows = load_table(name)
        if not rows or not table.foreign_keys:
            continue
        for child_col, parent in table.foreign_keys.items():
            if child_col not in rows[0]:
                continue
            parent_rows = load_table(parent)
            if not parent_rows:
                rep.add("fk_parent_empty", SEV_MED, name,
                        f"{child_col} -> {parent}.{TABLES[parent].primary_key[0]} "
                        f"cannot be checked: parent table is empty", fatal=False)
                continue
            pk = TABLES[parent].primary_key
            valid = {(r.get(pk[0]) or "").strip() for r in parent_rows}
            orphans = [r for r in rows
                       if (r.get(child_col) or "").strip()
                       and (r.get(child_col) or "").strip() not in valid]
            if orphans:
                ex = ", ".join(sorted({str(r.get(child_col)) for r in orphans})[:4])
                rep.add("broken_foreign_key", SEV_CRIT, name,
                        f"{len(orphans)}/{len(rows)} records with {child_col} "
                        f"not present in {parent}", evidence=ex, n=len(orphans))

    # events.source_document -> documents.document_id (typed join, checked
    # separately because it is a cross-table reference, not a declared FK).
    events = load_table("events")
    docs = load_table("documents")
    if events and docs:
        doc_ids = {(r.get("document_id") or "").strip() for r in docs}
        linked = [e for e in events if (e.get("source_document") or "").strip()]
        bad = [e for e in linked
               if (e.get("source_document") or "").strip() not in doc_ids]
        if bad:
            ex = ", ".join(sorted({str(e.get("source_document")) for e in bad})[:3])
            rep.add("event_document_orphan", SEV_CRIT, "events",
                    f"{len(bad)}/{len(linked)} events reference a source_document "
                    f"that is not in documents.csv", evidence=ex, n=len(bad))
        elif linked:
            rep.add("event_document_join", SEV_LOW, "events",
                    f"all {len(linked)} linked events resolve to a document",
                    fatal=False)


def check_depths(rep: Report) -> None:
    """Depth validity, MD/TVD/TVDSS separation, interpolation flagging."""
    for name, depth_cols in (("trajectories", ["md", "tvd", "tvdss"]),
                             ("drilling_timeseries", ["md", "tvd"]),
                             ("events", ["start_md", "end_md", "start_tvd", "end_tvd"]),
                             ("formations", ["top_md", "base_md", "top_tvd", "base_tvd"]),
                             # Depth-indexed table: validated on md only. It
                             # carries no timestamp by design and none is
                             # invented, so it is never time-checked.
                             ("mud_temperature_depth", ["md"])):
        rows = load_table(name)
        if not rows:
            continue
        present = [c for c in depth_cols if c in rows[0]]
        for c in present:
            vals = [to_float(r.get(c)) for r in rows]
            got = [v for v in vals if v is not None]
            if not got:
                rep.add("depth_all_null", SEV_MED, name,
                        f"column {c} is present but entirely null", fatal=False)
                continue
            # tvdss is tvd minus a datum elevation, so a hole above sea level
            # is legitimately negative (16B(78)-32 sits at +1660 m TVDSS=-1660
            # m at surface). Enforcing v >= 0 on it is a unit error, not a data
            # defect; only the downhole depths md/tvd are non-negative by
            # definition.
            if c != "tvdss":
                neg = [v for v in got if v < 0]
                if neg:
                    rep.add("negative_depth", SEV_CRIT, name,
                            f"{c} has {len(neg)} negative value(s) "
                            f"(min={min(neg)})", n=len(neg))
            # Only a numeric sentinel CODE that survived normalization is a
            # defect. A blank cell is an honest null -- the pipeline is
            # required not to fabricate, so emptiness must not be reported as
            # a leaked -999.25.
            sent = [r for r in rows
                    if to_float(r.get(c)) is not None and is_sentinel(r.get(c))]
            if sent:
                ex = next((str(r.get(c)) for r in sent
                           if to_float(r.get(c)) is not None), "")
                rep.add("sentinel_depth", SEV_HIGH, name,
                        f"{c} contains {len(sent)} sentinel code(s) "
                        f"(e.g. {ex}) that survived normalization", n=len(sent))

    formations = load_table("formations")
    if formations and {"top_md", "base_md"}.issubset(formations[0]):
        bad = []
        for r in formations:
            t, b = to_float(r.get("top_md")), to_float(r.get("base_md"))
            if t is not None and b is not None and t >= b:
                bad.append(f"{r.get('wellbore_id')}:{r.get('formation_name')}")
        if bad:
            rep.add("formation_interval_invalid", SEV_CRIT, "formations",
                    f"{len(bad)} interval(s) with top_md >= base_md",
                    evidence="; ".join(bad[:3]), n=len(bad))

    events = load_table("events")
    if events and "start_md" in events[0]:
        for e in events:
            s, t = to_float(e.get("start_md")), to_float(e.get("end_md"))
            has_md = s is not None
            has_tvd = to_float(e.get("start_tvd")) is not None
            if has_md and not has_tvd and (e.get("depth_source") or "").strip() == "":
                rep.add("depth_source_missing", SEV_HIGH, "events",
                        f"event {e.get('event_id')} has MD but no TVD and no "
                        f"depth_source flag", fatal=False)
            if s is not None and t is not None and t < s:
                rep.add("event_depth_inverted", SEV_CRIT, "events",
                        f"event {e.get('event_id')} end_md < start_md", fatal=False)


def check_coordinates(rep: Report) -> None:
    """Coordinates require a declared CRS. Lat/lon range sanity."""
    locs = load_table("locations")
    if not locs:
        wells = load_table("wells")
        if wells and any((r.get("latitude") or "").strip() for r in wells):
            rep.add("crs_undeclared", SEV_CRIT, "wells",
                    "wells.csv carries latitude/longitude but no CRS/EPSG; "
                    "distances between wells would be uncomputable", fatal=True)
        return
    for r in locs:
        crs = (r.get("crs") or "").strip()
        lat, lon = to_float(r.get("latitude")), to_float(r.get("longitude"))
        if (lat is not None or lon is not None) and not crs:
            rep.add("location_crs_missing", SEV_CRIT, "locations",
                    f"location {r.get('location_id')} has coordinates but no CRS")
        if lat is not None and not (-90 <= lat <= 90):
            rep.add("latitude_out_of_range", SEV_CRIT, "locations",
                    f"location {r.get('location_id')} latitude={lat}")
        if lon is not None and not (-180 <= lon <= 180):
            rep.add("longitude_out_of_range", SEV_CRIT, "locations",
                    f"location {r.get('location_id')} longitude={lon}")
        if lat is not None and lat == 0 and lon is not None and lon == 0:
            rep.add("null_island", SEV_HIGH, "locations",
                    f"location {r.get('location_id')} is exactly (0,0)")


def check_timestamps(rep: Report) -> None:
    """Timestamps must parse, and be monotonic within a wellbore for series."""
    import pandas as pd

    for name, col in (("drilling_timeseries", "timestamp"),):
        rows = load_table(name)
        if not rows or col not in rows[0]:
            continue
        non_null = [r[col] for r in rows if (r.get(col) or "").strip()]
        if not non_null:
            continue
        parsed = pd.to_datetime(pd.Series(non_null), errors="coerce", format="mixed")
        bad = int(parsed.isna().sum())
        if bad:
            rep.add("timestamp_unparseable", SEV_CRIT, name,
                    f"{bad}/{len(non_null)} {col} values do not parse as datetimes",
                    n=bad)
        df = pd.DataFrame({"wellbore_id": [r.get("wellbore_id") for r in rows
                                           if (r.get(col) or "").strip()],
                           "ts": parsed})
        for wb, grp in df.groupby("wellbore_id"):
            if len(grp) > 2 and not grp["ts"].is_monotonic_increasing:
                rep.add("timestamp_not_monotonic", SEV_MED, name,
                        f"wellbore {wb}: timestamps are not monotonic "
                        f"({len(grp)} rows)", fatal=False)
                break


def check_provenance(rep: Report) -> None:
    """source and confidence must be populated on extracted records."""
    for name in ("events", "formations", "trajectories", "documents", "lithology"):
        table = TABLES.get(name)
        if not table or "source" not in table.columns:
            continue
        rows = load_table(name)
        if not rows:
            continue
        miss = [r for r in rows if not (r.get("source") or "").strip()]
        if miss:
            rep.add("provenance_missing", SEV_CRIT, name,
                    f"{len(miss)}/{len(rows)} records have no source", n=len(miss))
    ev = load_table("events")
    if ev and "source_page" in ev[0]:
        linked = [r for r in ev if (r.get("source_document") or "").strip()]
        nopage = [r for r in linked if not (r.get("source_page") or "").strip()]
        if nopage and linked:
            rep.add("event_page_provenance_missing", SEV_HIGH, "events",
                    f"{len(nopage)}/{len(linked)} events have a source_document "
                    f"but no source_page", n=len(nopage), fatal=False)
        if not linked and ev:
            rep.add("event_provenance_absent", SEV_HIGH, "events",
                    "no event carries a source_document; extraction is unauditable",
                    fatal=False)


def check_confidence(rep: Report) -> None:
    """Extracted records must declare a confidence and an extraction method."""
    ev = load_table("events")
    if not ev:
        return
    if "extraction_method" in ev[0]:
        miss = [r for r in ev if not (r.get("extraction_method") or "").strip()]
        if miss:
            rep.add("extraction_method_missing", SEV_HIGH, "events",
                    f"{len(miss)}/{len(ev)} events have no extraction_method",
                    n=len(miss), fatal=False)
    if "confidence" in ev[0]:
        miss = [r for r in ev if not (r.get("confidence") or "").strip()]
        if miss:
            rep.add("confidence_missing", SEV_HIGH, "events",
                    f"{len(miss)}/{len(ev)} events have no confidence", n=len(miss),
                    fatal=False)


def run(allow_empty: bool) -> Report:
    rep = Report()
    populated = check_population(rep, allow_empty)
    if not populated:
        return rep
    check_schema(rep)
    check_data_origin(rep)
    check_keys(rep)
    check_foreign_keys(rep)
    check_depths(rep)
    check_coordinates(rep)
    check_timestamps(rep)
    check_provenance(rep)
    check_confidence(rep)
    return rep


def decide(rep: Report, bootstrap: bool) -> str:
    if rep.row_counts and sum(rep.row_counts.values()) == 0:
        return EMPTY
    if rep.fatal_findings:
        return INVALID
    if rep.findings:
        # Non-fatal findings only: PARTIAL unless we allow it (bootstrap).
        return PARTIAL if not bootstrap else VALID
    return VALID


def render(rep: Report, state: str) -> str:
    L = []
    L.append("=" * 72)
    L.append("NWIS DATASET VALIDATION")
    L.append("=" * 72)
    L.append("")
    L.append("ROW COUNTS")
    L.append("-" * 72)
    total = 0
    for name in TABLES:
        n = rep.row_counts.get(name, 0)
        total += n
        flag = "" if n else "   <- empty"
        L.append(f"  {name:22s} {n:>10,}{flag}")
    L.append(f"  {'TOTAL':22s} {total:>10,}")
    L.append("")

    if not rep.findings:
        L.append("FINDINGS: none")
    else:
        L.append(f"FINDINGS ({len(rep.findings)})")
        L.append("-" * 72)
        order = {SEV_CRIT: 0, SEV_HIGH: 1, SEV_MED: 2, SEV_LOW: 3}
        for f in sorted(rep.findings, key=lambda x: (order[x.severity], not x.fatal)):
            L.append(f"  [{f.severity:8s}] {f.check:32s} {f.table}")
            L.append(f"             {f.message}")
            if f.evidence:
                L.append(f"             evidence: {f.evidence}")
            if not f.fatal:
                L.append(f"             (advisory, does not block VALID)")
    L.append("")
    L.append("=" * 72)
    L.append(f"STATUS: {state}")
    L.append("=" * 72)
    if state == EMPTY:
        L.append("")
        L.append("NOTHING WAS VALIDATED. Every canonical table is header-only.")
        L.append("Run the ingestion + normalization pipeline first:")
        L.append("    make fetch && make inspect && make normalize")
        L.append("Use --allow-empty only for schema-only development.")
    elif state == PARTIAL:
        L.append("")
        L.append("Data is present but incomplete. Advisory findings remain open.")
    elif state == VALID:
        L.append("")
        L.append("All required tables populated and all checks passed.")
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--allow-empty", action="store_true",
                    help="schema-only development: report EMPTY as 0 instead of 2")
    ap.add_argument("--bootstrap", action="store_true",
                    help="treat PARTIAL (advisory findings) as acceptable")
    ap.add_argument("--json", help="also write the report as JSON")
    args = ap.parse_args()

    rep = run(args.allow_empty)
    state = decide(rep, args.bootstrap)

    if args.allow_empty and state == EMPTY:
        state_for_exit = EMPTY
        code = 0
    else:
        code = {VALID: 0, INVALID: 1, EMPTY: 2, PARTIAL: 3}[state]
        state_for_exit = state

    print(render(rep, state_for_exit))

    if args.json:
        Path(args.json).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json).write_text(json.dumps({
            "state": state_for_exit,
            "row_counts": rep.row_counts,
            "findings": [f.__dict__ for f in rep.findings],
        }, indent=2), encoding="utf-8")
        print(f"\nJSON report -> {args.json}")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
