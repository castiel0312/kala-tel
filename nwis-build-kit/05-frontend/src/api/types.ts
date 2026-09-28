/**
 * Domain types for the NWIS API.
 *
 * `schema.d.ts` is generated from `../02-api/openapi.yaml` and is the contract of record.
 * The spec marks every property optional, so these types restate the same shapes with the
 * fields the starter actually always returns marked required — that keeps `strict` TypeScript
 * honest in components without sprinkling `!` through the screens.
 *
 * If you change the contract: regenerate the schema (`npm run api:types`) and update this file.
 */

export type WellStatus = 'DRILLING' | 'TRIPPING' | 'CIRCULATING' | 'CASING' | 'CEMENTING' | 'SUSPENDED'
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW'
export type AlertSeverity = 'HIGH' | 'WATCH' | 'MEDIUM' | 'INFO'
export type MetricStatus = 'NORMAL' | 'WATCH' | 'ALARM'
export type EventType = 'LOSS' | 'STUCK' | 'KICK' | 'CEMENT' | 'TORQUE' | 'OTHER'
export type AlignMode = 'md' | 'tvdss' | 'formation'
export type DocumentStatus = 'VERIFIED' | 'INDEXED' | 'PROCESSING' | 'NEEDS_REVIEW' | 'QUEUED' | 'FAILED'
export type JobState = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'

export interface BitPosition {
  mdM: number
  tvdssM: number
  mdMinusTvdssM: number
}

export interface NextFormation {
  name: string
  topMdM: number
  topTvdssM: number
  uncertaintyM: number
  distanceM: number
  etaHours: number
}

export interface ActiveWell {
  id: string
  status: WellStatus
  rigState: string
  holeSection: string
  field: string
  /** [east, north] km from a local origin */
  surfaceKm: [number, number]
  bitKm: [number, number]
  kbElevationM: number
  bit: BitPosition
  currentFormation: string
  nextFormation: NextFormation
  casing: { shoe9_5_8inMdM: number; fitEmwGcc: number }
  design: { shoe: string; cement: string; mudSystem: string; bit: string }
  lookAheadM: number
  rigStateLast2h: { state: string; pct: number }[]
  formationTopsTvdssM: Record<string, number>
}

export interface Metric {
  key: string
  label: string
  value: number
  unit: string
  note?: string
  status?: MetricStatus
  modelResidual?: number
  alertThreshold?: number
  trendPerHour?: number
  limit?: number
  change40min?: number
}

export interface LiveSnapshot {
  wellId: string
  timestamp: string
  source: string
  latencySeconds: number
  primary: Metric[]
  more: Metric[]
  sparklines12pt?: Record<string, number[] | string>
}

export interface SimilarityFactors {
  stratigraphy: number
  trajectory: number
  mudSystem: number
  proximity: number
}

export interface AlignedParams {
  rop: number
  wob: number
  rpm: number
  torque: number
  ecd: number
  spp: number
  mudWeight: number
}

export interface WellDesign {
  shoe: string
  cement: string
  mudSystem: string
  bit: string
}

export interface OffsetWell {
  id: string
  surfaceKm: [number, number]
  bitDepthKm: [number, number]
  distanceAtBitKm: number
  similarity: number
  tdMdM: number
  tipamTopTvdssM: number | null
  barailTopTvdssM: number | null
  mdMinusTvdssM: number | null
  spud: number
  status: string
  risk: RiskLevel
  hasLossEvents: boolean
  paramsAtAlignedDepth?: AlignedParams
  design?: WellDesign
  lesson?: string
  lessonSource?: string
  similarityFactors: SimilarityFactors
  relevant: boolean
}

export interface TopRisk {
  riskId: string
  name: string
  probability: number
  level: RiskLevel
  windowText: string
  historicalEvents: number
  similarWells: number
}

export interface Dashboard {
  activeWell: ActiveWell
  live: LiveSnapshot
  topRisk: TopRisk
  mapWells: OffsetWell[]
  summary: {
    activeAlerts: number
    offsetWells: number
    historicalEvents: number
    riskZonesAhead: { total: number; high: number; medium: number }
  }
}

export interface OffsetsResponse {
  radiusKm: number
  count: number
  relevantCount: number
  wells: OffsetWell[]
}

export interface OffsetDetail extends OffsetWell {
  events: HistoricalEvent[]
  profile?: { mdM: number; label: string }[]
}

export interface EventSource {
  type: string
  documentId: string
  page: number | null
  label: string
}

export interface HistoricalEvent {
  id: string
  wellId: string
  type: EventType
  title: string
  severity: 'high' | 'med' | 'low'
  formation: string
  mdM: number
  tvdssM: number | null
  metresBelowBarailTop: number | null
  alignedMdOnActiveM: number | null
  date: string
  cause: string
  action: string
  outcome: string
  nptHours: number
  extractionConfidence: number
  /** Type-specific extras, e.g. `{ rateBblPerHour, mudLostM3 }` for a loss. */
  details: Record<string, number | string | null>
  source: EventSource
}

export interface CorridorEvent {
  eventId: string
  depthM: number
  inLookAhead: boolean
  type: string
  severity: string
  label: string
}

export interface CorridorColumn {
  wellId: string
  distanceKm: number
  shiftM: number
  bands: { name: string; fromM: number; toM: number }[]
  events: CorridorEvent[]
}

export interface Corridor {
  align: AlignMode
  axis: { topM: number; spanM: number; unit: string }
  bit: { depthM: number; lookAheadM: number }
  predictedTop?: { name: string; depthM: number; uncertaintyM: number }
  caption: string
  columns: CorridorColumn[]
}

export interface ComparisonRow {
  key: string
  label: string
  unit: string
  active: number
  offset: number
  diffPct: number
  flagged: boolean
}

export interface Comparison {
  active: string
  offset: OffsetWell
  parameters: ComparisonRow[]
  design: { label: string; active: string; offset: string; differs: boolean }[]
  events: HistoricalEvent[]
  takeaway: { text: string; source: string }
}

export interface RiskSummary {
  id: string
  name: string
  probability: number
  level: RiskLevel
  windowMdM: [number, number]
  confidence: number
  confidenceBand: string
  evidenceSummary: string
  status: 'ACT_NOW' | 'WATCH' | 'MONITOR'
  trend?: { from: number; minutes: number }
  stats?: { value: string; label: string }[]
  reasons?: string[]
}

/** The posterior the risk engine actually showed, so the numbers can be checked against the odds. */
export interface RiskModel {
  version: string
  calibrationSet: string
  offsetPrior: number
  liveLikelihoodRatio: number
  posterior: number
  brier: number
}

export interface RiskDetail extends RiskSummary {
  evidence: HistoricalEvent[]
  evidenceEventIds?: string[]
  mitigations: { text: string; worked: boolean }[]
  recommendation: string
  model: RiskModel
}

export interface RisksResponse {
  counts: Record<RiskLevel, number>
  nextZone: { riskId: string; text: string; metresAhead: number }
  risks: RiskSummary[]
}

export interface Alert {
  id: string
  time: string
  severity: AlertSeverity
  category: string
  riskId: string | null
  title: string
  subtitle: string
  acknowledged: { by: string; at: string } | null
  triggers: { value: string; label: string }[]
  chart?: { label: string; series: number[]; limit: number | null }
  offsetsSay?: string
  action?: string
}

export interface AlertsResponse {
  counts: { all: number; open: number; acknowledged: number }
  alerts: Alert[]
}

export interface EventDetailResponse extends HistoricalEvent {
  /** Events in the same well that share a cause, returned alongside the event. */
  related?: HistoricalEvent[]
}

export interface EventPreset {
  id: string
  label: string
  count: number
}

export interface EventsResponse {
  count: number
  events: HistoricalEvent[]
  presets: EventPreset[]
  facets?: {
    wells?: { id: string; count: number }[]
    formations?: { name: string; count: number }[]
    types?: { type: string; count: number }[]
  }
}

export interface GraphNode {
  id: string
  label: string
  type: 'active_well' | 'well' | 'formation' | 'event' | 'cause' | 'action' | 'outcome' | 'document'
  severity?: string
  ref?: string
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  relation: string
  label?: string
}

export interface Graph {
  center: string
  hops: number
  /** Size of the whole knowledge store, shown as "14 of 38,420 nodes". */
  totalNodesInStore: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  evidencePath: string[]
  evidencePathText: string
}

export interface WellDocument {
  id: string
  wellId: string
  type: string
  year: number
  pages: number
  events: number
  ocrQuality: number
  status: DocumentStatus
}

export interface DocumentTotals {
  documents: number
  pagesRead: number
  eventsExtracted: number
  needReview: number
}

export interface DocumentsResponse {
  totals: DocumentTotals
  documents: WellDocument[]
}

export interface Job {
  id: string
  documentId: string
  description: string
  stages: { ocr: number; nlp: number; graph: number }
  state: JobState
}

/** Where a field's source text sits on the page: the line tops the highlighter should cover. */
export interface FieldBbox {
  page: number
  lineTops: number[]
  note?: string
}

export interface ExtractionField {
  id: string
  key: string
  label: string
  value: string
  confidence: number
  needsReview: boolean
  reviewReason?: string
  editedBy?: string
  editedAt?: string
  bbox: FieldBbox
}

export interface Extraction {
  documentId: string
  page: number
  pages: number
  ocrMeanConfidence: number
  reviewThreshold: number
  pipeline: { step: string; detail: string; state: 'DONE' | 'CURRENT' | 'PENDING' }[]
  pageText: string[]
  event: {
    eventId: string
    fields: ExtractionField[]
  }
}

export interface AnalyticsSummary {
  scope: { description: string; years: [number, number]; radiusKm: number }
  mudLossByFormation: { formation: string; events: number; highlight?: boolean }[]
  barailEventsByMetresBelowTop: { bin: string; events: number; highlight?: boolean; activeMdRange?: [number, number] }[]
  nptHoursByType: { type: string; hours: number; highlight?: boolean }[]
  riskByFormation: { columns: string[]; rows: { formation: string; counts: number[] }[] }
  offsetSimilarity: { id: string; similarity: number; distanceKm: number }[]
  relevanceThreshold: number
  mudLossPerYear: { year: number; events: number; highlight?: boolean }[]
}

export interface AssistantContext {
  formation: string
  nextTop: string
  offsetsInScope: string
  eventsIndexed: number
  pagesSearchable: number
  liveFeed: string
}

export interface AssistantSuggestions {
  chips: { id: string; label: string; question?: string }[]
  context: AssistantContext
}

export interface AnswerEvidence {
  text: string
  source: string
  severity?: string
}

export interface Answer {
  id: string
  chip?: string
  question: string
  answer: string
  refused: boolean
  evidence: AnswerEvidence[]
  similarWells: { id: string; similarity: number }[]
  sources: string[]
  confidence: { score: number; band: string; note: string }
  cta: { label: string; route: string } | null
  meta?: { latencySeconds: number; model: string; sourceCount: number }
}

export interface ChecklistItem {
  id: string
  text: string
  sub: string
  done: boolean
}

export interface LandingStats {
  stats: { value: string; label: string }[]
  note: string
}
