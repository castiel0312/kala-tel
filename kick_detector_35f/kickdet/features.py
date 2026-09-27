"""
features.py
-----------
Causal feature engineering for the DataDRILL kick detector.

DESIGN RULES (these are the whole point of the module)
-----------------------------------------------------
1. **No target leakage.** `ActiveGL` is the label. `ATVolume`, `FDensity` and
   `MVis` are (near-)deterministic functions of it in the OTR simulator
   (see reports/01_eda.md section 6b.1) and are hard-blocked in `BANNED`.
2. **No invented variables.** Every engineered feature is named
   `<DataDRILLcolumn><suffix>` so its parent is unambiguous. The suffixes are a
   closed vocabulary defined in `SUFFIX_DOC`. No column is renamed.
3. **Strictly causal.** Every rolling statistic uses only the current and past
   samples (`closed='left'` where a trailing baseline is wanted, plain trailing
   window where including the present is causal and desirable). No centred
   windows, no `bfill`, no interpolation across the split boundary.
4. **Reproducible.** Feature construction depends on no fitted parameters, so it
   is safe to run once over the whole series before splitting. (Anything that
   *did* need fitting - scaler, imputer, model - is fitted inside each CV fold in
   `evaluate.py`.)
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Hard block list. Present in the CSV, forbidden as model input.
# ---------------------------------------------------------------------------
BANNED = ["ActiveGL", "ATVolume", "FDensity", "MVis"]

# Dead channels: constant or pure instrument noise in the release. Carrying them
# only invites a model to memorise float noise, so they are not engineered.
DEAD = ["BSize", "CPress", "MPS1", "MPS2", "MPS3", "AMTD", "STP", "ATMPV", "ATMYP"]

# Surface-measurable channels that actually move during drilling.
# `WellDepth` is available but deliberately NOT in this list - see
# `build_features(..., use_depth=False)` and reports/02.
PRIMARY_CHANNELS = [
    "FOut",       # Flow Out            - amount of fluid exiting the drill pipe
    "FIn",        # Flow In             - amount entering the drill pipe
    "DPPress",    # Drill Pipe Pressure
    "WBoPress",   # Well Bore Pressure
    "WoBit",      # Weight on Bit
    "HLoad",      # Hook Load
    "RoPen",      # Rate of Penetration
    "CircFlow",   # Circulation Flow
    "SMSpeed",    # String Moving Speed
]
OPTIONAL_CHANNELS = ["FPress"]  # Formation Pressure - downhole virtual sensor

# ---------------------------------------------------------------------------
# Suffix vocabulary - documented so no feature name is unexplained.
# ---------------------------------------------------------------------------
SUFFIX_DOC = {
    "": "raw level of the DataDRILL column (unchanged name)",
    "_d{L}": "first difference over L samples: x[t] - x[t-L] (rate of change)",
    "_rel{L}": "relative change over L samples: (x[t]-x[t-L]) / (|x[t-L]|+eps)",
    "_mean{W}": f"trailing mean over W samples (includes t)",
    "_std{W}": f"trailing standard deviation over W samples (includes t)",
    "_rng{W}": f"trailing range (max-min) over W samples",
    "_z{W}": (f"deviation from the trailing baseline that EXCLUDES the present "
              f"sample: (x[t] - mean(x[t-W:t])) / (std(x[t-W:t]) + eps). "
              f"Positive/negative = above/below the recent norm, in sigmas."),
    "_dz{W}": "first difference of _z{W} - how fast the deviation is growing",
    "_az{W}": "trailing mean of the absolute _z over W samples (sustained-ness of the departure)",
    "_exc{W}": f"fraction of the last W samples where |_z| > 2 (how persistently abnormal)",
    "_slope{W}": f"OLS slope of x over the trailing W samples (trend)",
}

# Rolling windows. Kept small on purpose: 2336 samples, one event.
WINDOWS = [5, 20, 60]
LAGS = [1, 3, 10]
Z_WINDOWS = [20, 60]

# Number of leading samples discarded so that every rolling statistic is fully
# defined by real history rather than by imputation.
#
# An earlier version imputed with the *global* column median. That is label-free
# but NOT causal: perturbing a future sample moves the median and therefore moves
# already-computed past features. The causality test in tests/test_smoke.py caught
# it. Dropping the warm-up window removes the need for imputation altogether,
# which is the only genuinely causal option.
WARMUP = max(WINDOWS + Z_WINDOWS + [20])


def _safe_den(a: np.ndarray, eps: float = 1e-9) -> np.ndarray:
    return np.where(np.abs(a) < eps, np.sign(a) * eps + eps, a)


def _trailing_mean(s: pd.Series, w: int) -> pd.Series:
    """Mean of x[t-w : t] - the w samples strictly BEFORE t (causal baseline)."""
    return s.shift(1).rolling(w, min_periods=max(2, w // 2)).mean()


def _trailing_std(s: pd.Series, w: int) -> pd.Series:
    """Std of x[t-w : t] - the w samples strictly BEFORE t (causal baseline)."""
    return s.shift(1).rolling(w, min_periods=max(2, w // 2)).std()


def build_features(df: pd.DataFrame,
                   use_depth: bool = False,
                   use_fpress: bool = True,
                   include_derived: bool = True,
                   only: list[str] | None = None) -> tuple[pd.DataFrame, list[str]]:
    """
    Build the model matrix.

    Parameters
    ----------
    df : frame containing the 28 DataDRILL columns plus 't' and 'kick'.
    use_depth : include `WellDepth`-derived features. Off by default because in
        this single-event dataset depth is a proxy for the label, not a cause of
        the kick (reports/02, section 2).
    use_fpress : include `FPress` (Formation Pressure). It is a downhole virtual
        sensor in the OTR API; OIL's eRTMAC will not have it, so the deployable
        configuration turns it off.
    include_derived : add rates/deviations/trends. False gives levels only.
    only : optional whitelist of feature names to keep, applied after everything
        else is computed. This is how a pruned model stays reproducible: the
        artifact stores the surviving names in its `feature_config`, and
        `build_features(df, **feature_config)` returns exactly the columns the
        serialized estimators were fitted on. Requesting a name that does not
        exist is an error rather than a silent omission.

    Returns
    -------
    (X, feature_names) - X is float32, NaN-free (median-imputed *within* each
    column, which is label-free and therefore split-safe).
    """
    channels = list(PRIMARY_CHANNELS)
    if use_fpress:
        channels += OPTIONAL_CHANNELS
    if use_depth:
        channels = channels + ["WellDepth"]

    for c in channels:
        assert c not in BANNED, f"{c} is banned (target leakage)"

    feats: dict[str, np.ndarray] = {}

    # ---------------------------------------------------------------- levels
    for c in channels:
        feats[c] = df[c].to_numpy(float)

    if not include_derived:
        return _select(_finalise(feats), only)


    # ------------------------------------------------- physically derived
    # Flow imbalance: fluid leaving the drill pipe minus fluid entering it.
    # This is THE classical kick indicator and it is the channel that leads the
    # pit gain by ~9 samples (reports/02c). Both operands are DataDRILL columns.
    fout, fin = df["FOut"].to_numpy(float), df["FIn"].to_numpy(float)
    imb = fout - fin
    feats["FOut_minus_FIn"] = imb
    feats["FOut_over_FIn"] = fout / _safe_den(fin)

    # Load redistribution: during an influx the string gets lighter, the drawworks
    # takes more load, and the driller backs off weight on bit.
    wob, hl = df["WoBit"].to_numpy(float), df["HLoad"].to_numpy(float)
    feats["WoBit_over_HLoad"] = wob / _safe_den(hl)

    # Pressure relative to the hydrostatic reference the simulator reports.
    dpp, wbo = df["DPPress"].to_numpy(float), df["WBoPress"].to_numpy(float)
    feats["DPPress_minus_WBoPress"] = dpp - wbo
    if use_fpress:
        # Read FPress only when it is actually requested. Touching the column
        # unconditionally made `use_fpress=False` a lie: the function still
        # required the column to exist, so a deployment that genuinely lacks the
        # downhole virtual sensor could not build features at all. That is
        # exactly the situation this flag exists to support.
        fpr = df["FPress"].to_numpy(float)
        feats["WBoPress_over_FPress"] = wbo / _safe_den(fpr)
        feats["FPress_minus_WBoPress"] = fpr - wbo

    # Rate of penetration per unit weight on bit - classic "drilling efficiency"
    # style ratio, sensitive to formation change and to the driller's reaction.
    rop = df["RoPen"].to_numpy(float)
    feats["RoPen_over_WoBit"] = rop / _safe_den(np.abs(wob))

    # ------------------------------------------------- per-channel dynamics
    for c in channels:
        s = df[c].astype(float)

        for L in LAGS:
            feats[f"{c}_d{L}"] = s.diff(L).to_numpy()
            feats[f"{c}_rel{L}"] = (s.diff(L) / _safe_den(s.shift(L).abs())).to_numpy()

        for W in WINDOWS:
            feats[f"{c}_mean{W}"] = s.rolling(W, min_periods=1).mean().to_numpy()
            feats[f"{c}_std{W}"] = s.rolling(W, min_periods=2).std().fillna(0.0).to_numpy()
            feats[f"{c}_rng{W}"] = (s.rolling(W, min_periods=1).max()
                                    - s.rolling(W, min_periods=1).min()).to_numpy()

        for W in Z_WINDOWS:
            z = (s - _trailing_mean(s, W)) / (_trailing_std(s, W) + 1e-9)
            feats[f"{c}_z{W}"] = z.to_numpy()
            feats[f"{c}_dz{W}"] = z.diff(3).to_numpy()
            feats[f"{c}_az{W}"] = z.abs().rolling(W, min_periods=1).mean().to_numpy()
            feats[f"{c}_exc{W}"] = (z.abs() > 2).rolling(W, min_periods=1).mean().to_numpy()

        for W in (20,):
            # trailing OLS slope: fit x ~ i over x[t-W+1 : t+1].
            # np.convolve(..., 'valid') yields the window ending at t = W-1, W, ...,
            # so it must be right-aligned back to the full length.
            arr = np.nan_to_num(s.to_numpy(float))
            x = np.arange(W, dtype=float)
            sxy = np.convolve(arr, x[::-1], "valid")     # sum(x_j * y_{t-W+1+j})
            sy = np.convolve(arr, np.ones(W), "valid")  # sum(y over window)
            denom = W * (W * (W - 1) / 2)                # n * sum(x - mean(x)) = n*Sxx
            with np.errstate(invalid="ignore", divide="ignore"):
                slope_valid = (W * sxy - sy * x.sum()) / denom
            slope = np.concatenate([np.full(W - 1, np.nan), slope_valid])
            feats[f"{c}_slope{W}"] = np.nan_to_num(slope)

    # ------------------------------- deviation dynamics of the derived channels
    # The influx signal is the fastest-moving thing in the system, so its own
    # deviation-from-baseline features deserve first-class treatment.
    imb_s = pd.Series(imb, index=df.index)
    for W in Z_WINDOWS:
        z = (imb_s - _trailing_mean(imb_s, W)) / (_trailing_std(imb_s, W) + 1e-9)
        feats[f"FOut_minus_FIn_z{W}"] = z.to_numpy()
        feats[f"FOut_minus_FIn_dz{W}"] = z.diff(3).to_numpy()
        feats["FOut_minus_FIn_exc20"] = (z.abs() > 2).rolling(20, min_periods=1).mean().to_numpy()

    # WoBit dropping and HLoad rising is the load-transfer signature of an influx.
    for base, sign in (("WoBit", -1.0), ("HLoad", +1.0)):
        s = df[base].astype(float)
        feats[f"{base}_kickdir_z20"] = (sign * (s - _trailing_mean(s, 20))
                                        / (_trailing_std(s, 20) + 1e-9)).to_numpy()

    return _select(_finalise(feats), only)


def aligned_frame(df: pd.DataFrame) -> pd.DataFrame:
    """
    The rows of `df` that survive the warm-up cut, re-indexed from 0.

    `build_features` needs history to define its rolling statistics, so it consumes
    the first `WARMUP` samples and returns a matrix `WARMUP` rows shorter than
    `df`. Any label array, split boundary or event index must be shifted by the
    same amount - use this function rather than doing the arithmetic by hand.
    """
    return df.iloc[WARMUP:].reset_index(drop=True)


def _select(finalised: tuple[pd.DataFrame, list[str]],
            only: list[str] | None) -> tuple[pd.DataFrame, list[str]]:
    """Apply the `only` whitelist to a finished matrix, order preserved."""
    X, order = finalised
    if only is None:
        return X, order
    want = list(only)
    unknown = [c for c in want if c not in order]
    if unknown:
        raise KeyError(
            f"{len(unknown)} requested feature(s) are not produced by this "
            f"configuration: {unknown[:8]}. A pruned model must never silently "
            f"lose a column it was fitted on."
        )
    return X.iloc[:, [order.index(c) for c in want]], want


def _finalise(feats: dict[str, np.ndarray]) -> tuple[pd.DataFrame, list[str]]:
    """
    Align to a common length, drop the warm-up window, and assert that no
    imputation was needed.

    The assertion is the point: if any NaN survives the warm-up cut, the feature
    set has an undefined value that a real deployment would have to guess, so we
    fail loudly rather than silently fill it.
    """
    n = min(len(v) for v in feats.values())
    X = pd.DataFrame({k: np.asarray(v[:n], dtype=float) for k, v in feats.items()})
    X = X.replace([np.inf, -np.inf], np.nan)
    X = X.iloc[WARMUP:].reset_index(drop=True)

    remaining = int(X.isna().sum().sum())
    if remaining:
        bad = X.columns[X.isna().any()].tolist()
        raise ValueError(
            f"{remaining} NaN cells survived the {WARMUP}-sample warm-up cut, in "
            f"{len(bad)} feature(s): {bad[:8]}. Increase WARMUP rather than imputing - "
            f"imputation is what broke causality."
        )
    return X.astype(np.float32), list(X.columns)


def feature_dictionary(names: list[str]) -> pd.DataFrame:
    """Human-readable dictionary: every feature -> parent DataDRILL column + op."""
    from .columns import ALL_COLUMNS

    # suffix template -> human description, longest template first so that
    # "_dz20" is matched before "_d" and "_z20" before "_z"
    templates = sorted(SUFFIX_DOC.items(), key=lambda kv: -len(kv[0]))

    rows = []
    for f in names:
        cands = [c for c in ALL_COLUMNS if f.startswith(c)]
        if cands:
            parent = max(cands, key=len)
            suffix = f[len(parent):]
        else:
            parent, suffix = "(derived combination)", f
        op = ""
        for tpl, desc in templates:
            if tpl == "":
                continue
            if suffix.startswith(tpl.split("{")[0]):
                op = desc
                break
        rows.append({
            "feature": f,
            "parent_DataDRILL_column": parent,
            "operation_suffix": suffix or "(none - raw level)",
            "meaning": op or f"derived: {suffix}",
        })
    return pd.DataFrame(rows)
