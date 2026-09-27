"""
ensemble.py
-----------
A deliberately boring ensemble: the unweighted mean of several already-calibrated
member probabilities.

Why unweighted, and not a learned stack?
-----------------------------------------
Stacking would fit combiner weights on out-of-fold predictions. This dataset
contains exactly ONE kick, so there is exactly one transition. Weights fitted
against a single transition are not generalising weights, they are memorised
coordinates of that one event, and the fitted values would carry a confidence
the evidence does not support. An equal-weight average has no free parameter to
overfit and is the correct default at this sample size.

The members are calibrated individually (see `_calibrated` in 03_train.py) before
averaging. Averaging uncalibrated boosters is a known way to produce a score that
is well ranked but unscaled, which is exactly the failure that made raw XGBoost
score ROC-AUC 0.97 with F1 0.28 at the 0.5 alarm threshold.

This lives in its own module so that a serialised artifact can be unpickled later
without importing the training script.
"""

from __future__ import annotations

import numpy as np


class MeanEnsemble:
    """Equal-weight probability average over already-calibrated members."""

    def __init__(self, members: dict[str, object], weights: dict[str, float] | None = None):
        if not members:
            raise ValueError("MeanEnsemble needs at least one member")
        self.members = members
        if weights is None:
            weights = {k: 1.0 for k in members}
        missing = set(members) - set(weights)
        if missing:
            raise ValueError(f"missing weights for {missing}")
        self.weights = weights

    def fit(self, X, y=None):
        for m in self.members.values():
            m.fit(X, y)
        self.n_features_in_ = np.asarray(X).shape[1]
        return self

    def predict_proba(self, X) -> np.ndarray:
        tot_w = 0.0
        acc = np.zeros(len(np.asarray(X)))
        for name, m in self.members.items():
            acc += self.weights[name] * m.predict_proba(X)[:, 1]
            tot_w += self.weights[name]
        p = acc / tot_w
        return np.column_stack([1.0 - p, p])

    def predict(self, X) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)
