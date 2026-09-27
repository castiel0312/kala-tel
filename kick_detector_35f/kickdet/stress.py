"""
stress.py
---------
The 240-event synthetic-kick stress grid.

This is the single source of truth for threshold selection and for the
false-alarm accounting. It is a verbatim port of ``src/stress_common.py`` from
the research repo, with the ``import features as Ft`` line pointed at this
package. Every methodological decision below was made after finding a
measurement bug, and the reasoning is preserved in the comments so it is not
silently reverted:

  * ``build_features`` already drops its own WARMUP rows, so feature matrices
    must NOT be sliced again. Doing so shifted every index 60 samples and made
    the measured detection delay ~0 while inventing "early warning" on all 240
    events.
  * Detection delay is measured from the first alarm at or AFTER the influx. A
    "first crossing anywhere" search reports the first false alarm in the long
    healthy stretch as early warning.
  * Severities are expressed in sd of the healthy FOut deviation, because the
    observed kick is ~142 sd: a grid that starts at 0.15x is nowhere near the
    regime where a kick is hard to see.
  * False alarms are counted as operator-visible ALARM EPISODES, not flagged
    samples. An operator sees a banner, not 200 consecutive flagged rows.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from . import features as Ft

# paper: 13-15 min for the formation; 2336 samples
SEC_PER_SAMPLE = 14 * 60 / 2336
LOOKBACK = 60                 # samples (~22 s) allowed for early-warning claims
SEVERITIES = [0.001, 0.003, 0.01, 0.03, 0.06, 0.1, 0.25, 0.5, 1.0, 2.0]
RAMP_MULTS = [1, 2, 4, 8]
REPEATS = 6
N_EVENTS = len(SEVERITIES) * len(RAMP_MULTS) * REPEATS   # 10 * 4 * 6 = 240


def synth_run(df: pd.DataFrame, t_phys: int, t_pit: int, onset: int,
              severity: float, ramp_mult: float, noise: float,
              rng: np.random.Generator) -> tuple[pd.DataFrame, int]:
    """
    Assemble one synthetic well run containing a single injected kick.

    Composition, matching the real run's structure (healthy -> short transition ->
    kicked regime held to the end, with no return to normal):

        [ healthy baseline of length `onset` ] + [ ramp x severity, stretched ]
                                               + [ sustained regime x severity ]

    The ramp and the sustained regime are both expressed as offsets from the last
    healthy value, so the joins are continuous. An earlier version rebuilt the
    baseline values after the ramp, which injected a step *backwards* into healthy
    operation - a second, artificial regime change that the detector reacted to.
    """
    chans = Ft.PRIMARY_CHANNELS
    A = df[chans].to_numpy(float)

    base = A[:onset].copy()
    scale = base[:200].std(axis=0, keepdims=True)
    base = base + rng.normal(0, noise, base.shape) * scale
    b0 = base[-1:]                                   # last healthy value

    ramp = A[t_phys:t_pit]
    ramp_big = np.vstack([np.repeat(ramp[:1], ramp_mult, axis=0), ramp[1:]])
    ramp_big = b0 + (ramp_big - b0) * severity

    sus_src = A[t_pit:t_pit + 200]
    sus = ramp_big[-1:] + (sus_src - sus_src[:1]) * severity
    tail_len = max(80, int(0.4 * onset))
    reps = tail_len // len(sus) + 1
    sus = np.vstack([sus, np.tile(sus[-1:], (reps, 1))])[:tail_len]

    sig = np.vstack([base, ramp_big, sus])
    out = df.iloc[:len(sig)][chans].copy()
    out.loc[:, :] = sig
    return out.ffill().bfill(), len(base)


def collect_grid(models, cfg, df: pd.DataFrame, t_phys: int,
                 t_pit: int) -> list[dict]:
    """
    Build every synthetic event once and return its full probability curve.

    The single source of truth for the grid. Any experiment that needs to compare
    many thresholds, or count false alarms as operator-visible *episodes* rather
    than flagged samples, must go through here too - otherwise the numbers drift
    between scripts, which is the exact failure this module exists to prevent.

    `df` is the ALIGNED frame and `t_phys`/`t_pit` are ALIGNED indices, matching
    the research pipeline.
    """
    base_sd = float(df["FOut"].to_numpy(float)[:t_phys].std())
    obs_shift = float(np.abs(df["FOut"].to_numpy(float)[t_pit:t_pit + 40].mean()
                             - df["FOut"].to_numpy(float)[:t_phys].mean()))
    out: list[dict] = []
    for sev in SEVERITIES:
        for rm in RAMP_MULTS:
            for rep in range(REPEATS):
                rng = np.random.default_rng(1000 * rep + int(sev * 1000) + rm)
                onset = int(rng.integers(300, 1150))
                noise = float(rng.choice([0.0, 0.05, 0.15]))
                run, t_inj = synth_run(df, t_phys, t_pit, onset, sev, rm, noise, rng)
                X, _ = Ft.build_features(run, **cfg)
                if len(X) < 120:
                    continue
                t_inj -= Ft.WARMUP
                if not (0 <= t_inj < len(X)):
                    continue
                p = np.mean([m.predict_proba(X.to_numpy())[:, 1] for m in models],
                            axis=0)
                out.append({
                    "severity": sev,
                    "fout_sd_multiple": (round(sev * obs_shift / base_sd, 2)
                                         if base_sd > 0 else np.nan),
                    "ramp_mult": rm, "noise": noise, "rep": rep,
                    "t_inj": t_inj, "p": p,
                })
    return out


def alarm_episodes(p: np.ndarray, t_inj: int, thr: float, gap: int = 10) -> int:
    """
    Count distinct pre-onset alarm episodes rather than flagged samples.

    Two crossings `gap` samples apart are one nuisance alarm. Sample counts
    overstate the nuisance by orders of magnitude on a smooth drift.
    """
    hits = np.flatnonzero(p[:t_inj] >= thr)
    if hits.size == 0:
        return 0
    n_ep, run = 1, [hits[0]]
    for h in hits[1:]:
        if h - run[-1] <= gap:
            run.append(h)
        else:
            n_ep += 1
            run = [h]
    return n_ep


def run_grid(models, cfg, raw, df, t_phys, t_pit, thr) -> pd.DataFrame:
    """Score every synthetic event with the mean probability of `models`."""
    rows = []
    for ev in collect_grid(models, cfg, df, t_phys, t_pit):
        p, t_inj = ev["p"], ev["t_inj"]
        pre = p[:t_inj]

        after = np.where(p[t_inj:] >= thr)[0]
        delay_after = int(after[0]) if after.size else None

        lo_lb = max(0, t_inj - LOOKBACK)
        win = p[lo_lb:t_inj] >= thr
        early = None
        if win.any():
            runlen = 0
            for j in range(len(win) - 1, 0, -1):
                if win[j] and win[j - 1]:
                    runlen += 1
                    if runlen >= 2:
                        early = int(t_inj - (lo_lb + j))
                        break
                else:
                    runlen = 0

        rows.append({
            "severity": ev["severity"],
            "fout_sd_multiple": ev["fout_sd_multiple"],
            "ramp_mult": ev["ramp_mult"], "noise": ev["noise"], "rep": ev["rep"],
            "onset": t_inj,
            "delay_after_onset": delay_after,
            "detected": delay_after is not None,
            "sec_to_detect": (delay_after * SEC_PER_SAMPLE
                              if delay_after is not None else np.nan),
            "early_warning_samples": early,
            "early_warning_sec": (early * SEC_PER_SAMPLE
                                  if early is not None else np.nan),
            "false_alarms_pre_onset": int((pre >= thr).sum()),
            "fa_events_pre_onset": alarm_episodes(p, t_inj, thr),
            "fa_rate_pct_pre": 100 * float((pre >= thr).mean()),
            "peak_p_post": float(p[t_inj:].max()),
        })
    return pd.DataFrame(rows)
