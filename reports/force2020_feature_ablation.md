# FORCE 2020 feature ablation: Random Forest, A0 vs A1 vs A2

| | |
|---|---|
| experiment | `force2020-litho-rf-feature-ablation-v0.2` |
| model | RandomForestClassifier |
| arms | `A0`, `A1`, `A1-DRHO`, `A1-DTS`, `A1-NPHI`, `A1-PEF`, `A1-RHOB`, `A2` |

## What each arm is

| arm | table | columns | question |
|---|---|---:|---|
| `A0` | `v0.1` | 5 | the shipped five-curve baseline, read from its committed report |
| `A1` | `v0.2` | 10 | do the five added curves (RHOB, NPHI, PEF, DRHO, DTS) add signal beyond the five the baseline already had |
| `A2` | `v0.2` | 20 | does telling the model which curves were not measured, separately from what was measured, add anything on top of A1 |
| `A1-DRHO` | `v0.2` | 9 | how much of A1's gain over A0 survives removing DRHO, and so how much of the gain that curve is responsible for |
| `A1-DTS` | `v0.2` | 9 | how much of A1's gain over A0 survives removing DTS, and so how much of the gain that curve is responsible for |
| `A1-NPHI` | `v0.2` | 9 | how much of A1's gain over A0 survives removing NPHI, and so how much of the gain that curve is responsible for |
| `A1-PEF` | `v0.2` | 9 | how much of A1's gain over A0 survives removing PEF, and so how much of the gain that curve is responsible for |
| `A1-RHOB` | `v0.2` | 9 | how much of A1's gain over A0 survives removing RHOB, and so how much of the gain that curve is responsible for |

**no hyperparameter was searched, tuned or selected on any metric. Every model uses RFConfig() exactly as the frozen baseline did, and the only difference between the arms is the column list. That is what makes the difference in the results attributable to the features.**

**hidden_test and leaderboard_test were scored once each, after fitting, and were never used to choose a column, a curve or a hyperparameter. A0 comes from a stored report produced by the same metrics code, so the comparison is between two numbers computed by one definition.**

## Headline

| partition | metric | A0 | A1 | A2 | A1 vs A0 | A2 vs A0 |
|---|---|---:|---:|---:|---:|---:|
| `hidden_test` | macro F1 | +0.3609 | +0.4529 | +0.4262 | +0.0920 | +0.0653 |
| `hidden_test` | macro F1, supported only | +0.3937 | +0.4941 | +0.4649 | +0.1004 | +0.0712 |
| `hidden_test` | weighted F1 | +0.6636 | +0.7215 | +0.7074 | +0.0579 | +0.0439 |
| `hidden_test` | balanced accuracy | +0.4056 | +0.4870 | +0.4632 | +0.0814 | +0.0576 |
| `hidden_test` | mean penalty (lower is better) | +0.9380 | +0.7456 | +0.7979 | -0.1924 | -0.1401 |
| `leaderboard_test` | macro F1 | +0.2332 | +0.3027 | +0.2741 | +0.0695 | +0.0410 |
| `leaderboard_test` | macro F1, supported only | +0.2798 | +0.3632 | +0.3289 | +0.0834 | +0.0491 |
| `leaderboard_test` | weighted F1 | +0.6344 | +0.7026 | +0.6955 | +0.0682 | +0.0611 |
| `leaderboard_test` | balanced accuracy | +0.3303 | +0.3823 | +0.3695 | +0.0520 | +0.0392 |
| `leaderboard_test` | mean penalty (lower is better) | +1.0418 | +0.7983 | +0.8384 | -0.2435 | -0.2033 |

## Per-class F1

### `hidden_test`

| class | support | A0 F1 | A1 F1 | A1 delta | A2 F1 | A2 delta |
|---|---:|---:|---:|---:|---:|---:|
| Shale | 71,827 | +0.8441 | +0.8754 | +0.0313 | +0.8640 | +0.0199 |
| Sandstone | 14,045 | +0.4792 | +0.6186 | +0.1395 | +0.6203 | +0.1411 |
| Sandstone/Shale | 12,283 | +0.2878 | +0.3246 | +0.0368 | +0.3183 | +0.0304 |
| Limestone | 8,374 | +0.3023 | +0.4700 | +0.1677 | +0.4573 | +0.1550 |
| Halite | 6,498 | +0.9338 | +0.9652 | +0.0314 | +0.9322 | -0.0016 |
| Marl | 4,396 | +0.1051 | +0.1581 | +0.0530 | +0.1728 | +0.0677 |
| Chalk | 2,905 | +0.2225 | +0.3715 | +0.1489 | +0.1885 | -0.0340 |
| Tuff | 941 | +0.1219 | +0.1519 | +0.0301 | +0.1296 | +0.0077 |
| Anhydrite | 597 | +0.6930 | +0.7500 | +0.0570 | +0.6789 | -0.0141 |
| Dolomite | 287 | +0.0353 | +0.0000 | -0.0353 | +0.0000 | -0.0353 |
| Coal | 244 | +0.3058 | +0.7495 | +0.4437 | +0.7522 | +0.4464 |
| Basement | 0 | n/a | n/a | n/a | n/a | n/a |

### `leaderboard_test`

| class | support | A0 F1 | A1 F1 | A1 delta | A2 F1 | A2 delta |
|---|---:|---:|---:|---:|---:|---:|
| Shale | 83,975 | +0.7544 | +0.8162 | +0.0618 | +0.8038 | +0.0494 |
| Sandstone | 24,048 | +0.6606 | +0.7568 | +0.0963 | +0.7718 | +0.1112 |
| Sandstone/Shale | 17,558 | +0.2895 | +0.3576 | +0.0680 | +0.3578 | +0.0682 |
| Limestone | 4,798 | +0.2967 | +0.3711 | +0.0744 | +0.3210 | +0.0243 |
| Marl | 3,306 | +0.1526 | +0.1343 | -0.0182 | +0.1350 | -0.0175 |
| Tuff | 1,245 | +0.1727 | +0.3204 | +0.1477 | +0.3364 | +0.1637 |
| Coal | 690 | +0.3414 | +0.5853 | +0.2440 | +0.5408 | +0.1995 |
| Chalk | 625 | +0.1275 | +0.0434 | -0.0841 | +0.0227 | -0.1048 |
| Dolomite | 416 | +0.0025 | +0.0000 | -0.0025 | +0.0000 | -0.0025 |
| Anhydrite | 125 | +0.0000 | +0.2468 | +0.2468 | +0.0000 | +0.0000 |
| Halite | 0 | n/a | n/a | n/a | n/a | n/a |
| Basement | 0 | n/a | n/a | n/a | n/a | n/a |

## Confusion matrices

### `hidden_test`: rows true, columns predicted

| true \ pred | Sandstone | Shale | Sandstone/Shale | Limestone | Chalk | Dolomite | Marl | Anhydrite | Halite | Coal | Basement | Tuff |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
**A0**

| Sandstone | 7023 | 2257 | 2051 | 1384 | 36 | 7 | 1163 | 1 | 0 | 9 | 0 | 114 |
| Shale | 2049 | 59770 | 4539 | 2058 | 0 | 93 | 1789 | 0 | 0 | 262 | 0 | 1267 |
| Sandstone/Shale | 2272 | 5034 | 3465 | 590 | 3 | 2 | 485 | 0 | 0 | 74 | 0 | 358 |
| Limestone | 2337 | 1007 | 478 | 2759 | 153 | 21 | 1467 | 35 | 0 | 15 | 0 | 102 |
| Chalk | 659 | 0 | 0 | 1403 | 391 | 26 | 141 | 0 | 2 | 0 | 0 | 283 |
| Dolomite | 15 | 104 | 15 | 15 | 1 | 8 | 12 | 103 | 0 | 0 | 0 | 14 |
| Marl | 580 | 1197 | 1082 | 914 | 25 | 0 | 528 | 0 | 0 | 0 | 0 | 70 |
| Anhydrite | 9 | 0 | 0 | 112 | 0 | 9 | 23 | 412 | 32 | 0 | 0 | 0 |
| Halite | 102 | 10 | 0 | 624 | 0 | 0 | 0 | 41 | 5721 | 0 | 0 | 0 |
| Coal | 53 | 32 | 35 | 4 | 0 | 0 | 1 | 0 | 0 | 109 | 0 | 10 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 169 | 375 | 130 | 16 | 0 | 0 | 46 | 0 | 0 | 0 | 0 | 205 |

**A1**

| Sandstone | 9431 | 1169 | 1210 | 1044 | 97 | 9 | 1051 | 1 | 0 | 1 | 0 | 32 |
| Shale | 1289 | 62137 | 3026 | 1397 | 0 | 0 | 3417 | 6 | 0 | 26 | 0 | 529 |
| Sandstone/Shale | 2696 | 4200 | 3353 | 1275 | 3 | 1 | 522 | 0 | 0 | 12 | 0 | 221 |
| Limestone | 1787 | 911 | 190 | 4639 | 13 | 4 | 763 | 30 | 0 | 1 | 0 | 36 |
| Chalk | 618 | 0 | 0 | 1118 | 690 | 0 | 172 | 0 | 0 | 0 | 0 | 307 |
| Dolomite | 0 | 115 | 0 | 75 | 0 | 0 | 13 | 81 | 0 | 0 | 0 | 3 |
| Marl | 193 | 1063 | 568 | 1586 | 3 | 2 | 896 | 0 | 0 | 1 | 0 | 84 |
| Anhydrite | 16 | 1 | 1 | 78 | 4 | 2 | 16 | 429 | 50 | 0 | 0 | 0 |
| Halite | 247 | 12 | 0 | 129 | 0 | 0 | 0 | 0 | 6108 | 2 | 0 | 0 |
| Coal | 27 | 19 | 17 | 6 | 0 | 0 | 3 | 0 | 0 | 172 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 141 | 507 | 10 | 19 | 0 | 0 | 87 | 0 | 0 | 0 | 0 | 177 |

**A1-DRHO**

| Sandstone | 9355 | 972 | 1090 | 1142 | 151 | 7 | 1281 | 2 | 0 | 1 | 0 | 44 |
| Shale | 1167 | 61383 | 3644 | 2251 | 5 | 4 | 2610 | 6 | 0 | 31 | 0 | 726 |
| Sandstone/Shale | 2564 | 4366 | 3371 | 1066 | 4 | 0 | 573 | 1 | 0 | 12 | 0 | 326 |
| Limestone | 1885 | 883 | 207 | 4549 | 79 | 3 | 669 | 49 | 0 | 0 | 0 | 50 |
| Chalk | 511 | 0 | 0 | 1705 | 307 | 0 | 51 | 0 | 0 | 0 | 0 | 331 |
| Dolomite | 9 | 117 | 4 | 49 | 0 | 8 | 5 | 89 | 0 | 0 | 0 | 6 |
| Marl | 197 | 1010 | 670 | 1534 | 2 | 1 | 898 | 1 | 0 | 2 | 0 | 81 |
| Anhydrite | 18 | 1 | 2 | 43 | 4 | 13 | 15 | 451 | 50 | 0 | 0 | 0 |
| Halite | 287 | 10 | 1 | 226 | 0 | 1 | 0 | 0 | 5972 | 1 | 0 | 0 |
| Coal | 28 | 20 | 16 | 6 | 0 | 0 | 1 | 0 | 0 | 173 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 104 | 488 | 8 | 60 | 0 | 0 | 123 | 0 | 0 | 0 | 0 | 158 |

**A1-DTS**

| Sandstone | 9278 | 1120 | 1485 | 1069 | 96 | 7 | 954 | 2 | 0 | 0 | 0 | 34 |
| Shale | 1019 | 62089 | 2322 | 2006 | 0 | 4 | 3893 | 6 | 0 | 28 | 0 | 460 |
| Sandstone/Shale | 2644 | 4152 | 3431 | 1419 | 2 | 1 | 393 | 0 | 0 | 15 | 0 | 226 |
| Limestone | 2401 | 877 | 277 | 3742 | 14 | 1 | 998 | 22 | 0 | 2 | 0 | 40 |
| Chalk | 518 | 0 | 0 | 1214 | 741 | 0 | 131 | 0 | 0 | 0 | 0 | 301 |
| Dolomite | 2 | 105 | 0 | 66 | 1 | 2 | 29 | 80 | 0 | 0 | 1 | 1 |
| Marl | 274 | 1119 | 892 | 1499 | 3 | 0 | 518 | 0 | 0 | 3 | 0 | 88 |
| Anhydrite | 24 | 1 | 0 | 40 | 4 | 11 | 16 | 453 | 48 | 0 | 0 | 0 |
| Halite | 353 | 10 | 1 | 52 | 0 | 0 | 0 | 1 | 6080 | 1 | 0 | 0 |
| Coal | 31 | 21 | 17 | 4 | 0 | 0 | 1 | 0 | 0 | 170 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 119 | 528 | 11 | 30 | 0 | 0 | 52 | 0 | 0 | 0 | 0 | 201 |

**A1-NPHI**

| Sandstone | 7895 | 1502 | 2215 | 971 | 106 | 8 | 1313 | 3 | 0 | 0 | 0 | 32 |
| Shale | 1309 | 61338 | 3253 | 966 | 1 | 2 | 4211 | 2 | 0 | 15 | 1 | 729 |
| Sandstone/Shale | 2522 | 4316 | 3412 | 1275 | 9 | 1 | 468 | 0 | 0 | 12 | 0 | 268 |
| Limestone | 1698 | 1035 | 365 | 4502 | 101 | 84 | 534 | 8 | 0 | 2 | 0 | 45 |
| Chalk | 604 | 0 | 0 | 1254 | 684 | 0 | 72 | 0 | 0 | 0 | 0 | 291 |
| Dolomite | 23 | 104 | 1 | 26 | 2 | 4 | 26 | 98 | 0 | 0 | 0 | 3 |
| Marl | 179 | 1343 | 749 | 1297 | 5 | 6 | 734 | 0 | 0 | 4 | 0 | 79 |
| Anhydrite | 52 | 0 | 2 | 107 | 4 | 9 | 24 | 337 | 50 | 0 | 12 | 0 |
| Halite | 235 | 8 | 0 | 488 | 0 | 0 | 0 | 1 | 5763 | 3 | 0 | 0 |
| Coal | 38 | 16 | 18 | 6 | 0 | 0 | 5 | 0 | 0 | 160 | 0 | 1 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 132 | 515 | 12 | 39 | 0 | 0 | 66 | 0 | 0 | 0 | 0 | 177 |

**A1-PEF**

| Sandstone | 9235 | 1280 | 1284 | 1119 | 45 | 6 | 983 | 2 | 0 | 0 | 0 | 91 |
| Shale | 953 | 63121 | 2338 | 1355 | 1 | 3 | 3601 | 5 | 0 | 23 | 0 | 427 |
| Sandstone/Shale | 2547 | 4301 | 3044 | 1493 | 3 | 0 | 722 | 1 | 0 | 10 | 0 | 162 |
| Limestone | 1868 | 911 | 241 | 4415 | 18 | 6 | 844 | 31 | 0 | 2 | 0 | 38 |
| Chalk | 401 | 0 | 1 | 1340 | 597 | 1 | 216 | 0 | 0 | 0 | 0 | 349 |
| Dolomite | 4 | 116 | 1 | 67 | 0 | 10 | 17 | 66 | 0 | 0 | 3 | 3 |
| Marl | 195 | 1130 | 325 | 1557 | 0 | 0 | 1101 | 0 | 0 | 1 | 0 | 87 |
| Anhydrite | 8 | 1 | 0 | 65 | 4 | 14 | 11 | 447 | 47 | 0 | 0 | 0 |
| Halite | 241 | 9 | 0 | 296 | 0 | 1 | 0 | 1 | 5945 | 5 | 0 | 0 |
| Coal | 26 | 28 | 16 | 3 | 0 | 0 | 0 | 0 | 0 | 171 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 108 | 479 | 29 | 26 | 0 | 0 | 124 | 0 | 0 | 0 | 0 | 175 |

**A1-RHOB**

| Sandstone | 9472 | 1335 | 1040 | 1082 | 380 | 3 | 694 | 2 | 0 | 0 | 0 | 37 |
| Shale | 2364 | 61787 | 3307 | 1356 | 1 | 0 | 2587 | 1 | 0 | 52 | 0 | 372 |
| Sandstone/Shale | 3110 | 3982 | 3037 | 1532 | 3 | 0 | 429 | 0 | 0 | 13 | 0 | 177 |
| Limestone | 2141 | 915 | 192 | 4256 | 14 | 5 | 774 | 26 | 0 | 0 | 0 | 51 |
| Chalk | 743 | 0 | 0 | 1043 | 607 | 0 | 275 | 0 | 0 | 0 | 0 | 237 |
| Dolomite | 22 | 124 | 1 | 50 | 2 | 7 | 13 | 64 | 0 | 0 | 0 | 4 |
| Marl | 485 | 794 | 548 | 1543 | 1 | 1 | 962 | 0 | 0 | 0 | 0 | 62 |
| Anhydrite | 19 | 2 | 0 | 190 | 2 | 1 | 7 | 320 | 56 | 0 | 0 | 0 |
| Halite | 413 | 20 | 0 | 198 | 0 | 0 | 0 | 7 | 5860 | 0 | 0 | 0 |
| Coal | 30 | 23 | 33 | 6 | 0 | 0 | 3 | 0 | 0 | 148 | 0 | 1 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 247 | 441 | 7 | 6 | 0 | 0 | 83 | 0 | 0 | 0 | 0 | 157 |

**A2**

| Sandstone | 9282 | 1090 | 1033 | 897 | 272 | 5 | 1450 | 3 | 0 | 0 | 0 | 13 |
| Shale | 1234 | 60139 | 3873 | 1706 | 3 | 2 | 4216 | 5 | 0 | 31 | 0 | 618 |
| Sandstone/Shale | 2428 | 3759 | 3387 | 1546 | 4 | 0 | 881 | 0 | 0 | 11 | 0 | 267 |
| Limestone | 1631 | 890 | 162 | 4803 | 21 | 1 | 800 | 32 | 0 | 1 | 0 | 33 |
| Chalk | 217 | 20 | 67 | 1734 | 334 | 0 | 261 | 0 | 0 | 0 | 0 | 272 |
| Dolomite | 1 | 124 | 0 | 63 | 5 | 0 | 12 | 81 | 0 | 0 | 0 | 1 |
| Marl | 182 | 854 | 456 | 1687 | 0 | 0 | 1153 | 0 | 0 | 0 | 0 | 64 |
| Anhydrite | 33 | 0 | 1 | 117 | 0 | 3 | 20 | 369 | 54 | 0 | 0 | 0 |
| Halite | 717 | 8 | 0 | 53 | 0 | 0 | 0 | 0 | 5720 | 0 | 0 | 0 |
| Coal | 24 | 16 | 23 | 5 | 0 | 0 | 3 | 0 | 0 | 173 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 135 | 479 | 0 | 22 | 0 | 0 | 152 | 0 | 0 | 0 | 0 | 153 |

### `leaderboard_test`: rows true, columns predicted

| true \ pred | Sandstone | Shale | Sandstone/Shale | Limestone | Chalk | Dolomite | Marl | Anhydrite | Halite | Coal | Basement | Tuff |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
**A0**

| Sandstone | 15691 | 1654 | 2415 | 1264 | 15 | 162 | 400 | 11 | 0 | 652 | 0 | 1784 |
| Shale | 3500 | 57543 | 13164 | 3467 | 8 | 189 | 4036 | 0 | 0 | 75 | 0 | 1993 |
| Sandstone/Shale | 2787 | 7807 | 5858 | 322 | 1 | 2 | 317 | 1 | 0 | 102 | 0 | 361 |
| Limestone | 795 | 527 | 611 | 2072 | 266 | 16 | 308 | 27 | 26 | 1 | 0 | 149 |
| Chalk | 0 | 0 | 0 | 559 | 64 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 14 | 175 | 49 | 121 | 0 | 1 | 53 | 0 | 0 | 2 | 0 | 1 |
| Marl | 389 | 287 | 587 | 1285 | 25 | 0 | 699 | 0 | 0 | 25 | 0 | 9 |
| Anhydrite | 57 | 34 | 22 | 8 | 0 | 0 | 1 | 0 | 0 | 3 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 104 | 127 | 124 | 7 | 0 | 0 | 8 | 0 | 0 | 319 | 0 | 1 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 122 | 422 | 77 | 63 | 0 | 3 | 34 | 0 | 0 | 0 | 0 | 524 |

**A1**

| Sandstone | 19088 | 1998 | 1383 | 753 | 6 | 3 | 138 | 7 | 0 | 106 | 0 | 566 |
| Shale | 2828 | 65949 | 8840 | 3440 | 2 | 0 | 2308 | 0 | 0 | 180 | 0 | 428 |
| Sandstone/Shale | 3214 | 7702 | 6245 | 148 | 4 | 0 | 33 | 0 | 0 | 82 | 0 | 130 |
| Limestone | 620 | 720 | 338 | 2648 | 73 | 0 | 274 | 2 | 56 | 6 | 0 | 61 |
| Chalk | 0 | 0 | 0 | 609 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 17 | 270 | 11 | 93 | 0 | 0 | 21 | 1 | 0 | 2 | 0 | 1 |
| Marl | 378 | 389 | 368 | 1702 | 12 | 0 | 438 | 0 | 0 | 18 | 0 | 1 |
| Anhydrite | 25 | 9 | 0 | 71 | 0 | 0 | 1 | 19 | 0 | 0 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 71 | 127 | 41 | 0 | 0 | 0 | 0 | 0 | 0 | 451 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 152 | 465 | 147 | 9 | 0 | 0 | 2 | 0 | 0 | 6 | 0 | 464 |

**A1-DRHO**

| Sandstone | 19068 | 2018 | 1510 | 752 | 6 | 0 | 141 | 20 | 0 | 113 | 0 | 420 |
| Shale | 2709 | 65507 | 9169 | 3449 | 4 | 0 | 2232 | 0 | 0 | 173 | 0 | 732 |
| Sandstone/Shale | 3168 | 7678 | 6282 | 144 | 3 | 0 | 18 | 0 | 0 | 83 | 0 | 182 |
| Limestone | 675 | 668 | 334 | 2589 | 98 | 3 | 270 | 6 | 56 | 2 | 0 | 97 |
| Chalk | 0 | 0 | 0 | 581 | 44 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 16 | 272 | 12 | 92 | 0 | 0 | 23 | 0 | 0 | 0 | 0 | 1 |
| Marl | 384 | 373 | 338 | 1744 | 9 | 0 | 430 | 0 | 1 | 18 | 0 | 9 |
| Anhydrite | 11 | 25 | 1 | 72 | 0 | 0 | 1 | 15 | 0 | 0 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 69 | 127 | 46 | 0 | 0 | 0 | 0 | 0 | 0 | 448 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 137 | 502 | 59 | 3 | 0 | 0 | 4 | 0 | 0 | 4 | 0 | 536 |

**A1-DTS**

| Sandstone | 19010 | 2091 | 1679 | 529 | 6 | 4 | 217 | 0 | 0 | 115 | 0 | 397 |
| Shale | 2705 | 64544 | 8767 | 2362 | 0 | 2 | 4973 | 0 | 0 | 189 | 0 | 433 |
| Sandstone/Shale | 2945 | 7667 | 6388 | 178 | 0 | 0 | 165 | 0 | 0 | 81 | 0 | 134 |
| Limestone | 691 | 664 | 499 | 2538 | 65 | 1 | 208 | 2 | 58 | 3 | 0 | 69 |
| Chalk | 0 | 0 | 0 | 603 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 13 | 220 | 15 | 122 | 0 | 0 | 43 | 1 | 0 | 1 | 0 | 1 |
| Marl | 405 | 388 | 552 | 1380 | 12 | 0 | 553 | 0 | 1 | 15 | 0 | 0 |
| Anhydrite | 15 | 11 | 0 | 65 | 0 | 0 | 10 | 24 | 0 | 0 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 68 | 120 | 44 | 0 | 0 | 0 | 0 | 0 | 0 | 458 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 150 | 465 | 131 | 5 | 0 | 0 | 7 | 0 | 0 | 4 | 0 | 483 |

**A1-NPHI**

| Sandstone | 19168 | 1944 | 1571 | 708 | 13 | 2 | 107 | 1 | 0 | 205 | 0 | 329 |
| Shale | 2639 | 64442 | 10453 | 3412 | 5 | 0 | 2389 | 0 | 0 | 184 | 0 | 451 |
| Sandstone/Shale | 3351 | 7480 | 6237 | 222 | 8 | 0 | 32 | 0 | 0 | 94 | 0 | 134 |
| Limestone | 629 | 696 | 416 | 2586 | 38 | 6 | 298 | 0 | 62 | 3 | 1 | 63 |
| Chalk | 0 | 0 | 0 | 619 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 7 | 302 | 7 | 81 | 0 | 0 | 17 | 0 | 0 | 1 | 0 | 1 |
| Marl | 389 | 385 | 457 | 1663 | 15 | 0 | 378 | 0 | 0 | 18 | 0 | 1 |
| Anhydrite | 0 | 35 | 5 | 84 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 66 | 108 | 70 | 2 | 0 | 0 | 0 | 0 | 0 | 444 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 175 | 485 | 96 | 21 | 0 | 0 | 15 | 0 | 0 | 1 | 0 | 452 |

**A1-PEF**

| Sandstone | 18570 | 2090 | 1622 | 919 | 7 | 5 | 174 | 21 | 0 | 114 | 0 | 526 |
| Shale | 2757 | 66266 | 8174 | 3581 | 2 | 1 | 2501 | 0 | 0 | 169 | 0 | 524 |
| Sandstone/Shale | 3424 | 7987 | 5622 | 165 | 5 | 0 | 64 | 0 | 0 | 77 | 0 | 214 |
| Limestone | 577 | 707 | 348 | 2519 | 191 | 0 | 336 | 1 | 54 | 3 | 0 | 62 |
| Chalk | 0 | 0 | 0 | 565 | 60 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 20 | 286 | 7 | 82 | 0 | 0 | 19 | 1 | 0 | 0 | 0 | 1 |
| Marl | 307 | 386 | 356 | 1790 | 14 | 0 | 435 | 0 | 1 | 14 | 0 | 3 |
| Anhydrite | 22 | 15 | 1 | 38 | 0 | 0 | 3 | 46 | 0 | 0 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 61 | 123 | 44 | 0 | 0 | 0 | 0 | 0 | 0 | 462 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 147 | 472 | 142 | 15 | 0 | 0 | 5 | 0 | 0 | 7 | 0 | 457 |

**A1-RHOB**

| Sandstone | 18505 | 1467 | 1577 | 827 | 11 | 112 | 162 | 2 | 0 | 44 | 0 | 1341 |
| Shale | 3259 | 63217 | 9607 | 4781 | 5 | 5 | 2332 | 0 | 0 | 133 | 0 | 636 |
| Sandstone/Shale | 3212 | 7651 | 6230 | 171 | 5 | 0 | 45 | 0 | 0 | 71 | 0 | 173 |
| Limestone | 911 | 615 | 320 | 2461 | 123 | 7 | 235 | 9 | 39 | 3 | 0 | 75 |
| Chalk | 0 | 0 | 0 | 599 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 19 | 225 | 18 | 131 | 0 | 0 | 22 | 0 | 0 | 0 | 0 | 1 |
| Marl | 565 | 336 | 334 | 1732 | 29 | 0 | 301 | 0 | 0 | 0 | 0 | 9 |
| Anhydrite | 29 | 7 | 7 | 79 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 69 | 161 | 73 | 3 | 0 | 0 | 0 | 0 | 0 | 384 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 130 | 430 | 165 | 7 | 0 | 0 | 1 | 0 | 0 | 4 | 0 | 508 |

**A2**

| Sandstone | 19489 | 1616 | 1396 | 888 | 5 | 2 | 138 | 18 | 0 | 86 | 0 | 410 |
| Shale | 2452 | 63870 | 9007 | 5502 | 3 | 1 | 2269 | 0 | 0 | 328 | 0 | 543 |
| Sandstone/Shale | 3266 | 7560 | 6235 | 227 | 2 | 0 | 29 | 0 | 0 | 78 | 0 | 161 |
| Limestone | 670 | 675 | 259 | 2702 | 53 | 2 | 294 | 1 | 53 | 8 | 0 | 81 |
| Chalk | 0 | 0 | 0 | 617 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Dolomite | 13 | 225 | 17 | 132 | 0 | 0 | 23 | 0 | 0 | 5 | 0 | 1 |
| Marl | 373 | 388 | 197 | 1877 | 8 | 0 | 439 | 0 | 0 | 17 | 0 | 7 |
| Anhydrite | 2 | 33 | 1 | 89 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Halite | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Coal | 66 | 120 | 47 | 0 | 0 | 0 | 0 | 0 | 0 | 457 | 0 | 0 |
| Basement | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tuff | 123 | 462 | 139 | 1 | 0 | 0 | 4 | 0 | 0 | 21 | 0 | 495 |

## Feature importance

### `A1`

*impurity, RandomForestClassifier.feature_importances_. computed on training wells and not comparable across arms with different column counts; reported for within-arm ranking and for continuity with the frozen baseline.*

| column | importance | share |
|---|---:|---:|
| `DTC` | 0.158457 | 0.1585 |
| `RHOB` | 0.157109 | 0.1571 |
| `GR` | 0.144447 | 0.1444 |
| `NPHI` | 0.119201 | 0.1192 |
| `CALI` | 0.109372 | 0.1094 |
| `RDEP` | 0.098205 | 0.0982 |
| `RMED` | 0.091637 | 0.0916 |
| `PEF` | 0.053727 | 0.0537 |
| `DRHO` | 0.048845 | 0.0488 |
| `DTS` **(tracked)** | 0.018999 | 0.0190 |

### `A1-DRHO`

*impurity, RandomForestClassifier.feature_importances_. computed on training wells and not comparable across arms with different column counts; reported for within-arm ranking and for continuity with the frozen baseline.*

| column | importance | share |
|---|---:|---:|
| `RHOB` | 0.167162 | 0.1672 |
| `DTC` | 0.164003 | 0.1640 |
| `GR` | 0.153252 | 0.1533 |
| `NPHI` | 0.116254 | 0.1163 |
| `CALI` | 0.115518 | 0.1155 |
| `RDEP` | 0.107244 | 0.1072 |
| `RMED` | 0.098445 | 0.0984 |
| `PEF` | 0.058121 | 0.0581 |
| `DTS` **(tracked)** | 0.020000 | 0.0200 |

### `A1-DTS`

*impurity, RandomForestClassifier.feature_importances_. computed on training wells and not comparable across arms with different column counts; reported for within-arm ranking and for continuity with the frozen baseline.*

| column | importance | share |
|---|---:|---:|
| `RHOB` | 0.165392 | 0.1654 |
| `DTC` | 0.157368 | 0.1574 |
| `GR` | 0.149039 | 0.1490 |
| `NPHI` | 0.119483 | 0.1195 |
| `CALI` | 0.112728 | 0.1127 |
| `RDEP` | 0.096208 | 0.0962 |
| `RMED` | 0.093991 | 0.0940 |
| `PEF` | 0.054894 | 0.0549 |
| `DRHO` | 0.050896 | 0.0509 |

### `A1-NPHI`

*impurity, RandomForestClassifier.feature_importances_. computed on training wells and not comparable across arms with different column counts; reported for within-arm ranking and for continuity with the frozen baseline.*

| column | importance | share |
|---|---:|---:|
| `DTC` | 0.181390 | 0.1814 |
| `RHOB` | 0.175199 | 0.1752 |
| `GR` | 0.162741 | 0.1627 |
| `CALI` | 0.124280 | 0.1243 |
| `RMED` | 0.111432 | 0.1114 |
| `RDEP` | 0.105315 | 0.1053 |
| `PEF` | 0.060838 | 0.0608 |
| `DRHO` | 0.057215 | 0.0572 |
| `DTS` **(tracked)** | 0.021591 | 0.0216 |

### `A1-PEF`

*impurity, RandomForestClassifier.feature_importances_. computed on training wells and not comparable across arms with different column counts; reported for within-arm ranking and for continuity with the frozen baseline.*

| column | importance | share |
|---|---:|---:|
| `RHOB` | 0.166701 | 0.1667 |
| `DTC` | 0.161139 | 0.1611 |
| `GR` | 0.153793 | 0.1538 |
| `NPHI` | 0.119482 | 0.1195 |
| `CALI` | 0.118351 | 0.1184 |
| `RMED` | 0.102376 | 0.1024 |
| `RDEP` | 0.101032 | 0.1010 |
| `DRHO` | 0.055576 | 0.0556 |
| `DTS` **(tracked)** | 0.021549 | 0.0215 |

### `A1-RHOB`

*impurity, RandomForestClassifier.feature_importances_. computed on training wells and not comparable across arms with different column counts; reported for within-arm ranking and for continuity with the frozen baseline.*

| column | importance | share |
|---|---:|---:|
| `DTC` | 0.199392 | 0.1994 |
| `GR` | 0.154397 | 0.1544 |
| `NPHI` | 0.133704 | 0.1337 |
| `CALI` | 0.130190 | 0.1302 |
| `RDEP` | 0.119848 | 0.1198 |
| `RMED` | 0.114609 | 0.1146 |
| `PEF` | 0.063843 | 0.0638 |
| `DRHO` | 0.063014 | 0.0630 |
| `DTS` **(tracked)** | 0.021003 | 0.0210 |

### `A2`

*impurity, RandomForestClassifier.feature_importances_. computed on training wells and not comparable across arms with different column counts; reported for within-arm ranking and for continuity with the frozen baseline.*

| column | importance | share |
|---|---:|---:|
| `DTC` | 0.148462 | 0.1485 |
| `RHOB` | 0.137004 | 0.1370 |
| `GR` | 0.128535 | 0.1285 |
| `NPHI` | 0.102117 | 0.1021 |
| `CALI` | 0.098619 | 0.0986 |
| `RDEP` | 0.090386 | 0.0904 |
| `RMED` | 0.080665 | 0.0807 |
| `DRHO` | 0.046344 | 0.0463 |
| `PEF` | 0.041234 | 0.0412 |
| `RMED_MISSING` | 0.032702 | 0.0327 |
| `PEF_MISSING` | 0.018028 | 0.0180 |
| `DTS` **(tracked)** | 0.014023 | 0.0140 |
| `RDEP_MISSING` | 0.012706 | 0.0127 |
| `NPHI_MISSING` | 0.011949 | 0.0119 |
| `DTC_MISSING` | 0.008417 | 0.0084 |
| `CALI_MISSING` | 0.007384 | 0.0074 |
| `RHOB_MISSING` | 0.007307 | 0.0073 |
| `DTS_MISSING` | 0.007068 | 0.0071 |
| `DRHO_MISSING` | 0.007048 | 0.0070 |
| `GR_MISSING` | 0.000000 | 0.0000 |

## Tracked separately

DTS is reported on its own because its availability is the worst of any selected curve: 85.1% missing on training wells, 40.5% on hidden_test and 68.4% on leaderboard_test. It cleared the selection stage's coverage gate (present in 8 of 10 hidden and 6 of 10 leaderboard wells), so it is in A1, but a median-imputed column that is mostly imputation on the partition used to decide retention is a different kind of evidence from one that is mostly measurement. Whether it helps is an empirical question, answered by the drop-one run rather than asserted here.

**A1** measured availability by column, on each split:

| column | train | hidden_test | leaderboard_test |
|---|---:|---:|---:|
| `CALI` | 0.0751 | 0.0281 | 0.0413 |
| `RDEP` | 0.0094 | 0.0001 | 0.0004 |
| `RMED` | 0.0333 | 0.0802 | 0.0043 |
| `DTC` | 0.0691 | 0.0335 | 0.0060 |
| `GR` | 0.0000 | 0.0000 | 0.0000 |
| `DTS` | 0.8508 | 0.4046 | 0.6840 |
| `NPHI` | 0.3461 | 0.2111 | 0.2394 |
| `PEF` | 0.4262 | 0.1794 | 0.1702 |
| `RHOB` | 0.1378 | 0.0778 | 0.1240 |
| `DRHO` | 0.1560 | 0.0828 | 0.1844 |

**A1-DRHO** measured availability by column, on each split:

| column | train | hidden_test | leaderboard_test |
|---|---:|---:|---:|
| `CALI` | 0.0751 | 0.0281 | 0.0413 |
| `RDEP` | 0.0094 | 0.0001 | 0.0004 |
| `RMED` | 0.0333 | 0.0802 | 0.0043 |
| `DTC` | 0.0691 | 0.0335 | 0.0060 |
| `GR` | 0.0000 | 0.0000 | 0.0000 |
| `DTS` | 0.8508 | 0.4046 | 0.6840 |
| `NPHI` | 0.3461 | 0.2111 | 0.2394 |
| `PEF` | 0.4262 | 0.1794 | 0.1702 |
| `RHOB` | 0.1378 | 0.0778 | 0.1240 |

**A1-DTS** measured availability by column, on each split:

| column | train | hidden_test | leaderboard_test |
|---|---:|---:|---:|
| `CALI` | 0.0751 | 0.0281 | 0.0413 |
| `RDEP` | 0.0094 | 0.0001 | 0.0004 |
| `RMED` | 0.0333 | 0.0802 | 0.0043 |
| `DTC` | 0.0691 | 0.0335 | 0.0060 |
| `GR` | 0.0000 | 0.0000 | 0.0000 |
| `NPHI` | 0.3461 | 0.2111 | 0.2394 |
| `PEF` | 0.4262 | 0.1794 | 0.1702 |
| `RHOB` | 0.1378 | 0.0778 | 0.1240 |
| `DRHO` | 0.1560 | 0.0828 | 0.1844 |

**A1-NPHI** measured availability by column, on each split:

| column | train | hidden_test | leaderboard_test |
|---|---:|---:|---:|
| `CALI` | 0.0751 | 0.0281 | 0.0413 |
| `RDEP` | 0.0094 | 0.0001 | 0.0004 |
| `RMED` | 0.0333 | 0.0802 | 0.0043 |
| `DTC` | 0.0691 | 0.0335 | 0.0060 |
| `GR` | 0.0000 | 0.0000 | 0.0000 |
| `DTS` | 0.8508 | 0.4046 | 0.6840 |
| `PEF` | 0.4262 | 0.1794 | 0.1702 |
| `RHOB` | 0.1378 | 0.0778 | 0.1240 |
| `DRHO` | 0.1560 | 0.0828 | 0.1844 |

**A1-PEF** measured availability by column, on each split:

| column | train | hidden_test | leaderboard_test |
|---|---:|---:|---:|
| `CALI` | 0.0751 | 0.0281 | 0.0413 |
| `RDEP` | 0.0094 | 0.0001 | 0.0004 |
| `RMED` | 0.0333 | 0.0802 | 0.0043 |
| `DTC` | 0.0691 | 0.0335 | 0.0060 |
| `GR` | 0.0000 | 0.0000 | 0.0000 |
| `DTS` | 0.8508 | 0.4046 | 0.6840 |
| `NPHI` | 0.3461 | 0.2111 | 0.2394 |
| `RHOB` | 0.1378 | 0.0778 | 0.1240 |
| `DRHO` | 0.1560 | 0.0828 | 0.1844 |

**A1-RHOB** measured availability by column, on each split:

| column | train | hidden_test | leaderboard_test |
|---|---:|---:|---:|
| `CALI` | 0.0751 | 0.0281 | 0.0413 |
| `RDEP` | 0.0094 | 0.0001 | 0.0004 |
| `RMED` | 0.0333 | 0.0802 | 0.0043 |
| `DTC` | 0.0691 | 0.0335 | 0.0060 |
| `GR` | 0.0000 | 0.0000 | 0.0000 |
| `DTS` | 0.8508 | 0.4046 | 0.6840 |
| `NPHI` | 0.3461 | 0.2111 | 0.2394 |
| `PEF` | 0.4262 | 0.1794 | 0.1702 |
| `DRHO` | 0.1560 | 0.0828 | 0.1844 |

**A2** measured availability by column, on each split:

| column | train | hidden_test | leaderboard_test |
|---|---:|---:|---:|
| `CALI` | 0.0751 | 0.0281 | 0.0413 |
| `RDEP` | 0.0094 | 0.0001 | 0.0004 |
| `RMED` | 0.0333 | 0.0802 | 0.0043 |
| `DTC` | 0.0691 | 0.0335 | 0.0060 |
| `GR` | 0.0000 | 0.0000 | 0.0000 |
| `DTS` | 0.8508 | 0.4046 | 0.6840 |
| `NPHI` | 0.3461 | 0.2111 | 0.2394 |
| `PEF` | 0.4262 | 0.1794 | 0.1702 |
| `RHOB` | 0.1378 | 0.0778 | 0.1240 |
| `DRHO` | 0.1560 | 0.0828 | 0.1844 |

## Drop-one attribution

each row is a full A1 refit with exactly one curve removed, same config, same split, no other change. Cost of removal is A1 macro F1 minus the refit's macro F1.

| dropped curve | A1 macro F1 | without it | cost of removal | still beats A0 |
|---|---|---|---:|---|
| `DRHO` | +0.4529 | +0.4341 | +0.0188 | yes |
| `DTS` | +0.4529 | +0.4454 | +0.0075 | yes |
| `NPHI` | +0.4529 | +0.4278 | +0.0251 | yes |
| `PEF` | +0.4529 | +0.4556 | -0.0027 | yes |
| `RHOB` | +0.4529 | +0.4248 | +0.0281 | yes |

Same table for the leaderboard partition:

| dropped curve | A1 macro F1 | without it | cost of removal | still beats A0 |
|---|---|---|---:|---|
| `DRHO` | +0.3027 | +0.3029 | -0.0003 | yes |
| `DTS` | +0.3027 | +0.3132 | -0.0106 | yes |
| `NPHI` | +0.3027 | +0.2747 | +0.0280 | yes |
| `PEF` | +0.3027 | +0.3231 | -0.0205 | yes |
| `RHOB` | +0.3027 | +0.2651 | +0.0375 | yes |

Ranked by mean cost of removal across both partitions:

| curve | mean cost | hidden | leaderboard | verdict |
|---|---:|---:|---:|---|
| `RHOB` | +0.0328 | +0.0281 | +0.0375 | contributing |
| `NPHI` | +0.0265 | +0.0251 | +0.0280 | contributing |
| `DRHO` | +0.0093 | +0.0188 | -0.0003 | does not survive removal on both partitions |
| `DTS` | -0.0015 | +0.0075 | -0.0106 | does not survive removal on both partitions |
| `PEF` | -0.0116 | -0.0027 | -0.0205 | does not survive removal on both partitions |

## Decision gate

Criterion, fixed in advance: macro F1 improves by at least 0.01 on both evaluation partitions, with balanced accuracy agreeing in sign.

| arm | macro F1 Δ hidden | macro F1 Δ leader | bal acc Δ hidden | bal acc Δ leader | meets threshold |
|---|---:|---:|---:|---:|---|
| `A1` | +0.0920 | +0.0695 | +0.0814 | +0.0520 | yes |
| `A2` | +0.0653 | +0.0410 | +0.0576 | +0.0392 | yes |

**Improved:** True.  
**Strongest arm:** `A1`.  
**Next step:** run XGBoost and LightGBM on A1's feature set.
