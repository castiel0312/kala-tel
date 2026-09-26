# `cementing`

**Status: `INSUFFICIENT_LABELS` — 4 events, and the cement job table is empty.**

## Objective

Assess cementing risk and verify whether a cement job achieved its objective.

## What the data actually gives you

- **Labels: 4.** `CEMENT_FAILURE` × 4, carrying depth and duration and nothing
  else numeric.
- **The cement table does not exist.** `cement_jobs` has **0 rows**. So there is
  no `slurry_density`, no `volume`, no `yield_value`, no `pump_rate`, no
  `pressure`, no `placement_time`, no `top_md`/`bottom_md`, and no `result`.
  Those columns exist in the schema and are entirely empty.
- **Context: available.** `casings` has 158 rows of hole geometry — casing
  type, size, weight, grade, shoe MD, top MD, hole diameter. That is real and
  relevant to cementing risk.
- **Wells: 1.**

The 4 events are the label. Without a cement job record there is nothing to
model the *job* against. The correct near-term target, if you want one, is
narrower than "cementing risk":

**Defensible now:** predict hole-condition risk for a future casing point from
hole geometry and drilling mechanics. `casings` is populated, and the 4
`CEMENT_FAILURE` events plus the drilling response over the interval are
label-adjacent.

**Not defensible now:** slurry design, displacement volume, or pressure
outcome, because the job record is absent.

If you take the narrow target, say so explicitly rather than calling it a
cementing model.

## Label contract

Binary. Positive = a `CEMENT_FAILURE` onset. As everywhere else, `start_md` is
100% null and only `end_md` is populated, so the label is time-anchored.

## Required features

Available today: `casing_shoe_md`, `hole_diameter`, `hole_section`, hole
geometry from `casings`, plus `rop`, `wob`, `rpm`, `standpipe_pressure`,
`pump_rate`, `mud_weight_daily` over the interval, and
`mud_temperature_depth` joined on `md`.

Note `casings.top_tvd` is only 48% populated while `top_md` and `shoe_tvd` are
complete. Use MD as the primary index and do not forward-fill `top_tvd` upward.

## Leakage restrictions

- **L2** never use `events.severity` or `events.cause`.
- **L3** standpipe pressure during placement is the job, not a precursor.
- **L4** a `mud_temperature_depth` profile spanning a cement top is a
  post-placement measurement. Using it to predict placement success reads the
  answer.

## Path to a real model

Machine-readable cement job records with results, across multiple wells. No
candidate is recorded in `data/ml_task_registry.csv` yet — add one there with
its access method and licence before starting, and confirm the licence permits
model training rather than research use only.
