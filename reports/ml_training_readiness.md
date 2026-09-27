# ML training readiness

- **Dataset version:** `nwis-forge16b-v0.2`
- **Source:** Utah FORGE 16B(78)-32 (geothermal research well, University of Utah)
- **`data_origin`:** `PUBLIC_REAL` on every populated row
- **Validator state:** `PARTIAL` — 0 critical, 0 high, 9 advisories
- **Wells available:** 1 (`FORGE16B7832`, wellbore `FORGE16B7832-01`)
- **External datasets ingested:** one, and now **three baseline models trained on
  it**. FORCE 2020 (`INGESTED` in `ml/external_datasets.yaml`; inspection,
  characterization and construction findings in
  `reports/force2020_inspection.md`, `reports/force2020_characterization.md`
  and `reports/force2020_dataset.md`). The source bytes were profiled and
  pinned to a commit; the class, curve and missingness distributions were
  measured and a logs-only feature set was derived from them; a
  1,429,694-row logs-only table was then built from those approved curves, with
  a well-grouped split manifest and a QC report. Three baselines were then fitted
  on the source's own 98 train wells and scored on the two held-out well-disjoint
  partitions: a Random Forest (`force2020-litho-rf-v0.1`), an XGBoost booster
  (`force2020-litho-xgb-v0.1`) and a LightGBM booster
  (`force2020-litho-lgbm-v0.1`), each with `DEPTH_MD`-only, missingness-mask and
  class-weighting diagnostics. Their reports are
  `reports/force2020_rf_baseline.md` and `reports/force2020_gbdt_baseline.md`.
  They are **baselines**: untuned, none is the best available model, not
  production-ready, not deployed.
- **Models trained:** three, on the external dataset only
  (`force2020-litho-rf-v0.1`, `force2020-litho-xgb-v0.1`,
  `force2020-litho-lgbm-v0.1`). No canonical FORGE model has been trained, and no
  model in the table below has changed status because of it.

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
3. **Decide what to model from FORCE 2020.** It is licence-clear (CC-BY-4.0),
   pinned to a commit, ingested, and it is the only candidate that actually
   removes the binding constraint for `lithology`: 118 well-disjoint wells
   against the 1 available here. The characterization is in
   `reports/force2020_characterization.md`: 12 classes over 1,429,694 labelled
   rows, 20 log curves, a measured 5-curve core set (`CALI`, `RDEP`, `RMED`,
   `DTC`, `GR`) with 13 masked and 2 sparse candidates held back pending an
   availability-mask decision, and `GROUP`/`FORMATION` flagged as label-adjacent.
   The dataset is in `reports/force2020_dataset.md`: 1,429,694 rows, no row
   dropped, all 12 classes preserved, the source's own well-level split kept
   unchanged, missingness made explicit with a 0/1 mask per curve and nothing
   filled. What is left is a modelling decision, and the same limit still
   applies: its label vocabulary must not be mapped onto `FORGE_UTAH_16B`, and
   two classes (`93000` Basement, one well; `88000` Halite, three wells) are
   thin enough to shape how they are handled. `KICK_DATADRILL` still has to be
   acquired for kick and overpressure.
4. **Then** mud_loss, stuck_pipe, wellbore_instability in that order — they
   share the mechanical feature base, so the second and third are cheap once the
   first exists.
5. **Last** kick, overpressure, torque_spike, historical_analogue, each of which
   needs a distinct acquisition.

## What was deliberately not done

- One external dataset was **ingested**: FORCE 2020 is `INGESTED` in
  `ml/external_datasets.yaml`, meaning a table was built from it under
  `data/interim/ml/force2020_litho/` by `scripts/ingest/build_force2020_dataset.py`.
  Every other external candidate remains `PLANNED` in
  `data/ml_task_registry.csv`.
- Three **baseline** models were trained on that table, and nothing beyond them:
  `force2020-litho-rf-v0.1` (Random Forest), `force2020-litho-xgb-v0.1`
  (XGBoost) and `force2020-litho-lgbm-v0.1` (LightGBM), all on the same five
  approved log curves, the same target, the same split and the same metrics. Their
  reports are `reports/force2020_rf_baseline.md` and
  `reports/force2020_gbdt_baseline.md`; their artifacts live under
  `data/interim/ml/force2020_litho/{training,evaluation}` and are gitignored.
- A three-model comparison, `reports/force2020_model_comparison.md`, places them
  side by side. It is derived entirely from the reports above by a script that
  fits nothing and imports no ML library, and it names **no winner**: on macro F1,
  supported-only macro F1 and balanced accuracy the spread between the two
  ten-well partitions exceeds the spread between the three models, and weighted F1
  is the one metric where it does not, which the report states outright.
- **No canonical model was trained.** No model in the table above is trainable on
  `nwis-forge16b-v0.2`, and none has changed status.
- No model family beyond those three tree ensembles: no CNN, neural network or
  any other estimator. No hyperparameter search, no feature selection, no tuning
  of any kind, and the one weighting comparison reported is a single diagnostic
  refit, not a search. `num_class=12` was stated rather than inferred for both
  boosters, so a silently missing rare class could not narrow the output.
- No API endpoint, no frontend, no serving of any model anywhere.
- No FORCE 2020 row, label or file was written into `data/processed/` or
  `data/ml/`, and its 12-class vocabulary was not mapped onto a canonical one.
  `data/processed/` and `data/ml/lithology/lithology.csv` are unchanged.
- No imputation in the stored table: the table keeps empty cells and 0/1 masks.
  The model's imputation happens inside its fitted pipeline, on training rows
  only, and is not written back.
- The competition's published penalty matrix was read from the pinned source and
  used as published (`ml/force2020_penalty_matrix.json`). No homemade or
  approximate substitute was used.
- No label was fabricated, and no label was derived by thresholding a feature
  (rule R6).
- No canonical FORGE file was modified.
- No model was marked ready when it is not, and the baseline is not described as
  the best, optimal or production-ready model anywhere.
