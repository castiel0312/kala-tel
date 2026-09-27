---
name: DataDRILL
version: 1.0.0
description: Simulated drilling time-series dataset with a labelled kick event
homepage: https://zenodo.org/records/12759014
license: CC-BY-4.0
---

# DataDRILL kick detection model card

A 35-feature ensemble that detects a kick (formation influx) in drilling
time-series data, shipped as a self-contained Python package.

**Status: research prototype.** Trained and validated on a single simulated
kick event. Not validated on any field well. See *Limitations* before use.

---

## What it does

Reads a drilling time series and raises an alarm when formation influx is
underway. Output is a per-sample probability plus operator-visible alarm
episodes.

## What it does not do

It does **not** predict an imminent kick. On this data the first alarm arrives
about 3.2 s *after* the physical influx begins, while the pit-gain label lags
the influx by about 3.6 s. Searches for a genuine precursor across all nine
primary channels found none (BH-adjusted p = 0.649). Read the alarm as
"the well is already gaining — go look", not "a kick is coming".

---

## Data

| | |
|---|---|
| Source | DataDRILL, Zenodo [10.5281/zenodo.12759014](https://zenodo.org/records/12759014) |
| Paper | arXiv:2409.19724 |
| Licence | CC-BY-4.0 |
| Content | **one** simulated well run, 2337 samples, 28 channels |
| Kick events | **one** |
| Sampling | 0.36 s per sample (~14 min for the formation) |
| Label | `ActiveGL > 0.1` bbl (0.1 bbl = smallest pit gain distinguishable from the well-balanced noise floor) |

Row 0 is a startup artifact and is excluded. The 60-sample warm-up is dropped
by the feature builder, leaving **2276 scored samples** (831 positive).

## Features

35, hard-pinned in order at load time:

| Family | n | Features |
|---|---|---|
| Raw level | 9 | `FOut` `FIn` `DPPress` `WBoPress` `WoBit` `HLoad` `RoPen` `CircFlow` `SMSpeed` |
| Ratio / imbalance | 5 | `FOut_minus_FIn` `FOut_over_FIn` `WoBit_over_HLoad` `DPPress_minus_WBoPress` `RoPen_over_WoBit` |
| Rolling mean (20) | 9 | `*_mean20` for each primary |
| Rolling z-score (20) | 12 | `*_z20` (9) + `FOut_minus_FIn_z20` + `WoBit_kickdir_z20` + `HLoad_kickdir_z20` |

**Excluded on purpose:** `ActiveGL` and `ATVolume` are the kick itself — using
them would read the answer. `FDensity`, `MVis`, `FPress`, `WellDepth` are
unavailable or untrustworthy at surface in real time. All features are causal:
current and past samples only.

## Model

Equal-weight mean of three probability-calibrated members:

| Member | Configuration | Calibration |
|---|---|---|
| CatBoost | 300 iters, depth 5, lr 0.05 | 3-fold isotonic |
| LightGBM | 300 trees, 15 leaves, depth 4, `is_unbalance` | 3-fold isotonic |
| Logistic regression | QuantileTransformer → balanced L2, C=0.05 | none (already monotone) |

**Equal weights are deliberate.** A learned weighting needs held-out events to
fit reliably; with one event it would fit noise.

**Threshold 0.22.** Selected as the highest-detection threshold with zero
false-alarm **episodes** (consecutive crossings within 10 samples count as one)
on both the 240-event synthetic stress grid and the real healthy period.

---

## Performance

### On the 240-event synthetic stress grid (guarded fit)

| Metric | Value |
|---|---|
| Detection rate @ 0.22 | **88.33%** (212/240) |
| Median detection delay | 16.18 s |
| p90 detection delay | 18.70 s |
| False-alarm episodes | **0** |
| Incumbent 237-feature control | 80.0%, p90 49.98 s |

Detection floor: all 30 misses occur at FOut shifts of 0.14σ or 0.43σ. None at
1.42σ or above. The floor therefore lies somewhere between 0.43σ and 1.42σ and
is **not resolved** by this data.

### On the real run

| | |
|---|---|
| First alarm | +3.2 s after physical influx |
| p ≥ 0.50 | +3.6 s |
| p ≥ 0.90 | +4.3 s |
| p ≥ 0.95 | +4.7 s |
| Peak pre-onset probability | 0.0179 (threshold 0.22) |
| False alarms on healthy period | 0 episodes |

### In-sample fit

Accuracy 0.9996, F1 0.9994, ROC-AUC 1.0, recall 1.0.

**These in-sample numbers carry no information about generalisation** and are
reported only to confirm the model fits its training data. They are *not* a
performance claim.

---

## Limitations

1. **One event, one well, simulation.** The 88.33% comes from a synthetic grid
   built by rescaling that single kick. It measures sensitivity to severity
   and ramp shape on a known event. It is **not** a field false-alarm rate and
   **not** a cross-well estimate.
2. **No cross-well validation.** Nothing here demonstrates the model
   transfers to a different well, rig, or field.
3. **Unresolved severity floor.** Misses at 0.43σ and detections at 1.42σ
   bracket a boundary this dataset cannot pin down.
4. **No early warning.** See *What it does not do*.
5. **Threshold is data-specific.** The healthy-period scores are tightly
   bimodal, so the exact threshold inside roughly 0.15–0.22 is not pinned by
   the data and will move under refitting. Calibration is to *this* well's
   healthy baseline.
6. **Simulation-domain only.** DataDRILL is simulated. Real-time sensor noise,
   bit dynamics, and surface data quality are not represented.

## Intended use

- Research and method development on simulated drilling data.
- Demonstrating the feature and decision pipeline.

**Not intended for** operational well control, alarm setting on a live well, or
any safety-critical decision, without independent validation on field data from
multiple wells.

## Reproducibility

- `python scripts/retrain.py --check-only` rebuilds from `data/Kick_Detection.csv`
  and verifies the feature list, feature config, and threshold against the
  shipped artifact. Currently reproduces threshold 0.22, 88.33% detection,
  16.18 s median delay, 18.70 s p90 exactly.
- `python scripts/verify.py` runs 15 checks: self-contained load, feature
  order and width, dtype, NaN/infinity, banned-column exclusion, serialisation
  parity, and documented detection behaviour.
- `scripts/stress.py` (`kickdet/stress.py`) is the single source of truth for
  the grid and the false-alarm accounting, shared by the retrain, the CLI, and
  the tests so the numbers cannot drift apart between scripts.
- Pinned versions in `requirements.txt`; recorded in the artifact metadata.
  Serialised estimators are version-sensitive — use the pinned set.

## Ethical and safety note

Drilling kick detection is safety-relevant. This prototype is not validated
enough to inform real-time well-control decisions. Independent multi-well
validation is a prerequisite for any operational use.
