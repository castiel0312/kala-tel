# `stuck_pipe`

**Status: `INSUFFICIENT_LABELS` — 11 positives, from 1 well.**

## Objective

Predict a stuck-pipe event before onset from drilling mechanics, supporting
torque-and-drag mitigation decisions.

## What the data actually gives you

- **Labels: 11.** `STUCK_PIPE` × 10 and `PACK_OFF` × 1. Floor for a binary
  hazard report is 200.
- **Signal: partial.** `rop`, `wob`, `rpm` and `hookload` are all well
  populated, and they are the right channels. `torque` and `drag` are 100% null
  and are the channels a classical stuck-pipe model would most want.
- **Wells: 1.**

## The PACK_OFF trap

`data/event_types.csv` records that pack-off in this source is usually a
**casing or wellhead** pack-off, not a stuck-pipe pack-off, and rates the
extraction `low` confidence. Do not silently fold `PACK_OFF` into
`STUCK_PIPE`. Either exclude it and say so, or make it a separate class and
report it separately. Folding it in inflates your count by a label that does not
mean what the model name implies.

## Label contract

Positive = trailing window before a `STUCK_PIPE` `start_time`. As with mud
loss, `start_md` is 100% null so the label is time-anchored, not
depth-anchored.

## Required features

`rop`, `wob`, `rpm`, `hookload`, `rop_ma_5m`, `rop_ma_15m`, `rop_std_15m`,
`wob_ma_15m`, `hookload_ma_15m`, `on_bottom_fraction_15m`, `d_rop_d_md`,
`vertical_section`, `inclination`, `hole_diameter`, `casing_shoe_md`.

`vertical_section` and `hole_diameter` matter here: hole condition and build
rate are the standard covariates in stuck-pipe work.

## Leakage restrictions

- **L3** ROP and RPM collapse as a *consequence* of the pipe sticking. A
  trailing mean that reaches into the stalled interval is measuring the event.
  Truncate at onset.
- **L4** `rop_ma_*` windows are trailing only. A centred window over the stall
  is textbook leakage.
- **L6** Every stuck-pipe label here comes from a DDR document. If your features
  also come from DDR documents, record that the model may be learning document
  style rather than mechanics.

## Baselines

Base rate → logistic regression → gradient boosting → sequence model over the
trailing window. Note that a classical torque-and-drag baseline is
**not available** on this dataset, because `torque` and `drag` are null. Do not
report a comparison against a baseline you could not run.

## Path to a real model

`STUCKPIPE_1` in `data/ml_task_registry.csv`
(`HaythamElmousalami/Drilling-Stuck-Pipe-Prediction`, status `PLANNED`, not
downloaded) is the recorded candidate. Confirm it contains multiple wells and
per-sample torque before relying on it.
