.PHONY: help clean validate promote clean-data reports test typecheck lint check serve all

PY := python3
# Committed validator artifact. The API reads this file rather than
# re-deriving findings, so validator logic has exactly one home.
VALIDATION_JSON := reports/validation.json

help:
	@echo "Pipeline"
	@echo "  make clean-data   run 01_clean + 02_promote"
	@echo "  make validate     run the validator (exit 3 = PARTIAL, expected)"
	@echo "  make reports      regenerate reports/ from live data"
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

test:
	$(PY) -m pytest

typecheck:
	$(PY) -m mypy

# Scoped to code owned by the dataset/API phase. The extract/normalize/ingest
# scripts carry pre-existing lint debt that is reported by `lint-legacy`
# rather than churned here.
lint:
	$(PY) -m ruff check scripts/nwis_lib.py scripts/api scripts/reports tests

# Reports pre-existing lint debt without failing the build.
lint-legacy:
	-$(PY) -m ruff check scripts --output-format=concise

check: test typecheck lint

serve:
	$(PY) -m uvicorn scripts.api.nwis_api:app --reload

all: clean-data validate reports check
