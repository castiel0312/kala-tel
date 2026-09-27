# FORCE 2020 lithology: three baselines compared

**Stage:** modelling / cross-model comparison

**Status:** Comparison of three untuned baselines. None of them is the best model on this dataset, none is production-ready, and none is deployed or served.

Place the two gradient-boosted tree baselines next to the existing Random Forest baseline on identical data, features, target, split, preprocessing and metrics, and state what the comparison can and cannot support.

## 1. What is held identical

| item | value |
|---|---|
| dataset | `force2020-litho-logs-v0.1` |
| dataset sha256 | `5dbbb114e2c543a8...` |
| features | `CALI`, `RDEP`, `RMED`, `DTC`, `GR` |
| target | `TARGET_ENCODED`, 12 classes, unchanged |
| split | {'train': 98, 'hidden_test': 10, 'leaderboard_test': 10} wells, {'train': 1170511, 'hidden_test': 122397, 'leaderboard_test': 136786} rows |
| split manifest | `data/force2020_split_manifest.csv` (sha256 `d01e93d005c2fdda...`) |
| imputation | median, training wells only |
| metrics | `macro_f1`, `macro_f1_supported_only`, `weighted_f1`, `balanced_accuracy`, `penalty_score` |
| metric code | one shared module, data/ml/common/force2020_lithology.py |
| model selection | none |

What differs, and why:

- The estimator and its fixed configuration. That is the subject of the comparison.
- The class-balancing mechanism. A forest takes class_weight='balanced_subsample'; neither boosting library has that argument, so the same intent is per-row sample weights. Each library was measured, not assumed to behave like the forest.
- LightGBM's deterministic=True and force_row_wise=True, which are reproducibility settings rather than accuracy choices.

## 2. Results

### `hidden_test`

| model | rows | wells | Macro F1 (all 12 classes) | Macro F1 (classes with support) | Weighted F1 | Balanced accuracy | penalty |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random Forest | 122,397 | 10 | 0.3609 | 0.3937 | 0.6636 | 0.4056 | -0.9380 |
| XGBoost | 122,397 | 10 | 0.3288 | 0.3587 | 0.5737 | 0.4348 | -1.3556 |
| LightGBM | 122,397 | 10 | 0.2948 | 0.3216 | 0.5461 | 0.4074 | -1.4662 |

Classes with no rows in this partition: Basement.

### `leaderboard_test`

| model | rows | wells | Macro F1 (all 12 classes) | Macro F1 (classes with support) | Weighted F1 | Balanced accuracy | penalty |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random Forest | 136,786 | 10 | 0.2332 | 0.2798 | 0.6344 | 0.3303 | -1.0418 |
| XGBoost | 136,786 | 10 | 0.1904 | 0.2285 | 0.4989 | 0.3660 | -1.5453 |
| LightGBM | 136,786 | 10 | 0.1646 | 0.1975 | 0.4786 | 0.3229 | -1.6418 |

Classes with no rows in this partition: Halite, Basement.

## 3. Why no model is called best

Each model is scored on two ten-well partitions. For Balanced accuracy, Macro F1 (all 12 classes), Macro F1 (classes with support) the gap between the two partitions, for a single model, is larger than the gap between the three models, so a difference of the size seen here does not distinguish the models: it distinguishes which ten wells were held out. A model that leads on one partition and trails on the other is reporting the wells, not its own quality. No model is called best, and no average across the two partitions is computed, because that average would hide the disagreement it exists to resolve.

| metric | spread between models (max) | spread within a model, between partitions (max) | larger effect |
|---|---:|---:|---|
| Macro F1 (all 12 classes) | 0.0686 | 0.1384 | partition |
| Macro F1 (classes with support) | 0.0823 | 0.1302 | partition |
| Weighted F1 | 0.1559 | 0.0748 | model |
| Balanced accuracy | 0.0431 | 0.0845 | partition |

This is not true of every metric. On Weighted F1 the gap between the models is larger than the gap between the partitions, so that metric does separate the three models more than the partition choice does. It is reported as a difference, not as a ranking, for two reasons: a single number per model on ten wells carries no interval, and weighted F1 is dominated by the two large classes, so it is the metric least able to see the rare classes that account for most of the difficulty in this task. Where the metric and the reading disagree, the reading above is the one that governs.

## 4. Diagnostics

The Random Forest ran the same four fits and its results are in its own report; these are the two boosters'.

### XGBoost

| experiment | features | macro F1 `hidden_test` | macro F1 `leaderboard_test` |
|---|---:|---:|---:|
| Primary: five log curves | 5 | 0.3288 | 0.1904 |
| Depth-only diagnostic | 1 | 0.0630 | 0.0248 |
| Logs plus missingness masks | 10 | 0.3204 | 0.1910 |
| Primary, unweighted refit | 5 | 0.3594 | 0.2530 |

### LightGBM

| experiment | features | macro F1 `hidden_test` | macro F1 `leaderboard_test` |
|---|---:|---:|---:|
| Primary: five log curves | 5 | 0.2948 | 0.1646 |
| Depth-only diagnostic | 1 | 0.0499 | 0.0282 |
| Logs plus missingness masks | 10 | 0.1312 | 0.1029 |
| Primary, unweighted refit | 5 | 0.3142 | 0.2324 |

## 5. Feature importance, as a pattern only

| feature | RF impurity share | XGBoost gain share | LightGBM gain share |
|---|---:|---:|---:|
| `CALI` | 0.1987 | 0.1440 | 0.1213 |
| `RDEP` | 0.1644 | 0.1313 | 0.1037 |
| `RMED` | 0.1593 | 0.1525 | 0.2468 |
| `DTC` | 0.2748 | 0.3370 | 0.1190 |
| `GR` | 0.2029 | 0.2352 | 0.4092 |

The forest's number is mean decrease in impurity; the boosters' is total loss reduction over a different number of trees with a different growth rule. These are three different quantities and are not ranked against each other. Only the pattern is comparable: which curve each model leans on most.

## 6. Limitations

- Three fixed configurations on one dataset. Nothing here bounds how much a tuned model of any of these three families could reach.
- Each model is fitted once on 98 wells. No repeated split, no cross-validation inside the training wells, and therefore no confidence interval on any number here.
- The two evaluation partitions disagree with each other by more than most of the differences between the three models, so small gaps are not interpretable.
- Feature importance is reported per library and is not comparable across the three as a number.
- The comparison covers five log curves. It says nothing about any other feature set, and in particular nothing about a model that uses DEPTH_MD, which the Random Forest stage found to be strong on its own.

## 7. Reproducibility

- Regenerate: `python scripts/reports/build_model_comparison.py`
- Verify: `python scripts/reports/build_model_comparison.py --check`
- Contains timings: no
- Nothing in this report was used to choose anything. It is a description of three fits that were already committed.

