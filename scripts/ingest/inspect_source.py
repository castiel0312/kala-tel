#!/usr/bin/env python3
"""
Hour 5 — Inspect, don't merge.

Profiles a single raw source directory (CSV/LAS/JSON tabular files) and
prints a standardized report:

    SOURCE: <name>
    Files: <n>
    Well: <...>
    Depth: <min - max>
    Time: <min - max>
    Columns: <...>
    Missing: <fraction per column>
    Potential events: <flagged keyword hits in text columns>
    Coordinate system: <unknown - fill in manually>
    Units: <unknown - fill in manually>

Only after reading this report do we write a canonical mapping (Hour 6).
Nothing here is written back to disk except the printed/markdown report.

Usage:
    python inspect_source.py --source VOLVE --path data/raw/volve
"""
import argparse
import glob
import os
import sys

try:
    import pandas as pd
except ImportError:
    print("This script requires pandas. Install with: pip install pandas --break-system-packages")
    sys.exit(1)

DEPTH_HINTS = ["md", "depth", "tvd", "hole_depth", "bit_depth"]
TIME_HINTS = ["time", "timestamp", "date"]
EVENT_KEYWORDS = [
    "kick", "stuck", "loss", "lost circulation", "influx", "blowout",
    "overpull", "pack-off", "packoff", "twist off", "washout",
    "npt", "cement", "instability",
]


def load_any(path):
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".csv":
            return pd.read_csv(path, low_memory=False)
        if ext in (".json",):
            return pd.read_json(path)
        if ext in (".xlsx", ".xls"):
            return pd.read_excel(path)
    except Exception as e:
        print(f"  [skip] could not read {path}: {e}")
    return None


def profile(source_name, path):
    files = sorted(
        glob.glob(os.path.join(path, "**", "*.*"), recursive=True)
    )
    files = [f for f in files if not f.endswith(".gitkeep")]

    print(f"\nSOURCE: {source_name}")
    print(f"Files:\n  {len(files)}")

    if not files:
        print("  (no files found — run Hour 4 download step first)")
        return

    frames = []
    for f in files:
        df = load_any(f)
        if df is not None:
            frames.append((f, df))

    if not frames:
        print("  (no tabular files could be parsed — inspect manually, "
              "e.g. LAS/XML/PDF need dedicated readers)")
        return

    for fname, df in frames:
        print(f"\n--- {os.path.basename(fname)} ---")
        print(f"Columns:\n  {list(df.columns)}")

        cols_lower = [str(c).lower() for c in df.columns]
        depth_cols = [c for c in df.columns if any(h in str(c).lower() for h in DEPTH_HINTS)]
        time_cols = [c for c in df.columns if any(h in str(c).lower() for h in TIME_HINTS)]

        if depth_cols:
            for c in depth_cols:
                try:
                    print(f"Depth ({c}):\n  {df[c].min()} - {df[c].max()}")
                except Exception:
                    pass
        else:
            print("Depth:\n  (no depth-like column detected)")

        if time_cols:
            for c in time_cols:
                print(f"Time ({c}):\n  {df[c].min()} - {df[c].max()}")
        else:
            print("Time:\n  (no time-like column detected)")

        missing = df.isna().mean().round(3)
        print(f"Missing (fraction per column):\n{missing.to_string()}")

        text_cols = df.select_dtypes(include="object").columns
        hits = {}
        for c in text_cols:
            joined = " ".join(df[c].dropna().astype(str).str.lower().tolist())
            found = [kw for kw in EVENT_KEYWORDS if kw in joined]
            if found:
                hits[c] = found
        print(f"Potential events (keyword scan, NOT a label):\n  {hits if hits else 'none detected'}")

    print("\nCoordinate system:\n  (fill in manually from source metadata)")
    print("Units:\n  (fill in manually from source metadata / header)")
    print("\nReminder: this is a profiling pass only. Do NOT write to "
          "data/processed until the canonical mapping (Hour 6) is defined.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="Source name, e.g. VOLVE, FORGE16B, FORCE2020")
    ap.add_argument("--path", required=True, help="Path to the raw source directory")
    args = ap.parse_args()
    profile(args.source, args.path)
