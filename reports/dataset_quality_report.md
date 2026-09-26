# Data Quality Report: nwis-forge16b-v0.2

- **Status:** `PARTIAL`
- **Generated:** 2026-09-26T13:02:58Z
- **Total rows:** 583,030
- **Findings:** 9 ({'MEDIUM': 8, 'LOW': 1})

`PARTIAL` is the correct and expected status for this release. It
records that the sources do not support every canonical table, which
is more useful than reporting `VALID` and hiding the gaps.

## Findings

| Severity | Table | Check | Affected | Message |
|---|---|---|---:|---|
| MEDIUM | `formations` | `table_empty` | 0 | formations.csv has header only (0 rows) |
| MEDIUM | `bits` | `table_empty` | 0 | bits.csv has header only (0 rows) |
| MEDIUM | `cement_jobs` | `table_empty` | 0 | cement_jobs.csv has header only (0 rows) |
| MEDIUM | `reservoirs` | `table_empty` | 0 | reservoirs.csv has header only (0 rows) |
| MEDIUM | `drilling_runs` | `fk_parent_empty` | 0 | bit_id -> bits.bit_id cannot be checked: parent table is empty |
| LOW | `events` | `event_document_join` | 0 | all 44 linked events resolve to a document |
| MEDIUM | `events` | `depth_all_null` | 0 | column start_md is present but entirely null |
| MEDIUM | `events` | `depth_all_null` | 0 | column start_tvd is present but entirely null |
| MEDIUM | `events` | `depth_all_null` | 0 | column end_tvd is present but entirely null |

## Referential integrity

- Primary keys: clean (no finding raised)
- Null primary-key components: clean (no finding raised)
- Orphan foreign keys: clean (no finding raised)

## Column sparsity

Columns that exist in the schema but hold no data. A table can be
non-empty while carrying almost no information, so this is reported
separately from table-level row counts.

| Table | Column | Populated | Rows |
|---|---|---:|---:|
| `wells` | `epsg` | 0 | 1 |
| `wells` | `block` | 0 | 1 |
| `wells` | `completion_date` | 0 | 1 |
| `wells` | `well_status` | 0 | 1 |
| `wells` | `planned_td` | 0 | 1 |
| `wellbores` | `sidetrack_number` | 0 | 1 |
| `wellbores` | `parent_wellbore_id` | 0 | 1 |
| `wellbores` | `kickoff_depth` | 0 | 1 |
| `wellbores` | `status` | 0 | 1 |
| `trajectories` | `build_rate` | 0 | 428 |
| `trajectories` | `turn_rate` | 0 | 428 |
| `trajectories` | `epsg` | 0 | 428 |
| `lithology` | `formation` | 0 | 65 |
| `lithology` | `lithology_group` | 0 | 65 |
| `lithology` | `source_page` | 0 | 65 |
| `drilling_timeseries` | `formation` | 0 | 124,497 |
| `drilling_timeseries` | `torque` | 0 | 124,497 |
| `drilling_timeseries` | `drag` | 0 | 124,497 |
| `drilling_timeseries` | `flow_in` | 0 | 124,497 |
| `drilling_timeseries` | `flow_out` | 0 | 124,497 |
| `drilling_timeseries` | `ecd` | 0 | 124,497 |
| `drilling_timeseries` | `mud_weight` | 0 | 124,497 |
| `drilling_timeseries` | `gas_total` | 0 | 124,497 |
| `drilling_timeseries` | `h2s` | 0 | 124,497 |
| `events` | `start_md` | 0 | 44 |
| `events` | `start_tvd` | 0 | 44 |
| `events` | `end_tvd` | 0 | 44 |
| `events` | `formation` | 0 | 44 |
| `events` | `mitigation` | 0 | 44 |
| `events` | `outcome` | 0 | 44 |
| `events` | `formation_relative_depth` | 0 | 44 |
| `events` | `frd_reason_code` | 0 | 44 |
| `drilling_runs` | `bit_id` | 0 | 376 |
| `drilling_runs` | `bha_id` | 0 | 376 |
| `drilling_runs` | `section` | 0 | 376 |
| `drilling_runs` | `hole_diameter` | 0 | 376 |
| `drilling_runs` | `source_document` | 0 | 376 |
| `casings` | `run_id` | 0 | 158 |
| `casings` | `set_time` | 0 | 158 |
| `casings` | `lot` | 0 | 158 |
| `casings` | `source_page` | 0 | 158 |
| `bha_runs` | `run_id` | 0 | 64 |
| `bha_runs` | `bha_type` | 0 | 64 |
| `bha_runs` | `start_md` | 0 | 64 |
| `bha_runs` | `end_md` | 0 | 64 |
| `bha_runs` | `start_time` | 0 | 64 |
| `bha_runs` | `end_time` | 0 | 64 |
| `bha_runs` | `source_page` | 0 | 64 |
| `mud_properties` | `plastic_viscosity` | 0 | 72 |
| `mud_properties` | `yield_point` | 0 | 72 |
| `mud_properties` | `funnel_viscosity` | 0 | 72 |
| `mud_properties` | `gel_10s` | 0 | 72 |
| `mud_properties` | `gel_10m` | 0 | 72 |
| `mud_properties` | `gel_30m` | 0 | 72 |
| `mud_properties` | `filtrate` | 0 | 72 |
| `mud_properties` | `cake` | 0 | 72 |
| `mud_properties` | `ph` | 0 | 72 |
| `mud_properties` | `es` | 0 | 72 |
| `mud_properties` | `solids_pct` | 0 | 72 |
| `mud_properties` | `oil_pct` | 0 | 72 |
| `mud_properties` | `water_pct` | 0 | 72 |
| `mud_properties` | `sand_pct` | 0 | 72 |
| `mud_properties` | `lgs_pct` | 0 | 72 |
| `mud_properties` | `chloride` | 0 | 72 |
| `mud_properties` | `calcium` | 0 | 72 |
| `mud_properties` | `low_solids_solids` | 0 | 72 |
| `mud_properties` | `excess_los` | 0 | 72 |
| `mud_properties` | `chlorine` | 0 | 72 |
| `mud_properties` | `cacl2` | 0 | 72 |
| `mud_properties` | `mud_temperature` | 0 | 72 |
| `mud_properties` | `in_pit` | 0 | 72 |
| `mud_properties` | `out_pit` | 0 | 72 |
| `mud_properties` | `losses` | 0 | 72 |
| `mud_properties` | `source_page` | 0 | 72 |
| `locations` | `epsg` | 0 | 1 |

## Data density per table

A non-zero row count does not imply usable data. This table shows how
many columns actually carry values, separating measurement content
from identifiers and provenance fields.

| Table | Rows | Populated cols | Data cols | Null cols |
|---|---:|---:|---:|---:|
| `wells` | 1 | 20/25 | 16 | 5 |
| `wellbores` | 1 | 7/11 | 4 | 4 |
| `trajectories` | 428 | 17/20 | 10 | 3 |
| `lithology` | 65 | 7/10 | 1 | 3 |
| `drilling_timeseries` | 124,497 | 18/27 | 10 | 9 |
| `events` | 44 | 17/25 | 8 | 8 |
| `documents` | 219 | 15/15 | 2 | 0 |
| `drilling_runs` | 376 | 10/15 | 5 | 5 |
| `casings` | 158 | 17/21 | 11 | 4 |
| `bha_runs` | 64 | 7/14 | 1 | 7 |
| `mud_properties` | 72 | 12/38 | 4 | 26 |
| `mud_temperature_depth` | 457,104 | 15/15 | 3 | 0 |
| `locations` | 1 | 17/18 | 12 | 1 |

Tables with two or fewer data columns, where consumers should not
expect much:

- `lithology` (65 rows) - data columns: `lithology`
- `documents` (219 rows) - data columns: `document_type`, `document_name`
- `bha_runs` (64 rows) - data columns: `bha_description`

## Known coverage limits

- `formations`, `bits`, `cement_jobs`, `reservoirs` have zero rows because no source records exist for them.
- `drilling_timeseries` covers depths beyond the last survey station;
  those rows have no TVD rather than an extrapolated value.
- Event start-depth fields are null where the source document reports
  only an end depth.

## Commands

```bash
python3 scripts/normalize/01_clean.py
python3 scripts/normalize/02_promote.py
python3 scripts/validate/dataset_validation.py --json reports/validation.json
python3 scripts/reports/make_dataset_reports.py --validation reports/validation.json
```
