# FORCE 2020 lithology: gradient-boosted tree baselines

**Models:** XGBoost, LightGBM
**Dataset:** `force2020-litho-logs-v0.1` (sha256 `5dbbb114e2c543a8...`, 1,429,694 rows)
**Pinned source commit:** `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`
**Status:** baseline comparison stage. Neither model is tuned, and neither is the best model on this dataset. Not production-ready, not deployed, not served.

> Compare two gradient-boosted tree models against the existing Random Forest baseline on identical data, features, target, split, preprocessing and metrics. The comparison is the deliverable; neither model is being proposed as a replacement for anything.

> Comparison against the existing Random Forest baseline (`reports/force2020_rf_baseline.md`): hidden_test macro F1 0.3609, leaderboard_test macro F1 0.2332. That forest result is the fixed reference; it was not refitted to make this comparison easier or harder.

## 1. What is held identical

A comparison between model families is only worth reading if everything except the model is the same. Held identical to the Random Forest baseline:

- Dataset: force2020-litho-logs-v0.1, the same pinned commit and the same file, read read-only.
- Features: CALI, RDEP, RMED, DTC, GR. No DEPTH_MD, no X_LOC/Y_LOC/Z_LOC, no GROUP or FORMATION, no mud temperature, no FORGE Utah lithology, no derived rolling features, no gradients, no windows.
- Target: TARGET_ENCODED, the 12-class encoded target from the dataset-construction stage. No class merged, removed or remapped.
- Split: the source's own 98 / 10 / 10 well partition, unchanged. No well or row reshuffled.
- Missing values: SimpleImputer(strategy='median') as the first step of a fitted sklearn Pipeline, statistics from the 98 training wells only. No interpolation, no per-well statistic, and the stored dataset is not modified.
- Metrics: the functions in data/ml/common/force2020_lithology.py, imported rather than reimplemented, including the published penalty matrix in the competition's own index order.
- Artifact location: the gitignored interim root, one stem per model, with a full experiment manifest.

What differs, and why:

- The estimator and its documented configuration, which is the subject of the comparison.
- The class-weighting mechanism. A forest takes class_weight='balanced_subsample'; neither boosting library has that argument, so the same intent is expressed as per-row sample weights. Measured per library, not carried over from the forest.
- The deterministic settings. LightGBM needs deterministic=True and force_row_wise=True to reproduce this report byte for byte; that is reproducibility, not accuracy.

## 2. Dataset

| | |
|---|---|
| Dataset id | `force2020-litho-logs-v0.1` |
| Path | `data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.csv` (read-only for this stage) |
| sha256 | `5dbbb114e2c543a89ea980c1c9b6d0cdecc12c7acd35112d6da47fa40ce1fbb0` |
| Rows / wells | 1,429,694 / 118 |
| Grain | one row per (WELL, DEPTH_MD) at source grain |
| Pinned commit | `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1` |

The table is re-hashed after fitting and compared with its own manifest. A mismatch aborts the report, because this stage does not write to it, so a mismatch means something else did.

## 3. Features

**Primary feature matrix: exactly 5 columns, the same five the Random Forest baseline used.**

- `CALI`
- `RDEP`
- `RMED`
- `DTC`
- `GR`

Excluded, and why:

- `DEPTH_MD` - Carried in the table so a depth diagnostic is possible, and deliberately not a feature of the primary experiment. Measured separately as a diagnostic.
- `X_LOC, Y_LOC, Z_LOC` - Well trajectory. Not a log, and not a property of the rock.
- `GROUP, FORMATION` - Stratigraphy, which is the label's own vocabulary in another form.
- `mud temperature` - A contextual channel from a different dataset, not part of this logs-only set.
- `rolling or windowed features` - Not added. This stage compares two estimators on the same five columns the Random Forest baseline used; a window would change the feature set and make the comparison a comparison of something else.
- `gradients` - Not added, for the same reason.

Feature selection performed: **False**. Derived features added: **0**.

## 4. Target

- Column: `TARGET_ENCODED`, the encoded target from the dataset-construction stage.
- Taxonomy: `FORCE2020_NPD_LITHOSTRATIGRAPHIC_LITHOFACIES`, 12 classes, unchanged.
- Classes merged: 0. Classes removed: 0.
- Mapped to the FORGE Utah vocabulary: **False**.

encoded_id is the zero-based rank of the numeric NPD code in ascending numeric order over the source's full declared 12-class vocabulary, inherited unchanged from the dataset-construction stage.

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

No class is merged, dropped, relabelled or reweighted out of the vocabulary. Both libraries are asked for all 12 classes explicitly and the fitted boosters are checked after fitting to confirm they carry 12.

## 5. Split

- Policy: The source's own published well-level partition, inherited unchanged. No well is reshuffled, no depth row is reshuffled, and no split is re-derived here.
- Fitted on: `train`. Evaluated on: `hidden_test`, `leaderboard_test`.
- Wells reshuffled: **False**. Row-level random split: **False**.
- Split manifest: `data/force2020_split_manifest.csv` (sha256 `d01e93d005c2fdda...`)

| partition | rows | wells | in fit | in evaluation |
|---|---:|---:|---|---|
| `train` | 1,170,511 | 98 | yes | no |
| `hidden_test` | 122,397 | 10 | no | yes |
| `leaderboard_test` | 136,786 | 10 | no | yes |

Leakage guard, asserted before every score:

- `hidden_test`: 98 fitting wells, 10 evaluation wells, **0 shared**.
- `leaderboard_test`: 98 fitting wells, 10 evaluation wells, **0 shared**.

Neither evaluation partition contributed a row, a well, a sample weight, a fitted imputation statistic or a configuration decision.

## 6. Missing-value handling

- Stored dataset: Unchanged. The table keeps its empty cells and its 0/1 missingness masks, and this stage writes nothing back to it.
- Strategy: `median` first step of the fitted sklearn Pipeline.
- Fitted on: the 98 training wells only.
- Interpolation: None. Neighbouring depth rows used: **False**.
- Per-well statistics: **False**.
- Missingness masks in the primary experiment: **False**. They are preserved in the table and measured in the ablation.

SimpleImputer(strategy='median') is the first step of the fitted sklearn Pipeline, fitted by Pipeline.fit on the 98 training wells only. The median is one number per curve over 1,170,511 training rows and is recorded in the training config. No interpolation, no neighbouring depth rows, no per-well statistic, no statistic from either evaluation partition. The stored dataset is not modified: it keeps its empty cells and its 0/1 missingness masks, and the imputation happens in memory at fit time. The five masks are preserved in the table and measured in the ablation; they are not in the primary comparison.

## 7. Class imbalance and sample weighting

Training partition: 1,170,511 rows, largest class (1) to smallest (10) is **6,998:1**.

The same philosophy as the Random Forest baseline: rebalance so that a macro-averaged metric is optimisable rather than letting a 6,998:1 imbalance decide the answer. The mechanism is necessarily different, and whether it was necessary is measured per model rather than assumed.

balanced_subsample is not simply copied across. A forest recomputes class weights inside every bootstrap sample; a booster applies one fixed weight per row. The two are not the same estimator behaviour, so each boosted model is also fitted unweighted and the difference is reported.

Balanced per-row sample weights, w_c = n / (K * count_c), computed from the training partition's class counts only, where n = 1,170,511 and K = 12. Neither XGBoost nor LightGBM exposes a `class_weight` argument, so the balancing the Random Forest baseline expresses as class_weight='balanced_subsample' is expressed here as one fixed weight per row. Two mechanisms, one intent: neither evaluation partition contributes a count, a weight or a fitted statistic. This is not assumed to be the right choice for a boosted tree: a single unweighted refit of each model is reported beside it so the effect is measured, and it is measured per library rather than carried over from the forest.

## 8. What was not done

- Model selection performed: **False**. Evaluation partitions used for selection: **False**.
- No model selection was performed, so no evaluation partition was used to choose anything. The two configurations were fixed before fitting, from each library's documented defaults plus the changes recorded as deviations, and the hidden_test and leaderboard_test partitions were read once per model, after fitting, to produce the reported numbers. No hyperparameter search, no cross-validation, no feature selection and no early stopping on an evaluation partition. Well-grouped cross-validation inside the 98 training wells is the sanctioned tool if a future stage needs to select anything, and it is deliberately not exercised here.
- No hyperparameter search, no early stopping, no feature selection, no threshold tuning.
- No model is called best, optimal or production-ready anywhere in this report.

## 9. Model configuration

### XGBoost (`force2020-litho-xgb-v0.1`)

`xgboost.XGBClassifier`, xgboost 2.0.3, no search of any kind.

| parameter | value |
|---|---|
| `n_estimators` | `500` |
| `max_depth` | `6` |
| `learning_rate` | `0.1` |
| `subsample` | `1.0` |
| `colsample_bytree` | `1.0` |
| `min_child_weight` | `1.0` |
| `objective` | `multi:softprob` |
| `eval_metric` | `mlogloss` |
| `random_state` | `42` |
| `tree_method` | `hist` |
| `gamma` | `0.0` |
| `n_jobs` | `-1` |
| `num_class` | `12` |
| `reg_alpha` | `0.0` |
| `reg_lambda` | `1.0` |

Deviations from the library's own defaults, and why:

- **`n_estimators`**: 500 instead of the default 100. A boosting budget, not a tuned value: 500 rounds at the learning rate below is the conventional pairing for a first baseline, and stopping early would need a validation signal this stage is not allowed to take from an evaluation partition.
- **`learning_rate`**: 0.1 instead of the default 0.3. Paired with the round count above. Lower and slower is the standard way to spend a fixed, unvalidated budget.
- **`objective`**: 'multi:softprob' rather than the binary default. Forced by a 12-class target, and the reason the model emits a probability per class rather than a single score.
- **`eval_metric`**: 'mlogloss'. The training loss for a 12-class target. Recorded for completeness: no early stopping is attached to it and no evaluation partition is watched.
- **`tree_method`**: 'hist'. The exact, histogram-based builder. Chosen for a 1.17M-row fit on one machine, and because it is deterministic here, unlike the exact greedy builder on very small data.
- **`num_class`**: 12, stated rather than inferred. XGBoost can work the output width out from the labels it was given, which means a rare class that went missing would quietly produce an 11-class model that still fits and still scores. Stating it makes that failure impossible, and the fitted booster is then checked against it.
- **`random_state`**: 42, fixed explicitly so the fit is reproducible.
- **`n_jobs`**: -1, all cores. Tree boosting is not order-dependent, so this does not change results.

Class handling: balanced per-row sample weights. Recorded as a decision, not applied silently, and measured against an unweighted refit below.

### LightGBM (`force2020-litho-lgbm-v0.1`)

`lightgbm.LGBMClassifier`, lightgbm 4.7.0, no search of any kind.

| parameter | value |
|---|---|
| `n_estimators` | `500` |
| `num_leaves` | `31` |
| `max_depth` | `-1` |
| `learning_rate` | `0.1` |
| `subsample` | `1.0` |
| `subsample_freq` | `0` |
| `colsample_bytree` | `1.0` |
| `objective` | `multiclass` |
| `metric` | `multi_logloss` |
| `random_state` | `42` |
| `deterministic` | `True` |
| `force_row_wise` | `True` |
| `min_child_samples` | `20` |
| `n_jobs` | `-1` |
| `num_class` | `12` |
| `reg_lambda` | `0.0` |
| `verbosity` | `-1` |

Deviations from the library's own defaults, and why:

- **`n_estimators`**: 500 instead of the default 100. A boosting budget, not a tuned value, chosen to match the XGBoost budget so the two boosted models are compared at the same number of rounds rather than at two different amounts of compute.
- **`num_class`**: 12, stated explicitly rather than inferred from the labels. Both boosted libraries infer the class count from what they are fitted on; stating it means a class that vanished from the training partition would be an error rather than a silently narrower output.
- **`metric`**: 'multi_logloss'. The training loss for a 12-class target, recorded for completeness. No early stopping is attached to it.
- **`deterministic`**: True. Not an accuracy setting. With bagging and feature sampling left at their defaults, this is what makes a rerun on the same machine reproduce this report exactly instead of approximately.
- **`force_row_wise`**: True. Required by `deterministic=True`, and the reason the result does not depend on how many threads the machine happens to have.
- **`random_state`**: 42, fixed explicitly so the fit is reproducible.
- **`n_jobs`**: -1, all cores. With deterministic=True this cannot change the result.

Class handling: balanced per-row sample weights. Recorded as a decision, not applied silently, and measured against an unweighted refit below.

## 10. Training support by class

1,170,511 rows, 98 wells. Weights are identical for both models: the same training partition, the same counts, the same formula.

| encoded | class | train rows | share | sample weight |
|---:|---|---:|---:|---:|
| 0 | Sandstone | 168,937 | 14.433% | 0.5774 |
| 1 | Shale | 720,803 | 61.580% | 0.1353 |
| 2 | Sandstone/Shale | 150,455 | 12.854% | 0.6483 |
| 3 | Limestone | 56,320 | 4.812% | 1.7319 |
| 4 | Chalk | 10,513 | 0.898% | 9.2783 |
| 5 | Dolomite | 1,688 | 0.144% | 57.7859 |
| 6 | Marl | 33,329 | 2.847% | 2.9267 |
| 7 | Anhydrite | 1,085 | 0.093% | 89.901 |
| 8 | Halite | 8,213 | 0.702% | 11.8766 |
| 9 | Coal | 3,820 | 0.326% | 25.5347 |
| 10 | Basement | 103 | 0.009% | 947.0154 |
| 11 | Tuff | 15,245 | 1.302% | 6.3983 |

## 11. Evaluation support by class

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

> A score is reported as null, not as 0, when it is undefined: precision when the class was never predicted, recall when the class has no rows in the evaluation partition, and F1 when either is undefined. Zero is a real score and is reported as 0. The 12-class metric definition is the Random Forest baseline's, imported from the same function, so a zero-support class behaves identically in both reports.

## 12. Results

Headline figures, all from the primary logs-only experiment:

| model | split | macro F1 (12) | macro F1 (supported) | weighted F1 | bal. acc. | penalty |
|---|---|---:|---:|---:|---:|---:|
| XGBoost | `hidden_test` | 0.3288 | 0.3587 | 0.5737 | 0.4348 | -1.3556 |
| XGBoost | `leaderboard_test` | 0.1904 | 0.2285 | 0.4989 | 0.3660 | -1.5453 |
| LightGBM | `hidden_test` | 0.2948 | 0.3216 | 0.5461 | 0.4074 | -1.4662 |
| LightGBM | `leaderboard_test` | 0.1646 | 0.1975 | 0.4786 | 0.3229 | -1.6418 |

The Random Forest baseline, from its own committed report, for reading alongside:

| model | split | macro F1 (12) | macro F1 (supported) | weighted F1 | bal. acc. | penalty |
|---|---|---:|---:|---:|---:|---:|
| Random Forest | `hidden_test` | 0.3609 | 0.3937 | 0.6636 | 0.4056 | -0.9380 |
| Random Forest | `leaderboard_test` | 0.2332 | 0.2798 | 0.6344 | 0.3303 | -1.0418 |

Before reading any of these numbers as a ranking: the gap between the two evaluation partitions for a single model is 0.1277 macro F1 for the Random Forest baseline, which is larger than most of the differences between the three models. A model that leads on one partition and trails on the other has not been shown to be better or worse; it has been shown to react to which ten wells were held out. No model is called best anywhere in this report.

## 13. Per-class metrics

### XGBoost on `hidden_test` (122,397 rows, 10 wells)

| encoded | class | support | predicted | precision | recall | F1 |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Sandstone | 14,045 | 12,051 | 0.4560 | 0.3912 | 0.4211 |
| 1 | Shale | 71,827 | 45,956 | 0.8945 | 0.5723 | 0.6980 |
| 2 | Sandstone/Shale | 12,283 | 14,795 | 0.2765 | 0.3331 | 0.3022 |
| 3 | Limestone | 8,374 | 12,933 | 0.2482 | 0.3833 | 0.3013 |
| 4 | Chalk | 2,905 | 1,040 | 0.5558 | 0.1990 | 0.2930 |
| 5 | Dolomite | 287 | 5,667 | 0.0028 | 0.0557 | 0.0054 |
| 6 | Marl | 4,396 | 12,985 | 0.0746 | 0.2204 | 0.1115 |
| 7 | Anhydrite | 597 | 526 | 0.7243 | 0.6382 | 0.6785 |
| 8 | Halite | 6,498 | 5,784 | 0.9908 | 0.8820 | 0.9332 |
| 9 | Coal | 244 | 2,881 | 0.0531 | 0.6270 | 0.0979 |
| 10 | Basement | 0 | 0 | n/a | n/a | n/a |
| 11 | Tuff | 941 | 7,779 | 0.0581 | 0.4803 | 0.1037 |

Penalty-matrix score: **-1.3556** (mean penalty 1.3556, perfect score 0).

### XGBoost on `leaderboard_test` (136,786 rows, 10 wells)

| encoded | class | support | predicted | precision | recall | F1 |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Sandstone | 24,048 | 18,443 | 0.6923 | 0.5310 | 0.6010 |
| 1 | Shale | 83,975 | 40,541 | 0.8514 | 0.4110 | 0.5544 |
| 2 | Sandstone/Shale | 17,558 | 24,934 | 0.2556 | 0.3629 | 0.2999 |
| 3 | Limestone | 4,798 | 10,154 | 0.1825 | 0.3862 | 0.2479 |
| 4 | Chalk | 625 | 664 | 0.1175 | 0.1248 | 0.1210 |
| 5 | Dolomite | 416 | 6,876 | 0.0042 | 0.0697 | 0.0080 |
| 6 | Marl | 3,306 | 16,260 | 0.0751 | 0.3693 | 0.1248 |
| 7 | Anhydrite | 125 | 45 | 0.0000 | 0.0000 | 0.0000 |
| 8 | Halite | 0 | 37 | 0.0000 | n/a | n/a |
| 9 | Coal | 690 | 3,609 | 0.1305 | 0.6826 | 0.2191 |
| 10 | Basement | 0 | 15 | 0.0000 | n/a | n/a |
| 11 | Tuff | 1,245 | 15,208 | 0.0591 | 0.7221 | 0.1093 |

Penalty-matrix score: **-1.5453** (mean penalty 1.5453, perfect score 0).

### LightGBM on `hidden_test` (122,397 rows, 10 wells)

| encoded | class | support | predicted | precision | recall | F1 |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Sandstone | 14,045 | 12,247 | 0.3998 | 0.3486 | 0.3724 |
| 1 | Shale | 71,827 | 45,179 | 0.8905 | 0.5602 | 0.6877 |
| 2 | Sandstone/Shale | 12,283 | 12,153 | 0.2514 | 0.2487 | 0.2500 |
| 3 | Limestone | 8,374 | 11,345 | 0.1467 | 0.1987 | 0.1688 |
| 4 | Chalk | 2,905 | 2,920 | 0.3438 | 0.3456 | 0.3447 |
| 5 | Dolomite | 287 | 4,842 | 0.0021 | 0.0348 | 0.0039 |
| 6 | Marl | 4,396 | 14,390 | 0.0706 | 0.2311 | 0.1082 |
| 7 | Anhydrite | 597 | 904 | 0.4491 | 0.6801 | 0.5410 |
| 8 | Halite | 6,498 | 5,742 | 0.9547 | 0.8436 | 0.8958 |
| 9 | Coal | 244 | 3,425 | 0.0374 | 0.5246 | 0.0698 |
| 10 | Basement | 0 | 1,044 | 0.0000 | n/a | n/a |
| 11 | Tuff | 941 | 8,206 | 0.0534 | 0.4655 | 0.0958 |

Penalty-matrix score: **-1.4662** (mean penalty 1.4662, perfect score 0).

### LightGBM on `leaderboard_test` (136,786 rows, 10 wells)

| encoded | class | support | predicted | precision | recall | F1 |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Sandstone | 24,048 | 17,926 | 0.6492 | 0.4839 | 0.5545 |
| 1 | Shale | 83,975 | 40,722 | 0.8426 | 0.4086 | 0.5503 |
| 2 | Sandstone/Shale | 17,558 | 21,277 | 0.2290 | 0.2775 | 0.2510 |
| 3 | Limestone | 4,798 | 9,392 | 0.1391 | 0.2722 | 0.1841 |
| 4 | Chalk | 625 | 2,213 | 0.0429 | 0.1520 | 0.0669 |
| 5 | Dolomite | 416 | 7,005 | 0.0037 | 0.0625 | 0.0070 |
| 6 | Marl | 3,306 | 17,417 | 0.0604 | 0.3182 | 0.1015 |
| 7 | Anhydrite | 125 | 146 | 0.0000 | 0.0000 | 0.0000 |
| 8 | Halite | 0 | 176 | 0.0000 | n/a | n/a |
| 9 | Coal | 690 | 4,298 | 0.0845 | 0.5261 | 0.1455 |
| 10 | Basement | 0 | 1,606 | 0.0000 | n/a | n/a |
| 11 | Tuff | 1,245 | 14,608 | 0.0620 | 0.7277 | 0.1143 |

Penalty-matrix score: **-1.6418** (mean penalty 1.6418, perfect score 0).

## 14. Macro F1, weighted F1, balanced accuracy

| model | split | macro F1 (12) | classes averaged | macro F1 (supported) | weighted F1 | bal. acc. | classes in recall average |
|---|---|---:|---:|---:|---:|---:|---:|
| XGBoost | `hidden_test` | 0.3288 | 11 of 12 | 0.3587 | 0.5737 | 0.4348 | 11 |
| XGBoost | `leaderboard_test` | 0.1904 | 10 of 12 | 0.2285 | 0.4989 | 0.3660 | 10 |
| LightGBM | `hidden_test` | 0.2948 | 11 of 12 | 0.3216 | 0.5461 | 0.4074 | 11 |
| LightGBM | `leaderboard_test` | 0.1646 | 10 of 12 | 0.1975 | 0.4786 | 0.3229 | 10 |

all 12 declared classes, unweighted mean of their F1. A class with zero support in this partition contributes 0, which is scikit-learn's documented behaviour for zero_division=0 and is pessimistic by construction.

## 15. Confusion matrices

### XGBoost on `hidden_test` - rows are true, columns predicted

| true \ pred | Sandsto | Shale | Sandsto | Limesto | Chalk | Dolomit | Marl | Anhydri | Halite | Coal | Basemen | Tuff | support |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sandstone** | 5,495 | 1,293 | 2,721 | 1,686 | 92 | 99 | 1,917 | 2 | 2 | 182 | 0 | 556 | 14,045 |
| **Shale** | 2,535 | 41,107 | 6,227 | 3,371 | 1 | 4,692 | 6,901 | 0 | 0 | 1,979 | 0 | 5,014 | 71,827 |
| **Sandstone/Shale** | 2,069 | 2,361 | 4,091 | 1,292 | 1 | 86 | 977 | 0 | 0 | 459 | 0 | 947 | 12,283 |
| **Limestone** | 1,258 | 420 | 454 | 3,210 | 296 | 387 | 1,970 | 23 | 0 | 82 | 0 | 274 | 8,374 |
| **Chalk** | 186 | 0 | 18 | 1,694 | 578 | 50 | 41 | 0 | 2 | 0 | 0 | 336 | 2,905 |
| **Dolomite** | 4 | 61 | 14 | 7 | 18 | 16 | 29 | 103 | 0 | 0 | 0 | 35 | 287 |
| **Marl** | 213 | 534 | 1,142 | 1,014 | 54 | 285 | 969 | 0 | 1 | 26 | 0 | 158 | 4,396 |
| **Anhydrite** | 6 | 2 | 0 | 121 | 0 | 10 | 29 | 381 | 48 | 0 | 0 | 0 | 597 |
| **Halite** | 128 | 22 | 0 | 531 | 0 | 3 | 66 | 17 | 5,731 | 0 | 0 | 0 | 6,498 |
| **Coal** | 21 | 13 | 39 | 3 | 0 | 0 | 8 | 0 | 0 | 153 | 0 | 7 | 244 |
| **Basement** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tuff** | 136 | 143 | 89 | 4 | 0 | 39 | 78 | 0 | 0 | 0 | 0 | 452 | 941 |

### XGBoost on `leaderboard_test` - rows are true, columns predicted

| true \ pred | Sandsto | Shale | Sandsto | Limesto | Chalk | Dolomit | Marl | Anhydri | Halite | Coal | Basemen | Tuff | support |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sandstone** | 12,769 | 875 | 2,201 | 1,655 | 49 | 743 | 1,005 | 26 | 0 | 1,184 | 0 | 3,541 | 24,048 |
| **Shale** | 2,824 | 34,515 | 15,100 | 4,229 | 24 | 5,290 | 12,320 | 0 | 0 | 1,268 | 0 | 8,405 | 83,975 |
| **Sandstone/Shale** | 1,984 | 4,527 | 6,372 | 583 | 7 | 559 | 930 | 0 | 0 | 627 | 0 | 1,969 | 17,558 |
| **Limestone** | 559 | 197 | 564 | 1,853 | 458 | 161 | 591 | 19 | 37 | 32 | 1 | 326 | 4,798 |
| **Chalk** | 0 | 0 | 0 | 540 | 78 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 625 |
| **Dolomite** | 17 | 73 | 62 | 101 | 0 | 29 | 112 | 0 | 0 | 0 | 0 | 22 | 416 |
| **Marl** | 182 | 111 | 519 | 1,148 | 48 | 14 | 1,221 | 0 | 0 | 25 | 0 | 38 | 3,306 |
| **Anhydrite** | 33 | 35 | 13 | 16 | 0 | 0 | 11 | 0 | 0 | 0 | 14 | 3 | 125 |
| **Halite** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Coal** | 57 | 34 | 85 | 6 | 0 | 9 | 23 | 0 | 0 | 471 | 0 | 5 | 690 |
| **Basement** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tuff** | 18 | 174 | 18 | 23 | 0 | 71 | 40 | 0 | 0 | 2 | 0 | 899 | 1,245 |

### LightGBM on `hidden_test` - rows are true, columns predicted

| true \ pred | Sandsto | Shale | Sandsto | Limesto | Chalk | Dolomit | Marl | Anhydri | Halite | Coal | Basemen | Tuff | support |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sandstone** | 4,896 | 1,472 | 1,899 | 1,740 | 335 | 239 | 2,040 | 48 | 50 | 394 | 300 | 632 | 14,045 |
| **Shale** | 3,300 | 40,234 | 5,658 | 4,050 | 83 | 3,691 | 7,107 | 14 | 14 | 2,062 | 195 | 5,419 | 71,827 |
| **Sandstone/Shale** | 2,363 | 2,063 | 3,055 | 1,631 | 23 | 118 | 1,213 | 12 | 14 | 651 | 150 | 990 | 12,283 |
| **Limestone** | 1,121 | 552 | 439 | 1,664 | 1,132 | 382 | 2,234 | 110 | 62 | 118 | 301 | 259 | 8,374 |
| **Chalk** | 174 | 5 | 1 | 851 | 1,004 | 79 | 468 | 0 | 35 | 35 | 0 | 253 | 2,905 |
| **Dolomite** | 2 | 68 | 16 | 3 | 5 | 10 | 26 | 64 | 21 | 0 | 36 | 36 | 287 |
| **Marl** | 204 | 624 | 973 | 774 | 301 | 274 | 1,016 | 0 | 14 | 33 | 14 | 169 | 4,396 |
| **Anhydrite** | 1 | 0 | 5 | 37 | 34 | 12 | 35 | 406 | 49 | 2 | 14 | 2 | 597 |
| **Halite** | 0 | 0 | 4 | 575 | 1 | 1 | 160 | 250 | 5,482 | 0 | 25 | 0 | 6,498 |
| **Coal** | 11 | 16 | 40 | 14 | 2 | 4 | 12 | 0 | 0 | 128 | 9 | 8 | 244 |
| **Basement** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tuff** | 175 | 145 | 63 | 6 | 0 | 32 | 79 | 0 | 1 | 2 | 0 | 438 | 941 |

### LightGBM on `leaderboard_test` - rows are true, columns predicted

| true \ pred | Sandsto | Shale | Sandsto | Limesto | Chalk | Dolomit | Marl | Anhydri | Halite | Coal | Basemen | Tuff | support |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sandstone** | 11,637 | 623 | 1,831 | 1,662 | 180 | 986 | 1,443 | 51 | 17 | 1,532 | 491 | 3,595 | 24,048 |
| **Shale** | 3,471 | 34,312 | 13,501 | 4,127 | 815 | 4,968 | 12,810 | 0 | 31 | 1,549 | 470 | 7,921 | 83,975 |
| **Sandstone/Shale** | 1,985 | 5,067 | 4,873 | 834 | 65 | 591 | 1,285 | 0 | 6 | 736 | 287 | 1,829 | 17,558 |
| **Limestone** | 521 | 237 | 485 | 1,306 | 772 | 240 | 601 | 69 | 91 | 61 | 111 | 304 | 4,798 |
| **Chalk** | 2 | 13 | 1 | 474 | 95 | 23 | 16 | 0 | 1 | 0 | 0 | 0 | 625 |
| **Dolomite** | 11 | 81 | 49 | 115 | 1 | 26 | 108 | 0 | 0 | 10 | 1 | 14 | 416 |
| **Marl** | 187 | 114 | 412 | 830 | 282 | 96 | 1,052 | 25 | 29 | 34 | 209 | 36 | 3,306 |
| **Anhydrite** | 41 | 28 | 29 | 8 | 0 | 4 | 3 | 0 | 0 | 6 | 6 | 0 | 125 |
| **Halite** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Coal** | 50 | 69 | 76 | 24 | 3 | 15 | 55 | 1 | 0 | 363 | 31 | 3 | 690 |
| **Basement** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tuff** | 21 | 178 | 20 | 12 | 0 | 56 | 44 | 0 | 1 | 7 | 0 | 906 | 1,245 |

## 16. Diagnostics

### XGBoost

**Depth-only diagnostic.** A depth diagnostic, not a lithology model. It measures how much of the task is reachable from DEPTH_MD alone, which is the number that gives a logs-only result its meaning. DEPTH_MD is never combined with the logs in the primary experiment.

| split | primary macro F1 | this macro F1 | delta | primary bal. acc. | this bal. acc. |
|---|---:|---:|---:|---:|---:|
| `hidden_test` | 0.3288 | 0.0630 | -0.2659 | 0.4348 | 0.1428 |
| `leaderboard_test` | 0.1904 | 0.0248 | -0.1657 | 0.3660 | 0.1169 |

**Missingness-mask ablation.** The five 0/1 missingness masks the dataset stage already stores, added to the five logs and to nothing else. The masks are preserved in the table and measured here; they are deliberately not in the primary comparison.

A = `CALI`, `RDEP`, `RMED`, `DTC`, `GR`

B = A + `CALI_MISSING`, `RDEP_MISSING`, `RMED_MISSING`, `DTC_MISSING`, `GR_MISSING`

| split | A: logs only | B: logs + masks | delta |
|---|---:|---:|---:|
| `hidden_test` | 0.3288 | 0.3204 | -0.0084 |
| `leaderboard_test` | 0.1904 | 0.1910 | 0.0006 |

**Unweighted refit.** The same features with no sample weights, fitted to settle whether the balancing was necessary for this library. A diagnostic, not a candidate configuration: the primary configuration stays the declared one.

| split | primary macro F1 | this macro F1 | delta | primary bal. acc. | this bal. acc. |
|---|---:|---:|---:|---:|---:|
| `hidden_test` | 0.3288 | 0.3594 | 0.0306 | 0.4348 | 0.3564 |
| `leaderboard_test` | 0.1904 | 0.2530 | 0.0625 | 0.3660 | 0.3040 |

Sample weighting hurt on both partitions (`hidden_test` -0.0306, `leaderboard_test` -0.0625), consistently in sign but small in size relative to the spread between the two partitions. Kept because it was declared before the fit; one configuration on ten-well partitions is evidence about this baseline, not a settled question.

### LightGBM

**Depth-only diagnostic.** A depth diagnostic, not a lithology model. It measures how much of the task is reachable from DEPTH_MD alone, which is the number that gives a logs-only result its meaning. DEPTH_MD is never combined with the logs in the primary experiment.

| split | primary macro F1 | this macro F1 | delta | primary bal. acc. | this bal. acc. |
|---|---:|---:|---:|---:|---:|
| `hidden_test` | 0.2948 | 0.0499 | -0.2449 | 0.4074 | 0.1353 |
| `leaderboard_test` | 0.1646 | 0.0282 | -0.1364 | 0.3229 | 0.1229 |

**Missingness-mask ablation.** The five 0/1 missingness masks the dataset stage already stores, added to the five logs and to nothing else. The masks are preserved in the table and measured here; they are deliberately not in the primary comparison.

A = `CALI`, `RDEP`, `RMED`, `DTC`, `GR`

B = A + `CALI_MISSING`, `RDEP_MISSING`, `RMED_MISSING`, `DTC_MISSING`, `GR_MISSING`

| split | A: logs only | B: logs + masks | delta |
|---|---:|---:|---:|
| `hidden_test` | 0.2948 | 0.1312 | -0.1637 |
| `leaderboard_test` | 0.1646 | 0.1029 | -0.0617 |

**Unweighted refit.** The same features with no sample weights, fitted to settle whether the balancing was necessary for this library. A diagnostic, not a candidate configuration: the primary configuration stays the declared one.

| split | primary macro F1 | this macro F1 | delta | primary bal. acc. | this bal. acc. |
|---|---:|---:|---:|---:|---:|
| `hidden_test` | 0.2948 | 0.3142 | 0.0193 | 0.4074 | 0.3195 |
| `leaderboard_test` | 0.1646 | 0.2324 | 0.0679 | 0.3229 | 0.2750 |

Sample weighting hurt on both partitions (`hidden_test` -0.0193, `leaderboard_test` -0.0679), consistently in sign but small in size relative to the spread between the two partitions. Kept because it was declared before the fit; one configuration on ten-well partitions is evidence about this baseline, not a settled question.

## 17. Feature importance

Each library's own gain attribution, and how often each feature was used in a split. Neither number is a statement about geology, and the two libraries do not define gain the same way, so the columns below are comparable as a pattern and not as a quantity.

### XGBoost

| feature | gain | gain share | splits | split share |
|---|---:|---:|---:|---:|
| `CALI` | 70.2 | 0.1440 | 63,120 | 0.2476 |
| `RDEP` | 64.0 | 0.1313 | 46,601 | 0.1828 |
| `RMED` | 74.3 | 0.1525 | 40,772 | 0.1599 |
| `DTC` | 164.3 | 0.3370 | 51,949 | 0.2038 |
| `GR` | 114.7 | 0.2352 | 52,466 | 0.2058 |

### LightGBM

| feature | gain | gain share | splits | split share |
|---|---:|---:|---:|---:|
| `CALI` | 5160868745063.5 | 0.1213 | 41,712 | 0.2536 |
| `RDEP` | 4412657057536.3 | 0.1037 | 28,755 | 0.1748 |
| `RMED` | 10503313872060.4 | 0.2468 | 24,305 | 0.1478 |
| `DTC` | 5066177489968.5 | 0.1190 | 33,456 | 0.2034 |
| `GR` | 17413179688064.5 | 0.4092 | 36,247 | 0.2204 |

Random Forest impurity-based importance, for the pattern comparison only:

| feature | RF gain share | XGBoost gain share | LightGBM gain share |
|---|---:|---:|---:|
| `CALI` | 0.1987 | 0.1440 | 0.1213 |
| `RDEP` | 0.1644 | 0.1313 | 0.1037 |
| `RMED` | 0.1593 | 0.1525 | 0.2468 |
| `DTC` | 0.2748 | 0.3370 | 0.1190 |
| `GR` | 0.2029 | 0.2352 | 0.4092 |

The Random Forest's importance is mean decrease in impurity; XGBoost's and LightGBM's are total loss reduction, computed over a different number of trees with a different growth rule. The three numbers are not on one scale and are not ranked against each other. What can be compared is the pattern: which of the five curves the model leans on most, and whether the ordering survives a change of algorithm.

## 18. Per-class error analysis

### XGBoost

**`hidden_test`**

- Strongest: Halite 0.9332, Shale 0.6980, Anhydrite 0.6785.
- Weakest: Dolomite 0.0054, Coal 0.0979, Tuff 0.1037.
- Zero ground-truth support: Basement. Reported as null, not as 0.
- Largest confusions, true class into its most common wrong prediction:
  - Shale -> Marl: 6,901 rows, 9.6% of the class.
  - Sandstone -> Sandstone/Shale: 2,721 rows, 19.4% of the class.
  - Sandstone/Shale -> Shale: 2,361 rows, 19.2% of the class.
  - Limestone -> Marl: 1,970 rows, 23.5% of the class.

Rare classes:

| class | support | predicted | precision | recall | F1 | most confused with |
|---|---:|---:|---:|---:|---:|---|
| Basement | 0 | 0 | n/a | n/a | n/a | n/a |
| Halite | 6,498 | 5,784 | 0.9908 | 0.8820 | 0.9332 | Limestone |

**`leaderboard_test`**

- Strongest: Sandstone 0.6010, Shale 0.5544, Sandstone/Shale 0.2999.
- Weakest: Anhydrite 0.0000, Dolomite 0.0080, Tuff 0.1093.
- Zero ground-truth support: Halite, Basement. Reported as null, not as 0.
- Largest confusions, true class into its most common wrong prediction:
  - Shale -> Sandstone/Shale: 15,100 rows, 18.0% of the class.
  - Sandstone/Shale -> Shale: 4,527 rows, 25.8% of the class.
  - Sandstone -> Tuff: 3,541 rows, 14.7% of the class.
  - Marl -> Limestone: 1,148 rows, 34.7% of the class.

Rare classes:

| class | support | predicted | precision | recall | F1 | most confused with |
|---|---:|---:|---:|---:|---:|---|
| Basement | 0 | 15 | n/a | n/a | n/a | n/a |
| Halite | 0 | 37 | n/a | n/a | n/a | n/a |

### LightGBM

**`hidden_test`**

- Strongest: Halite 0.8958, Shale 0.6877, Anhydrite 0.5410.
- Weakest: Dolomite 0.0039, Coal 0.0698, Tuff 0.0958.
- Zero ground-truth support: Basement. Reported as null, not as 0.
- Largest confusions, true class into its most common wrong prediction:
  - Shale -> Marl: 7,107 rows, 9.9% of the class.
  - Sandstone/Shale -> Sandstone: 2,363 rows, 19.2% of the class.
  - Limestone -> Marl: 2,234 rows, 26.7% of the class.
  - Sandstone -> Marl: 2,040 rows, 14.5% of the class.

Rare classes:

| class | support | predicted | precision | recall | F1 | most confused with |
|---|---:|---:|---:|---:|---:|---|
| Basement | 0 | 1,044 | n/a | n/a | n/a | n/a |
| Halite | 6,498 | 5,742 | 0.9547 | 0.8436 | 0.8958 | Limestone |

**`leaderboard_test`**

- Strongest: Sandstone 0.5545, Shale 0.5503, Sandstone/Shale 0.2510.
- Weakest: Anhydrite 0.0000, Dolomite 0.0070, Chalk 0.0669.
- Zero ground-truth support: Halite, Basement. Reported as null, not as 0.
- Largest confusions, true class into its most common wrong prediction:
  - Shale -> Sandstone/Shale: 13,501 rows, 16.1% of the class.
  - Sandstone/Shale -> Shale: 5,067 rows, 28.9% of the class.
  - Sandstone -> Tuff: 3,595 rows, 14.9% of the class.
  - Marl -> Limestone: 830 rows, 25.1% of the class.

Rare classes:

| class | support | predicted | precision | recall | F1 | most confused with |
|---|---:|---:|---:|---:|---:|---|
| Basement | 0 | 1,606 | n/a | n/a | n/a | n/a |
| Halite | 0 | 176 | n/a | n/a | n/a | n/a |

The confusion patterns above are described, not explained. This dataset contains log curves and a class label; it does not contain the core descriptions, depositional settings or laboratory analyses that would be needed to say why two classes are hard to tell apart, and no such explanation is offered here.

## 19. Limitations

- These are baselines. Two fixed configurations, not searched ones, and no claim is made that either is the best gradient-boosted model available on this dataset.
- Both models are fitted once on 98 wells. A ten-well evaluation partition carries real between-well variance, and no confidence interval or repeated split is computed here.
- The two evaluation partitions disagree with each other by more than most of the differences between these three models. Any single-number comparison should be read with that in mind.
- Predictions are independent per depth row. Real lithology logs are autocorrelated down hole, so the effective sample size is smaller than the row count suggests. No windowing or smoothing was used.
- Median imputation makes a row whose curve is absent look like a row whose curve sits at the median. Both boosting libraries can handle missing values natively, and that would probably be the better model, but it would also make preprocessing differ between the three models being compared, so it was not used.
- Feature importance is each library's own gain attribution. It is not a causal or geological importance, and the three libraries' numbers are not comparable to each other as quantities; only the pattern is comparable.
- The class-weighting question is settled for one configuration per library on ten-well partitions. That is evidence about these baselines, not a settled modelling question.
- No CNN, no neural network, no additional dataset, no depth or formation feature in the primary experiment, no API, no frontend, and no change to the authoritative split.

## 20. Reproducibility and provenance

- Entry point: `make train-force2020-gbdt`. Verification: `make verify-force2020-gbdt`. Rescore without refit: `make score-force2020-gbdt`.
- Artifacts: `data/interim/ml/force2020_litho` (gitignored, regenerated, not committed).
- Committed outputs: `reports/force2020_gbdt_baseline.json`, `reports/force2020_gbdt_baseline.md`.
- Extra to install: `pip install -e .[ml]`.
- Source: `FORCE2020` at commit `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`.
- Dataset sha256: `5dbbb114e2c543a89ea980c1c9b6d0cdecc12c7acd35112d6da47fa40ce1fbb0`.
- Split manifest sha256: `d01e93d005c2fdda88c15bbc4ecca3e276ebe782cc6aacd80c1e1777985d1068`.

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
| xgboost | 2.0.3 |
| lightgbm | 4.7.0 |

Every estimator carries a fixed random_state. LightGBM additionally runs with deterministic=True and force_row_wise=True, so its result does not depend on the thread count. The committed report contains no timings and no host-specific values, so a rerun either matches it byte for byte or the table or a library changed.

**Import order.** LightGBM must be imported before scikit-learn in any process that fits, loads or predicts with it. On this platform the reverse order aborts the process with an access violation from LightGBM's C layer. data/ml/common/force2020_lithology.py performs that import itself, and a test asserts the ordering.

### Penalty matrix

- Matrix: `force2020_lithology_penalty_matrix`, authoritative: **True**, homemade: **False**.
- Formula: `S = -(1/N) * sum_i A[y_true_i, y_pred_i]`, perfect score 0.0.
- The published competition matrix only. No substitute matrix was constructed, and no other scoring function was used.

