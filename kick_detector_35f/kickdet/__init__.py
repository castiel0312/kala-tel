"""
kickdet
-------
Portable 35-feature DataDRILL kick detector.

Quick start::

    from kickdet import KickDetector
    det = KickDetector.load("model/kick_detector_35f.joblib")
    report = det.score(df)                  # onset auto-detected
    print(report.summary())

See ``README.md`` for scope and limitations. The single most important one:
this model was fitted and evaluated on ONE simulated kick, so its reported
accuracy is not a generalisation estimate.
"""

from __future__ import annotations

from .columns import ALL_COLUMNS, BANNED, DEAD, PRIMARY_CHANNELS, TARGET
from .detector import DetectorReport, KickDetector, load
from .episodes import EPISODE_GAP, alarm_episodes, episode_starts, sustained_alarm
from .features import WARMUP, build_features, feature_dictionary
from .onset import find_physical_onset, flow_imbalance

__version__ = "1.0.0"

__all__ = [
    "KickDetector",
    "DetectorReport",
    "load",
    "build_features",
    "feature_dictionary",
    "find_physical_onset",
    "flow_imbalance",
    "alarm_episodes",
    "episode_starts",
    "sustained_alarm",
    "WARMUP",
    "EPISODE_GAP",
    "PRIMARY_CHANNELS",
    "ALL_COLUMNS",
    "BANNED",
    "DEAD",
    "TARGET",
    "__version__",
]
