# `overpressure`

**Status: `SIGNAL_UNAVAILABLE` — 0 labels, no ECD, no formation pressure.**

## Objective

Predict pore / formation pressure, or an overpressure margin ahead of the bit,
to set casing and mud-weight limits.

## Why nothing can be built yet

- **Labels: 0.** Overpressure is normally a *regression* against measured
  formation pressure, and the dataset contains no formation pressure test at
  all.
- **Signal: absent.** `drilling_timeseries.ecd` is 100% null. There is no
  equivalent-control channel.
- **Petrophysical inputs: absent.** `reservoirs` is 0 rows, so no porosity, no
  permeability, no fluid contact. `formations` is 0 rows, so no lithology
  section to compute a normal-pressure trend from.

Overpressure prediction is fundamentally a petrophysical task. Every input that
task needs is missing, and none of them can be reconstructed from the FORGE
source set.

## Label contract (for when data exists)

Regression. Target = measured formation pressure at a tested depth, in the
source's own pressure unit converted to a declared canonical unit. Paired with
a binary variant: overpressure ratio above a stated threshold, where the
threshold is stated in the registry rather than chosen per well.

## Leakage restrictions

- **L3** `ecd` is a consequence of formation pressure, not a precursor. In a
  well-control setting ECD *is* the measurement; treating it as an input to
  predicting the pressure it measures is circular. If you use it, say so
  explicitly and describe the target as a *margin*, not a pressure.
- **L1/L4** a pore-pressure trend computed with a centred or two-sided window
  over the interval is fitting the answer (L4). Normal trends must be built
  from shallower, already-drilled offsets only.

## Required features (when data exists)

`mud_weight_daily` (the only mud density available, and only at daily grain),
plus — from external data — `porosity`, `permeability`, `shale_volume`,
`sonic`, `density`, `resistivity`, and formation tops.

## Note on the one available mud density

`mud_properties.mud_weight` is populated (72 rows, 0.9946–1.0185 g/cm³) but at
**daily** grain from the DDR mud report, not per sample. Broadcasting it onto
minute-level samples asserts a constancy the source does not state. Join it at
daily grain and keep it that way.

## Path to a real model

FORCE 2020 (`FORCE2020_LITHO` in `data/ml_task_registry.csv`, status
`PLANNED`, not downloaded) supplies a large multi-well log population for the
geology side. It does **not** supply formation pressure test data, so even after
FORCE 2020 an overpressure model needs a separate pressure-test source.
