"""
example_run.py
--------------
A worked example: load the model, score a well run, print the verdict, and
show what an operator would see.

    python examples/example_run.py
    python examples/example_run.py path/to/your/well.csv
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd

from kickdet import KickDetector, sustained_alarm
from kickdet.onset import find_physical_onset

DEFAULT_CSV = ROOT / "data" / "Kick_Detection.csv"


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not path.exists():
        print(f"no such file: {path}")
        return 1

    # 1. load. The artifact is self-contained; no research repo needed.
    det = KickDetector.load(ROOT / "model" / "kick_detector_35f.joblib")
    print(f"model : {len(det.feature_names)} features, threshold {det.threshold}, "
          f"warm-up {det.warmup} samples")

    df = pd.read_csv(path)
    print(f"input : {path.name}, {len(df)} rows, {df.shape[1]} columns")
    print(f"        {len(df) * 0.3595890410958904 / 60:.1f} min of drilling")

    # 2. find where the influx physically starts, independently of the model.
    onset = find_physical_onset(df)
    print(f"onset : source index {onset} "
          f"({onset * 0.3595890410958904 / 60:.1f} min in)")

    # 3. score
    report = det.score(df, onset_index=onset, onset_frame="source")
    print()
    print(report.summary())

    # 4. the operator view: sustained alarms, not single-sample spikes
    sus = sustained_alarm(report.probability, report.threshold, min_run=2)
    if sus.any():
        first = int(sus.argmax())
        first_sec = (first + det.warmup - onset) * 0.3595890410958904
        print(f"\nfirst sustained alarm: {first_sec:+.1f} s relative to the influx")
        print(f"  sustained for {int(sus.sum())} samples "
              f"({sus.sum() * 0.3595890410958904:.0f} s of coverage)")
        print(f"  peak probability {report.probability.max():.4f}")
    else:
        print("\nno sustained alarm in this run")

    # 5. what a real-time dashboard would have shown, minute by minute
    print("\nprobability over time (per minute, max within the minute):")
    sps = 0.3595890410958904
    per_min = max(1, int(round(60 / sps)))
    for m in range(0, len(report.probability), per_min):
        chunk = report.probability[m:m + per_min]
        bar = "#" * int(chunk.max() * 40)
        print(f"  t+{m * sps / 60:5.1f} min  {chunk.max():.3f} {bar}")

    # 6. the honest caveat
    print("\n" + "=" * 70)
    print("This model DETECTS an influx that has already started.")
    print("It does not predict an imminent one: no precursor survives")
    print("correction across the nine primary channels. One simulated")
    print("event stands behind these numbers. See MODEL_CARD.md.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
