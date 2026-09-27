"""Shared code for FORCE 2020 lithology models: loading, guards, metrics, scoring.

This module holds what a model team needs before it holds a model. It is shared
rather than copied into each model directory because three of its jobs are
contracts, not conveniences, and every model of this dataset has to satisfy the
same ones:

* **Loading** the ingested table without ever writing to it. The table is the
  dataset-construction stage's output and is treated as read-only here.
* **Guards** that make a report impossible to get wrong by accident: the
  feature matrix is exactly the five log curves, `DEPTH_MD` is not in it, no
  coordinate or stratigraphy column is in it, and no well is ever in both the
  fitting and the evaluation partition.
* **Metrics and scoring** computed the way the FORCE 2020 competition defines
  them, including the published penalty matrix, with every aggregate recording
  which rows, wells and classes produced it.

Nothing here trains anything. The model stages in
`data/ml/lithology/training/` do that, and they import the pieces below rather
than re-implementing them.

Requires the `ml` extra (`pip install -e .[ml]`). scikit-learn is a declared
optional dependency, not a base one: the canonical dataset and the read API do
not use it, and `tests/test_ml_scaffolding.py` fails the build if it appears in
the base install.
"""
from __future__ import annotations

import json
import platform
import sys
import warnings
from collections.abc import Iterable, Sequence
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

# LightGBM is imported before scikit-learn, on purpose, and this is the one
# import-order requirement in the repository.
#
# On this platform (Windows, lightgbm 4.7.0, numpy 1.26.4, scikit-learn 1.4.2),
# fitting, loading or predicting with a LightGBM model after scikit-learn has
# been imported aborts the process with
#
#     OSError: exception: access violation reading 0x0000000000000000
#
# raised from LightGBM's own `LGBM_DatasetSetField` / `Booster.predict` C calls.
# The two libraries ship different OpenMP runtimes and loading scikit-learn
# first leaves LightGBM's native layer in a state it cannot use. Importing
# LightGBM first is the workaround, verified in this order and reliable; the
# reverse order fails every time. Only ModuleNotFoundError is caught, so a
# broken LightGBM install still fails loudly rather than quietly disappearing.
#
# Doing the import here rather than in each entrypoint means every process that
# touches this module inherits the safe order, including the test module, and
# `tests/test_force2020_gbdt_baseline.py` asserts the ordering in the AST so a
# future edit cannot quietly reintroduce the crash. The cost is one eager import
# on platforms where the conflict does not exist.
try:
    import lightgbm as _lightgbm  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover - exercised by base installs
    _lightgbm = None  # type: ignore[assignment]

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.pipeline import Pipeline

# data/ml/common/force2020_lithology.py -> repo root
REPO_ROOT = Path(__file__).resolve().parents[3]

# ---------------------------------------------------------------------------
# Identity
# ---------------------------------------------------------------------------
DATASET_ID = "force2020-litho-logs-v0.1"
EXPERIMENT_ID = "force2020-litho-rf-v0.1"
ARTIFACT_STEM = "force2020_litho_rf_v0_1"

# Generated artifacts live under the gitignored interim root for this dataset,
# never in data/processed/ (frozen) and never in data/ml/ (a hand-off contract).
ARTIFACT_ROOT = REPO_ROOT / "data" / "interim" / "ml" / "force2020_litho"
TRAINING_DIR = ARTIFACT_ROOT / "training"
EVALUATION_DIR = ARTIFACT_ROOT / "evaluation"
FEATURE_CSV = ARTIFACT_ROOT / "features" / "force2020_litho_logs_v0_1.csv"
FEATURE_MANIFEST = FEATURE_CSV.with_suffix(".manifest.json")
SPLIT_MANIFEST = REPO_ROOT / "data" / "force2020_split_manifest.csv"
FEATURE_REGISTRY_JSON = REPO_ROOT / "ml" / "force2020_feature_registry.json"
PENALTY_MATRIX_JSON = REPO_ROOT / "ml" / "force2020_penalty_matrix.json"
REPORT_JSON = REPO_ROOT / "reports" / "force2020_rf_baseline.json"
REPORT_MD = REPO_ROOT / "reports" / "force2020_rf_baseline.md"

# ---------------------------------------------------------------------------
# Columns. The primary model is logs-only, by decision and not by omission.
# ---------------------------------------------------------------------------
WELL = "WELL"
SPLIT = "SPLIT"
DEPTH = "DEPTH_MD"
TARGET = "TARGET_ENCODED"
TARGET_CODE = "TARGET_LABEL_RAW"
TARGET_CLASS = "TARGET_CLASS"

LOG_COLUMNS: tuple[str, ...] = ("CALI", "RDEP", "RMED", "DTC", "GR")
MASK_COLUMNS: tuple[str, ...] = tuple(f"{column}_MISSING" for column in LOG_COLUMNS)
PRIMARY_FEATURES: tuple[str, ...] = LOG_COLUMNS
MASKED_FEATURES: tuple[str, ...] = LOG_COLUMNS + MASK_COLUMNS
DEPTH_ONLY_FEATURES: tuple[str, ...] = (DEPTH,)

TRAIN_SPLIT = "train"
EVAL_SPLITS: tuple[str, ...] = ("hidden_test", "leaderboard_test")
ALL_SPLITS: tuple[str, ...] = (TRAIN_SPLIT, *EVAL_SPLITS)

# Columns that exist in the source and must never reach the primary matrix.
# DEPTH_MD is first because it is the one this project had to be careful about:
# it is carried in the table so a depth ablation is possible, which is exactly
# what makes it easy to leak by accident.
FORBIDDEN_FEATURE_COLUMNS: frozenset[str] = frozenset(
    {
        DEPTH,
        "X_LOC",
        "Y_LOC",
        "Z_LOC",
        "GROUP",
        "FORMATION",
        "SOURCE_ID",
        "SOURCE_COMMIT",
        "SOURCE_FILE",
        "SOURCE_SPLIT",
        TARGET,
        TARGET_CODE,
        TARGET_CLASS,
    }
)


# ---------------------------------------------------------------------------
# Baseline configuration
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class RFConfig:
    """The baseline Random Forest configuration, stated rather than implied.

    Every value is a scikit-learn default except the four set here, each for a
    recorded reason. Nothing was searched, tuned or selected on any metric.
    """

    n_estimators: int = 100
    max_depth: int | None = None
    min_samples_split: int = 2
    min_samples_leaf: int = 5
    max_features: str = "sqrt"
    class_weight: str | None = "balanced_subsample"
    random_state: int = 42
    n_jobs: int = -1

    def deviations_from_sklearn_defaults(self) -> dict[str, str]:
        return {
            "min_samples_leaf": (
                "5 instead of the default 1. Not a tuning choice: a leaf-1 forest at this "
                "scale stores about 1.0M nodes per tree for the depth-only diagnostic, and "
                "12 class-count vectors per node, which is about 14 GB of tree arrays for "
                "100 trees and does not fit the 15.7 GB of RAM this ran on. Leaf 5 bounds "
                "the same forest at roughly 3.5 GB. Measured, not guessed."
            ),
            "class_weight": (
                "'balanced_subsample' instead of None. The training partition's largest class "
                "is 6998x its smallest (Shale 720,803 rows vs Basement 103 rows), and the "
                "headline metric is macro-averaged, so an unweighted forest would spend its "
                "capacity reproducing the majority. Recorded as a decision, not applied "
                "silently, and measured against an unweighted refit in the report."
            ),
            "random_state": "42, fixed explicitly so the fit is reproducible.",
            "n_jobs": "-1, all cores. Parallel tree building does not change results when random_state is set.",
        }

    def to_dict(self) -> dict[str, Any]:
        params = asdict(self)
        return {
            "estimator": "sklearn.ensemble.RandomForestClassifier",
            "parameters": params,
            "sklearn_version": sklearn.__version__,
            "deviations_from_sklearn_defaults": self.deviations_from_sklearn_defaults(),
            "tuned": False,
            "search_performed": False,
        }


# Imputation happens here and only here: inside the pipeline, fitted on the
# fitting partition alone. The stored table keeps its empty cells, so nothing is
# imputed on disk and no evaluation row can influence a fitted statistic.
IMPUTER_STRATEGY = "median"
IMPUTER_NOTE = (
    "RandomForestClassifier cannot consume NaN, so the pipeline's first step is a "
    "SimpleImputer(strategy='median') fitted by Pipeline.fit on the train partition only. "
    "The median is a single number per curve over 1,170,511 training rows; it is recorded "
    "in the training config. There is no interpolation, no use of neighbouring depth rows, "
    "no per-well statistic and no statistic from either evaluation partition. The stored "
    "dataset is not modified: imputation happens in memory at fit time and the table on "
    "disk keeps its empty cells and its 0/1 missingness masks."
)


def build_pipeline(config: RFConfig, features: Sequence[str]) -> Pipeline:
    """Imputer + RandomForest, in that order, as one fitted-on-train unit."""
    imputer = SimpleImputer(strategy=IMPUTER_STRATEGY)
    forest = RandomForestClassifier(
        n_estimators=config.n_estimators,
        max_depth=config.max_depth,
        min_samples_split=config.min_samples_split,
        min_samples_leaf=config.min_samples_leaf,
        max_features=config.max_features,
        class_weight=config.class_weight,
        random_state=config.random_state,
        n_jobs=config.n_jobs,
    )
    return Pipeline([("imputer", imputer), ("classifier", forest)])


# ---------------------------------------------------------------------------
# Guards
# ---------------------------------------------------------------------------
def assert_logs_only(features: Sequence[str], *, allow: Sequence[str] = ()) -> None:
    """Refuse any feature list that is not the declared one.

    `allow` exists for the two diagnostics this stage is asked for, and only for
    those: DEPTH_MD alone, and the five missingness masks. Nothing else may be
    added, and the diagnostic feature lists are checked against what they are
    allowed to be by the caller and by the tests.
    """
    permitted = set(PRIMARY_FEATURES) | set(allow)
    unexpected = [column for column in features if column not in permitted]
    if unexpected:
        raise ValueError(
            f"feature list contains columns that are not permitted here: {unexpected}. "
            f"Permitted: {sorted(permitted)}"
        )
    leaked = [column for column in features if column in FORBIDDEN_FEATURE_COLUMNS and column not in allow]
    if leaked:
        raise ValueError(f"feature list contains forbidden columns: {leaked}")


def assert_no_well_overlap(fit_wells: Iterable[str], eval_wells: Iterable[str]) -> dict[str, Any]:
    """The leakage guard. No well may appear on both sides of a fit/score pair."""
    fit = set(fit_wells)
    evaluate = set(eval_wells)
    shared = sorted(fit & evaluate)
    if shared:
        raise ValueError(
            f"{len(shared)} well(s) appear in both the fitting and the evaluation "
            f"partition: {shared[:10]}. A model is never scored on depth rows from a "
            "well it was fitted on."
        )
    return {"fitting_wells": len(fit), "evaluation_wells": len(evaluate), "shared_wells": 0}


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
_DTYPES: dict[str, Any] = {
    WELL: "string",
    SPLIT: "string",
    TARGET: "int8",
    TARGET_CODE: "string",
    TARGET_CLASS: "string",
    DEPTH: "float64",
    **{column: "float64" for column in LOG_COLUMNS},
    **{column: "int8" for column in MASK_COLUMNS},
}


def dtypes_for(columns: Sequence[str]) -> dict[str, Any]:
    """Column dtypes for any approved feature version.

    The baseline declares its five curves and five masks. A later version adds
    curves, and the only thing that distinguishes a measurement from its mask is
    the column's own name, so the dtype follows the name rather than a list that
    would have to be edited every time a curve is admitted.
    """
    dtypes: dict[str, Any] = dict(_DTYPES)
    for name in columns:
        if name in dtypes:
            continue
        dtypes[name] = "int8" if name.endswith("_MISSING") else "float64"
    return {name: dtypes[name] for name in columns if name in dtypes}


def feature_registry() -> dict[str, Any]:
    """The committed curve inventory's feature-version registry.

    Read rather than restated, so an ablation cannot quietly train on a curve
    list that the selection stage no longer approves.
    """
    return json.loads(FEATURE_REGISTRY_JSON.read_text(encoding="utf-8"))


def feature_set(version: str) -> dict[str, Any]:
    """One approved feature version: its curves and the table that carries them."""
    registry = feature_registry()
    sets = registry.get("feature_sets", {})
    if version not in sets:
        raise KeyError(
            f"feature version {version!r} is not in the registry "
            f"(known: {', '.join(sorted(sets))})"
        )
    spec = sets[version]
    stem = f"force2020_litho_logs_{version.replace('.', '_')}"
    return {
        "version": version,
        "curves": list(spec["curves"]),
        "masks": [f"{curve}_MISSING" for curve in spec["curves"]],
        "table": ARTIFACT_ROOT / "features" / f"{stem}.csv",
        "manifest": ARTIFACT_ROOT / "features" / f"{stem}.manifest.json",
        "added_relative_to_v0_1": list(spec.get("added_relative_to_v0_1", [])),
        "note": spec.get("note", ""),
    }


def load_dataset(
    columns: Sequence[str] | None = None,
    *,
    path: Path | None = None,
) -> pd.DataFrame:
    """Read an ingested table. Read-only: this function never writes.

    `path` defaults to the frozen v0.1 table. Naming it is what lets an ablation
    read a different approved version without a second loader, so the split
    validation and dtype handling below stay in one place.
    """
    source = FEATURE_CSV if path is None else Path(path)
    usecols = None
    if columns is not None:
        usecols = list(columns)
        dtypes = dtypes_for(usecols)
    else:
        dtypes = dict(_DTYPES)
    frame = pd.read_csv(source, usecols=usecols, dtype=dtypes)
    unknown = set(frame[SPLIT].unique()) - set(ALL_SPLITS)
    if unknown:
        raise ValueError(f"unknown SPLIT values in the table: {sorted(unknown)}")
    return frame


def read_manifest(path: Path | None = None) -> dict:
    target = FEATURE_MANIFEST if path is None else Path(path)
    return json.loads(target.read_text(encoding="utf-8"))


def encoded_to_code(manifest_path: Path | None = None) -> dict[int, int]:
    manifest = read_manifest(manifest_path)
    classes = manifest["label_encoding"]["classes"]
    return {int(entry["encoded_id"]): int(entry["code"]) for entry in classes}


def encoded_to_class_name(manifest_path: Path | None = None) -> dict[int, str]:
    manifest = read_manifest(manifest_path)
    classes = manifest["label_encoding"]["classes"]
    return {int(entry["encoded_id"]): str(entry["class_name"]) for entry in classes}


def class_table() -> list[dict[str, Any]]:
    """The 12 classes, in encoded-id order, with code and name."""
    manifest = read_manifest()
    entries = sorted(manifest["label_encoding"]["classes"], key=lambda entry: int(entry["encoded_id"]))
    return [
        {
            "encoded_id": int(entry["encoded_id"]),
            "code": int(entry["code"]),
            "class_name": str(entry["class_name"]),
        }
        for entry in entries
    ]


def read_split_manifest() -> pd.DataFrame:
    return pd.read_csv(SPLIT_MANIFEST, dtype={"WELL": "string", "SPLIT": "string"})


def read_penalty_matrix() -> dict:
    return json.loads(PENALTY_MATRIX_JSON.read_text(encoding="utf-8"))


def penalty_index_map() -> dict[int, int]:
    """encoded_id -> the competition's matrix row/column index.

    The two index orders are not the same and never will be: this repository's
    encoded id is the ascending rank of the NPD code, the competition's is the
    order of its own `lithology_numbers` dict. Indexing the matrix with the
    encoded id would produce a confident, wrong score.
    """
    record = read_penalty_matrix()
    code_to_index = {
        int(code): int(index)
        for code, index in record["index_order"]["code_to_competition_index"].items()
    }
    return {encoded: code_to_index[code] for encoded, code in sorted(encoded_to_code().items())}


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
UNDEFINED_NOTE = (
    "A score is reported as null, not as 0, when it is undefined: precision when the "
    "class was never predicted, recall when the class has no rows in the evaluation "
    "partition, and F1 when either is undefined. Zero is a real score and is reported "
    "as 0."
)


def _round(value: float | None, digits: int = 6) -> float | None:
    return None if value is None else round(float(value), digits)


def per_class_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    classes: Sequence[int],
    lookup: dict[int, str],
) -> list[dict[str, Any]]:
    """Per-class precision, recall, F1, support and predicted count."""
    labels = list(classes)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    predicted = np.bincount(y_pred, minlength=max(labels) + 1)
    rows: list[dict[str, Any]] = []
    for position, encoded_id in enumerate(labels):
        n_support = int(support[position])
        n_predicted = int(predicted[encoded_id])
        precision_undefined = n_predicted == 0
        recall_undefined = n_support == 0
        rows.append(
            {
                "encoded_id": int(encoded_id),
                "class_name": lookup[int(encoded_id)],
                "support": n_support,
                "predicted": n_predicted,
                "precision": None if precision_undefined else _round(precision[position]),
                "recall": None if recall_undefined else _round(recall[position]),
                "f1": (
                    None
                    if precision_undefined or recall_undefined
                    else _round(f1[position])
                ),
                "zero_support": n_support == 0,
                "never_predicted": n_predicted == 0,
            }
        )
    return rows


def aggregate_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    classes: Sequence[int],
    rows: int,
    wells: int,
    per_class: Sequence[dict[str, Any]],
) -> dict[str, Any]:
    """Every aggregate, each one labelled with what produced it."""
    labels = list(classes)
    supported = [int(row["encoded_id"]) for row in per_class if int(row["support"]) > 0]
    # A class the model predicts but that has no true row in this partition is
    # the normal case for a thin class, not an error. scikit-learn warns about
    # it inside balanced_accuracy_score; the condition is recorded below instead
    # of being printed as a warning on every run.
    predicted_but_absent = [
        int(row["encoded_id"])
        for row in per_class
        if int(row["support"]) == 0 and int(row["predicted"]) > 0
    ]
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="y_pred contains classes not in y_true")
        balanced = balanced_accuracy_score(y_true, y_pred)
    return {
        "rows_evaluated": int(rows),
        "wells_evaluated": int(wells),
        "classes_declared": len(labels),
        "classes_with_support": len(supported),
        "classes_zero_support": [
            int(row["encoded_id"]) for row in per_class if int(row["support"]) == 0
        ],
        "classes_predicted_but_absent": predicted_but_absent,
        "macro_f1": {
            "value": _round(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
            "computed_from": (
                f"all {len(labels)} declared classes, unweighted mean of their F1. A class "
                "with zero support in this partition contributes 0, which is scikit-learn's "
                "documented behaviour for zero_division=0 and is pessimistic by construction."
            ),
            "classes_included": labels,
        },
        "macro_f1_supported_only": {
            "value": (
                _round(f1_score(y_true, y_pred, labels=supported, average="macro", zero_division=0))
                if supported
                else None
            ),
            "computed_from": (
                f"the {len(supported)} classes that actually occur in this partition, "
                "unweighted. This is the macro F1 to quote when a class is missing from a "
                "partition, because the other figure charges the model for a class it was "
                "never asked about."
            ),
            "classes_included": supported,
        },
        "weighted_f1": {
            "value": _round(f1_score(y_true, y_pred, labels=labels, average="weighted", zero_division=0)),
            "computed_from": (
                f"all {len(labels)} declared classes, weighted by their support in this "
                "partition. Classes with zero support carry weight 0, so they cannot move "
                "the number."
            ),
            "total_weight": int(sum(int(row["support"]) for row in per_class)),
        },
        "balanced_accuracy": {
            "value": _round(balanced),
            "computed_from": (
                "the unweighted mean of recall over the classes present in y_true. "
                "scikit-learn excludes classes with no true rows by definition, so this "
                "figure is the macro recall of the partition, not of the vocabulary."
            ),
            "classes_included": supported,
        },
        "undefined_score_policy": UNDEFINED_NOTE,
    }


def penalty_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    matrix: Sequence[Sequence[float]],
    index_map: dict[int, int],
) -> dict[str, Any]:
    """The competition's own score, against the published matrix.

    The matrix is indexed in the competition's class order, not this
    repository's, and the row is the true class while the column is the
    prediction, exactly as `test_code.py` does it.
    """
    lookup_true = np.array([index_map[int(value)] for value in y_true], dtype=np.intp)
    lookup_pred = np.array([index_map[int(value)] for value in y_pred], dtype=np.intp)
    array = np.asarray(matrix, dtype=np.float64)
    penalties = array[lookup_true, lookup_pred]
    mean_penalty = float(penalties.mean()) if penalties.size else 0.0
    return {
        "matrix_id": "force2020_lithology_penalty_matrix",
        "mean_penalty": _round(mean_penalty),
        "competition_score": _round(-mean_penalty),
        "rows_scored": int(penalties.size),
        "indexed_by": "competition lithology_numbers index, not this repository's encoded id",
        "formula": "S = -(1/N) * sum_i A[y_true_i, y_pred_i]",
        "perfect_score": 0.0,
    }


def confusion_frame(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    classes: Sequence[int],
    lookup: dict[int, str],
) -> tuple[np.ndarray, list[list[dict[str, Any]]]]:
    """Counts matrix, rows = true class, columns = predicted class."""
    labels = list(classes)
    counts = confusion_matrix(y_true, y_pred, labels=labels)
    table: list[list[dict[str, Any]]] = []
    for i, truth in enumerate(labels):
        row: list[dict[str, Any]] = []
        for j, predicted in enumerate(labels):
            count = int(counts[i, j])
            row.append(
                {
                    "true_encoded_id": int(truth),
                    "true_class": lookup[int(truth)],
                    "predicted_encoded_id": int(predicted),
                    "predicted_class": lookup[int(predicted)],
                    "count": count,
                    "row_total": int(counts[i].sum()),
                }
            )
        table.append(row)
    return counts, table


def environment_facts() -> dict[str, Any]:
    import joblib

    return {
        "python": sys.version.split()[0],
        "implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "cpu_count": __import__("os").cpu_count(),
        "scikit_learn": sklearn.__version__,
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "joblib": joblib.__version__,
    }


def split_manifest_reference() -> dict[str, Any]:
    """Pointer to the authoritative well-level split, with its identity."""
    import hashlib

    payload = SPLIT_MANIFEST.read_bytes()
    frame = read_split_manifest()
    return {
        "path": SPLIT_MANIFEST.relative_to(REPO_ROOT).as_posix(),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "rows": int(len(frame)),
        "policy": (
            "The split is the source's own published well-level partition, inherited "
            "unchanged by the dataset-construction stage. No well is reshuffled, no depth "
            "row is reshuffled, and no split is re-derived here."
        ),
        "wells_by_split": {
            split: int(frame.loc[frame.SPLIT == split, "WELL"].nunique()) for split in ALL_SPLITS
        },
    }


# ---------------------------------------------------------------------------
# Gradient-boosted tree stage
# ---------------------------------------------------------------------------
# XGBoost and LightGBM are compared against the Random Forest baseline, so the
# parts of the experiment that could bias that comparison are declared here
# rather than decided per script: the same table, the same five features, the
# same target, the same split, the same imputer, the same metrics, the same
# artifact location. What differs between the two libraries is the estimator and
# its own default configuration, and nothing else.

XGB_EXPERIMENT_ID = "force2020-litho-xgb-v0.1"
LGBM_EXPERIMENT_ID = "force2020-litho-lgbm-v0.1"
XGB_ARTIFACT_STEM = "force2020_litho_xgb_v0_1"
LGBM_ARTIFACT_STEM = "force2020_litho_lgbm_v0_1"

GBDT_REPORT_JSON = REPO_ROOT / "reports" / "force2020_gbdt_baseline.json"
GBDT_REPORT_MD = REPO_ROOT / "reports" / "force2020_gbdt_baseline.md"
COMPARISON_REPORT_JSON = REPO_ROOT / "reports" / "force2020_model_comparison.json"
COMPARISON_REPORT_MD = REPO_ROOT / "reports" / "force2020_model_comparison.md"


def experiment_id(model: str) -> str:
    return XGB_EXPERIMENT_ID if model == "xgb" else LGBM_EXPERIMENT_ID


def artifact_stem(model: str) -> str:
    return XGB_ARTIFACT_STEM if model == "xgb" else LGBM_ARTIFACT_STEM


# Sample weighting, not `class_weight`. Neither boosting library takes a class
# weight the way a forest does, so the balancing is expressed as one weight per
# training row. This is the same philosophy as the Random Forest baseline
# (rebalance so a macro-averaged metric is optimisable) reached by a different
# mechanism, and it is a declared decision rather than an assumption: an
# unweighted refit of each model is reported beside it, so whether the weighting
# was necessary is measured and not asserted.
SAMPLE_WEIGHT_NOTE = (
    "Balanced per-row sample weights, w_c = n / (K * count_c), computed from the "
    "training partition's class counts only, where n = 1,170,511 and K = 12. Neither "
    "XGBoost nor LightGBM exposes a `class_weight` argument, so the balancing the "
    "Random Forest baseline expresses as class_weight='balanced_subsample' is "
    "expressed here as one fixed weight per row. Two mechanisms, one intent: neither "
    "evaluation partition contributes a count, a weight or a fitted statistic. This is "
    "not assumed to be the right choice for a boosted tree: a single unweighted refit "
    "of each model is reported beside it so the effect is measured, and it is measured "
    "per library rather than carried over from the forest."
)

MODEL_SELECTION_NOTE = (
    "No model selection was performed, so no evaluation partition was used to choose "
    "anything. The two configurations were fixed before fitting, from each library's "
    "documented defaults plus the changes recorded as deviations, and the hidden_test "
    "and leaderboard_test partitions were read once per model, after fitting, to "
    "produce the reported numbers. No hyperparameter search, no cross-validation, no "
    "feature selection and no early stopping on an evaluation partition. Well-grouped "
    "cross-validation inside the 98 training wells is the sanctioned tool if a future "
    "stage needs to select anything, and it is deliberately not exercised here."
)


@dataclass(frozen=True)
class XGBConfig:
    """XGBoost multiclass configuration, stated rather than implied.

    Every value is XGBoost's own documented default except the four set here,
    each with a recorded reason. Nothing was searched, tuned or selected on any
    metric, and neither evaluation partition was read before the fit.
    """

    n_estimators: int = 500
    max_depth: int = 6
    learning_rate: float = 0.1
    subsample: float = 1.0
    colsample_bytree: float = 1.0
    min_child_weight: float = 1.0
    reg_lambda: float = 1.0
    reg_alpha: float = 0.0
    gamma: float = 0.0
    objective: str = "multi:softprob"
    eval_metric: str = "mlogloss"
    tree_method: str = "hist"
    num_class: int = 12
    random_state: int = 42
    n_jobs: int = -1

    def estimator(self) -> Any:
        import xgboost

        return xgboost.XGBClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            min_child_weight=self.min_child_weight,
            reg_lambda=self.reg_lambda,
            reg_alpha=self.reg_alpha,
            gamma=self.gamma,
            objective=self.objective,
            eval_metric=self.eval_metric,
            tree_method=self.tree_method,
            num_class=self.num_class,
            random_state=self.random_state,
            n_jobs=self.n_jobs,
        )

    def deviations_from_library_defaults(self) -> dict[str, str]:
        return {
            "n_estimators": (
                "500 instead of the default 100. A boosting budget, not a tuned value: "
                "500 rounds at the learning rate below is the conventional pairing for a "
                "first baseline, and stopping early would need a validation signal this "
                "stage is not allowed to take from an evaluation partition."
            ),
            "learning_rate": (
                "0.1 instead of the default 0.3. Paired with the round count above. Lower "
                "and slower is the standard way to spend a fixed, unvalidated budget."
            ),
            "objective": (
                "'multi:softprob' rather than the binary default. Forced by a 12-class "
                "target, and the reason the model emits a probability per class rather "
                "than a single score."
            ),
            "eval_metric": (
                "'mlogloss'. The training loss for a 12-class target. Recorded for "
                "completeness: no early stopping is attached to it and no evaluation "
                "partition is watched."
            ),
            "tree_method": (
                "'hist'. The exact, histogram-based builder. Chosen for a 1.17M-row fit "
                "on one machine, and because it is deterministic here, unlike the "
                "exact greedy builder on very small data."
            ),
            "num_class": (
                "12, stated rather than inferred. XGBoost can work the output width out "
                "from the labels it was given, which means a rare class that went missing "
                "would quietly produce an 11-class model that still fits and still scores. "
                "Stating it makes that failure impossible, and the fitted booster is then "
                "checked against it."
            ),
            "random_state": "42, fixed explicitly so the fit is reproducible.",
            "n_jobs": "-1, all cores. Tree boosting is not order-dependent, so this does not change results.",
        }

    def to_dict(self) -> dict[str, Any]:
        import xgboost

        params = asdict(self)
        return {
            "model": "xgboost",
            "library": "xgboost",
            "estimator": "xgboost.XGBClassifier",
            "library_version": xgboost.__version__,
            "parameters": params,
            "class_handling": {
                "strategy": "balanced per-row sample weights",
                "note": SAMPLE_WEIGHT_NOTE,
            },
            "model_selection": {
                "performed": False,
                "test_partitions_used_for_selection": False,
                "note": MODEL_SELECTION_NOTE,
            },
            "deviations_from_library_defaults": self.deviations_from_library_defaults(),
            "tuned": False,
            "search_performed": False,
        }


@dataclass(frozen=True)
class LGBMConfig:
    """LightGBM multiclass configuration, stated rather than implied.

    Every value is LightGBM's own documented default except the four set here.
    `deterministic` and `force_row_wise` are not accuracy choices at all: they
    are what makes a rerun reproduce this report byte for byte.
    """

    n_estimators: int = 500
    num_leaves: int = 31
    max_depth: int = -1
    learning_rate: float = 0.1
    min_child_samples: int = 20
    subsample: float = 1.0
    subsample_freq: int = 0
    colsample_bytree: float = 1.0
    reg_lambda: float = 0.0
    objective: str = "multiclass"
    num_class: int = 12
    metric: str = "multi_logloss"
    deterministic: bool = True
    force_row_wise: bool = True
    random_state: int = 42
    n_jobs: int = -1
    verbosity: int = -1

    def estimator(self) -> Any:
        import lightgbm

        return lightgbm.LGBMClassifier(
            boosting_type="gbdt",
            n_estimators=self.n_estimators,
            num_leaves=self.num_leaves,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            min_child_samples=self.min_child_samples,
            subsample=self.subsample,
            subsample_freq=self.subsample_freq,
            colsample_bytree=self.colsample_bytree,
            reg_lambda=self.reg_lambda,
            objective=self.objective,
            num_class=self.num_class,
            metric=self.metric,
            deterministic=self.deterministic,
            force_row_wise=self.force_row_wise,
            random_state=self.random_state,
            n_jobs=self.n_jobs,
            verbosity=self.verbosity,
        )

    def deviations_from_library_defaults(self) -> dict[str, str]:
        return {
            "n_estimators": (
                "500 instead of the default 100. A boosting budget, not a tuned value, "
                "chosen to match the XGBoost budget so the two boosted models are "
                "compared at the same number of rounds rather than at two different "
                "amounts of compute."
            ),
            "num_class": (
                "12, stated explicitly rather than inferred from the labels. Both "
                "boosted libraries infer the class count from what they are fitted on; "
                "stating it means a class that vanished from the training partition would "
                "be an error rather than a silently narrower output."
            ),
            "metric": (
                "'multi_logloss'. The training loss for a 12-class target, recorded for "
                "completeness. No early stopping is attached to it."
            ),
            "deterministic": (
                "True. Not an accuracy setting. With bagging and feature sampling left "
                "at their defaults, this is what makes a rerun on the same machine "
                "reproduce this report exactly instead of approximately."
            ),
            "force_row_wise": (
                "True. Required by `deterministic=True`, and the reason the result does "
                "not depend on how many threads the machine happens to have."
            ),
            "random_state": "42, fixed explicitly so the fit is reproducible.",
            "n_jobs": "-1, all cores. With deterministic=True this cannot change the result.",
        }

    def to_dict(self) -> dict[str, Any]:
        import lightgbm

        params = asdict(self)
        return {
            "model": "lightgbm",
            "library": "lightgbm",
            "estimator": "lightgbm.LGBMClassifier",
            "library_version": lightgbm.__version__,
            "parameters": params,
            "class_handling": {
                "strategy": "balanced per-row sample weights",
                "note": SAMPLE_WEIGHT_NOTE,
            },
            "model_selection": {
                "performed": False,
                "test_partitions_used_for_selection": False,
                "note": MODEL_SELECTION_NOTE,
            },
            "deviations_from_library_defaults": self.deviations_from_library_defaults(),
            "tuned": False,
            "search_performed": False,
        }


GBDT_CONFIGS: dict[str, Any] = {"xgb": XGBConfig(), "lgbm": LGBMConfig()}
GBDT_LABELS: dict[str, str] = {"xgb": "XGBoost", "lgbm": "LightGBM"}


def build_gbdt_pipeline(model: str, features: Sequence[str]) -> Pipeline:
    """Imputer + booster, in that order, as one fitted-on-train unit.

    The imputer is the same one the Random Forest baseline uses, on purpose.
    Both boosting libraries can route missing values to a default direction
    natively, and that would arguably be the better model, but it would also
    make preprocessing differ between the models being compared. Fairness
    first: the two libraries differ in their trees, not in their preprocessing.
    """
    return Pipeline(
        [("imputer", SimpleImputer(strategy=IMPUTER_STRATEGY)), ("classifier", GBDT_CONFIGS[model].estimator())]
    )


def gbdt_imputation_note() -> str:
    return (
        "SimpleImputer(strategy='median') is the first step of the fitted sklearn "
        "Pipeline, fitted by Pipeline.fit on the 98 training wells only. The median is "
        "one number per curve over 1,170,511 training rows and is recorded in the "
        "training config. No interpolation, no neighbouring depth rows, no per-well "
        "statistic, no statistic from either evaluation partition. The stored dataset is "
        "not modified: it keeps its empty cells and its 0/1 missingness masks, and the "
        "imputation happens in memory at fit time. The five masks are preserved in the "
        "table and measured in the ablation; they are not in the primary comparison."
    )


def balanced_sample_weights(y: np.ndarray, class_count: int) -> np.ndarray:
    """w_c = n / (K * count_c), from the training partition's counts only.

    Raises rather than filling a missing class with a weight: a class with no
    training rows cannot be balanced, and inventing a weight for it would be
    exactly the silent removal this stage is forbidden to do.
    """
    counts = np.bincount(np.asarray(y, dtype=np.int64), minlength=class_count)
    if counts.size != class_count:
        raise ValueError(f"label vector spans {counts.size} slots, expected {class_count}")
    empty = np.flatnonzero(counts == 0)
    if empty.size:
        raise ValueError(
            f"class(es) {empty.tolist()} have no rows in the fitting partition. A "
            "balanced weight cannot be computed for a class with no rows, and this "
            "stage does not drop or merge classes to make one."
        )
    per_class = y.size / (class_count * counts.astype(np.float64))
    return per_class[np.asarray(y, dtype=np.int64)]


def booster_output_width(model: Any) -> int:
    """How many classes the fitted booster actually emits.

    Branched on what the estimator is, not on a name passed in by a caller. A
    name is easy to get wrong -- callers hold both a key ("xgb") and a label
    ("XGBoost"), and passing the wrong one silently took the other library's
    attribute. The estimator is unambiguous.
    """
    if hasattr(model, "get_booster"):
        # Read the width off the booster's own configuration, so the check is
        # about what the model emits and not about what the wrapper reports.
        parameters = json.loads(model.get_booster().save_config())["learner"]["learner_model_param"]
        return int(parameters["num_class"])
    if hasattr(model, "booster_"):
        return int(model.booster_.num_model_per_iteration())
    raise ValueError(
        f"{type(model).__name__} is not a fitted XGBoost or LightGBM estimator, so its "
        "output width cannot be checked"
    )


def assert_twelve_classes(model: Any, model_name: str) -> dict[str, Any]:
    """The fitted booster must carry all 12 classes, not the ones it happened to see.

    Checked against the estimator rather than assumed, because a library that
    infers its output width from the training labels would otherwise quietly
    produce an 11-class model if a rare class ever went missing.
    """
    classes = [int(value) for value in getattr(model, "classes_", [])]
    declared = [entry["encoded_id"] for entry in class_table()]
    if classes != declared:
        raise ValueError(
            f"{model_name} fitted {len(classes)} classes {classes}, expected the 12 "
            f"declared classes {declared}. A class was dropped or renumbered."
        )
    if int(getattr(model, "n_classes_", -1)) != len(declared):
        raise ValueError(
            f"{model_name} reports n_classes_={getattr(model, 'n_classes_', None)}, "
            f"expected {len(declared)}"
        )
    width = booster_output_width(model)
    if width != len(declared):
        raise ValueError(f"{model_name} booster emits {width} classes, expected {len(declared)}")
    return {"classes_in": len(classes), "classes_out": int(width), "classes": classes}


def feature_importance(model: Any, model_name: str, features: Sequence[str]) -> list[dict[str, Any]]:
    """Per-feature importance, gain and split count, in the feature order given.

    Gain is the library's own total loss reduction attributed to a feature and
    split count is how many splits used it. Neither is a statement about
    geology, and neither is comparable across libraries as a number: they are
    reported side by side so the *pattern* can be compared, not ranked.
    """
    if hasattr(model, "get_booster"):
        booster = model.get_booster()
        gain = booster.get_score(importance_type="gain")
        weight = booster.get_score(importance_type="weight")
        pairs = [
            (feature, float(gain.get(f"f{index}", 0.0)), float(weight.get(f"f{index}", 0.0)))
            for index, feature in enumerate(features)
        ]
    else:
        booster = model.booster_
        gains = booster.feature_importance(importance_type="gain")
        weights = booster.feature_importance(importance_type="split")
        pairs = [
            (feature, float(gains[index]), float(weights[index]))
            for index, feature in enumerate(features)
        ]
    total_gain = sum(value for _, value, _ in pairs)
    total_weight = sum(value for _, _, value in pairs)
    return [
        {
            "feature": feature,
            "gain": round(gain, 8),
            "gain_share": round(gain / total_gain, 6) if total_gain > 0 else None,
            "splits": int(weight),
            "split_share": round(weight / total_weight, 6) if total_weight > 0 else None,
        }
        for feature, gain, weight in pairs
    ]


def gbdt_environment_facts() -> dict[str, Any]:
    """The shared environment plus both boosting libraries.

    Kept separate from `environment_facts` so the Random Forest report's
    recorded environment does not change when this stage is added: that report
    is a committed artifact and must keep matching its own verification.
    """
    import lightgbm
    import xgboost

    facts = environment_facts()
    facts["xgboost"] = xgboost.__version__
    facts["lightgbm"] = lightgbm.__version__
    return facts


def read_rf_report() -> dict:
    return json.loads(REPORT_JSON.read_text(encoding="utf-8"))


def read_gbdt_report() -> dict:
    return json.loads(GBDT_REPORT_JSON.read_text(encoding="utf-8"))


def train_class_support(y: np.ndarray, class_count: int) -> dict[int, int]:
    counts = np.bincount(np.asarray(y, dtype=np.int64), minlength=class_count)
    return {index: int(counts[index]) for index in range(class_count)}
