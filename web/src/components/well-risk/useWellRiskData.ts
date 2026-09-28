import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import type { TimeseriesRow, TrajectoryPoint, Well, WellEvent } from "../../api/types";
import { computeRiskProfile, type RiskBin, type RiskEvent, type RiskProfilePoint, type RiskTrajectoryPoint } from "./wellRisk";

export interface WellRiskData {
  status: "loading" | "ready" | "error";
  profile: RiskProfilePoint[];
  events: WellEvent[];
  trajectory: RiskTrajectoryPoint[];
  bins: RiskBin[];
  wellName: string;
  td: number;
  retry: () => void;
}

interface RiskDataResult {
  status: "loading" | "ready" | "error";
  profile: RiskProfilePoint[];
  events: WellEvent[];
  trajectory: RiskTrajectoryPoint[];
  bins: RiskBin[];
  wellName: string;
  td: number;
}

interface KeyedRiskData extends RiskDataResult {
  key: string;
}

const LOADING: RiskDataResult = { status: "loading", profile: [], events: [], trajectory: [], bins: [], wellName: "", td: 0 };


const PAGE_SIZE = 20000;
const TARGET_BINS = 500;
const CONTROL_CHANNELS = ["flow_in", "flow_out", "gas_total", "h2s", "ecd", "mud_weight"] as const;

type ControlChannel = (typeof CONTROL_CHANNELS)[number];

function downsample(rows: TimeseriesRow[]): RiskBin[] {
  const valid = rows.filter((row) => typeof row.md === "number" && Number.isFinite(row.md));
  if (!valid.length) return [];
  const minMd = Math.min(...valid.map((row) => row.md ?? 0));
  const maxMd = Math.max(...valid.map((row) => row.md ?? 0));
  const width = Math.max((maxMd - minMd) / TARGET_BINS, 0.01);
  interface Aggregate { count: number; md: number; tvd: number[]; rop: number[]; wob: number[]; rpm: number[]; hookload: number[]; spp: number[]; pump: number[]; pits: number[] }
  const groups = new Map<number, Aggregate>();
  const add = (values: number[], value: number | null) => { if (value !== null && Number.isFinite(value)) values.push(value); };
  for (const row of valid) {
    const md = row.md ?? 0;
    const index = Math.min(TARGET_BINS - 1, Math.floor((md - minMd) / width));
    let group = groups.get(index);
    if (!group) {
      group = { count: 0, md: 0, tvd: [], rop: [], wob: [], rpm: [], hookload: [], spp: [], pump: [], pits: [] };
      groups.set(index, group);
    }
    group.count += 1;
    group.md += md;
    add(group.tvd, row.tvd); add(group.rop, row.rop); add(group.wob, row.wob); add(group.rpm, row.rpm);
    add(group.hookload, row.hookload); add(group.spp, row.standpipe_pressure); add(group.pump, row.pump_rate); add(group.pits, row.pit_volume);
  }
  const avg = (values: number[]): number | null => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  return [...groups.values()].map((group) => ({
    md: group.md / group.count,
    tvd: avg(group.tvd), rop: avg(group.rop), wob: avg(group.wob), rpm: avg(group.rpm), hookload: avg(group.hookload),
    standpipe_pressure: avg(group.spp), pit_volume: group.pits.length ? Math.max(...group.pits) : null, pump_rate: avg(group.pump),
  })).sort((a, b) => a.md - b.md);
}

function mapTrajectory(points: TrajectoryPoint[]): RiskTrajectoryPoint[] {
  return points.map((point) => ({ md: point.md, tvd: point.tvd, northing: point.northing, easting: point.easting, inclination: point.inclination, dogleg_severity: point.dogleg_severity }));
}

function mapEvents(events: WellEvent[]): RiskEvent[] {
  return events.map((event) => ({ event_type: event.event_subtype ?? event.event_type, end_md: event.end_md, severity: event.severity, npt_hours: event.npt_hours }));
}

function readControl(rows: TimeseriesRow[]): Partial<Record<ControlChannel, number>> {
  const control: Partial<Record<ControlChannel, number>> = {};
  const latest = rows.at(-1);
  if (!latest) return control;
  for (const channel of CONTROL_CHANNELS) {
    const value = latest[channel];
    if (typeof value === "number" && Number.isFinite(value)) control[channel] = value;
  }
  return control;
}

function isAbort(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof DOMException && error.name === "AbortError");
}

export function useWellRiskData(wellId?: string): WellRiskData {
  const [retryToken, setRetryToken] = useState(0);
  const requestKey = JSON.stringify([wellId ?? null, retryToken]);
  const [state, setState] = useState<KeyedRiskData>(() => ({ ...LOADING, key: requestKey }));
  const retry = useCallback(() => setRetryToken((token) => token + 1), []);
  const current = state.key === requestKey ? state : { ...LOADING, key: requestKey };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      try {
        let wells: Well[] | null = null;
        let selectedId = wellId;
        if (!selectedId) {
          wells = await api.wells(signal);
          selectedId = wells[0]?.well_id;
          if (!selectedId) throw new Error("No wells are available.");
        }
        const [wellResult, trajectory, events] = await Promise.all([
          wells ? Promise.resolve(wells.find((well) => well.well_id === selectedId)) : api.well(selectedId, signal),
          api.trajectory(selectedId, signal),
          api.events(selectedId, signal),
        ]);
        if (!wellResult) throw new Error("Well not found");
        const well = wellResult;

        const pages: TimeseriesRow[][] = [];
        let offset = 0;
        let expectedCount: number | null = null;
        while (!signal.aborted) {
          const page = await api.timeseries(selectedId, { offset, limit: PAGE_SIZE }, signal);
          pages.push(page.items);
          expectedCount = page.count;
          offset += page.items.length;
          if (!page.items.length || offset >= page.count || page.items.length < PAGE_SIZE) break;
        }
        if (signal.aborted) return;
        const allRows = pages.flat();
        if (expectedCount !== null && expectedCount > offset && !signal.aborted) throw new Error("Incomplete timeseries response.");
        const bins = downsample(allRows);
        const td = well.actual_td ?? Math.max(0, ...bins.map((bin) => bin.md));
        const profile = computeRiskProfile(
          bins,
          mapTrajectory(trajectory),
          mapEvents(events),
          td,
          readControl(allRows) as ControlChannelsInput,
        );
        setState({
          key: requestKey,
          status: "ready", profile, events, trajectory: mapTrajectory(trajectory), bins, wellName: well.well_name ?? well.well_id, td,
        });
      } catch (error) {
        if (isAbort(error, signal)) return;
        setState({ key: requestKey, status: "error", profile: [], events: [], trajectory: [], bins: [], wellName: "", td: 0 });
      }
    };

    void load();
    return () => controller.abort();
  }, [wellId, requestKey]);

  return { ...current, retry };
}

type ControlChannelsInput = {
  flow_in?: number;
  flow_out?: number;
  gas_total?: number;
  h2s?: number;
  ecd?: number;
  mud_weight?: number;
};
