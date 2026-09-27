# kickdet — DataDRILL kick detection

Detects a **kick** (formation influx) in drilling time-series data and raises
an operator-visible alarm.

> **Research prototype.** Trained and validated on **one** simulated kick event.
> It *detects* an influx that has already started; it does **not** predict an
> imminent one. Not validated on any field well. Read
> [`MODEL_CARD.md`](MODEL_CARD.md) before using it for anything.

---

## Install

```bash
pip install -r requirements.txt
```

Python 3.13. The pinned versions matter: the serialised estimators are
version-sensitive.

## Run it

```bash
python scripts/predict.py data/Kick_Detection.csv
```

```
input: data/Kick_Detection.csv  (2337 rows x 28 cols)
  onset auto-detected at source index 1496 (aligned 1436)

samples scored          : 2277
features                : 35
alarm threshold         : 0.22
alarm episodes          : 0
peak pre-onset prob     : 0.0179
first alarm             : +3.2 s relative to onset
sustained-alarm samples : 832 / 2277 (36.5%)
peak probability        : 1.0000
```

Other useful flags:

```bash
python scripts/predict.py data/Kick_Detection.csv --trace out.csv   # per-sample CSV
python scripts/predict.py data/Kick_Detection.csv --no-onset        # blind, no onset search
python scripts/predict.py --features                                # the 35 features
python scripts/predict.py my_well.csv --threshold 0.30              # override threshold
```

## Use it from Python

```python
import pandas as pd
from kickdet import KickDetector

det = KickDetector.load("model/kick_detector_35f.joblib")
df = pd.read_csv("data/Kick_Detection.csv")

report = det.score(df)                    # onset is auto-detected
print(report.summary())

# per-sample output
report.probability    # numpy array, len(df) - 60
report.alarm          # boolean array, probability >= threshold
report.alarm_episodes # number of operator-visible alarms
```

Useful attributes: `det.feature_names`, `det.feature_dictionary()`,
`det.threshold`, `det.warmup`, `det.feature_config`.

## Verify it

```bash
python scripts/verify.py
```

Checks that the bundle is self-contained (loads without the research repo),
that the feature matrix is correct (35 columns, exact order, float32, no
NaN/infinity, no banned columns), that serialisation round-trips exactly, and
that documented detection behaviour still holds. 15 checks.

## Retrain it

```bash
python scripts/retrain.py --check-only   # rebuild and compare; writes nothing
python scripts/retrain.py                 # rebuild and overwrite the artifact
```

Rebuilds from the raw CSV and reproduces threshold **0.22**, **88.33%**
detection on the 240-event grid, **16.18 s** median delay, **18.70 s** p90.

The threshold is selected on a **guarded** fit: the ±60-sample band around the
label onset is held out, so the threshold is chosen on samples the members
never saw. The shipped artifact is then refit on everything. Guarded copies
exist only to pick the threshold honestly.

`kickdet/stress.py` is the single source of truth for the stress grid and the
false-alarm accounting, shared by the retrain, the CLI, and the tests, so the
numbers cannot drift apart between scripts.

---

## How it works, in one paragraph

Nine primary channels plus five flow/pressure imbalances, rolling means, and
rolling z-scores give **35 causal features**. Three probability-calibrated
models — CatBoost, LightGBM, and a logistic regression — each score the
sample, and the three probabilities are averaged with **equal weight**. If the
mean reaches **0.22**, that is an alarm. Consecutive crossings within 10
samples collapse into one operator-visible alarm episode.

Six columns are banned: `ActiveGL` and `ATVolume` *are* the kick, and
`FDensity`, `MVis`, `FPress`, `WellDepth` are not reliably available at
surface in real time.

Full diagram and rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Why equal weights?

A learned weighting needs held-out events to fit reliably. There is exactly one
event here, so any learned weight would be fitted to noise.

---

## Layout

```
kick_detector_35f/
├── model/kick_detector_35f.joblib   the artifact (294 KB)
├── data/
│   ├── Kick_Detection.csv            source data (2337 rows, CC-BY-4.0)
│   └── PROVENANCE.json               origin, DOI, licence
├── kickdet/
│   ├── __init__.py                   public API
│   ├── detector.py                   load + score
│   ├── features.py                   the 35 features
│   ├── columns.py                    channel registry
│   ├── ensemble.py                   mean of the three members
│   ├── episodes.py                   alarm-episode accounting
│   ├── onset.py                      physical-influx detection
│   └── stress.py                     240-event grid + false-alarm counting
├── scripts/
│   ├── predict.py                    command line
│   ├── verify.py                     15 self-checks
│   ├── retrain.py                    full reproduction
│   ├── build_manifest.py             inventory + checksums
│   └── finalize_bundle.py            one-time artifact finaliser
├── docs/ARCHITECTURE.md              diagram and rationale
├── MODEL_CARD.md                     data, metrics, limitations
├── requirements.txt                  pinned versions
└── MANIFEST.json                     file inventory + checksums
```

## What is measured, and what is not

| | |
|---|---|
| Detection on the 240-event grid @ 0.22 | **88.33%**, median 16.18 s, p90 18.70 s, **0** false-alarm episodes |
| Real run | first alarm **+3.2 s** after influx; peak pre-onset probability 0.0179 |
| In-sample fit | accuracy 0.9996, F1 0.9994, AUC 1.0 — **carries no generalisation information** |

The 88.33% comes from a synthetic grid built by rescaling the one observed
kick. It measures sensitivity to severity and ramp shape on a known event. It
is **not** a field false-alarm rate and **not** a cross-well estimate.

**All 30 grid misses occur at FOut shifts of 0.14σ or 0.43σ; none at 1.42σ or
above.** The detection floor lies between 0.43σ and 1.42σ and is not resolved
by this data.

### Not early warning

Physical influx starts at aligned index 1435; the pit-gain label at 1445. The
alarm arrives ~3.2 s after the influx, so it beats the *label* by a few
seconds while adding nothing ahead of the *physical event*. A precursor search
across all nine channels found nothing (BH-adjusted p = 0.649).

## Requirements

`python>=3.13`, plus the pinned versions in `requirements.txt`. A hard disk
footprint of ~1 MB for the whole bundle.

## Licence

Code: MIT (`LICENSE`). Data: CC-BY-4.0, © DataDRILL authors — see
`data/PROVENANCE.json`. The model artifact is a derived work of the DataDRILL
dataset and inherits its CC-BY-4.0 terms.
