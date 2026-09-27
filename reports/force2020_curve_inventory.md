# FORCE 2020 curve inventory and feature selection

Measured over all three official partitions at the pinned source commit. Read-only: nothing here is imputed, clipped, renamed or trained. This stage answers one question, which the earlier characterization could not: of the 20 source curves, which can be measured on the partitions that decide whether a change is kept.

## Partitions

| split | file | role | rows | wells | DEPTH_MD increasing | median step |
| --- | --- | --- | ---: | ---: | --- | ---: |
| `train` | `extracted/train.csv` | training and model selection | 1,170,511 | 98 | yes | 0.1520 m |
| `hidden_test` | `hidden_test.csv` | held-out evaluation; never used to fit or select | 122,397 | 10 | yes | 0.1520 m |
| `leaderboard_test` | `leaderboard_test_features.csv` | held-out evaluation; never used to fit or select | 136,786 | 10 | yes | 0.1520 m |

## Every source curve

One row per curve. `h` and `l` are the hidden and leaderboard partitions; coverage is wells with at least one observed value. `outside` counts observed values outside the curve's published envelope and is reported, never acted on.

| curve | unit | kind | train cov | train miss | hidden cov | hidden miss | leader cov | leader miss | outside (tr/h/l) | verdict |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `CALI` | in | borehole_geometry | 97/98 | 7.51% | 10/10 | 2.81% | 10/10 | 4.13% | 0/0/0 | retained_from_v0_1 |
| `BS` | in | operational_or_mud | 69/98 | 41.68% | 7/10 | 39.14% | 7/10 | 51.04% | 0/0/0 | rejected |
| `ROPA` | n/a | operational_or_mud | 25/98 | 83.57% | 6/10 | 47.53% | 6/10 | 59.21% | 51/0/0 | rejected |
| `ROP` | m/h | operational_or_mud | 53/98 | 54.29% | 8/10 | 25.53% | 6/10 | 50.06% | 2866/0/0 | rejected |
| `RDEP` | ohm.m | formation_measurement | 98/98 | 0.94% | 10/10 | 0.01% | 10/10 | 0.04% | 0/0/0 | retained_from_v0_1 |
| `RSHA` | ohm.m | formation_measurement | 74/98 | 46.12% | 4/10 | 79.02% | 4/10 | 71.42% | 0/0/0 | rejected |
| `RMED` | ohm.m | formation_measurement | 97/98 | 3.33% | 10/10 | 8.02% | 10/10 | 0.43% | 7/0/0 | retained_from_v0_1 |
| `RXO` | ohm.m | operational_or_mud | 38/98 | 72.03% | 2/10 | 92.73% | 3/10 | 78.18% | 34627/0/0 | rejected |
| `RMIC` | ohm.m | operational_or_mud | 27/98 | 84.95% | 3/10 | 87.60% | 3/10 | 91.73% | 9/0/0 | rejected |
| `DTS` | us/ft | formation_measurement | 32/98 | 85.08% | 8/10 | 40.46% | 6/10 | 68.40% | 0/0/0 | added_in_v0_2 |
| `DTC` | us/ft | formation_measurement | 98/98 | 6.91% | 10/10 | 3.35% | 10/10 | 0.60% | 108/0/0 | retained_from_v0_1 |
| `NPHI` | m3/m3 | formation_measurement | 98/98 | 34.61% | 10/10 | 21.11% | 10/10 | 23.94% | 11311/641/754 | added_in_v0_2 |
| `PEF` | b/e | formation_measurement | 69/98 | 42.62% | 9/10 | 17.94% | 10/10 | 17.02% | 44270/3194/6848 | added_in_v0_2 |
| `GR` | gAPI | formation_measurement | 98/98 | 0.00% | 10/10 | 0.00% | 10/10 | 0.00% | 161/24/26 | retained_from_v0_1 |
| `RHOB` | g/cm3 | formation_measurement | 98/98 | 13.78% | 10/10 | 7.78% | 10/10 | 12.40% | 0/0/0 | added_in_v0_2 |
| `DRHO` | g/cm3 | formation_measurement | 95/98 | 15.60% | 10/10 | 8.28% | 9/10 | 18.44% | 9778/572/145 | added_in_v0_2 |
| `DCAL` | in | borehole_geometry | 22/98 | 74.47% | 4/10 | 64.78% | 2/10 | 90.12% | 2523/317/22 | rejected |
| `SP` | mV | formation_measurement | 68/98 | 26.16% | 4/10 | 61.83% | 4/10 | 51.29% | 9187/0/0 | rejected |
| `MUDWEIGHT` | g/cm3 | operational_or_mud | 28/98 | 72.99% | 0/10 | 100.00% | 1/10 | 85.18% | 209839/0/20269 | rejected |
| `SGR` | gAPI | formation_measurement | 13/98 | 94.07% | 1/10 | 99.07% | 0/10 | 100.00% | 62/3/0 | rejected |

### Ranges and envelopes

| curve | envelope | train min / med / max | hidden min / max | leader min / max |
| --- | --- | --- | --- | --- |
| `CALI` | 2.00 .. 30.00 | 2.344 / 12.556 / 28.279 | 8.025 / 23.094 | 6.683 / 27.345 |
| `BS` | 4.00 .. 30.00 | 6.000 / 12.250 / 26.000 | 8.500 / 17.500 | 8.500 / 17.500 |
| `ROPA` | 0.00 .. 500.00 | -999.250 / 20.131 / 742.798 | 0.116 / 439.486 | 0.572 / 131.991 |
| `ROP` | 0.00 .. 5000.00 | -0.118 / 17.800 / 47015.125 | 0.000 / 694.255 | 0.004 / 621.078 |
| `RDEP` | 0.00 .. 5000.00 | 0.032 / 1.439 / 1999.887 | 0.037 / 1755.531 | 0.152 / 1582.094 |
| `RSHA` | 0.00 .. 5000.00 | 0.000 / 1.399 / 2193.905 | 0.119 / 1999.717 | 0.255 / 1566.168 |
| `RMED` | 0.00 .. 5000.00 | -0.008 / 1.444 / 1988.616 | 0.159 / 1573.656 | 0.148 / 1901.767 |
| `RXO` | 0.00 .. 5000.00 | -999.900 / 1.367 / 35930.672 | 0.121 / 2030.926 | 0.262 / 2000.000 |
| `RMIC` | 0.00 .. 5000.00 | 0.057 / 1.967 / 10000.000 | 0.133 / 621.158 | 0.063 / 957.984 |
| `DTS` | 30.00 .. 700.00 | 69.163 / 188.201 / 676.578 | 86.628 / 562.037 | 79.327 / 494.097 |
| `DTC` | 30.00 .. 700.00 | 7.415 / 109.585 / 320.479 | 48.269 / 178.818 | 45.683 / 183.481 |
| `NPHI` | -0.15 .. 0.60 | -0.036 / 0.327 / 1.000 | -0.015 / 0.906 | -0.009 / 0.850 |
| `PEF` | 0.00 .. 12.00 | 0.100 / 4.314 / 383.130 | 0.641 / 320.098 | 0.610 / 382.122 |
| `GR` | 0.00 .. 400.00 | 0.109 / 68.368 / 1076.964 | 1.132 / 1141.292 | 6.342 / 500.878 |
| `RHOB` | 0.50 .. 5.00 | 0.721 / 2.321 / 3.458 | 1.128 / 3.353 | 1.290 / 3.073 |
| `DRHO` | -0.60 .. 1.00 | -7429.339 / 0.002 / 2.837 | -1.453 / 0.675 | -1.214 / 0.405 |
| `DCAL` | -5.00 .. 30.00 | -12.215 / 0.557 / 10011.423 | -5.500 / 8.380 | -6.402 / 7.363 |
| `SP` | -250.00 .. 250.00 | -999.000 / 55.391 / 526.547 | -171.911 / 157.724 | -24.132 / 125.523 |
| `MUDWEIGHT` | 0.70 .. 2.50 | 0.126 / 0.156 / 185.731 | n/a / n/a | 0.129 / 426.921 |
| `SGR` | 0.00 .. 300.00 | -777.986 / 69.563 / 963.609 | 26.545 / 344.231 | n/a / n/a |

## Verdicts

- **`BS`** rejected at `G2_measurement_kind`
  - BS records the drilling or mud operation rather than the rock. Its value also tracks which crews and programmes instrumented a well, so it can encode well history instead of lithology.
- **`ROPA`** rejected at `G2_measurement_kind`
  - ROPA records the drilling or mud operation rather than the rock. Its value also tracks which crews and programmes instrumented a well, so it can encode well history instead of lithology.
- **`ROP`** rejected at `G2_measurement_kind`
  - ROP records the drilling or mud operation rather than the rock. Its value also tracks which crews and programmes instrumented a well, so it can encode well history instead of lithology.
- **`RSHA`** rejected at `G3_evaluation_coverage`
  - RSHA is present in 4 of 10 hidden_test wells (40%), below the 50% floor. Anything it contributes on training wells could not be confirmed on the partitions used to decide retention.
- **`RXO`** rejected at `G2_measurement_kind`
  - RXO records the drilling or mud operation rather than the rock. Its value also tracks which crews and programmes instrumented a well, so it can encode well history instead of lithology.
- **`RMIC`** rejected at `G2_measurement_kind`
  - RMIC records the drilling or mud operation rather than the rock. Its value also tracks which crews and programmes instrumented a well, so it can encode well history instead of lithology.
- **`DTS`** added to v0.2
  - a formation measurement present in at least half the wells of both evaluation partitions, with the missingness it carries recorded
  - caveat: hidden_test is 40.5% missing, so a median-imputed column is mostly imputation there
  - caveat: leaderboard_test is 68.4% missing, so a median-imputed column is mostly imputation there
- **`NPHI`** added to v0.2
  - a formation measurement present in at least half the wells of both evaluation partitions, with the missingness it carries recorded
- **`PEF`** added to v0.2
  - a formation measurement present in at least half the wells of both evaluation partitions, with the missingness it carries recorded
- **`RHOB`** added to v0.2
  - a formation measurement present in at least half the wells of both evaluation partitions, with the missingness it carries recorded
- **`DRHO`** added to v0.2
  - a formation measurement present in at least half the wells of both evaluation partitions, with the missingness it carries recorded
- **`DCAL`** rejected at `G2_measurement_kind`
  - DCAL measures hole geometry, which follows the drilling contract rather than the formation.
- **`SP`** rejected at `G3_evaluation_coverage`
  - SP is present in 4 of 10 hidden_test wells (40%), below the 50% floor. Anything it contributes on training wells could not be confirmed on the partitions used to decide retention.
- **`MUDWEIGHT`** rejected at `G2_measurement_kind`
  - MUDWEIGHT records the drilling or mud operation rather than the rock. Its value also tracks which crews and programmes instrumented a well, so it can encode well history instead of lithology.
- **`SGR`** rejected at `G3_evaluation_coverage`
  - SGR is present in 1 of 10 hidden_test wells (10%), below the 50% floor. Anything it contributes on training wells could not be confirmed on the partitions used to decide retention.

## Local context

- status: **supported**
- DEPTH_MD advances by a constant 0.1520 m inside every well in every split (interquartile range 0.0 m, strictly increasing: True), so a fixed row window is a fixed depth window. 128 of 1170413 steps exceed 0.4560 m and are logging gaps, so windows are invalidated across them rather than averaged over them.
- same-well mean and standard deviation of the selected curves over +/-0.76 m (+/-5 rows at the measured 0.1520 m step) (full width 1.52 m, 11 rows)
- same-well mean and standard deviation of the selected curves over +/-1.52 m (+/-10 rows at the measured 0.1520 m step) (full width 3.04 m, 21 rows)

## Feature sets

### `v0.1` (frozen)

- curves (5): `CALI`, `RDEP`, `RMED`, `DTC`, `GR`
- the shipped five-curve baseline. Its curves are carried into v0.2 unchanged; only the mask set and the added curves are new.

### `v0.2` (new)

- curves (10): `CALI`, `RDEP`, `RMED`, `DTC`, `GR`, `DTS`, `NPHI`, `PEF`, `RHOB`, `DRHO`
- added relative to v0.1: `DTS`, `NPHI`, `PEF`, `RHOB`, `DRHO`
- v0.1 plus every curve that cleared gates 1 to 3. The builder emits a mask column per curve alongside the curve, so the mask set follows the curve list and is not enumerated separately here. The ablation separates the curves from the masks.

### `v0.3` (new)

- curves (10): `CALI`, `RDEP`, `RMED`, `DTC`, `GR`, `DTS`, `NPHI`, `PEF`, `RHOB`, `DRHO`
- local windows: 2
- v0.2 plus same-well local context. Every local column is computed inside one well only, uses no target and no other well, and is invalidated across a logging gap rather than averaged over it. The builder owns the column names.

## Not performed

- no model of any kind was trained, fitted, tuned, evaluated or compared
- no feature table, label table, checkpoint or model artifact was written
- no value was imputed, interpolated, smoothed, back-filled, rolled or windowed
- no value was clipped, trimmed or set to missing for falling outside an envelope
- no curve was renamed, merged, rescaled or re-derived
- no FORCE label was mapped onto any canonical vocabulary
- no write to data/processed/ or data/ml/ except the registry path named above
- no download, no external dataset, no network access
