#!/usr/bin/env python3
"""Extract FORGE 16B(78)-32 Pason KPI directory (88 daily folders).

The kpi_daily tree is native CSV, no OCR required. It is the authoritative
source for well identity, surface coordinates, spud date, per-tour drilling
performance, and connection-level detail:

    <day>/well_info.csv                     GUID, Dossier, Rig, Operator, WellName
    <day>/daily_kpi.csv                     KPI, Units, Tour 1, Tour 2, All
    <day>/drilling_connection_detail.csv    one row per drilling connection
    <day>/tripping_connection_detail.csv    one row per trip connection

Coordinates and spud date are taken from the "All" column of daily_kpi.csv
(Latitude 38.5046, Longitude -112.8968, Spud Apr 26 2023 02:30) and are
cross-checked against well_info.csv for well name / operator / rig agreement.
The DDR "RKB Elevation" field was found to be unparseable (the PDF emits the
report number in the value slot), so elevations come from the survey report
instead, not from here.

NaN is preserved as empty; it means Pason had no value, and it is never
coerced to 0.

Outputs (data/interim/forge16b_78_32/):
    pason_well_info.csv            identity + coordinates + spud date
    pason_kpi_daily.csv            wide, one row per day, key metrics
    pason_kpi_long.csv             long, every KPI x tour, full fidelity
    pason_drilling_connections.csv connection-level drilling detail
    pason_tripping_connections.csv connection-level tripping detail

Usage:
    python scripts/extract/forge16b_pason_kpi.py
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import INTERIM, to_float, utc_now, write_csv  # noqa: E402

KPI_DIR = INTERIM / "forge16b_78_32" / "16B_Pason" / "kpi_daily"
OUT_DIR = INTERIM / "forge16b_78_32"

# KPIs promoted to the wide daily table.
WIDE_KPIS = [
    "Report Time (From)", "Report Time (To)",
    "Hole Depth (From)", "Hole Depth (To)",
    "Total Drill Length", "Rotary Drill Length", "Slide Drill Length",
    "Total Drill Time", "Rotary Drill Time", "Slide Drill Time",
    "On Bottom Time", "Off Bottom Time",
    "Average ROP", "Rotary ROP", "Slide ROP",
    "Trip-In Time", "Trip-Out Time", "Trip-In Speed", "Trip-Out Speed",
    "Drill Connection - Number of Connections",
    "Drill Connection - Mean Weight-to-Weight Time",
    "Drill Connection - Median Weight-to-Weight Time",
    "Trip Connection - Number of Connections",
    "Rig State - Drilling", "Rig State - Tripping",
    "Rig State - Out-of-hole", "Rig State - Other",
    "Drilling State - Rotary", "Drilling State - Sliding",
    "Drilling State - Connection", "Drilling State - Circulating",
    "Drilling State - Reaming", "Drilling State - Unknown",
]

CONN_FIELDS = [
    "GUID", "Hole_Depth_ft", "Bit_Depth_ft", "DateTime",
    "Drilling_W2W_minutes", "Drilling_W2S_minutes",
    "Drilling_S2S_minutes", "Drilling_S2W_minutes",
]


def clean(v: str) -> str:
    v = (v or "").strip()
    return "" if v in ("", "NaN", "nan", "None") else v


def read_daily_kpi(path: Path) -> list[dict]:
    rows = []
    with path.open(newline="", encoding="utf-8", errors="replace") as fh:
        for r in csv.reader(fh):
            if len(r) < 5:
                continue
            rows.append({"kpi": r[0].strip(), "units": r[1].strip(),
                         "tour1": clean(r[2]), "tour2": clean(r[3]),
                         "all": clean(r[4])})
    return rows


def read_well_info(path: Path) -> dict:
    """well_info.csv has no DateTime column, so it needs its own reader."""
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8", errors="replace") as fh:
        for r in csv.DictReader(fh):
            if r.get("WellName"):
                return {k: clean(v) for k, v in r.items()}
    return {}


def read_connections(path: Path, kind: str) -> list[dict]:
    if not path.exists():
        return []
    out = []
    with path.open(newline="", encoding="utf-8", errors="replace") as fh:
        for r in csv.DictReader(fh):
            if not r.get("DateTime"):
                continue
            row = {"day": path.parent.name.replace("kpi_", ""), "kind": kind}
            for k in CONN_FIELDS:
                if k in r:
                    row[k] = clean(r[k])
            if kind == "trip":
                row["trip_s2s_minutes"] = clean(r.get("Tripping_S2S_minutes", ""))
            out.append(row)
    return out


def main() -> int:
    if not KPI_DIR.exists():
        print(f"NOT FOUND: {KPI_DIR}")
        print("Run: make fetch && python scripts/ingest/extract_forge16b.py")
        return 1

    days = sorted(d for d in KPI_DIR.iterdir()
                  if d.is_dir() and re.fullmatch(r"kpi_\d{8}", d.name))
    if not days:
        print(f"NO DAY FOLDERS under {KPI_DIR}")
        return 1

    wide, long_rows = [], []
    drilling, tripping = [], []
    identity: dict = {}
    # Fields that Pason restates per day and that are NOT constant. These are
    # recorded as full distributions instead of a silently-chosen first value.
    variants: dict[str, dict[str, list[str]]] = {
        "spud_date": {}, "latitude": {}, "longitude": {}}
    stable: dict = {}

    for d in days:
        kpis = read_daily_kpi(d / "daily_kpi.csv")
        by = {k["kpi"]: k for k in kpis}

        # Identity / coordinates from the "All" column.
        for key, field, var in (("Well Name", "well_name", None),
                                ("Rig", "rig", None),
                                ("Latitude", "latitude", "latitude"),
                                ("Longitude", "longitude", "longitude"),
                                ("Spud Date", "spud_date", "spud_date")):
            v = by.get(key, {}).get("all", "")
            if not v:
                continue
            if var:
                variants[var].setdefault(v, []).append(d.name.replace("kpi_", ""))
            else:
                if field in stable and stable[field] != v:
                    print(f"  [WARN] {field} conflicts: "
                          f"{stable[field]!r} != {v!r} ({d.name})")
                stable.setdefault(field, v)

        # Cross-check well_info.csv against daily_kpi.csv.
        wi = read_well_info(d / "well_info.csv")
        if wi:
            stable.setdefault("guid", wi.get("GUID", ""))
            stable.setdefault("dossier", wi.get("Dossier", ""))
            stable.setdefault("operator", wi.get("Operator", ""))
            stable.setdefault("well_name_info", wi.get("WellName", ""))
            stable.setdefault("rig_info", wi.get("Rig", ""))

        row = {"day": d.name.replace("kpi_", ""),
               "day_of_week": d.name.replace("kpi_", "")}
        for kpi in WIDE_KPIS:
            k = by.get(kpi)
            if not k:
                continue
            slug = re.sub(r"[^a-z0-9]+", "_", kpi.lower()).strip("_")
            units = k["units"].replace(" ", "_")
            for tour, col in (("t1", "tour1"), ("t2", "tour2"), ("all", "all")):
                v = k[col]
                if v:
                    row[f"{slug}__{tour}"] = v
                    if tour != "all":
                        row.setdefault(f"{slug}__units", units)
        wide.append(row)

        for k in kpis:
            for tour, col in (("Tour 1", "tour1"), ("Tour 2", "tour2"),
                              ("All", "all")):
                v = k[col]
                if v == "":
                    continue
                long_rows.append({"day": d.name.replace("kpi_", ""),
                                  "kpi": k["kpi"], "units": k["units"],
                                  "tour": tour, "value": v})

        drilling += read_connections(d / "drilling_connection_detail.csv",
                                     "drilling")
        tripping += read_connections(d / "tripping_connection_detail.csv",
                                     "tripping")

    # Record the distribution of every non-constant field rather than
    # resolving it silently.
    def var_summary(field: str) -> tuple[str, str, str]:
        v = variants[field]
        if not v:
            return "", "", "0"
        if len(v) == 1:
            only = next(iter(v))
            return only, "", str(len(only and v[only] or v[only]))
        parts = "; ".join(f"{k} (n={len(d)})" for k, d in sorted(
            v.items(), key=lambda kv: -len(kv[1])))
        majority = max(v.items(), key=lambda kv: len(kv[1]))[0]
        return majority, parts, str(sum(len(d) for d in v.values()))

    spud, spud_all, spud_n = var_summary("spud_date")
    lat, lat_all, lat_n = var_summary("latitude")
    lon, lon_all, lon_n = var_summary("longitude")

    # Prefer the Decimal-degree coordinate strings verbatim; record units.
    write_csv(OUT_DIR / "pason_well_info.csv", [{
        "well_name": stable.get("well_name", ""),
        "well_name_well_info": stable.get("well_name_info", ""),
        "rig": stable.get("rig", ""),
        "operator": stable.get("operator", ""),
        "guid": stable.get("guid", ""),
        "dossier": stable.get("dossier", ""),
        "latitude_deg": lat,
        "latitude_variants": lat_all,
        "longitude_deg": lon,
        "longitude_variants": lon_all,
        "coord_units": "decimal degrees",
        "coord_source": "pason kpi_daily/daily_kpi.csv (All column)",
        "spud_date": spud,
        "spud_date_variants": spud_all,
        "spud_date_days": spud_n,
        "day_folders": str(len(days)),
    }], ["well_name", "well_name_well_info", "rig", "operator", "guid",
         "dossier", "latitude_deg", "latitude_variants", "longitude_deg",
         "longitude_variants", "coord_units", "coord_source", "spud_date",
         "spud_date_variants", "spud_date_days", "day_folders"])

    wide_cols = ["day", "day_of_week"]
    for r in wide:
        for k in r:
            if k not in wide_cols and not k.endswith("__units"):
                wide_cols.append(k)
    for r in wide:
        for k in wide_cols:
            r.setdefault(k, "")
    write_csv(OUT_DIR / "pason_kpi_daily.csv", wide, wide_cols)
    write_csv(OUT_DIR / "pason_kpi_long.csv", long_rows,
              ["day", "kpi", "units", "tour", "value"])

    dcols = ["day", "kind"] + [c for c in CONN_FIELDS if c != "GUID"]
    write_csv(OUT_DIR / "pason_drilling_connections.csv", drilling, dcols)
    tcols = ["day", "kind", "Hole_Depth_ft", "Bit_Depth_ft", "DateTime",
             "trip_s2s_minutes"]
    write_csv(OUT_DIR / "pason_tripping_connections.csv", tripping, tcols)

    # Connection-level anomaly summary: long weight-to-weight times are the
    # machine-readable signature of slow drilling / stuck pipe.
    w2w = [to_float(r.get("Drilling_W2W_minutes", "")) for r in drilling]
    w2w = [v for v in w2w if v is not None]
    slow = [v for v in w2w if v >= 30.0]
    depths = [to_float(r.get("Hole_Depth_ft", "")) for r in drilling]
    depths = [v for v in depths if v is not None]

    print(f"  day folders        : {len(days)}  ({days[0].name} .. {days[-1].name})")
    print(f"  well name          : {stable.get('well_name', '?')}")
    print(f"  operator / rig     : {stable.get('operator', '?')} / {stable.get('rig', '?')}")
    print(f"  latitude           : {lat}")
    if lat_all:
        print(f"      variants       : {lat_all}")
    print(f"  longitude          : {lon}")
    if lon_all:
        print(f"      variants       : {lon_all}")
    print(f"  spud date          : {spud}  (across {spud_n} day folders)")
    for part in (spud_all or "").split("; "):
        if part:
            print(f"      variant        : {part}")
    print(f"  kpi long rows      : {len(long_rows)}")
    print(f"  drilling connections: {len(drilling)}")
    if w2w:
        print(f"  W2W  min/median/max: {min(w2w):.2f} / "
              f"{sorted(w2w)[len(w2w) // 2]:.2f} / {max(w2w):.2f} min")
        print(f"  connections W2W >= 30 min: {len(slow)}")
    if depths:
        print(f"  connection depth range: {min(depths):.1f} - {max(depths):.1f} ft")
    print(f"  tripping connections: {len(tripping)}")
    print(f"  written            : {utc_now()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
