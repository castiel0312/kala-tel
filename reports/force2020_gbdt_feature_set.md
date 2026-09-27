# FORCE 2020: XGBoost and LightGBM on the A1 log set

| | |
|---|---|
| stage | modelling / gradient-boosted trees on the A1 log set |
| feature set | A1 = 10 curves from `v0.2` |
| models fitted here | XGBoost, LightGBM |
| models read from committed reports | RF A0, XGB A0, LGBM A0, RF A1 |

## A. Features used

Exactly the A1 definition, read from the committed feature registry:

```
CALI, RDEP, RMED, DTC, GR, DTS, NPHI, PEF, RHOB, DRHO
```

Added relative to the five-curve baseline: `DTS`, `NPHI`, `PEF`, `RHOB`, `DRHO`

Not included: `DEPTH_MD`, coordinates, `GROUP`, `FORMATION`, provenance columns, target columns, missingness masks, and any local-context column. `DEPTH_MD` in the feature list: False. Masks in the feature list: False.

## B. Wells and rows

| partition | wells | rows |
|---|---:|---:|
| `train` | 98 | 1170511 |
| `hidden_test` | 10 | see below |
| `leaderboard_test` | 10 | see below |
| `hidden_test` (scored) | 10 | 122,397 |
| `leaderboard_test` (scored) | 10 | 136,786 |

All six cells in the comparison table are scored on the same rows: 122,397 hidden_test rows across 10 wells and 136,786 leaderboard_test rows across 10 wells, with the 98 training wells disjoint from both. The A0 cells are read from reports produced on the v0.1 table and the A1 cells from fits on the v0.2 table, so the row and well counts are asserted equal before anything is compared. v0.2 added columns and no rows: the dataset stage excluded nothing.

## C. Required comparison

### macro F1 (12)

| partition | RF A0 | XGB A0 | LGBM A0 | RF A1 | XGB A1 | LGBM A1 |
|---|---|---|---|---|---|---|
| `hidden_test` | +0.3609 | +0.3288 | +0.2948 | +0.4529 | +0.4023 | +0.2292 |
| `leaderboard_test` | +0.2332 | +0.1904 | +0.1646 | +0.3027 | +0.2370 | +0.1635 |

### macro F1, supported only

| partition | RF A0 | XGB A0 | LGBM A0 | RF A1 | XGB A1 | LGBM A1 |
|---|---|---|---|---|---|---|
| `hidden_test` | +0.3937 | +0.3587 | +0.3216 | +0.4941 | +0.4389 | +0.2500 |
| `leaderboard_test` | +0.2798 | +0.2285 | +0.1975 | +0.3632 | +0.2844 | +0.1962 |

### weighted F1

| partition | RF A0 | XGB A0 | LGBM A0 | RF A1 | XGB A1 | LGBM A1 |
|---|---|---|---|---|---|---|
| `hidden_test` | +0.6636 | +0.5737 | +0.5461 | +0.7215 | +0.6334 | +0.4789 |
| `leaderboard_test` | +0.6344 | +0.4989 | +0.4786 | +0.7026 | +0.6033 | +0.4293 |

### balanced accuracy

| partition | RF A0 | XGB A0 | LGBM A0 | RF A1 | XGB A1 | LGBM A1 |
|---|---|---|---|---|---|---|
| `hidden_test` | +0.4056 | +0.4348 | +0.4074 | +0.4870 | +0.4792 | +0.3564 |
| `leaderboard_test` | +0.3303 | +0.3660 | +0.3229 | +0.3823 | +0.4045 | +0.3094 |

### mean penalty (lower is better)

| partition | RF A0 | XGB A0 | LGBM A0 | RF A1 | XGB A1 | LGBM A1 |
|---|---|---|---|---|---|---|
| `hidden_test` | +0.9380 | +1.3556 | +1.4662 | +0.7456 | +1.0869 | +1.8339 |
| `leaderboard_test` | +1.0418 | +1.5453 | +1.6418 | +0.7983 | +1.1570 | +1.8743 |

## D. Feature effect vs model effect

A0 to A1 inside each family is the feature effect with the estimator held still. A1 RF to A1 XGB is the model effect with the features held still. A single table cannot tell them apart, so they are separated here.

| comparison | partition | macro F1 from | to | delta |
|---|---|---:|---:|---:|
| RF A0 -> RF A1 | `hidden_test` | +0.3609 | +0.4529 | +0.0920 |
| RF A0 -> RF A1 | `leaderboard_test` | +0.2332 | +0.3027 | +0.0695 |
| XGB A0 -> XGB A1 | `hidden_test` | +0.3288 | +0.4023 | +0.0735 |
| XGB A0 -> XGB A1 | `leaderboard_test` | +0.1904 | +0.2370 | +0.0465 |
| LGBM A0 -> LGBM A1 | `hidden_test` | +0.2948 | +0.2292 | -0.0657 |
| LGBM A0 -> LGBM A1 | `leaderboard_test` | +0.1646 | +0.1635 | -0.0011 |
| A1 RF -> A1 XGB | `hidden_test` | +0.4529 | +0.4023 | -0.0506 |
| A1 RF -> A1 XGB | `leaderboard_test` | +0.3027 | +0.2370 | -0.0657 |
| A1 RF -> A1 LGBM | `hidden_test` | +0.4529 | +0.2292 | -0.2238 |
| A1 RF -> A1 LGBM | `leaderboard_test` | +0.3027 | +0.1635 | -0.1392 |

## E. Per-class F1

| class | support | RF A0 | XGB A0 | LGBM A0 | RF A1 | XGB A1 | LGBM A1 | RF A1 - RF A0 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **hidden_test** | | | | | | | | |
| Shale | 71,827 | +0.8441 | +0.6980 | +0.6877 | +0.8754 | +0.7481 | +0.5871 | +0.0313 |
| Sandstone | 14,045 | +0.4792 | +0.4211 | +0.3724 | +0.6186 | +0.5569 | +0.4811 | +0.1395 |
| Sandstone/Shale | 12,283 | +0.2878 | +0.3022 | +0.2500 | +0.3246 | +0.3508 | +0.3420 | +0.0368 |
| Limestone | 8,374 | +0.3023 | +0.3013 | +0.1688 | +0.4700 | +0.3989 | +0.2703 | +0.1677 |
| Halite | 6,498 | +0.9338 | +0.9332 | +0.8958 | +0.9652 | +0.9790 | +0.1441 | +0.0314 |
| Marl | 4,396 | +0.1051 | +0.1115 | +0.1082 | +0.1581 | +0.1482 | +0.1423 | +0.0530 |
| Chalk | 2,905 | +0.2225 | +0.2930 | +0.3447 | +0.3715 | +0.2151 | +0.5221 | +0.1489 |
| Tuff | 941 | +0.1219 | +0.1037 | +0.0958 | +0.1519 | +0.1253 | +0.1069 | +0.0301 |
| Anhydrite | 597 | +0.6930 | +0.6785 | +0.5410 | +0.7500 | +0.6800 | +0.0187 | +0.0570 |
| Dolomite | 287 | +0.0353 | +0.0054 | +0.0039 | +0.0000 | +0.0184 | +0.0142 | -0.0353 |
| Coal | 244 | +0.3058 | +0.0979 | +0.0698 | +0.7495 | +0.6072 | +0.1213 | +0.4437 |
| Basement | 0 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| **leaderboard_test** | | | | | | | | |
| Shale | 83,975 | +0.7544 | +0.5544 | +0.5503 | +0.8162 | +0.6740 | +0.4636 | +0.0618 |
| Sandstone | 24,048 | +0.6606 | +0.6010 | +0.5545 | +0.7568 | +0.7148 | +0.5792 | +0.0963 |
| Sandstone/Shale | 17,558 | +0.2895 | +0.2999 | +0.2510 | +0.3576 | +0.3539 | +0.2519 | +0.0680 |
| Limestone | 4,798 | +0.2967 | +0.2479 | +0.1841 | +0.3711 | +0.3267 | +0.1478 | +0.0744 |
| Marl | 3,306 | +0.1526 | +0.1248 | +0.1015 | +0.1343 | +0.1278 | +0.1328 | -0.0182 |
| Tuff | 1,245 | +0.1727 | +0.1093 | +0.1143 | +0.3204 | +0.1742 | +0.0722 | +0.1477 |
| Coal | 690 | +0.3414 | +0.2191 | +0.1455 | +0.5853 | +0.3867 | +0.1580 | +0.2440 |
| Chalk | 625 | +0.1275 | +0.1210 | +0.0669 | +0.0434 | +0.0756 | +0.1502 | -0.0841 |
| Dolomite | 416 | +0.0025 | +0.0080 | +0.0070 | +0.0000 | +0.0098 | +0.0062 | -0.0025 |
| Anhydrite | 125 | +0.0000 | +0.0000 | +0.0000 | +0.2468 | +0.0000 | +0.0000 | +0.2468 |
| Halite | 0 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Basement | 0 | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

## F. Feature importance

Agreement is measured on rank within each family, never on the raw importance number, which is not on a common scale between the three.

**RF A1** — impurity

| feature | share of importance | rank |
|---|---:|---:|
| `DTC` | 0.1585 | 1 |
| `RHOB` | 0.1571 | 2 |
| `GR` | 0.1444 | 3 |
| `NPHI` | 0.1192 | 4 |
| `CALI` | 0.1094 | 5 |
| `RDEP` | 0.0982 | 6 |
| `RMED` | 0.0916 | 7 |
| `PEF` | 0.0537 | 8 |
| `DRHO` | 0.0488 | 9 |
| `DTS` | 0.0190 | 10 |

**XGB A1** — gain

| feature | share of importance | rank |
|---|---:|---:|
| `DTC` | 0.1744 | 1 |
| `NPHI` | 0.1656 | 2 |
| `RHOB` | 0.1474 | 3 |
| `GR` | 0.1447 | 4 |
| `RDEP` | 0.0764 | 5 |
| `CALI` | 0.0731 | 6 |
| `RMED` | 0.0669 | 7 |
| `PEF` | 0.0590 | 8 |
| `DTS` | 0.0538 | 9 |
| `DRHO` | 0.0386 | 10 |

**LGBM A1** — gain

| feature | share of importance | rank |
|---|---:|---:|
| `CALI` | 0.6019 | 1 |
| `RMED` | 0.0890 | 2 |
| `DTC` | 0.0732 | 3 |
| `RHOB` | 0.0603 | 4 |
| `RDEP` | 0.0570 | 5 |
| `GR` | 0.0378 | 6 |
| `NPHI` | 0.0339 | 7 |
| `DRHO` | 0.0280 | 8 |
| `DTS` | 0.0114 | 9 |
| `PEF` | 0.0075 | 10 |

Rank agreement across families:

| feature | best rank | worst rank | spread |
|---|---:|---:|---:|
| `CALI` | 1 | 6 | 5 |
| `DTC` | 1 | 3 | 2 |
| `RMED` | 2 | 7 | 5 |
| `NPHI` | 2 | 7 | 5 |
| `RHOB` | 2 | 4 | 2 |
| `GR` | 3 | 6 | 3 |
| `RDEP` | 5 | 6 | 1 |
| `PEF` | 8 | 10 | 2 |
| `DRHO` | 8 | 10 | 2 |
| `DTS` | 9 | 10 | 1 |

## G. DTS

DTS is the reason this feature set needed a caveat attached to it rather than a footnote. It is missing from about 85% of training rows, 40% of hidden_test rows and 68% of leaderboard_test rows, so at fit time it is mostly a median and at scoring time it is mostly a median too, and the two medians need not be the same number. That is exactly the situation where a column can look useful on one partition and hurt on the other, which is why it is measured on both rather than averaged.

| split | rows | DTS missing |
|---|---:|---:|
| `train` | 1,170,511 | 0.8508 |
| `hidden_test` | 122,397 | 0.4046 |
| `leaderboard_test` | 136,786 | 0.6840 |

| model | DTS share | rank |
|---|---:|---:|
| RF | 0.0190 | 10 |
| XGB | 0.0538 | 9 |
| LGBM | 0.0114 | 9 |

From the committed RF ablation: removing DTS changed RF macro F1 by -0.001544 on average across the two held-out partitions, a negative cost meaning the RF scored marginally better without it. That is the recorded result and it is not being re-run or reinterpreted here.

XGB A1 and LGBM A1 were not refitted without DTS in this stage. The column is retained in both, on the stated rule that a curve is not removed without evidence from the model under test.

## H. Leakage audit

- no DEPTH_MD, coordinate, GROUP, FORMATION, provenance or target column appears in any feature list
- no missingness mask is in the A1 feature list
- no well is in both the fitting and either evaluation partition
- the imputer and the sample weights are derived from the training partition alone
- no evaluation partition was read before its model's fit returned

| cell | hidden_test overlap | leaderboard_test overlap |
|---|---|---|
| RF A0 | 0 of 98+10 | 0 of 98+10 |
| XGB A0 | 0 of 98+10 | 0 of 98+10 |
| LGBM A0 | 0 of 98+10 | 0 of 98+10 |
| RF A1 | 0 of 98+10 | 0 of 98+10 |
| XGB A1 | 0 of 98+10 | 0 of 98+10 |
| LGBM A1 | 0 of 98+10 | 0 of 98+10 |

## I. Answers

**1. Does A1 improve RF over A0?**  
yes (macro F1 moved +0.0920, +0.0695)

**2. Does XGBoost A1 improve over XGBoost A0?**  
yes (macro F1 moved +0.0735, +0.0465)

**3. Does LightGBM A1 improve over LightGBM A0?**  
no (macro F1 moved -0.0657, -0.0011)

**4. Does XGBoost A1 outperform RF A1 on macro F1?**  
no (macro F1 moved -0.0506, -0.0657)

**5. Does LightGBM A1 outperform RF A1 on macro F1?**  
no (macro F1 moved -0.2238, -0.1392)

**6. Which model has the strongest balanced accuracy?**  
hidden_test: rf_A1 (0.4870); leaderboard_test: xgb_A1 (0.4045)

**7. Which model handles rare lithologies better?**  


**8. Does the richer feature set generalize across BOTH partitions?**  
no: LGBM did not improve on hidden_test

**9. Are RHOB and NPHI genuinely useful across model families?**  
RHOB yes (RF drop-one +0.0328, rank 2 of 3 families); NPHI yes (RF drop-one +0.0265, rank 2 of 3 families)

**10. Is DTS worth retaining given its extreme missingness?**  
not on this evidence: the RF drop-one cost of removal was -0.001544, rank 9 of 3, so a forest is no worse without it. The column is retained in A1 and is not removed, because a cost of about zero on one model family is not evidence against the feature.

**11. Is there evidence the improvement is caused by richer measurements rather than overfitting?**  
mixed: macro F1 rose in 4 of 6 comparisons

## J. What this stage did not do

- No hyperparameter was tuned, and neither held-out partition was read before a fit returned.
- No feature search, no exhaustive combination search, no random feature selection, no cross-validation.
- No external dataset, no formation or coordinate feature, no depth shortcut, no local-context column.
- The committed v0.1 baseline and the committed A0 and A1 RF results were read, never overwritten.
- No model beyond XGBoost and LightGBM was trained.
