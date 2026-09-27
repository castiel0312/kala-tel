# FORCE 2020 source inspection

**Source:** FORCE 2020 Machine Learning Competition - lithofacies prediction  
**Repository:** https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition  
**Pinned commit:** `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`  
**Archive DOI:** 10.5281/zenodo.4351156 (concept 10.5281/zenodo.4351155)  
**Downloaded:** 2026-09-26  
**Licence:** CC-BY-4.0 — Zenodo record 10.5281/zenodo.4351156 (published 2020-12-18) declares license cc-by-4.0 for the whole deposit  
**Citation:** Bormann P., Aursand P., Dilib F., Dischington P., Manral S. 2020. FORCE Machine Learning Competition. https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition

This is an inspection of the source bytes. No dataset was built, no
model was trained, and nothing here was written to `data/processed/` or
`data/ml/`. FORCE 2020 is an external supervised dataset with its own
lithofacies vocabulary; it is not an extension of the NWIS canonical
dataset (`nwis-forge16b-v0.2`, untouched).

## Files

Blob ids come from the pinned commit, so this table is identical on every
machine. `—` means the file is not in the source tree. `fetched` says
whether this checkout holds the file, which is a property of the local
sparse checkout and not of the source.

| Path | Bytes | Git blob id | Fetched |
|---|---:|---|---|
| `lithology_competition/data/hidden_test.csv` | 30,292,497 | `2c6adce79789ee9a0f09a1b3f664be0422023a4f` | yes |
| `lithology_competition/data/las_files_Lithostrat_data/readme.md` | 1 | `8b137891791fe96927ad78e64b0aad7bded08bdc` | yes |
| `lithology_competition/data/leaderboard_test_features.csv` | 31,688,732 | `7153017194f89b36ab17b37ff2079adbdc18cee5` | yes |
| `lithology_competition/data/leaderboard_test_target.csv` | 3,694,123 | `50ff419e342f06b58566ef4c41c236f721522b4a` | yes |
| `lithology_competition/data/penalty_matrix.npy` | 1,280 | `b96178eb8d3287c36061f595f63ea454cb9ee891` | no |
| `lithology_competition/data/starter_notebook.ipynb` | 367,026 | `de4c9a735465ebeea669bfa94e04625071cc6765` | yes |
| `lithology_competition/data/test_code.py` | 1,172 | `44e609771eec514a7a26bd76dfb6d7a01c1bc7fd` | yes |
| `lithology_competition/data/train.zip!train.csv` | 280,485,502 | `—` | yes |
| `lithology_competition/data/train.zip` | 91,653,972 | `e1c846321d64388af6d971e8626cabd2e8b22f36` | yes |
| `readme.md` | 4,534 | `ffd385e9f9a7dd5fa5f9b4b1435aaff40c62de6b` | yes |
| `technical_retrospective_force 2020 lithofacies competition.pdf` | 207,367 | `4d189bbf18d8949115e1cce9e05c1e8edf651cb7` | yes |
| `lithology_competition/data/extracted/train.csv` | — | `—` | yes |
| `lithology_competition/data/las_files_Lithostrat_data/*.las` | 617,684,457 | 118 blobs | 1 of 118 |

## Tables

| Table | Role | Rows | Wells | Labelled |
|---|---|---:|---:|---:|
| `train.csv` | labelled competition training split, distributed as train.zip | 1,170,511 | 98 | yes |
| `hidden_test.csv` | competition final-scoring split, features AND labels published together after the contest | 122,397 | 10 | yes |
| `leaderboard_test_features.csv` | competition open-leaderboard split, features only, no labels | 136,786 | 10 | no |
| `leaderboard_test_target.csv` | labels for leaderboard_test_features, released after the contest, keyed on (WELL, DEPTH_MD) | 136,786 | 10 | yes |

Delimiter is `;` in every published CSV. Labelled rows available in total: **1,429,694** across **118** wells, with 0 wells shared between splits.

## Target

- Target column: **`FORCE_2020_LITHOFACIES_LITHOLOGY`**
- `FORCE_2020_LITHOFACIES_LITHOLOGY`: NPD lithostratigraphic lithofacies class assigned to the depth sample. 12 classes, encoded as NPD lithostratigraphy codes.
- `FORCE_2020_LITHOFACIES_CONFIDENCE`: Organizer confidence in the interpretation at that depth: 1 = high, 2 = medium, 3 = low. Source-declared; blank on a small number of samples.
- Vocabulary: FORCE 2020 / NPD lithostratigraphic lithofacies — 12 classes, distinct from the FORGE Utah 16B cuttings vocabulary

## Class distribution — train

| Code | Lithofacies | Rows | Share | Wells |
|---:|---|---:|---:|---:|
| 65000 | Shale | 720,803 | 61.580% | 98 |
| 30000 | Sandstone | 168,937 | 14.433% | 98 |
| 65030 | Sandstone/Shale | 150,455 | 12.854% | 97 |
| 70000 | Limestone | 56,320 | 4.812% | 94 |
| 80000 | Marl | 33,329 | 2.847% | 73 |
| 99000 | Tuff | 15,245 | 1.302% | 55 |
| 70032 | Chalk | 10,513 | 0.898% | 11 |
| 88000 | Halite | 8,213 | 0.702% | 3 |
| 90000 | Coal | 3,820 | 0.326% | 51 |
| 74000 | Dolomite | 1,688 | 0.144% | 37 |
| 86000 | Anhydrite | 1,085 | 0.093% | 6 |
| 93000 | Basement | 103 | 0.009% | 1 |
| | **total** | **1,170,511** | 100% | |

## Class distribution — hidden_test

| Code | Lithofacies | Rows | Share | Wells |
|---:|---|---:|---:|---:|
| 65000 | Shale | 71,827 | 58.684% | 10 |
| 30000 | Sandstone | 14,045 | 11.475% | 10 |
| 65030 | Sandstone/Shale | 12,283 | 10.035% | 10 |
| 70000 | Limestone | 8,374 | 6.842% | 10 |
| 88000 | Halite | 6,498 | 5.309% | 1 |
| 80000 | Marl | 4,396 | 3.592% | 10 |
| 70032 | Chalk | 2,905 | 2.373% | 3 |
| 99000 | Tuff | 941 | 0.769% | 6 |
| 86000 | Anhydrite | 597 | 0.488% | 2 |
| 74000 | Dolomite | 287 | 0.234% | 5 |
| 90000 | Coal | 244 | 0.199% | 5 |
| | **total** | **122,397** | 100% | |

## Class distribution — leaderboard_test_target

| Code | Lithofacies | Rows | Share | Wells |
|---:|---|---:|---:|---:|
| 65000 | Shale | 83,975 | 61.392% | 10 |
| 30000 | Sandstone | 24,048 | 17.581% | 10 |
| 65030 | Sandstone/Shale | 17,558 | 12.836% | 10 |
| 70000 | Limestone | 4,798 | 3.508% | 10 |
| 80000 | Marl | 3,306 | 2.417% | 9 |
| 99000 | Tuff | 1,245 | 0.910% | 6 |
| 90000 | Coal | 690 | 0.504% | 7 |
| 70032 | Chalk | 625 | 0.457% | 1 |
| 74000 | Dolomite | 416 | 0.304% | 5 |
| 86000 | Anhydrite | 125 | 0.091% | 2 |
| | **total** | **136,786** | 100% | |

## Columns and missingness — train.csv

`wells with data` counts wells with at least one non-null, non-sentinel
value for that column, which separates 'not logged' from 'not measured'.

| Column | Role | Unit | Null rows | Null share | Wells with data |
|---|---|---|---:|---:|---:|
| `WELL` | well_identifier | — | 0 | 0.00% | 98/98 |
| `DEPTH_MD` | depth | — | 0 | 0.00% | 98/98 |
| `X_LOC` | location | — | 10,775 | 0.92% | 98/98 |
| `Y_LOC` | location | — | 10,775 | 0.92% | 98/98 |
| `Z_LOC` | location | — | 10,775 | 0.92% | 98/98 |
| `GROUP` | stratigraphy | — | 1,278 | 0.11% | 98/98 |
| `FORMATION` | stratigraphy | — | 136,994 | 11.70% | 98/98 |
| `CALI` | log_curve | in | 87,877 | 7.51% | 97/98 |
| `RSHA` | log_curve | ohm.m | 539,861 | 46.12% | 74/98 |
| `RMED` | log_curve | ohm.m | 38,993 | 3.33% | 97/98 |
| `RDEP` | log_curve | ohm.m | 11,015 | 0.94% | 98/98 |
| `RHOB` | log_curve | g/cm3 | 161,269 | 13.78% | 98/98 |
| `GR` | log_curve | gAPI | 0 | 0.00% | 98/98 |
| `SGR` | log_curve | gAPI | 1,101,158 | 94.08% | 13/98 |
| `NPHI` | log_curve | m3/m3 | 405,102 | 34.61% | 98/98 |
| `PEF` | log_curve | b/e | 498,819 | 42.62% | 69/98 |
| `DTC` | log_curve | us/ft | 80,863 | 6.91% | 98/98 |
| `SP` | log_curve | mV | 306,264 | 26.16% | 68/98 |
| `BS` | log_curve | in | 487,854 | 41.68% | 69/98 |
| `ROP` | log_curve | m/h | 635,440 | 54.29% | 53/98 |
| `DTS` | log_curve | us/ft | 995,898 | 85.08% | 32/98 |
| `DCAL` | log_curve | in | 871,678 | 74.47% | 22/98 |
| `DRHO` | log_curve | g/cm3 | 182,654 | 15.60% | 95/98 |
| `MUDWEIGHT` | log_curve | g/cm3 | 854,360 | 72.99% | 28/98 |
| `RMIC` | log_curve | ohm.m | 994,351 | 84.95% | 27/98 |
| `ROPA` | log_curve | — | 978,186 | 83.57% | 25/98 |
| `RXO` | log_curve | ohm.m | 843,084 | 72.03% | 38/98 |
| `FORCE_2020_LITHOFACIES_LITHOLOGY` | target | — | 0 | 0.00% | 98/98 |
| `FORCE_2020_LITHOFACIES_CONFIDENCE` | target_metadata | — | 179 | 0.02% | 98/98 |

## Missing-value conventions

- **CSV:** empty field. the source's own notebook reads these as NaN; a blank is a missing measurement, never a zero
- **LAS:** `NULL` in the `~Well` header, observed values [-999.25].
- **Residual sentinels in the CSVs:** 1 column(s) affected. a small number of numeric cells sit on the LAS null value after the source's own resampling. Reported, not removed: any cleaning decision belongs to the transform stage and must be recorded when it happens.

## Observations

- Wells: 118 distinct NPD well names across the three published splits (98 train, 10 hidden_test, 10 leaderboard_test). The three splits share no well, so the source itself supplies a well-disjoint partition.
- Depth sampling in train.csv is regular at 0.152 m (0.4987 ft) for 1170276 of 1170511 steps, so the source resampled the logs onto a fixed grid before publishing the CSVs. The LAS files carry their original sampling.
- DEPTH_MD is strictly increasing within every well.
- Guaranteed-present columns as published: DEPTH_MD, GR. Every other column is nullable and the source states the test splits have the same distribution of availability. Availability is reported per curve as 'wells with data', because a curve logged in only a few wells is mostly null for that reason alone, not because of per-row dropout.
- Least-populated curves in train.csv: SGR 94.1% null; DTS 85.1% null; RMIC 85.0% null; ROPA 83.6% null; DCAL 74.5% null; MUDWEIGHT 73.0% null. Missingness is a property of the well, not noise: a curve missing in 95% of rows is missing because those wells were never logged with it.
- Curve availability is a property of the well, not of the row: the JSON records wells_with_data per curve, so a curve logged in only a few wells shows a high null fraction for that reason alone. The starter notebook plots the same per-well view. No imputation, curve-dropping or resampling decision is made at this stage.
- Classes confined to very few wells: Halite (88000) 8213 rows in 3 well(s); Basement (93000) 103 rows in 1 well(s). Under the well-grouped policy these classes cannot be evaluated by leave-one-well-out: a fold that holds out the only well containing them has no positives.
- LAS convention, from 32_2-1.las (LAS 2.0, WRAP=NO, WELL='32/2-1', UWI='32/2-1'): NULL=-999.25, STRT=379.0676, STOP=1300.0208, STEP=0.152, 21 curves. Depth unit is m in the ~Well header, and the LAS step of 0.152 m matches the depth step of the published CSVs, so the CSVs are a resampling of these logs rather than an independent measurement.
- The LAS ~Curve section lists the label column(s) ['FORCE_2020_LITHOFACIES_CONFIDENCE', 'FORCE_2020_LITHOFACIES_LITHOLOGY'] alongside the log curves, so a LAS-based transform must drop them explicitly rather than assume a LAS file holds no labels. This is the same label, not an extra annotation.
- All 1 LAS header(s) read carry a WELL value that matches both the well name implied by the filename and a WELL value in the CSVs, so the identifier is consistent across both formats for the LAS subset inspected. The full 118-file LAS set was not fetched, so this is verified for a subset only.
- LAS coverage: 118 .las files in the source commit (617,684,457 bytes) per git tree of the pinned commit; 1 header(s) read in this pass and 1,667,872 bytes present locally, because the local checkout is sparse. The full LAS set is not required for the CSV tables and was deliberately not ingested.
- Published label columns: the source released labels for train.csv and hidden_test.csv, and for leaderboard_test_features.csv only as a separate (WELL, DEPTH_MD) key file. The open-leaderboard feature file itself carries no label column.
- Scoring protocol: the competition metric is a geologically motivated penalty matrix, not accuracy or F1 (test_code.py loads penalty_matrix.npy). The retrospective records that no top team optimised the penalty matrix directly. An evaluation that reports accuracy on this dataset is not comparable to the published results.
- Label-adjacent columns: GROUP and FORMATION are NPD lithostratigraphy assigned by the same interpretation campaign that produced the lithofacies label. They are candidates for the L6 leakage rule and are flagged, not used and not dropped, at this stage.
- The starter notebook states the training split has 83 wells. The train.csv published at the pinned commit has 98. The notebook prose is stale; the file is the authority and the well count in this report is measured from the file.

## Not performed at this stage

- no model of any kind was trained, fitted or evaluated
- no interpolation, resampling or depth re-binning was performed
- no rolling, windowed, gradient or convolutional feature was created
- no CNN window extraction
- no feature table and no label table were written
- no join, merge or append with data/processed/ (the NWIS canonical dataset)
- no FORCE 2020 label was mapped into the FORGE Utah mineral vocabulary
- no write to data/processed/ or data/ml/
