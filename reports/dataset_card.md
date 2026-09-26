# Dataset Card: nwis-forge16b-v0.2

- **Dataset version:** `nwis-forge16b-v0.2`
- **Status:** `PARTIAL`
- **Generated:** 2026-09-26T13:02:58Z
- **Conversion rules:** `1.1.0`
- **Canonical tables:** 17 (13 populated, 4 empty)
- **Total canonical rows:** 583,030

## Purpose

Single-well public reference dataset for FORGE 16B(78)-32, a Utah
FORGE geothermal test well. It exists to make measured drilling,
survey, mud, and document data programmatically reviewable, and to
make the boundaries of that data explicit rather than implied.

## Provenance

- Every populated record carries `data_origin` and `source`.
- All populated rows are `PUBLIC_REAL`; nothing is synthetic.
- No raw file was modified by the pipeline.
- Documents resolved: **219**
- With checksum recorded: **219** (100.0%)
- With local file path: **219** (100.0%)
- With public URL: **219** (100.0%)
- Document types: {'DDR': 215, 'ALT': 4}
- Licences: {'CC-BY-4.0': 219}

## What the data does NOT contain

These are absent because no defensible source exists, not because of
an unfinished pipeline step:

- `bits`: `SOURCE_NOT_AVAILABLE` - no bit identity, type, IADC, or run interval records.
- `cement_jobs`: `SOURCE_NOT_AVAILABLE` - no machine-readable cement job records.
- `formations`: `SOURCE_NOT_AVAILABLE` - no formation tops/markers in the source set.
- `reservoirs`: `SOURCE_NOT_AVAILABLE` - no reservoir interval records.

Also unavailable: timezone (sources declare none), survey EPSG
(not published), and TVD for depths beyond the last survey station.

## Table inventory

| Table | Rows | PK | Role |
|---|---:|---|---|
| `wells` | 1 | `well_id` | core |
| `wellbores` | 1 | `wellbore_id` | core |
| `trajectories` | 428 | `wellbore_id, md` | optional |
| `formations` | 0 | `wellbore_id, formation_name, top_md` | optional |
| `lithology` | 65 | `wellbore_id, md, lithology` | optional |
| `drilling_timeseries` | 124,497 | `timestamp, wellbore_id` | optional |
| `events` | 44 | `event_id` | optional |
| `documents` | 219 | `document_id` | core |
| `drilling_runs` | 376 | `run_id` | optional |
| `casings` | 158 | `casing_id` | optional |
| `bha_runs` | 64 | `bha_id` | optional |
| `bits` | 0 | `bit_id` | optional |
| `mud_properties` | 72 | `wellbore_id, timestamp` | optional |
| `mud_temperature_depth` | 457,104 | `wellbore_id, log_date, source_file, md` | optional |
| `cement_jobs` | 0 | `cement_job_id` | optional |
| `reservoirs` | 0 | `reservoir_id` | optional |
| `locations` | 1 | `location_id` | optional |

## Available measurement channels

Channels with at least one non-null value. Anything not listed here
is not present in this dataset.

### `drilling_timeseries` (124,497 rows)

| Channel | Populated |
|---|---:|
| `md` | 124,496 |
| `tvd` | 104,863 |
| `rop` | 124,485 |
| `wob` | 124,496 |
| `rpm` | 123,474 |
| `hookload` | 124,425 |
| `pump_rate` | 124,462 |
| `standpipe_pressure` | 124,482 |
| `pit_volume` | 124,462 |
| `rig_state` | 124,497 |
| `run_id` | 8,458 |
| `timestamp` | 124,497 |

Present as columns but entirely null: `torque`, `drag`, `flow_in`, `flow_out`, `ecd`, `mud_weight`, `gas_total`, `h2s`, `formation`

### `trajectories` (428 rows)

| Channel | Populated |
|---|---:|
| `md` | 428 |
| `tvd` | 428 |
| `tvdss` | 428 |
| `inclination` | 428 |
| `azimuth` | 428 |
| `dogleg_severity` | 428 |
| `northing` | 428 |
| `easting` | 428 |
| `survey_time` | 428 |

Present as columns but entirely null: `build_rate`, `turn_rate`

### `mud_temperature_depth` (457,104 rows)

| Channel | Populated |
|---|---:|
| `md` | 457,104 |
| `mud_temp_in` | 445,710 |
| `mud_temp_out` | 456,488 |

### `mud_properties` (72 rows)

| Channel | Populated |
|---|---:|
| `md` | 72 |
| `mud_type` | 72 |
| `mud_weight` | 72 |

Present as columns but entirely null: `plastic_viscosity`, `yield_point`, `funnel_viscosity`, `gel_10s`, `gel_10m`, `gel_30m`, `filtrate`, `cake`, `ph`, `es`, `solids_pct`, `oil_pct`, `water_pct`, `sand_pct`, `lgs_pct`, `chloride`, `calcium`, `excess_los`, `mud_temperature`, `in_pit`, `out_pit`, `losses`

## Validation summary

- Severity counts: {'MEDIUM': 8, 'LOW': 1}
- Findings total: 9

Advisory findings about absent optional entities are expected and are
the mechanism by which the dataset reports its own limits.

## Intended use

- Reference for engineering and data-quality review.
- Grounding for tooling that must distinguish measured from absent.

## Out of scope

- Production prediction, eRTMAC, or ML.
- Multi-well or cross-well inference.
- Any claim that absent data was measured.
