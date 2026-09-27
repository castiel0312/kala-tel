"""
predict.py
----------
Command-line kick detection.

Examples
--------
Score the shipped run and print a report::

    python scripts/predict.py data/Kick_Detection.csv

Write a per-sample trace to CSV::

    python scripts/predict.py data/Kick_Detection.csv --trace out.csv

Score without knowing the onset (real-time use)::

    python scripts/predict.py new_well.csv --no-onset

List the 35 features with their meaning::

    python scripts/predict.py --features
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd

from kickdet import KickDetector
from kickdet.onset import find_physical_onset

DEFAULT_MODEL = ROOT / "model" / "kick_detector_35f.joblib"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Score drilling data for kick events.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__)
    ap.add_argument("csv", nargs="?", type=Path,
                    help="input CSV with the 28 DataDRILL columns")
    ap.add_argument("--model", type=Path, default=DEFAULT_MODEL,
                    help=f"model artifact (default: {DEFAULT_MODEL.name})")
    ap.add_argument("--threshold", type=float, default=None,
                    help="override the alarm threshold (default: model value)")
    ap.add_argument("--no-onset", action="store_true",
                    help="do not detect an onset; report blind detection only")
    ap.add_argument("--onset", type=int, default=None,
                    help="onset index in the INPUT frame (default: auto-detect)")
    ap.add_argument("--onset-frame", choices=("source", "aligned"), default="source",
                    help="which frame --onset refers to (default: source)")
    ap.add_argument("--trace", type=Path, default=None,
                    help="write per-sample probability/alarm to this CSV")
    ap.add_argument("--features", action="store_true",
                    help="print the feature dictionary and exit")
    ap.add_argument("--min-run", type=int, default=2,
                    help="consecutive samples required to count as an alarm (default 2)")
    args = ap.parse_args(argv)

    det = KickDetector.load(args.model)
    if args.threshold is not None:
        det.threshold = args.threshold

    if args.features:
        d = det.feature_dictionary()
        d.to_csv(sys.stdout, index=False)
        return 0

    if args.csv is None:
        ap.error("csv is required (or use --features)")

    df = pd.read_csv(args.csv)
    print(f"input: {args.csv}  ({len(df)} rows x {df.shape[1]} cols)")

    if args.onset is not None:
        onset, frame = args.onset, args.onset_frame
    elif args.no_onset:
        onset, frame = None, "source"
    else:
        try:
            onset = find_physical_onset(df)
        except RuntimeError as e:
            print(f"  onset not found ({e}); scoring blind")
            onset = None
        frame = "source"
        if onset is not None:
            print(f"  onset auto-detected at source index {onset} "
                  f"(aligned {onset - det.warmup})")

    rep = det.score(df, onset_index=onset, onset_frame=frame)
    print()
    print(rep.summary())

    if onset is not None:
        # sustained-alarm view: a single-sample spike is noise, not an event
        from kickdet import sustained_alarm
        sus = sustained_alarm(rep.probability, rep.threshold, args.min_run)
        n_sus = int(sus.sum())
        print(f"sustained-alarm samples : {n_sus} / {len(rep.probability)} "
              f"({100.0 * n_sus / max(1, len(rep.probability)):.1f}%)")
        post = rep.probability[max(0, rep.onset_index):]
        if len(post):
            print(f"peak probability        : {post.max():.4f}")

    if args.trace:
        tr = pd.DataFrame({
            "index": np.arange(len(rep.probability)),
            "source_index": np.arange(len(rep.probability)) + det.warmup,
            "probability": rep.probability,
            "alarm": rep.alarm,
        })
        tr.to_csv(args.trace, index=False)
        print(f"\ntrace written: {args.trace}  ({len(tr)} rows)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
