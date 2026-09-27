"""
detector.py
-----------
Load the serialised kick detector and score drilling data.

Unpickling portability
----------------------
The artifact was pickled when the training project had ``ensemble.py`` on
``sys.path``, so the pickle stream records the class as
``ensemble.MeanEnsemble``. Loading it requires that the name ``ensemble``
resolve at unpickle time. Rather than asking users to manipulate ``sys.path``,
``load()`` registers an alias in ``sys.modules`` *before* calling
``joblib.load``. This is the difference between the artifact being
self-contained and requiring the original repository layout.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

# The artifact references these third-party classes; import them up front so a
# missing dependency produces a clear error here rather than an opaque
# "Can't get attribute" failure deep inside pickle.
import joblib
import lightgbm  # noqa: F401
from catboost import CatBoostClassifier  # noqa: F401
from sklearn.calibration import CalibratedClassifierCV  # noqa: F401
from sklearn.pipeline import Pipeline  # noqa: F401

from . import ensemble as _ensemble
from . import features as _features
from .episodes import EPISODE_GAP, alarm_episodes, episode_starts

__all__ = ["KickDetector", "DetectorReport", "load"]

# Recorded at build time. A mismatch is a warning, not a hard failure: sklearn
# and the boosters can move, but predictions may shift. `verify.py` checks
# numerical parity.
BUILD_VERSIONS = {
    "python": "3.13.2",
    "scikit-learn": "1.9.0",
    "numpy": "2.2.4",
    "pandas": "2.2.3",
    "catboost": "1.2.10",
    "lightgbm": "4.7.0",
    "joblib": "1.6.0",
}


def _register_legacy_module_alias() -> None:
    """Make top-level ``import ensemble`` resolve to :mod:`kickdet.ensemble`.

    ``pickle`` resolves a class by importing its recorded module and then
    getattr-ing the class. Pre-registering the alias in ``sys.modules`` makes
    that import succeed without touching ``sys.path``.
    """
    sys.modules.setdefault("ensemble", _ensemble)


@dataclass
class DetectorReport:
    """Result of scoring one drilling run."""

    probability: np.ndarray          # per-sample kick probability
    alarm: np.ndarray                # bool, probability >= threshold
    alarm_episodes: int              # distinct operator-visible alarms
    first_alarm_index: int | None    # aligned index, None if no alarm
    first_alarm_seconds_after_onset: float | None
    max_probability_before_onset: float
    onset_index: int | None
    threshold: float
    n_features: int
    n_samples: int

    def summary(self) -> str:
        lines = [
            f"samples scored          : {self.n_samples}",
            f"features                : {self.n_features}",
            f"alarm threshold         : {self.threshold:.2f}",
            f"alarm episodes          : {self.alarm_episodes}",
        ]
        if self.onset_index is not None:
            lines.append(
                f"peak pre-onset prob     : "
                f"{self.max_probability_before_onset:.4f}")
        if self.first_alarm_index is None:
            lines.append("first alarm            : none")
        else:
            when = (f"{self.first_alarm_seconds_after_onset:+.1f} s relative to "
                    f"onset" if self.onset_index is not None
                    else f"index {self.first_alarm_index}")
            lines.append(f"first alarm            : {when}")
        return "\n".join(lines)


class KickDetector:
    """
    The deployed 35-feature kick detector.

    Typical use::

        det = KickDetector.load("model/kick_detector_35f.joblib")
        det.fit_baseline(csv)          # optional, see below
        report = det.score(csv, onset_index=...)
        print(report.summary())

    Warm-up and per-run normalisation
    ---------------------------------
    Rolling features need history, so the first ``WARMUP`` samples are consumed
    and the returned series is ``WARMUP`` rows shorter than the input. Indices in
    the report refer to that aligned frame; use :meth:`to_source_index` to map
    back. The ``_z*`` features are deviations from each run's own trailing
    baseline, so no cross-run scaling constant is baked into the model.
    """

    def __init__(self, bundle: dict):
        self.bundle = bundle
        self.model = bundle["model"]
        self.feature_names: list[str] = list(bundle["feature_names"])
        self.feature_config: dict = dict(bundle["feature_config"])
        self.threshold: float = float(bundle["alarm_threshold"])
        self.warmup: int = int(bundle.get("warmup", _features.WARMUP))
        self.required_columns: list[str] = list(
            bundle.get("required_columns", _features.PRIMARY_CHANNELS))
        self.banned_columns: list[str] = list(bundle.get("banned_columns", []))
        self.metadata = {
            k: v for k, v in bundle.items()
            if k not in ("model", "feature_names", "feature_config")
        }
        self._baseline: dict | None = None

    # ------------------------------------------------------------------ load
    @classmethod
    def load(cls, path: str | Path) -> "KickDetector":
        """Load a serialized bundle. Verifies the feature set is self-consistent."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(
                f"model artifact not found: {path}\n"
                f"Expected layout: model/kick_detector_35f.joblib")
        _register_legacy_module_alias()
        bundle = joblib.load(path)
        det = cls(bundle)
        det._assert_self_consistent()
        return det

    def _assert_self_consistent(self) -> None:
        """Catch a bundle whose feature list and config disagree."""
        cfg_only = self.feature_config.get("only")
        if cfg_only is not None and list(cfg_only) != self.feature_names:
            raise ValueError(
                "bundle is inconsistent: feature_config['only'] does not match "
                "feature_names. Refusing to score, because the estimators were "
                "fitted on one column order and this would feed them another.")
        missing = [c for c in self.required_columns if c not in _features.PRIMARY_CHANNELS
                   and c not in _features.OPTIONAL_CHANNELS]
        if missing:
            raise ValueError(f"unknown required channel(s): {missing}")

    # ------------------------------------------------------------------ build
    def build_matrix(self, df: pd.DataFrame) -> pd.DataFrame:
        """Build the exact matrix the estimators were fitted on."""
        missing = [c for c in self.required_columns if c not in df.columns]
        if missing:
            raise KeyError(
                f"input is missing required column(s): {missing}\n"
                f"Required: {self.required_columns}")
        X, names = _features.build_features(df, **self.feature_config)
        if names != self.feature_names:
            raise ValueError(
                "feature construction did not reproduce the fitted column order")
        return X

    def score(self,
              df: pd.DataFrame,
              onset_index: int | None = None,
              onset_frame: str = "source",
              episode_gap: int = EPISODE_GAP) -> DetectorReport:
        """
        Score a drilling run.

        Parameters
        ----------
        df : raw DataDRILL-style frame (all 28 columns, warm-up not yet applied).
        onset_index : index of the influx onset, used **only** to split false
            alarms from true detections in the report. Omit it (or pass None) to
            run blind - detection still works, you just lose the
            before/after breakdown. Prefer :func:`kickdet.onset.find_physical_onset`
            over hand-counting.
        onset_frame : which frame `onset_index` refers to.

            - ``"source"`` (default): index into `df` as given.
            - ``"aligned"``: index into the frame after the warm-up cut.

            The distinction is 60 samples (~22 s) here. Getting it wrong shifts
            every reported latency by that amount, so it is explicit.
        episode_gap : crossings within this many samples count as one alarm.

        Returns
        -------
        DetectorReport
        """
        if onset_frame not in ("source", "aligned"):
            raise ValueError("onset_frame must be 'source' or 'aligned'")

        X = self.build_matrix(df)
        p = self.model.predict_proba(X.to_numpy())[:, 1]
        alarm = p >= self.threshold

        # Translate the onset into the aligned frame that the probabilities use.
        if onset_index is None:
            t_aligned = None
        elif onset_frame == "source":
            t_aligned = int(onset_index) - self.warmup
        else:
            t_aligned = int(onset_index)
        if t_aligned is not None and not (0 <= t_aligned <= len(p)):
            t_aligned = None

        n_ep = (0 if t_aligned is None
                else alarm_episodes(p, t_aligned, self.threshold, episode_gap))
        pre_max = (0.0 if t_aligned is None or t_aligned <= 0
                   else float(p[:t_aligned].max()))

        first = int(episode_starts(p, self.threshold, episode_gap)[0]) \
            if alarm.any() else None
        dt = (None if (first is None or t_aligned is None)
              else (first - t_aligned) * self.seconds_per_sample())

        return DetectorReport(
            probability=p,
            alarm=alarm,
            alarm_episodes=n_ep,
            first_alarm_index=first,
            first_alarm_seconds_after_onset=dt,
            max_probability_before_onset=pre_max,
            onset_index=t_aligned,
            threshold=self.threshold,
            n_features=len(self.feature_names),
            n_samples=len(p),
        )

    # ----------------------------------------------------------------- helpers
    def seconds_per_sample(self) -> float:
        """Sample interval in seconds, from the recorded series duration."""
        dur = self.metadata.get("seconds_per_sample")
        return float(dur) if dur else 0.36  # DataDRILL: 2336 samples / 14 min

    def to_source_index(self, aligned_index: int) -> int:
        """Map an index in the aligned frame back to the input frame."""
        return int(aligned_index) + self.warmup

    def fit_baseline(self, csv_path: str | Path) -> pd.DataFrame:
        """
        Load a run and store it for downstream use (e.g. a per-well baseline).

        The `_z*` features already normalise against each run's own trailing
        history, so a global baseline fit is not required for scoring. This
        helper exists so callers who want to inspect healthy-period statistics
        can do so without re-reading the file.
        """
        df = pd.read_csv(csv_path)
        self._baseline = df
        return df

    def feature_dictionary(self) -> pd.DataFrame:
        """Per-feature dictionary: parent DataDRILL column, operation, meaning."""
        return _features.feature_dictionary(self.feature_names)

    def environment_report(self) -> pd.DataFrame:
        """Build-time vs current library versions."""
        import sklearn
        rows = [{"package": "python",
                 "build": BUILD_VERSIONS["python"],
                 "current": ".".join(map(str, sys.version_info[:3]))}]
        for mod, key in ((sklearn, "scikit-learn"), (np, "numpy"),
                         (pd, "pandas"), (lightgbm, "lightgbm"), (joblib, "joblib")):
            rows.append({"package": key,
                         "build": BUILD_VERSIONS[key],
                         "current": getattr(mod, "__version__", "unknown")})
        try:
            import catboost
            rows.append({"package": "catboost",
                         "build": BUILD_VERSIONS["catboost"],
                         "current": catboost.__version__})
        except Exception:
            pass
        return pd.DataFrame(rows)


def load(path: str | Path = "model/kick_detector_35f.joblib") -> KickDetector:
    """Convenience loader: ``from kickdet import load``."""
    return KickDetector.load(path)
