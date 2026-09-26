# NWIS ML handoff

This directory is a **contract for nine independent model teams**, not a model
repository. No model is trained here, no external dataset is downloaded here,
and the canonical data is not modified from here.

Read this file before writing any feature or label. Then read the two
registries, then the per-model README in `data/ml/<model>/`.

## 1. Canonical data source

| | |
|---|---|
| Dataset version | `nwis-forge16b-v0.2` |
| Canonical root | `data/processed/*.csv` |
| Source | Utah FORGE 16B(78)-32, a geothermal research well |
| Operator | University of Utah |
| `data_origin` | `PUBLIC_REAL` on every populated row |
| Wells / wellbores | 1 / 1 (`FORGE16B7832`, `FORGE16B7832-01`) |
| Validator state | `PARTIAL` — 0 critical, 0 high, 9 advisories |
| Full description | `reports/dataset_card.md` |

**This is not oil-well data.** No oil-well proprietary record exists in this
release. Any statement about oil-specific predictive performance is out of
scope until an oil-well source is ingested and labelled `OIL_PROVIDED`.

### Row counts

| Table | Rows | Usable for ML |
|---|---:|---|
| `drilling_timeseries` | 124,497 | yes, 7 channels |
| `mud_temperature_depth` | 457,104 | yes, depth-indexed |
| `trajectories` | 428 | yes |
| `drilling_runs` | 376 | yes |
| `documents` | 219 | provenance only |
| `casings` | 158 | context only |
| `mud_properties` | 72 | daily grain only |
| `lithology` | 65 | needs taxonomy |
| `events` | 44 | labels, see label registry |
| `formations`, `bits`, `cement_jobs`, `reservoirs` | 0 | no |

## 2. Supported entities

Populated: `wells`, `wellbores`, `locations`, `trajectories`,
`drilling_timeseries`, `drilling_runs`, `casings`, `bha_runs`, `lithology`,
`mud_properties`, `mud_temperature_depth`, `events`, `documents`.

Declared and intentionally empty (`SOURCE_NOT_AVAILABLE`, never back-filled):
`formations`, `bits`, `cement_jobs`, `reservoirs`.

## 3. Unit conventions

Canonical units are those in `data/processed`. **Never re-derive a unit.**

| Quantity | Canonical unit | Source unit |
|---|---|---|
| `md`, `tvd`, `tvdss` | m | ft |
| `rop` | m/h | ft/h |
| `wob`, `hookload` | kN | klbf |
| `rpm` | rpm | rpm |
| `pump_rate` | L/min | gal/min |
| `standpipe_pressure` | MPa | psi |
| `pit_volume` | m³ | bbl |
| `mud_weight` | g/cm³ | g/cm³ |
| `inclination`, `azimuth` | ° | ° |
| `dogleg_severity` | °/30 m | °/30 ft |
| `mud_temp_in`, `mud_temp_out` | °C | °C |

Original values are retained alongside normalised ones
(`original_units`, `conversion_rule`, `conversion_version = 1.1.0`).
`drilling_timeseries.tvd` is **interpolated** between survey stations and its
`conversion_rule` says so.

## 4. Timestamp conventions

- Timestamps are **naive local**. The source declares no timezone.
- Do not attach UTC. Do not compute UTC-offset features.
- Elapsed-time features (`dt_hours_since_run_start`) are valid.
- `mud_temperature_depth` has **no timestamp at all**. It is depth-indexed and
  joins on `md` only, within the survey floor of 3,336.6456 m.

## 5. Provenance requirements

1. Every feature row must carry `source` (the source table or file) and
   `data_origin`.
2. Every label row must carry the `event_id` it derives from, plus
   `source_document` and `source_page`.
3. New data lands in `data/ml/<model>/` with a `data_origin` that is honest.
   `SYNTHETIC` data is permitted for pipeline tests but must never be mixed
   into a reported score.
4. Never write to `data/processed/`. It is frozen. If you believe a canonical
   value is wrong, raise it; do not edit it in place.

## 6. Leakage rules

The six rules are normative and are enumerated in
`ml/feature_registry.yaml` under `leakage_rules`. In short:

- **L1** Never use an observation at or after event onset.
- **L2** No column from `events` may be a feature, including `severity`,
  `cause` and `npt_hours`.
- **L3** Exclude channels that are consequences of the event (pit_volume for
  mud loss, gas for kick, collapsed ROP for stuck pipe).
- **L4** Rolling windows are trailing, never centred. Interpolation must be
  causal.
- **L5** All rows from a wellbore go in one split. No random splitting.
- **L6** If the feature and the label come from the same document, record it —
  the model may be learning the document.

## 7. Well-grouped evaluation policy

This is the constraint that decides whether any number is reportable.

- Split by `wellbore_id`, never by row and never by a time boundary inside a
  well.
- Current dataset has **1 well**, so no held-out well exists. The minimum for a
  defensible report is **5 wells** (see `minimum_usable_labels` in the label
  registry).
- Until then a model may be built as an **engineering prototype** to prove the
  feature pipeline runs. Its score is a pipeline check, not a performance
  claim, and must be labelled as such in the report.
- Report per-class precision/recall and a confusion matrix, not accuracy.
  Hazard labels are heavily imbalanced and accuracy will be meaningless.
- Any aggregate metric must be accompanied by the well count and the positive
  count it was computed from.

## 8. Directory contract

Each of the ten directories under `data/ml/` (`common` plus nine models) holds:

| Subdirectory | Contract | Output filename |
|---|---|---|
| `features/` | feature-building code and the feature manifest | `features.csv`, `feature_manifest.json` |
| `labels/` | label-building code and the label set | `labels.csv`, `label_report.md` |
| `training/` | training code only. No data in here. | — |
| `evaluation/` | metrics, confusion matrices, split definitions | `metrics.json`, `evaluation_report.md` |

`data/ml/common/` is shared, not a model. It holds the cross-cutting code every
model needs: dataset loading, the well-grouped splitter, the leakage guard, and
the evaluation harness. Put shared code there rather than copy-pasting it into
nine models.

`tests/test_ml_scaffolding.py` asserts this contract holds. If you add a model
directory, that test will tell you exactly what it is missing.

## 9. Adding a model

1. Add a directory `data/ml/<model>/` with the four subdirectories and a README.
2. Add the feature groups you need to `ml/feature_registry.yaml` with
   `source_table`, `source_column`, `unit` and `available_now`. If the backing
   column is entirely null, you may not add it as available.
3. Add a label contract to `ml/label_registry.yaml` with a status from
   `status_values`. If no source-backed label exists, the status is `ABSENT` —
   do not invent one.
4. Add a row to `reports/ml_training_readiness.md`.
5. Add a section to `docs/ML_TEAM_HANDOFF.md`.
6. Run `pytest tests/test_ml_scaffolding.py` and `make check`.

## 10. Current state, stated plainly

| Model | Labels | Status |
|---|---:|---|
| `lithology` | 65 (needs taxonomy) | `PROTOTYPE_POSSIBLE` |
| `stuck_pipe` | 11 | `INSUFFICIENT_LABELS` |
| `cementing` | 4 | `INSUFFICIENT_LABELS` |
| `wellbore_instability` | 2 | `INSUFFICIENT_LABELS` |
| `mud_loss` | 1 | `INSUFFICIENT_LABELS` |
| `kick` | 0 | `SIGNAL_UNAVAILABLE` |
| `overpressure` | 0 | `SIGNAL_UNAVAILABLE` |
| `torque_spike` | 0 | `SIGNAL_UNAVAILABLE` |
| `historical_analogue` | 0 | `DATA_REQUIRED` |

**No model is trainable to a reportable standard on this dataset.** The
correct next step for eight of the nine is external data, not modelling work.
`reports/ml_training_readiness.md` has the per-model detail.
