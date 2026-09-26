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

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, signal ? { signal } : {});
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* response had no JSON body; statusText is the best we have */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
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
