# ML team handoff

Audience: nine developers, each owning one model family, working in parallel
against the same frozen canonical dataset.

Read this first, then `ml/README.md`, then `ml/feature_registry.yaml` and
`ml/label_registry.yaml`, then `data/ml/<your-model>/README.md`.

**The honest summary:** eight of the nine models cannot be trained to a
reportable standard on the current data. The gap is one well and 44 events, not
engineering effort. `lithology` is the only model where honest feature work can
start today, and only after a geology review. `data/ml/common/` is worth
building first because every later model depends on it.

## Shared ground rules

| | |
|---|---|
| Dataset version | `nwis-forge16b-v0.2` |
| Canonical data | `data/processed/*.csv` — **read-only, frozen** |
| Wells | 1 (`FORGE16B7832`) |
| Timestamps | naive local, **no timezone** |
| Units | canonical: m, m/h, kN, rpm, L/min, MPa, m³, g/cm³ |
| Provenance | every feature row: `source` + `data_origin`; every label row: `event_id` + `source_document` + `source_page` |
| Splitter | by `wellbore_id`. Never random. |
| Reporting | per-class precision/recall + confusion matrix. Never accuracy alone. |
| ML dependencies | not declared in `pyproject.toml` by design; use an `ml-extra` extra or your own env |

Reference files:

- `ml/README.md` — units, timestamps, provenance, leakage, evaluation policy
- `ml/feature_registry.yaml` — feature names, units, source columns, `available_now`
- `ml/label_registry.yaml` — label contract per model, status vocabulary, R1–R6
- `reports/ml_training_readiness.md` — per-model readiness with evidence
- `data/ml_task_registry.csv` — external dataset candidates (all `PLANNED`, none downloaded)
- `data/ml/common/README.md` — the shared code you should not rewrite

---

## 1. `mud_loss` — owner: unassigned

- **Objective:** predict mud loss in the minutes before onset.
- **Recommended datasets:** `KICK_3W_PETROBRAS` (Petrobras 3W, 11 event classes) and `KICK_DATADRILL` (Zenodo `10.5281/zenodo.12759014`). Both `PLANNED`.
- **Expected target:** binary, trailing window before a confirmed `MUD_LOSS` onset.
- **Canonical tables:** `drilling_timeseries` (pit_volume, pump_rate, standpipe_pressure, hookload, rop, wob, rpm), `events`, `drilling_runs`, `trajectories`.
- **Required features:** pit_volume, pump_rate, standpipe_pressure, hookload, rop, wob, rpm, rop_ma_15m, pump_rate_ma_15m, spp_ma_15m, d_pump_rate_d_md.
- **Leakage restrictions:** **L3 is the crux** — `pit_volume` *is* the mud loss. Truncate at onset or exclude it and state which. Plus L1, L2.
- **Baseline:** base rate → logistic regression → gradient boosting. Report the base rate.
- **Main model:** gradient boosting (LightGBM/XGBoost) on trailing window features.
- **Advanced model:** sequence model (temporal CNN or transformer) over the trailing 30 min of minute samples, with a masked-input scheme for the 7% of missing channels.
- **Evaluation:** Leave-One-Well-Out once ≥5 wells exist. Per-class PR. Report positive count and well count with every metric.
- **Expected output files:** `data/ml/mud_loss/features/features.csv`, `features/feature_manifest.json`, `labels/labels.csv`, `labels/label_report.md`, `evaluation/metrics.json`, `evaluation/evaluation_report.md`.

**Today:** 1 label. Build the pipeline, not a model.

## 2. `stuck_pipe` — owner: unassigned

- **Objective:** predict stuck pipe before onset from drilling mechanics.
- **Recommended datasets:** `STUCKPIPE_1` (`HaythamElmousalami/Drilling-Stuck-Pipe-Prediction`, `PLANNED`). Verify multi-well and per-sample torque before relying on it.
- **Expected target:** binary, trailing window before a `STUCK_PIPE` onset.
- **Canonical tables:** `drilling_timeseries`, `events`, `trajectories`, `casings`, `drilling_runs`.
- **Required features:** rop, wob, rpm, hookload, rop_ma_5m, rop_ma_15m, rop_std_15m, wob_ma_15m, hookload_ma_15m, on_bottom_fraction_15m, d_rop_d_md, vertical_section, inclination, hole_diameter, casing_shoe_md.
- **Leakage restrictions:** **L3** — ROP and RPM collapse as a consequence of sticking; truncate at onset. **L4** trailing windows only. **L6** features and labels both come from DDR documents; record that the model may learn document style. Do **not** fold `PACK_OFF` into `STUCK_PIPE` silently — it is usually a casing pack-off, `low` confidence.
- **Baseline:** base rate → logistic regression → gradient boosting. A torque-and-drag baseline is **not available** (`torque`/`drag` are null); do not report a comparison you could not run.
- **Main model:** gradient boosting on trailing-window + geometry features.
- **Advanced model:** gradient boosting with hole-condition interaction terms, or a sequence model if torque becomes available.
- **Evaluation:** Leave-One-Well-Out. Per-class PR. Report a confusion matrix; with 11 positives it is illustrative only.
- **Expected output files:** as above under `data/ml/stuck_pipe/`.

**Today:** 11 labels, of which 1 is questionable.

## 3. `kick` — owner: unassigned

- **Objective:** detect formation influx early enough to shut in.
- **Recommended datasets:** `KICK_DATADRILL` (`PLANNED`); `KICK_3W_PETROBRAS` additionally validates the event ontology.
- **Expected target:** binary, trailing window before a confirmed influx onset.
- **Canonical tables:** `drilling_timeseries`, `events`. **Both lack the required channels today.**
- **Required features:** ecd, flow_in, flow_out, gas_total, pit_volume, standpipe_pressure, pump_rate, hookload, wob, and their trailing means. Flow-in/flow-out imbalance is the classical signal and needs both columns.
- **Leakage restrictions:** **L3** — `gas_total` is a consequence of a kick; it is a label source, never a feature. Using it as both is the most common way a kick model reports 0.99 AUC and means nothing. Plus L1, L2, L4.
- **Baseline:** base rate only, until signal exists.
- **Main model:** gradient boosting once gas/flow channels exist.
- **Advanced model:** sequence model over high-rate gas and flow, with a dedicated early-detection metric (time-to-detection) rather than AUC alone.
- **Evaluation:** Leave-One-Well-Out. **Time-to-detection** as the primary metric — a kick model that detects late is not useful.
- **Expected output files:** as above under `data/ml/kick/`.

**Today:** 0 labels and 0 signal columns. Do not relabel `EQUIPMENT_FAILURE` as kick.

## 4. `overpressure` — owner: unassigned

- **Objective:** predict pore pressure / an overpressure margin ahead of the bit.
- **Recommended datasets:** `FORCE2020_LITHO` for the geology side (does **not** supply formation pressure tests — a separate acquisition is needed).
- **Expected target:** regression against measured formation pressure, or a binary overpressure ratio above a registry-fixed threshold.
- **Canonical tables:** `mud_properties` (daily grain only), `reservoirs` (0 rows), `formations` (0 rows), `trajectories`.
- **Required features:** mud_weight_daily (daily grain only — do not broadcast to minute samples), plus external porosity, permeability, shale_volume, sonic, density, resistivity, formation tops.
- **Leakage restrictions:** **L3** — `ecd` is a *measurement* of formation pressure; using it to predict pressure is circular. If used, retitle the target as a *margin*. **L4** normal-pressure trends must be built from shallower offsets only; a two-sided trend over the target interval fits the answer.
- **Baseline:** base rate / mean predictor.
- **Main model:** gradient boosting regression once petrophysical inputs exist.
- **Advanced model:** a two-stage depth-transform + regression stack (predict a normal-pressure trend, then a departure from it), which is the standard formulation.
- **Evaluation:** Leave-One-Well-Out. MAE and R², plus a normal-pressure-trend diagnostic plot. Report in the target pressure unit.
- **Expected output files:** as above under `data/ml/overpressure/`.

**Today:** no ECD, no formation pressure, no porosity. Entirely blocked.

## 5. `torque_spike` — owner: unassigned

- **Objective:** detect abnormal torque-and-drag excursions against a mechanical baseline.
- **Recommended datasets:** `TORQUE_DRAG` (`pro-well-plan/torque_drag`, `PLANNED`) — a **physics simulator, not a labelled dataset**. Useful as the baseline generator.
- **Expected target:** deviation from a mechanical baseline, `|residual| > k * MAD(residual)`, with `k` fixed in the registry before fitting.
- **Canonical tables:** `drilling_timeseries` — `torque` and `drag` are 100% null.
- **Required features:** torque, drag, plus rop/wob/hookload/rpm for the baseline ratio model.
- **Leakage restrictions:** **R6 governs** — a threshold-derived label from a feature the model also sees is circular. Exclude the source feature or state that the model reproduces the threshold. **L4** the baseline is fit on the trailing interval only, and **inside the training fold**.
- **Baseline:** the simulator's own prediction, if it can be configured.
- **Main model:** statistical residual detection (robust MAD threshold) — report as **anomaly detection**, not event prediction.
- **Advanced model:** sequence model over a simulator-augmented torque channel.
- **Evaluation:** precision at the alert rate an operator would actually tolerate. Not AUC.
- **Expected output files:** as above under `data/ml/torque_spike/`.

**Today:** `torque` and `drag` are both 100% null. Note also that the simulator cannot be configured for this well — `bits` is 0 rows and `bha_runs.bha_type` is null.

## 6. `wellbore_instability` — owner: unassigned

- **Objective:** predict hole-condition degradation before it impairs drilling and mud control.
- **Recommended datasets:** caliper/image logs plus multi-well instability reports. No candidate is recorded in `data/ml_task_registry.csv` yet — add one before starting.
- **Expected target:** binary, trailing window before a `WELLBORE_INSTABILITY` or `WASHOUT` onset.
- **Canonical tables:** `drilling_timeseries`, `events`, `trajectories`, `casings`.
- **Required features:** rop, wob, rpm, hookload, their trailing means, vertical_section, inclination, azimuth, dogleg_severity, hole_diameter, casing_shoe_md. **Deviation features matter more than levels** here.
- **Leakage restrictions:** **L3** — a washout changes the effective hole gauge, so post-onset WOB-derived features measure the change rather than predicting it. Truncate at onset. **L2** no `events.severity`/`cause`.
- **Baseline:** base rate → logistic regression → gradient boosting.
- **Main model:** gradient boosting on mechanical deviation features.
- **Advanced model:** change-point detection (e.g. Bayesian online change detection) on the mechanical response, which suits a rare, abrupt-onset event better than point classification.
- **Evaluation:** Leave-One-Well-Out. Per-class PR. A confusion matrix from 2 positives is not an evaluation — say so.
- **Expected output files:** as above under `data/ml/wellbore_instability/`.

**Today:** 2 labels.

## 7. `lithology` — owner: unassigned — **start here**

- **Objective:** classify lithology at depth from drilling response and mud temperature.
- **Recommended datasets:** `FORCE2020_LITHO` (FORCE 2020, `PLANNED`).
- **Expected target:** multiclass lithology at depth, from a **reviewed controlled taxonomy**.
- **Canonical tables:** `lithology` (65 rows), `drilling_timeseries` (124,497), `mud_temperature_depth` (457,104), `trajectories` (428).
- **Required features:** md, tvd, tvdss, inclination, azimuth, vertical_section, mud_temperature_depth, mud_temperature_depth_out, rop_ma_15m, wob_ma_15m, on_bottom_fraction_15m.
- **Leakage restrictions:** **L4** — the `mud_temperature_depth` join is on `md` (not time) and must stay within the survey floor; nearest-neighbour interpolation across a lithology contact assigns the neighbouring rock's temperature to the boundary sample. **L6** both label and temperature features come from the same campaign. Also: `md` is monotonically increasing and can dominate a classifier — validate with an `md`-ablated run.
- **Baseline:** majority class → depth-only classifier. The depth-only baseline is mandatory, because it is the number an `md`-dominated model must beat.
- **Main model:** gradient boosting multiclass on depth + trajectory + mud temperature.
- **Advanced model:** FORCE 2020–style sequence model over a depth-indexed feature window, which is the architecture the community benchmark uses.
- **Evaluation:** macro-F1 and per-class F1, well-grouped. Report class support; a 57-class problem on 65 points cannot be honestly evaluated.
- **Expected output files:** as above under `data/ml/lithology/`, plus a `labels/taxonomy.md` recording the raw-string → class mapping with reviewer and version.

**Prerequisite before any ML work:** build and review the taxonomy. 65 rows contain 57 distinct near-duplicate free-text descriptions. That is a geology task requiring a domain reviewer, and the raw strings must be preserved, never overwritten.

## 8. `cementing` — owner: unassigned

- **Objective:** assess cementing risk and verify job outcomes.
- **Recommended datasets:** machine-readable cement job records with results, multi-well. **No candidate recorded yet** — add one with access method and licence, and confirm the licence permits model training rather than research use only.
- **Expected target:** binary cementing risk, or a classifier over job outcomes.
- **Canonical tables:** `casings` (158 rows, hole geometry), `events` (4 `CEMENT_FAILURE`). **`cement_jobs` is 0 rows** — no slurry density, volume, yield, pump rate, pressure, placement time or result.
- **Required features (available today):** casing_shoe_md, hole_diameter, hole_section, plus rop/wob/rpm/standpipe_pressure/pump_rate/mud_weight_daily over the interval, and `mud_temperature_depth` on `md`. Note `casings.top_tvd` is only 48% populated; do not forward-fill it.
- **Required features (not available):** slurry_density, volume, yield_value, pump_rate, pressure, placement_time, result.
- **Leakage restrictions:** **L2** no `events.severity`/`cause`. **L3** standpipe pressure during placement is the job, not a precursor. **L4** a `mud_temperature_depth` profile spanning a cement top is a post-placement measurement — using it to predict success reads the answer.
- **Baseline:** base rate. Narrow alternative: hole-condition risk for a future casing point.
- **Main model:** gradient boosting on hole geometry + interval mechanics, scoped explicitly to the narrow target.
- **Advanced model:** survival model over time-to-verify, which matches how cementing outcomes are actually recorded.
- **Evaluation:** Leave-One-Well-Out. Per-class PR.
- **Expected output files:** as above under `data/ml/cementing/`.

**Today:** 4 labels and no job records. If you build the narrow hole-condition target, do not call it a cementing model.

## 9. `historical_analogue` — owner: unassigned

- **Objective:** retrieve and rank historically similar wells or intervals.
- **Recommended datasets:** `FORCE2020_LITHO` (FORCE 2020, `PLANNED`) — a multi-well population with curves over depth. Confirm the licence permits derived-feature use.
- **Expected target:** none. Retrieval is unsupervised. Evaluation is by expert judgement against a protocol fixed **before** results are seen, with the annotator recorded.
- **Canonical tables:** `mud_temperature_depth`, `drilling_timeseries`, `trajectories`. **1 well.**
- **Required features (real model):** gamma, density, neutron, resistivity, photoelectric, md, tvd, tvdss, trajectory, formation tops, bit/BHA identity. Only md/tvd/tvdss and trajectory exist today; `bits` and `formations` are 0 rows.
- **Leakage restrictions:** **L1/L5** — if the retrieval index is built over the whole well and evaluated on intervals from that same well, the index has seen the answer; build it inside the fold. **L6** — `source_document` is a strong fingerprint, so two intervals from one daily report look artificially similar. Exclude it or report per-document.
- **Baseline:** nearest neighbour on a standardised subset of the available features.
- **Main model:** DTW or a learned embedding over depth-indexed feature windows, with cosine retrieval.
- **Advanced model:** a contrastive embedding trained across wells, then retrieval in embedding space.
- **Evaluation:** expert-ranked relevance@k with a recorded annotator and a pre-registered protocol.
- **Expected output files:** as above under `data/ml/historical_analogue/`.

**Today:** structurally impossible — 1 well means nothing to be analogous to. A second FORGE well would not help; it is a geothermal well and geothermal similarity is not oil-well guidance. A legitimate near-term deliverable is **intra-well interval similarity** (segment FORGE by `mud_temperature_depth` and mechanical change points, retrieve similar intervals within the well), reported in those words.

---

## Definition of done, per model

1. `features/feature_manifest.json` — every feature with unit, source table, source column, null rate, and `available_now`.
2. `features/features.csv` — carries `source` and `data_origin` on every row.
3. `labels/labels.csv` — carries `event_id`, `source_document`, `source_page`, `data_origin`.
4. `labels/label_report.md` — positive count, negative count, wells, window definition, how negatives were justified (R4).
5. `training/` — the grouped splitter from `data/ml/common/`, preprocessing inside the fold, fixed seed.
6. `evaluation/metrics.json` — per-class precision/recall/F1, confusion matrix, well count, positive count, split definition.
7. `evaluation/evaluation_report.md` — the above in prose, **including** the base rate and the number of wells. If wells < 5, the report must state that the score is a pipeline check, not a performance claim.
8. `pytest tests/test_ml_scaffolding.py` and `make check` pass.

## Definition of not done

- A reported performance number from fewer than 5 wells without the caveat attached.
- Accuracy as the headline metric for an imbalanced hazard label.
- A label derived by thresholding a feature the model also consumes (R6).
- A feature that reads any `events` column (L2).
- A centred rolling window (L4).
- A random split (L5).
- An external dataset downloaded without recording it in `data/ml_task_registry.csv` with its access method, licence and `ingestion_status`.
- Any claim of oil-well predictive performance. This dataset is `PUBLIC_REAL` geothermal data.
