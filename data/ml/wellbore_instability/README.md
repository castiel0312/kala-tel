# `wellbore_instability`

**Status: `INSUFFICIENT_LABELS` — 2 positives, from 1 well.**

## Objective

Predict hole-condition degradation — washouts, sloughing, caving — before it
impairs drilling and mud control.

## What the data actually gives you

- **Labels: 2.** `WELLBORE_INSTABILITY` × 1 and `WASHOUT` × 1. The washout is a
  direct report: `data/event_types.csv` records that "3% hole washout" counts as
  a washout report, extracted at `high` confidence. One report.
- **Signal: partial.** The drilling mechanics that respond to a changing hole
  gauge (`rop`, `wob`, `rpm`, `hookload`) are well populated. The instruments
  that measure it directly — caliper, image logs, hole-volume logs — are absent
  entirely.
- **Wells: 1.**

## Label contract

Positive = trailing window before a confirmed `WELLBORE_INSTABILITY` or
`WASHOUT` onset. `start_md` is 100% null; the washout carries `end_md` only, so
the label is time-anchored.

## Required features

`rop`, `wob`, `rpm`, `hookload`, `vertical_section`, `inclination`,
`azimuth`, `dogleg_severity`, `hole_diameter`, `casing_shoe_md`, and the
trailing means. Deviation features matter more than levels here: instability
shows up as a *change* in the mechanical response, not a new absolute value.

## Leakage restrictions

- **L3** a washout enlarges the effective hole gauge, which changes how WOB
  translates into ROP. Post-onset WOB-derived features are measuring the hole
  change, not predicting it. Truncate at onset.
- **L2** do not use `events.cause` or `events.severity`.

## Baselines

Base rate → logistic regression on the deviation features → gradient boosting.
With 2 positives, the honest deliverable is the feature pipeline plus a base-rate
comparison. A confusion matrix from 2 positives is not an evaluation.

## Path to a real model

Caliper and image logs plus multi-well instability reporting. FORCE 2020
supplies density/neutron/photoelectric logs over a large well population, which
gives the hole-condition covariates, but the *instability labels* still have to
come from operational reports. Those two sources are separate acquisitions.
