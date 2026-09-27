# `lithology`

**Status: `PROTOTYPE_POSSIBLE` — 65 labelled depths, and it is the only model
in the set with a real label count. Blocked on taxonomy, not on labels.**

## Objective

Classify lithology at depth from drilling response and mud temperature.

## Why this one is different

Every other model in the set is blocked by label scarcity or missing signal.
`lithology` has genuine labels: 65 depths in `lithology` with a cuttings
description, in a fully drilled wellbore with 124,497 mechanical samples. That
is enough to build and test a feature pipeline end to end.

It is still **not** reportable, for three reasons that must be respected.

## Blocker 1 — the labels are free text, not a taxonomy

65 rows contain **57 distinct strings**, and they are near-duplicates of one
another:

```
HRNBLNDE: 30% CLAY: LHT TAN, NON-SWELLING CLAY, PRESENTS AS KAOLIN
MD HRNBLNDE, TR BIOTIE, TR CHLOR.
MD HRNBLND, TR BIOTIE, TR CHLOR.
HRNBLDE, TR BIOTIE, TR CALCITE, TR CHLORITE
```

These describe the same rock. A classifier over 57 free-text strings will learn
to reproduce the free text. Before this is either a label set or a feature:

1. Build a controlled taxonomy. Observed vocabulary is dominated by
   hornblende, biotite, chlorite, epidote, calcite, quartz/feldspar ("TR"),
   with clay, magnetite and metallic shards as accessories.
2. Record the mapping from each raw string to each class, in a file, with the
   reviewer's name and a version — the same discipline as
   `conversion_version`.
3. Keep the raw string in the dataset. Never overwrite it.

That taxonomy is a **geology** task, not an ML one, and it needs a domain
reviewer. Do not invent it unilaterally.

## Blocker 2 — one well

65 points from one wellbore. Any split is within-well, so the
well-grouped policy in `ml/README.md` §7 cannot be satisfied. This is a
pipeline check, not a performance claim.

## Blocker 3 — the feature set is shallow

There are no log curves in this dataset. The only features available are depth,
trajectory (`inclination`, `azimuth`, `vertical_section`) and
`mud_temperature_depth` (457,104 depth-indexed samples). A lithology classifier
without gamma, density or resistivity is essentially a depth-and-temperature
lookup. Expect weak performance, and say so in advance rather than after.

## Label contract

Multiclass. Target = the taxonomy class assigned in blocker 1. Join on `md` —
`lithology` is depth-indexed and has no time column.

## Leakage restrictions

- **L4** the `mud_temperature_depth` join must be on `md`, not time, and must
  stay within the survey floor (3,336.6456 m). Nearest-neighbour interpolation
  in depth across a lithology contact would assign the neighbouring rock's
  temperature to the boundary sample.
- **L6** both `lithology` and `mud_temperature_depth` are derived from the same
  drilling campaign. Document that the model may partly learn campaign-specific
  reporting style.
- Do not include `md` as a plain feature without a validation check: a
  monotonically increasing depth feature can dominate a classifier and produce
  an apparently strong score that is really just a depth lookup.

## Path to a real model

FORCE 2020 is the recorded candidate: a large multi-well log population with
lithology labels and an established evaluation protocol. It has now been read
end to end and a table built from it. Status `INGESTED` — and not modelled.

| | |
|---|---|
| Registry entry | `FORCE2020` in `ml/external_datasets.yaml` |
| Status | `INGESTED` — table built, no model trained on it |
| Findings | `reports/force2020_inspection.md`, `reports/force2020_characterization.md`, `reports/force2020_dataset.md` |
| Table | `data/interim/ml/force2020_litho/features/force2020_litho_logs_v0_1.csv` (gitignored; `make build-force2020-dataset`) |
| Licence | CC-BY-4.0 (Zenodo deposit); upstream NPD logs NLOD 2.0 |
| Pinned commit | `c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1` |

What it gives this model: 118 wells, 1,429,694 labelled rows, 20 log curves, a
12-class vocabulary, and splits that are already well-disjoint, so the §7
well-grouped policy is satisfiable there in a way it is not satisfiable here.
It also carries a published penalty-matrix metric, so a score is comparable to
the competition literature.

What it does not give this model, and why the blockers above stand:

- **Blocker 1 is not removed by having more labels.** FORCE 2020's labels are
  NPD stratigraphic lithofacies from the Norwegian shelf. They are not
  cuttings descriptions from a Utah well. The taxonomy work in blocker 1 is
  still needed for the canonical 65 rows, and the two vocabularies must not be
  merged without a reviewed mapping file.
- **Blocker 3 is fixed for FORCE 2020, not for this dataset.** FORCE 2020 has
  gamma, density and resistivity. `nwis-forge16b-v0.2` still has no log curves,
  so a model trained on FORCE 2020 does not validate a model on this data.

The table that now exists carries `CALI`, `RDEP`, `RMED`, `DTC` and `GR` with an
explicit 0/1 missing mask per curve, all 12 classes, the original NPD code
alongside a deterministic encoded id, and per-row source provenance. Nothing was
filled, no coordinate or stratigraphy column was carried over, and the source's
own well-level split was kept unchanged. Two classes are thin �?" `93000`
Basement is 103 rows in one well and `88000` Halite appears in three wells �?" so
any model that uses them has to say how it handles that. `data/processed/` and
this directory were not written to.

## Baseline models on FORCE 2020

Three baseline models now exist for this model *from the external dataset*: a
Random Forest, an XGBoost booster and a LightGBM booster, all on the same five
approved log curves and all on the same split. They are **baselines only**: not
tuned, none is the best available model, none is production-ready, none is
deployed.

| | |
|---|---|
| Experiments | `force2020-litho-rf-v0.1`, `force2020-litho-xgb-v0.1`, `force2020-litho-lgbm-v0.1` |
| Features | `CALI`, `RDEP`, `RMED`, `DTC`, `GR` — logs only, no `DEPTH_MD` |
| Target | the encoded NPD lithofacies label, all 12 classes, none merged or dropped |
| Split | the source's own 98 / 10 / 10 well partition, unchanged |
| Missing values | median-imputed inside the pipeline, fitted on training rows only |
| Imbalance | balanced per-row sample weights from training rows only (boosters), `balanced_subsample` (forest) |
| Metrics | per-class precision/recall/F1, macro F1, weighted F1, balanced accuracy, confusion matrix, published penalty score |
| Reports | `reports/force2020_rf_baseline.md`, `reports/force2020_gbdt_baseline.md`, `reports/force2020_model_comparison.md` |
| Code | `training/train_rf_baseline.py`, `training/train_gbdt_baseline.py`, `evaluation/evaluate_gbdt_baseline.py`, shared code in `data/ml/common/force2020_lithology.py` |
| Artifacts | `data/interim/ml/force2020_litho/{training,evaluation}` (gitignored, never committed) |

```sh
pip install -e .[ml]        # the boosters are an optional extra, not base ones
make train-force2020-rf     # fit the forest, score it, write its report (~25 min, 4 fits)
make train-force2020-gbdt   # fit both boosters, score them, write their report (~30 min, 8 fits)
make score-force2020-rf     # re-score the stored model, no refit
make score-force2020-gbdt   # re-score both stored boosters, no refit
make verify-force2020-rf    # refit and diff against the committed report
make verify-force2020-gbdt  # refit both boosters and diff against the committed report
make build-force2020-model-comparison   # rebuild the three-model comparison
```

Three rules these baselines are built to keep:

- **Logs only.** `DEPTH_MD` is carried in the table so a depth diagnostic is
  possible, and is measured *separately* as a diagnostic rather than used as a
  feature. A depth-only model recovering much of the task would make any
  logs-only score meaningless, so the diagnostic exists to keep that honest.
- **Well-disjoint evaluation, always.** No well is ever on both sides of a fit
  and a score, and the guard that enforces it raises rather than warns.
- **Nothing is chosen using an evaluation partition.** No hyperparameter search,
  no feature selection, no early stopping on held-out data. The two evaluation
  partitions are read once, at the end, to produce a number.

Each booster adds three diagnostics, none of which is a candidate configuration:
`DEPTH_MD` alone, the five missingness masks, and an unweighted refit to show
what the class balancing is worth. `num_class=12` is stated rather than inferred,
so a rare class that went missing could not produce a narrower model that still
fit and still scored.

`reports/force2020_model_comparison.md` compares the three side by side. It names
no winner: on macro F1, supported-only macro F1 and balanced accuracy the spread
between the two ten-well partitions is larger than the spread between the three
models, so those numbers describe the held-out wells more than the learner.
Weighted F1 is the exception and the report states that rather than hiding it in
an average.

Note for anyone extending this: the shared module in `data/ml/common/` owns the
feature list, the label mapping, the leakage guards, the metric definitions, the
estimator configs and the penalty-matrix index mapping. Add to it rather than
copying it. On this Windows host LightGBM must be imported **before**
scikit-learn or the process dies with an access violation; the shared module
enforces the order and a test guards it.

