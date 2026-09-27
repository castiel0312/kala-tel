#!/usr/bin/env python3
"""Initialize data/processed/ from the canonical schema in nwis_lib.TABLES.

The schema lives in code, not in hand-maintained CSV headers, so the validator
and the writers can never drift apart. Idempotent: existing rows are preserved
unless --force is given.

Usage:
    python scripts/normalize/00_schema.py            # create missing, keep data
    python scripts/normalize/00_schema.py --force    # rewrite headers only
    python scripts/normalize/00_schema.py --print    # show schema, write nothing
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import PROCESSED, TABLES, read_csv, write_csv  # noqa: E402

ORIGINAL_EIGHT = ["wells", "wellbores", "trajectories", "formations",
                  "lithology", "drilling_timeseries", "events", "documents"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true",
                    help="rewrite headers even if rows exist (destroys data)")
    ap.add_argument("--print", dest="show", action="store_true",
                    help="print the schema and exit")
    args = ap.parse_args()

    if args.show:
        for name, t in TABLES.items():
            tag = "original" if name in ORIGINAL_EIGHT else "added(Phase 1)"
            print(f"\n{name}  [{tag}]  {t.description}")
            print(f"  PK: {t.primary_key or '-'}")
            print(f"  FK: {t.foreign_keys or '-'}")
            print(f"  cols ({len(t.columns)}): {', '.join(t.columns)}")
        print(f"\nTOTAL: {sum(len(t.columns) for t in TABLES.values())} columns "
              f"across {len(TABLES)} tables")
        return 0

    if args.force:
        for name in TABLES:
            write_csv(PROCESSED / f"{name}.csv", [], TABLES[name].columns)

    created = kept = 0
    for name, t in TABLES.items():
        p = PROCESSED / f"{name}.csv"
        rows = read_csv(p) if p.exists() else []
        if rows and not args.force:
            missing = [c for c in t.columns if c not in rows[0]]
            if missing:
                print(f"  [MIGRATE] {name}: adding {len(missing)} column(s): "
                      f"{', '.join(missing)}")
                for r in rows:
                    for c in missing:
                        r.setdefault(c, "")
            # Rewrite so new columns are persisted.
            write_csv(p, rows, t.columns)
            kept += len(rows)
            continue
        write_csv(p, rows, t.columns)
        created += 1
        print(f"  [CREATE] {p.relative_to(REPO_ROOT)} "
              f"({len(t.columns)} cols)")

    print(f"\n{created} table(s) created, {kept} existing row(s) preserved.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
