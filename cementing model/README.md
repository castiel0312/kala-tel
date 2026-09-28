# ACL cement-quality model (synthetic) — `ens_soft`

Deployable classifier for the ACL cement-quality grade of a survey interval, trained on the
synthetic benchmark dataset built by `../build/_synthetic_cement.py`.

This README covers the model you run with `predict_acl.py`. It describes the inputs, the
output, and the architecture. It deliberately says nothing about score numbers — that is the
job of the model card and the comparison tables in `tables/`.

---

## 1. What the model outputs

For every input row the model predicts one of four cement-quality grades:

| `acl_class` | `acl_class_name` | `acl_band` (unitless ACL index) |
|---:|---|---|
| 0 | high | 0–10 |
| 1 | good | 10–20 |
| 2 | low | 20–30 |
| 3 | poor | 30–150 |

The ACL index is a unitless severity score defined by the article bands above; the model
decides which band each row falls in.

## 2. Required input features

`predict_acl.py` needs a CSV with one row per survey sample and the **39 feature columns**
listed below, present by these exact names. Extra columns are ignored; any missing required
column aborts the run. The dataset `synthetic_cement_dataset.csv` in this folder is a complete
example of the format.

### 2.1 Continuous features (21)

| feature | meaning | unit |
|---|---|---|
| `tvdss` | true vertical depth subsea (drift-corrected, monotonic) | m |
| `md` | measured depth along the hole | m |
| `md_minus_tvdss` | vertical excess (md − tvdss) | m |
| `md_over_tvdss` | md / tvdss ratio | dimensionless |
| `lateral_m` | lateral offset from the interval top | m |
| `incl_geom_deg` | geometric inclination | degrees |
| `build_rate_deg30` | inclination build rate | deg per 30 m |
| `turn_rate_deg30` | azimuth turn rate | deg per 30 m |
| `curv_deg30` | resultant dogleg severity √(build² + turn²) | deg per 30 m |
| `depth_in_interval_m` | measured depth since the interval top | m |
| `depth_rel_interval` | fraction of the interval covered | dimensionless, 0–1 |
| `iv_thickness_m` | interval thickness | m |
| `iv_start_tvdss` | tvdss at the interval top | m |
| `iv_n_samples` | number of samples in the interval | count |
| `iv_max_curv` | max dogleg severity in the interval | deg per 30 m |
| `iv_mean_curv` | mean dogleg severity in the interval | deg per 30 m |
| `iv_curv_p90` | 90th percentile dogleg severity in the interval | deg per 30 m |
| `iv_max_build_rate` | max build rate in the interval | deg per 30 m |
| `iv_max_turn_rate` | max turn rate in the interval | deg per 30 m |
| `iv_mean_incl_geom` | mean geometric inclination in the interval | degrees |
| `iv_total_excess_m` | sum of (md − tvdss) over the interval | m |

### 2.2 Indicator features (18, all 0/1)

Formation one-hot (exactly one of these is 1 for a well a formation match applies to):

| feature | feature |
|---|---|
| `fm_Balder Fm.` | `fm_Cromer Knoll Gp.` |
| `fm_Draupne Fm.` | `fm_Ekofisk Fm.` |
| `fm_Fensfjord Fm.` | `fm_Heather Fm.` |
| `fm_Heimdal Fm.` | `fm_Hugin Fm.` |
| `fm_Shetland Gp.` | `fm_Skagerrak Fm.` |
| `fm_Sleipner Fm.` | `fm_Sognefjord Fm.` |
| `fm_Tor Fm.` | |

Source and low-frequency-pressure flags (all 0/1):

| feature | meaning |
|---|---|
| `src_deviation_survey` | row came from a deviation-survey source |
| `src_force2020_lfp` | row came from the FORCE-2020 low-frequency-pressure source |
| `lfp_-1.0` | flagged for the −1 pressure band |
| `lfp_30000.0` | flagged for the 30 000 pressure band |
| `lfp_65000.0` | flagged for the 65 000 pressure band |

## 3. Architecture

The deployed model is **`ens_soft` — a soft-voting ensemble of six base models**. Its members
are the model candidates of the benchmark, each fitted on the same engineered features:

| member | type | target |
|---|---|---|
| `hgb_ordinal` | gradient-boosted trees (HistGradientBoosting) | continuous ACL index, banded |
| `hgb_4class` | gradient-boosted trees | 4-way class |
| `xgb_ordinal` | XGBoost boosted trees | continuous ACL index, banded |
| `xgb_4class` | XGBoost boosted trees | 4-way class |
| `rf` | random forest | 4-way class |
| `logreg` | regularised logistic regression | 4-way class |

Combination rule: the members' class probabilities are averaged with equal weight, and the
row is assigned the band with the largest average probability. (Two companion rules are stored
in the model card for reference only: majority strict-vote with a summed-probability tie-break,
and a prior-weighted average; the deployed bundle is the plain soft average.)

Ordinal members: rather than classifying directly, `hgb_ordinal` and `xgb_ordinal` regress the
continuous ACL index in 0–150 and then convert it to band probabilities by placing normal
probability mass around the predicted index between the band edges (10, 20, 30), with width
equal to the member's median training residual. This is what lets the ensemble keep a graded
confidence across all four bands, including the wide 30–150 poor band.

The bundle (`cache/cement_quality_model_synthetic.joblib`) contains the ensemble rule, the
prior, the six refitted members with their tuned hyperparameters, and the per-member scaling
for the ordinal pair. Nothing is retrained at inference time.

## 4. How to run it

```
pip install numpy pandas scikit-learn xgboost joblib
python build/predict_acl.py your_input.csv predicts.csv
```

GPU is optional: if no CUDA device answers the probe the XGBoost members train/run on CPU.

Output columns: `well`, `md` (m), `tvdss` (m), `acl_class` (0–3), `acl_class_name`
(high/good/low/poor), `acl_band` (0–10 / 10–20 / 20–30 / 30–150).

## 5. Files

```
synthetic/cache/cement_quality_model_synthetic.joblib   the trained ensemble bundle
synthetic/synthetic_cement_dataset.csv                  example input format
build/predict_acl.py                                    the runner script
build/_synthetic_cement.py                              training script; also provides the
                                                        reloadable predictor used by the runner
synthetic/tables/synthetic_model_card.json              model card (architecture, selected_by, conf)
synthetic/tables/synthetic_model_comparison.csv         full pooled comparison table
```