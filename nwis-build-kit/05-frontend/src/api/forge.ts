/**
 * API client for the FORGE dataset server.
 *
 * The FORGE FastAPI server is reachable at /api (no /v1 prefix). The existing
 * Vite proxy already forwards /api → http://localhost:8000, so no vite.config
 * change is needed.
 *
 * This is intentionally separate from src/api/client.ts. The NWIS v1 routes
 * (/api/v1/...) and the FORGE routes (/api/wells, /api/wells/{id}/...) are
 * served by different sub-applications on the same server and must not share
 * a client that could silently route one against the other.
 */
import type {
  ForgeWell,
  ForgeTrajectoryPoint,
  ForgeTimeseriesRow,
  ForgePaged,
  ForgeWellEvent,
} from './forgeTypes'

const FORGE_BASE = '/api'

export class ForgeApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ForgeApiError'
    this.status = status
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${FORGE_BASE}${path}`, signal ? { signal } : {})
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      // response had no JSON body; statusText is the best we have
    }
    throw new ForgeApiError(res.status, detail)
  }
  return (await res.json()) as T
}

export const forgeApi = {
  wells: (signal?: AbortSignal) =>
    get<ForgeWell[]>('/wells', signal),

  well: (id: string, signal?: AbortSignal) =>
    get<ForgeWell>(`/wells/${id}`, signal),

  trajectory: (id: string, signal?: AbortSignal) =>
    get<ForgeTrajectoryPoint[]>(`/wells/${id}/trajectory`, signal),

  timeseries: (
    id: string,
    opts: { offset?: number; limit?: number; channel?: string } = {},
    signal?: AbortSignal,
  ) => {
    const q = new URLSearchParams()
    q.set('offset', String(opts.offset ?? 0))
    q.set('limit', String(opts.limit ?? 2000))
    if (opts.channel) q.set('channel', opts.channel)
    return get<ForgePaged<ForgeTimeseriesRow>>(`/wells/${id}/timeseries?${q}`, signal)
  },

  events: (id: string, signal?: AbortSignal) =>
    get<ForgeWellEvent[]>(`/wells/${id}/events`, signal),
}
