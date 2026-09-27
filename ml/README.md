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
3. New data lands under `data/interim/ml/<dataset>/` with a `data_origin` that
   is honest. `SYNTHETIC` data is permitted for pipeline tests but must never be
   mixed into a reported score. See §8 for why generated data never goes in
   `data/ml/`.
4. Never write to `data/processed/`. It is frozen. If you believe a canonical
   value is wrong, raise it; do not edit it in place.
5. An external dataset is registered in `ml/external_datasets.yaml`, never in
   `ml/label_registry.yaml`. Its label vocabulary is its own; mapping it onto a
   canonical vocabulary requires a committed, reviewed mapping file.

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

Each of the ten directories under `data/ml/` (`common` plus nine models) holds
**code and contracts only**:

| Subdirectory | Contract | Code and manifest filenames |
|---|---|---|
| `features/` | feature-building code and the feature manifest | `build_features.py`, `feature_manifest.json` |
| `labels/` | label-building code and the label set | `build_labels.py`, `label_report.md` |
| `training/` | training code only. No data in here. | — |
| `evaluation/` | metrics, confusion matrices, split definitions | `evaluate.py`, `evaluation_report.md` |

### Generated data does not go in `data/ml/`

`data/ml/` holds no data, ever. The filenames above are the *code* that produces
the artifacts, not the artifacts themselves. Generated data goes to the
gitignored interim root for its dataset:

| Dataset | Generated artifact root | Committed? |
|---|---|---|
| NWIS canonical | `data/interim/ml/<model>/` | no |
| External (e.g. FORCE 2020) | `data/interim/ml/<dataset_id>/` | no |

Three rules, all enforced by tests:

1. **Never write to `data/processed/`.** It is frozen. If you believe a canonical
   value is wrong, raise it; do not edit it in place.
2. **Never write generated data into `data/ml/`.** It is a hand-off contract.
   `tests/test_ml_scaffolding.py` fails the build if a `.csv`, `.parquet`,
   `.pkl`, `.joblib`, `.pt`, `.h5` or `.onnx` file appears there.
3. **Commit the manifest, not the table.** A committed `feature_manifest.json`
   or `label_report.md` records what was built and how; the table itself is
   regenerated from the pinned source.

A dataset with no external source simply has no `data/interim/` subtree yet.
That is the normal state, not a gap.

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

### External data: ingested, not modelled

One external dataset has been read end to end and a table built from it. It is
still **not** part of this dataset:

| Dataset | Status | What exists |
|---|---|---|
| FORCE 2020 | `INGESTED` | 118 wells, 1,429,694 labelled rows, 20 log curves, 12 classes, CC-BY-4.0 |

The built table lives at
`data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.csv` and is
gitignored; rebuild it with `make build-force2020-dataset` and check it with
`make verify-force2020-dataset`. Its schema, missing-value policy, split manifest
and QC are in `reports/force2020_dataset.md`.

`INGESTED` means a table exists and is reproducible from the pinned commit. It
does **not** mean a model has been trained on it, and no model in the table
above has changed status because of it.

Read `ml/external_datasets.yaml` before using it. Three consequences for the
models above:

- It is a **different label vocabulary** (NPD lithostratigraphic lithofacies) in
  a **different geography** (Norwegian Continental Shelf). It does not extend
  `FORGE_UTAH_16B` and is not mapped to it.
- It resolves label *scarcity* for `lithology`, and gives `historical_analogue`
  a real analogue population. It does not help the drilling time-series hazard
  models, which need drilling mechanics this dataset does not contain.
- Nothing has been built from it. No dataset, no features, no labels, no model.
  Building one is a separate decision.

### The FORCE 2020 baseline models

Three models now exist, and all three are deliberately **baselines**. They share
one dataset, one feature set, one target, one split, one preprocessing scheme and
one metric set, so the only thing that differs between them is the learner: a
Random Forest, an XGBoost booster and a LightGBM booster, all on the five
approved log curves, fitted on the source's own `train` wells and scored on the
two held-out well-disjoint partitions. None is tuned, none is the best available
model, none is production-ready and none is deployed anywhere.

| | |
|---|---|
| Experiments | `force2020-litho-rf-v0.1`, `force2020-litho-xgb-v0.1`, `force2020-litho-lgbm-v0.1` |
| Features | `CALI`, `RDEP`, `RMED`, `DTC`, `GR` (logs only, no `DEPTH_MD`) |
| Split | the source's own 98 / 10 / 10 well partition, unchanged |
| Missing values | median-imputed **inside** the pipeline, fitted on training rows only |
| Imbalance | balanced per-row sample weights from training rows only (boosters); `balanced_subsample` (forest) |
| Reports | `reports/force2020_rf_baseline.md`, `reports/force2020_gbdt_baseline.md` |
| Code | `data/ml/lithology/training/train_rf_baseline.py`, `.../train_gbdt_baseline.py` |
| Artifacts | `data/interim/ml/force2020_litho/{training,evaluation}` (gitignored) |

Reproduce them with `pip install -e .[ml]` then `make train-force2020-rf` and
`make train-force2020-gbdt`; check them with `make verify-force2020-rf` /
`make verify-force2020-gbdt` (a full refit) or `make score-force2020-rf` /
`make score-force2020-gbdt` (a re-score of the stored models, no refit).

Each booster also runs three diagnostics, none of which is a candidate: `DEPTH_MD`
alone, the five missingness masks, and an unweighted refit. `num_class=12` is
stated rather than inferred, so a rare class that silently went missing could not
produce a narrower model that still fit and still scored.

### The three-model comparison

`reports/force2020_model_comparison.md` places the three baselines side by side.
It is derived entirely from the three baseline reports by
`scripts/reports/build_model_comparison.py`, which fits nothing and imports no ML
library, so it cannot quietly disagree with the reports it compares. Rebuild with
`make build-force2020-model-comparison`, check with
`make check-force2020-model-comparison`.

It names **no winner**, and the reasoning is split rather than tidy: on macro F1,
supported-only macro F1 and balanced accuracy the spread between the two
partitions is larger than the spread between the three models, so those metrics
are reporting which ten wells were held out rather than which learner is better.
Weighted F1 is the exception, where the models do separate more than the
partitions do, and the report says so explicitly instead of averaging it away.
Weighted F1 is also the metric least able to see the rare classes that account for
most of the difficulty here.

The FORCE 2020 **penalty matrix** is now recorded at
`ml/force2020_penalty_matrix.json`, read verbatim from the pinned source's
starter notebook. It is the competition's own published matrix, and it is
indexed in the *competition's* class order, which is not this repository's
encoded target — `data/ml/common/force2020_lithology.py` owns that mapping so no
one has to re-derive it.
