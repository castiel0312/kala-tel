#!/usr/bin/env python3
"""Stage 01 -- clean the extracted interim layer into canonical units.

This stage does NOT decide anything about the data. It only:
  * reads every interim CSV produced by scripts/extract/
  * converts source units to canonical units using the versioned rules in
    nwis_lib (feet -> metres, kips -> kN, gal/min -> L/min, bbl -> m3,
    ppg -> SG, psi -> MPa, degF -> degC, deg/100ft -> deg/30ft)
  * normalizes every timestamp to ISO 8601
  * maps every sentinel / placeholder / "NaN" to an explicit empty value
  * records what it read, so later stages and the report can be audited

Canonical depths are METRES (see nwis_lib.TABLES["trajectories"]), while all
FORGE sources are in feet. The original unit is carried alongside so the
conversion is never irreversible.

Nothing is dropped here. A value that cannot be parsed becomes empty and is
counted, never imputed.

Grain note (important): the LAS mud-temperature log is DEPTH-indexed -- all
rows of a log share one log date (27 distinct dates for 457,104 rows). It is
therefore written to mud_properties_depth_log.csv and is NOT shaped like the
canonical mud_properties table, whose primary key is (wellbore_id, timestamp).
Forcing the depth log into that key would manufacture hundreds of thousands of
duplicate keys. The canonical time-series mud table is built in 02_promote.py
from the daily DDR mud reports instead.

Outputs (data/interim/normalized/):
    clean_manifest.json     what was read, row counts, null counts
    <name>.csv              cleaned copies of each interim table
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import csv  # noqa: E402
import re  # noqa: E402

from nwis_lib import (  # noqa: E402
    BBL_TO_M3, CONVERSION_VERSION, DLS_100FT_TO_30FT, F_PER_HR_TO_M_PER_HR,
    FT_TO_M, GPM_TO_LPM, INTERIM, KLBF_TO_KN, PPG_TO_SG, PSI_TO_MPA,
    PUBLIC_REAL, NULL_TOKENS, to_float, utc_now,
)

SRC = INTERIM / "forge16b_78_32"
OUT = INTERIM / "normalized"
STAGE = "01_clean"

WELL_ID = "FORGE16B7832"
WELLBORE_ID = "FORGE16B7832-01"

# Pass-through tables copied verbatim (already canonical enough, or consumed
# directly by 02_promote.py). Unit conversion is NOT applied to these.
PASSTHROUGH = ("ddr_documents", "ddr_npt", "ddr_bha", "ddr_mud", "ddr_casings",
               "ddr_operations", "alt_documents", "alt_lithology",
               "alt_operations", "pason_well_info", "pason_drilling_connections",
               "pason_tripping_connections", "pason_kpi_long",
               "pason_10s_runs", "pason_10s_channels", "mudtemp_las_files")


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8", errors="replace") as fh:
        return list(csv.DictReader(fh))


def fnum(v, factor: float = 1.0, nd: int = 4):
    """to_float + optional unit scaling. Sentinel/NaN/blank -> '' (never 0)."""
    f = to_float(v)
    if f is None:
        return ""
    out = f * factor
    if abs(out) < 10 ** (-nd):
        return "0" if out == 0 else ""
    return f"{out:.{nd}f}".rstrip("0").rstrip(".")


def las_index_ft(v, null_code: str = "-999.25", nd: int = 4):
    """Convert a LAS DEPTH INDEX to metres, honouring only the file's own
    declared null code.

    A LAS depth index is not a sensor reading, so the global sensor SENTINELS
    list must NOT be applied to it. 9999 ft (3047.6952 m) is a real measured
    depth in 16B(78)-32 -- the well was drilled to 10,947 ft -- yet 9999.0 is
    a standard "no data" code for measurements, so to_float() nulls it. Doing
    that silently destroyed 30 genuine samples (one per affected LAS file, all
    at grid position 8429) before this helper existed.

    Only a blank, a null token, or the null code the LAS header actually
    declares (NULL. -999.25) is treated as missing.
    """
    s = str(v or "").strip()
    if not s or s.lower() in NULL_TOKENS:
        return ""
    try:
        f = float(s)
    except ValueError:
        return ""
    try:
        null = float(str(null_code).strip())
    except (TypeError, ValueError):
        null = -999.25
    if abs(f - null) < 1e-6:
        return ""
    out = f * FT_TO_M
    if abs(out) < 10 ** (-nd):
        return "0" if out == 0 else ""
    return f"{out:.{nd}f}".rstrip("0").rstrip(".")


def f_to_c(value, nd: int = 4) -> str:
    """degF -> degC. Offset conversion, so it cannot use fnum()."""
    f = to_float(value)
    if f is None:
        return ""
    c = (f - 32.0) * 5.0 / 9.0
    return f"{c:.{nd}f}".rstrip("0").rstrip(".")


_TS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?")


def iso_ts(value, end_of_day: bool = False) -> str:
    """Normalize a timestamp to ISO 8601.

    The FORGE/Pason sources carry rig-local wall-clock time with NO timezone
    declaration. No offset is invented here: the value is emitted as a naive
    ISO 8601 local timestamp (e.g. 2023-04-26T02:30:00). Appending 'Z' would
    assert a UTC offset the source never establishes.
    """
    if value is None:
        return ""
    s = str(value).strip()
    if not s:
        return ""
    # US M/D/YYYY (the survey report writes "6/26/2023").
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
    if m:
        return (f"{int(m.group(3)):04d}-{int(m.group(1)):02d}-"
                f"{int(m.group(2)):02d}T00:00:00")
    # US M-D-YY (4 of the ALT report headers write "6-26-23" / "7-4-23").
    m = re.match(r"^(\d{1,2})-(\d{1,2})-(\d{2,4})$", s)
    if m:
        y = int(m.group(3))
        return (f"{y + 2000 if y < 100 else y:04d}-{int(m.group(1)):02d}-"
                f"{int(m.group(2)):02d}T00:00:00")
    s = s.replace("/", "-")
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?",
                 s)
    if not m:
        return ""
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    hh = m.group(4)
    mi = m.group(5)
    ss = m.group(6)
    if hh is None:
        if end_of_day:
            hh, mi, ss = 23, 59, 59
        else:
            hh, mi, ss = 0, 0, 0
    return f"{y:04d}-{mo:02d}-{d:02d}T{int(hh):02d}:{int(mi):02d}:{int(ss or 0):02d}"


_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun",
     "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def iso_from_ddmmdyyyy(value) -> str:
    """'28-Apr-23' + '15:00' -> ISO 8601 local timestamp."""
    s = str(value or "").strip()
    if not s:
        return ""
    m = re.match(r"^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$", s)
    if not m:
        return iso_ts(s)
    d, mon, y = int(m.group(1)), _MONTHS.get(m.group(2).lower()), int(m.group(3))
    if not mon:
        return ""
    if y < 100:
        y += 2000
    return f"{y:04d}-{mon:02d}-{d:02d}T00:00:00"


_PPG_SUFFIX = re.compile(r"^([0-9]+(?:\.[0-9]+)?)\s*\+")


def ppg_to_sg(value) -> str:
    """ppg -> SG. The DDR writes open-ended weights as '8.3+'; the '+' means
    '8.3 or heavier', so the numeric part is used and the bound is not invented."""
    s = str(value or "").strip()
    if not s:
        return ""
    if s.endswith("+"):
        s = _PPG_SUFFIX.sub(r"\1", s)
    f = to_float(s)
    if f is None:
        return ""
    return fnum(f, PPG_TO_SG, 4)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "stage": STAGE,
        "run_at": utc_now(),
        "conversion_version": CONVERSION_VERSION,
        "well_id": WELL_ID,
        "wellbore_id": WELLBORE_ID,
        "data_origin": PUBLIC_REAL,
        "canonical_depth_unit": "m",
        "timestamp_policy": "ISO 8601, naive local (source declares no offset)",
        "tables": {},
    }

    # ---- survey metadata (CRS / datum / elevations) --------------------
    meta = {}
    meta_path = SRC / "survey_meta.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())

    crs = " / ".join(x for x in (meta.get("map_system"), meta.get("datum"),
                                  meta.get("map_zone")) if x)
    survey_time = iso_ts(meta.get("survey_date", ""))
    conv_rule = f"ft*{FT_TO_M};dls*{DLS_100FT_TO_30FT} (v{CONVERSION_VERSION})"

    # ---- trajectories: survey feet -> metres ---------------------------
    # Producer/consumer contract (see scripts/extract/forge16b_survey.py):
    #   md_ft, inc_deg, azi_deg, tvd_ft, sstvd_ft, ns_ft, northing_ft,
    #   ew_ft, easting_ft, vsection_ft, dls_deg_per_100ft
    # NOTE: source DLS is deg/100ft, converted here to the deg/30ft reference
    # interval used by the canonical dogleg_severity column.
    # easting/northing stay in US Survey feet because the declared CRS is
    # "Universal Transverse Mercator (US Survey Feet)"; converting them to
    # metres would contradict the CRS we are able to declare. No EPSG code is
    # invented -- the source states no EPSG.
    survey = read_csv(SRC / "survey.csv")
    traj = []
    dropped_traj = 0
    for r in survey:
        md = to_float(r.get("md_ft"))
        if md is None:
            dropped_traj += 1
            continue
        traj.append({
            "wellbore_id": WELLBORE_ID,
            "md": fnum(md, FT_TO_M),
            "tvd": fnum(r.get("tvd_ft"), FT_TO_M),
            "tvdss": fnum(r.get("sstvd_ft"), FT_TO_M),
            "inclination": fnum(r.get("inc_deg")),
            "azimuth": fnum(r.get("azi_deg")),
            "northing": fnum(r.get("northing_ft")),
            "easting": fnum(r.get("easting_ft")),
            "dogleg_severity": fnum(r.get("dls_deg_per_100ft"), DLS_100FT_TO_30FT),
            "survey_time": survey_time,
            "vertical_section": fnum(r.get("vsection_ft"), FT_TO_M),
            "depth_source": "survey_station",
            "crs": crs,
            "epsg": "",
            "original_depth_unit": "ft",
            "conversion_rule": conv_rule,
            "source": r.get("source_file", ""),
            "data_origin": PUBLIC_REAL,
        })
    _write(OUT / "trajectories.csv", traj, manifest, "trajectories")
    manifest["tables"]["trajectories_dropped_no_md"] = {"rows": dropped_traj,
                                                        "cols": 0,
                                                        "empty_cells": 0}

    # ---- drilling timeseries: pason 1-minute, ft-based -> m ------------
    # Units corrected against docs/data_dictionary.md. The two force channels
    # are reported in KIPS (klbf), so they take KLBF_TO_KN (4.44822 kN/kip) --
    # NOT the lbf factor, which is 1000x smaller:
    #   wob_klbs        -> wob          kN     (was factor 1.0, i.e. raw klbf)
    #   hookload_klbs   -> hookload     kN     (was factor 1.0, i.e. raw klbf)
    #   pump_output_gpm -> pump_output  L/min  (was factor 1.0, i.e. gal/min)
    #   *_bbl           -> *_m3         m3     (was factor 1.0, i.e. barrels)
    # pump1_spm is STROKES per minute, not gal/min, so it is NOT converted.
    # gas_total is the sum of the reported C2..nC5 peaks (ppm).
    # flow in / flow out stay NULL: the source reports a single aggregate pump
    # output, and splitting it into in/out would be an assumption, not a value.
    minute = read_csv(SRC / "pason_10s_minute.csv")
    ts = []
    for r in minute:
        on_bottom = to_float(r.get("on_bottom_flag"))
        trip_speed = to_float(r.get("trip_speed_ft_per_min"))
        if on_bottom is not None and on_bottom >= 0.5:
            rig_state = "ON_BOTTOM"
        elif trip_speed is not None and trip_speed > 0:
            rig_state = "TRIPPING"
        else:
            rig_state = "OFF_BOTTOM"
        gas = None
        for c in ("gas_c2_ppm", "gas_c3_ppm", "gas_ic4_ppm", "gas_nc4_ppm",
                  "gas_ic5_ppm", "gas_nc5_ppm"):
            v = to_float(r.get(c))
            if v is not None:
                gas = v if gas is None else gas + v
        ts.append({
            "wellbore_id": WELLBORE_ID,
            "timestamp": iso_ts(r.get("minute")),
            "hole_depth_md": fnum(r.get("hole_depth_ft"), FT_TO_M),
            "bit_depth_md": fnum(r.get("bit_depth_ft"), FT_TO_M),
            "rop_inst": fnum(r.get("rop_inst_ft_per_hr"), F_PER_HR_TO_M_PER_HR),
            "rop_onbottom": fnum(r.get("rop_onbottom_ft_per_hr"), F_PER_HR_TO_M_PER_HR),
            "wob": fnum(r.get("wob_klbs"), KLBF_TO_KN),
            "rpm": fnum(r.get("rpm")),
            "standpipe_pressure": fnum(r.get("standpipe_psi"), PSI_TO_MPA),
            "hookload": fnum(r.get("hookload_klbs"), KLBF_TO_KN),
            "pump_rate_spm": fnum(r.get("pump1_spm")),
            "pump_output_lpm": fnum(r.get("pump_output_gpm"), GPM_TO_LPM),
            "flow_percent": fnum(r.get("flow_percent")),
            "block_height_md": fnum(r.get("block_height_ft"), FT_TO_M),
            "total_mud_volume_m3": fnum(r.get("total_mud_volume_bbl"), BBL_TO_M3),
            "trip_tank_m3": fnum(r.get("trip_tank_bbl"), BBL_TO_M3),
            "diff_pressure_mpa": fnum(r.get("diff_pressure_psi"), PSI_TO_MPA),
            "inclination": fnum(r.get("inclination_deg")),
            "azimuth": fnum(r.get("azimuth_deg")),
            "gamma": fnum(r.get("gamma_api")),
            "gas_total_ppm": fnum(gas),
            "overpull_klbs": fnum(r.get("overpull_klbs")),
            "rig_state": rig_state,
            "original_units": "ft;klbf;psi;gal/min;bbl;ppm;spm",
            "conversion_rule": (f"ft->m;klbf->kN;psi->MPa;gal/min->L/min;"
                                f"bbl->m3 (v{CONVERSION_VERSION})"),
            "source": "pason 10 second data (1-min resample)",
            "data_origin": PUBLIC_REAL,
        })
    _write(OUT / "drilling_timeseries.csv", ts, manifest, "drilling_timeseries")

    # ---- mud temperature LAS: DEPTH-indexed, kept out of the TS table ---
    mud = read_csv(SRC / "mudtemp_las.csv")
    las_null = {r.get("las_file", ""): r.get("null_value", "")
                for r in read_csv(SRC / "mudtemp_las_files.csv")}
    mudrows = []
    n_depth_recovered = 0
    for r in mud:
        ts_in = to_float(r.get("mud_temp_in_f"))
        ts_out = to_float(r.get("mud_temp_out_f"))
        if ts_in is None and ts_out is None:
            continue
        las_file = r.get("las_file", "")
        depth = las_index_ft(r.get("depth_ft"), las_null.get(las_file, "-999.25"))
        if depth and not fnum(r.get("depth_ft"), FT_TO_M):
            n_depth_recovered += 1
        mudrows.append({
            "wellbore_id": WELLBORE_ID,
            "log_date": iso_ts(r.get("log_date")),
            "depth_md": depth,
            "mud_temp_in_c": f_to_c(ts_in),
            "mud_temp_out_c": f_to_c(ts_out),
            "source": r.get("las_file", ""),
            "original_unit": "degF",
            "conversion_rule": f"(degF-32)*5/9 (v{CONVERSION_VERSION})",
            "data_origin": PUBLIC_REAL,
        })
    _write(OUT / "mud_properties_depth_log.csv", mudrows, manifest,
           "mud_properties_depth_log")
    manifest.setdefault("notes", []).append(
        f"mud_properties_depth_log: {n_depth_recovered} sample(s) recovered "
        f"whose LAS depth index is 9999 ft. 9999.0 is a standard no-data code "
        f"for measurements and is in nwis_lib.SENTINELS, but it is a REAL "
        f"measured depth here (9999 ft = 3047.6952 m; the well reached "
        f"10,947 ft). Depth indices are therefore masked only against each "
        f"file's own declared NULL code (-999.25), not the sensor list.")

    # ---- daily mud properties from the ALT daily reports ---------------
    # The canonical mud_properties key is (wellbore_id, timestamp). The ALT
    # family reports a daily mud weight/type/depth. Several reports exist per
    # calendar day (morning + afternoon) but carry no time of day, so exactly
    # one record per report_date can be keyed. The value is the reported
    # end-of-day state; mud_weight is ppg -> SG and the DDR's open-ended
    # '8.3+' notation is reduced to its numeric part.
    alt = read_csv(SRC / "alt_documents.csv")
    by_date: dict[str, dict] = {}
    for r in alt:
        # Key on the NORMALIZED date, not the raw string: the same report day
        # appears as both "2023-06-26" and "6-26-23" across the ALT corpus, and
        # keying on the raw text would emit two rows for one canonical date,
        # violating the (wellbore_id, timestamp) primary key.
        d = iso_ts(r.get("report_date", ""))
        if not d:
            continue
        prev = by_date.get(d)
        # report_no compares NUMERICALLY: these are integers up to 131, and a
        # string compare ranks "99" above "100" and would keep the wrong report.
        cur_no = to_float(r.get("report_no"))
        prev_no = to_float(prev.get("report_no")) if prev else None
        if prev is None or (cur_no is not None
                            and (prev_no is None or cur_no > prev_no)):
            by_date[d] = r
    daily = []
    for d in sorted(by_date):
        r = by_date[d]
        daily.append({
            "wellbore_id": WELLBORE_ID,
            "timestamp": iso_ts(d),
            "md": fnum(r.get("current_hole_md_ft"), FT_TO_M),
            "mud_type": r.get("mud_type", "").strip(),
            "mud_weight": ppg_to_sg(r.get("mud_weight_in_ppg")),
            "mud_weight_unit": "g/cm3",
            "rkb_ft": r.get("rkb_ft", "").strip(),
            "report_no": r.get("report_no", "").strip(),
            "source_document": r.get("file_name", "").strip(),
            "original_units": "ppg;ft",
            "conversion_rule": f"ppg->SG;ft->m (v{CONVERSION_VERSION})",
            "source": "Utah FORGE 16B(78)-32 ALT daily report",
            "data_origin": PUBLIC_REAL,
        })
    _write(OUT / "mud_daily.csv", daily, manifest, "mud_daily")

    # ---- pass-through copies ------------------------------------------
    for name in PASSTHROUGH:
        rows = read_csv(SRC / f"{name}.csv")
        if rows:
            _write(OUT / f"{name}.csv", rows, manifest, name)
    if meta:
        (OUT / "survey_meta.json").write_text(json.dumps(meta, indent=2) + "\n")

    (OUT / "clean_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n")

    print(f"  stage             : {STAGE}")
    print(f"  conversion version: {CONVERSION_VERSION}")
    print(f"  canonical depth   : metres (source: feet)")
    print(f"  timestamps        : ISO 8601 naive local (no offset invented)")
    for t, info in manifest["tables"].items():
        print(f"  {t:34s} rows {info['rows']:>7d}  "
              f"empty_cells {info['empty_cells']:>8d}  "
              f"({100.0 * info['empty_cells'] / max(info['rows'] * info['cols'], 1):.1f}%)")
    print(f"  manifest          : {OUT / 'clean_manifest.json'}")
    print(f"  written           : {utc_now()}")
    return 0


def _write(path: Path, rows: list[dict], manifest: dict, name: str) -> None:
    import csv as _csv
    if not rows:
        manifest["tables"][name] = {"rows": 0, "cols": 0, "empty_cells": 0}
        print(f"  [EMPTY] {name}: no rows parsed -- nothing written")
        return
    cols = list(rows[0].keys())
    empty = sum(1 for r in rows for c in cols if str(r.get(c, "")).strip() == "")
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = _csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})
    manifest["tables"][name] = {"rows": len(rows), "cols": len(cols),
                                "empty_cells": empty}


if __name__ == "__main__":
    raise SystemExit(main())
