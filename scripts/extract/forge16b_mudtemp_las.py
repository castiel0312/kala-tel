#!/usr/bin/env python3
"""Extract FORGE 16B(78)-32 mud temperature from the 54 CWLS LAS files.

These are native, machine-readable ASCII logs (no OCR) and are the only
unambiguous public mud data in the FORGE release. The DDR "Mud Information"
blocks cannot be used for rheology: they print a 20+ column header but supply
only three bare values, so column assignment is not recoverable (see
forge16b_ddr.parse_mud).

Curves (from ~LOG_DEFINITION):
    DEPT.ft   Hole Depth
    MTIA.F    Mud Temp. In
    MTOA.F    Mud Temp. Out

Notes:
  * There is no ~A section; the data block starts at "~LOG_DATA".
  * NULL is -999.25 and is dropped, not treated as a real temperature.
  * Files are dated snapshots that OVERLAP in depth (e.g. 09/06/2023 stops at
    10249.5 ft and re-logs from 90 ft). Rows are therefore keyed by
    (log_date, depth) and are NOT collapsed across dates.

Outputs (data/interim/forge16b_78_32/):
    mudtemp_las.csv      one row per non-null DEPT/MTIA/MTOA triple
    mudtemp_las_files.csv per-file metadata and extraction counts

Usage:
    python scripts/extract/forge16b_mudtemp_las.py
"""
from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import INTERIM, RAW, to_float, utc_now, write_csv  # noqa: E402

ARCHIVE = RAW / "utah_forge" / "16B mud temp logs.zip"
OUT_DIR = INTERIM / "forge16b_78_32"

NULL_CANDIDATES = {-999.25, -999.2500, -999.25}


def parse_las(text: str) -> tuple[dict, list[tuple[str, ...]], list[str]]:
    """Return (well header, curve mnemonics, data rows)."""
    header: dict = {}
    curves: list[str] = []
    rows: list[tuple[str, ...]] = []

    section = None
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("~"):
            head = s[1:2].upper()
            section = "well" if head == "W" else (
                "def" if head == "L" else (
                    "data" if s.upper().startswith("~LOG_DATA") else None))
            # ~LOG_DATA | LOG_DEFINITION starts with "L" but is the data block.
            if s.upper().startswith("~LOG_DATA"):
                section = "data"
            continue
        if section == "well":
            m = re.match(r"^([A-Za-z_.\-]+)\s*\.\s*(\S+)\s*:?\s*(.*)$", s)
            if m:
                header[m.group(1).upper()] = m.group(2).strip()
        elif section == "def":
            m = re.match(r"^([A-Za-z_][\w.\-]*)\.(\S+)", s)
            if m:
                curves.append(m.group(1))
        elif section == "data":
            parts = s.split()
            if len(parts) >= 2:
                rows.append(tuple(parts))
    return header, curves, rows


def main() -> int:
    if not ARCHIVE.exists():
        print(f"NOT FOUND: {ARCHIVE}")
        print("Run: make fetch")
        return 1

    out_rows: list[dict] = []
    file_meta: list[dict] = []
    nulls_dropped = 0

    with zipfile.ZipFile(ARCHIVE) as z:
        members = sorted(n for n in z.namelist() if n.lower().endswith(".las"))
        for name in members:
            text = z.read(name).decode("utf-8", "replace")
            header, curves, rows = parse_las(text)
            log_date = header.get("DATE", "")
            kept = 0
            for parts in rows:
                vals = [to_float(p) for p in parts]
                if len(vals) < 3 or vals[0] is None:
                    continue
                depth, m_in, m_out = vals[0], vals[1], vals[2]
                if m_in is not None and round(m_in, 2) in NULL_CANDIDATES:
                    m_in = None
                    nulls_dropped += 1
                if m_out is not None and round(m_out, 2) in NULL_CANDIDATES:
                    m_out = None
                    nulls_dropped += 1
                if m_in is None and m_out is None:
                    nulls_dropped += 0  # fully null depth step
                    continue
                kept += 1
                out_rows.append({
                    "las_file": name,
                    "log_date": log_date,
                    "depth_ft": f"{depth:g}",
                    "mud_temp_in_f": "" if m_in is None else f"{m_in:g}",
                    "mud_temp_out_f": "" if m_out is None else f"{m_out:g}",
                })
            file_meta.append({
                "las_file": name,
                "log_date": log_date,
                "well": header.get("WELL", ""),
                "field": header.get("FLD", ""),
                "strt_ft": header.get("STRT.FT", header.get("STRT", "")),
                "stop_ft": header.get("STOP.FT", header.get("STOP", "")),
                "step_ft": header.get("STEP.FT", header.get("STEP", "")),
                "null_value": header.get("NULL.", header.get("NULL", "")),
                "curves": "|".join(curves),
                "rows_kept": str(kept),
            })

    write_csv(OUT_DIR / "mudtemp_las.csv", out_rows,
              ["las_file", "log_date", "depth_ft",
               "mud_temp_in_f", "mud_temp_out_f"])
    write_csv(OUT_DIR / "mudtemp_las_files.csv", file_meta,
              ["las_file", "log_date", "well", "field", "strt_ft", "stop_ft",
               "step_ft", "null_value", "curves", "rows_kept"])

    dates = sorted({m["log_date"] for m in file_meta})
    print(f"  LAS files read     : {len(file_meta)}")
    print(f"  distinct log dates : {len(dates)}  ({dates[0]} .. {dates[-1]})")
    print(f"  curves found       : {file_meta[0]['curves'] if file_meta else '-'}")
    print(f"  mud-temp rows kept : {len(out_rows)}")
    print(f"  null values dropped: {nulls_dropped}")
    print(f"  written            : {utc_now()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
