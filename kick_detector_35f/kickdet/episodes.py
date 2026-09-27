"""
episodes.py
-----------
Alarm-episode accounting.

Why this module exists
----------------------
A naive "false alarm" count flags *samples*. On a smooth drift a nuisance
condition produces hundreds of consecutive flagged rows, which inflates the
false-alarm count by orders of magnitude and makes an unsafe threshold look
safe. An operator sees a **banner**, not 600 rows: two crossings within a few
seconds are one nuisance alarm.

Every false-alarm number reported for this model is an episode count produced
here, never a sample count.
"""

from __future__ import annotations

import numpy as np

# Maximum gap (in samples) between two crossings that still counts as the same
# operator-visible alarm. At DataDRILL's ~3.5 s/sample this is ~35 s.
EPISODE_GAP = 10


def alarm_episodes(p: np.ndarray,
                   t_inj: int,
                   thr: float,
                   gap: int = EPISODE_GAP) -> int:
    """
    Count distinct alarm episodes strictly before index `t_inj`.

    Parameters
    ----------
    p : 1-D probability series, already aligned to the label/warm-up frame.
    t_inj : index of the event onset. Only `p[:t_inj]` is examined, so a
        detection that fires at or after onset can never be counted as a false
        alarm.
    thr : alarm threshold.
    gap : crossings within this many samples of each other are one episode.
    """
    hits = np.flatnonzero(np.asarray(p)[:t_inj] >= thr)
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


def episode_starts(p: np.ndarray, thr: float, gap: int = EPISODE_GAP) -> np.ndarray:
    """Indices of the first sample of each alarm episode over the whole series."""
    hits = np.flatnonzero(np.asarray(p) >= thr)
    if hits.size == 0:
        return np.empty(0, dtype=int)
    starts = [hits[0]]
    for h in hits[1:]:
        if h - starts[-1] > gap:
            starts.append(h)
    return np.asarray(starts, dtype=int)


def sustained_alarm(p: np.ndarray,
                    thr: float,
                    min_run: int = 2) -> np.ndarray:
    """
    Boolean mask of samples that are flagged for at least `min_run` consecutive
    samples.

    Used to reject single-sample spikes, which are instrument noise rather than
    an operational event. A kick produces a sustained departure, not a blip.
    """
    flagged = np.asarray(p) >= thr
    out = np.zeros_like(flagged, dtype=bool)
    run = 0
    for i, f in enumerate(flagged):
        run = run + 1 if f else 0
        if run >= min_run:
            out[i - min_run + 1: i + 1] = True
    return out
