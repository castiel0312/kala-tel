# Schema Report: nwis-forge16b-v0.2

Generated 2026-09-26T13:02:58Z from `scripts/nwis_lib.py` (`TABLES`).

Canonical column list per table, as enforced by the validator.

## `wells`

- Rows: 1
- Primary key: `well_id`
- Required columns: `well_id`, `well_name`, `data_origin`
- Description: One row per well (surface identity).

Columns: `well_id`, `source`, `source_well_id`, `well_name`, `field`, `basin`, `country`, `operator`, `latitude`, `longitude`, `easting`, `northing`, `crs`, `epsg`, `block`, `spud_date`, `completion_date`, `well_type`, `well_status`, `planned_td`, `actual_td`, `kb_elevation`, `gl_elevation`, `kb_elevation_unit`, `data_origin`

## `wellbores`

- Rows: 1
- Primary key: `wellbore_id`
- Foreign key: `well_id` -> `wells`
- Required columns: `wellbore_id`, `well_id`, `data_origin`
- Description: One row per wellbore / sidetrack.

Columns: `wellbore_id`, `well_id`, `wellbore_name`, `wellbore_type`, `sidetrack_number`, `parent_wellbore_id`, `kickoff_depth`, `td_md`, `td_tvd`, `status`, `data_origin`

## `trajectories`

- Rows: 428
- Primary key: `wellbore_id, md`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `wellbore_id`, `md`, `data_origin`
- Description: Directional survey stations. md/tvd/tvdss in metres.

Columns: `wellbore_id`, `md`, `tvd`, `tvdss`, `inclination`, `azimuth`, `northing`, `easting`, `dogleg_severity`, `build_rate`, `turn_rate`, `survey_time`, `vertical_section`, `depth_source`, `crs`, `epsg`, `original_depth_unit`, `conversion_rule`, `source`, `data_origin`

## `formations`

- Rows: 0
- Primary key: `wellbore_id, formation_name, top_md`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `wellbore_id`, `formation_name`, `data_origin`
- Description: Formation intervals (top/base), not picks.

Columns: `wellbore_id`, `formation_name`, `formation_alias`, `top_md`, `base_md`, `top_tvd`, `base_tvd`, `top_tvdss`, `base_tvdss`, `lithology`, `formation_group`, `vocabulary_id`, `source`, `source_document`, `source_page`, `confidence`, `data_origin`

## `lithology`

- Rows: 65
- Primary key: `wellbore_id, md, lithology`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `wellbore_id`, `data_origin`
- Description: Lithology at depth.

Columns: `wellbore_id`, `md`, `formation`, `lithology`, `lithology_group`, `source`, `source_document`, `source_page`, `confidence`, `data_origin`

## `drilling_timeseries`

- Rows: 124,497
- Primary key: `timestamp, wellbore_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Foreign key: `run_id` -> `drilling_runs`
- Required columns: `wellbore_id`, `data_origin`
- Description: Time-indexed drilling sensor samples, SI units.

Columns: `timestamp`, `wellbore_id`, `run_id`, `md`, `tvd`, `formation`, `rig_state`, `rop`, `wob`, `rpm`, `torque`, `hookload`, `drag`, `flow_in`, `flow_out`, `pump_rate`, `standpipe_pressure`, `ecd`, `mud_weight`, `pit_volume`, `gas_total`, `h2s`, `original_units`, `conversion_rule`, `conversion_version`, `source`, `data_origin`

## `events`

- Rows: 44
- Primary key: `event_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `event_id`, `wellbore_id`, `event_type`, `data_origin`
- Description: Operational/drilling events extracted from source documents.

Columns: `event_id`, `wellbore_id`, `event_type`, `event_subtype`, `start_time`, `end_time`, `start_md`, `end_md`, `start_tvd`, `end_tvd`, `formation`, `severity`, `cause`, `mitigation`, `outcome`, `npt_hours`, `depth_source`, `formation_relative_depth`, `frd_reason_code`, `source_document`, `source_page`, `source`, `confidence`, `extraction_method`, `data_origin`

## `documents`

- Rows: 219
- Primary key: `document_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `document_id`, `data_origin`
- Description: One row per source document; the event->page join point.

Columns: `document_id`, `wellbore_id`, `document_type`, `document_name`, `source`, `url`, `file_path`, `checksum`, `checksum_algorithm`, `file_size_bytes`, `page_count`, `publication_date`, `download_date`, `license`, `data_origin`

## `drilling_runs`

- Rows: 376
- Primary key: `run_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Foreign key: `bit_id` -> `bits`
- Foreign key: `bha_id` -> `bha_runs`
- Required columns: `run_id`, `wellbore_id`, `data_origin`
- Description: One row per drilling run (tour). Prevents mixing samples across bit/BHA/section changes.

Columns: `run_id`, `wellbore_id`, `bit_id`, `bha_id`, `start_md`, `end_md`, `start_time`, `end_time`, `run_type`, `section`, `hole_diameter`, `source`, `source_document`, `confidence`, `data_origin`

## `casings`

- Rows: 158
- Primary key: `casing_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Foreign key: `run_id` -> `drilling_runs`
- Required columns: `casing_id`, `wellbore_id`, `data_origin`
- Description: Casing / liner intervals.

Columns: `casing_id`, `wellbore_id`, `run_id`, `casing_type`, `size`, `weight`, `grade`, `shoe_md`, `shoe_tvd`, `top_md`, `top_tvd`, `hole_section`, `hole_diameter`, `set_time`, `lot`, `nominal_weight`, `source`, `source_document`, `source_page`, `confidence`, `data_origin`

## `bha_runs`

- Rows: 64
- Primary key: `bha_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Foreign key: `run_id` -> `drilling_runs`
- Required columns: `bha_id`, `wellbore_id`, `data_origin`
- Description: Bottom-hole assembly per run.

Columns: `bha_id`, `wellbore_id`, `run_id`, `bha_type`, `bha_description`, `start_md`, `end_md`, `start_time`, `end_time`, `source`, `source_document`, `source_page`, `confidence`, `data_origin`

## `bits`

- Rows: 0
- Primary key: `bit_id`
- Foreign key: `bha_id` -> `bha_runs`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `bit_id`, `data_origin`
- Description: Bit record per run.

Columns: `bit_id`, `bha_id`, `wellbore_id`, `bit_type`, `diameter`, `diameter_unit`, `iadc_code`, `nozzle_count`, `start_md`, `end_md`, `source`, `source_document`, `confidence`, `data_origin`

## `mud_properties`

- Rows: 72
- Primary key: `wellbore_id, timestamp`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `wellbore_id`, `data_origin`
- Description: Mud properties. Only populate what the source reports.

Columns: `wellbore_id`, `timestamp`, `md`, `mud_type`, `mud_weight`, `mud_weight_unit`, `plastic_viscosity`, `yield_point`, `funnel_viscosity`, `gel_10s`, `gel_10m`, `gel_30m`, `filtrate`, `cake`, `ph`, `es`, `solids_pct`, `oil_pct`, `water_pct`, `sand_pct`, `lgs_pct`, `chloride`, `calcium`, `low_solids_solids`, `excess_los`, `chlorine`, `cacl2`, `mud_temperature`, `in_pit`, `out_pit`, `losses`, `original_units`, `conversion_rule`, `source`, `source_document`, `source_page`, `confidence`, `data_origin`

## `mud_temperature_depth`

- Rows: 457,104
- Primary key: `wellbore_id, log_date, source_file, md`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `record_id`, `wellbore_id`, `md`, `depth_reference`, `data_origin`
- Description: Depth-indexed mud temperature from FORGE LAS logs. NOT time-indexed: log_date is the acquisition date of the LAS file, not a per-sample timestamp, and no timestamp is invented for the samples. Two channels are kept (mud_temp_in / mud_temp_out) because the source reports both. depth_reference records that md is measured depth; null_code records the LAS null value that was masked during ingest.

Columns: `record_id`, `wellbore_id`, `md`, `depth_reference`, `log_date`, `mud_temp_in`, `mud_temp_out`, `original_units`, `conversion_rule`, `conversion_version`, `source`, `source_file`, `null_code`, `confidence`, `data_origin`

## `cement_jobs`

- Rows: 0
- Primary key: `cement_job_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Foreign key: `casing_id` -> `casings`
- Required columns: `cement_job_id`, `wellbore_id`, `data_origin`
- Description: Cementing jobs. Do not invent slurry properties.

Columns: `cement_job_id`, `wellbore_id`, `casing_id`, `job_type`, `cement_type`, `slurry_density`, `slurry_density_unit`, `volume`, `volume_unit`, `yield_value`, `pump_rate`, `pump_rate_unit`, `pressure`, `pressure_unit`, `placement_time`, `top_md`, `bottom_md`, `losses`, `result`, `source`, `source_document`, `source_page`, `confidence`, `data_origin`

## `reservoirs`

- Rows: 0
- Primary key: `reservoir_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `reservoir_id`, `wellbore_id`, `data_origin`
- Description: Reservoir intervals. Empty is expected for public sources.

Columns: `reservoir_id`, `wellbore_id`, `reservoir_name`, `top_md`, `base_md`, `top_tvd`, `base_tvd`, `net_pay`, `porosity`, `permeability`, `pressure`, `fluid_contact_md`, `source`, `confidence`, `data_origin`

## `locations`

- Rows: 1
- Primary key: `location_id`
- Foreign key: `wellbore_id` -> `wellbores`
- Required columns: `location_id`, `wellbore_id`, `crs`, `data_origin`
- Description: Explicit CRS-bearing locations. Distances must not be computed without a known CRS.

Columns: `location_id`, `wellbore_id`, `location_type`, `latitude`, `longitude`, `x`, `y`, `x_unit`, `y_unit`, `crs`, `epsg`, `datum`, `kb_elevation`, `gl_elevation`, `elevation_unit`, `source`, `confidence`, `data_origin`

## Depth policy

`md`, `tvd`, and `tvdss` remain separate columns and are never
collapsed. Interpolated values are flagged via `tvd_interpolated` and
never presented as surveyed. `mud_temperature_depth` is depth-indexed
with `log_date` recording the LAS acquisition date, not a per-sample
timestamp.
