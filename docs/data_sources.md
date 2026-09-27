# NWIS Data Sources — Day 1

## Update (this session): GitHub-hosted sources actually ingested
Every GitHub-hosted repo from the user's master link list has now been cloned into
`data/raw/ml_tasks/` (see `data/ml_task_registry.csv` for the `local_path_or_status` column,
which is the ground truth). Some were trimmed to keep the deliverable a reasonable size —
each trimmed folder has its own `TRIMMED_MANIFEST.txt` with the exact `git clone` command to
get the rest. Nothing was fabricated or summarized in place of real data.

Two repo names from the user's list (`STUCKPIPE_2` "Time-Series Stuck Pipe Prediction" and
`LOSTCIRC_1` "Drilling Lost Circulation") were given without a resolvable URL/owner — flagged
`NOT FOUND` in the registry rather than guessed.

**Not ingested — blocked by this sandbox's network allowlist** (Kaggle, Hugging Face, data.gov,
Equinor/Databricks, NLOG, amerigeoss/GDR, DGH NDR all return 403 here): see
`docs/blocked_sources.md` for the full list and exactly how to pull each one from a normal
internet connection instead.

## Ingestion progress (raw data landed so far)
- **Volve F-9A real-time drilling** (Kaggle mirror) — `data/raw/volve/volve_F9A_realtime_drilling.zip`
  (depth-indexed + time-indexed CSVs, 115 columns: ROP/WOB/RPM/torque/hookload/standpipe
  pressure/mud density/trajectory). Raw only — not yet normalized into `data/processed/`.
- **Utah FORGE 78B-32 Daily Drilling Reports** (6/27–7/31) — `data/raw/utah_forge/78B-32-DailyDrillingReports-6-27thru7-31.pdf`
  (93 pages, text-layer extractable). Pason/logs for this well still need to be pulled separately.
- **FORCE 2020 well logs, official source** — `data/raw/force2020/` (gitignored partial clone
  pinned to commit `c8d01ee9`). Confirmed via `FORCE_2020_LITHOFACIES_LITHOLOGY` +
  `X_LOC/Y_LOC/Z_LOC` columns. Status `INSPECTED`; see SOURCE C below.
  The Kaggle mirror of 11 wells is registered as `FORCE2020_KAGGLE` and was **not** downloaded:
  it is redundant with the official source, which is also clearer on licence.
- **DataDRILL paper** (Arifeen et al. 2024) kept for reference only at `docs/reference_papers/` —
  it's documentation, not data; the actual CSVs are on Zenodo (DOI 10.5281/zenodo.12759014) and
  haven't been pulled yet.
- **Not included:** an `XAI_Drilling_Dataset.csv` was checked and rejected — it's a metal-machining/
  CNC drill-bit-wear dataset, wrong domain entirely, not related to oil & gas well drilling.

Still Hour 5 (inspect) → Hour 7 (normalize into `data/processed/`) to go for all three.


Day-1 scope: four primary source families. See `data/source_registry.csv` for the machine-readable version of this table.

## SOURCE A — Volve (Equinor)
**Purpose:** master drilling/time-series + documents + real-world field context.
- ~40,000 files total in the full release; **Day 1 target is 1–3 wells**, not the full set.
- **⚠️ Access method changed:** as of this check, `equinor.com/energy/volve-data-sharing` no longer
  hosts a direct file listing — it now points to the **Databricks Marketplace** (auth/account
  required) or a linked user-guide PDF. Budget time for this on Day 4 (it's not a `curl` job anymore).
- **Fastest Day-1 path instead:** the Kaggle mirror (`imranulhaquenoor/volve-dataset-well-f-9-a`,
  real-time drilling CSV for F-9A) and the Hugging Face DDR dataset
  (`bengsoon/volve_daily_drilling_report`, 1,759 DDR files converted from WITSML to JSON) — both
  pullable via CLI with one command each (see `scripts/ingest/download_sources.sh` Tier 3).
- A CC BY-NC-SA 4.0 parsed real-time CSV mirror also exists (UiS) — **non-commercial use only**,
  keep that licence note attached in `documents.csv` if used.
- Licence (official release): Equinor Open Data Licence (academic/student/research use permitted).

## SOURCE B — Utah FORGE
**Purpose:** high-quality drilling-data source (survey + daily reports + mud logs + Pason + core + reports).
- **Day 1 target:** well 16B(78)-32 — nine public resources including survey, core summary, mud logs, mud-temp logs, DDRs, Pason data, PDFs, end-of-well report.
- Licence: public, CC-BY (data.gov).

## SOURCE C — FORCE 2020
**Purpose:** formation / lithology / well-log layer only — do not force it into the Volve/Utah drilling time-series.
- 118 Norwegian wells: GR, density, neutron, sonic, ROP, mud weight + formation labels, per-sample x/y/z.
- Licence: CC-BY-4.0 (Zenodo deposit 10.5281/zenodo.4351156); upstream NPD logs are NLOD 2.0. The GitHub repository carries no dataset-level LICENSE file.
- **Status: `INGESTED`, not modelled.** The source bytes have been read end to end and pinned to commit `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1` in a local, gitignored partial clone at `data/raw/force2020/`. A logs-only table has been built from it under the gitignored `data/interim/ml/force2020_litho/`; no model has been trained on it.
- Findings: `reports/force2020_inspection.md`, `reports/force2020_characterization.md`, `reports/force2020_dataset.md`, `data/force2020_wells.csv`, `data/force2020_well_missingness.csv`, `data/force2020_split_manifest.csv`. Registry: `FORCE2020` in `ml/external_datasets.yaml`. Rebuild: `make build-force2020-dataset`; check: `make verify-force2020-dataset`.
- Verified contents: 4 semicolon CSVs, 118 well-disjoint wells, 1,429,694 labelled rows, 20 log curves, a 12-class NPD lithostratigraphic lithofacies vocabulary, and a published penalty-matrix metric.
- Built table: 1,429,694 rows, one per (WELL, DEPTH_MD), 5 log features (`CALI`, `RDEP`, `RMED`, `DTC`, `GR`) plus a 0/1 missing mask per feature, no row dropped, no value filled, the source's own well-level split kept unchanged.
- Its label vocabulary is **not** `FORGE_UTAH_16B` and is not mapped to it. No FORCE 2020 row, label or file was written to `data/processed/` or `data/ml/`.

## SOURCE D — BSEE
**Purpose:** large-scale well metadata / spatial source for later nearby-well expansion — **not ingested in bulk on Day 1** (~57,500 API records available).

## Deferred to later days
- **NLOG** (Netherlands): deviation surveys, stratigraphy, logs, reports — European geological expansion layer. URL: https://www.nlog.nl/en/boreholes (web-UI export, no confirmed bulk API yet).
- **BSEE**: well header/spatial database (~57,500 records) at https://www.data.bsee.gov/Main/Well.aspx, plus a raw-data portal at https://www.data.bsee.gov/Main/RawData.aspx — both are query/web-UI driven; no single bulk-download link confirmed yet, so don't script a blind crawl until that's checked by hand.
- **India NDR (DGH)** — see `docs/india_data_stack.md` for the full breakdown; access is restricted, needs registration.

## Additional Utah FORGE wells (beyond the Day-1 pick of 16B(78)-32)
- **78B-32**: daily reports + Pason (1s/10s) + logs — https://catalog.data.gov/dataset/utah-forge-well-78b-32-daily-drilling-reports-and-logs
- **56-32**: drilling data and logs — https://data.amerigeoss.org/dataset/utah-forge-well-56-32-drilling-data-and-logs-64155
- **58-32**: 1 Hz drilling data (via Geothermal Data Repository, gdr.openei.org)
These stay in the "later" tier per the source registry — Day 1 is 16B(78)-32 only.

## WITSML tooling (reference, not data)
- Standard spec: https://energistics.org/witsml-developers-users
- Open-source WITSML API server: https://github.com/hashmapinc/Drillflow — relevant once you're building the eRTMAC-facing ingestion layer (dossier §3.1), not for Day-1 dataset build.
- PDS WITSML/ETP dev docs: https://witsml.pds.technology/docs/getting-started/

## Hazard-specific ML task datasets/repos
These are **not** part of the core canonical schema build — they're baselines/labeled data for
later hazard modeling (kick, stuck pipe, lost circulation, torque/drag). Full list with access
method in `data/ml_task_registry.csv`. Highlights:
- **Petrobras 3W** (https://github.com/petrobras/3W) — the largest public labeled real-world
  undesirable-event dataset (kicks, spurious closures, etc.); useful for validating NWIS's event
  ontology (§8 of the Day-1 plan) against a real labeled benchmark, and as the baseline the NWIS
  dossier's §5.4 evaluation plan should be compared against.
- Stuck-pipe, lost-circulation, and torque/drag repos are single-hazard baselines matching the
  five hazard papers already reviewed (kick/deep-forest, stuck-pipe, overpressure/IWM, torque
  spike/vibration, ROP hybrid-physics-ML) — pull only the ones you're actively benchmarking
  against, per the "don't download everything" rule from Day 1.
- Some entries in the user's list (`NNFS_Project`, the second "stuck pipe" and "lost circulation"
  repos) had ambiguous/unresolved names — flagged `UNVERIFIED` in the registry; inspect before
  relying on them.
