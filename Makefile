.PHONY: help clean validate promote clean-data reports test typecheck lint check serve all \
	inspect-force2020 verify-force2020 \
	characterize-force2020 verify-force2020-characterization \
	build-force2020-dataset verify-force2020-dataset \
	extract-force2020-penalty-matrix verify-force2020-penalty-matrix \
	train-force2020-rf verify-force2020-rf score-force2020-rf \
	train-force2020-gbdt verify-force2020-gbdt score-force2020-gbdt \
	build-force2020-model-comparison check-force2020-model-comparison

# Interpreter. Windows has no `python3` on PATH by default, and the standard
# launcher there is `py`, so pick per platform instead of failing. A command-line
# `make PY=py` still wins because `?=` only assigns when undefined.
ifeq ($(OS),Windows_NT)
PY ?= python
else
PY ?= python3
endif

# Committed validator artifact. The API reads this file rather than
# re-deriving findings, so validator logic has exactly one home.
VALIDATION_JSON := reports/validation.json
FORCE2020_JSON := reports/force2020_inspection.json
FORCE2020_CHAR_JSON := reports/force2020_characterization.json

help:
	@echo "Pipeline"
	@echo "  make clean-data   run 01_clean + 02_promote"
	@echo "  make validate     run the validator (exit 3 = PARTIAL, expected)"
	@echo "  make reports      regenerate reports/ from live data"
	@echo ""
	@echo "External datasets (never touches data/processed)"
	@echo "  make inspect-force2020    profile the FORCE 2020 source bytes"
	@echo "  make verify-force2020     re-profile and diff against the committed report"
	@echo "  make characterize-force2020   measure classes, curves, missingness"
	@echo "  make verify-force2020-characterization   re-measure and diff all 3 artifacts"
	@echo "  make build-force2020-dataset   build the logs-only table, QC and split manifest"
	@echo "  make verify-force2020-dataset   rebuild and diff against the committed artifacts"
	@echo "  make extract-force2020-penalty-matrix   read the published penalty matrix from the source"
	@echo "  make verify-force2020-penalty-matrix   re-read it and diff against the committed record"
	@echo ""
	@echo "Modelling (needs 'pip install -e .[ml]'; the canonical pipeline never does)"
	@echo "  make train-force2020-rf   fit the Random Forest baseline, score it, write the report"
	@echo "  make verify-force2020-rf   refit and diff against the committed report"
	@echo "  make score-force2020-rf   re-score the stored model, no refit"
	@echo "  make train-force2020-gbdt  fit the XGBoost and LightGBM baselines, score them, write the report"
	@echo "  make verify-force2020-gbdt  refit both boosters and diff against the committed report"
	@echo "  make score-force2020-gbdt  re-score both stored boosters, no refit"
	@echo "  make build-force2020-model-comparison  rebuild the RF/XGB/LGBM comparison report"
	@echo "  make check-force2020-model-comparison  diff the comparison against the committed one"
	@echo ""
	@echo "Quality"
	@echo "  make test         pytest"
	@echo "  make typecheck    mypy"
	@echo "  make lint         ruff (dataset/API phase scope)"
	@echo "  make lint-legacy  report pre-existing pipeline lint debt"
	@echo "  make check        test + typecheck + lint"
	@echo ""
	@echo "App"
	@echo "  make serve        uvicorn scripts.api.nwis_api:app --reload"

clean-data:
	$(PY) scripts/normalize/01_clean.py
	$(PY) scripts/normalize/02_promote.py

# Exit code 3 means PARTIAL, which is the correct state for this release.
validate:
	-$(PY) scripts/validate/dataset_validation.py --json $(VALIDATION_JSON)

reports:
	$(PY) scripts/reports/make_dataset_reports.py --validation $(VALIDATION_JSON)

# FORCE 2020 is an external dataset, inspected in place under the gitignored
# data/raw/force2020 checkout. Writes reports/ and data/force2020_wells.csv, and
# nothing under data/processed/ or data/ml/.
inspect-force2020:
	$(PY) scripts/ingest/inspect_force2020.py --print-summary

# Fails if the committed report no longer matches the source at the pinned
# commit, which is the guard against a silent source change.
verify-force2020:
	$(PY) scripts/ingest/inspect_force2020.py --verify

# Stage 2: measure the values, not just the bytes. Also read-only, and it stops
# at the proposal. Writes reports/force2020_characterization.{json,md} and
# data/force2020_well_missingness.csv, and nothing under data/processed/ or
# data/ml/. Full scan of 1.4M rows, so it takes a couple of minutes.
characterize-force2020:
	$(PY) scripts/ingest/characterize_force2020.py --print-summary

# Fails if any of the three characterization artifacts drifts from the source.
verify-force2020-characterization:
	$(PY) scripts/ingest/characterize_force2020.py --verify

# Stage 3: build the dataset and stop. Writes the table, its sidecar manifest and
# its exclusion ledger under the gitignored data/interim/ml/force2020_litho/, plus
# reports/force2020_dataset.{json,md} and data/force2020_split_manifest.csv. Still
# no model, no score, no tuning. Full scan of 1.4M rows.
build-force2020-dataset:
	$(PY) scripts/ingest/build_force2020_dataset.py --print-summary

# Fails if the committed report, markdown or split manifest drift from the source.
verify-force2020-dataset:
	$(PY) scripts/ingest/build_force2020_dataset.py --verify

# Reads the competition's published penalty matrix out of the pinned source and
# records where each value came from. stdlib only, writes ml/force2020_penalty_matrix.json.
extract-force2020-penalty-matrix:
	$(PY) scripts/ingest/extract_force2020_penalty_matrix.py --print-summary

# Fails if the committed matrix record drifts from the pinned source.
verify-force2020-penalty-matrix:
	$(PY) scripts/ingest/extract_force2020_penalty_matrix.py --verify

# Stage 4: the Random Forest baseline. Fits on the source's own train wells and
# scores the two held-out well-disjoint partitions, plus three diagnostics:
# DEPTH_MD alone, the five missingness masks, and an unweighted refit. Writes the
# model and its evaluation artifacts under the gitignored
# data/interim/ml/force2020_litho/ and the report pair under reports/. Never
# touches data/processed/ or data/ml/. Four fits of 1.17M rows: about 25 minutes.
train-force2020-rf:
	$(PY) data/ml/lithology/training/train_rf_baseline.py --print-summary

# Refits everything and diffs against the committed report. The expensive gate.
verify-force2020-rf:
	$(PY) data/ml/lithology/training/train_rf_baseline.py --verify

# Re-scores the stored model with no refit: the fast reproducibility check.
score-force2020-rf:
	$(PY) data/ml/lithology/evaluation/evaluate_rf_baseline.py --print-summary

# Fits the two gradient-boosted tree baselines on exactly the Random Forest's
# data, features, target, split, preprocessing, metrics and penalty matrix, so
# the only thing that differs is the learner. Four experiments each: the primary
# logs-only fit, a DEPTH_MD diagnostic, a missingness-mask ablation, and an
# unweighted refit. Nothing is searched, and neither evaluation partition is used
# to choose anything. Eight fits of 1.17M rows: about 30 minutes.
train-force2020-gbdt:
	$(PY) data/ml/lithology/training/train_gbdt_baseline.py --print-summary

# Refits both boosters and diffs against the committed report. The expensive gate.
verify-force2020-gbdt:
	$(PY) data/ml/lithology/training/train_gbdt_baseline.py --verify

# Re-scores both stored boosters with no refit: the fast reproducibility check.
score-force2020-gbdt:
	$(PY) data/ml/lithology/evaluation/evaluate_gbdt_baseline.py --print-summary

# Rebuilds the three-model comparison from the three committed baseline reports.
# Fits nothing and imports no ML library, so it cannot disagree with the reports
# it compares; use its --check to diff against the committed comparison.
build-force2020-model-comparison:
	$(PY) scripts/reports/build_model_comparison.py

check-force2020-model-comparison:
	$(PY) scripts/reports/build_model_comparison.py --check

test:
	$(PY) -m pytest

typecheck:
	$(PY) -m mypy

# Scoped to code owned by the dataset/API/modelling phase. The extract/normalize
# /ingest scripts carry pre-existing lint debt that is reported by `lint-legacy`
# rather than churned here.
lint:
	$(PY) -m ruff check scripts/nwis_lib.py scripts/api scripts/reports scripts/ingest/inspect_force2020.py scripts/ingest/characterize_force2020.py scripts/ingest/build_force2020_dataset.py scripts/ingest/extract_force2020_penalty_matrix.py data/ml tests

# Reports pre-existing lint debt without failing the build.
lint-legacy:
	-$(PY) -m ruff check scripts --output-format=concise

check: test typecheck lint

serve:
	$(PY) -m uvicorn scripts.api.nwis_api:app --reload

all: clean-data validate reports check
