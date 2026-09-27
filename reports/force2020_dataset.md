# FORCE 2020 dataset construction

**Dataset id:** `force2020-litho-logs-v0.1`  
**Source:** FORCE 2020 Machine Learning Competition - lithofacies prediction  
**Pinned commit:** `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`  
**Taxonomy:** `FORCE2020_NPD_LITHOSTRATIGRAPHIC_LITHOFACIES` (version `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`)  
**Licence:** CC-BY-4.0  
**Stage:** dataset construction, QC and split manifest; no model stage entered  
**Canonical dataset:** `nwis-forge16b-v0.2`, untouched

This is dataset construction: a schema, a missing-value convention, a
well-grouped split manifest and a QC report. **No model was trained, no
hyperparameter was tuned, no model was compared, and no accuracy or F1 was
calculated.** Nothing was written to `data/processed/` or `data/ml/`, and
FORCE 2020 was not merged with the FORGE Utah canonical data.

## 1. Input and output

| | |
|---|---|
| Source id | `FORCE2020` |
| Pinned source commit | `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1` |
| Source tables read | `extracted/train.csv`, `hidden_test.csv`, `leaderboard_test_features.csv` |
| Dataset id | `force2020-litho-logs-v0.1` |
| Dataset file | `data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.csv` |
| Manifest | `data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.manifest.json` |
| Exclusion ledger | `data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.exclusions.csv` |
| Split manifest | `data/force2020_split_manifest.csv` |
| Dataset SHA-256 | `5dbbb114e2c543a89ea980c1c9b6d0cdecc12c7acd35112d6da47fa40ce1fbb0` |
| Dataset bytes | 284,657,414 |
| Downloaded by this stage | no |

Grain: one row per (WELL, DEPTH_MD) at source grain. Row order: source-table order (train, hidden_test, leaderboard_test), and within a table the source's own row order. Ledgered exclusions are the only reason a source row is absent, so the nth emitted row of a split is the nth non-excluded source row of that table.

## 2. Schema

20 columns. The numeric feature matrix is exactly 5 columns, `CALI`, `RDEP`, `RMED`, `DTC`, `GR`, plus one 0/1 missing mask per feature. `DEPTH_MD` is present as metadata and is **not** in the feature matrix.

| # | Column | Role | Note |
|--:|---|---|---|
| 1 | `WELL` | `identifier` | NPD well name. The grouping key: the split is a function of this column alone |
| 2 | `DEPTH_MD` | `depth_metadata` | measured depth, m. Carried for analysis and as the join key, and deliberately NOT part of the feature matrix so a depth ablation stays possible |
| 3 | `SOURCE_ID` | `provenance` | 'FORCE2020', from ml/external_datasets.yaml |
| 4 | `SOURCE_COMMIT` | `provenance` | the pinned 40-character source commit this row was read from |
| 5 | `SOURCE_FILE` | `provenance` | the published source file this row came from |
| 6 | `SPLIT` | `provenance` | the well-level split, inherited from WELL, never assigned per row |
| 7 | `SOURCE_SPLIT` | `provenance` | the split name the source itself published, kept separately so this stage's split names cannot be confused with the source's |
| 8 | `TARGET_LABEL_RAW` | `target_raw` | the original NPD lithostratigraphic code exactly as published, never overwritten by the encoded form |
| 9 | `TARGET_CLASS` | `target_raw` | the class name the source publishes for that code, taken from the source's own vocabulary. Not a canonical or FORGE Utah label |
| 10 | `TARGET_ENCODED` | `target_encoded` | deterministic 0-based encoded id for ML, derived from `TARGET_LABEL_RAW` and never in place of it |
| 11 | `CALI` | `feature` | observed value, unit in. Empty when missing; the companion `CALI_MISSING` mask says which, and no substitute value is ever written |
| 12 | `RDEP` | `feature` | observed value, unit ohm.m. Empty when missing; the companion `RDEP_MISSING` mask says which, and no substitute value is ever written |
| 13 | `RMED` | `feature` | observed value, unit ohm.m. Empty when missing; the companion `RMED_MISSING` mask says which, and no substitute value is ever written |
| 14 | `DTC` | `feature` | observed value, unit us/ft. Empty when missing; the companion `DTC_MISSING` mask says which, and no substitute value is ever written |
| 15 | `GR` | `feature` | observed value, unit gAPI. Empty when missing; the companion `GR_MISSING` mask says which, and no substitute value is ever written |
| 16 | `CALI_MISSING` | `feature_mask` | 1 when `CALI` is absent, 0 when it is observed, so a consumer can tell a missing measurement from a measurement without assuming anything about empty cells |
| 17 | `RDEP_MISSING` | `feature_mask` | 1 when `RDEP` is absent, 0 when it is observed, so a consumer can tell a missing measurement from a measurement without assuming anything about empty cells |
| 18 | `RMED_MISSING` | `feature_mask` | 1 when `RMED` is absent, 0 when it is observed, so a consumer can tell a missing measurement from a measurement without assuming anything about empty cells |
| 19 | `DTC_MISSING` | `feature_mask` | 1 when `DTC` is absent, 0 when it is observed, so a consumer can tell a missing measurement from a measurement without assuming anything about empty cells |
| 20 | `GR_MISSING` | `feature_mask` | 1 when `GR` is absent, 0 when it is observed, so a consumer can tell a missing measurement from a measurement without assuming anything about empty cells |

### Source columns deliberately not carried

| Source column | Why it is absent |
|---|---|
| `X_LOC` | not carried at all. Measured to vary with depth inside nearly every well, so it is a borehole-trajectory proxy and a well fingerprint, not a rock measurement |
| `Y_LOC` | same reason as X_LOC: trajectory, not lithology |
| `Z_LOC` | not carried at all. The source's own signed depth column, so it is a depth proxy by construction |
| `GROUP` | not carried at all. NPD lithostratigraphy from the same interpretation campaign that produced the label, so it is label-adjacent and a near-complete stand-in for the target |
| `FORMATION` | label-adjacent on the same grounds as GROUP |
| `FORCE_2020_LITHOFACIES_CONFIDENCE` | not carried at all. A property of the label (1 high, 2 medium, 3 low), so it is an input only to a future weighted loss, never a feature |
| `DEPTH_MD` | carried as metadata, excluded from the feature matrix, so a depth-ablation experiment stays possible |
| `WELL` | the grouping key, not a feature |
| `FORCE_2020_LITHOFACIES_LITHOLOGY` | the target |

## 3. Row and well counts

1,429,694 source rows read, 0 removed by the ledgered rules, 1,429,694 rows written, and that arithmetic reconciles.

| Source table | Rows read | Wells in split | Dataset rows written |
|---|---:|---:|---:|
| `extracted/train.csv` | 1,170,511 | 98 | 1,170,511 |
| `hidden_test.csv` | 122,397 | 10 | 122,397 |
| `leaderboard_test_features.csv` | 136,786 | 10 | 136,786 |
| **total** | **1,429,694** | **118** | **1,429,694** |

| Split | Wells | Rows | Source split | Source file |
|---|---:|---:|---|---|
| `train` | 98 | 1,170,511 | `train.csv` | `extracted/train.csv` |
| `hidden_test` | 10 | 122,397 | `hidden_test.csv` | `hidden_test.csv` |
| `leaderboard_test` | 10 | 136,786 | `leaderboard_test_features.csv` | `leaderboard_test_features.csv` |

## 4. Split manifest and its verification

Unit: **WELL**. Authority: the source's own published partition, verified well-disjoint by the characterization stage and re-verified here from the wells actually emitted into the table.

**Reshuffled: no.** no well was reassigned and no random draw was taken. A random well-level split would discard the source's partition, which is already disjoint, already published, and already the partition the characterization measured class coverage against

| Check | Result |
|---|---|
| Wells in more than one split | 0 |
| Labelled wells with no split | 0 |
| Every labelled row inherits its split from WELL | yes |
| Row counts reconcile per split | yes |

| Split | Rows in split | Sum of its wells' rows | Agrees |
|---|---:|---:|---|
| `train` | 1,170,511 | 1,170,511 | yes |
| `hidden_test` | 122,397 | 122,397 | yes |
| `leaderboard_test` | 136,786 | 136,786 | yes |

### The one join

`leaderboard_test_features.csv` ships without labels, so it is joined to `leaderboard_test_target.csv` on WELL text plus DEPTH_MD as a number, so 480.628 and 480.62800085 are the same depth and differing decimal formatting cannot cause a miss. It is the only split where a missing label is even possible.

| Join measurement | Value |
|---|---:|
| Feature rows | 136,786 |
| Label file rows | 136,786 |
| Distinct label keys | 136,786 |
| Duplicate label keys | 0 |
| Rows emitted for the split | 136,786 |
| Join is exact | yes |
| Every feature row got a label | yes |

leaderboard_test_features.csv ships without labels, and leaderboard_test_target.csv supplies them keyed on (WELL, DEPTH_MD). The two are joined on that key. This is the only place two source files are combined, and it is a join of published tables, not an inference: no value is derived, interpolated or predicted

One row per well is committed to `data/force2020_split_manifest.csv` with columns `WELL`, `SPLIT`, `SOURCE_ID`, `SOURCE_SPLIT`, `SOURCE_DATASET`, `SOURCE_FILE`, `LABEL_SOURCE`, `LABELLED`, `ROWS`, `MIN_MD`, `MAX_MD`, `THICKNESS_M`, `CLASS_COUNT`, `CLASSES_PRESENT`.

## 5. Target classes and encoding

Vocabulary `FORCE2020_NPD_LITHOSTRATIGRAPHIC_LITHOFACIES` is the source's own and is not mapped onto `FORGE_UTAH_16B` (`mapping_to_canonical` is None).

**Encoding rule.** encoded_id is the zero-based rank of the numeric NPD code in ascending numeric order over the source's full declared 12-class vocabulary. It is a pure function of the published class list: it does not depend on row counts, on which classes happen to be common, on file order, or on any random draw

*a frequency-ordered encoding renumbers classes when a class grows, which is a silent change to a published dataset. Ranking the codes is stable under any change to the rows.*

- All 12 source classes preserved: **yes**
- Classes collapsed, merged or renamed: **0**. all 12 source classes are preserved. None was merged, dropped or renamed into the FORGE Utah 16B vocabulary, and none was dropped for being rare. A class a model cannot learn is an evaluation result to report, not a reason to delete it from the dataset
- Original label column: `TARGET_LABEL_RAW`
- Class name column: `TARGET_CLASS`
- Encoded column for ML: `TARGET_ENCODED`

| Encoded id | NPD code | Class | Rows | Share | Wells |
|--:|---:|---|---:|---:|---:|
| 0 | `30000` | Sandstone | 207,030 | 14.481% | 118 |
| 1 | `65000` | Shale | 876,605 | 61.314% | 118 |
| 2 | `65030` | Sandstone/Shale | 180,296 | 12.611% | 117 |
| 3 | `70000` | Limestone | 69,492 | 4.861% | 114 |
| 4 | `70032` | Chalk | 14,043 | 0.982% | 15 |
| 5 | `74000` | Dolomite | 2,391 | 0.167% | 47 |
| 6 | `80000` | Marl | 41,031 | 2.870% | 92 |
| 7 | `86000` | Anhydrite | 1,807 | 0.126% | 10 |
| 8 | `88000` | Halite | 14,711 | 1.029% | 4 |
| 9 | `90000` | Coal | 4,754 | 0.333% | 63 |
| 10 | `93000` | Basement | 103 | 0.007% | 1 |
| 11 | `99000` | Tuff | 17,431 | 1.219% | 67 |

### Class rows and wells by split

| Encoded id | NPD code | Class | train rows | hidden_test rows | leaderboard_test rows | train wells | hidden_test wells | leaderboard_test wells |
|--:|---:|---|---:|---:|---:|---:|---:|---:|
| 0 | `30000` | Sandstone | 168,937 | 14,045 | 24,048 | 98 | 10 | 10 |
| 1 | `65000` | Shale | 720,803 | 71,827 | 83,975 | 98 | 10 | 10 |
| 2 | `65030` | Sandstone/Shale | 150,455 | 12,283 | 17,558 | 97 | 10 | 10 |
| 3 | `70000` | Limestone | 56,320 | 8,374 | 4,798 | 94 | 10 | 10 |
| 4 | `70032` | Chalk | 10,513 | 2,905 | 625 | 11 | 3 | 1 |
| 5 | `74000` | Dolomite | 1,688 | 287 | 416 | 37 | 5 | 5 |
| 6 | `80000` | Marl | 33,329 | 4,396 | 3,306 | 73 | 10 | 9 |
| 7 | `86000` | Anhydrite | 1,085 | 597 | 125 | 6 | 2 | 2 |
| 8 | `88000` | Halite | 8,213 | 6,498 | 0 | 3 | 1 | 0 |
| 9 | `90000` | Coal | 3,820 | 244 | 690 | 51 | 5 | 7 |
| 10 | `93000` | Basement | 103 | 0 | 0 | 1 | 0 | 0 |
| 11 | `99000` | Tuff | 15,245 | 941 | 1,245 | 55 | 6 | 6 |

| Split | Rows | Wells | Classes present |
|---|---:|---:|---:|
| `train` | 1,170,511 | 98 | 12 of 12 |
| `hidden_test` | 122,397 | 10 | 11 of 12 |
| `leaderboard_test` | 136,786 | 10 | 10 of 12 |

Largest class: **Shale** (`65000`), 876,605 rows. Smallest: **Basement** (`93000`), 103 rows. Ratio 8510.7282x. Median class 17,431 rows.

**no class was removed, merged, relabelled or downweighted because it is rare. The rarest class is reported with its row and well counts so the difficulty is visible in advance; a class a model fails to learn is an evaluation result to report, not a reason to delete it from the dataset**

## 6. Missingness

**Source convention.** an empty CSV field. The characterization measured that no cell in any published FORCE 2020 CSV equals a known sentinel, so an empty field is the only way a value is missing in these tables.

| Rule | What it does |
|---|---|
| `empty_cell` | kept as an empty cell. The measurement is not there and no substitute is written, because a substituted constant is indistinguishable from a measurement once it is in a table |
| `sentinel_cell` | kept as an empty cell and counted separately from an empty source field, so a future release that leaks the LAS NULL convention (-999.25) is visible in the counts instead of being read as a resistivity of -999.25 ohm.m |
| `explicit_mask` | each feature has a companion 0/1 column: 1 when the value is absent for any of the reasons above, 0 when it is observed. A consumer can therefore always tell an observed value from a missing one, and can tell a curve that was never logged in a well apart from one that was logged and then dropped inside it, by joining the mask to the well-level missingness already recorded in data/force2020_well_missingness.csv |
| `no_imputation` | no interpolation, no forward fill, no backward fill, no per-well mean or median substitution, no sentinel substitution. Interpolating a log curve manufactures values at exactly the depths where the tool measured nothing, and a model cannot then tell those depths apart |
| `imputation_belongs_in_the_pipeline` | if a model cannot accept a missing value, the imputation is a step inside that model's training pipeline, fitted on training wells only and applied to validation wells. It must not be written back into this table: doing so would leak the validation wells' distribution into the training inputs and would make the table impossible to reproduce from the source |
| `rows_removed_for_missing_target` | removed and written to the exclusion ledger as 'target_unavailable', so a row absent because it had no label is distinguishable from a row absent for any other reason, and from a row whose features are merely incomplete |

*1 = the value is absent, whether the source field was empty or held a sentinel; 0 = the value is observed. A 0 means the cell holds a measurement, so a missing curve can never be read as a zero by a consumer that does not consult the mask.*

| Feature | Observed | Missing | Missing % | Missing via sentinel | Mask column |
|---|---:|---:|---:|---:|---|
| `CALI` | 1,332,729 | 96,965 | 6.78% | 0 | `CALI_MISSING` |
| `RDEP` | 1,418,609 | 11,085 | 0.78% | 0 | `RDEP_MISSING` |
| `RMED` | 1,380,297 | 49,397 | 3.46% | 0 | `RMED_MISSING` |
| `DTC` | 1,343,902 | 85,792 | 6.00% | 0 | `DTC_MISSING` |
| `GR` | 1,429,694 | 0 | 0.00% | 0 | `GR_MISSING` |

### Missingness by feature and split

| Split | Rows | Missing cells | `CALI` missing % | `RDEP` missing % | `RMED` missing % | `DTC` missing % | `GR` missing % |
|---|---:|---:|---:|---:|---:|---:|---:|
| `train` | 1,170,511 | 218,748 | 7.51% | 0.94% | 3.33% | 6.91% | 0.00% |
| `hidden_test` | 122,397 | 17,377 | 2.81% | 0.01% | 8.02% | 3.35% | 0.00% |
| `leaderboard_test` | 136,786 | 7,114 | 4.13% | 0.04% | 0.43% | 0.60% | 0.00% |

Features with no missing rows at all: `GR`.

Sentinel cells: **0**. sentinel cells are the LAS NULL convention surviving into the published CSVs. The characterization measured none, and the count is reported here so a future release that leaks one cannot pass unnoticed.

*the per-split figures are counts of missing cells, not of distinct rows with a gap: a row with two missing features contributes two. The table itself carries one mask per feature, so the distinct-row count is recoverable downstream without re-scanning anything.*

## 7. Rows excluded, and why

| Rule | Rows removed | What the rule does |
|---|---:|---|
| `target_unavailable` | 0 | the target cell is empty, blank or a known sentinel, so there is no supervision signal. A row with no label is not a supervised row, so it is removed rather than kept with a fabricated target. Recorded in the ledger with its source file, source row number, well and depth, so the count is a measurement rather than an assumption |
| `target_code_not_in_source_vocabulary` | 0 | the target cell holds a code that is not one of the 12 the source declares. A 13th class would be either a source error or a real unit the vocabulary does not name, and guessing which would be worse than reporting it. The distinct offending values are listed in the report so the decision can be revisited deliberately |
| `depth_unparseable` | 0 | DEPTH_MD is empty or not a finite number, so the row has no key and cannot be joined to a LAS file, a label file or a well's depth span. The row is removed rather than given a synthetic depth. The key is not sentinel-tested, so a real depth near +999.25 is kept as a key |
| `feature_value_non_numeric` | 0 | a feature cell holds text that is not empty and is not a known sentinel. It cannot be a measurement, and coercing it to a number would invent one. The row is removed and the offending column is counted so the source can be examined |
| `duplicate_well_depth` | 0 | (WELL, DEPTH_MD) was already emitted from an earlier source table or an earlier row. The key is compared numerically, so 494.528 and 494.52800000 are the same depth. The first occurrence in source-table order is kept and later ones are removed, which is deterministic because the table order is fixed |
| **total** | **0** | |

Exclusion rate: 0.0000% of source rows read.

1,429,694 distinct (WELL, DEPTH_MD) keys were emitted, which equals the number of rows written, so the table holds no repeated key.

The full ledger is written to `data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.exclusions.csv`. A row absent because it had no target is distinguishable from a row absent because a feature was not a number, because each carries its own rule name, its source file, its source row number, its well and its depth. A row that is present but has an empty feature is distinguishable from both, because its mask column is 1 rather than because it is missing from the table.

## 8. QC results

| Check | Result | Headline measurements |
|---|---|---|
| `QC01` duplicate (WELL, DEPTH_MD) rows | **pass** | rows_written=1429694, distinct_keys_in_table=1429694, duplicate_keys_in_table=0 |
| `QC02` depth monotonic within well | **pass** | non_monotonic_steps=0, wells_affected=0, wells_checked=118 |
| `QC03` target availability | **pass** | rows_with_a_target=1429694, rows_without_a_target=0, target_is_complete_in_the_dataset=True |
| `QC04` invalid or non-numeric feature values | **pass** | non_numeric_cells=0, cells_by_feature={}, rows_excluded=0 |
| `QC05` missingness by feature and split | **pass** | by_feature=[{'feature': 'CALI', 'observed': 1332729, 'missing': 9696..., by_feature_and_split=[{'split': 'train', 'rows': 1170511, 'wells': 98, 'missin..., sentinel_cells=0 |
| `QC06` class distribution by split | **pass** | reconciles_against_rows_per_split=True, by_split={'train': {'rows': 1170511, 'wells': 98, 'classes_present... |
| `QC07` rows per well and depth span per well | **pass** | wells=118, rows_per_well_min=1734, rows_per_well_median=12216 |
| `QC08` split is well-grouped and well-disjoint | **pass** | wells_in_more_than_one_split={}, wells_without_a_split=[], rows_per_split_check={'train': {'split_rows': 1170511, 'sum_of_well_rows': 117... |
| `QC09` row accounting reconciles | **pass** | source_rows_read=1429694, source_rows_by_table={'extracted/train.csv': 1170511, 'hidden_test.csv': 12239..., rows_excluded=0 |

**`QC01` duplicate (WELL, DEPTH_MD) rows** — rule: a key already emitted is never emitted again; the first occurrence in source-table order wins and any later one goes to the ledger.

the emitted key set is deduplicated by construction, because a key is added to the seen set in the same step that writes its row, so the count of repeated keys in the table is zero by construction rather than by a later cleanup pass. The number of source rows dropped for this reason is 0. The key is compared numerically, so two spellings of the same depth are recognised as one key

**`QC02` depth monotonic within well** — rule: reported, never repaired.

a depth that does not increase is recorded against its well and the row is kept. Depth order does not change what a row contains, so reordering or dropping rows to make the sequence tidy would be a silent edit made for cosmetic reasons. The affected wells are listed above so the question can be asked of the source rather than of this table

**`QC03` target availability** — rule: a row with no usable target is removed and ledgered as 'target_unavailable'; a target outside the declared 12-class vocabulary is removed and ledgered as 'target_code_not_in_source_vocabulary'.

the dataset is a supervised table, so every row in it has a target. Rows that do not are excluded and written to the ledger with their source file, source row number, well and depth, which is what makes 'no rows were dropped' a measurement rather than an assumption. The leaderboard split is the only one whose labels arrive in a separate file, so it is the only one where a missing label is even possible

**`QC04` invalid or non-numeric feature values** — rule: a feature cell that is neither empty nor a sentinel nor a finite number is an error: the row is removed and ledgered as 'feature_value_non_numeric' and the offending column is counted.

the five selected curves are numeric in every published table, so this is expected to be zero and is measured rather than assumed. A non-zero count would mean the source holds text in a log column, and coercing it to a number would invent a measurement

**`QC05` missingness by feature and split** — rule: reported per feature and per split, and never filled.

missingness is a property of the well as much as of the row: a feature absent from a well is absent for all of that well's rows. The per-well, per-curve missing cell counts measured by the characterization stage are committed in data/force2020_well_missingness.csv, so 'not logged in this well' can be separated from 'dropped inside this well' without re-scanning anything. Nothing here is imputed

**`QC06` class distribution by split** — rule: reported, never rebalanced.

all 12 source classes are preserved, class counts by split and the wells containing each class are reported so a modelling decision can be made with the numbers in hand, and nothing is dropped, merged, downweighted or resampled here. Resampling a class into balance belongs in a training pipeline, not in the artifact, because a resampled table is no longer a faithful record of the source

**`QC07` rows per well and depth span per well** — rule: reported per well, never truncated.

every well's row count and depth interval is recorded in the split manifest, so no well can be silently shorter than it should be and no depth window is applied. Truncating wells to a common interval would change the class distribution of every well it touched

**`QC08` split is well-grouped and well-disjoint** — rule: the split is a function of WELL alone.

the split is assigned per well and written onto each row from that well's assignment, so it is impossible for two rows of one well to land in different splits, or for a row to carry no split at all. The per-well assignment is the authority and is committed in data/force2020_split_manifest.csv

**`QC09` row accounting reconciles** — rule: every source row is either written or ledgered, and the two counts add up.

source rows read, minus rows removed by a named rule, equals rows written. A dataset that reconciles is one where nothing vanished between the source and the table

Rules declared but never triggered, because the count was zero: `target_unavailable`, `target_code_not_in_source_vocabulary`, `depth_unparseable`, `feature_value_non_numeric`, `duplicate_well_depth`.

**no anomaly was corrected in place. Every rule above either keeps a row byte-for-byte or removes it with a name in the ledger, and the monotonicity and class-coverage findings are reported rather than acted on**

## 9. Provenance

| Field | Value |
|---|---|
| Source id | `FORCE2020` |
| Pinned source commit | `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1` |
| Taxonomy id | `FORCE2020_NPD_LITHOSTRATIGRAPHIC_LITHOFACIES` |
| Taxonomy version | `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1` |
| Dataset id | `force2020-litho-logs-v0.1` |
| Dataset SHA-256 | `5dbbb114e2c543a89ea980c1c9b6d0cdecc12c7acd35112d6da47fa40ce1fbb0` |
| Per-row provenance columns | `SOURCE_ID`, `SOURCE_COMMIT`, `SOURCE_FILE`, `SPLIT`, `SOURCE_SPLIT` |
| Per-row original target | `TARGET_LABEL_RAW` |
| Source modified | no |

*python scripts/ingest/build_force2020_dataset.py --verify rebuilds the table, the manifest and the split manifest from the source at the pinned commit and fails if any of them differs from what is committed.*

| Source file | Split | Source split | Label source |
|---|---|---|---|
| `extracted/train.csv` | `train` | `train.csv` | same file |
| `hidden_test.csv` | `hidden_test` | `hidden_test.csv` | same file |
| `leaderboard_test_features.csv` | `leaderboard_test` | `leaderboard_test_features.csv` | `leaderboard_test_target.csv` |

## 10. Hard stop

- no model is trained at this stage
- no hyperparameter is tuned at this stage
- no models are compared at this stage
- no accuracy or F1 is calculated at this stage
- no Random Forest, XGBoost or LightGBM artifact is created at this stage
- no CNN code is created at this stage
- no API prediction endpoint is created at this stage
- the stage ends after dataset construction, QC and the split manifest

## 11. Not performed at this stage

- no model of any kind was trained, fitted, tuned, compared or selected
- no hyperparameter search of any kind was run
- no accuracy, F1, recall, precision, log-loss or any other score was computed
- no Random Forest, XGBoost, LightGBM, CNN or other model artifact was created
- no CNN code, window extraction or sequence input was created
- no prediction API, endpoint, service or route was created
- no value was imputed, interpolated, back-filled, smoothed, rolled or windowed
- no gradient, derivative or interpolation-derived feature was created
- no external dataset (Volve, NLOG, BSEE, DGH or any other) was added
- nothing was merged, joined or appended with data/processed/
- FORCE 2020 was not merged with the FORGE Utah canonical data
- no FORCE 2020 class was mapped onto, collapsed into or renamed to the FORGE Utah vocabulary
- no rare class was dropped, merged, relabelled or downweighted
- no write to data/processed/ or data/ml/
- no source byte was modified: the source is read-only and the table is hashed by the manifest
