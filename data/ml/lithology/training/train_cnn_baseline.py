#!/usr/bin/env python3
"""Stage 6: 1D CNN baseline on FORCE 2020 lithology with A1 log features.

The scientific question: can a sequence/depth-aware neural model exploit local
vertical well-log patterns better than the tree-based RF A1 baseline?

This is NOT a hyperparameter sweep. This is ONE clean, reproducible baseline
1D CNN experiment, measured against the established RF A1 / XGB A1 / LGBM A1
results.

What is held fixed
------------------
* The 98 / 10 / 10 well split from the source's own manifest, unchanged
* The A1 feature set: exactly 10 log curves, no masks, no depth, no coordinates
* The target: the 12-class FORCE_2020_LITHOFACIES_LITHOLOGY encoding
* Well-disjoint evaluation: no well appears in both train and test
* The metric functions and the published penalty matrix, imported not rewritten
* The leakage guards and the forbidden-column list

What differs
------------
* The model: 1D CNN instead of tree-based ensemble
* The input: fixed-length depth sequences instead of independent rows
* Validation split: 88 train / 10 validation wells (from the 98 training wells)

Usage:
    python data/ml/lithology/training/train_cnn_baseline.py
    python data/ml/lithology/training/train_cnn_baseline.py --verify
    python data/ml/lithology/training/train_cnn_baseline.py --print-summary
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "data" / "ml" / "common"))

import force2020_lithology as shared  # noqa: E402

REPORT_JSON = REPO_ROOT / "reports" / "force2020_cnn_baseline.json"
REPORT_MD = REPO_ROOT / "reports" / "force2020_cnn_baseline.md"
CACHE_DIR = REPO_ROOT / "data" / "interim" / "ml" / "force2020_litho" / "cnn_baseline_cache"

EXPERIMENT_ID = "force2020-litho-cnn-a1"
ARTIFACT_STEM = "force2020_litho_cnn_a1"
STAGE = "modelling / 1D CNN baseline on A1"

FEATURE_VERSION = "v0.2"

# ---------------------------------------------------------------------------
# CNN Configuration - Fixed baseline, not searched
# ---------------------------------------------------------------------------
SEQUENCE_LENGTH = 21  # ~3.2m depth window (21 * 0.152m ≈ 3.2m)
STRIDE = 1  # Dense predictions
CENTER_TARGET = True  # Predict center row of sequence

# Network architecture
CNN_CONFIG = {
    "architecture": "1D CNN with 3 convolutional blocks",
    "input_shape": [SEQUENCE_LENGTH, 10],  # [sequence_length, n_features]
    "conv1_channels": 32,
    "conv1_kernel": 5,
    "conv2_channels": 64,
    "conv2_kernel": 3,
    "conv3_channels": 128,
    "conv3_kernel": 3,
    "pool_size": 2,
    "dropout": 0.3,
    "dense_units": 128,
    "output_classes": 12,
}

# Training configuration
TRAIN_CONFIG = {
    "epochs": 50,
    "batch_size": 256,
    "learning_rate": 0.001,
    "optimizer": "Adam",
    "weight_decay": 1e-5,
    "random_seed": 42,
    "validation_wells": 10,  # From the 98 training wells
    "early_stopping_patience": 10,
    "early_stopping_min_delta": 0.001,
}

RANDOM_SEED = TRAIN_CONFIG["random_seed"]


# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
def set_random_seeds(seed: int) -> None:
    """Set all random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    # Make PyTorch deterministic (may reduce performance)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


# ---------------------------------------------------------------------------
# Sequence Construction
# ---------------------------------------------------------------------------
class WellLogSequenceDataset(Dataset):
    """PyTorch Dataset for well-log sequences.

    Constructs fixed-length sliding windows within each well, never crossing
    well boundaries. Target is the center row of the sequence.

    Missing values are imputed with train-derived medians.
    """

    def __init__(
        self,
        frame: Any,
        wells: Sequence[str],
        features: Sequence[str],
        sequence_length: int,
        stride: int,
        medians: dict[str, float] | None = None,
        fit_medians: bool = False,
    ):
        self.features = list(features)
        self.sequence_length = sequence_length
        self.stride = stride
        self.n_features = len(features)

        # Imputation: compute or use provided medians
        if fit_medians:
            # Compute medians from this dataset (training wells only)
            self.medians = {}
            for feature in features:
                self.medians[feature] = float(frame[feature].median())
        elif medians is not None:
            self.medians = medians
        else:
            raise ValueError("must provide medians or set fit_medians=True")

        # Build sequences well by well
        self.sequences = []
        self.targets = []
        self.well_ids = []

        for well in wells:
            well_data = frame[frame[shared.WELL] == well].sort_values(shared.DEPTH)
            if len(well_data) < sequence_length:
                # Skip wells too short for a single sequence
                continue

            # Extract features and impute
            X_well = well_data[self.features].values.astype(np.float32)
            for col_idx, feature in enumerate(features):
                mask = np.isnan(X_well[:, col_idx])
                X_well[mask, col_idx] = self.medians[feature]

            # Extract targets
            y_well = well_data[shared.TARGET].values.astype(np.int64)

            # Create sliding windows
            center_offset = sequence_length // 2
            for i in range(0, len(X_well) - sequence_length + 1, stride):
                seq = X_well[i : i + sequence_length]
                target_idx = i + center_offset
                target = y_well[target_idx]

                self.sequences.append(seq)
                self.targets.append(target)
                self.well_ids.append(well)

        self.sequences = np.array(self.sequences, dtype=np.float32)
        self.targets = np.array(self.targets, dtype=np.int64)

    def __len__(self) -> int:
        return len(self.sequences)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        # Return [sequence_length, n_features] and scalar target
        return (
            torch.from_numpy(self.sequences[idx]),
            torch.tensor(self.targets[idx], dtype=torch.long),
        )


# ---------------------------------------------------------------------------
# 1D CNN Model
# ---------------------------------------------------------------------------
class LithologyCNN(nn.Module):
    """1D CNN for lithology classification from depth-ordered log sequences."""

    def __init__(self, config: dict[str, Any]):
        super().__init__()
        self.config = config

        # Conv block 1
        self.conv1 = nn.Conv1d(
            in_channels=config["input_shape"][1],  # n_features
            out_channels=config["conv1_channels"],
            kernel_size=config["conv1_kernel"],
            padding=config["conv1_kernel"] // 2,
        )
        self.bn1 = nn.BatchNorm1d(config["conv1_channels"])

        # Conv block 2
        self.conv2 = nn.Conv1d(
            in_channels=config["conv1_channels"],
            out_channels=config["conv2_channels"],
            kernel_size=config["conv2_kernel"],
            padding=config["conv2_kernel"] // 2,
        )
        self.bn2 = nn.BatchNorm1d(config["conv2_channels"])

        # Conv block 3
        self.conv3 = nn.Conv1d(
            in_channels=config["conv2_channels"],
            out_channels=config["conv3_channels"],
            kernel_size=config["conv3_kernel"],
            padding=config["conv3_kernel"] // 2,
        )
        self.bn3 = nn.BatchNorm1d(config["conv3_channels"])

        # Pool
        self.pool = nn.MaxPool1d(kernel_size=config["pool_size"])

        # Dense layers (after global average pooling, we just have channels dimension)
        self.dropout = nn.Dropout(config["dropout"])
        self.fc1 = nn.Linear(config["conv3_channels"], config["dense_units"])
        self.fc2 = nn.Linear(config["dense_units"], config["output_classes"])

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Input: [batch, sequence_length, n_features]
        # Conv1d expects: [batch, channels, sequence]
        x = x.transpose(1, 2)  # [batch, n_features, sequence_length]

        # Conv block 1
        x = self.conv1(x)
        x = self.bn1(x)
        x = F.relu(x)
        x = self.pool(x)

        # Conv block 2
        x = self.conv2(x)
        x = self.bn2(x)
        x = F.relu(x)
        x = self.pool(x)

        # Conv block 3
        x = self.conv3(x)
        x = self.bn3(x)
        x = F.relu(x)

        # Global average pooling + flatten
        x = F.adaptive_avg_pool1d(x, 1).squeeze(-1)  # [batch, channels]

        # Dense layers
        x = self.dropout(x)
        x = self.fc1(x)
        x = F.relu(x)
        x = self.dropout(x)
        x = self.fc2(x)

        return x

    def count_parameters(self) -> int:
        """Count trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
def compute_class_weights(y_train: np.ndarray, n_classes: int) -> torch.Tensor:
    """Compute balanced class weights from training targets."""
    class_counts = np.bincount(y_train, minlength=n_classes)
    # Avoid division by zero for any absent class
    class_counts = np.maximum(class_counts, 1)
    weights = len(y_train) / (n_classes * class_counts)
    return torch.tensor(weights, dtype=torch.float32)


def train_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> tuple[float, float]:
    """Train for one epoch. Returns (loss, accuracy)."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for sequences, targets in loader:
        sequences = sequences.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        outputs = model(sequences)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * len(targets)
        _, predicted = outputs.max(1)
        correct += (predicted == targets).sum().item()
        total += len(targets)

    return total_loss / total, correct / total


def evaluate_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float]:
    """Evaluate for one epoch. Returns (loss, accuracy)."""
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for sequences, targets in loader:
            sequences = sequences.to(device)
            targets = targets.to(device)

            outputs = model(sequences)
            loss = criterion(outputs, targets)

            total_loss += loss.item() * len(targets)
            _, predicted = outputs.max(1)
            correct += (predicted == targets).sum().item()
            total += len(targets)

    return total_loss / total, correct / total


def predict_well_sequences(
    model: nn.Module,
    dataset: WellLogSequenceDataset,
    device: torch.device,
    batch_size: int,
) -> np.ndarray:
    """Predict all sequences in dataset."""
    model.eval()
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False)
    predictions = []

    with torch.no_grad():
        for sequences, _ in loader:
            sequences = sequences.to(device)
            outputs = model(sequences)
            _, predicted = outputs.max(1)
            predictions.append(predicted.cpu().numpy())

    return np.concatenate(predictions)


# ---------------------------------------------------------------------------
# Evaluation on full test wells
# ---------------------------------------------------------------------------
def evaluate_test_partition(
    model: nn.Module,
    frame: Any,
    wells: Sequence[str],
    features: Sequence[str],
    medians: dict[str, float],
    split: str,
    classes: Sequence[int],
    lookup: dict[int, str],
    matrix: Sequence[Sequence[float]],
    index_map: dict[int, int],
    device: torch.device,
) -> dict[str, Any]:
    """Evaluate model on a test partition, predicting center-target sequences."""
    # Create dataset for this partition
    dataset = WellLogSequenceDataset(
        frame=frame,
        wells=wells,
        features=features,
        sequence_length=SEQUENCE_LENGTH,
        stride=STRIDE,
        medians=medians,
        fit_medians=False,
    )

    # Predict
    y_pred = predict_well_sequences(model, dataset, device, batch_size=256)
    y_true = dataset.targets

    # Compute metrics
    per_class = shared.per_class_metrics(y_true, y_pred, classes, lookup)
    counts, table = shared.confusion_frame(y_true, y_pred, classes, lookup)

    return {
        "split": split,
        "rows": int(len(y_true)),
        "wells": len(wells),
        "sequences_evaluated": int(len(y_true)),
        "aggregate": shared.aggregate_metrics(
            y_true, y_pred, classes, int(len(y_true)), len(wells), per_class
        ),
        "per_class": per_class,
        "penalty": shared.penalty_metrics(y_true, y_pred, matrix, index_map),
        "confusion_matrix": {
            "row_meaning": "true class",
            "column_meaning": "predicted class",
            "labels": [lookup[int(value)] for value in classes],
            "counts": counts.tolist(),
            "cells": table,
        },
    }


# ---------------------------------------------------------------------------
# Main training function
# ---------------------------------------------------------------------------
def train_cnn_baseline() -> dict[str, Any]:
    """Train the 1D CNN baseline and evaluate on hidden_test and leaderboard_test."""
    set_random_seeds(RANDOM_SEED)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Load data
    spec = shared.feature_set(FEATURE_VERSION)
    features = list(spec["curves"])
    shared.assert_logs_only(features, allow=spec["added_relative_to_v0_1"])

    frame = shared.load_dataset(
        columns=[shared.WELL, shared.DEPTH, shared.SPLIT, shared.TARGET, *features],
        path=spec["table"],
    )

    # Load well split
    split_manifest = shared.read_split_manifest()
    train_wells_all = sorted(split_manifest[split_manifest[shared.SPLIT] == shared.TRAIN_SPLIT][shared.WELL].tolist())
    hidden_wells = sorted(split_manifest[split_manifest[shared.SPLIT] == "hidden_test"][shared.WELL].tolist())
    leader_wells = sorted(split_manifest[split_manifest[shared.SPLIT] == "leaderboard_test"][shared.WELL].tolist())

    # Split training wells into train/validation (well-disjoint)
    n_val_wells = TRAIN_CONFIG["validation_wells"]
    set_random_seeds(RANDOM_SEED)  # Ensure reproducible split
    val_wells = sorted(random.sample(train_wells_all, n_val_wells))
    train_wells = sorted([w for w in train_wells_all if w not in val_wells])

    print(f"Wells: {len(train_wells)} train, {len(val_wells)} validation, {len(hidden_wells)} hidden_test, {len(leader_wells)} leaderboard_test")

    # Check leakage
    assert len(set(train_wells) & set(val_wells)) == 0, "train/val overlap"
    assert len(set(train_wells) & set(hidden_wells)) == 0, "train/hidden overlap"
    assert len(set(train_wells) & set(leader_wells)) == 0, "train/leader overlap"
    assert len(set(val_wells) & set(hidden_wells)) == 0, "val/hidden overlap"
    assert len(set(val_wells) & set(leader_wells)) == 0, "val/leader overlap"

    train_frame = frame[frame[shared.WELL].isin(train_wells)]
    val_frame = frame[frame[shared.WELL].isin(val_wells)]

    # Create datasets
    print("Creating training sequences...")
    train_dataset = WellLogSequenceDataset(
        frame=train_frame,
        wells=train_wells,
        features=features,
        sequence_length=SEQUENCE_LENGTH,
        stride=STRIDE,
        medians=None,
        fit_medians=True,
    )

    print("Creating validation sequences...")
    val_dataset = WellLogSequenceDataset(
        frame=val_frame,
        wells=val_wells,
        features=features,
        sequence_length=SEQUENCE_LENGTH,
        stride=STRIDE,
        medians=train_dataset.medians,
        fit_medians=False,
    )

    print(f"Train sequences: {len(train_dataset)}, Validation sequences: {len(val_dataset)}")

    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=TRAIN_CONFIG["batch_size"],
        shuffle=True,
        num_workers=0,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=TRAIN_CONFIG["batch_size"],
        shuffle=False,
        num_workers=0,
    )

    # Compute class weights
    class_weights = compute_class_weights(train_dataset.targets, CNN_CONFIG["output_classes"])
    class_weights = class_weights.to(device)

    # Create model
    model = LithologyCNN(CNN_CONFIG).to(device)
    n_params = model.count_parameters()
    print(f"Model parameters: {n_params:,}")

    # Loss and optimizer
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=TRAIN_CONFIG["learning_rate"],
        weight_decay=TRAIN_CONFIG["weight_decay"],
    )

    # Training loop with early stopping
    best_val_loss = float("inf")
    best_epoch = 0
    patience_counter = 0
    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
    }

    print(f"\nTraining for up to {TRAIN_CONFIG['epochs']} epochs...")
    for epoch in range(TRAIN_CONFIG["epochs"]):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = evaluate_epoch(model, val_loader, criterion, device)

        history["train_loss"].append(float(train_loss))
        history["train_acc"].append(float(train_acc))
        history["val_loss"].append(float(val_loss))
        history["val_acc"].append(float(val_acc))

        print(
            f"Epoch {epoch+1:3d}/{TRAIN_CONFIG['epochs']}: "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )

        # Early stopping
        if val_loss < best_val_loss - TRAIN_CONFIG["early_stopping_min_delta"]:
            best_val_loss = val_loss
            best_epoch = epoch
            patience_counter = 0
            # Save best model
            torch.save(model.state_dict(), CACHE_DIR / "best_model.pt")
        else:
            patience_counter += 1
            if patience_counter >= TRAIN_CONFIG["early_stopping_patience"]:
                print(f"Early stopping at epoch {epoch+1} (best was {best_epoch+1})")
                break

    # Load best model
    model.load_state_dict(torch.load(CACHE_DIR / "best_model.pt"))
    print(f"\nUsing model from epoch {best_epoch+1} (val_loss={best_val_loss:.4f})")

    # Evaluate on test partitions
    classes = list(range(12))
    lookup = shared.encoded_to_class_name()
    penalty_record = shared.read_penalty_matrix()
    matrix = penalty_record["matrix"]
    index_map = shared.penalty_index_map()

    print("\nEvaluating on hidden_test...")
    hidden_results = evaluate_test_partition(
        model, frame, hidden_wells, features, train_dataset.medians,
        "hidden_test", classes, lookup, matrix, index_map, device
    )

    print("\nEvaluating on leaderboard_test...")
    leader_results = evaluate_test_partition(
        model, frame, leader_wells, features, train_dataset.medians,
        "leaderboard_test", classes, lookup, matrix, index_map, device
    )

    # Build report
    report = {
        "experiment_id": EXPERIMENT_ID,
        "stage": STAGE,
        "features": {
            "version": FEATURE_VERSION,
            "curves": features,
            "count": len(features),
            "note": "A1 = 10 log curves, no masks, no depth, no coordinates",
        },
        "sequence_construction": {
            "sequence_length": SEQUENCE_LENGTH,
            "stride": STRIDE,
            "center_target": CENTER_TARGET,
            "depth_spacing_typical": 0.152,
            "physical_window_meters": round(SEQUENCE_LENGTH * 0.152, 2),
            "boundary_handling": "sequences never cross well boundaries",
            "missing_values": "imputed with train-derived medians",
            "medians": {f: round(v, 6) for f, v in train_dataset.medians.items()},
        },
        "wells": {
            "train": len(train_wells),
            "validation": len(val_wells),
            "hidden_test": len(hidden_wells),
            "leaderboard_test": len(leader_wells),
            "total": len(train_wells) + len(val_wells) + len(hidden_wells) + len(leader_wells),
            "train_wells": train_wells,
            "validation_wells": val_wells,
            "leakage_check": "0 well overlap between any partition pairs",
        },
        "model": {
            "architecture": CNN_CONFIG["architecture"],
            "config": CNN_CONFIG,
            "parameters": n_params,
        },
        "training": {
            "config": TRAIN_CONFIG,
            "device": str(device),
            "epochs_run": len(history["train_loss"]),
            "best_epoch": best_epoch + 1,
            "best_val_loss": float(best_val_loss),
            "history": history,
        },
        "results": {
            "hidden_test": hidden_results,
            "leaderboard_test": leader_results,
        },
        "headline": {
            "hidden_test": {
                "macro_f1": hidden_results["aggregate"]["macro_f1"]["value"],
                "balanced_accuracy": hidden_results["aggregate"]["balanced_accuracy"]["value"],
                "penalty_score": hidden_results["penalty"]["competition_score"],
            },
            "leaderboard_test": {
                "macro_f1": leader_results["aggregate"]["macro_f1"]["value"],
                "balanced_accuracy": leader_results["aggregate"]["balanced_accuracy"]["value"],
                "penalty_score": leader_results["penalty"]["competition_score"],
            },
        },
    }

    return report


# ---------------------------------------------------------------------------
# Report writing
# ---------------------------------------------------------------------------
def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def write_markdown_report(report: dict[str, Any]) -> None:
    """Write human-readable markdown report."""
    lines = []
    a = lines.append

    a("# FORCE 2020: 1D CNN Baseline on A1")
    a("")
    a("| | |")
    a("|---|---|")
    a(f"| stage | {report['stage']} |")
    a(f"| features | A1 = {report['features']['count']} curves |")
    a(f"| sequence length | {report['sequence_construction']['sequence_length']} rows "
      f"(~{report['sequence_construction']['physical_window_meters']}m) |")
    a(f"| model | {report['model']['architecture']} |")
    a(f"| parameters | {report['model']['parameters']:,} |")
    a("")

    a("## A. Input Features")
    a("")
    a(f"Exactly the A1 log features: {', '.join(f'`{f}`' for f in report['features']['curves'])}")
    a("")
    a("Not included: `DEPTH_MD`, coordinates, stratigraphy, target columns, masks, local-context")
    a("")

    a("## B. Sequence Construction")
    a("")
    a(f"- **Sequence length:** {report['sequence_construction']['sequence_length']} rows")
    a(f"- **Physical window:** ~{report['sequence_construction']['physical_window_meters']}m "
      f"(assuming {report['sequence_construction']['depth_spacing_typical']}m spacing)")
    a(f"- **Stride:** {report['sequence_construction']['stride']}")
    a("- **Target:** center row of sequence")
    a("- **Boundary handling:** sequences never cross well boundaries")
    a("- **Missing values:** imputed with train-derived medians")
    a("")

    a("## C. Wells and Sequences")
    a("")
    a("| partition | wells | sequences |")
    a("|---|---:|---:|")
    a(f"| train | {report['wells']['train']} | "
      f"{len(report['training']['history']['train_loss']) * len(report['training']['history']['train_loss'])} |")
    a(f"| validation | {report['wells']['validation']} | n/a |")
    a(f"| hidden_test | {report['wells']['hidden_test']} | "
      f"{report['results']['hidden_test']['sequences_evaluated']} |")
    a(f"| leaderboard_test | {report['wells']['leaderboard_test']} | "
      f"{report['results']['leaderboard_test']['sequences_evaluated']} |")
    a("")

    a("## D. CNN Architecture")
    a("")
    a("```")
    a(f"Input: [{report['model']['config']['input_shape'][0]}, {report['model']['config']['input_shape'][1]}]")
    a(f"Conv1D({report['model']['config']['conv1_channels']}, kernel={report['model']['config']['conv1_kernel']}) + BatchNorm + ReLU + MaxPool")
    a(f"Conv1D({report['model']['config']['conv2_channels']}, kernel={report['model']['config']['conv2_kernel']}) + BatchNorm + ReLU + MaxPool")
    a(f"Conv1D({report['model']['config']['conv3_channels']}, kernel={report['model']['config']['conv3_kernel']}) + BatchNorm + ReLU")
    a(f"GlobalAvgPool + Dropout({report['model']['config']['dropout']})")
    a(f"Dense({report['model']['config']['dense_units']}) + ReLU + Dropout")
    a(f"Dense({report['model']['config']['output_classes']}) -> softmax")
    a("```")
    a("")
    a(f"**Parameters:** {report['model']['parameters']:,}")
    a("")

    a("## E. Training Configuration")
    a("")
    for key, value in report['training']['config'].items():
        a(f"- **{key}:** {value}")
    a("")

    a("## F. Results")
    a("")
    a("### Macro F1 (12 classes)")
    a("")
    a("| partition | macro F1 |")
    a("|---|---:|")
    for split in ["hidden_test", "leaderboard_test"]:
        a(f"| {split} | {report['headline'][split]['macro_f1']:.4f} |")
    a("")

    a("### All Metrics")
    a("")
    a("| partition | macro F1 | balanced acc | penalty |")
    a("|---|---:|---:|---:|")
    for split in ["hidden_test", "leaderboard_test"]:
        h = report['headline'][split]
        a(f"| {split} | {h['macro_f1']:.4f} | {h['balanced_accuracy']:.4f} | {h['penalty_score']:.4f} |")
    a("")

    REPORT_MD.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print-summary", action="store_true")
    args = parser.parse_args(argv)

    if args.verify:
        # Verification: check that running produces the same report
        if not REPORT_JSON.exists():
            print("ERROR: report does not exist, run without --verify first")
            return 1
        print("Verification not implemented for CNN (requires deterministic GPU)")
        return 0

    if args.print_summary:
        if not REPORT_JSON.exists():
            print("ERROR: report does not exist")
            return 1
        report = json.loads(REPORT_JSON.read_text(encoding="utf-8"))
        print(f"CNN A1 hidden_test macro F1: {report['headline']['hidden_test']['macro_f1']:.4f}")
        print(f"CNN A1 leaderboard_test macro F1: {report['headline']['leaderboard_test']['macro_f1']:.4f}")
        return 0

    # Train
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    report = train_cnn_baseline()

    # Write reports
    write_json(REPORT_JSON, report)
    write_markdown_report(report)

    print(f"\nwrote {REPORT_JSON.relative_to(REPO_ROOT)}")
    print(f"wrote {REPORT_MD.relative_to(REPO_ROOT)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
