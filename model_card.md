# Model card: mud-loss prediction

## Overview

This model predicts `mud_loss_within_horizon`, a binary target indicating whether mud loss occurs within the defined prediction horizon. The model is an XGBoost classifier trained on 65,376 rows from `LOST_CIRCULATION_WELL` with 83 input features. The stored validation summary is in [`model/mud_loss_v3_metrics_corrected.json`](model/mud_loss_v3_metrics_corrected.json), and the serialized model is [`model/mud_loss_model_v3_final.pkl`](model/mud_loss_model_v3_final.pkl).

## Features

The model uses these 83 features, in the order recorded in the validation metadata:

```text
holesection, mdepth, rateofpenetration, weightonbit, rotation, torque,
standpipepressure, flowin, flowout, pumpstroke, mudweight, funnelviscosity,
plasticviscosity, yieldpoint, gel_strength10sec, gel_strength10min, solid,
flow_differential, flowin_diff_1, flowout_diff_1, standpipepressure_diff_1,
mudweight_diff_1, pumpstroke_diff_1,
rateofpenetration_rolling_mean_5, rateofpenetration_rolling_std_5,
rateofpenetration_rolling_mean_20, rateofpenetration_rolling_std_20,
weightonbit_rolling_mean_5, weightonbit_rolling_std_5,
weightonbit_rolling_mean_20, weightonbit_rolling_std_20,
rotation_rolling_mean_5, rotation_rolling_std_5, rotation_rolling_mean_20,
rotation_rolling_std_20, torque_rolling_mean_5, torque_rolling_std_5,
torque_rolling_mean_20, torque_rolling_std_20,
standpipepressure_rolling_mean_5, standpipepressure_rolling_std_5,
standpipepressure_rolling_mean_20, standpipepressure_rolling_std_20,
flowin_rolling_mean_5, flowin_rolling_std_5, flowin_rolling_mean_20,
flowin_rolling_std_20, flowout_rolling_mean_5, flowout_rolling_std_5,
flowout_rolling_mean_20, flowout_rolling_std_20, pumpstroke_rolling_mean_5,
pumpstroke_rolling_std_5, pumpstroke_rolling_mean_20, pumpstroke_rolling_std_20,
mudweight_rolling_mean_5, mudweight_rolling_std_5, mudweight_rolling_mean_20,
mudweight_rolling_std_20, funnelviscosity_rolling_mean_5,
funnelviscosity_rolling_std_5, funnelviscosity_rolling_mean_20,
funnelviscosity_rolling_std_20, plasticviscosity_rolling_mean_5,
plasticviscosity_rolling_std_5, plasticviscosity_rolling_mean_20,
plasticviscosity_rolling_std_20, yieldpoint_rolling_mean_5,
yieldpoint_rolling_std_5, yieldpoint_rolling_mean_20, yieldpoint_rolling_std_20,
gel_strength10sec_rolling_mean_5, gel_strength10sec_rolling_std_5,
gel_strength10sec_rolling_mean_20, gel_strength10sec_rolling_std_20,
gel_strength10min_rolling_mean_5, gel_strength10min_rolling_std_5,
gel_strength10min_rolling_mean_20, gel_strength10min_rolling_std_20,
solid_rolling_mean_5, solid_rolling_std_5, solid_rolling_mean_20,
solid_rolling_std_20
```

`lossesseverity` was excluded because it leaks label information, and `well_id` was also excluded. Rolling and lagged features must be engineered consistently with training before inference; feature names, count, order, units, and preprocessing should match the training pipeline.

## Validation and results

Validation used blocked GroupKFold with 20 contiguous depth chunks and 5 folds.

- In-regime ROC-AUC: **0.973 mean** (standard deviation 0.01)
- In-regime F1 at threshold 0.50: **0.868**
- Out-of-regime leave-one-section-out ROC-AUC: **0.445 mean**

The high in-regime results apply to held-out depth chunks within the represented operating regime. They should not be interpreted as evidence of performance on unseen sections or wells.

## Scope and limitations

**This model does not reliably generalize to a hole section or well it has not seen.** Leave-one-section-out testing confirmed this limitation: mean ROC-AUC was approximately 0.45, near chance and below it. Use the model only for exploratory or decision-support use within hole sections represented in this well's training data, and do not treat its predictions as a substitute for operational judgment or independent validation on the deployment section/well.

The model card summarizes the supplied training metrics; it does not establish calibration, prospective performance, or safety for operational use. Validate on representative, independent data before deployment.
