#!/usr/bin/env python3
"""Generate data/event_types.csv from the controlled rules in nwis_lib.EVENT_RULES.

The ontology is defined in code (single source of truth) and exported to CSV so
non-Python consumers (DBAs, frontend, OIL reviewers) can read the vocabulary and
its false-positive guards.

Usage:
    python scripts/normalize/00_event_types.py            # write the CSV
    python scripts/normalize/00_event_types.py --check    # verify code/CSV agree
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import DATA, EVENT_RULES, read_csv, write_csv  # noqa: E402

COLUMNS = ["canonical_type", "source_term", "mapping_rule", "exclusion_rule",
           "base_confidence", "kind", "notes"]

# Human-readable source terms per canonical type, for reviewer reference.
SOURCE_TERMS = {
    "STUCK_PIPE": "stuck; tight hole; pulled tight; working tight; overpull with pumps",
    "PACK_OFF": "pack-off; packoff (HIGH false-positive rate: usually a casing "
                "wellhead pack-off, not a stuck-pipe pack-off)",
    "WASHOUT": "washout; hole washout; calculated N% hole washout",
    "KICK": "kick; gas influx; influx; blowout (EXCLUDE 'kick off drilling' = "
            "resume drilling)",
    "MUD_LOSS": "lost circulation; mud loss; losing mud; lost returns; no returns "
                "(EXCLUDE 'no losses')",
    "WELLBORE_INSTABILITY": "hole collapse; washout; cavings; keyseating; wall slough",
    "CEMENT_FAILURE": "no cement; cement failed; cement missing (EXCLUDE 'cement to "
                      "surface', usually a result not a failure)",
    "EQUIPMENT_FAILURE": "troubleshoot; equipment problem; bad encoder; waited on; "
                         "blower motor; tool would not; no signal; quit working",
    "NPT": "NPT; non-productive time",
}

# Which ontology class each type is. Only DRILLING_HAZARD types are candidates
# for hazard modelling; the rest are operational context.
KIND = {
    "KICK": "DRILLING_HAZARD",
    "MUD_LOSS": "DRILLING_HAZARD",
    "STUCK_PIPE": "DRILLING_HAZARD",
    "PACK_OFF": "DRILLING_HAZARD",
    "WASHOUT": "DRILLING_HAZARD",
    "WELLBORE_INSTABILITY": "DRILLING_HAZARD",
    "CEMENT_FAILURE": "DRILLING_HAZARD",
    "EQUIPMENT_FAILURE": "OPERATIONAL",
    "NPT": "OPERATIONAL",
}

# Vocabulary terms reserved for OIL/Assam that are NOT yet populated. They are
# declared so the schema is ready, but they have no mapping rule until OIL DDRs
# exist. Declaring a term is not evidence that it occurs.
RESERVED_FOR_OIL = ["WELL_CONTROL", "TWIST_OFF", "BLOWOUT", "CAVINGS",
                    "TIGHT_HOLE", "DIFFERENTIAL_STICKING", "LOST_RETURNS"]


def build() -> list[dict]:
    rows = []
    for rule in EVENT_RULES:
        rows.append({
            "canonical_type": rule.canonical,
            "source_term": SOURCE_TERMS.get(rule.canonical, ""),
            "mapping_rule": rule.pattern,
            "exclusion_rule": rule.exclude,
            "base_confidence": rule.confidence,
            "kind": KIND.get(rule.canonical, "OPERATIONAL"),
            "notes": rule.note,
        })
    for term in RESERVED_FOR_OIL:
        rows.append({
            "canonical_type": term,
            "source_term": "",
            "mapping_rule": "",
            "exclusion_rule": "",
            "base_confidence": "unmapped",
            "kind": "RESERVED_FOR_OIL",
            "notes": "Declared in the ontology but NOT yet mapped to any source. "
                     "No public source in this repository reports this term. "
                     "Populate only from OIL DDRs.",
        })
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    rows = build()
    path = DATA / "event_types.csv"

    if args.check:
        existing = read_csv(path)
        code_terms = {r.canonical for r in EVENT_RULES}
        csv_terms = {r["canonical_type"] for r in existing}
        if code_terms - csv_terms:
            print(f"  [FAIL] rules in code missing from CSV: {code_terms - csv_terms}")
            return 1
        if csv_terms - code_terms - set(RESERVED_FOR_OIL):
            print(f"  [FAIL] CSV terms not in code: {csv_terms - code_terms}")
            return 1
        for r in existing:
            if r["canonical_type"] in code_terms:
                rule = next(x for x in EVENT_RULES
                            if x.canonical == r["canonical_type"])
                if r["mapping_rule"] != rule.pattern:
                    print(f"  [FAIL] mapping_rule drift for {r['canonical_type']}")
                    return 1
        print(f"  [OK] event_types.csv agrees with nwis_lib.EVENT_RULES "
              f"({len(code_terms)} active + {len(RESERVED_FOR_OIL)} reserved)")
        return 0

    n = write_csv(path, rows, COLUMNS)
    print(f"  [WRITE] data/event_types.csv ({n} terms: "
          f"{len(EVENT_RULES)} mapped, {len(RESERVED_FOR_OIL)} reserved for OIL)")
    for r in rows:
        tag = "" if r["mapping_rule"] else "   <- declared, unmapped"
        print(f"    {r['canonical_type']:26s} {r['kind']:20s} "
              f"conf={r['base_confidence']}{tag}")
        if r["exclusion_rule"]:
            print(f"      guard: {r['exclusion_rule'][:88]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
