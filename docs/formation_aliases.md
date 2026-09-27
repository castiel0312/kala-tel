# Formation Vocabulary Governance

**Status: ACTIVE. This document is the control referenced by
`docs/data_dictionary.md` and enforced by `scripts/normalize/05_formation.py`.**

## The one rule that matters

> **Cross-basin formation equivalence is never inferred from similar names,
> similar depths, or similar lithologies. It must be stated in a published
> source, or it does not exist in NWIS.**

A granite wash interval at 4,330 ft MD in Utah and a Tipam Sandstone at
2,400 m MD in Assam are not the same unit, are not comparable, and must never
be joined on the basis of a shared word or a similar number. Assigning them a
common `canonical_formation` would silently manufacture a correlation that no
geologist has made.

## Vocabulary isolation model

Each basin/source family owns a **sealed vocabulary**. `vocabulary_id` in
`data/processed/formations.csv` records which vocabulary a formation name
belongs to. Records from different vocabularies are **never** matched.

| vocabulary_id   | Basin / area            | Status                          | Terms |
|-----------------|-------------------------|---------------------------------|-------|
| `FORGE_UTAH_16B`| Milford (Church Rocks), Utah | ACTIVE — populated from source | granodiorite, granite wash, rhyolite, clay (uncertain) |
| `VOLVE_NORWAY`  | Norwegian North Sea     | RESERVED — pending Volve ingest | — |
| `FORCE2020_NO`  | Norwegian North Sea     | RESERVED — pending FORCE ingest | — |
| `OIL_ASSAM`     | Assam Shelf / Assam-Arakan | RESERVED — **OIL/DGH only**   | Tipam, Barail, Girujan, ... |

Two vocabularies being both "Norwegian" (`VOLVE_NORWAY`, `FORCE2020_NO`) does
**not** make them mergeable. They come from different datasets with different
naming authorities. Merging them requires an explicit, sourced decision.

## Verified vocabulary: FORGE_UTAH_16B

Every term below was read out of the source documents, not assumed. Evidence is
given so a reviewer can check it.

| canonical_formation | Source wording (verbatim)                | Lithology | Confidence | Evidence |
|----------------------|------------------------------------------|-----------|------------|----------|
| `granodiorite`       | `GRANODIORITE: FELSC, ABNDT QTZ, FRSTD, TRANSL IP` | granodiorite | high | DDR "LITHOLOGY FROM / TO DEPTH Description" blocks, e.g. `DailyReportDetailRpt # 36 23051806...` |
| `granodiorite`       | `TO RHOLITE` (transition)                | granodiorite -> rhyolite | high | DDR lithology string, same blocks |
| `rhyolite`           | `RHOLITE` within granodiorite description | rhyolite | medium | appears only as a target in `...TO RHOLITE` |
| `granite_wash`       | `Formation changed to granite wash around 4,330'` | drilling jargon for granodiorite cuttings / reamed interval | high | `20230501-DailyReport15DetailRpt_230501064742.pdf` |
| `clay`               | `Formation changing from (clay ?) to granodiorite` | clay | **low** | the source itself writes `(clay ?)` — uncertain, needs domain validation |
| `unknown_undifferentiated` | (no formation reported)            | — | n/a | fallback bucket for intervals with no reported formation |

### Notes on the Utah vocabulary

- `granite wash` is **drilling jargon, not a formal lithostratigraphic unit.** It
  describes the character of cuttings and a reamed/undamaged interval. It is
  retained verbatim as a source term and mapped to the `granite_wash` canonical
  term with a note, **not** silently merged into `granodiorite`.
- `clay` is recorded at **low confidence** because the source hedges it. It is
  deliberately *not* promoted to high confidence, and the uncertainty is carried
  in `confidence` rather than hidden.
- The FORGE wells are **geothermal** wells in crystalline basement
  (granodiorite). They are not stratigraphic sedimentary wells. A "formation top"
  in this well is a **lithological change**, not a stratigraphic boundary. The
  `formations.csv` table stores it, but `formation_group` is set to
  `CRYSTALLINE_BASEMENT_LITHOLOGY` to prevent anyone later treating it as a
  sedimentary marker for depth correlation against OIL's Assam section.
- No OIL formation name appears anywhere in this repository. `OIL_ASSAM` is
  reserved and empty.

## How `formations.csv` is populated

Only from explicit source statements. The extractor (`05_formation.py`) writes a
formation row when, and only when, the source text states a formation or
lithology **with a depth**. It does not infer a formation from a depth alone, and
it never writes a formation for the interval above the first reported pick.

If a formation cannot be resolved:

- `formation_name` = `unknown_undifferentiated`, **or** the row is omitted
- `confidence` = `low`
- the reason is recorded in the `notes`/provenance field

An explicit `unknown_undifferentiated` is strictly better than a plausible
fabrication.

## Matching rule for extraction

Free-text formation mentions are matched **only** against the alias table in
`data/formation_aliases.csv`, restricted to rows whose `vocabulary_id` equals
the vocabulary of the well being processed. There is no edit-distance fallback
across vocabulary boundaries, and there is no global "best match" search.

Adding a cross-basin mapping row to `data/formation_aliases.csv` requires a
`source` field naming a published correlation, and is expected to be rare and
contested. It is a geological decision, not a data-cleaning one.
