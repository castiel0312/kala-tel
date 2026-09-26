"""Governance tests for the canonical dataset and read API.

These tests assert the project's non-negotiable rules: absent data stays
absent, provenance survives, depth limits are respected, and the dataset
reports its own incompleteness rather than hiding it.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
sys.path.insert(0, str(REPO / "scripts" / "api"))

from nwis_lib import (  # noqa: E402
    DATASET_VERSION,
    ENTITY_STATUS,
    PROCESSED,
    SOURCE_NOT_AVAILABLE,
    TABLES,
)

VAL_JSON = REPO / "reports" / "validation.json"


def read(name: str) -> tuple[list[str], list[dict[str, str]]]:
    path = PROCESSED / f"{name}.csv"
    if not path.exists():
        return [], []
    with open(path, newline="", encoding="utf-8") as fh:
        r = csv.DictReader(fh)
        return list(r.fieldnames or []), list(r)


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient
    from nwis_api import app

    return TestClient(app)


# ---------------------------------------------------------------------------
# Dataset identity
# ---------------------------------------------------------------------------
def test_dataset_version_is_frozen():
    assert DATASET_VERSION == "nwis-forge16b-v0.2"


def test_absent_entities_declared_not_silently_omitted():
    for name in ("formations", "bits", "cement_jobs", "reservoirs"):
        assert ENTITY_STATUS[name] == SOURCE_NOT_AVAILABLE
        assert len(read(name)[1]) == 0


# ---------------------------------------------------------------------------
# No fabrication
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("name", [t for t in TABLES])
def test_no_synthetic_data(name: str):
    _, rows = read(name)
    origins = {r.get("data_origin") for r in rows if r.get("data_origin")}
    assert not (origins & {"SYNTHETIC", "INJECTED_EVENT"}), (
        f"{name} contains non-real origins: {origins}"
    )


@pytest.mark.parametrize("name", [t for t in TABLES])
def test_populated_rows_carry_provenance(name: str):
    _, rows = read(name)
    if not rows:
        pytest.skip(f"{name} is empty by design")
    missing = [i for i, r in enumerate(rows) if not r.get("data_origin")]
    assert not missing, f"{name}: {len(missing)} rows missing data_origin"


def test_no_invented_timezone():
    """Sources declare none, so a UTC marker would be a fabrication."""
    _, rows = read("events")
    assert rows
    for r in rows:
        for col in ("start_time", "end_time"):
            v = r.get(col) or ""
            assert not v.endswith("Z"), f"{col} has an invented UTC offset"
            assert "+" not in v[10:], f"{col} has an invented offset"


def test_no_invented_epsg():
    _, rows = read("trajectories")
    assert rows
    for r in rows:
        assert not r.get("epsg"), "EPSG must stay null; it is not published"
        assert r.get("crs"), "CRS name is retained"


def test_tvd_not_extrapolated_beyond_survey():
    """Rows below the last survey station must have no TVD."""
    _, traj = read("trajectories")
    _, ts = read("drilling_timeseries")
    last_station = max(float(r["md"]) for r in traj if r.get("md"))
    beyond = [r for r in ts if r.get("md") and float(r["md"]) > last_station]
    assert beyond, "expected drilling rows past the last survey station"
    with_tvd = [r for r in beyond if r.get("tvd")]
    assert not with_tvd, (
        f"{len(with_tvd)} rows beyond the survey limit carry a TVD value"
    )


def test_md_tvd_tvdss_remain_separate():
    cols, _ = read("trajectories")
    assert "md" in cols and "tvd" in cols and "tvdss" in cols


# ---------------------------------------------------------------------------
# Integrity
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("name", [t for t in TABLES])
def test_primary_key_unique_and_present(name: str):
    spec = TABLES[name]
    _, rows = read(name)
    if not rows:
        pytest.skip(f"{name} is empty by design")
    keys = [tuple(r.get(c, "") for c in spec.primary_key) for r in rows]
    assert all(all(k != "" for k in key) for key in keys), (
        f"{name} has null primary-key components"
    )
    assert len(set(keys)) == len(keys), f"{name} has duplicate primary keys"


@pytest.mark.parametrize("name", [t for t in TABLES])
def test_foreign_keys_resolve(name: str):
    spec = TABLES[name]
    _, rows = read(name)
    if not rows:
        pytest.skip(f"{name} is empty by design")
    for col, target in spec.foreign_keys.items():
        parent_pk = TABLES[target].primary_key
        if len(parent_pk) != 1:
            pytest.skip(f"{target} has a composite primary key")
        _, parents = read(target)
        valid = {p.get(parent_pk[0]) for p in parents}
        orphans = [r for r in rows if r.get(col) and r[col] not in valid]
        assert not orphans, f"{name}.{col} has {len(orphans)} orphan values"


# ---------------------------------------------------------------------------
# Depth-indexed mud temperature
# ---------------------------------------------------------------------------
def test_mud_temperature_depth_complete():
    cols, rows = read("mud_temperature_depth")
    assert len(rows) == 457_104, f"expected 457104 rows, got {len(rows)}"
    assert "md" in cols
    assert all(r.get("md") for r in rows), "null MD in mud temperature log"


def test_mud_temperature_keeps_both_channels():
    cols, rows = read("mud_temperature_depth")
    assert "mud_temp_in" in cols and "mud_temp_out" in cols
    assert any(r.get("mud_temp_in") for r in rows)
    assert any(r.get("mud_temp_out") for r in rows)


def test_mud_temperature_log_date_is_not_a_fabricated_timestamp():
    cols, _ = read("mud_temperature_depth")
    assert "log_date" in cols
    assert "timestamp" not in cols, (
        "per-sample timestamps must not be invented for LAS data"
    )


# ---------------------------------------------------------------------------
# API contract
# ---------------------------------------------------------------------------
def test_api_lists_wells(client):
    r = client.get("/api/wells")
    assert r.status_code == 200
    body = r.json()
    assert body and body[0]["well_id"] == "FORGE16B7832"
    assert body[0]["data_origin"] == "PUBLIC_REAL"


def test_api_well_detail_includes_row_counts(client):
    body = client.get("/api/wells/FORGE16B7832").json()
    assert body["well_id"] == "FORGE16B7832"
    assert body["row_counts"]["drilling_timeseries"] == 124_497
    assert body["row_counts"]["mud_temperature_depth"] == 457_104
    assert body["wellbores"]
    assert body["locations"]


def test_api_trajectory_is_depth_ordered(client):
    body = client.get("/api/wells/FORGE16B7832/trajectory").json()
    assert body
    mds = [p["md"] for p in body]
    assert mds == sorted(mds)


def test_api_timeseries_paginates(client):
    body = client.get("/api/wells/FORGE16B7832/timeseries?limit=10").json()
    assert body["count"] == 124_497
    assert len(body["items"]) == 10
    assert body["offset"] == 0


def test_api_timeseries_channel_filter(client):
    body = client.get(
        "/api/wells/FORGE16B7832/timeseries?channel=flow_in&limit=1"
    ).json()
    assert body["count"] == 0, "flow_in is a null column and must report 0"


def test_api_timeseries_rejects_unknown_channel(client):
    r = client.get("/api/wells/FORGE16B7832/timeseries?channel=nope")
    assert r.status_code == 422


def test_api_events_are_keyed_to_the_well(client):
    body = client.get("/api/wells/FORGE16B7832/events").json()
    assert len(body) == 44
    assert all(e["wellbore_id"] == "FORGE16B7832-01" for e in body)
    assert all(e["source_document"] for e in body), "events need provenance"


def test_api_event_detail_and_404(client):
    evs = client.get("/api/wells/FORGE16B7832/events").json()
    eid = evs[0]["event_id"]
    assert client.get(f"/api/events/{eid}").status_code == 200
    assert client.get("/api/events/does-not-exist").status_code == 404


def test_api_document_and_page_bounds(client):
    docs = client.get("/api/data-quality").json()
    assert docs["row_counts"]["documents"] == 219
    did = next(iter(__import__("nwis_api").table("documents")[1]))["document_id"]
    assert client.get(f"/api/documents/{did}").status_code == 200
    assert client.get(f"/api/documents/{did}/pages/0").status_code == 422
    assert client.get(f"/api/documents/{did}/pages/99999").status_code == 404


def test_api_reports_partial_state(client):
    body = client.get("/api/data-quality").json()
    assert body["state"] == "PARTIAL"
    assert body["dataset_version"] == DATASET_VERSION
    assert body["entities"]["bits"] == SOURCE_NOT_AVAILABLE


def test_api_nulls_absent_channels_rather_than_defaults(client):
    item = client.get(
        "/api/wells/FORGE16B7832/timeseries?limit=1"
    ).json()["items"][0]
    assert item["formation"] is None, "no source-backed formation intervals"
    assert item["flow_in"] is None
    assert item["data_origin"] == "PUBLIC_REAL"


def test_api_unknown_well_404(client):
    assert client.get("/api/wells/nope").status_code == 404


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "name", ["dataset_card", "schema_report", "dataset_quality_report",
             "provenance_report"]
)
def test_reports_exist(name: str):
    path = REPO / "reports" / f"{name}.md"
    assert path.is_file(), f"missing report {path}"
    text = path.read_text(encoding="utf-8")
    assert DATASET_VERSION in text, f"{name} does not name the dataset version"


def test_validator_state_is_partial():
    if not VAL_JSON.exists():
        pytest.skip(f"run `make validate` first; expected {VAL_JSON}")
    data = json.loads(VAL_JSON.read_text())
    assert data["state"] == "PARTIAL"
    assert not any(
        f["severity"] in {"CRITICAL", "HIGH"} for f in data["findings"]
    ), "no critical or high findings may be present"


# ---------------------------------------------------------------------------
# Data-quality endpoint reports the validator's own findings
# ---------------------------------------------------------------------------
def test_api_data_quality_surfaces_validator_findings(client):
    """The UI shows real findings, so the API must serve the validator's output
    rather than a re-derived or empty list."""
    if not VAL_JSON.exists():
        pytest.skip(f"run `make validate` first; expected {VAL_JSON}")
    body = client.get("/api/data-quality").json()
    on_disk = json.loads(VAL_JSON.read_text())

    assert body["findings"], "findings must not be empty when the report has some"
    assert len(body["findings"]) == len(on_disk["findings"])
    assert body["findings_source"], "the artifact backing the findings must be named"

    tallied: dict[str, int] = {}
    for f in body["findings"]:
        tallied[f["severity"]] = tallied.get(f["severity"], 0) + 1
    assert body["severity_counts"] == tallied
    assert body["severity_counts"].get("CRITICAL", 0) == 0
    assert body["severity_counts"].get("HIGH", 0) == 0


def test_api_data_quality_every_advisory_is_non_fatal(client):
    body = client.get("/api/data-quality").json()
    for f in body["findings"]:
        assert f["fatal"] is False, (
            f"{f['check']} is {f['severity']} and would contradict the PARTIAL state"
        )


def test_api_well_detail_counts_every_table(client):
    body = client.get("/api/wells/FORGE16B7832").json()
    assert set(body["row_counts"]) == set(TABLES)
    assert body["row_counts"]["drilling_timeseries"] > 0
    assert body["row_counts"]["formations"] == 0


# ---------------------------------------------------------------------------
# Events resolve to a well, so the UI can link without guessing id mappings
# ---------------------------------------------------------------------------
def test_api_events_carry_resolved_well_id(client):
    well_ids = {w["well_id"] for w in client.get("/api/wells").json()}
    for path in ("/api/wells/FORGE16B7832/events",
                 "/api/events/FORGE16B7832-01-EVT-00001"):
        body = client.get(path).json()
        events = body if isinstance(body, list) else [body]
        assert events, f"{path} returned no events"
        for e in events:
            assert e["well_id"] in well_ids, (
                f"event {e['event_id']} resolves to unknown well {e['well_id']!r}"
            )


def test_api_events_report_missing_start_depth_as_null(client):
    """No start depth may be invented where the source records only the end."""
    for e in client.get("/api/wells/FORGE16B7832/events").json():
        assert e["start_md"] is None
        assert e["end_md"] is not None
        assert e["start_tvd"] is None and e["end_tvd"] is None


def test_api_timeseries_returns_numbers_not_csv_strings(client):
    """Guard against Paged degrading to list[Any].

    With untyped items the raw CSV text reaches the client and every chart
    silently renders nothing, because the frontend tests for typeof === "number".
    """
    items = client.get(
        "/api/wells/FORGE16B7832/timeseries?limit=200"
    ).json()["items"]
    numeric = ("md", "tvd", "rop", "wob", "rpm", "hookload",
               "pump_rate", "standpipe_pressure", "pit_volume")
    seen = 0
    for row in items:
        for col in numeric:
            v = row[col]
            assert v is None or isinstance(v, int | float), (
                f"{col} came back as {type(v).__name__}: {v!r}"
            )
            if v is not None:
                seen += 1
    assert seen > 0, "no numeric drilling values were returned at all"


def test_api_timeseries_depth_bound_matches_survey_floor(client):
    """Timeseries TVD stops at the survey floor; nothing is extrapolated past it."""
    traj = client.get("/api/wells/FORGE16B7832/trajectory").json()
    floor = max(p["md"] for p in traj)
    page = client.get(
        "/api/wells/FORGE16B7832/timeseries?offset=120000&limit=5000"
    ).json()["items"]
    deep = [r for r in page if r["md"] is not None and r["md"] > floor]
    for r in deep:
        assert r["tvd"] is None, f"TVD must be null below the survey floor at {r['md']} m"
