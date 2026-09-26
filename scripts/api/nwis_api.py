"""Read-only FastAPI service over the canonical NWIS tables.

Governance rules this service must not break:
  * Nothing is invented. Absent data is served as null, never as a default.
  * Every payload carries ``data_origin`` and ``source`` so a consumer can
    tell measured data from absent data.
  * Depth limits are honoured: no TVD is returned beyond the last survey
    station.
  * Absent entities (bits, formations, cement_jobs, reservoirs) are reported
    as unavailable rather than omitted silently.
  * Ties are reported via /api/data-quality so "PARTIAL" is visible in the
    product, not just in a report file.
"""
from __future__ import annotations

import csv
import json
import math
import sys
from collections.abc import Iterator
from functools import cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nwis_lib import (  # noqa: E402
    CONVERSION_VERSION,
    DATASET_VERSION,
    ENTITY_STATUS,
    PROCESSED,
    REPORTS,
    SENTINELS,
    SOURCE_NOT_AVAILABLE,
    TABLES,
)

VALIDATION_JSON = REPORTS / "validation.json"

app = FastAPI(
    title="NWIS Canonical Read API",
    version=DATASET_VERSION,
    description=(
        "Read-only API over the frozen canonical dataset. All populated "
        "records are PUBLIC_REAL. Absent data is returned as null."
    ),
)


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def _to_cell(value: str) -> str | None:
    """Normalize a CSV cell without changing its type.

    Cells stay strings; pydantic performs the coercion per-field. Coercing
    here would turn ``source_page`` "1" into an int and break string fields.
    Empty cells become None. Nothing else is altered.
    """
    v = (value or "").strip()
    return v or None


def num(value: Any) -> float | None:
    """Numeric view of a cell, treating declared sentinels as absent."""
    if value is None or isinstance(value, str):
        try:
            f = float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None
        if math.isnan(f) or math.isinf(f) or f in SENTINELS:
            return None
        return f
    return float(value)


def _read(name: str) -> tuple[list[str], list[dict[str, Any]]]:
    path = PROCESSED / f"{name}.csv"
    if not path.exists():
        return [], []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        cols = list(reader.fieldnames or [])
        rows = [{k: _to_cell(v) for k, v in r.items()} for r in reader]
    return cols, rows


@cache
def table(name: str) -> tuple[tuple[str, ...], tuple[dict[str, Any], ...]]:
    cols, rows = _read(name)
    return tuple(cols), tuple(rows)


def row_count(name: str) -> int:
    return len(table(name)[1])


def find(name: str, key: str, value: str) -> dict[str, Any] | None:
    for r in table(name)[1]:
        if str(r.get(key)) == str(value):
            return r
    return None


def filter_by(rows: tuple[dict[str, Any], ...], **eq: Any) -> Iterator[dict]:
    for r in rows:
        if all(str(r.get(k)) == str(v) for k, v in eq.items()):
            yield r


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Provenance(BaseModel):
    data_origin: str | None = Field(
        None, description="Always PUBLIC_REAL for populated records."
    )
    source: str | None = None


class WellOut(Provenance):
    well_id: str
    well_name: str | None = None
    field: str | None = None
    basin: str | None = None
    operator: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    crs: str | None = Field(None, description="CRS name; EPSG is null, not published.")
    epsg: int | None = None
    spud_date: str | None = None
    actual_td: float | None = None
    kb_elevation: float | None = None


class WellboreOut(Provenance):
    wellbore_id: str
    well_id: str
    wellbore_name: str | None = None
    wellbore_type: str | None = None
    td_md: float | None = None
    td_tvd: float | None = None
    status: str | None = None


class WellDetail(WellOut):
    wellbores: list[WellboreOut] = []
    locations: list[dict[str, Any]] = []
    row_counts: dict[str, int] = {}


class TrajectoryPoint(BaseModel):
    md: float
    tvd: float | None = None
    tvdss: float | None = None
    inclination: float | None = None
    azimuth: float | None = None
    dogleg_severity: float | None = None
    northing: float | None = None
    easting: float | None = None
    survey_time: str | None = None
    source: str | None = None
    data_origin: str | None = None


class TimeseriesOut(BaseModel):
    timestamp: str | None = None
    md: float | None = None
    tvd: float | None = None
    rig_state: str | None = None
    rop: float | None = None
    wob: float | None = None
    rpm: float | None = None
    hookload: float | None = None
    pump_rate: float | None = None
    standpipe_pressure: float | None = None
    pit_volume: float | None = None
    run_id: str | None = None
    formation: str | None = Field(
        None, description="Null: no source-backed formation intervals exist."
    )
    torque: float | None = None
    flow_in: float | None = None
    flow_out: float | None = None
    ecd: float | None = None
    mud_weight: float | None = None
    gas_total: float | None = None
    h2s: float | None = None
    original_units: str | None = None
    conversion_rule: str | None = None
    conversion_version: str | None = None
    source: str | None = None
    data_origin: str | None = None


class EventOut(Provenance):
    event_id: str
    wellbore_id: str
    # Resolved from the wellbores table so a consumer can link back to the
    # well-scoped routes without guessing the id mapping.
    well_id: str | None = None
    event_type: str
    event_subtype: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    start_md: float | None = Field(None, description="Null where source gives only end depth.")
    end_md: float | None = None
    start_tvd: float | None = None
    end_tvd: float | None = None
    formation: str | None = None
    severity: str | None = None
    cause: str | None = None
    mitigation: str | None = None
    outcome: str | None = None
    npt_hours: float | None = None
    depth_source: str | None = None
    source_document: str | None = None
    source_page: str | None = None
    confidence: str | None = None
    extraction_method: str | None = None


class DocumentOut(BaseModel):
    document_id: str
    wellbore_id: str | None = None
    document_type: str | None = None
    document_name: str | None = None
    source: str | None = None
    url: str | None = None
    file_path: str | None = None
    checksum: str | None = None
    checksum_algorithm: str | None = None
    file_size_bytes: int | None = None
    page_count: int | None = None
    publication_date: str | None = None
    download_date: str | None = None
    license: str | None = None
    data_origin: str | None = None


class DocumentPageOut(BaseModel):
    document_id: str
    page: int
    file_path: str | None = None
    checksum: str | None = None
    checksum_algorithm: str | None = None
    page_count: int | None = None
    exists: bool
    note: str


class ValidationFinding(BaseModel):
    """One finding as emitted by scripts/validate/dataset_validation.py.

    Sourced verbatim from reports/validation.json. The API never re-derives
    findings, so the validator stays the single source of truth for quality.
    """

    check: str
    severity: str
    table: str
    message: str
    evidence: str = ""
    n_affected: int = 0
    fatal: bool = True


class DataQualityOut(BaseModel):
    dataset_version: str
    state: str
    conversion_version: str
    row_counts: dict[str, int]
    total_rows: int
    entities: dict[str, str]
    notes: list[str]
    # Severity tallies. PARTIAL is a legitimate state, not an error, so the
    # counts are reported as-is instead of being collapsed into a pass/fail.
    severity_counts: dict[str, int] = {}
    findings: list[ValidationFinding] = []
    findings_source: str | None = None


class Paged(BaseModel):
    """Page of drilling samples.

    ``items`` is typed as TimeseriesOut rather than Any so pydantic coerces the
    numeric columns. With ``list[Any]`` the raw CSV strings would reach the
    client and every chart would see text where it expects a number.
    """

    count: int
    offset: int
    limit: int
    items: list[TimeseriesOut]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/wells", response_model=list[WellOut])
def list_wells() -> list[dict]:
    return list(table("wells")[1])


@app.get("/api/wells/{well_id}", response_model=WellDetail)
def get_well(well_id: str) -> dict:
    w = find("wells", "well_id", well_id)
    if w is None:
        raise HTTPException(404, f"well {well_id!r} not found")
    wb = list(filter_by(table("wellbores")[1], well_id=well_id))
    out = dict(w)
    out["wellbores"] = wb
    out["locations"] = [
        loc for b in wb for loc in filter_by(table("locations")[1],
                                             wellbore_id=b["wellbore_id"])
    ]
    out["row_counts"] = {n: row_count(n) for n in TABLES}
    return out


@app.get("/api/wells/{well_id}/trajectory", response_model=list[TrajectoryPoint])
def get_trajectory(well_id: str) -> list[dict]:
    rows = [r for b in filter_by(table("wellbores")[1], well_id=well_id)
            for r in filter_by(table("trajectories")[1],
                               wellbore_id=b["wellbore_id"])]
    return sorted(rows, key=lambda r: num(r.get("md")) or 0.0)


@app.get("/api/wells/{well_id}/timeseries", response_model=Paged)
def get_timeseries(
    well_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=20000),
    channel: str | None = Query(
        None, description="Return only rows where this column is non-null."
    ),
) -> dict:
    rows = [r for b in filter_by(table("wellbores")[1], well_id=well_id)
            for r in filter_by(table("drilling_timeseries")[1],
                               wellbore_id=b["wellbore_id"])]
    rows.sort(key=lambda r: (str(r.get("timestamp") or ""),
                             num(r.get("md")) or 0.0))
    if channel:
        cols = table("drilling_timeseries")[0]
        if channel not in cols:
            raise HTTPException(
                422,
                f"unknown channel {channel!r}; available: {', '.join(cols)}",
            )
        # A channel is "present" only if it holds a real value, not a sentinel.
        rows = [r for r in rows if num(r.get(channel)) is not None]
    return {
        "count": len(rows),
        "offset": offset,
        "limit": limit,
        "items": rows[offset: offset + limit],
    }


def well_id_for_wellbore(wellbore_id: str | None) -> str | None:
    b = find("wellbores", "wellbore_id", wellbore_id or "")
    return str(b["well_id"]) if b else None


def with_well_id(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["well_id"] = well_id_for_wellbore(row.get("wellbore_id"))
    return out


@app.get("/api/wells/{well_id}/events", response_model=list[EventOut])
def get_well_events(well_id: str) -> list[dict]:
    # events are keyed by wellbore_id, so resolve the well's borehole first.
    bores = [b["wellbore_id"] for b in filter_by(table("wellbores")[1],
                                                 well_id=well_id)]
    rows = [r for bore in bores
            for r in filter_by(table("events")[1], wellbore_id=bore)]
    return sorted((with_well_id(r) for r in rows),
                  key=lambda r: str(r.get("start_time") or ""))


@app.get("/api/events/{event_id}", response_model=EventOut)
def get_event(event_id: str) -> dict:
    e = find("events", "event_id", event_id)
    if e is None:
        raise HTTPException(404, f"event {event_id!r} not found")
    return with_well_id(e)


@app.get("/api/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: str) -> dict:
    d = find("documents", "document_id", document_id)
    if d is None:
        raise HTTPException(404, f"document {document_id!r} not found")
    return d


@app.get("/api/documents/{document_id}/pages/{page}", response_model=DocumentPageOut)
def get_document_page(document_id: str, page: int) -> dict:
    d = find("documents", "document_id", document_id)
    if d is None:
        raise HTTPException(404, f"document {document_id!r} not found")
    pc = num(d.get("page_count"))
    if page < 1:
        raise HTTPException(422, "page numbers are 1-based")
    if pc is not None and page > pc:
        raise HTTPException(
            404, f"page {page} beyond page_count {int(pc)} for {document_id!r}"
        )
    fp = d.get("file_path")
    path = (Path(__file__).resolve().parents[2] / fp) if fp else None
    exists = bool(path and path.is_file())
    return {
        "document_id": document_id,
        "page": page,
        "file_path": fp,
        "checksum": d.get("checksum"),
        "checksum_algorithm": d.get("checksum_algorithm"),
        "page_count": int(pc) if pc is not None else None,
        "exists": exists,
        "note": (
            "PDF located on disk; render client-side. No extracted text or "
            "page image is served by this API."
        ),
    }


@app.get("/api/data-quality", response_model=DataQualityOut)
def get_data_quality() -> dict:
    counts = {n: row_count(n) for n in TABLES}
    findings: list[dict[str, Any]] = []
    findings_source: str | None = None
    if VALIDATION_JSON.is_file():
        payload = json.loads(VALIDATION_JSON.read_text(encoding="utf-8"))
        findings = payload.get("findings", [])
        findings_source = str(VALIDATION_JSON.relative_to(REPORTS.parents[1]))

    severity_counts: dict[str, int] = {}
    for f in findings:
        sev = str(f.get("severity", "UNKNOWN"))
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return {
        "dataset_version": DATASET_VERSION,
        "state": "PARTIAL",
        "conversion_version": CONVERSION_VERSION,
        "row_counts": counts,
        "total_rows": sum(counts.values()),
        "entities": ENTITY_STATUS,
        "notes": [
            "PARTIAL is the correct status: sources do not support every "
            "canonical table.",
            f"{SOURCE_NOT_AVAILABLE} entities have no source coverage and are "
            "never back-filled.",
            "TVD is null beyond the last survey station; it is not extrapolated.",
            "Sources declare no timezone; timestamps are naive local.",
            "No survey EPSG is published; crs is given by name only.",
        ],
        "severity_counts": severity_counts,
        "findings": findings,
        "findings_source": findings_source,
    }
