# `historical_analogue`

**Status: `DATA_REQUIRED` — structurally impossible on one well.**

## Objective

Retrieve and rank historically similar wells or intervals, so an engineer can
see how comparable situations were handled.

## Why this model cannot start

This is the one model where the blocker is the **well population**, not the
label count, and no amount of feature engineering on FORGE 16B(78)-32 changes
that.

- **Wells available: 1.** An analogue model ranks a query interval against a
  reference population. With one well the reference set is the query itself.
  Any "nearest neighbours" returned would be the same wellbore.
- **A second FORGE well would not fix it.** FORGE is a geothermal research well.
  Oil-well analogue retrieval needs an oil-well population to be meaningful.
  A geothermal analogue is a different domain, and presenting geothermal
  similarity as oil-well guidance would be exactly the overclaim this project
  is structured to avoid.
- **Feature basis is also missing.** Analogue retrieval usually runs on log curve
  shape. This dataset has no log curves. The only curves available are
  `mud_temperature_depth` (457,104 samples) and the mechanical channels.

## What you may legitimately build now

A **retrieval index over depth intervals within the single well**, which is a
useful internal tool even though it is not an analogue model:

- Segment FORGE16B7832-01 into intervals on `mud_temperature_depth` and on
  mechanical-response change points.
- Retrieve similar intervals *within* the well using those features.
- Report it as intra-well interval similarity, in those words, and not as
  historical analogue retrieval.

That is a real deliverable. It is also a different product, and the README for
it should not reuse the name "analogue".

## Label contract

None. Retrieval is unsupervised; there is no target variable. Evaluation is by
retrieval quality against expert judgement, which means the evaluation protocol
must be defined before results are seen, and the annotator recorded.

## Leakage restrictions

- **L1/L5** if the retrieval index is built over the whole well and then
  evaluated on intervals from that same well, the index has seen the answer.
  Build the index inside the fold.
- **L6** the `source_document` field is a strong fingerprint. Two intervals
  extracted from the same daily report will look artificially similar. Either
  exclude `source_document` from the feature basis or report results separately
  by document.

## Required features (for the real model)

Log curves (gamma, density, neutron, resistivity, photoelectric), `md`, `tvd`,
`tvdss`, trajectory, formation tops, and bit/BHA identity. Of these, only
`md`/`tvd`/`tvdss` and trajectory exist today. `bits` is 0 rows and
`formations` is 0 rows.

## Path to a real model

`FORCE2020_LITHO` (FORCE 2020, status `PLANNED`, not downloaded) is the
recorded candidate: a large multi-well population with curves over depth, which
is precisely the population analogue retrieval requires. Confirm the licence
permits derived-feature use before building an index over it.
