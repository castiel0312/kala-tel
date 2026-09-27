#!/usr/bin/env python3
"""Extract the FORGE 16B(78)-32 directional survey to data/interim/.

Source: "16B(78)-32 Final Survey Report.txt" (plain text, fixed-width).
Emits data/interim/forge16b_78_32/survey.csv in SOURCE UNITS (feet) plus the
CRS/datum metadata. Column names carry the source unit suffix so the consumer
never has to guess. Unit conversion happens in normalize/01_clean.py, never
here, so the original representation stays immutable.

Source column -> interim column (source unit preserved):
    MD    -> md_ft              INC   -> inc_deg          AZI  -> azi_deg
    TVD   -> tvd_ft             SSTVD -> sstvd_ft         N/S  -> ns_ft
    NORTHING -> northing_ft     E/W  -> ew_ft            EASTING -> easting_ft
    VSEC  -> vsection_ft        DLS   -> dls_deg_per_100ft

NOTE: the source DLS unit is deg/100ft (see the unit row under the table
header), NOT deg/30ft. 01_clean.py converts it with the deg_per_100ft->
deg_per_30ft rule; the interim layer keeps the source unit.

Usage:
    python scripts/extract/forge16b_survey.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import INTERIM, to_float, utc_now, write_csv  # noqa: E402

SRC_DIR = INTERIM / "forge16b_78_32" / "16B(78)-32 Well Survey"
SURVEY_TXT = SRC_DIR / "16B(78)-32 Final Survey Report.txt"
OUT = INTERIM / "forge16b_78_32" / "survey.csv"

COLUMNS = ["md_ft", "inc_deg", "azi_deg", "tvd_ft", "sstvd_ft", "ns_ft",
           "northing_ft", "ew_ft", "easting_ft", "vsection_ft",
           "dls_deg_per_100ft", "original_depth_unit", "source_file"]

META_KEYS = {
    "COMPANY": "company", "FIELD": "field", "SITE": "site", "WELL": "well",
    "WELLPATH": "wellpath", "MAP SYSTEM": "map_system", "GEODIC DATUM": "datum",
    "MAP ZONE": "map_zone", "CALCULATION METHOD": "calc_method",
    "WELL EASTING": "well_easting", "WELL NORTHING": "well_northing",
    "KB ELEV": "kb_elev", "GL ELEV": "gl_elev", "DATE": "survey_date",
    "VSECT DIREC": "vsect_direction", "NORTH REF": "north_ref",
}


def parse_meta(text: str) -> dict:
    meta = {}
    for key, field in META_KEYS.items():
        m = re.search(rf"^{re.escape(key)}\s*:\s*(.+)$", text, re.M)
        if m:
            meta[field] = " ".join(m.group(1).split())
    return meta


def parse_stations(text: str) -> list[dict]:
    """Parse the fixed-width survey table.

    Column order is taken from the header line, not assumed, and each data line
    is accepted only when the first eleven fields all parse as floats.
    """
    lines = text.splitlines()
    header_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("MD") and "TVD" in line and "NORTHING" in line:
            header_idx = i
            break
    if header_idx is None:
        raise SystemExit("survey table header not found")

    # Unit row is the line after the header, e.g. "(ft) (deg) (deg) (ft) ...".
    unit_row = lines[header_idx + 1] if header_idx + 1 < len(lines) else ""
    depth_unit = "ft" if "(ft)" in unit_row else "UNKNOWN"
    dls_unit = "deg/100ft" if "deg/100ft" in unit_row else "deg/100ft"

    rows: list[dict] = []
    for line in lines[header_idx + 2:]:
        parts = line.split()
        if len(parts) < 11:
            if rows:
                break
            continue
        try:
            v = [float(p) for p in parts[:11]]
        except ValueError:
            if rows:
                break
            continue
        rows.append({
            "md_ft": v[0], "inc_deg": v[1], "azi_deg": v[2], "tvd_ft": v[3],
            "sstvd_ft": v[4], "ns_ft": v[5], "northing_ft": v[6],
            "ew_ft": v[7], "easting_ft": v[8], "vsection_ft": v[9],
            "dls_deg_per_100ft": v[10],
            "original_depth_unit": depth_unit,
            "dls_unit": dls_unit,
            "source_file": SURVEY_TXT.name,
        })
    return rows


def main() -> int:
    if not SURVEY_TXT.exists():
        print(f"NOT FOUND: {SURVEY_TXT}")
        print("Run: make fetch && python scripts/ingest/extract_forge16b.py")
        return 1

    text = SURVEY_TXT.read_text(errors="replace")
    meta = parse_meta(text)
    rows = parse_stations(text)

    if not rows:
        print("ERROR: no survey stations parsed")
        return 2

    # Sanity: TVD must be <= MD for a physically plausible well, and SSTVD must
    # start at minus the KB elevation if the datum is the rotary bushing.
    bad = [r for r in rows if r["tvd_ft"] > r["md_ft"] + 1e-6]
    kb = to_float(meta.get("kb_elev", "").replace("ft", ""))
    sstvd0 = rows[0]["sstvd_ft"]
    datum_consistent = (kb is not None and abs(sstvd0 + kb) < 0.5)

    print(f"s wellsite: {meta.get('well')}  field: {meta.get('field')}")
    print(f"  CRS        : {meta.get('map_system')} | {meta.get('datum')} | "
          f"{meta.get('map_zone')}")
    print(f"  elevations : KB={meta.get('kb_elev')} GL={meta.get('gl_elev')}")
    print(f"  well head  : E={meta.get('well_easting')} N={meta.get('well_northing')}")
    print(f"  stations   : {len(rows)}")
    print(f"  MD range   : {rows[0]['md_ft']:,.2f} - {rows[-1]['md_ft']:,.2f} "
          f"({rows[0]['original_depth_unit']})")
    print(f"  TVD range  : {min(r['tvd_ft'] for r in rows):,.2f} - "
          f"{max(r['tvd_ft'] for r in rows):,.2f}")
    print(f"  INC range  : {min(r['inc_deg'] for r in rows):.2f} - "
          f"{max(r['inc_deg'] for r in rows):.2f} deg")
    print(f"  AZI range  : {min(r['azi_deg'] for r in rows):.2f} - "
          f"{max(r['azi_deg'] for r in rows):.2f} deg")
    print(f"  TVD<=MD    : {'OK' if not bad else f'{len(bad)} VIOLATIONS'}")
    print(f"  SSTVD datum: {'consistent with -KB' if datum_consistent else 'MISMATCH'} "
          f"(SSTVD[0]={sstvd0}, KB={kb})")
    print(f"  extracted  : {utc_now()}")

    write_csv(OUT, rows, COLUMNS)
    (INTERIM / "forge16b_78_32" / "survey_meta.json").write_text(
        __import__("json").dumps(meta, indent=2), encoding="utf-8")
    print(f"\n  [WRITE] {OUT.relative_to(REPO_ROOT)} ({len(rows)} rows, "
          f"source units preserved)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
