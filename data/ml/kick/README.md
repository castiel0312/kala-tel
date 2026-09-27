# `kick`

**Status: `SIGNAL_UNAVAILABLE` — 0 labels, and the physical channels are all null.**

## Objective

Detect a formation influx (kick) early enough to shut in before it becomes an
incident.

## Why nothing can be built yet

This is the least ready model in the set, and the reason is more fundamental
than label count.

- **Labels: 0.** No kick event exists in `events`. The ontology in
  `data/event_types.csv` defines `KICK` and its exclusions, but the FORGE daily
  reports produced zero instances.
- **Signal: absent.** Every channel a kick model needs is 100% null in
  `drilling_timeseries`: `gas_total`, `flow_in`, `flow_out`, `ecd`, `h2s`.

There is nothing to predict and nothing to predict it from. This is not a
data-cleaning problem that more effort on the current source will solve.

FORGE is a geothermal well. Kicks are a hydrocarbon-drilling hazard, so a
geothermal well is close to the wrong domain for this label in the first place.

## Label contract (for when data exists)

Binary. Positive = trailing window before a confirmed influx onset. The label
source must be an operational influx/kill log, not a threshold on a gas channel
(R6).

## Leakage restrictions

- **L3** `gas_total` is a *consequence* of a kick. It is a candidate label
  source, never a feature. Using it as both label and feature is the single
  most common way a kick model reports 0.99 AUC and means nothing.
- **L1/L4** trailing windows only.

## Required features (when channels exist)

`ecd`, `flow_in`, `flow_out`, `gas_total`, `pit_volume`, `standpipe_pressure`,
`pump_rate`, `hookload`, `wob`, plus their trailing means. `flow_out` versus
`flow_in` imbalance is the classical signal and is the reason both columns are
required together — neither is useful alone.

## Path to a real model

`KICK_DATADRILL` in `data/ml_task_registry.csv` (Arifeen et al. 2024, Zenodo
DOI `10.5281/zenodo.12759014`, status `PLANNED`, not downloaded) is recorded as
a kick + overpressure benchmark. `KICK_3W_PETROBRAS` (Petrobras 3W) supplies
11 event classes and would additionally serve to validate the event ontology
itself. Neither has been fetched.

## Do not

Do not build a kick "model" from `EQUIPMENT_FAILURE` (26 events) by relabelling
it. Those are operational equipment events with a different mechanism, and
relabelling them would manufacture a kick label set out of a different hazard.
