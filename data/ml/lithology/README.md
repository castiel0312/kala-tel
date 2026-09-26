# `lithology`

**Status: `PROTOTYPE_POSSIBLE` — 65 labelled depths, and it is the only model
in the set with a real label count. Blocked on taxonomy, not on labels.**

## Objective

Classify lithology at depth from drilling response and mud temperature.

## Why this one is different

Every other model in the set is blocked by label scarcity or missing signal.
`lithology` has genuine labels: 65 depths in `lithology` with a cuttings
description, in a fully drilled wellbore with 124,497 mechanical samples. That
is enough to build and test a feature pipeline end to end.

It is still **not** reportable, for three reasons that must be respected.

## Blocker 1 — the labels are free text, not a taxonomy

65 rows contain **57 distinct strings**, and they are near-duplicates of one
another:

```
HRNBLNDE: 30% CLAY: LHT TAN, NON-SWELLING CLAY, PRESENTS AS KAOLIN
MD HRNBLNDE, TR BIOTIE, TR CHLOR.
MD HRNBLND, TR BIOTIE, TR CHLOR.
HRNBLDE, TR BIOTIE, TR CALCITE, TR CHLORITE
```

These describe the same rock. A classifier over 57 free-text strings will learn
to reproduce the free text. Before this is either a label set or a feature:

1. Build a controlled taxonomy. Observed vocabulary is dominated by
   hornblende, biotite, chlorite, epidote, calcite, quartz/feldspar ("TR"),
   with clay, magnetite and metallic shards as accessories.
2. Record the mapping from each raw string to each class, in a file, with the
   reviewer's name and a version — the same discipline as
   `conversion_version`.
3. Keep the raw string in the dataset. Never overwrite it.

That taxonomy is a **geology** task, not an ML one, and it needs a domain
reviewer. Do not invent it unilaterally.

## Blocker 2 — one well

65 points from one wellbore. Any split is within-well, so the
well-grouped policy in `ml/README.md` §7 cannot be satisfied. This is a
pipeline check, not a performance claim.

## Blocker 3 — the feature set is shallow

There are no log curves in this dataset. The only features available are depth,
trajectory (`inclination`, `azimuth`, `vertical_section`) and
`mud_temperature_depth` (457,104 depth-indexed samples). A lithology classifier
without gamma, density or resistivity is essentially a depth-and-temperature
lookup. Expect weak performance, and say so in advance rather than after.

## Label contract

Multiclass. Target = the taxonomy class assigned in blocker 1. Join on `md` —
`lithology` is depth-indexed and has no time column.

## Leakage restrictions

- **L4** the `mud_temperature_depth` join must be on `md`, not time, and must
  stay within the survey floor (3,336.6456 m). Nearest-neighbour interpolation
  in depth across a lithology contact would assign the neighbouring rock's
  temperature to the boundary sample.
- **L6** both `lithology` and `mud_temperature_depth` are derived from the same
  drilling campaign. Document that the model may partly learn campaign-specific
  reporting style.
- Do not include `md` as a plain feature without a validation check: a
  monotonically increasing depth feature can dominate a classifier and produce
  an apparently strong score that is really just a depth lookup.

## Path to a real model

`FORCE2020_LITHO` (FORCE 2020, status `PLANNED`, not downloaded) is the
recorded candidate: a large multi-well log population with lithology labels and
an established evaluation protocol. It is the natural target dataset for this
model once the taxonomy work is done.
