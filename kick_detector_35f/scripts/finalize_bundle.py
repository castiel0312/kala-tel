"""
finalize_bundle.py
------------------
One-time packaging step: rewrite the artifact metadata for release.

Two things change relative to the training artifact:

1. ``threshold_rule`` is corrected. The training artifact described the rule as
   "highest threshold with zero false-alarm episodes", but the selector
   actually maximises the detection rate among thresholds with zero
   false-alarm episodes, breaking ties by median detection delay and then by
   the lower threshold. The corrected string states the implemented rule.
2. ``seconds_per_sample`` and a provenance block are added, so consumers can
   convert sample indices to seconds without re-deriving the sample rate.

Model weights and feature configuration are copied through untouched.
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve()
# .parents[0]=scripts  .parents[1]=kick_detector_35f  .parents[2]=project root
sys.path.insert(0, str(HERE.parents[2] / "src"))

import joblib

import ensemble  # noqa: F401  (register the class for unpickling)

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / "artifacts" / "models.joblib"
DST = ROOT / "model" / "kick_detector_35f.joblib"

# DataDRILL: 2336 samples over 14 minutes.
SPS = 14 * 60 / 2336

CORRECTED_RULE = (
    "Highest detection rate among thresholds with zero false-alarm ALARM "
    "EPISODES on the 240-event physical stress grid and on the real healthy "
    "period; ties broken by lower median detection delay, then by the lower "
    "threshold. Episodes, not samples: consecutive crossings within 10 samples "
    "count as one operator-visible alarm."
)

bundle = joblib.load(SRC)

old = bundle.get("threshold_rule")
bundle["threshold_rule"] = CORRECTED_RULE
bundle["seconds_per_sample"] = SPS
bundle["package"] = "kickdet"
bundle["package_version"] = "1.0.0"
bundle["notes"] = {
    "threshold_rule_corrected": old != CORRECTED_RULE,
    "previous_threshold_rule": old,
    "critical_limitation": (
        "Fitted and evaluated on a single simulated kick event from the "
        "DataDRILL release. Accuracy figures on that run are in-sample and are "
        "NOT a generalisation estimate. See MODEL_CARD.md."
    ),
}

DST.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(bundle, DST, compress=3)

reloaded = joblib.load(DST)
assert reloaded["feature_names"] == bundle["feature_names"]
assert reloaded["alarm_threshold"] == bundle["alarm_threshold"]
assert reloaded["threshold_rule"] == CORRECTED_RULE

print("wrote", DST)
print("  size          :", f"{DST.stat().st_size/1024:.1f} KB")
print("  features      :", len(reloaded["feature_names"]))
print("  threshold     :", reloaded["alarm_threshold"])
print("  seconds/sample:", SPS)
print("  rule corrected:", old != CORRECTED_RULE)
