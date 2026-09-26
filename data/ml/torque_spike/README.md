# `torque_spike`

**Status: `SIGNAL_UNAVAILABLE` — 0 labels, and the signal column is 100% null.**

## Objective

Detect abnormal torque-and-drag excursions against a mechanical baseline, to
catch stuck-pipe precursors and hole-condition changes.

## Why nothing can be built yet

`drilling_timeseries.torque` is 100% null across all 124,497 rows.
`drilling_timeseries.drag` is 100% null. The model is named after the two
columns that do not exist in this dataset.

There are no labels either: `events` contains no torque or drag event type, and
the ontology in `data/event_types.csv` has no such class.

This is the clearest case in the project of a name being mistaken for data. The
feature exists in the canonical schema, which is why the column is present and
empty. Schema presence is not data availability.

## Label contract (for when torque exists)

The natural label is not an operational report but a **deviation from a
mechanical baseline**:

- Fit a baseline (hookload / WOB ratio model, or the pro-well-plan torque &
  drag model) on the well's own clean intervals.
- Label a spike as `|residual| > k * MAD(residual)` within a trailing window.
- `k` must be fixed in the registry before fitting, not tuned per well.

Be explicit that this is a *self-supervised* label: it is derived from the
feature space, so it cannot validate a model that predicts the feature space.
Report it as anomaly detection, not as event prediction. A supervised claim
about "real" torque spikes requires externally reported events.

## Leakage restrictions

- **R6 is the governing rule here.** A threshold-derived label from a feature
  the model also sees is circular. Either exclude the source feature from the
  model's inputs, or state plainly that the model reproduces the threshold.
- **L4** the baseline must be fit on the trailing interval only. A baseline fit
  over the whole well uses future data.
- **L6** the baseline model is itself a fitted artefact; it must be fit inside
  the training fold.

## Path to a real model

`TORQUE_DRAG` in `data/ml_task_registry.csv` (`pro-well-plan/torque_drag`,
status `PLANNED`, not downloaded) is a **physics simulator, not a labelled
dataset**. It is useful as the baseline generator for the residual approach
above, and it can synthesise a torque channel for a well whose bit and BHA are
known. Note the dependency problem: `bits` and `bha_runs.bha_type` are empty or
null here, so the simulator cannot currently be configured for this well.
