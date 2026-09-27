# FORCE 2020 dataset characterization

**Source commit:** `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1`  
**Archive:** 10.5281/zenodo.4351156  
**Licence:** CC-BY-4.0 (upstream: NPD/Equinor logs are NLOD 2.0)  
**Stage:** characterization, no model stage entered  
**Canonical dataset:** `nwis-forge16b-v0.2`, untouched

A read-only characterization of the source bytes. No model was trained, no
dataset was built, no value was filled, and nothing was written to
`data/processed/` or `data/ml/`. FORCE 2020 is an external dataset with its
own lithofacies vocabulary; it is not an extension of the NWIS canonical
dataset and its labels are not mapped onto `FORGE_UTAH_16B`.

## 1. Target classes

12 classes over **1,429,694** labelled rows (train + hidden_test + leaderboard_test_target), across 118 distinct wells. Well counts are distinct wells per class, so they do not sum to 118.

| # | Code | Class | Rows | Share of labelled | Wells | Min MD (m) | Max MD (m) | Thickness (m) |
|--:|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | `65000` | Shale | 876,605 | 61.314% | 118 | 164.94 | 5,436.63 | 5,271.7 |
| 2 | `30000` | Sandstone | 207,030 | 14.481% | 118 | 139.73 | 5,402.89 | 5,263.2 |
| 3 | `65030` | Sandstone/Shale | 180,296 | 12.611% | 117 | 136.09 | 5,359.26 | 5,223.2 |
| 4 | `70000` | Limestone | 69,492 | 4.861% | 114 | 487.75 | 4,967.44 | 4,479.7 |
| 5 | `80000` | Marl | 41,031 | 2.870% | 92 | 592.30 | 4,924.88 | 4,332.6 |
| 6 | `99000` | Tuff | 17,431 | 1.219% | 67 | 823.26 | 2,426.99 | 1,603.7 |
| 7 | `88000` | Halite | 14,711 | 1.029% | 4 | 2,300.80 | 3,820.17 | 1,519.4 |
| 8 | `70032` | Chalk | 14,043 | 0.982% | 15 | 1,020.18 | 2,900.47 | 1,880.3 |
| 9 | `90000` | Coal | 4,754 | 0.333% | 63 | 548.87 | 4,836.28 | 4,287.4 |
| 10 | `74000` | Dolomite | 2,391 | 0.167% | 47 | 779.13 | 3,925.06 | 3,145.9 |
| 11 | `86000` | Anhydrite | 1,807 | 0.126% | 10 | 2,087.99 | 4,622.25 | 2,534.3 |
| 12 | `93000` | Basement | 103 | 0.007% | 1 | 2,885.70 | 2,901.20 | 15.5 |
| | | **total** | **1,429,694** | 100% | | | | |

### Rows by published split

| Code | Class | train | hidden_test | leaderboard_test_target | Wells in train | Wells in hidden_test | Wells in leaderboard |
|---:|---|---:|---:|---:|---:|---:|---:|
| `65000` | Shale | 720,803 | 71,827 | 83,975 | 98 | 10 | 10 |
| `30000` | Sandstone | 168,937 | 14,045 | 24,048 | 98 | 10 | 10 |
| `65030` | Sandstone/Shale | 150,455 | 12,283 | 17,558 | 97 | 10 | 10 |
| `70000` | Limestone | 56,320 | 8,374 | 4,798 | 94 | 10 | 10 |
| `80000` | Marl | 33,329 | 4,396 | 3,306 | 73 | 10 | 9 |
| `99000` | Tuff | 15,245 | 941 | 1,245 | 55 | 6 | 6 |
| `88000` | Halite | 8,213 | 6,498 | 0 | 3 | 1 | 0 |
| `70032` | Chalk | 10,513 | 2,905 | 625 | 11 | 3 | 1 |
| `90000` | Coal | 3,820 | 244 | 690 | 51 | 5 | 7 |
| `74000` | Dolomite | 1,688 | 287 | 416 | 37 | 5 | 5 |
| `86000` | Anhydrite | 1,085 | 597 | 125 | 6 | 2 | 2 |
| `93000` | Basement | 103 | 0 | 0 | 1 | 0 | 0 |

## 2. Log curves

Measured on train.csv (1,170,511 rows). Units are carried over from the inspection pass, where they were transcribed from the source's own LAS `~Curve` sections. Caveat worth stating: the local checkout is sparse and holds 1 of the source's 118 LAS files, which names 14 of these 20 curves. For the other 6 the unit comes from the source's documentation rather than a locally parsed header (`DCAL`, `MUDWEIGHT`, `RMIC`, `RXO`, `SGR`, `SP`), and `ROPA` carries no unit in the source, so it shows as `—`.

| Curve | Unit | Non-null | Missing | Missing % | Wells | Cov % | Min | Median | Max | Sentinel cells |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CALI` | in | 1,082,634 | 87,877 | 7.51% | 97/98 | 99.0% | 2.344 | 12.556 | 28.279 | 0 |
| `BS` | in | 682,657 | 487,854 | 41.68% | 69/98 | 70.4% | 6 | 12.250 | 26.000 | 0 |
| `ROPA` | — | 192,325 | 978,186 | 83.57% | 25/98 | 25.5% | -999.250 | 20.131 | 742.798 | 0 |
| `ROP` | m/h | 535,071 | 635,440 | 54.29% | 53/98 | 54.1% | -0.118 | 17.800 | 47,015.125 | 0 |
| `RDEP` | ohm.m | 1,159,496 | 11,015 | 0.94% | 98/98 | 100.0% | 0.032 | 1.439 | 1,999.887 | 0 |
| `RSHA` | ohm.m | 630,650 | 539,861 | 46.12% | 74/98 | 75.5% | 0.000 | 1.399 | 2,193.905 | 0 |
| `RMED` | ohm.m | 1,131,518 | 38,993 | 3.33% | 97/98 | 99.0% | -0.008 | 1.444 | 1,988.616 | 0 |
| `RXO` | ohm.m | 327,427 | 843,084 | 72.03% | 38/98 | 38.8% | -999.900 | 1.367 | 35,930.672 | 0 |
| `RMIC` | ohm.m | 176,160 | 994,351 | 84.95% | 27/98 | 27.6% | 0.057 | 1.967 | 10,000 | 0 |
| `DTS` | us/ft | 174,613 | 995,898 | 85.08% | 32/98 | 32.7% | 69.163 | 188.201 | 676.578 | 0 |
| `DTC` | us/ft | 1,089,648 | 80,863 | 6.91% | 98/98 | 100.0% | 7.415 | 109.585 | 320.479 | 0 |
| `NPHI` | m3/m3 | 765,409 | 405,102 | 34.61% | 98/98 | 100.0% | -0.036 | 0.327 | 1.000 | 0 |
| `PEF` | b/e | 671,692 | 498,819 | 42.62% | 69/98 | 70.4% | 0.100 | 4.314 | 383.130 | 0 |
| `GR` | gAPI | 1,170,511 | 0 | 0.00% | 98/98 | 100.0% | 0.109 | 68.368 | 1,076.964 | 0 |
| `RHOB` | g/cm3 | 1,009,242 | 161,269 | 13.78% | 98/98 | 100.0% | 0.721 | 2.321 | 3.458 | 0 |
| `DRHO` | g/cm3 | 987,857 | 182,654 | 15.60% | 95/98 | 96.9% | -7,429.339 | 0.002 | 2.837 | 0 |
| `DCAL` | in | 298,833 | 871,678 | 74.47% | 22/98 | 22.4% | -12.215 | 0.557 | 10,011.423 | 0 |
| `SP` | mV | 864,247 | 306,264 | 26.16% | 68/98 | 69.4% | -999 | 55.391 | 526.547 | 0 |
| `MUDWEIGHT` | g/cm3 | 316,151 | 854,360 | 72.99% | 28/98 | 28.6% | 0.126 | 0.156 | 185.731 | 0 |
| `SGR` | gAPI | 69,353 | 1,101,158 | 94.07% | 13/98 | 13.3% | -777.986 | 69.563 | 963.609 | 0 |

### Data-availability verdict per curve

Thresholds: core = present in >= 80% of wells and <= 10% missing; masked = >= 25% of wells and <= 90% missing; anything sparser is `sparse`.

**data availability only; no model comparison is implied.**

| Curve | Tier | Measured reason |
|---|---|---|
| `CALI` | `core` | present in 97/98 wells (99.0%) and 87,877 missing rows (7.51%), inside the core thresholds (>=80% of wells, <=10% missing) |
| `BS` | `masked` | present in only 69/98 wells (70.4%) with 41.7% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `ROPA` | `masked` | present in only 25/98 wells (25.5%) with 83.6% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `ROP` | `masked` | present in only 53/98 wells (54.1%) with 54.3% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `RDEP` | `core` | present in 98/98 wells (100.0%) and 11,015 missing rows (0.94%), inside the core thresholds (>=80% of wells, <=10% missing) |
| `RSHA` | `masked` | present in only 74/98 wells (75.5%) with 46.1% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `RMED` | `core` | present in 97/98 wells (99.0%) and 38,993 missing rows (3.33%), inside the core thresholds (>=80% of wells, <=10% missing) |
| `RXO` | `masked` | present in only 38/98 wells (38.8%) with 72.0% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `RMIC` | `masked` | present in only 27/98 wells (27.6%) with 85.0% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `DTS` | `masked` | present in only 32/98 wells (32.7%) with 85.1% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `DTC` | `core` | present in 98/98 wells (100.0%) and 80,863 missing rows (6.91%), inside the core thresholds (>=80% of wells, <=10% missing) |
| `NPHI` | `masked` | present in only 98/98 wells (100.0%) with 34.6% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `PEF` | `masked` | present in only 69/98 wells (70.4%) with 42.6% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `GR` | `core` | present in 98/98 wells (100.0%) and 0 missing rows (0.00%), inside the core thresholds (>=80% of wells, <=10% missing) |
| `RHOB` | `masked` | present in only 98/98 wells (100.0%) with 13.8% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `DRHO` | `masked` | present in only 95/98 wells (96.9%) with 15.6% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `DCAL` | `sparse` | present in 22/98 wells (22.4%) with 74.5% missing rows: too sparse for a first baseline without a masking decision that has not been made |
| `SP` | `masked` | present in only 68/98 wells (69.4%) with 26.2% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `MUDWEIGHT` | `masked` | present in only 28/98 wells (28.6%) with 73.0% missing rows: genuinely logged in a minority of wells, so it needs an explicit availability-mask decision before use and is held out of the initial set |
| `SGR` | `sparse` | present in 13/98 wells (13.3%) with 94.1% missing rows: too sparse for a first baseline without a masking decision that has not been made |

## 3. Column roles

| Role | Meaning | Columns |
|---|---|---|
| `identifier` | joins rows to a well; never a feature | `WELL` |
| `depth` | measured depth along the hole, m | `DEPTH_MD` |
| `coordinate` | well location, constant within a well here | `X_LOC`, `Y_LOC`, `Z_LOC` |
| `target` | the supervised label | `FORCE_2020_LITHOFACIES_LITHOLOGY` |
| `target_metadata` | a property of the label, not an input | `FORCE_2020_LITHOFACIES_CONFIDENCE` |
| `stratigraphy` | label-adjacent stratigraphy from the interpretation campaign | `GROUP`, `FORMATION` |
| `log_curve` | a measured log curve; the feature candidates | `CALI`, `RSHA`, `RMED`, `RDEP`, `RHOB`, `GR`, `SGR`, `NPHI`, `PEF`, `DTC`, `SP`, `BS`, `ROP`, `DTS`, `DCAL`, `DRHO`, `MUDWEIGHT`, `RMIC`, `ROPA`, `RXO` |

Role counts: coordinate 3, depth 1, identifier 1, log_curve 20, stratigraphy 2, target 1, target_metadata 1.

Per-column notes:

- `WELL` — NPD well name, e.g. '32/2-1' (field/block/well). The join key across the CSVs, the LAS UWI and the well index. Constant within a well, so it is a grouping key, never a feature.
- `DEPTH_MD` — Measured depth along the hole, metres. Strictly increasing within every well. Held out of the feature set so a depth-ablation experiment stays possible.
- `X_LOC` — Easting, UTM. Measured, not assumed: it is constant within only a few wells and drifts with depth in the rest, because it tracks the borehole trajectory as the bit drills away from the wellhead. A property of the hole, not of the rock.
- `Y_LOC` — Northing, UTM. Varies with depth like X_LOC.
- `Z_LOC` — The source's own signed depth column, negative downwards, and it varies in every well. It is not TVD paired with X/Y and not measured depth, but it is a depth proxy, which is why it is held out of the feature set.
- `GROUP` — NPD lithostratigraphic group. Constant in depth blocks, and assigned by the same interpretation campaign that produced the label, so it is label-adjacent. Excluded from a logs-only baseline.
- `FORMATION` — NPD lithostratigraphic formation, a refinement of GROUP. Label-adjacent on the same grounds. Excluded from a logs-only baseline.
- `CALI` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `RSHA` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `RMED` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `RDEP` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `RHOB` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `GR` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `SGR` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `NPHI` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `PEF` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `DTC` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `SP` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `BS` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `ROP` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `DTS` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `DCAL` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `DRHO` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `MUDWEIGHT` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `RMIC` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `ROPA` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `RXO` — one of the source's 20 measured log curves; a feature candidate, subject to the availability tiers above
- `FORCE_2020_LITHOFACIES_LITHOLOGY` — The supervised target: NPD lithostratigraphic lithofacies, one of 12 codes. Never a feature.
- `FORCE_2020_LITHOFACIES_CONFIDENCE` — Organizer confidence in the interpretation: 1 high, 2 medium, 3 low. A property of the label, so it is not a feature either. It is a weighting hint for a future loss, not an input.

## 4. Well-level split

| Split | Wells | Expected | Matches |
|---|---:|---:|---|
| `train` | 98 | 98 | yes |
| `hidden_test` | 10 | 10 | yes |
| `leaderboard_test_features` | 10 | 10 | yes |

- Total distinct wells: **118**
- Wells occurring in more than one split: **0**
- Split is well-disjoint: **yes**
- `leaderboard_test_features` and `leaderboard_test_target` cover the same wells: **yes**
- Per-well split assignment for all 118 wells is recorded in the JSON artifact under `split.split_by_well`, and per well in `data/force2020_wells.csv`.

## 5. Class imbalance

Descriptive only. No model is proposed, ranked or compared here.

- Largest class: **Shale** (`65000`), 876,605 rows, 61.314% of labelled rows
- Smallest class: **Basement** (`93000`), 103 rows, 0.007%
- Largest-to-smallest ratio: **8510.7x**
- Median class size: 16,071 rows
- Top three classes hold 88.41% of all labelled rows
- Classes present in train: 12 of 12

### Cumulative share by rank

| Rank | Rows | Cumulative share |
|---:|---:|---:|
| 1 | 876,605 | 61.31% |
| 2 | 207,030 | 75.79% |
| 3 | 180,296 | 88.41% |
| 4 | 69,492 | 93.27% |
| 5 | 41,031 | 96.14% |
| 6 | 17,431 | 97.36% |
| 7 | 14,711 | 98.38% |
| 8 | 14,043 | 99.37% |
| 9 | 4,754 | 99.70% |
| 10 | 2,391 | 99.87% |
| 11 | 1,807 | 99.99% |
| 12 | 103 | 100.00% |

### Rare classes

- Below 1% of labelled rows (5): Chalk (70032) 14,043 rows 0.982%; Coal (90000) 4,754 rows 0.333%; Dolomite (74000) 2,391 rows 0.167%; Anhydrite (86000) 1,807 rows 0.126%; Basement (93000) 103 rows 0.007%
- In three or fewer wells (1): Basement (93000) in 1 well(s)
- In exactly one well (1): Basement (93000) 103 rows
- Absent from train entirely (0): none

11 of 12 classes have at least two wells in train. For the other 1, a per-class score computed over a well-grouped split is undefined rather than low, because a fold that holds out the only well containing the class has no positives for it. That is a property of the data, stated here so it is not discovered later.

## 6. Missingness

A missing value is an empty CSV field. The source LAS declares NULL = -999.25, but no cell in any published CSV equals a known sentinel, so the LAS null convention does not leak into these tables; the sentinel counters below are reported separately and are zero. Nothing is filled. Per-well figures are the fraction of a well's own rows that are missing for that curve, so a curve logged in a minority of wells separates 'absent from this well' from 'dropped inside this well'.

### Global missingness and per-well range (train.csv)

| Curve | Global missing % | Wells with data | Per-well missing min | median | max | Wells fully missing | Wells partly missing |
|---|---:|---:|---:|---:|---:|---:|---:|
| `CALI` | 7.51% | 97 | 0.0% | 0.0% | 100.0% | 1 | 37 |
| `BS` | 41.68% | 69 | 0.0% | 0.0% | 100.0% | 29 | 16 |
| `ROPA` | 83.57% | 25 | 0.0% | 100.0% | 100.0% | 73 | 4 |
| `ROP` | 54.29% | 53 | 0.0% | 16.1% | 100.0% | 45 | 25 |
| `RDEP` | 0.94% | 98 | 0.0% | 0.0% | 49.4% | 0 | 17 |
| `RSHA` | 46.12% | 74 | 0.0% | 52.3% | 100.0% | 24 | 57 |
| `RMED` | 3.33% | 97 | 0.0% | 0.1% | 100.0% | 1 | 62 |
| `RXO` | 72.03% | 38 | 0.0% | 100.0% | 100.0% | 60 | 32 |
| `RMIC` | 84.95% | 27 | 0.0% | 100.0% | 100.0% | 71 | 26 |
| `DTS` | 85.08% | 32 | 0.0% | 100.0% | 100.0% | 66 | 27 |
| `DTC` | 6.91% | 98 | 0.0% | 0.5% | 84.6% | 0 | 74 |
| `NPHI` | 34.61% | 98 | 0.0% | 4.9% | 84.6% | 0 | 80 |
| `PEF` | 42.62% | 69 | 0.0% | 27.1% | 100.0% | 29 | 66 |
| `GR` | 0.00% | 98 | 0.0% | 0.0% | 0.0% | 0 | 0 |
| `RHOB` | 13.78% | 98 | 0.0% | 0.7% | 82.3% | 0 | 74 |
| `DRHO` | 15.60% | 95 | 0.0% | 0.6% | 100.0% | 3 | 67 |
| `DCAL` | 74.47% | 22 | 0.0% | 100.0% | 100.0% | 76 | 12 |
| `SP` | 26.16% | 68 | 0.0% | 0.7% | 100.0% | 30 | 26 |
| `MUDWEIGHT` | 72.99% | 28 | 0.0% | 100.0% | 100.0% | 70 | 16 |
| `SGR` | 94.07% | 13 | 0.0% | 100.0% | 100.0% | 85 | 12 |

### Curves with extreme missingness

Above 50% missing rows: `ROPA` 83.6% in 25 well(s); `ROP` 54.3% in 53 well(s); `RXO` 72.0% in 38 well(s); `RMIC` 85.0% in 27 well(s); `DTS` 85.1% in 32 well(s); `DCAL` 74.5% in 22 well(s); `MUDWEIGHT` 73.0% in 28 well(s); `SGR` 94.1% in 13 well(s)

Present in fewer than half the wells: `ROPA` 25 wells (25.5%); `RXO` 38 wells (38.8%); `RMIC` 27 wells (27.6%); `DTS` 32 wells (32.7%); `DCAL` 22 wells (22.4%); `MUDWEIGHT` 28 wells (28.6%); `SGR` 13 wells (13.3%)

Curves with no missing rows at all: `GR`.

Sentinel cells in the published CSVs: **0**. The source LAS declares `NULL = -999.25`, but no published CSV cell equals a known sentinel, so every missing value counted above is an empty field. The per-curve sentinel column is reported anyway, so a future release that does carry them cannot pass unnoticed.

No value is filled, imputed or interpolated at this stage. Every null above
is still null in the source.

### Per-well audit trail

The per-well min/median/max above are computed from 118 per-well missing cell counts, one record per well that appears in a table carrying log curves (train, hidden_test, leaderboard_test_features). Those counts are kept in the JSON under `missingness.per_well_missing_counts` and written flat to `data/force2020_well_missingness.csv`, whose 20 curve columns match the curve table above. Counts, not fractions: a count is checkable against the well's own row count, which is also in the file.

## 7. Proposed initial feature set (logs only)

**Core set, 5 curves:** `CALI`, `RDEP`, `RMED`, `DTC`, `GR`

*Derivation:* read directly off curve_table baseline_tier, which is itself computed from the thresholds in curve_table.thresholds.

A curve is core when it clears both stated availability thresholds, so the set is re-derivable from the measurements rather than picked. The set is deliberately small: a first baseline should not need an availability-mask decision that has not been made yet. Note what this costs. Several curves that a petrophysicist would reach for are NOT in the core set, because they fail a threshold on this data; they are named in the masked list with their measurements, so the decision to mask them is visible and can be reversed deliberately. No model is proposed or compared.

### Core set, with the numbers that put each curve in it

| Curve | Wells with data | Missing % |
|---|---:|---:|
| `CALI` | 97/98 | 7.51% |
| `RDEP` | 98/98 | 0.94% |
| `RMED` | 97/98 | 3.33% |
| `DTC` | 98/98 | 6.91% |
| `GR` | 98/98 | 0.00% |

### Masked candidates, with the numbers that keep them out for now

| Curve | Wells with data | Missing % |
|---|---:|---:|
| `BS` | 69/98 | 41.68% |
| `ROPA` | 25/98 | 83.57% |
| `ROP` | 53/98 | 54.29% |
| `RSHA` | 74/98 | 46.12% |
| `RXO` | 38/98 | 72.03% |
| `RMIC` | 27/98 | 84.95% |
| `DTS` | 32/98 | 85.08% |
| `NPHI` | 98/98 | 34.61% |
| `PEF` | 69/98 | 42.62% |
| `RHOB` | 98/98 | 13.78% |
| `DRHO` | 95/98 | 15.60% |
| `SP` | 68/98 | 26.16% |
| `MUDWEIGHT` | 28/98 | 72.99% |

- Masked candidates needing an explicit availability decision: `BS`, `ROPA`, `ROP`, `RSHA`, `RXO`, `RMIC`, `DTS`, `NPHI`, `PEF`, `RHOB`, `DRHO`, `SP`, `MUDWEIGHT`
- Sparse candidates held out of a first baseline: `DCAL`, `SGR`

**Deferred decision:** Admitting a masked curve needs a stated availability-mask policy and an agreed missing-value treatment. Neither exists yet, so the curves are listed and held out rather than quietly included or dropped.

**Deliberately excluded, with the reason:**

| Column | Reason |
|---|---|
| `DEPTH_MD` | kept as a column but excluded from the feature set so a depth-ablation experiment can measure what the model gets from depth alone |
| `WELL` | grouping key, not a feature |
| `X_LOC` | borehole trajectory, a function of depth; excluded so depth cannot re-enter through the back door |
| `Y_LOC` | borehole trajectory, a function of depth; same reason as X_LOC |
| `Z_LOC` | the source's own signed depth column, a depth proxy; excluded for the same reason |
| `GROUP` | label-adjacent NPD stratigraphy from the interpretation campaign |
| `FORMATION` | label-adjacent NPD stratigraphy from the interpretation campaign |
| `FORCE_2020_LITHOFACIES_LITHOLOGY` | the target |
| `FORCE_2020_LITHOFACIES_CONFIDENCE` | a property of the label, not an input |

**Depth ablation:** DEPTH_MD is carried in the row schema and excluded from the feature set, so a depth-only baseline and a depth-ablation run are both possible without reshaping the table. X_LOC, Y_LOC and Z_LOC are excluded for the same purpose: measured, they track the borehole trajectory and vary with depth, so leaving them in would smuggle depth back in behind DEPTH_MD and make the ablation meaningless.

## 8. Proposed canonical ML row schema

Grain: one row per (WELL, DEPTH_MD) sample, as published. Key: `WELL` + `DEPTH_MD`.

Key is unique in the source: **yes**. DEPTH_MD is strictly increasing within every well in every published table, so (WELL, DEPTH_MD) is unique without a separate duplicate check.

| Column | Type | Role | Note |
|---|---|---|---|
| `WELL` | `str` | `identifier` | NPD well name. Grouping key; every row of a well shares a split. |
| `DEPTH_MD` | `float` | `depth` | Measured depth, m. Monotonic within a well; the join key to LAS and the ablation axis. |
| `SPLIT` | `str` | `provenance` | train \| hidden_test \| leaderboard_test_features. Assigned by well, never by row. |
| `SOURCE_ID` | `str` | `provenance` | 'FORCE2020', from ml/external_datasets.yaml. |
| `SOURCE_COMMIT` | `str` | `provenance` | The pinned source commit the row was read from. |
| `FORCE_2020_LITHOFACIES_LITHOLOGY` | `int` | `target` | NPD lithostratigraphic code. Null for leaderboard_test_features, which ships without labels. |
| `FORCE_2020_LITHOFACIES_CONFIDENCE` | `int` | `target_metadata` | 1 high, 2 medium, 3 low. Null for unlabelled rows. |
| `LABELLED` | `bool` | `provenance` | False for the open-leaderboard feature rows only. |
| `<log curve>` | `float` | `feature` | One column per selected curve, 20 candidates, of which the core set is proposed for the first baseline. Null means missing; never filled. |
| `<curve>_PRESENT` | `bool` | `feature_metadata` | Availability mask per curve per well, so a masked curve is distinguishable from an unlogged one. Derived from measurement, not from a threshold on the value. |

Row counts at source grain: `train` 1,170,511, `hidden_test` 122,397, `leaderboard_test_features` 136,786, `leaderboard_test_target` 136,786.

- Features and labels stay in one table at source grain; nothing is widened, windowed or resampled to make a table.
- SPLIT is a function of WELL alone, which is what makes the evaluation well-grouped by construction.
- Missing curves stay null. A <curve>_PRESENT mask records availability; it does not stand in for a value.

## 9. Data-quality concerns

| ID | Severity | Where | Concern |
|---|---|---|---|
| `DQ_NO_SENTINELS_IN_CSVS` | low | `train.csv` | the source LAS declares NULL = -999.25, but 0 of the 1,170,511 train cells hold a known sentinel; every missing value in the published CSVs is an empty field. This is worth recording because it means the LAS null convention does not leak into these tables, and it is why the sentinel counters are reported separately and read zero. A LAS-derived table would need the check re-run, since this measurement covers the CSVs only. |
| `DQ_SINGLE_WELL_CLASSES` | high | `target` | classes present in exactly one well: Basement (93000, 103 rows, {'train': 103, 'hidden_test': 0, 'leaderboard_test_target': 0}). Under any well-grouped split, a fold that holds out that well has no positives for the class at all, so a per-class score for it is undefined rather than low. |
| `DQ_LABEL_ADJACENT_STRATIGRAPHY` | high | `train.csv, hidden_test.csv` | GROUP takes 14 distinct values in train and FORMATION 69, against 12 lithofacies classes, and they change only in contiguous depth blocks. They are NPD stratigraphy from the same interpretation campaign as the label, so they are a near-complete stand-in for it: a model given them can score well by reading the interpreter's mind rather than the rock. They are excluded from the proposed logs-only feature set and flagged, not deleted. |
| `DQ_PARTIAL_CURVE_GAPS` | medium | `train.csv` | 19 of 20 curves are present but not continuous within the wells that have them, so missingness is a mixture of 'not logged in this well' and 'dropped inside this well'. The per-well columns of the missingness table separate the two; no value is filled. |
| `DQ_SOURCE_DOC_MISMATCH` | low | `starter_notebook.ipynb` | the source's own notebook states 83 training wells; the pinned train.csv holds 98. The file is authoritative and the notebook prose is stale. |
| `DQ_LAS_CARRIES_LABELS` | low | `las_files_Lithostrat_data` | the LAS ~Curve sections list FORCE_2020_LITHOFACIES_LITHOLOGY and _CONFIDENCE as curves, so a LAS-derived table would import the label as a feature unless it is dropped explicitly. The CSVs are used for this characterization, so it does not affect these numbers. |
| `DQ_COORDINATES_TRACK_TRAJECTORY` | medium | `X_LOC, Y_LOC, Z_LOC` | measured in train.csv: X_LOC constant in only 6/98 wells, varying in 92, within-well spread median 27.0 m (max 1,278.5 m); Y_LOC constant in only 6/98 wells, varying in 92, within-well spread median 18.8 m (max 1,446.5 m); Z_LOC constant in only 0/98 wells, varying in 98, within-well spread median 1,754.8 m (max 3,818.8 m). These are not well-level locators: they track the borehole trajectory as the bit drills away from the wellhead, so they vary row to row. That makes them a depth proxy and a well fingerprint rather than a rock measurement, and it means a logs-only feature set that included them would smuggle depth back in behind DEPTH_MD while also giving a model a way to recognise the well. All three are held out for that reason, and the depth ablation is only honest while they stay out. |

## 10. Not performed at this stage

- no model of any kind was trained, fitted, tuned, evaluated or compared
- no feature table, label table, checkpoint or model artifact was written
- no value was imputed, interpolated, smoothed, back-filled or rolled
- no window, windowed sample or convolutional input was created
- no FORCE 2020 label was mapped onto any canonical vocabulary
- no write to data/processed/ or data/ml/
- no new dataset was downloaded; only the commit already pinned was read
