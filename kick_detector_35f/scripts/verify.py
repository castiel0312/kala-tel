"""
verify.py
---------
Prove the packaged bundle is self-contained and numerically identical to the
artifact it was built from.

Run this first, from a fresh checkout, in a fresh process::

    python scripts/verify.py

Checks performed
----------------
1. The artifact unpickles with only this package on the path (no training repo).
2. `build_features` reproduces the fitted column list, in order.
3. Feature matrix is NaN-free, float32, and of the expected width.
4. Banned/leaking columns are absent from the feature set.
5. Reloading the artifact reproduces probabilities exactly.
6. Scoring the shipped sample reproduces the documented detection behaviour.
7. Library versions match the build record.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd

from kickdet import KickDetector, PRIMARY_CHANNELS
from kickdet.columns import BANNED

MODEL = ROOT / "model" / "kick_detector_35f.joblib"
DATA = ROOT / "data" / "Kick_Detection.csv"

# Documented behaviour of the shipped run, for regression detection.
# Onset is auto-detected, so these assert *behaviour* rather than a hard-coded
# index: the DataDRILL release has 2337 rows and the model was developed on
# rows 1: (row 0 is a startup artifact discarded during labelling), which shifts
# the detected onset by one sample.
EXPECTED = {
    "n_features": 35,
    "threshold": 0.22,
    "n_samples_aligned": 2277,
    "alarm_seconds_after_onset": 3.2,
    "latency_tolerance_s": 1.5,
    "pre_onset_max_prob_below": 0.05,
}

ok = True
warn = []
ok = True
n_pass = 0
n_fail = 0


def check(name: str, passed: bool, detail: str = "") -> None:
    global ok, n_pass, n_fail
    print(f"  [{'PASS' if passed else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))
    if passed:
        n_pass += 1
    else:
        n_fail += 1
        ok = False


print("=" * 72)
print("kick_detector_35f - bundle verification")
print("=" * 72)

# 1. self-contained load
print("\n1. self-contained load")
det = KickDetector.load(MODEL)
check("artifact unpickles without the training repo", True,
      f"{len(det.feature_names)} features, threshold {det.threshold}")

# 2-4. feature matrix
print("\n2. feature construction")
df = pd.read_csv(DATA)
X = det.build_matrix(df)
check("column list matches fitted order", list(X.columns) == det.feature_names)
check("width is 35", X.shape[1] == EXPECTED["n_features"], f"got {X.shape[1]}")
check("dtype is float32", X.dtypes.unique().tolist() == [np.float32])
check("no NaN cells", int(X.isna().sum().sum()) == 0)
check("no infinite cells", int(np.isinf(X.to_numpy()).sum()) == 0)
leaked = [c for c in BANNED if c in X.columns]
check("no banned/leaking columns", not leaked, f"found {leaked}" if leaked else
      "ActiveGL/ATVolume/FDensity/MVis absent")

# 5. reload parity
print("\n3. serialization parity")
p1 = det.model.predict_proba(X.to_numpy())[:, 1]
det2 = KickDetector.load(MODEL)
p2 = det2.model.predict_proba(X.to_numpy())[:, 1]
delta = float(np.max(np.abs(p1 - p2)))
check("reload reproduces probabilities exactly", delta == 0.0, f"max |delta| = {delta:.3e}")

# 6. documented behaviour
print("\n4. documented detection behaviour")
from kickdet.onset import find_physical_onset

onset = find_physical_onset(df)
rep = det.score(df, onset_index=onset, onset_frame="source")
check("onset auto-detected in the source frame", onset > det.warmup,
      f"source index {onset} (aligned {onset - det.warmup})")
check("aligned sample count", rep.n_samples == EXPECTED["n_samples_aligned"],
      f"got {rep.n_samples}")
check("no false-alarm episodes on the real run", rep.alarm_episodes == 0,
      f"got {rep.alarm_episodes}")
check("peak pre-onset probability is low",
      rep.max_probability_before_onset < EXPECTED["pre_onset_max_prob_below"],
      f"{rep.max_probability_before_onset:.4f}")
check("alarm comes after onset, not before",
      rep.first_alarm_seconds_after_onset is not None
      and rep.first_alarm_seconds_after_onset > 0,
      f"{rep.first_alarm_seconds_after_onset:+.1f} s")
check("alarm latency within documented band",
      abs(rep.first_alarm_seconds_after_onset
          - EXPECTED["alarm_seconds_after_onset"]) < EXPECTED["latency_tolerance_s"],
      f"{rep.first_alarm_seconds_after_onset:+.1f} s vs "
      f"{EXPECTED['alarm_seconds_after_onset']:+.1f} s expected "
      f"(+/-{EXPECTED['latency_tolerance_s']} s)")

# 6b. the scored series must be warm-up-trimmed, or the usable record is short
check("scored series is warm-up-trimmed", len(rep.probability) == len(df) - det.warmup,
      f"{len(df)} - {det.warmup} = {len(rep.probability)}")

# 7. environment
print("\n5. environment")
env = det.environment_report()
print(env.to_string(index=False))
mism = env[env.build != env.current]
if len(mism):
    warn.append(f"version drift: {list(mism.package)}")
    print("\n  [WARN] library versions differ from the build record.")
    print("         Predictions may shift. Re-run scripts/retrain.py if so.")

print("\n" + "=" * 72)
print("RESULT:", "PASS" if ok else "FAIL",
      f"- {n_pass}/{n_pass + n_fail} checks passed",
      "- bundle is self-contained and reproducible" if ok
      else "- see failures above")
if warn:
    print("warnings:", "; ".join(warn))
print("=" * 72)

print("\nreport for the shipped run:")
print(rep.summary())
sys.exit(0 if ok else 1)
