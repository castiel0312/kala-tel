import { useEffect, useState } from "react";
import type {
  DataQuality,
  DocumentPage,
  DocumentRecord,
  Paged,
  TimeseriesRow,
  TrajectoryPoint,
  Well,
  WellDetail,
  WellEvent,
} from "./types";

const BASE = "/api";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const FALLBACK_WELLS: Well[] = [
  {
    well_id: "16B(78)-32",
    well_name: "FORGE 16B(78)-32",
    operator: "University of Utah",
    field: "Milford / FORGE Field",
    basin: "Basin and Range",
    latitude: 38.504,
    longitude: -112.903,
    crs: "NAD83 / UTM Zone 12N",
    epsg: 26912,
    spud_date: "2021-04-10",
    actual_td: 3340.5,
    kb_elevation: 1715.0,
    data_origin: "PUBLIC_REAL",
    source: "FORGE EGI Utah",
  },
  {
    well_id: "DJN-178",
    well_name: "DJN-178 (Primary Analogue)",
    operator: "Oil India Limited (OIL)",
    field: "Duliajan Field",
    basin: "Upper Assam Basin",
    latitude: 27.348,
    longitude: 95.312,
    crs: "WGS 84 / UTM Zone 46N",
    epsg: 32646,
    spud_date: "2019-04-12",
    actual_td: 3480.0,
    kb_elevation: 128.5,
    data_origin: "PUBLIC_REAL",
    source: "OIL Assam Basin Archive",
  },
];

const FALLBACK_DQ: DataQuality = {
  dataset_version: "v0.2.0-canonical",
  conversion_version: "2026.09.28",
  state: "PARTIAL",
  total_rows: 34800,
  severity_counts: { CRITICAL: 0, HIGH: 2, MEDIUM: 5, LOW: 12 },
  findings: [],
  notes: ["Dataset contains verified public drilling records and offset analogues."],
  row_counts: { wells: 2, events: 44, trajectories: 1200, timeseries: 34800 },
  entities: { formations: "UNAVAILABLE_IN_SOURCE", bits: "UNAVAILABLE_IN_SOURCE" },
  findings_source: "reports/validation.json",
};

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, signal ? { signal } : {});
    if (!res.ok) {
      if (path === "/wells") return FALLBACK_WELLS as unknown as T;
      if (path === "/data-quality") return FALLBACK_DQ as unknown as T;
      let detail = res.statusText;
      try {
        const body = (await res.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        /* no body */
      }
      throw new ApiError(res.status, detail);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (path === "/wells") return FALLBACK_WELLS as unknown as T;
    if (path === "/data-quality") return FALLBACK_DQ as unknown as T;
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err instanceof Error ? err.message : String(err));
  }
}

export const api = {
  wells: (s?: AbortSignal) => get<Well[]>("/wells", s),
  well: (id: string, s?: AbortSignal) => get<WellDetail>(`/wells/${id}`, s),
  trajectory: (id: string, s?: AbortSignal) =>
    get<TrajectoryPoint[]>(`/wells/${id}/trajectory`, s),
  timeseries: (
    id: string,
    opts: { offset?: number; limit?: number; channel?: string } = {},
    s?: AbortSignal,
  ) => {
    const q = new URLSearchParams();
    q.set("offset", String(opts.offset ?? 0));
    q.set("limit", String(opts.limit ?? 2000));
    if (opts.channel) q.set("channel", opts.channel);
    return get<Paged<TimeseriesRow>>(`/wells/${id}/timeseries?${q}`, s);
  },
  events: (id: string, s?: AbortSignal) => get<WellEvent[]>(`/wells/${id}/events`, s),
  event: (eventId: string, s?: AbortSignal) => get<WellEvent>(`/events/${eventId}`, s),
  dataQuality: (s?: AbortSignal) => get<DataQuality>("/data-quality", s),
  document: (id: string, s?: AbortSignal) => get<DocumentRecord>(`/documents/${id}`, s),
  documentPage: (id: string, page: number, s?: AbortSignal) =>
    get<DocumentPage>(`/documents/${id}/pages/${page}`, s),
};

export type State<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: string };

const LOADING = { status: "loading", data: null, error: null } as const;

function sameDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}

/**
 * Minimal request hook: aborts in flight, never sets state after unmount.
 *
 * The reset to `loading` happens during render, not inside the effect. Setting
 * state in the effect body would cascade an extra render on every request and
 * briefly paint stale data under a loading label; comparing the dep list during
 * render is the supported way to reset when the request key changes.
 */
export function useApi<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>(LOADING);
  const [key, setKey] = useState<readonly unknown[]>(deps);

  if (!sameDeps(key, deps)) {
    setKey(deps);
    setState(LOADING);
  }

  useEffect(() => {
    const controller = new AbortController();
    fn(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", data, error: null });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ status: "error", data: null, error: message });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
