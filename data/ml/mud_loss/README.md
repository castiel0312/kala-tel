# `mud_loss`

**Status: `INSUFFICIENT_LABELS` — 1 positive, from 1 well.**

## Objective

Predict a mud-loss / loss-of-mud-material event in the minutes before onset, so
an operator could act on it.

## What the data actually gives you

- **Labels: 1.** One `MUD_LOSS` event in `events`. That is the entire positive
  set.
- **Signal: good.** This is the one hazard where the physically correct channel
  is present and fully populated — `pit_volume` (124,462/124,497 rows), plus
  `pump_rate`, `standpipe_pressure`, `hookload`, `rop`, `wob`, `rpm`.
- **Wells: 1.**

The blocker is the label count, not the data. A model fitted on one positive
memorises one event and reports a perfect score on that event. That score is
meaningless and must not be reported as performance.

## Label contract

Positive = a sample in the trailing window before a `MUD_LOSS` `start_time`.
Negative = a sample inside a period covered by an ingested daily report with no
`MUD_LOSS` onset (rule R4: an unrecorded period is not automatically a
negative).

Depth cannot be used to build the label. `events.start_md` is 100% null; only
`end_md` is populated, so the label is time-anchored only.

## Required features

From `ml/feature_registry.yaml`: `pit_volume`, `pump_rate`,
`standpipe_pressure`, `hookload`, `rop`, `wob`, `rpm`, plus trailing
derivatives `rop_ma_15m`, `pump_rate_ma_15m`, `spp_ma_15m`, `d_pump_rate_d_md`.

## Leakage restrictions

- **L3 is the critical one here.** `pit_volume` *is* the mud loss. A pit that
  drains is the event, not a precursor. Truncate the feature window at onset,
  or exclude `pit_volume` from the window entirely and let the model infer the
  loss from `pump_rate` and `standpipe_pressure` behaviour instead. State which
  you chose and why in your `label_report.md`.
- **L1** no observation at or after `start_time`.
- **L2** never use `events.severity`, `events.cause` or `events.npt_hours`.

## Baselines

Base rate (predict the majority class) → logistic regression on the trailing
features → gradient boosting. Compare all three and report the base rate
alongside; a model that does not beat the base rate is not a model.

## Path to a real model

Ingest a multi-well dataset with mud-loss logs. `data/ml_task_registry.csv`
records two candidates, both still `PLANNED` and neither downloaded:
`KICK_3W_PETROBRAS` (Petrobras 3W, 11 event classes) and
`KICK_DATADRILL` (Zenodo `10.5281/zenodo.12759014`). Either has enough labelled
events and enough wells to support a grouped evaluation.

## Do not

Do not generate mud-loss labels by rule. If you can threshold pit volume to
produce the label, the model will recover your threshold and learn nothing
(R6).
