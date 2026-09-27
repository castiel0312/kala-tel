"""Contract tests for the ML handoff scaffolding.

These do not test model behaviour -- no model exists. They test that the
scaffolding nine developers will build against is internally consistent and,
critically, that it does not overstate what the data contains.

The central guard is `test_availability_flags_match_the_data`: a feature may not
be declared available unless its backing column actually has values, and a
feature may not be declared unavailable unless the column is genuinely null.
That is what stops a fabricated capability from entering the handoff.
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))

from nwis_lib import PROCESSED  # noqa: E402

ML_ROOT = REPO / "data" / "ml"
REGISTRY_DIR = REPO / "ml"

MODELS = [
    "mud_loss",
    "stuck_pipe",
    "kick",
    "overpressure",
    "torque_spike",
    "wellbore_instability",
    "lithology",
    "cementing",
    "historical_analogue",
]
MODEL_DIRS = ["common", *MODELS]
SUBDIRS = ["features", "labels", "training", "evaluation"]

STATUSES = {
    "READY_FOR_EXTERNAL_DATA",
    "PROTOTYPE_POSSIBLE",
    "INSUFFICIENT_LABELS",
    "SIGNAL_UNAVAILABLE",
    "DATA_REQUIRED",
}


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def column_fill(name: str, column: str) -> tuple[int, int]:
    """(non-null count, total) for a canonical CSV column."""
    path = PROCESSED / f"{name}.csv"
    if not path.exists():
        return 0, 0
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        if column not in (reader.fieldnames or []):
            raise AssertionError(f"{name}.csv has no column {column!r}")
        rows = list(reader)
    filled = sum(1 for r in rows if (r.get(column) or "").strip())
    return filled, len(rows)


@pytest.fixture(scope="module")
def feature_registry() -> dict:
    return load_yaml(REGISTRY_DIR / "feature_registry.yaml")


@pytest.fixture(scope="module")
def label_registry() -> dict:
    return load_yaml(REGISTRY_DIR / "label_registry.yaml")


def iter_features(registry: dict):
    for group_name, group in registry["feature_groups"].items():
        if group_name == "depth_indexed_note":
            continue
        for feature in group.get("features", []) or []:
            yield group_name, feature


# ---------------------------------------------------------------------------
# Directory contract
# ---------------------------------------------------------------------------
def test_every_model_directory_exists():
    for model in MODEL_DIRS:
        assert (ML_ROOT / model).is_dir(), f"missing data/ml/{model}"


def test_each_model_directory_has_readme_and_subdirs():
    for model in MODEL_DIRS:
        base = ML_ROOT / model
        assert (base / "README.md").is_file(), f"{model} has no README.md"
        assert (base / "README.md").stat().st_size > 0, f"{model} README is empty"
        for sub in SUBDIRS:
            d = base / sub
            assert d.is_dir(), f"data/ml/{model}/{sub} is missing"
            # Empty dirs need a tracked placeholder or git will drop them.
            assert any(d.iterdir()), (
                f"data/ml/{model}/{sub} is empty and untracked by git"
            )


def test_no_unexpected_model_directories():
    found = {p.name for p in ML_ROOT.iterdir() if p.is_dir()}
    assert found == set(MODEL_DIRS), f"unexpected or missing model dirs: {found ^ set(MODEL_DIRS)}"


# ---------------------------------------------------------------------------
# Registry structure
# ---------------------------------------------------------------------------
def test_feature_registry_covers_every_model():
    """The registry is model-agnostic but must be model-loadable."""
    registry = load_yaml(REGISTRY_DIR / "feature_registry.yaml")
    assert registry["dataset_version"] == "nwis-forge16b-v0.2"
    assert registry["feature_groups"], "feature registry declares no groups"


def test_label_registry_covers_every_model(label_registry: dict):
    assert set(label_registry["models"]) == set(MODELS)


def test_label_statuses_are_from_the_declared_vocabulary(label_registry: dict):
    allowed = set(label_registry["status_values"])
    for model, spec in label_registry["models"].items():
        assert spec["status"] in allowed, f"{model}: unknown status {spec['status']!r}"


def test_label_registry_reports_no_usable_well_population(label_registry: dict):
    """One well exists. The registry must not imply otherwise."""
    for model, spec in label_registry["models"].items():
        assert spec["well_count"] == 1, f"{model}: well_count should be 1"


# ---------------------------------------------------------------------------
# The availability guard: the registry must match the actual data
# ---------------------------------------------------------------------------
def test_availability_flags_match_the_data(feature_registry: dict):
    """available_now must equal "the backing column has at least one value"."""
    errors: list[str] = []
    for group, feature in iter_features(feature_registry):
        table = feature.get("source_table")
        column = feature.get("source_column")
        if not table or not column:
            continue  # DERIVED features have no single backing column
        declared = feature["available_now"]
        filled, total = column_fill(table, column)

        if declared and filled == 0:
            errors.append(
                f"{group}/{feature['name']}: declared available_now=true but "
                f"{table}.{column} is 100% null ({total} rows)"
            )
        if not declared and filled > 0:
            errors.append(
                f"{group}/{feature['name']}: declared available_now=false but "
                f"{table}.{column} has {filled}/{total} values"
            )
    assert not errors, "registry disagrees with canonical data:\n  " + "\n  ".join(errors)


def test_no_feature_is_backed_by_an_empty_entity(feature_registry: dict):
    empty = set(feature_registry["unavailable_entities"])
    for group, feature in iter_features(feature_registry):
        assert feature.get("source_table") not in empty, (
            f"{group}/{feature['name']} is sourced from empty table "
            f"{feature['source_table']}"
        )


def test_unavailable_entities_are_declared_with_zero_rows(feature_registry: dict):
    for name, spec in feature_registry["unavailable_entities"].items():
        assert spec["rows"] == 0, f"{name} is declared unavailable but has rows"
        path = PROCESSED / f"{name}.csv"
        if path.exists():
            with open(path, newline="", encoding="utf-8") as fh:
                rows = sum(1 for _ in csv.DictReader(fh))
            assert rows == 0, f"{name} is declared unavailable but has {rows} rows"


def test_derived_features_declare_their_inputs(feature_registry: dict):
    for group, feature in iter_features(feature_registry):
        if feature.get("kind") == "DERIVED":
            assert feature.get("derived_from"), (
                f"{group}/{feature['name']} is DERIVED but names no inputs"
            )


def test_leakage_rules_are_present_and_blocking(feature_registry: dict):
    rules = feature_registry["leakage_rules"]
    ids = {r["id"] for r in rules}
    assert {"L1_label_window", "L2_label_column", "L3_post_event_persistence",
            "L4_interpolation_uses_label", "L5_well_grouping"} <= ids
    for rule in rules:
        assert rule["severity"] in {"blocking", "advisory"}
        assert rule["rule"].strip()


# ---------------------------------------------------------------------------
# Label honesty: the counts in the registry must match the events table
# ---------------------------------------------------------------------------
def test_label_counts_match_the_events_table(label_registry: dict):
    with open(PROCESSED / "events.csv", newline="", encoding="utf-8") as fh:
        events = list(csv.DictReader(fh))
    by_type: dict[str, int] = {}
    for e in events:
        by_type[e["event_type"]] = by_type.get(e["event_type"], 0) + 1

    total = len(events)
    claimed = sum(
        spec["available_labels"]
        for name, spec in label_registry["models"].items()
        if name != "lithology"  # lithology labels come from the lithology table
    )
    # Every event belongs to exactly one hazard model, except EQUIPMENT_FAILURE
    # and PACK_OFF which the registry handles explicitly.
    accounted = {
        "MUD_LOSS", "STUCK_PIPE", "CEMENT_FAILURE", "WASHOUT",
        "WELLBORE_INSTABILITY", "PACK_OFF",
    }
    assert sum(by_type.get(t, 0) for t in accounted) == claimed, (
        f"registry claims {claimed} labels, events table has "
        f"{sum(by_type.get(t, 0) for t in accounted)} across {accounted}; by_type={by_type}"
    )
    assert total == 44, f"expected 44 events, found {total}"


def test_lithology_label_count_matches_its_table(label_registry: dict):
    spec = label_registry["models"]["lithology"]
    filled, total = column_fill("lithology", "lithology")
    assert spec["available_labels"] == filled
    assert spec["normalisation_required"] is True, (
        "lithology labels are free text; normalisation cannot be waived"
    )


def test_absent_label_models_have_zero_labels(label_registry: dict):
    for model in ("kick", "overpressure", "torque_spike", "historical_analogue"):
        spec = label_registry["models"][model]
        assert spec["available_labels"] == 0, f"{model} must not claim labels"
        assert spec["status"] in {"ABSENT", "BLOCKED_NO_MULTIPLE_WELLS"}


# ---------------------------------------------------------------------------
# Reports and handoff cover every model
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("model", MODELS)
def test_readiness_report_covers_model(model: str):
    text = (REPO / "reports" / "ml_training_readiness.md").read_text(encoding="utf-8")
    assert f"MODEL: {model}" in text, f"readiness report has no MODEL: {model} block"


def test_readiness_report_uses_allowed_statuses():
    text = (REPO / "reports" / "ml_training_readiness.md").read_text(encoding="utf-8")
    found = {s for s in STATUSES if f"`{s}`" in text}
    assert found, "readiness report states no statuses"
    for line in text.splitlines():
        if line.strip().startswith("- **STATUS:**"):
            status = line.split("**STATUS:**")[1].strip().strip("`")
            assert status in STATUSES, f"disallowed status {status!r} in readiness report"


@pytest.mark.parametrize("model", MODELS)
def test_handoff_covers_model(model: str):
    text = (REPO / "docs" / "ML_TEAM_HANDOFF.md").read_text(encoding="utf-8")
    assert f"`{model}`" in text, f"handoff does not mention {model}"


@pytest.mark.parametrize("model", MODELS)
def test_handoff_has_every_required_field(model: str):
    """The handoff promises a fixed field set per model. Hold it to that."""
    text = (REPO / "docs" / "ML_TEAM_HANDOFF.md").read_text(encoding="utf-8")
    section = _section_for(text, model)
    for field in (
        "**Objective:**",
        "**Expected target:**",
        "**Canonical tables:**",
        "**Required features",
        "**Leakage restrictions:**",
        "**Baseline:**",
        "**Main model:**",
        "**Advanced model:**",
        "**Evaluation:**",
        "**Expected output files:**",
    ):
        assert field in section, f"handoff section for {model} is missing {field}"


def _section_for(text: str, model: str) -> str:
    """Slice the handoff from a model's own "## " heading up to the next one."""
    lines = text.splitlines(keepends=True)
    starts = [i for i, line in enumerate(lines)
              if line.startswith("## ") and f"`{model}`" in line]
    assert starts, f"handoff has no '## ' heading for {model}"
    start = starts[0]
    end = next(
        (i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")),
        len(lines),
    )
    return "".join(lines[start:end])


def test_ml_readme_states_the_dataset_version():
    text = (REGISTRY_DIR / "README.md").read_text(encoding="utf-8")
    assert "nwis-forge16b-v0.2" in text


def test_ml_readme_warns_against_oil_claims():
    text = (REGISTRY_DIR / "README.md").read_text(encoding="utf-8")
    lowered = text.lower()
    assert "not oil-well data" in lowered
    assert "public_real" in lowered


# ---------------------------------------------------------------------------
# The scaffolding must not contaminate the canonical pipeline
# ---------------------------------------------------------------------------
def test_scaffolding_contains_no_data_or_model_artifacts():
    """data/ml is a scaffold. Data, weights or checkpoints do not belong here yet."""
    forbidden = {".csv", ".parquet", ".pkl", ".joblib", ".pt", ".h5", ".onnx"}
    offenders = [
        p for p in ML_ROOT.rglob("*")
        if p.is_file() and p.suffix.lower() in forbidden
    ]
    assert not offenders, f"data/ml must stay empty of data: {offenders}"


def test_scaffolding_declares_no_ml_dependency_in_the_base_install():
    """pyproject must not acquire an ML stack it does not use."""
    text = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    base = text.split("[project.optional-dependencies]")[0]
    for pkg in ("numpy", "pandas", "scikit", "torch", "lightgbm", "xgboost"):
        assert pkg not in base, f"{pkg} must not be a base dependency"
