# FORCE 2020 lithology: Random Forest baseline

**Experiment:** `force2020-litho-rf-v0.1`  
**Dataset:** `force2020-litho-logs-v0.1` (sha256 `5dbbb114e2c543a8...`, 1,429,694 rows)  
**Pinned source commit:** `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`  
**Status:** baseline. Not tuned, not the best model, not production-ready, not deployed.  

> This is the Random Forest baseline. It exists to be a reproducible floor that later stages can be measured against, and nothing in this repository should describe it as the best, optimal or production-ready model.

## 1. Dataset

| | |
|---|---|
| Dataset id | `force2020-litho-logs-v0.1` |
| Path | `data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.csv` (read-only for this stage) |
| Rows / wells | 1,429,694 / 118 |
| Grain | one row per (WELL, DEPTH_MD) at source grain |
| Source | FORCE 2020 Machine Learning Competition - lithofacies prediction |
| Pinned commit | `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1` |
| DOI / licence | 10.5281/zenodo.4351156 / CC-BY-4.0 |

This is the logs-only table built by the dataset-construction stage. No row, well,
label or taxonomy was changed here, and nothing was written back to the table.

## 2. Features

**Primary feature matrix: exactly 5 columns.**

- `CALI`
- `RDEP`
- `RMED`
- `DTC`
- `GR`

Excluded, and why:

- `DEPTH_MD` - Carried in the table so a depth diagnostic is possible, and deliberately not a feature of the primary model. Measured separately as a diagnostic.
- `X_LOC, Y_LOC, Z_LOC` - Well trajectory. Not a log, and not a property of the rock.
- `GROUP, FORMATION` - Stratigraphy, which is the label's own vocabulary in another form.
- `mud temperature` - A contextual channel from a different dataset, not part of this logs-only feature set.

Feature selection performed: **False**.

## 3. Target

- Column: `TARGET_ENCODED`, the encoded label from the dataset-construction stage.
- Taxonomy: `FORCE2020_NPD_LITHOSTRATIGRAPHIC_LITHOFACIES`, 12 classes, unchanged.
- Encoding: encoded_id is the zero-based rank of the numeric NPD code in ascending numeric order over the source's full declared 12-class vocabulary. It is a pure function of the published class list: it does not depend on row counts, on which classes happen to be common, on file order, or on any random draw
- Classes merged: 0. Classes removed: 0.
- Mapped to the FORGE Utah vocabulary: **False**.

| encoded | NPD code | class |
|---:|---:|---|
| 0 | 30000 | Sandstone |
| 1 | 65000 | Shale |
| 2 | 65030 | Sandstone/Shale |
| 3 | 70000 | Limestone |
| 4 | 70032 | Chalk |
| 5 | 74000 | Dolomite |
| 6 | 80000 | Marl |
| 7 | 86000 | Anhydrite |
| 8 | 88000 | Halite |
| 9 | 90000 | Coal |
| 10 | 93000 | Basement |
| 11 | 99000 | Tuff |

## 4. Split

- Policy: The split is the source's own published well-level partition, inherited unchanged by the dataset-construction stage. No well is reshuffled, no depth row is reshuffled, and no split is re-derived here.
- Fitted on: `train`. Evaluated on: `hidden_test`, `leaderboard_test`.
- Wells reshuffled: **False**. Row-level random split: **False**.
- Split manifest: `data/force2020_split_manifest.csv` (sha256 `d01e93d005c2fdda...`, 118 wells)

| partition | wells | in fit | in evaluation |
|---|---:|---:|---:|
| `train` | 98 | yes | no |
| `hidden_test` | 10 | no | yes |
| `leaderboard_test` | 10 | no | yes |

Leakage guard, asserted before every score:

- `hidden_test`: 98 fitting wells, 10 evaluation wells, **0 shared**.
- `leaderboard_test`: 98 fitting wells, 10 evaluation wells, **0 shared**.

Neither evaluation partition contributed a single row, a well, a fitted imputation statistic, a class weight or a feature decision. Both were read once, after fitting, to produce the numbers in this report.

## 5. Missing-value handling

- Stored dataset: Unchanged. The table keeps empty cells for absent curve samples and a 0/1 mask per curve, and this stage writes nothing back to it.
- Strategy: `median` inside the pipeline, at `first step of the fitted sklearn Pipeline`.
- Statistics fitted on: the 1,170,511 train rows only.
- Interpolation: none. Neighbouring depth rows used: **False**.
- Per-well statistics: **False**.
- Missingness masks used by the primary model: **False**. They are preserved in the table: `CALI_MISSING`, `RDEP_MISSING`, `RMED_MISSING`, `DTC_MISSING`, `GR_MISSING`.

Medians fitted on the training partition:

| feature | training median |
|---|---:|
| `CALI` | 12.5558 |
| `RDEP` | 1.439 |
| `RMED` | 1.44358 |
| `DTC` | 109.585 |
| `GR` | 68.3676 |

## 6. Model configuration

`sklearn.ensemble.RandomForestClassifier`, scikit-learn 1.4.2, no search of any kind.

| parameter | value |
|---|---|
| `n_estimators` | `100` |
| `max_depth` | `None` |
| `min_samples_split` | `2` |
| `min_samples_leaf` | `5` |
| `max_features` | `sqrt` |
| `class_weight` | `balanced_subsample` |
| `random_state` | `42` |
| `n_jobs` | `-1` |
| imputation | `median` (pipeline step 1, train rows only) |

Deviations from the library defaults, and why:

- **`min_samples_leaf`**: 5 instead of the default 1. Not a tuning choice: a leaf-1 forest at this scale stores about 1.0M nodes per tree for the depth-only diagnostic, and 12 class-count vectors per node, which is about 14 GB of tree arrays for 100 trees and does not fit the 15.7 GB of RAM this ran on. Leaf 5 bounds the same forest at roughly 3.5 GB. Measured, not guessed.
- **`class_weight`**: 'balanced_subsample' instead of None. The training partition's largest class is 6998x its smallest (Shale 720,803 rows vs Basement 103 rows), and the headline metric is macro-averaged, so an unweighted forest would spend its capacity reproducing the majority. Recorded as a decision, not applied silently, and measured against an unweighted refit in the report.
- **`random_state`**: 42, fixed explicitly so the fit is reproducible.
- **`n_jobs`**: -1, all cores. Parallel tree building does not change results when random_state is set.

Feature importances (mean decrease in impurity, impurity-weighted):

| feature | importance |
|---|---:|
| `CALI` | 0.1987 |
| `RDEP` | 0.1644 |
| `RMED` | 0.1593 |
| `DTC` | 0.2748 |
| `GR` | 0.2029 |

## 7. Training support by class

1,170,511 rows, 98 wells.

| encoded | class | train rows | share | weight used |
|---:|---|---:|---:|---:|
| 0 | Sandstone | 168,937 | 14.433% | 0.58 |
| 1 | Shale | 720,803 | 61.580% | 0.14 |
| 2 | Sandstone/Shale | 150,455 | 12.854% | 0.65 |
| 3 | Limestone | 56,320 | 4.812% | 1.73 |
| 4 | Chalk | 10,513 | 0.898% | 9.28 |
| 5 | Dolomite | 1,688 | 0.144% | 57.79 |
| 6 | Marl | 33,329 | 2.847% | 2.93 |
| 7 | Anhydrite | 1,085 | 0.093% | 89.90 |
| 8 | Halite | 8,213 | 0.702% | 11.88 |
| 9 | Coal | 3,820 | 0.326% | 25.53 |
| 10 | Basement | 103 | 0.009% | 947.02 |
| 11 | Tuff | 15,245 | 1.302% | 6.40 |

Largest class Shale, smallest Basement, ratio **6,998:1**.

Missing values per feature in the training partition:

| feature | missing |
|---|---:|
| `CALI` | 7.508% |
| `RDEP` | 0.941% |
| `RMED` | 3.331% |
| `DTC` | 6.908% |
| `GR` | 0.000% |

## 8. Evaluation support by class

| encoded | class | `hidden_test` rows | `leaderboard_test` rows |
|---:|---|---:|---:|
| 0 | Sandstone | 14,045 | 24,048 |
| 1 | Shale | 71,827 | 83,975 |
| 2 | Sandstone/Shale | 12,283 | 17,558 |
| 3 | Limestone | 8,374 | 4,798 |
| 4 | Chalk | 2,905 | 625 |
| 5 | Dolomite | 287 | 416 |
| 6 | Marl | 4,396 | 3,306 |
| 7 | Anhydrite | 597 | 125 |
| 8 | Halite | 6,498 | **0** |
| 9 | Coal | 244 | 690 |
| 10 | Basement | **0** | **0** |
| 11 | Tuff | 941 | 1,245 |

- `hidden_test`: 122,397 rows, 10 wells. Zero support: Basement.
- `leaderboard_test`: 136,786 rows, 10 wells. Zero support: Halite, Basement.

> `hidden_test` has no rows for encoded id(s) [10]. Their precision, recall and F1 are reported as `null`, not as 0, and they still enter the 12-class macro F1 as 0, which is why `macro_f1_supported_only` is reported beside it.

> `leaderboard_test` has no rows for encoded id(s) [8, 10]. Their precision, recall and F1 are reported as `null`, not as 0, and they still enter the 12-class macro F1 as 0, which is why `macro_f1_supported_only` is reported beside it.

## 9. Per-class metrics

### `hidden_test` (122,397 rows, 10 wells)

| encoded | class | support | predicted | precision | recall | F1 |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Sandstone | 14,045 | 15,268 | 0.4600 | 0.5000 | 0.4792 |
| 1 | Shale | 71,827 | 69,786 | 0.8565 | 0.8321 | 0.8441 |
| 2 | Sandstone/Shale | 12,283 | 11,795 | 0.2938 | 0.2821 | 0.2878 |
| 3 | Limestone | 8,374 | 9,879 | 0.2793 | 0.3295 | 0.3023 |
| 4 | Chalk | 2,905 | 609 | 0.6420 | 0.1346 | 0.2225 |
| 5 | Dolomite | 287 | 166 | 0.0482 | 0.0279 | 0.0353 |
| 6 | Marl | 4,396 | 5,655 | 0.0934 | 0.1201 | 0.1051 |
| 7 | Anhydrite | 597 | 592 | 0.6959 | 0.6901 | 0.6930 |
| 8 | Halite | 6,498 | 5,755 | 0.9941 | 0.8804 | 0.9338 |
| 9 | Coal | 244 | 469 | 0.2324 | 0.4467 | 0.3058 |
| 10 | Basement | 0 | 0 | n/a | n/a | n/a |
| 11 | Tuff | 941 | 2,423 | 0.0846 | 0.2179 | 0.1219 |

Penalty-matrix score: **-0.9380** (mean penalty 0.9380, perfect score 0).

### `leaderboard_test` (136,786 rows, 10 wells)

| encoded | class | support | predicted | precision | recall | F1 |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Sandstone | 24,048 | 23,459 | 0.6689 | 0.6525 | 0.6606 |
| 1 | Shale | 83,975 | 68,576 | 0.8391 | 0.6852 | 0.7544 |
| 2 | Sandstone/Shale | 17,558 | 22,907 | 0.2557 | 0.3336 | 0.2895 |
| 3 | Limestone | 4,798 | 9,168 | 0.2260 | 0.4318 | 0.2967 |
| 4 | Chalk | 625 | 379 | 0.1689 | 0.1024 | 0.1275 |
| 5 | Dolomite | 416 | 373 | 0.0027 | 0.0024 | 0.0025 |
| 6 | Marl | 3,306 | 5,858 | 0.1193 | 0.2114 | 0.1526 |
| 7 | Anhydrite | 125 | 39 | 0.0000 | 0.0000 | 0.0000 |
| 8 | Halite | 0 | 26 | 0.0000 | n/a | n/a |
| 9 | Coal | 690 | 1,179 | 0.2706 | 0.4623 | 0.3414 |
| 10 | Basement | 0 | 0 | n/a | n/a | n/a |
| 11 | Tuff | 1,245 | 4,822 | 0.1087 | 0.4209 | 0.1727 |

Penalty-matrix score: **-1.0418** (mean penalty 1.0418, perfect score 0).

## 10. Macro F1

| split | macro F1 (12 classes) | macro F1 (supported only) | classes averaged |
|---|---:|---:|---:|
| `hidden_test` | **0.3609** | 0.3937 | 11 of 12 |
| `leaderboard_test` | **0.2332** | 0.2798 | 10 of 12 |

- 12-class figure: all 12 declared classes, unweighted mean of their F1. A class with zero support in this partition contributes 0, which is scikit-learn's documented behaviour for zero_division=0 and is pessimistic by construction.
- Supported-only figure: the 11 classes that actually occur in this partition, unweighted. This is the macro F1 to quote when a class is missing from a partition, because the other figure charges the model for a class it was never asked about.

The two partitions differ by **0.1277** macro F1 between them. The two partitions are scored by the same model on the same features, so the gap between them is a property of which ten wells landed where, not of the model. Any later stage that reports a single macro F1 without saying which partition it came from is hiding this.

## 11. Weighted F1

| split | weighted F1 | total weight (rows) |
|---|---:|---:|
| `hidden_test` | 0.6636 | 122,397 |
| `leaderboard_test` | 0.6344 | 136,786 |

all 12 declared classes, weighted by their support in this partition. Classes with zero support carry weight 0, so they cannot move the number.

## 12. Balanced accuracy

| split | balanced accuracy | classes in the recall average |
|---|---:|---:|
| `hidden_test` | 0.4056 | 11 |
| `leaderboard_test` | 0.3303 | 10 |

the unweighted mean of recall over the classes present in y_true. scikit-learn excludes classes with no true rows by definition, so this figure is the macro recall of the partition, not of the vocabulary.

## 13. Confusion matrix

### `hidden_test` - rows are the true class, columns the predicted class

| true \ pred | Sandst | Shale | Sandst | Limest | Chalk | Dolomi | Marl | Anhydr | Halite | Coal | Baseme | Tuff | support |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sandstone** | 7,023 | 2,257 | 2,051 | 1,384 | 36 | 7 | 1,163 | 1 | 0 | 9 | 0 | 114 | 14,045 |
| **Shale** | 2,049 | 59,770 | 4,539 | 2,058 | 0 | 93 | 1,789 | 0 | 0 | 262 | 0 | 1,267 | 71,827 |
| **Sandstone/Shale** | 2,272 | 5,034 | 3,465 | 590 | 3 | 2 | 485 | 0 | 0 | 74 | 0 | 358 | 12,283 |
| **Limestone** | 2,337 | 1,007 | 478 | 2,759 | 153 | 21 | 1,467 | 35 | 0 | 15 | 0 | 102 | 8,374 |
| **Chalk** | 659 | 0 | 0 | 1,403 | 391 | 26 | 141 | 0 | 2 | 0 | 0 | 283 | 2,905 |
| **Dolomite** | 15 | 104 | 15 | 15 | 1 | 8 | 12 | 103 | 0 | 0 | 0 | 14 | 287 |
| **Marl** | 580 | 1,197 | 1,082 | 914 | 25 | 0 | 528 | 0 | 0 | 0 | 0 | 70 | 4,396 |
| **Anhydrite** | 9 | 0 | 0 | 112 | 0 | 9 | 23 | 412 | 32 | 0 | 0 | 0 | 597 |
| **Halite** | 102 | 10 | 0 | 624 | 0 | 0 | 0 | 41 | 5,721 | 0 | 0 | 0 | 6,498 |
| **Coal** | 53 | 32 | 35 | 4 | 0 | 0 | 1 | 0 | 0 | 109 | 0 | 10 | 244 |
| **Basement** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tuff** | 169 | 375 | 130 | 16 | 0 | 0 | 46 | 0 | 0 | 0 | 0 | 205 | 941 |

### `leaderboard_test` - rows are the true class, columns the predicted class

| true \ pred | Sandst | Shale | Sandst | Limest | Chalk | Dolomi | Marl | Anhydr | Halite | Coal | Baseme | Tuff | support |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sandstone** | 15,691 | 1,654 | 2,415 | 1,264 | 15 | 162 | 400 | 11 | 0 | 652 | 0 | 1,784 | 24,048 |
| **Shale** | 3,500 | 57,543 | 13,164 | 3,467 | 8 | 189 | 4,036 | 0 | 0 | 75 | 0 | 1,993 | 83,975 |
| **Sandstone/Shale** | 2,787 | 7,807 | 5,858 | 322 | 1 | 2 | 317 | 1 | 0 | 102 | 0 | 361 | 17,558 |
| **Limestone** | 795 | 527 | 611 | 2,072 | 266 | 16 | 308 | 27 | 26 | 1 | 0 | 149 | 4,798 |
| **Chalk** | 0 | 0 | 0 | 559 | 64 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 625 |
| **Dolomite** | 14 | 175 | 49 | 121 | 0 | 1 | 53 | 0 | 0 | 2 | 0 | 1 | 416 |
| **Marl** | 389 | 287 | 587 | 1,285 | 25 | 0 | 699 | 0 | 0 | 25 | 0 | 9 | 3,306 |
| **Anhydrite** | 57 | 34 | 22 | 8 | 0 | 0 | 1 | 0 | 0 | 3 | 0 | 0 | 125 |
| **Halite** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Coal** | 104 | 127 | 124 | 7 | 0 | 0 | 8 | 0 | 0 | 319 | 0 | 1 | 690 |
| **Basement** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tuff** | 122 | 422 | 77 | 63 | 0 | 3 | 34 | 0 | 0 | 0 | 0 | 524 | 1,245 |

Per-class errors are the practical reading of this table: the off-diagonal mass in
each row is what the model confused with that class.

## 14. Depth-only diagnostic

**A depth-only diagnostic, not a lithology model. It exists to measure how much of the task is solvable from depth by itself, which is the number that makes any later logs-only claim meaningful. DEPTH_MD is never combined with the logs in this stage.**

Features: `DEPTH_MD`. Identical configuration otherwise, so the only change is the input.

| split | depth-only macro F1 | depth-only balanced acc. | logs-only macro F1 | delta |
|---|---:|---:|---:|---:|
| `hidden_test` | 0.1108 | 0.1356 | 0.3609 | -0.2501 |
| `leaderboard_test` | 0.0878 | 0.1431 | 0.2332 | -0.1454 |

This is the number that gives the logs-only result its meaning: a depth-only model
recovers part of the task from geometry alone, so a high logs-only score is not
evidence by itself that the curves carry the information. It is also the reason
`DEPTH_MD` is not a feature of the primary model: a logs-only claim needs a logs-only model.

## 15. Missingness-mask diagnostic

**Ablation. An ablation against the primary, and the only two feature sets compared here. The masks are the 0/1 columns the dataset stage already stores; no other feature is added.**

A = `CALI`, `RDEP`, `RMED`, `DTC`, `GR`

B = A + `CALI_MISSING`, `RDEP_MISSING`, `RMED_MISSING`, `DTC_MISSING`, `GR_MISSING`

| split | A: logs only | B: logs + masks | delta | B balanced acc. |
|---|---:|---:|---:|---:|
| `hidden_test` | 0.3609 | 0.3661 | 0.0052 | 0.4085 |
| `leaderboard_test` | 0.2332 | 0.2392 | 0.0061 | 0.3415 |

### Class-weighting diagnostic

**The unweighted refit that settles whether class_weight was necessary. It is a diagnostic, not a candidate configuration: the primary configuration stays the one declared in the report.**

| split | balanced macro F1 | unweighted macro F1 | delta | balanced bal. acc. | unweighted bal. acc. |
|---|---:|---:|---:|---:|---:|
| `hidden_test` | 0.3609 | 0.3569 | 0.0040 | 0.4056 | 0.3543 |
| `leaderboard_test` | 0.2332 | 0.2414 | -0.0083 | 0.3303 | 0.2826 |

The training partition spans 6,998:1 between its largest and smallest class. The headline metric is macro-averaged, and an unweighted forest optimises the majority. balanced_subsample is the Random Forest convention for this: it reweights each bootstrap sample, so the weight is not applied twice to the same row.

Balanced weighting helped on one partition and hurt on the other (`hidden_test` +0.0040, `leaderboard_test` -0.0083), and both moves are smaller than the 0.128 spread between the two partitions' macro F1 themselves. So this comparison does not show class weighting to be necessary: it shows the effect to be small and unstable across ten-well samples. The scheme is retained because it was declared before the fit and recorded as a decision, not because this evidence justifies it. Either way, one configuration on ten-well partitions is evidence about this baseline, not a settled question; the weighting scheme is a hyperparameter like any other and belongs to a later tuning stage.

## 16. Limitations

- This is a baseline. It is the reproducible floor this repository measures later stages against, not a tuned or selected model, and no claim of being the best available model is made or implied.
- The 12-class taxonomy is the source's NPD lithostratigraphic vocabulary, unchanged. It is not the FORGE Utah 16B cuttings vocabulary, and no mapping to it exists or is proposed.
- Two classes are thin in the training partition: Basement (103 rows) and Halite (8,213 rows over three wells). Per-class scores for those classes are estimates from very little data and are reported with their support so they can be discounted.
- Balanced class weights were applied and are recorded. A single unweighted refit is included as a diagnostic, but deciding the weighting scheme properly, like every other hyperparameter, belongs to a later tuning stage that this stage does not enter.
- The evaluation partitions are ten wells each. A well-disjoint score on ten wells has real variance between well sets, and no confidence interval is computed here.
- Predictions are independent per depth row. Real lithology logs are autocorrelated down hole, so the effective sample size is smaller than the row count suggests. No windowing or smoothing was used, and none is proposed, because it would change the feature set this stage was given.
- Missing curves are imputed with a training-median inside the pipeline. A row whose curve is absent therefore looks like a row whose curve sits at the median, which is a known weakness of median imputation rather than a property of the data.
- The penalty score is computed against the published FORCE 2020 matrix, but this table is not the competition's own evaluation set and the score is not comparable to any published leaderboard result.
- No model is deployed, served or integrated anywhere. There is no API endpoint and no frontend change in this stage.

## 17. Reproducibility and provenance

- Entry point: `make train-force2020-rf`. Verification: `make verify-force2020-rf`.
- Artifacts: `data/interim/ml/force2020_litho` (gitignored, regenerated, not committed).
- Committed outputs: `reports/force2020_rf_baseline.json`, `reports/force2020_rf_baseline.md`.
- Extra to install: `pip install -e .[ml]`.
- Source: `FORCE2020` at commit `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`, DOI 10.5281/zenodo.4351156.
- Dataset: sha256 `5dbbb114e2c543a89ea980c1c9b6d0cdecc12c7acd35112d6da47fa40ce1fbb0`.
- Split manifest: `data/force2020_split_manifest.csv`, sha256 `d01e93d005c2fdda88c15bbc4ecca3e276ebe782cc6aacd80c1e1777985d1068`.

| component | version |
|---|---|
| python | 3.11.9 |
| implementation | CPython |
| platform | Windows-10-10.0.26200-SP0 |
| machine | AMD64 |
| cpu_count | 16 |
| scikit_learn | 1.4.2 |
| numpy | 1.26.4 |
| pandas | 2.3.3 |
| joblib | 1.4.2 |

Every estimator carries random_state=42. Refitting on the same table with the same library versions reproduces these metrics exactly; the committed report contains no timings or host-specific values, so a rerun either matches it byte for byte or the table changed.

### Penalty matrix

- Matrix: `force2020_lithology_penalty_matrix` v1, authoritative: **True**, homemade: **False**.
- Values: read the pinned notebook's stored cell output; no value was typed in by hand.
- `penalty_matrix.npy` present in the checkout: **False**. The published values are recorded from the pinned source and committed at `ml/force2020_penalty_matrix.json`.
- Source: `lithology_competition/data/starter_notebook.ipynb` (git blob `de4c9a735465ebeea669bfa94e04625071cc6765`) at pinned commit `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`.
- Formula: `S = -(1/N) * sum_i A[y_true_i, y_pred_i]`, perfect score 0.0.
- This index order is the COMPETITION's, not this repository's encoded target. Map to it through `encoded_to_competition_index` before indexing the matrix, or the score will be a plausible-looking wrong number.
- Symmetric: True, so the notebook's prose and the competition's code agree on direction.

| split | competition score | mean penalty | rows scored |
|---|---:|---:|---:|
| `hidden_test` | -0.9380 | 0.9380 | 122,397 |
| `leaderboard_test` | -1.0418 | 1.0418 | 136,786 |

