/**
 * The single place that talks to the NWIS API.
 *
 * Screens never build URLs or parse JSON — they call these functions through TanStack Query.
 * Types come from `./types` (see the note there about how they relate to the generated schema).
 */
import type {
  ActiveWell,
  Alert,
  AlertsResponse,
  AnalyticsSummary,
  Answer,
  AssistantSuggestions,
  ChecklistItem,
  Corridor,
  Comparison,
  Dashboard,
  DocumentsResponse,
  EventDetailResponse,
  EventPreset,
  EventsResponse,
  Extraction,
  ExtractionField,
  Graph,
  Job,
  LandingStats,
  LiveSnapshot,
  OffsetDetail,
  OffsetsResponse,
  RiskDetail,
  RisksResponse,
} from './types'

const BASE = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly url: string
  constructor(status: number, url: string, body: string) {
    super(`${status} ${url}${body ? ` — ${body.slice(0, 200)}` : ''}`)
    this.name = 'ApiError'
    this.status = status
    this.url = url
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { 'content-type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new ApiError(res.status, url, await res.text().catch(() => ''))
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Drops empty values so a filter the user has not set is simply absent from the query string. */
function qs(params: object): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params as Record<string, string | number | boolean | undefined | null>)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export interface OffsetQuery {
  radius_km?: number
  min_similarity?: number
  has_loss_events?: boolean
  sort?: 'similarity' | 'distance' | 'spud'
  q?: string
}

export interface CorridorQuery {
  align?: 'md' | 'tvdss' | 'formation'
  look_ahead_m?: number
}

export interface EventQuery {
  q?: string
  preset?: string
  well?: string
  formation?: string
  type?: string
  severity?: string
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  landing: () => request<LandingStats>('/landing'),

  activeWell: () => request<ActiveWell>('/wells/active'),
  dashboard: (wellId: string) => request<Dashboard>(`/wells/${wellId}/dashboard`),
  live: (wellId: string) => request<LiveSnapshot>(`/wells/${wellId}/live`),

  offsets: (wellId: string, q: OffsetQuery = {}) => request<OffsetsResponse>(`/wells/${wellId}/offsets${qs(q)}`),
  offset: (wellId: string, offsetId: string) => request<OffsetDetail>(`/wells/${wellId}/offsets/${offsetId}`),
  corridor: (wellId: string, q: CorridorQuery = {}) => request<Corridor>(`/wells/${wellId}/corridor${qs(q)}`),
  compare: (wellId: string, offsetId: string) => request<Comparison>(`/wells/${wellId}/compare/${offsetId}`),

  risks: (wellId: string, level?: string) => request<RisksResponse>(`/wells/${wellId}/risks${qs({ level })}`),
  risk: (wellId: string, riskId: string) => request<RiskDetail>(`/wells/${wellId}/risks/${riskId}`),

  alerts: (wellId: string, status?: string) => request<AlertsResponse>(`/wells/${wellId}/alerts${qs({ status })}`),
  ackAlert: (alertId: string, by: string) => request<Alert>(`/alerts/${alertId}/ack`, { method: 'POST', body: JSON.stringify({ by }) }),
  unackAlert: (alertId: string) => request<{ ok: boolean }>(`/alerts/${alertId}/ack`, { method: 'DELETE' }),

  events: (q: EventQuery = {}) => request<EventsResponse>(`/events${qs(q)}`),
  event: (eventId: string) => request<EventDetailResponse>(`/events/${eventId}`),
  presets: () => request<{ presets: EventPreset[] }>('/events'),

  graph: (node?: string, hops?: number) => request<Graph>(`/graph/neighbourhood${qs({ node, hops })}`),

  documents: (type?: string, q?: string) => request<DocumentsResponse>(`/documents${qs({ type, q })}`),
  uploadDocument: (file: File, wellId: string, type: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('wellId', wellId)
    fd.append('type', type)
    return request<Job>('/documents', { method: 'POST', body: fd })
  },
  jobs: () => request<Job[]>('/jobs'),
  extraction: (documentId: string, page: number) => request<Extraction>(`/documents/${documentId}/pages/${page}/extraction`),
  confirmField: (fieldId: string, value: string) =>
    request<{ field: ExtractionField }>(`/extractions/fields/${fieldId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }),
  editField: (fieldId: string, value: string) =>
    request<{ field: ExtractionField }>(`/extractions/fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }),

  analytics: () => request<AnalyticsSummary>('/analytics/summary'),
  assistantSuggestions: () => request<AssistantSuggestions>('/assistant/suggestions'),
  ask: (question: string) => request<Answer>('/assistant/ask', { method: 'POST', body: JSON.stringify({ question }) }),

  checklist: () => request<ChecklistItem[]>('/rig/checklist'),
  resetDemo: () => request<{ reset: boolean }>('/demo/reset', { method: 'POST' }),
}

/** Query-key factory, so cache invalidation never guesses a string. */
export const qk = {
  landing: ['landing'] as const,
  activeWell: ['activeWell'] as const,
  dashboard: (w: string) => ['dashboard', w] as const,
  live: (w: string) => ['live', w] as const,
  offsets: (w: string, q: OffsetQuery) => ['offsets', w, q] as const,
  offset: (w: string, id: string) => ['offset', w, id] as const,
  corridor: (w: string, q: CorridorQuery) => ['corridor', w, q] as const,
  compare: (w: string, id: string) => ['compare', w, id] as const,
  risks: (w: string, level?: string) => ['risks', w, level] as const,
  risk: (w: string, id: string) => ['risk', w, id] as const,
  alerts: (w: string, status?: string) => ['alerts', w, status] as const,
  events: (q: EventQuery) => ['events', q] as const,
  event: (id: string) => ['event', id] as const,
  graph: (node?: string, hops?: number) => ['graph', node, hops] as const,
  documents: (type?: string, q?: string) => ['documents', type, q] as const,
  jobs: ['jobs'] as const,
  extraction: (d: string, p: number) => ['extraction', d, p] as const,
  analytics: ['analytics'] as const,
  suggestions: ['assistantSuggestions'] as const,
  checklist: ['checklist'] as const,
}
