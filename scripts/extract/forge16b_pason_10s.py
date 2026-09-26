#!/usr/bin/env python3
"""Stream FORGE 16B(78)-32 "10 Second Data.csv" (Pason) into curated tables.

The member is 1.82 GB / 746,905 rows x 412 columns and lives inside
16B_Pason.zip. It is NEVER extracted to disk and never loaded into memory: this
script streams it from the ZIP and emits only a curated column subset.

Column selection is by NAME, not by index, so a re-ordered export still works.

Sentinel: -999.25 means "no reading" (same sentinel as the CWLS LAS NULL). It
is written as an empty field, never as a number and never as 0.0.

Outputs (data/interim/forge16b_78_32/):
    pason_10s_minute.csv  60-second resample of the drilling mechanics channels
    pason_10s_runs.csv     on-bottom run segmentation (depth/time/ROP per run)
    pason_10s_channels.csv the channel dictionary actually used, with units

Run definition: an on-bottom run is a maximal interval during which hole depth
is increasing. A run is closed when EITHER
  (a) no depth increase occurs for more than --gap-seconds (a connection or
      trip), OR
  (b) the instantaneous ROP stays below --min-rop for --stall-samples
      consecutive samples.
Rule (b) is required because this well contains long REAMING and WASHING
intervals in which depth creeps upward continuously with no gap; without it a
single "run" swallowed 65 hours of hole and reported an impossible 227 ft/hr.
Rows are therefore classified:
  DRILLING  avg ROP >= --min-rop  (genuine hole-making)
  SLOW      avg ROP <  --min-rop  (reaming / washing / conditioning, not a
                                    drilling run -- do not train on these)
Only DRILLING episodes should be treated as drilling runs.

Usage:
    python scripts/extract/forge16b_pason_10s.py [--limit-rows N]
        [--gap-seconds N] [--min-rop F] [--stall-samples N]
"""
from __future__ import annotations

import argparse
import csv
import io
import re
import sys
import zipfile
from collections import OrderedDict
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import INTERIM, RAW, to_float, utc_now, write_csv  # noqa: E402

ARCHIVE = RAW / "utah_forge" / "16B_Pason.zip"
MEMBER = "10 Second Data.csv"
OUT_DIR = INTERIM / "forge16b_78_32"
NULL_SENTINEL = -999.25

# Curated channels: source name -> (output slug, aggregation).
# "mean" channels are averaged over the minute; "last" keeps the final sample
# in the minute (correct for cumulative counters and state flags).
CHANNELS: "OrderedDict[str, tuple[str, str]]" = OrderedDict([
    ("Hole Depth (feet)", ("hole_depth_ft", "last")),
    ("Bit Depth (feet)", ("bit_depth_ft", "last")),
    ("Rate Of Penetration (ft_per_hr)", ("rop_inst_ft_per_hr", "mean")),
    ("On Bottom ROP (ft_per_hr)", ("rop_onbottom_ft_per_hr", "mean")),
    ("Hook Load (klbs)", ("hookload_klbs", "mean")),
    ("Standpipe Pressure (psi)", ("standpipe_psi", "mean")),
    ("Pump 1 strokes/min (SPM)", ("pump1_spm", "mean")),
    ("Pump 2 strokes/min (SPM)", ("pump2_spm", "mean")),
    ("Total Pump Output (gal_per_min)", ("pump_output_gpm", "mean")),
    ("Rotary RPM (RPM)", ("rpm", "mean")),
    ("Weight on Bit (klbs)", ("wob_klbs", "mean")),
    ("Block Height (feet)", ("block_height_ft", "mean")),
    ("Total Mud Volume (barrels)", ("total_mud_volume_bbl", "last")),
    ("Trip Tank Mud Volume (barrels)", ("trip_tank_bbl", "last")),
    ("PVT Total Mud Gain/Loss (barrels)", ("pvt_mud_gain_loss_bbl", "last")),
    ("Differential Pressure (psi)", ("diff_pressure_psi", "mean")),
    ("Flow (flow_percent)", ("flow_percent", "mean")),
    ("Inclination (degrees)", ("inclination_deg", "last")),
    ("Azimuth (degrees)", ("azimuth_deg", "last")),
    ("Gamma (api)", ("gamma_api", "mean")),
    ("chr Ethane C2 (ppm_gas)", ("gas_c2_ppm", "mean")),
    ("chr Propane C3 (ppm_gas)", ("gas_c3_ppm", "mean")),
    ("chr Iso-Butane IC4 (ppm_gas)", ("gas_ic4_ppm", "mean")),
    ("chr Nor-Butane NC4 (ppm_gas)", ("gas_nc4_ppm", "mean")),
    ("chr Iso-Pentane IC5 (ppm_gas)", ("gas_ic5_ppm", "mean")),
    ("chr Nor-Pentane NC5 (ppm_gas)", ("gas_nc5_ppm", "mean")),
    ("Pason Gas (percent)", ("pason_gas_percent", "mean")),
    ("Over Pull (klbs)", ("overpull_klbs", "mean")),
    ("Tool Face (degrees)", ("toolface_deg", "mean")),
    ("On Bottom (unitless)", ("on_bottom_flag", "last")),
    ("Trip Speed (ft_per_min)", ("trip_speed_ft_per_min", "mean")),
])


def parse_ts(date_s: str, time_s: str):
    for fmt in ("%Y/%m/%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(f"{date_s.strip()} {time_s.strip()}", fmt)
        except ValueError:
            continue
    return None


def num(s: str):
    v = to_float(s)
    if v is None:
        return None
    if abs(v - NULL_SENTINEL) < 0.005:
        return None
    return v


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit-rows", type=int, default=0)
    ap.add_argument("--gap-seconds", type=int, default=600)
    ap.add_argument("--min-rop", type=float, default=5.0,
                    help="avg ROP at/above which an episode counts as DRILLING")
    ap.add_argument("--stall-samples", type=int, default=18,
                    help="consecutive samples below --min-rop that close a run")
    ap.add_argument("--max-ft-per-sample", type=float, default=5.0,
                    help="depth jump in one 10-s sample treated as a recording "
                         "discontinuity rather than hole made")
    args = ap.parse_args()

    if not ARCHIVE.exists():
        print(f"NOT FOUND: {ARCHIVE}")
        print("Run: make fetch")
        return 1

    minute_rows: list[dict] = []
    runs: list[dict] = []
    n_rows = 0
    n_bad_ts = 0
    n_null_cells = 0
    depth_min = depth_max = None
    ts_first = ts_last = None

    # minute accumulator
    cur_min: datetime | None = None
    acc: dict[str, list[float]] = {}
    acc_last: dict[str, float] = {}

    # run accumulator
    run: dict | None = None
    last_depth = None
    last_depth_ts = None
    prev_ts = None
    stall = 0
    discontinuities = 0
    ropcol: int | None = None

    def flush_minute():
        nonlocal cur_min
        if cur_min is None:
            return
        row = {"minute": cur_min.strftime("%Y-%m-%d %H:%M:%S")}
        for slug, _ in CHANNELS.values():
            vals = acc.get(slug)
            if not vals:
                row[slug] = ""
            else:
                row[slug] = f"{sum(vals) / len(vals):.4f}"
        for slug, v in acc_last.items():
            row[slug] = f"{v:.4f}"
        minute_rows.append(row)

    def close_run(end_ts, end_depth):
        nonlocal run
        if run is None:
            return
        dur = (end_ts - run["start_ts"]).total_seconds()
        made = end_depth - run["start_md_ft"]
        if dur <= 0 or made <= 0:
            run = None
            return
        avg_rop = made / (dur / 3600.0) if dur else 0.0
        run["end_ts"] = end_ts
        run["end_md_ft"] = round(end_depth, 4)
        run["duration_min"] = round(dur / 60.0, 3)
        run["footage_ft"] = round(made, 4)
        run["rop_ft_per_hr"] = round(avg_rop, 4)
        run["classification"] = ("DRILLING" if avg_rop >= args.min_rop
                                 else "SLOW")
        # A plausible drilling run advances at least 2 min and stays under a
        # generous 200 ft/hr ceiling for this well.
        run["physical_plausible"] = ("yes" if (dur >= 120.0
                                               and avg_rop <= 200.0) else "no")
        runs.append({k: (v.strftime("%Y-%m-%d %H:%M:%S")
                         if isinstance(v, datetime) else v)
                     for k, v in run.items()})
        run = None

    with zipfile.ZipFile(ARCHIVE) as z:
        if MEMBER not in z.namelist():
            names = [n for n in z.namelist() if n.lower().endswith(".csv")]
            print(f"MEMBER NOT FOUND: {MEMBER}")
            print(f"csv members: {names[:10]}")
            return 1

        with z.open(MEMBER) as raw:
            txt = io.TextIOWrapper(raw, encoding="utf-8", errors="replace",
                                   newline="")
            rd = csv.reader(txt)
            header = next(rd)
            idx = {}
            for src, (slug, _) in CHANNELS.items():
                if src in header:
                    idx[src] = header.index(src)
                else:
                    print(f"  [WARN] channel absent from source: {src}")
            ropcol = idx.get("Rate Of Penetration (ft_per_hr)")
            dcol = idx.get("Hole Depth (feet)")
            if dcol is None:
                print("  [FATAL] no Hole Depth column; cannot segment runs")
                return 1

            for row in rd:
                if args.limit_rows and n_rows >= args.limit_rows:
                    break
                n_rows += 1
                ts = parse_ts(row[0], row[1])
                if ts is None:
                    n_bad_ts += 1
                    continue
                if ts_first is None:
                    ts_first = ts
                ts_last = ts

                # --- 60-second accumulator ---
                minute = ts.replace(second=0, microsecond=0)
                if cur_min is None:
                    cur_min = minute
                elif minute != cur_min:
                    flush_minute()
                    acc, acc_last = {}, {}
                    cur_min = minute
                for src, (slug, how) in CHANNELS.items():
                    i = idx.get(src)
                    if i is None or i >= len(row):
                        continue
                    v = num(row[i])
                    if v is None:
                        n_null_cells += 1
                        continue
                    if how == "mean":
                        acc.setdefault(slug, []).append(v)
                    else:
                        acc_last[slug] = v

                # --- run segmentation on increasing hole depth ---
                depth = num(row[dcol])
                rop = num(row[ropcol]) if ropcol is not None else None
                if depth is not None:
                    depth_min = depth if depth_min is None else min(depth_min, depth)
                    depth_max = depth if depth_max is None else max(depth_max, depth)
                    # Rule (b): sustained sub-threshold ROP closes the run.
                    if rop is not None and rop < args.min_rop:
                        stall += 1
                    else:
                        stall = 0
                    if run is not None and stall >= args.stall_samples:
                        close_run(last_depth_ts or ts, run["peak_md_ft"])
                    if last_depth is not None and depth > last_depth + 1e-6:
                        jump = depth - last_depth
                        # A single 10-second sample cannot drill more than a
                        # few feet. A larger jump is a recording discontinuity
                        # (Pason re-baselining hole depth after a trip or a rig
                        # state change), not hole made. Re-baseline without
                        # counting footage, otherwise runs double-count depth
                        # and report impossible ROPs of thousands of ft/hr.
                        if jump > args.max_ft_per_sample:
                            discontinuities += 1
                            last_depth = depth
                            last_depth_ts = ts
                        else:
                            gap = (ts - last_depth_ts).total_seconds() if last_depth_ts else 0
                            if run is None or gap > args.gap_seconds:
                                close_run(last_depth_ts or ts, last_depth)
                                run = {"run_id": len(runs) + 1,
                                       "start_ts": ts,
                                       "start_md_ft": depth,
                                       "peak_md_ft": depth,
                                       "n_onbottom": 1}
                            else:
                                run["n_onbottom"] += 1
                                run["peak_md_ft"] = max(run["peak_md_ft"], depth)
                            last_depth_ts = ts
                    last_depth = depth
                prev_ts = ts

    flush_minute()
    if run is not None:
        close_run(last_depth_ts or ts_last, run.get("peak_md_ft") or last_depth)

    # Channel dictionary
    chan_rows = [{"source_column": src, "output_column": slug,
                  "aggregation": how,
                  "unit": (src[src.rfind("(") + 1:-1] if "(" in src else "")}
                 for src, (slug, how) in CHANNELS.items()]
    write_csv(OUT_DIR / "pason_10s_channels.csv", chan_rows,
              ["source_column", "output_column", "aggregation", "unit"])

    minute_cols = ["minute"] + [slug for slug, _ in CHANNELS.values()]
    write_csv(OUT_DIR / "pason_10s_minute.csv", minute_rows, minute_cols)

    run_cols = ["run_id", "start_ts", "end_ts", "start_md_ft", "end_md_ft",
                "footage_ft", "duration_min", "rop_ft_per_hr",
                "classification", "physical_plausible", "n_onbottom"]
    write_csv(OUT_DIR / "pason_10s_runs.csv", runs, run_cols)

    print(f"  member             : {MEMBER}  (streamed from ZIP, not extracted)")
    print(f"  source columns     : {len(header)} -> curated {len(CHANNELS)}")
    print(f"  source rows read   : {n_rows}")
    print(f"  unparsable stamps  : {n_bad_ts}")
    print(f"  null (-999.25) cells: {n_null_cells}")
    print(f"  time span          : {ts_first} .. {ts_last}")
    if depth_min is not None:
        print(f"  hole depth range   : {depth_min:.2f} - {depth_max:.2f} ft")
    print(f"  minute rows        : {len(minute_rows)}")
    print(f"  depth discontinuities re-baselined (> "
          f"{args.max_ft_per_sample} ft/sample): {discontinuities}")
    print(f"  on-bottom runs     : {len(runs)}  (gap > {args.gap_seconds}s splits)")
    if runs:
        cls = {}
        for r_ in runs:
            cls[r_["classification"]] = cls.get(r_["classification"], 0) + 1
        plaus = sum(1 for r_ in runs if r_["physical_plausible"] == "yes")
        print(f"  classification     : {cls}")
        print(f"  physically plausible runs: {plaus}/{len(runs)}")
        pl = [r_ for r_ in runs if r_["physical_plausible"] == "yes"]
        if pl:
            print(f"  plausible footage total  : "
                  f"{sum(r_['footage_ft'] for r_ in pl):.0f} ft")
    if runs:
        lens = [r["footage_ft"] for r in runs]
        print(f"  run footage ft     : min {min(lens):.1f} / "
              f"median {sorted(lens)[len(lens) // 2]:.1f} / max {max(lens):.1f}")
    print(f"  written            : {utc_now()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
