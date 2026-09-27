"""
onset.py
--------
Locate the influx onset in a drilling run.

Why this exists
---------------
`KickDetector.score()` takes an onset index so it can separate false alarms from
true detections. Supplying that index by hand is a footgun: features consume a
60-sample warm-up, so the same event sits at a different index in the raw frame
and in the aligned frame. Getting it wrong silently shifts every "seconds after
onset" number by ~22 s, which is exactly the kind of error that makes a result
look plausible and be wrong.

`find_physical_onset` derives the index from the data instead.

Definition (matches the training project exactly)
--------------------------------------------------
Onset is the first index at which the **flow imbalance** `FOut - FIn` leaves its
baseline band by more than 3 sigma and **never returns**. Using the imbalance
rather than `FOut` alone matters: it is the classical kick indicator and is far
less noisy than either flow, so the baseline is stable. Requiring the departure
to be *permanent* rejects the startup transient and any spike that reverts.

This is the same rule the reported latencies were computed with, so numbers
produced here are directly comparable to the published figures.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

PHYS_ONSET_SIGMA = 3.0
BASELINE_N = 1000


def permanent_onset(v: np.ndarray, base: float, sd: float,
                    thr: float = PHYS_ONSET_SIGMA) -> int:
    """
    First index at which `v` leaves the baseline band and never returns.

    Direction is inferred from the tail of the series, so a downward departure
    (a loss) is found as readily as an upward one (an influx).
    """
    if sd <= 0:
        return -1
    direction = 1.0 if float(np.mean(v[-50:])) >= base else -1.0
    d = direction * (v - base)
    # running minimum of d from the right: stays below thr*sd only after the
    # last sample that ever returns inside the band
    suffix_min = np.minimum.accumulate(d[::-1])[::-1]
    inside = suffix_min <= thr * sd
    return int(np.max(np.where(inside)[0])) if inside.any() else -1


def flow_imbalance(df: pd.DataFrame) -> np.ndarray:
    """FOut - FIn, the classical kick indicator."""
    return (df["FOut"] - df["FIn"]).to_numpy(float)


def find_physical_onset(df: pd.DataFrame,
                        warmup: int | None = None,
                        baseline_n: int = BASELINE_N,
                        sigma: float = PHYS_ONSET_SIGMA) -> int:
    """
    Return the **source-frame** index where the influx begins.

    The onset is computed on the warm-up-trimmed frame and then shifted back, so
    that the baseline window matches the one the model was developed against. On
    the shipped run this returns 1495, which is the training value of 1435 in the
    aligned frame plus the 60-sample warm-up. Computing on the untrimmed frame
    instead moves the answer by 1-2 samples, because the 1000-sample baseline then
    covers a different stretch of the run.

    Parameters
    ----------
    df : the raw input frame (warm-up not yet applied).
    warmup : leading samples consumed by the feature builder. Defaults to
        :data:`kickdet.features.WARMUP`.
    baseline_n : leading samples used to establish the healthy baseline.
    sigma : departure, in baseline sigmas, that defines the onset.
    """
    if warmup is None:
        from .features import WARMUP as warmup_
        warmup = int(warmup_)
    imb = flow_imbalance(df)
    trimmed = imb[warmup:]
    n = min(baseline_n, len(trimmed))
    idx = permanent_onset(trimmed, float(np.median(trimmed[:n])),
                          float(np.std(trimmed[:n])), sigma)
    if idx < 0:
        raise RuntimeError(
            "no permanent 3-sigma departure in the flow imbalance; the run may "
            "contain no kick, or the baseline window may be contaminated.")
    return int(idx) + int(warmup)


def label_onset(kick: np.ndarray) -> int | None:
    """First index of a positive label, or None if the run has no event."""
    hits = np.flatnonzero(np.asarray(kick) > 0)
    return int(hits[0]) if hits.size else None
