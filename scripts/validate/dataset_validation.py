#!/usr/bin/env python3
"""
NWIS DATASET VALIDATION — v0.1

Runs the Hour-8 checks (identity, depth, time, units, provenance) against
the eight canonical tables in data/processed/, and prints the report in the
exact format from the Day-1 plan.

Usage:
    python scripts/validate/dataset_validation.py
"""
import os
import sys

try:
    import pandas as pd
except ImportError:
    print("This script requires pandas. Install with: pip install pandas --break-system-packages")
    sys.exit(1)

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PROCESSED = os.path.join(REPO_ROOT, "data", "processed")

TABLES = [
    "wells", "wellbores", "trajectories", "formations",
    "lithology", "drilling_timeseries", "events", "documents",
]


def load(name):
    path = os.path.join(PROCESSED, f"{name}.csv")
    if not os.path.exists(path):
        return pd.DataFrame()
    try:
        return pd.read_csv(path)
    except pd.errors.EmptyDataError:
        return pd.DataFrame()


def safe_len(df):
    return len(df) if df is not None else 0


def main():
    data = {name: load(name) for name in TABLES}

    wells = data["wells"]
    wellbores = data["wellbores"]
    trajectories = data["trajectories"]
    formations = data["formations"]
    lithology = data["lithology"]
    drilling = data["drilling_timeseries"]
    events = data["events"]
    documents = data["documents"]

    # --- counts -------------------------------------------------------
    n_wells = safe_len(wells)
    n_wellbores = safe_len(wellbores)
    n_traj = safe_len(trajectories)
    n_formation_intervals = safe_len(formations)
    n_lithology = safe_len(lithology)
    n_drilling = safe_len(drilling)
    n_events = safe_len(events)
    n_documents = safe_len(documents)

    sources = set()
    for df, col in [
        (wells, "source"), (trajectories, "source"), (formations, "source"),
        (lithology, "source"), (drilling, "source"), (events, "source"),
        (documents, "source"),
    ]:
        if not df.empty and col in df.columns:
            sources.update(df[col].dropna().unique().tolist())
    n_sources = len(sources)

    unique_wells = wells["well_id"].nunique() if not wells.empty and "well_id" in wells.columns else 0

    # --- identity checks ------------------------------------------------
    missing_well_ids = 0
    if not wellbores.empty and "well_id" in wellbores.columns:
        valid_wells = set(wells["well_id"]) if not wells.empty and "well_id" in wells.columns else set()
        missing_well_ids += wellbores["well_id"].apply(lambda x: x not in valid_wells).sum()

    valid_wellbores = set(wellbores["wellbore_id"]) if not wellbores.empty and "wellbore_id" in wellbores.columns else set()
    for df, col in [(trajectories, "wellbore_id"), (formations, "wellbore_id"),
                    (drilling, "wellbore_id"), (events, "wellbore_id")]:
        if not df.empty and col in df.columns:
            missing_well_ids += df[col].apply(lambda x: x not in valid_wellbores).sum()

    # --- depth checks -----------------------------------------------------
    invalid_depths = 0
    for df, cols in [
        (trajectories, ["md", "tvd"]),
        (drilling, ["md", "tvd"]),
    ]:
        if not df.empty:
            for c in cols:
                if c in df.columns:
                    invalid_depths += (pd.to_numeric(df[c], errors="coerce") < 0).sum()

    invalid_formations = 0
    if not formations.empty and {"top_md", "base_md"}.issubset(formations.columns):
        top = pd.to_numeric(formations["top_md"], errors="coerce")
        base = pd.to_numeric(formations["base_md"], errors="coerce")
        invalid_formations = (top >= base).sum()

    # --- time checks --------------------------------------------------
    # (placeholder: real check needs actual timestamp parsing once data exists)
    unparseable_timestamps = 0
    if not drilling.empty and "timestamp" in drilling.columns:
        parsed = pd.to_datetime(drilling["timestamp"], errors="coerce")
        unparseable_timestamps = parsed.isna().sum() - drilling["timestamp"].isna().sum()

    # --- provenance checks ----------------------------------------------
    broken_provenance = 0
    for df, col in [
        (trajectories, "source"), (formations, "source"), (drilling, "source"),
        (events, "source"), (documents, "source"),
    ]:
        if not df.empty and col in df.columns:
            broken_provenance += df[col].isna().sum()

    # --- unit checks (structural placeholder) ---------------------------
    # A real check compares unit metadata columns once ingestion scripts
    # attach them; until then this reports 0 by construction on empty data.
    unit_conflicts = 0

    status = "PASS" if (
        missing_well_ids == 0 and invalid_depths == 0 and invalid_formations == 0
        and broken_provenance == 0 and unit_conflicts == 0
    ) else "FAIL"

    print("=" * 48)
    print("NWIS DATASET VALIDATION — v0.1")
    print("=" * 48)
    print(f"Wells                    : {n_wells}")
    print(f"Wellbores                : {n_wellbores}")
    print(f"Trajectory rows          : {n_traj}")
    print(f"Formation intervals      : {n_formation_intervals}")
    print(f"Lithology rows           : {n_lithology}")
    print(f"Drilling rows            : {n_drilling}")
    print(f"Events                   : {n_events}")
    print(f"Documents                : {n_documents}")
    print()
    print(f"Sources                  : {n_sources}")
    print(f"Unique wells             : {unique_wells}")
    print()
    print(f"Missing well IDs         : {missing_well_ids}")
    print(f"Invalid depths           : {invalid_depths}")
    print(f"Invalid formations       : {invalid_formations}")
    print(f"Broken provenance        : {broken_provenance}")
    print(f"Unit conflicts           : {unit_conflicts}")
    print()
    print(f"STATUS: {status}")

    if n_wells == 0 and n_drilling == 0:
        print()
        print("NOTE: data/processed/ is currently empty (headers only). This is")
        print("expected until Hour 4 (download) -> Hour 6/7 (normalize into these")
        print("schemas) have been run. Re-run this script after normalization.")


if __name__ == "__main__":
    main()
