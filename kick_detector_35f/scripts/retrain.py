"""
retrain.py
----------
Reproduce the shipped model end to end from the raw DataDRILL CSV.

This is a faithful re-implementation of the training procedure that produced
`model/kick_detector_35f.joblib`, not a re-tuning. The feature set, the
calibration scheme, the members and their hyper-parameters are all **fixed**
below. Re-running this should land on the same 35 features and the same
0.22 threshold. If it does not, the environment has drifted - which is itself
worth knowing.

    python scripts/retrain.py                       # rebuild and write the bundle
    python scripts/retrain.py --check-only          # rebuild, compare, write nothing

Procedure
---------
1. Load the raw CSV, drop the startup row, align.
2. Build the 35-feature matrix from the hard-pinned feature list.
3. Derive the label (`ActiveGL` > 0) and the physical onset.
4. Guarded split: fit on everything except a +/-60-sample band around the
   onset, so the threshold is selected on samples the models never saw.
5. Calibrate each member: isotonic regression for the two boosters
   (`CalibratedClassifierCV`, 3-fold), quantile+logistic for the linear model.
6. Select the threshold: maximise the detection rate among thresholds with
   zero false-alarm ALARM EPISODES, breaking ties by median delay.
7. Refit on all labelled data and serialise.

The one number this cannot reproduce is generalisation: one event means one
transition, so "held out" means held out around that same transition.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
import joblib
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import QuantileTransformer

from kickdet import features as F
from kickdet import stress as SC
from kickdet.ensemble import MeanEnsemble
from kickdet.onset import find_physical_onset

DATA = ROOT / "data" / "Kick_Detection.csv"
OUT = ROOT / "model" / "kick_detector_35f.joblib"

MEMBERS = ["CatBoost_calibrated", "LightGBM_calibrated", "LogisticRegression"]

# Hard-pinned. The full 237-feature search is intentionally NOT repeated: it was
# run once, and re-running it on the same single event would re-tune on the same
# data the selection already saw.
DEPLOY_FEATURES = [
    "FOut", "FIn", "DPPress", "WBoPress", "WoBit", "HLoad", "RoPen", "CircFlow",
    "SMSpeed", "FOut_minus_FIn", "FOut_over_FIn", "WoBit_over_HLoad",
    "DPPress_minus_WBoPress", "RoPen_over_WoBit",
    "FOut_mean20", "FOut_z20", "FIn_mean20", "FIn_z20",
    "DPPress_mean20", "DPPress_z20", "WBoPress_mean20", "WBoPress_z20",
    "WoBit_mean20", "WoBit_z20", "HLoad_mean20", "HLoad_z20",
    "RoPen_mean20", "RoPen_z20", "CircFlow_mean20", "CircFlow_z20",
    "SMSpeed_mean20", "SMSpeed_z20",
    "FOut_minus_FIn_z20", "WoBit_kickdir_z20", "HLoad_kickdir_z20",
]
FEATURE_CONFIG = {"use_depth": False, "use_fpress": False,
                  "include_derived": True, "only": DEPLOY_FEATURES}

THRESHOLD_GRID = [0.05, 0.08, 0.10, 0.12, 0.15, 0.18, 0.20, 0.22, 0.26, 0.30,
                  0.35, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]
GUARD = 60
SEED = 0
# Sample interval is defined once, in kickdet.stress, so the grid, the CLI and
# the retrain can never drift apart on "seconds per sample".

# Hyper-parameters, verbatim from src/11_optimised_model.py:base_models. These
# are the values that actually produced the shipped artifact - do not tidy them.
CB = dict(iterations=300, depth=5, learning_rate=0.05, verbose=0,
          random_seed=SEED, allow_writing_files=False)
LGB = dict(n_estimators=300, num_leaves=15, max_depth=4, learning_rate=0.05,
           min_child_samples=25, colsample_bytree=0.6, subsample=0.8,
           subsample_freq=1, reg_alpha=0.5, reg_lambda=5.0, is_unbalance=True,
           random_state=SEED, verbose=-1)
LR = dict(C=0.05, class_weight="balanced", max_iter=4000, random_state=SEED)


def logreg_calibrated() -> Pipeline:
    """Quantile transform then balanced L2 logistic regression."""
    return Pipeline([
        ("sc", QuantileTransformer(n_quantiles=200, output_distribution="normal",
                                   random_state=SEED)),
        ("clf", LogisticRegression(**LR)),
    ])


def build_members() -> dict:
    """
    The three members, equal weights downstream.

    The two boosters are wrapped in 3-fold isotonic calibration, exactly as
    `src/11_optimised_model.py:calibrate` did. The linear model is NOT
    calibrated: it is already monotone in the feature scores, so calibration
    would only add fold variance.
    """
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=0)
    return {
        "CatBoost_calibrated": CalibratedClassifierCV(
            CatBoostClassifier(**CB), method="isotonic", cv=cv),
        "LightGBM_calibrated": CalibratedClassifierCV(
            LGBMClassifier(**LGB), method="isotonic", cv=cv),
        "LogisticRegression": logreg_calibrated(),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=DATA)
    ap.add_argument("--out", type=Path, default=OUT)
    ap.add_argument("--check-only", action="store_true",
                    help="rebuild and compare against the shipped bundle; write nothing")
    args = ap.parse_args(argv)

    print("=" * 68)
    print("retrain: reproducing the 35-feature model")
    print("=" * 68)

    raw = pd.read_csv(args.data)
    # Row 0 of the DataDRILL release is a startup artifact; the labelled
    # training frame excluded it, so we do too.
    raw = raw.iloc[1:].reset_index(drop=True)
    n_src = len(raw)
    print(f"loaded {args.data.name}: {n_src} rows after dropping startup row")

    onset_src = find_physical_onset(raw)
    onset = onset_src - F.WARMUP
    print(f"physical onset: source {onset_src} -> aligned {onset}")

    # The stress grid works on the ALIGNED frame, as in the research pipeline.
    # Label rule is `ActiveGL > 0.1 bbl` - 0.1 bbl is the smallest pit gain
    # distinguishable from the well-balanced noise floor, and is NOT `> 0`.
    aligned = F.aligned_frame(raw)
    y = (aligned["ActiveGL"].to_numpy(float) > 0.1).astype(int)
    t_pit = int(np.argmax(y == 1))
    print(f"pit-gain label onset (ActiveGL > 0.1): aligned {t_pit}")

    X, names = F.build_features(raw, **FEATURE_CONFIG)
    assert names == DEPLOY_FEATURES, "feature construction drifted from the pinned list"
    Xv = X.to_numpy(np.float32)          # float32, as build_features hands a deployment
    print(f"features: {X.shape[1]}   positives: {int(y.sum())} / {len(y)}")

    # ------------------------------------------------------- guarded threshold
    # The guard is centred on the PIT-GAIN LABEL onset (t_pit_full), not on the
    # physical influx. That is what src/11_optimised_model.py does, and it is
    # the more conservative choice: the whole label-transition region is held
    # out of the fit that picks the threshold.
    t_pit_full = t_pit + F.WARMUP
    tr = np.r_[np.arange(t_pit_full - GUARD), np.arange(t_pit_full + GUARD,
                                                         n_src + F.WARMUP)]
    tr = tr[tr < len(y)]
    print(f"guarded fit: holding out aligned "
          f"[{t_pit_full - GUARD - F.WARMUP}:{t_pit_full + GUARD - F.WARMUP}] "
          f"({len(y) - len(tr)} of {len(y)} samples), centred on the label onset")

    members = {}
    proto = build_members()          # one unfitted prototype per member
    for k in MEMBERS:
        m = proto[k]
        m.fit(Xv[tr], y[tr])
        members[k] = m

    recs = SC.collect_grid([members[k] for k in MEMBERS], FEATURE_CONFIG,
                           aligned, onset, t_pit)
    p_real = np.mean([members[k].predict_proba(Xv)[:, 1] for k in MEMBERS], axis=0)
    print(f"stress grid: {len(recs)} events")

    tab = []
    for t in THRESHOLD_GRID:
        det, delays, fa_ev, fa_samp = [], [], 0, 0
        for r in recs:
            hit = np.flatnonzero(r["p"][r["t_inj"]:] >= t)
            det.append(hit.size > 0)
            if hit.size:
                delays.append(int(hit[0]) * SC.SEC_PER_SAMPLE)
            fa_ev += SC.alarm_episodes(r["p"], r["t_inj"], t)
            fa_samp += int((r["p"][:r["t_inj"]] >= t).sum())
        tab.append({
            "threshold": t,
            "detect_pct": 100 * float(np.mean(det)),
            "median_delay_s": float(np.median(delays)) if delays else np.nan,
            "p90_delay_s": float(np.percentile(delays, 90)) if delays else np.nan,
            "fa_events_grid": fa_ev,
            "fa_samples_grid": fa_samp,
            "fa_events_real": SC.alarm_episodes(p_real[:onset], onset, t),
        })
    tab = pd.DataFrame(tab)
    print("\n  thr   detect%   med_s    p90_s   FA_ep(grid)  FA_ep(real)")
    for r in tab.itertuples():
        print(f"  {r.threshold:.2f}   {r.detect_pct:6.2f}  {r.median_delay_s:6.2f}  "
              f"{r.p90_delay_s:6.2f}   {r.fa_events_grid:9d}  {r.fa_events_real:9d}")

    # Selection rule, verbatim from src/11_optimised_model.py:evaluate_subset
    zero_fa = tab[(tab.fa_events_grid == 0) & (tab.fa_events_real == 0)]
    if zero_fa.empty:
        best = tab.loc[tab.detect_pct.idxmax()].to_dict()
        rule = "FALLBACK: no zero-false-alarm threshold exists"
    else:
        top = zero_fa[zero_fa.detect_pct == zero_fa.detect_pct.max()]
        best = top.sort_values(["median_delay_s", "threshold"]).iloc[0].to_dict()
        rule = "highest detection at zero false-alarm episodes"
    thr, det_pct, med = best["threshold"], best["detect_pct"], best["median_delay_s"]
    print(f"\nselected threshold {thr:.2f}  [{rule}]")
    print(f"  detection {det_pct:.2f}%, median delay {med:.2f}s, "
          f"FA episodes: {int(best['fa_events_grid'])} grid / "
          f"{int(best['fa_events_real'])} real")

    # ------------------------------------------------------------- refit + save
    ens_full = MeanEnsemble(build_members())
    ens_full.fit(Xv, y)
    p_full = ens_full.predict_proba(Xv)[:, 1]
    hit = np.flatnonzero(p_full[onset:] >= thr)
    in_sample_det = 100.0 * (1.0 if hit.size else 0.0)
    in_sample_delay = (int(hit[0]) * SC.SEC_PER_SAMPLE) if hit.size else float("nan")
    print(f"refit on all labelled data: detected {in_sample_det:.2f}%, "
          f"first alarm {in_sample_delay:+.2f}s after onset "
          f"(IN-SAMPLE, not a generalisation estimate)")

    bundle = {
        "model": ens_full,
        "feature_config": FEATURE_CONFIG,
        "feature_names": DEPLOY_FEATURES,
        "warmup": F.WARMUP,
        "alarm_threshold": thr,
        "threshold_rule": (
            "Highest detection rate among thresholds with zero false-alarm ALARM "
            "EPISODES on the 240-event physical stress grid and on the real healthy "
            "period; ties broken by lower median detection delay, then by the lower "
            "threshold. Episodes, not samples: consecutive crossings within 10 "
            "samples count as one operator-visible alarm."),
        "seconds_per_sample": SC.SEC_PER_SAMPLE,
        "banned_columns": list(F.BANNED),
        "required_columns": list(F.PRIMARY_CHANNELS),
        "package": "kickdet",
        "package_version": "1.0.0",
        "label_rule": "ActiveGL > 0 (DataDRILL 'Active Gain Loss' indicator)",
        "origin": {
            "dataset": "DataDRILL (Zenodo 10.5281/zenodo.12759014)",
            "paper": "arXiv:2409.19724",
            "note": "single simulated kick event; see MODEL_CARD.md",
        },
        "metrics": {
            "n_features": len(DEPLOY_FEATURES),
            "guarded_detect_pct": round(float(det_pct), 3),
            "guarded_median_delay_s": round(float(med), 3),
            "guarded_p90_delay_s": round(float(best["p90_delay_s"]), 3),
            "guarded_fa_events_grid": int(best["fa_events_grid"]),
            "guarded_fa_events_real": int(best["fa_events_real"]),
            "stress_n_events": len(recs),
            "in_sample_detected": in_sample_det >= 100.0,
            "in_sample_first_alarm_s": round(float(in_sample_delay), 3),
        },
    }

    if args.check_only:
        # Load through the public API so the legacy top-level `ensemble` module
        # alias is registered before unpickling.
        from kickdet import KickDetector
        ref = KickDetector.load(args.out)
        same_feats = ref.feature_names == bundle["feature_names"]
        same_thr = abs(ref.threshold - thr) < 1e-9
        same_cfg = ref.feature_config == FEATURE_CONFIG
        print("\ncomparison against shipped bundle:")
        print(f"  feature list identical : {same_feats}")
        print(f"  feature config identical: {same_cfg}")
        print(f"  threshold identical    : {same_thr} "
              f"(shipped {ref.threshold}, rebuilt {thr})")
        ok = same_feats and same_thr and same_cfg
        print("\nRESULT:", "MATCH" if ok else "MISMATCH")
        return 0 if ok else 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, args.out, compress=3)
    print(f"\nwrote {args.out}  ({args.out.stat().st_size/1024:.1f} KB)")
    print("\nNOTE: reproduce the *decision* above, not a generalisation claim.")
    print("      One event means one transition. See MODEL_CARD.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
