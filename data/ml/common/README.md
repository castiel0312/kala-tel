# `common` — shared ML infrastructure

Not a model. This directory holds the code that every one of the nine models
needs, so it is written once instead of nine times.

## Why it exists

Nine developers working in parallel will each write their own train/test split.
Five of them will split randomly by row, and their scores will be inflated by
near-duplicate minute samples straddling the boundary. The splitter lives here
so that failure mode is impossible.

## Contents

| Subdirectory | Purpose | Expected outputs |
|---|---|---|
| `features/` | shared feature transforms, the causal rolling-window helper, the feature-manifest writer | `feature_manifest.json` |
| `labels/` | the label-window builder implementing rules R1–R6 from `ml/label_registry.yaml` | `label_report.md` |
| `training/` | shared fit harness: fold construction, preprocessing inside the fold, seed control | — |
| `evaluation/` | the metric harness: per-class PR metrics, confusion matrix, well-grouped reporting | `metrics.json` |

## What must live here

1. `load_canonical(table)` — reads `data/processed/<table>.csv` read-only.
   Never writes to it.
2. `GroupedSplit(groups="wellbore_id")` — the only sanctioned splitter.
   A random `train_test_split` must not appear in a model directory.
3. `causal_rolling(series, window, on="md")` — trailing windows only. Reject a
   centred window rather than silently centring it.
4. `leakage_guard(feature_df, event_df)` — asserts the feature window ends
   strictly before onset for every positive, and that no `events` column
   appears in the feature frame.
5. `evaluate(y_true, y_pred, well_ids)` — returns per-class precision, recall,
   F1, a confusion matrix, and the well and positive counts. Accuracy is not
   returned, because with imbalanced hazard labels it misleads.

## What must not live here

- Anything specific to one hazard. A stuck-pipe window length belongs in
  `data/ml/stuck_pipe/`, not here.
- Any trained model artefact or fitted preprocessor. This directory is
  importable code, and `data/processed/` stays frozen.
- Any label that is not backed by an `events` row.

## Dependency position

`pyproject.toml` deliberately declares only `fastapi`, `pydantic` and `uvicorn`.
No ML library is installed, because the nine model teams may reasonably pick
different ones and the canonical dataset must not acquire a heavy dependency
tree it does not use. Add `numpy`/`pandas`/your chosen stack in the `ml-extra`
extra or in your own environment, not in the base dependency list.
