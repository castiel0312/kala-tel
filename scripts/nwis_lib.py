"""Shared NWIS helpers: schema, units, sentinels, provenance, CSV I/O.

Design rules enforced here (see docs/data_dictionary.md, docs/depth_policy.md):
  * Never fabricate a value. If the source does not report it, it stays NULL.
  * Never perform an irreversible unit conversion. Original value + unit are
    retained alongside the normalized value.
  * md / tvd / tvdss stay separate columns and are never collapsed.
  * Interpolated depth is always flagged, never presented as measured.
  * Every populated record carries data_origin.
"""
from __future__ import annotations

import csv
import hashlib
import math
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA = REPO_ROOT / "data"
PROCESSED = DATA / "processed"
RAW = DATA / "raw"
INTERIM = DATA / "interim"
REPORTS = REPO_ROOT / "reports"

# --------------------------------------------------------------------------
# Dataset version -- the frozen release identifier for the canonical tables.
# Bump on any change that alters canonical row content, schema, or units.
# --------------------------------------------------------------------------
DATASET_VERSION = "nwis-forge16b-v0.2"

# Entity-availability status, derived only from what the sources actually
# report. SOURCE_NOT_AVAILABLE means the local source set contains no
# defensible record for that entity -- it is never back-filled with guesses.
SOURCE_NOT_AVAILABLE = "SOURCE_NOT_AVAILABLE"
ENTITY_STATUS = {
    "formations": SOURCE_NOT_AVAILABLE,
    "bits": SOURCE_NOT_AVAILABLE,
    "cement_jobs": SOURCE_NOT_AVAILABLE,
    "reservoirs": SOURCE_NOT_AVAILABLE,
}

# --------------------------------------------------------------------------
# data_origin -- the single most important governance field in this project.
# --------------------------------------------------------------------------
PUBLIC_REAL = "PUBLIC_REAL"
OIL_PROVIDED = "OIL_PROVIDED"
DERIVED = "DERIVED"
SYNTHETIC = "SYNTHETIC"
INJECTED_EVENT = "INJECTED_EVENT"

ALLOWED_ORIGINS = {PUBLIC_REAL, OIL_PROVIDED, DERIVED, SYNTHETIC, INJECTED_EVENT}

# Origins that must never be presented as real operational history.
NON_OPERATIONAL_ORIGINS = {SYNTHETIC, INJECTED_EVENT}


def utc_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


# --------------------------------------------------------------------------
# Sentinel / null detection
# --------------------------------------------------------------------------
# Common LAS/DLIS/log null codes. Checked before any statistic is computed.
SENTINELS = {
    -999.25, -999.99, -9999.0, -9999.25, -9999.99,
    999.25, 999.99, 9999.0, 9999.25, 9999.99,
    -32768.0, 32767.0, -1e30, 1e30,
}

NULL_TOKENS = {
    "", "na", "n/a", "nan", "null", "none", "-", "--", "?", "not available",
    "not applicable", "not measured", "unknown",
}


def is_sentinel(value) -> bool:
    """True if value is a known null/sentinel code (numeric compare, tolerant).

    Strings are NOT short-circuited on the null-token test: a CSV cell is
    always a str, so returning early for every non-null token would make the
    numeric SENTINELS set unreachable and let a real -999.25 pass through
    unnoticed. Null tokens still return True; every other string is parsed and
    compared numerically.
    """
    if value is None:
        return True
    if isinstance(value, str):
        if value.strip().lower() in NULL_TOKENS:
            return True
    try:
        f = float(value)
    except (TypeError, ValueError):
        return False
    if math.isnan(f) or math.isinf(f):
        return True
    return any(abs(f - s) < 1e-6 for s in SENTINELS)


def to_float(value):
    """Parse to float, mapping every sentinel/blank to None. Never guesses."""
    if is_sentinel(value):
        return None
    if isinstance(value, str):
        v = value.strip().replace(",", "")
        if v.lower() in NULL_TOKENS:
            return None
        v = v.rstrip("%").strip()
        try:
            f = float(v)
        except ValueError:
            return None
        return None if math.isnan(f) or math.isinf(f) else f
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


# --------------------------------------------------------------------------
# Unit normalization
# --------------------------------------------------------------------------
# Conversion rules are versioned. Bump CONVERSION_VERSION whenever a rule
# changes, so historical outputs remain interpretable.
CONVERSION_VERSION = "1.1.0"

LBF_TO_KN = 0.0044482216152605
KLBF_TO_KN = 4.4482216152605           # 1 kip = 1000 lbf = 4.44822 kN
KLB_FT_TO_KNM = 1.3558179483314        # 1 klbf*ft = 1.35582 kN*m
PSI_TO_MPA = 0.006894757293168
FT_TO_M = 0.3048
PPG_TO_SG = 1.0 / 8.345404452          # SG = ppg / 8.345404452
GPM_TO_LPM = 3.785411784
BBL_TO_M3 = 0.158987294928             # US liquid barrel -> cubic metre
# DLS source unit is deg/100ft; the canonical reference interval is deg/30ft.
DLS_100FT_TO_30FT = 30.0 / 100.0
F_PER_HR_TO_M_PER_HR = FT_TO_M
C_TO_F = None  # not used; mud temperature is stored in degC after conversion


@dataclass
class Conversion:
    """One reversible unit conversion, recorded for provenance."""
    rule: str
    factor: float
    offset: float = 0.0
    from_unit: str = ""
    to_unit: str = ""

    def apply(self, v: float) -> float:
        return v * self.factor + self.offset


CONVERSIONS = {
    "lbf->kN":    Conversion("lbf->kN", LBF_TO_KN, 0.0, "lbf", "kN"),
    "klbs->kN":   Conversion("klbs->kN", KLBF_TO_KN, 0.0, "klbf", "kN"),
    "kft_lb->kN_m": Conversion("kft_lb->kN_m", KLB_FT_TO_KNM, 0.0, "klbf*ft", "kN*m"),
    "psi->MPa":   Conversion("psi->MPa", PSI_TO_MPA, 0.0, "psi", "MPa"),
    "ft->m":      Conversion("ft->m", FT_TO_M, 0.0, "ft", "m"),
    "ft_per_hr->m_per_hr": Conversion("ft_per_hr->m_per_hr", F_PER_HR_TO_M_PER_HR, 0.0, "ft/hr", "m/hr"),
    "ppg->SG":    Conversion("ppg->SG", PPG_TO_SG, 0.0, "ppg", "g/cm3"),
    "gal_per_min->L_per_min": Conversion("gal_per_min->L_per_min", GPM_TO_LPM, 0.0, "gal/min", "L/min"),
    "bbl->m3":    Conversion("bbl->m3", 0.158987294928, 0.0, "bbl", "m3"),
    "degF->degC": Conversion("degF->degC", 5.0 / 9.0, -32.0 * 5.0 / 9.0, "degF", "degC"),
    # deg/100ft -> deg/30ft. A DLS of 10 deg/100ft is 10 deg over 100 ft, so over
    # the 30 ft reference interval it is 10 * 30/100 = 3 deg/30ft.
    "deg_per_100ft->deg_per_30ft": Conversion("deg_per_100ft->deg_per_30ft",
                                              DLS_100FT_TO_30FT, 0.0,
                                              "deg/100ft", "deg/30ft"),
    # deg/100ft -> deg/30m. 30 m = 98.4252 ft, so 1 deg/100ft = 0.984252 deg/30m.
    "deg_per_100ft->deg_per_30m": Conversion("deg_per_100ft->deg_per_30m",
                                             30.0 / 30.48, 0.0, "deg/100ft", "deg/30m"),
}


def normalize(value, rule: str):
    """Return (normalized_value, conversion_rule) or (None, None) if not applicable."""
    v = to_float(value)
    if v is None:
        return None, None
    conv = CONVERSIONS.get(rule)
    if conv is None:
        raise KeyError(f"unknown conversion rule: {rule}")
    return conv.apply(v), conv.rule


# --------------------------------------------------------------------------
# Provenance record -- attached to every normalized measurement
# --------------------------------------------------------------------------
@dataclass
class Provenance:
    original_value: object = None
    original_unit: str = ""
    normalized_value: object = None
    normalized_unit: str = ""
    conversion_rule: str = ""
    conversion_version: str = CONVERSION_VERSION
    source: str = ""
    source_document: str = ""
    source_page: object = None
    confidence: object = None
    data_origin: str = PUBLIC_REAL
    notes: str = ""


# --------------------------------------------------------------------------
# CSV I/O -- always via the csv module so quoting is never hand-rolled
# --------------------------------------------------------------------------
def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as fh:
        return [dict(r) for r in csv.DictReader(fh)]


def write_csv(path: Path, rows: list[dict], fieldnames: list[str] | None = None) -> int:
    """Write rows to CSV with correct quoting. Returns row count written."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        fieldnames = list(rows[0].keys()) if rows else []
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore",
                           quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in fieldnames})
    return len(rows)


def blank_if_none(v) -> str:
    return "" if v is None else v


# --------------------------------------------------------------------------
# Canonical schema
# --------------------------------------------------------------------------
@dataclass
class Table:
    name: str
    columns: list[str]
    primary_key: list[str] = field(default_factory=list)
    foreign_keys: dict = field(default_factory=dict)
    required: list[str] = field(default_factory=list)
    min_rows_for_valid: int = 0
    description: str = ""


# Every populated table carries data_origin. Measurement tables additionally
# carry original-unit provenance so conversions are never irreversible.
_ORIGIN = ["data_origin"]
_PROV = ["source", "source_document", "source_page", "confidence"]

TABLES: dict[str, Table] = {
    # ---- original 8 canonical tables -------------------------------------
    "wells": Table(
        "wells",
        ["well_id", "source", "source_well_id", "well_name", "field", "basin",
         "country", "operator", "latitude", "longitude", "easting", "northing",
         "crs", "epsg", "block", "spud_date", "completion_date", "well_type",
         "well_status", "planned_td", "actual_td", "kb_elevation", "gl_elevation",
         "kb_elevation_unit", "data_origin"],
        primary_key=["well_id"], required=["well_id", "well_name", "data_origin"],
        min_rows_for_valid=1, description="One row per well (surface identity).",
    ),
    "wellbores": Table(
        "wellbores",
        ["wellbore_id", "well_id", "wellbore_name", "wellbore_type",
         "sidetrack_number", "parent_wellbore_id", "kickoff_depth", "td_md",
         "td_tvd", "status", "data_origin"],
        primary_key=["wellbore_id"], foreign_keys={"well_id": "wells"},
        required=["wellbore_id", "well_id", "data_origin"],
        min_rows_for_valid=1, description="One row per wellbore / sidetrack.",
    ),
    "trajectories": Table(
        "trajectories",
        ["wellbore_id", "md", "tvd", "tvdss", "inclination", "azimuth",
         "northing", "easting", "dogleg_severity", "build_rate", "turn_rate",
         "survey_time", "vertical_section", "depth_source", "crs", "epsg",
         "original_depth_unit", "conversion_rule", "source", "data_origin"],
        primary_key=["wellbore_id", "md"], foreign_keys={"wellbore_id": "wellbores"},
        required=["wellbore_id", "md", "data_origin"],
        min_rows_for_valid=1,
        description="Directional survey stations. md/tvd/tvdss in metres.",
    ),
    "formations": Table(
        "formations",
        ["wellbore_id", "formation_name", "formation_alias", "top_md", "base_md",
         "top_tvd", "base_tvd", "top_tvdss", "base_tvdss", "lithology",
         "formation_group", "vocabulary_id", "source", "source_document",
         "source_page", "confidence", "data_origin"],
        primary_key=["wellbore_id", "formation_name", "top_md"],
        foreign_keys={"wellbore_id": "wellbores"},
        required=["wellbore_id", "formation_name", "data_origin"],
        min_rows_for_valid=1, description="Formation intervals (top/base), not picks.",
    ),
    "lithology": Table(
        "lithology",
        ["wellbore_id", "md", "formation", "lithology", "lithology_group",
         "source", "source_document", "source_page", "confidence", "data_origin"],
        primary_key=["wellbore_id", "md", "lithology"],
        foreign_keys={"wellbore_id": "wellbores"},
        required=["wellbore_id", "data_origin"], min_rows_for_valid=1,
        description="Lithology at depth.",
    ),
    "drilling_timeseries": Table(
        "drilling_timeseries",
        ["timestamp", "wellbore_id", "run_id", "md", "tvd", "formation",
         "rig_state", "rop", "wob", "rpm", "torque", "hookload", "drag",
         "flow_in", "flow_out", "pump_rate", "standpipe_pressure", "ecd",
         "mud_weight", "pit_volume", "gas_total", "h2s", "original_units",
         "conversion_rule", "conversion_version", "source", "data_origin"],
        primary_key=["timestamp", "wellbore_id"],
        foreign_keys={"wellbore_id": "wellbores", "run_id": "drilling_runs"},
        required=["wellbore_id", "data_origin"], min_rows_for_valid=1,
        description="Time-indexed drilling sensor samples, SI units.",
    ),
    "events": Table(
        "events",
        ["event_id", "wellbore_id", "event_type", "event_subtype", "start_time",
         "end_time", "start_md", "end_md", "start_tvd", "end_tvd", "formation",
         "severity", "cause", "mitigation", "outcome", "npt_hours",
         "depth_source", "formation_relative_depth", "frd_reason_code",
         "source_document", "source_page", "source", "confidence",
         "extraction_method", "data_origin"],
        primary_key=["event_id"], foreign_keys={"wellbore_id": "wellbores"},
        required=["event_id", "wellbore_id", "event_type", "data_origin"],
        min_rows_for_valid=1,
        description="Operational/drilling events extracted from source documents.",
    ),
    "documents": Table(
        "documents",
        ["document_id", "wellbore_id", "document_type", "document_name", "source",
         "url", "file_path", "checksum", "checksum_algorithm", "file_size_bytes",
         "page_count", "publication_date", "download_date", "license", "data_origin"],
        primary_key=["document_id"], foreign_keys={"wellbore_id": "wellbores"},
        required=["document_id", "data_origin"], min_rows_for_valid=1,
        description="One row per source document; the event->page join point.",
    ),

    # ---- entities added by the schema audit (Phase 1) --------------------
    "drilling_runs": Table(
        "drilling_runs",
        ["run_id", "wellbore_id", "bit_id", "bha_id", "start_md", "end_md",
         "start_time", "end_time", "run_type", "section", "hole_diameter",
         "source", "source_document", "confidence", "data_origin"],
        primary_key=["run_id"], foreign_keys={"wellbore_id": "wellbores",
                                              "bit_id": "bits", "bha_id": "bha_runs"},
        required=["run_id", "wellbore_id", "data_origin"], min_rows_for_valid=1,
        description="One row per drilling run (tour). Prevents mixing samples "
                    "across bit/BHA/section changes.",
    ),
    "casings": Table(
        "casings",
        ["casing_id", "wellbore_id", "run_id", "casing_type", "size", "weight",
         "grade", "shoe_md", "shoe_tvd", "top_md", "top_tvd", "hole_section",
         "hole_diameter", "set_time", "lot", "nominal_weight", "source",
         "source_document", "source_page", "confidence", "data_origin"],
        primary_key=["casing_id"], foreign_keys={"wellbore_id": "wellbores",
                                                "run_id": "drilling_runs"},
        required=["casing_id", "wellbore_id", "data_origin"], min_rows_for_valid=1,
        description="Casing / liner intervals.",
    ),
    "bha_runs": Table(
        "bha_runs",
        ["bha_id", "wellbore_id", "run_id", "bha_type", "bha_description",
         "start_md", "end_md", "start_time", "end_time", "source",
         "source_document", "source_page", "confidence", "data_origin"],
        primary_key=["bha_id"], foreign_keys={"wellbore_id": "wellbores",
                                              "run_id": "drilling_runs"},
        required=["bha_id", "wellbore_id", "data_origin"], min_rows_for_valid=1,
        description="Bottom-hole assembly per run.",
    ),
    "bits": Table(
        "bits",
        ["bit_id", "bha_id", "wellbore_id", "bit_type", "diameter", "diameter_unit",
         "iadc_code", "nozzle_count", "start_md", "end_md", "source",
         "source_document", "confidence", "data_origin"],
        primary_key=["bit_id"], foreign_keys={"bha_id": "bha_runs",
                                              "wellbore_id": "wellbores"},
        required=["bit_id", "data_origin"], min_rows_for_valid=1,
        description="Bit record per run.",
    ),
    "mud_properties": Table(
        "mud_properties",
        ["wellbore_id", "timestamp", "md", "mud_type", "mud_weight", "mud_weight_unit",
         "plastic_viscosity", "yield_point", "funnel_viscosity", "gel_10s",
         "gel_10m", "gel_30m", "filtrate", "cake", "ph", "es", "solids_pct",
         "oil_pct", "water_pct", "sand_pct", "lgs_pct", "chloride", "calcium",
         "low_solids_solids", "excess_los", "chlorine", "cacl2", "mud_temperature",
         "in_pit", "out_pit", "losses", "original_units", "conversion_rule",
         "source", "source_document", "source_page", "confidence", "data_origin"],
        primary_key=["wellbore_id", "timestamp"], foreign_keys={"wellbore_id": "wellbores"},
        required=["wellbore_id", "data_origin"], min_rows_for_valid=1,
        description="Mud properties. Only populate what the source reports.",
    ),
    "mud_temperature_depth": Table(
        "mud_temperature_depth",
        ["record_id", "wellbore_id", "md", "depth_reference", "log_date",
         "mud_temp_in", "mud_temp_out", "original_units", "conversion_rule",
         "conversion_version", "source", "source_file", "null_code",
         "confidence", "data_origin"],
        # The natural key includes source_file on purpose. Several LAS logs
        # share a log_date AND overlap in depth, so (wellbore, log_date, md)
        # is NOT unique -- measured over the real ingest it collapses 457,104
        # rows into 243,965 keys, i.e. 179,421 collisions that would silently
        # destroy samples. source_file is what makes the grain well defined.
        primary_key=["wellbore_id", "log_date", "source_file", "md"],
        foreign_keys={"wellbore_id": "wellbores"},
        required=["record_id", "wellbore_id", "md", "depth_reference",
                  "data_origin"],
        min_rows_for_valid=0,
        description=(
            "Depth-indexed mud temperature from FORGE LAS logs. NOT "
            "time-indexed: log_date is the acquisition date of the LAS file, "
            "not a per-sample timestamp, and no timestamp is invented for the "
            "samples. Two channels are kept (mud_temp_in / mud_temp_out) "
            "because the source reports both. depth_reference records that md "
            "is measured depth; null_code records the LAS null value that was "
            "masked during ingest."),
    ),
    "cement_jobs": Table(
        "cement_jobs",
        ["cement_job_id", "wellbore_id", "casing_id", "job_type", "cement_type",
         "slurry_density", "slurry_density_unit", "volume", "volume_unit",
         "yield_value", "pump_rate", "pump_rate_unit", "pressure", "pressure_unit",
         "placement_time", "top_md", "bottom_md", "losses", "result",
         "source", "source_document", "source_page", "confidence", "data_origin"],
        primary_key=["cement_job_id"], foreign_keys={"wellbore_id": "wellbores",
                                                     "casing_id": "casings"},
        required=["cement_job_id", "wellbore_id", "data_origin"], min_rows_for_valid=1,
        description="Cementing jobs. Do not invent slurry properties.",
    ),
    "reservoirs": Table(
        "reservoirs",
        ["reservoir_id", "wellbore_id", "reservoir_name", "top_md", "base_md",
         "top_tvd", "base_tvd", "net_pay", "porosity", "permeability",
         "pressure", "fluid_contact_md", "source", "confidence", "data_origin"],
        primary_key=["reservoir_id"], foreign_keys={"wellbore_id": "wellbores"},
        required=["reservoir_id", "wellbore_id", "data_origin"], min_rows_for_valid=0,
        description="Reservoir intervals. Empty is expected for public sources.",
    ),
    "locations": Table(
        "locations",
        ["location_id", "wellbore_id", "location_type", "latitude", "longitude",
         "x", "y", "x_unit", "y_unit", "crs", "epsg", "datum", "kb_elevation",
         "gl_elevation", "elevation_unit", "source", "confidence", "data_origin"],
        primary_key=["location_id"], foreign_keys={"wellbore_id": "wellbores"},
        required=["location_id", "wellbore_id", "crs", "data_origin"],
        min_rows_for_valid=1,
        description="Explicit CRS-bearing locations. Distances must not be "
                    "computed without a known CRS.",
    ),
}

# Tables expected to hold real records for a dataset to be considered VALID.
CORE_TABLES = ["wells", "wellbores", "documents"]
# Tables that are legitimately empty for some sources (e.g. no reservoir data).
OPTIONAL_TABLES = ["reservoirs", "cement_jobs", "bits", "bha_runs", "casings",
                   "mud_properties", "drilling_runs", "trajectories",
                   "formations", "lithology", "drilling_timeseries", "events",
                   "mud_temperature_depth"]

# Tables that are DEPTH-indexed rather than time-indexed. Their grain is
# one row per (log, source file, measured depth); they deliberately carry no
# timestamp column and none is invented for them. Validators must therefore
# not treat a missing timestamp as a defect, and must not join them to
# time-keyed tables on time.
DEPTH_INDEXED_TABLES = ["mud_temperature_depth"]


def table_path(name: str) -> Path:
    return PROCESSED / f"{name}.csv"


def load_table(name: str) -> list[dict]:
    return read_csv(table_path(name))


def save_table(name: str, rows: list[dict]) -> int:
    t = TABLES[name]
    return write_csv(table_path(name), rows, t.columns)


# --------------------------------------------------------------------------
# Depth policy (Phase 5) -- see docs/depth_policy.md
# --------------------------------------------------------------------------
SURVEYED = "SURVEYED"
INTERPOLATED = "INTERPOLATED"
NOT_APPLICABLE = "NOT_APPLICABLE"


def interpolate_tvd(md: float, stations: list[tuple[float, float]]) -> tuple[float | None, str]:
    """Linearly interpolate TVD at md from [(md, tvd), ...] sorted by md.

    Returns (tvd, depth_source). Returns (None, NOT_APPLICABLE) when md is
    outside the surveyed interval -- extrapolation is never silently performed.
    """
    if md is None or not stations:
        return None, NOT_APPLICABLE
    st = sorted(stations)
    if md < st[0][0] or md > st[-1][0]:
        return None, NOT_APPLICABLE
    for i in range(len(st) - 1):
        m0, t0 = st[i]
        m1, t1 = st[i + 1]
        if m0 <= md <= m1:
            if abs(m1 - m0) < 1e-9:
                return t0, SURVEYED
            frac = (md - m0) / (m1 - m0)
            return t0 + frac * (t1 - t0), INTERPOLATED
    return None, NOT_APPLICABLE


def tvdss_from_tvd(tvd: float | None, kb_elev_m: float | None) -> float | None:
    """TVDSS = TVD - KB elevation, both in metres. Datum: rotary Kelly bushing."""
    if tvd is None or kb_elev_m is None:
        return None
    return tvd - kb_elev_m


def formation_relative_depth(depth, top, base) -> tuple[float | None, str]:
    """(z - z_top) / (z_base - z_top). NULL + reason code when undefined."""
    if depth is None or top is None or base is None:
        return None, "MISSING_INPUT"
    span = base - top
    if abs(span) < 1e-9:
        return None, "ZERO_THICKNESS"
    return (depth - top) / span, "OK"


# --------------------------------------------------------------------------
# Event ontology (Phase 3.4) -- see data/event_types.csv
# --------------------------------------------------------------------------
@dataclass
class EventRule:
    canonical: str
    pattern: str
    confidence: str
    exclude: str = ""      # regex that suppresses a match (false-positive guard)
    note: str = ""


# Exclusion guards are essential: a naive keyword scan over these DDRs yields
# "kick off drilling" (resume drilling) and "packoff" (casing wellhead component),
# neither of which is a drilling hazard.
EVENT_RULES: list[EventRule] = [
    EventRule("STUCK_PIPE", r"\bstuck\b|\btight hole\b|\bpulling tight\b|"
              r"\bpulled tight\b|\bworking tight\b|\boverpull(?:ing)?\b",
              "high", exclude=r"packoff|pack-off tool|stuck roll",
              note="overpull + pumps on a tight interval is a stuck-pipe indicator"),
    EventRule("PACK_OFF", r"\bpack-?off\b",
              "low", exclude=r"casing pack-?off|pack-?off body|pack-?off flange|"
                                r"install(?:ed|ing)? pack-?off|insert pack-?off|"
                                r"hanger pack-?off|pack-?off and flange",
              note="casing/wellhead pack-off is NOT a stuck-pipe pack-off"),
    EventRule("WASHOUT", r"\bwash-?out\b|\bhole wash-?out\b", "high",
              note="'3% hole washout' is a direct washout report"),
    EventRule("KICK", r"\bkick\b|\bgas influx\b|\binflux\b|\bblowout\b",
              "low", exclude=r"kick off drill|kick off drilling|kick off at|"
                                r"kicked off|kick-?off drill",
              note="EXCLUDE 'kick off drilling' = resume drilling, not an influx"),
    EventRule("MUD_LOSS", r"\blost circulation\b|\bmud loss\b|\blosing mud\b|"
              r"\blost returns\b|\bno returns\b", "high",
              exclude=r"no losses\b|losses?\s*[:=]\s*0(?:\.0+)?\b",
              note="exclude explicit 'no losses' negations"),
    EventRule("WELLBORE_INSTABILITY", r"\bhole collapse\b|\bwash-?out\b|"
              r"\bcavings\b|\bkeyseating\b|\bkey seat\b|\bwall slough", "medium"),
    EventRule("CEMENT_FAILURE", r"\bno cement\b|\bcement.{0,30}\bfail|"
              r"\bcement.{0,20}\bmiss(?:ing|ed)?\b|\bcement.{0,20}\bto surface\b",
              "low", note="'cement to surface' is often a RESULT not a failure"),
    EventRule("EQUIPMENT_FAILURE", r"\btroubleshoot\b|\bequipment problem|"
              r"\bbad encoder\b|\bwaited on\b|\bwaiting on\b|\bblower motor\b|"
              r"\btool would not\b|\bno signal\b|\bquit working\b|\bbroke\b",
              "medium", note="surface equipment / tool failures; real NPT drivers"),
    EventRule("NPT", r"\bnon-?productive time\b|\bNPT\b", "medium"),
]

# Severity is deliberately conservative: we only claim what the text supports.
SEVERITY_RULES = [
    ("critical", r"\bblowout\b|\bwell control\b|\bkill(?:ed|ing)? the well\b|"
                 r"\bshut(?:ting)? in\b.*\bwell\b|\bflare\b"),
    ("high", r"\blost circulation\b|\bstuck\b|\btight hole\b|\bwash-?out\b|"
             r"\bkick\b(?! off)|\binflux\b|\bno returns\b"),
    ("medium", r"\btroubleshoot\b|\bequipment problem\b|\bbad encoder\b|"
               r"\bno cement\b|\btool would not\b|\bquit working\b"),
]


def classify_severity(text: str) -> str:
    low = text.lower()
    for level, pat in SEVERITY_RULES:
        if re.search(pat, low):
            return level
    return "low"


def detect_events(text: str) -> list[tuple[str, str, str]]:
    """Return [(canonical_type, matched_text, confidence)] for a text block.

    Candidate generation only. A hit is NOT a verified label; every extracted
    event keeps extraction_method + confidence so a reviewer can audit it.
    """
    out: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for rule in EVENT_RULES:
        for m in re.finditer(rule.pattern, text, re.I):
            frag = m.group(0)
            if rule.exclude and re.search(rule.exclude, text[max(0, m.start() - 90):
                                                             m.end() + 90], re.I):
                continue
            if rule.canonical in seen:
                continue
            seen.add(rule.canonical)
            out.append((rule.canonical, frag, rule.confidence))
            break
    return out


# --------------------------------------------------------------------------
# Depth extraction from DDR free text
# --------------------------------------------------------------------------
_DEPTH_RE = re.compile(
    r"(?:from|f|t)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:'|ft|feet|\bMD\b)", re.I)
_DEPTH_FT = re.compile(r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*'")


def extract_depths_ft(text: str) -> list[float]:
    """Extract depth values in FEET from DDR narrative text. Returns sorted list."""
    out: list[float] = []
    for m in _DEPTH_FT.finditer(text):
        try:
            v = float(m.group(1).replace(",", ""))
        except ValueError:
            continue
        if 0 <= v < 60000:            # plausible well depth in ft
            out.append(v)
    return sorted(set(out))
