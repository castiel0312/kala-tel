/**
 * Typed mirror of the FastAPI response models in scripts/api/nwis_api.py.
 *
 * Every optional field is nullable, not defaulted. That distinction is the
 * whole point of this client: `null` means "the source does not report this",
 * which must be shown as unavailable rather than substituted with a guess.
 */

export type Nullable<T> = T | null;

export interface Well {
  well_id: string;
  well_name: Nullable<string>;
  field: Nullable<string>;
  basin: Nullable<string>;
  operator: Nullable<string>;
  latitude: Nullable<number>;
  longitude: Nullable<number>;
  crs: Nullable<string>;
  /** Always null: the survey EPSG code is not published. */
  epsg: Nullable<number>;
  spud_date: Nullable<string>;
  actual_td: Nullable<number>;
  kb_elevation: Nullable<number>;
  source: Nullable<string>;
  data_origin: Nullable<string>;
}

export interface Wellbore {
  wellbore_id: string;
  well_id: string;
  wellbore_name: Nullable<string>;
  wellbore_type: Nullable<string>;
  td_md: Nullable<number>;
  td_tvd: Nullable<number>;
  status: Nullable<string>;
  data_origin: Nullable<string>;
}

export interface Location {
  location_id: string;
  wellbore_id: string;
  location_type: Nullable<string>;
  latitude: Nullable<number>;
  longitude: Nullable<number>;
  x: Nullable<number>;
  y: Nullable<number>;
  x_unit: Nullable<string>;
  y_unit: Nullable<string>;
  crs: Nullable<string>;
  kb_elevation: Nullable<number>;
  gl_elevation: Nullable<number>;
  elevation_unit: Nullable<string>;
  source: Nullable<string>;
  confidence: Nullable<string>;
  data_origin: Nullable<string>;
}

export interface WellDetail extends Well {
  wellbores: Wellbore[];
  locations: Location[];
  row_counts: Record<string, number>;
}

export interface TrajectoryPoint {
  md: number;
  tvd: Nullable<number>;
  tvdss: Nullable<number>;
  inclination: Nullable<number>;
  azimuth: Nullable<number>;
  dogleg_severity: Nullable<number>;
  northing: Nullable<number>;
  easting: Nullable<number>;
  survey_time: Nullable<string>;
  source: Nullable<string>;
  data_origin: Nullable<string>;
}

export interface TimeseriesRow {
  timestamp: Nullable<string>;
  md: Nullable<number>;
  tvd: Nullable<number>;
  rig_state: Nullable<string>;
  rop: Nullable<number>;
  wob: Nullable<number>;
  rpm: Nullable<number>;
  hookload: Nullable<number>;
  pump_rate: Nullable<number>;
  standpipe_pressure: Nullable<number>;
  pit_volume: Nullable<number>;
  run_id: Nullable<string>;
  formation: Nullable<string>;
  torque: Nullable<number>;
  flow_in: Nullable<number>;
  flow_out: Nullable<number>;
  ecd: Nullable<number>;
  mud_weight: Nullable<number>;
  gas_total: Nullable<number>;
  h2s: Nullable<number>;
  original_units: Nullable<string>;
  conversion_rule: Nullable<string>;
  conversion_version: Nullable<string>;
  source: Nullable<string>;
  data_origin: Nullable<string>;
}

export interface Paged<T> {
  count: number;
  offset: number;
  limit: number;
  items: T[];
}

export interface WellEvent {
  event_id: string;
  wellbore_id: string;
  /** Resolved by the API from wellbores; used for well-scoped links. */
  well_id: Nullable<string>;
  event_type: string;
  event_subtype: Nullable<string>;
  /** Naive local timestamp: the source declares no timezone. */
  start_time: Nullable<string>;
  end_time: Nullable<string>;
  start_md: Nullable<number>;
  end_md: Nullable<number>;
  start_tvd: Nullable<number>;
  end_tvd: Nullable<number>;
  formation: Nullable<string>;
  severity: Nullable<string>;
  cause: Nullable<string>;
  mitigation: Nullable<string>;
  outcome: Nullable<string>;
  npt_hours: Nullable<number>;
  depth_source: Nullable<string>;
  source_document: Nullable<string>;
  source_page: Nullable<string>;
  confidence: Nullable<string>;
  extraction_method: Nullable<string>;
  source: Nullable<string>;
  data_origin: Nullable<string>;
}

export interface DocumentRecord {
  document_id: string;
  wellbore_id: Nullable<string>;
  document_type: Nullable<string>;
  document_name: Nullable<string>;
  source: Nullable<string>;
  url: Nullable<string>;
  file_path: Nullable<string>;
  checksum: Nullable<string>;
  checksum_algorithm: Nullable<string>;
  file_size_bytes: Nullable<number>;
  page_count: Nullable<number>;
  publication_date: Nullable<string>;
  download_date: Nullable<string>;
  license: Nullable<string>;
  data_origin: Nullable<string>;
}

export interface DocumentPage {
  document_id: string;
  page: number;
  file_path: Nullable<string>;
  checksum: Nullable<string>;
  checksum_algorithm: Nullable<string>;
  page_count: Nullable<number>;
  exists: boolean;
  note: string;
}

export interface ValidationFinding {
  check: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  table: string;
  message: string;
  evidence: string;
  n_affected: number;
  /** False for advisory findings, which do not block a VALID state. */
  fatal: boolean;
}

export interface DataQuality {
  dataset_version: string;
  state: string;
  conversion_version: string;
  row_counts: Record<string, number>;
  total_rows: number;
  entities: Record<string, string>;
  notes: string[];
  /** Tally by severity. Empty when no validator artifact is present. */
  severity_counts: Record<string, number>;
  findings: ValidationFinding[];
  findings_source: Nullable<string>;
}

/**
 * Drilling channels that are declared in the schema but entirely null in this
 * release. Listing them lets the UI say "unavailable" with a reason instead
 * of drawing an empty axis and implying the channel was measured but empty.
 */
export const UNAVAILABLE_CHANNELS: Record<string, string> = {
  torque: "No canonical torque values; the source column is entirely null.",
  drag: "No canonical drag values; the source column is entirely null.",
  flow_in: "No canonical flow-in values; the source column is entirely null.",
  flow_out: "No canonical flow-out values; the source column is entirely null.",
  ecd: "No ECD values; equivalent control is not published in the source.",
  mud_weight: "Mud weight is only available in the daily mud report table, not per sample.",
  gas_total: "No canonical gas values; the source column is entirely null.",
  h2s: "No H2S values; the source column is entirely null.",
  formation: "No source-backed formation intervals exist for this well.",
};
