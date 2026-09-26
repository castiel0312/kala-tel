# ML training readiness

- **Dataset version:** `nwis-forge16b-v0.2`
- **Source:** Utah FORGE 16B(78)-32 (geothermal research well, University of Utah)
- **`data_origin`:** `PUBLIC_REAL` on every populated row
- **Validator state:** `PARTIAL` — 0 critical, 0 high, 9 advisories
- **Wells available:** 1 (`FORGE16B7832`, wellbore `FORGE16B7832-01`)
- **External datasets downloaded:** none. `data/ml_task_registry.csv` candidates are all `PLANNED`.
- **Models trained:** none.

## How to read the STATUS column

| Status | Meaning |
|---|---|
| `READY_FOR_EXTERNAL_DATA` | Signalling and labelling are adequate; only more wells are needed. |
| `PROTOTYPE_POSSIBLE` | Enough real labels to prove the feature pipeline, not enough for a performance claim. |
| `INSUFFICIENT_LABELS` | Labels exist but are far below the reporting floor. |
| `SIGNAL_UNAVAILABLE` | The physical channel the model needs is entirely null. No amount of labelling fixes this. |
| `DATA_REQUIRED` | Blocked by well population rather than label count. |

**No model reaches `READY_FOR_EXTERNAL_DATA`.** Two are blocked by a missing
physical channel that no dataset can synthesise honestly; the rest need labelled
multi-well data.

## The two numbers that decide everything

| Constraint | Required | Available |
|---|---:|---:|
| Wells for a defensible grouped evaluation | 5 | **1** |
| Positives for a binary hazard report | 200 | 0 – 11 |

Every status below follows from those two gaps, except where a signal is
physically absent.

---

## MODEL: mud_loss

- **CURRENT DATA AVAILABLE:** `pit_volume` (124,462), `pump_rate` (124,462), `standpipe_pressure` (124,482), `hookload` (124,425), `rop` (124,485), `wob` (124,496), `rpm` (123,474) — all minute-grain. Signal is complete.
- **REQUIRED DATA:** multi-well drilling data with mud-loss logs.
- **AVAILABLE LABELS:** **1** (`MUD_LOSS`)
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** ~18 derived and measured, all available now.
- **STATUS:** `INSUFFICIENT_LABELS`

Signal is the best in the set; the label count is the whole problem.

## MODEL: stuck_pipe

- **CURRENT DATA AVAILABLE:** `rop`, `wob`, `rpm`, `hookload` populated. `torque` and `drag` are 100% null.
- **REQUIRED DATA:** multi-well stuck-pipe labels; ideally a torque channel.
- **AVAILABLE LABELS:** **11** (`STUCK_PIPE` 10, `PACK_OFF` 1 — and `data/event_types.csv` rates `PACK_OFF` as usually a casing/wellhead pack-off, `low` confidence)
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** ~20 available; the classical torque/drag features are not.
- **STATUS:** `INSUFFICIENT_LABELS`

## MODEL: kick

- **CURRENT DATA AVAILABLE:** nothing usable. `gas_total`, `flow_in`, `flow_out`, `ecd`, `h2s` are all 100% null.
- **REQUIRED DATA:** a dataset with gas and flow channels plus influx logs.
- **AVAILABLE LABELS:** **0**
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** 0 of the required set.
- **STATUS:** `SIGNAL_UNAVAILABLE`

Least ready model in the set. A geothermal well is also close to the wrong
domain for this hazard.

## MODEL: overpressure

- **CURRENT DATA AVAILABLE:** `mud_weight` at daily grain only (72 rows, 0.9946–1.0185 g/cm³). No `ecd`. No formation pressure. `reservoirs` 0 rows, `formations` 0 rows.
- **REQUIRED DATA:** formation pressure tests plus wireline logs (porosity, permeability, sonic, density, shale volume).
- **AVAILABLE LABELS:** **0** — overpressure is a regression against measured pressure; no such measurement exists.
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** 1 marginal (daily-grain mud weight); every petrophysical input absent.
- **STATUS:** `SIGNAL_UNAVAILABLE`

## MODEL: torque_spike

- **CURRENT DATA AVAILABLE:** `torque` 100% null, `drag` 100% null. The columns exist in the schema and are empty.
- **REQUIRED DATA:** a torque/drag channel, plus externally reported events for a supervised target.
- **AVAILABLE LABELS:** **0** — `events` has no torque or drag class.
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** 0.
- **STATUS:** `SIGNAL_UNAVAILABLE`

The clearest case in the project of a schema column being mistaken for data.

## MODEL: wellbore_instability

- **CURRENT DATA AVAILABLE:** full mechanical response (`rop`, `wob`, `rpm`, `hookload`) and trajectory. No caliper, no image logs, no hole-volume log.
- **REQUIRED DATA:** caliper/image logs and multi-well instability reports.
- **AVAILABLE LABELS:** **2** (`WELLBORE_INSTABILITY` 1, `WASHOUT` 1 — the washout is a direct `high`-confidence report)
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** ~20 available; all direct hole-measurement features absent.
- **STATUS:** `INSUFFICIENT_LABELS`

## MODEL: lithology

- **CURRENT DATA AVAILABLE:** 65 depth-indexed cuttings descriptions, 124,497 mechanical samples, 457,104 depth-indexed mud temperatures, full trajectory.
- **REQUIRED DATA:** a reviewed controlled taxonomy (see blocker below), then log curves from a multi-well source.
- **AVAILABLE LABELS:** **65** — but **57 distinct free-text strings** with heavy near-duplication, so not yet a usable class set. `AVAILABLE_NORMALISATION_REQUIRED`.
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** ~15 available, but shallow: no gamma, density or resistivity, so the classifier is close to a depth-and-temperature lookup.
- **STATUS:** `PROTOTYPE_POSSIBLE`

The only model with a real label count. Three blockers remain: build and review
the taxonomy (a geology task), satisfy the well-grouped policy, and accept that
the feature set is depth/temperature only.

## MODEL: cementing

- **CURRENT DATA AVAILABLE:** `casings` 158 rows (hole geometry) and 4 `CEMENT_FAILURE` events. **`cement_jobs` is 0 rows** — no slurry density, volume, yield, pump rate, pressure, placement time or result.
- **REQUIRED DATA:** machine-readable cement job records with outcomes, multi-well.
- **AVAILABLE LABELS:** **4** (`CEMENT_FAILURE`), each carrying only depth and duration.
- **AVAILABLE WELLS:** 1
- **AVAILABLE FEATURES:** hole geometry available; **every** cement-job feature absent.
- **STATUS:** `INSUFFICIENT_LABELS`

A narrower target is available today — hole-condition risk for a future casing
point from `casings` plus mechanics — but that is not a cementing model and
should not be named as one.

## MODEL: historical_analogue

- **CURRENT DATA AVAILABLE:** 1 wellbore. `mud_temperature_depth` and mechanical channels as curve bases. No log curves.
- **REQUIRED DATA:** a multi-well population with curves over depth.
- **AVAILABLE LABELS:** **0** — retrieval is unsupervised, so there is no target; evaluation requires a protocol defined in advance and an expert annotator recorded.
- **AVAILABLE WELLS:** **1** — structurally disqualifying.
- **AVAILABLE FEATURES:** depth, trajectory, mud temperature. No gamma/density/resistivity; `bits` and `formations` are 0 rows.
- **STATUS:** `DATA_REQUIRED`

Blocked by well population, not label count. A second FORGE well would not help:
it is a geothermal well, and geothermal similarity is not oil-well guidance.

---

## Summary

| Model | Labels | Wells | Status |
|---|---:|---:|---|
| `lithology` | 65 (needs taxonomy) | 1 | `PROTOTYPE_POSSIBLE` |
| `stuck_pipe` | 11 | 1 | `INSUFFICIENT_LABELS` |
| `cementing` | 4 | 1 | `INSUFFICIENT_LABELS` |
| `wellbore_instability` | 2 | 1 | `INSUFFICIENT_LABELS` |
| `mud_loss` | 1 | 1 | `INSUFFICIENT_LABELS` |
| `kick` | 0 | 1 | `SIGNAL_UNAVAILABLE` |
| `overpressure` | 0 | 1 | `SIGNAL_UNAVAILABLE` |
| `torque_spike` | 0 | 1 | `SIGNAL_UNAVAILABLE` |
| `historical_analogue` | 0 | 1 | `DATA_REQUIRED` |

**Trainable to a reportable standard: none.** `lithology` is the only one where
feature-pipeline work can start honestly today, and only after the taxonomy
review.

## Recommended order of work

1. **Build the lithology taxonomy** (geology, not ML). Unblocks the one
   prototype. ~2 days, needs a domain reviewer.
2. **Stand up `data/ml/common/`** — the grouped splitter, causal rolling window,
   leakage guard and evaluation harness. Every later model depends on it and it
   should exist before any model is written.
3. **Acquire one multi-well labelled dataset.** FORCE 2020 serves lithology,
   overpressure-geology, cementing context and analogue retrieval.
   `KICK_DATADRILL` serves kick and overpressure. This single step is worth more
   than any modelling work available now.
4. **Then** mud_loss, stuck_pipe, wellbore_instability in that order — they
   share the mechanical feature base, so the second and third are cheap once the
   first exists.
5. **Last** kick, overpressure, torque_spike, historical_analogue, each of which
   needs a distinct acquisition.

## What was deliberately not done

- No external dataset was downloaded. All candidates remain `PLANNED` in
  `data/ml_task_registry.csv`.
- No model was trained and no model artefact was produced.
- No label was fabricated, and no label was derived by thresholding a feature
  (rule R6).
- No canonical FORGE file was modified.
- No model was marked ready when it is not.
