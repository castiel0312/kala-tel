/**
 * Types for the FORGE dataset API (/api, not /api/v1).
 *
 * A strict copy of the shapes the FORGE FastAPI server returns. Every optional
 * field is nullable — `null` means "the source does not report this value" and
 * must be shown as unavailable rather than substituted with a default.
 *
 * Kept separate from src/api/types.ts so the NWIS v1 client and the FORGE
 * client can evolve independently without one breaking the other.
 */

export type Nullable<T> = T | null

export interface ForgeWell {
  well_id: string
  well_name: Nullable<string>
  field: Nullable<string>
  basin: Nullable<string>
  operator: Nullable<string>
  latitude: Nullable<number>
  longitude: Nullable<number>
  crs: Nullable<string>
  /** Always null: the survey EPSG code is not published in this dataset. */
  epsg: Nullable<number>
  spud_date: Nullable<string>
  actual_td: Nullable<number>
  kb_elevation: Nullable<number>
  source: Nullable<string>
  data_origin: Nullable<string>
}

export interface ForgeTrajectoryPoint {
  md: number
  tvd: Nullable<number>
  tvdss: Nullable<number>
  inclination: Nullable<number>
  azimuth: Nullable<number>
  dogleg_severity: Nullable<number>
  northing: Nullable<number>
  easting: Nullable<number>
  survey_time: Nullable<string>
  source: Nullable<string>
  data_origin: Nullable<string>
}

export interface ForgeTimeseriesRow {
  timestamp: Nullable<string>
  md: Nullable<number>
  tvd: Nullable<number>
  rig_state: Nullable<string>
  rop: Nullable<number>
  wob: Nullable<number>
  rpm: Nullable<number>
  hookload: Nullable<number>
  pump_rate: Nullable<number>
  standpipe_pressure: Nullable<number>
  pit_volume: Nullable<number>
  run_id: Nullable<string>
  formation: Nullable<string>
  torque: Nullable<number>
  flow_in: Nullable<number>
  flow_out: Nullable<number>
  ecd: Nullable<number>
  mud_weight: Nullable<number>
  gas_total: Nullable<number>
  h2s: Nullable<number>
  original_units: Nullable<string>
  conversion_rule: Nullable<string>
  conversion_version: Nullable<string>
  source: Nullable<string>
  data_origin: Nullable<string>
}

export interface ForgePaged<T> {
  count: number
  offset: number
  limit: number
  items: T[]
}

export interface ForgeWellEvent {
  event_id: string
  wellbore_id: string
  /** Resolved by the API from wellbores; used for well-scoped links. */
  well_id: Nullable<string>
  event_type: string
  event_subtype: Nullable<string>
  /** Naive local timestamp: the source declares no timezone. */
  start_time: Nullable<string>
  end_time: Nullable<string>
  start_md: Nullable<number>
  end_md: Nullable<number>
  start_tvd: Nullable<number>
  end_tvd: Nullable<number>
  formation: Nullable<string>
  severity: Nullable<string>
  cause: Nullable<string>
  mitigation: Nullable<string>
  outcome: Nullable<string>
  npt_hours: Nullable<number>
  depth_source: Nullable<string>
  source_document: Nullable<string>
  source_page: Nullable<string>
  confidence: Nullable<string>
  extraction_method: Nullable<string>
  source: Nullable<string>
  data_origin: Nullable<string>
}

/**
 * Drilling channels that are declared in the schema but entirely null in the
 * FORGE dataset release. Listing them lets the UI show "unavailable" with a
 * reason rather than drawing an empty axis.
 */
export const FORGE_UNAVAILABLE_CHANNELS: Record<string, string> = {
  torque: 'No canonical torque values; the source column is entirely null.',
  drag: 'No canonical drag values; the source column is entirely null.',
  flow_in: 'No canonical flow-in values; the source column is entirely null.',
  flow_out: 'No canonical flow-out values; the source column is entirely null.',
  ecd: 'No ECD values; equivalent circulating density is not published in the source.',
  mud_weight: 'Mud weight is only available in the daily mud report table, not per sample.',
  gas_total: 'No canonical gas values; the source column is entirely null.',
  h2s: 'No H2S values; the source column is entirely null.',
  formation: 'No source-backed formation intervals exist for this well.',
}
