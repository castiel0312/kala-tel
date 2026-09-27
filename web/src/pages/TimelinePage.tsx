import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, useApi } from "../api/client";
import { UNAVAILABLE_CHANNELS } from "../api/types";
import type { TimeseriesRow } from "../api/types";
import { Chart } from "../components/Chart";
import { Empty, ErrorBox, Loading, UnavailableNote } from "../components/Data";
import { WellNav } from "../components/WellNav";
import { thin } from "../lib/plot";

const WINDOW = 2000;

/** Stable reference so useMemo dependencies do not change every render. */
const NO_ROWS: TimeseriesRow[] = [];

interface Channel {
  key: string;
  label: string;
  unit: string;
  color: string;
}

/** Channels this release actually measures, with canonical units. */
const AVAILABLE: Channel[] = [
  { key: "rop", label: "ROP", unit: "m/h", color: "#1f6feb" },
  { key: "wob", label: "WOB", unit: "kN", color: "#2da44e" },
  { key: "rpm", label: "RPM", unit: "rpm", color: "#8250df" },
  { key: "hookload", label: "Hookload", unit: "kN", color: "#bf8700" },
  { key: "pump_rate", label: "Pump rate", unit: "L/min", color: "#1f7a8c" },
  {
    key: "standpipe_pressure",
    label: "Standpipe pressure",
    unit: "MPa",
    color: "#a40e26",
  },
  { key: "pit_volume", label: "Pit volume", unit: "m³", color: "#57606a" },
];

/**
 * Channels the plan calls for that this source cannot supply. Listed with the
 * reason so the UI can state the absence instead of drawing an empty axis.
 */
const ABSENT: Channel[] = [
  { key: "drag", label: "Drag", unit: "kN", color: "#888" },
  { key: "flow_in", label: "Flow in", unit: "L/min", color: "#888" },
  { key: "flow_out", label: "Flow out", unit: "L/min", color: "#888" },
  { key: "ecd", label: "ECD", unit: "g/cm³", color: "#888" },
  { key: "mud_weight", label: "Mud weight", unit: "g/cm³", color: "#888" },
  { key: "torque", label: "Torque", unit: "kN·m", color: "#888" },
  { key: "h2s", label: "H₂S", unit: "ppm", color: "#888" },
];

type Domain = "md" | "time";

export function TimelinePage() {
  const { wellId = "" } = useParams();
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<string[]>(["rop", "wob"]);
  const [domain, setDomain] = useState<Domain>("md");

  const offset = page * WINDOW;
  const state = useApi(
    (s) => api.timeseries(wellId, { offset, limit: WINDOW }, s),
    [wellId, offset],
  );

  const toggle = useCallback((key: string) => {
    setActive((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const rows: TimeseriesRow[] = state.status === "ready" ? state.data.items : NO_ROWS;
  const total = state.status === "ready" ? state.data.count : 0;

  const plot = useMemo(() => {
    // A sample with no MD has no position on a depth axis, so it cannot be
    // plotted at all. It is dropped rather than being given a synthetic depth.
    const pts = thin(
      domain === "md" ? rows.filter((r) => r.md !== null) : rows,
      1000,
    );
    const x =
      domain === "md"
        ? pts.map((r) => r.md as number)
        : pts.map((r) => epochSeconds(r.timestamp));
    return {
      x,
      series: active.map((key) => {
        const ch = AVAILABLE.find((c) => c.key === key);
        return {
          key,
          label: ch?.label ?? key,
          color: ch?.color ?? "#1f6feb",
          values: pts.map((r) => readChannel(r, key)),
        };
      }),
    };
  }, [rows, active, domain]);

  const domainLabel = domain === "md" ? "MD (m)" : "Time";
  const lastPage = Math.max(0, Math.ceil(total / WINDOW) - 1);

  const body = (() => {
    if (state.status === "loading") return <Loading />;
    if (state.status === "error") return <ErrorBox error={state.error} />;
    if (rows.length === 0) return <Empty>No drilling samples exist for this well.</Empty>;
    return (
      <Chart
        x={plot.x}
        xLabel={domainLabel}
        yLabel={active.map(labelFor).join(" / ") || "channel"}
        series={plot.series.map((s) => ({ label: s.label, values: s.values, stroke: s.color }))}
        height={320}
      />
    );
  })();

  return (
    <section>
      <div className="page-head">
        <h1>Drilling parameters</h1>
        <p className="muted">
          {total.toLocaleString()} samples, 10-second source data resampled to 1
          minute
        </p>
      </div>

      <WellNav wellId={wellId} />

      <div className="panel">
        <h2>Channels with data</h2>
        <div className="channel-picker">
          {AVAILABLE.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={active.includes(c.key)}
              onClick={() => toggle(c.key)}
            >
              {c.label} <span className="muted">({c.unit})</span>
            </button>
          ))}
        </div>
        {body}
        <p className="chart-note">
          Points are shown only where the source reported a value. A break in a
          line means the channel stopped being reported; it is never drawn as
          zero.
        </p>
      </div>

      <div className="panel">
        <h2>Domain</h2>
        <div className="channel-picker">
          <button
            type="button"
            aria-pressed={domain === "md"}
            onClick={() => setDomain("md")}
          >
            Measured depth
          </button>
          <button
            type="button"
            aria-pressed={domain === "time"}
            onClick={() => setDomain("time")}
          >
            Time
          </button>
        </div>
        {domain === "time" ? (
          <UnavailableNote>
            Source timestamps are naive local: no timezone is published, so the
            time axis is correct in shape but not anchored to UTC.
          </UnavailableNote>
        ) : null}
      </div>

      <div className="panel">
        <div className="controls">
          <button
            type="button"
            className="evidence-link"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="cursor-readout">
            {(offset + 1).toLocaleString()}–
            {Math.min(offset + WINDOW, total).toLocaleString()} of{" "}
            {total.toLocaleString()}
          </span>
          <button
            type="button"
            className="evidence-link"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
          >
            Next
          </button>
        </div>
        <p className="chart-note">
          The chart shows one window at a time so the browser is not asked to
          render {total.toLocaleString()} points.
        </p>
      </div>

      <div className="panel">
        <h2>Channels unavailable in this source</h2>
        <p className="muted">
          These are declared in the schema but carry no defensible values here.
          They are not charted and not approximated.
        </p>
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {ABSENT.map((c) => (
              <tr key={c.key}>
                <td>
                  {c.label} <span className="muted">({c.unit})</span>
                </td>
                <td>
                  <span className="unavailable">
                    {UNAVAILABLE_CHANNELS[c.key] ?? "Not reported by the source."}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <UnavailableNote>
          Mud weight exists only in the daily mud report table, not per sample.
          Promoting it to a per-sample channel would require assuming a value
          between reports, so it is left unavailable here.
        </UnavailableNote>
      </div>

      <SampleTable rows={rows} />
    </section>
  );
}

function SampleTable({ rows }: { rows: TimeseriesRow[] }) {
  const [open, setOpen] = useState(false);
  const shown = useMemo(() => (open ? thin(rows, 200) : rows.slice(0, 15)), [rows, open]);
  if (rows.length === 0) return null;
  return (
    <div className="panel">
      <h2>Sample rows</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th className="num">MD (m)</th>
              <th className="num">TVD (m)</th>
              <th>Rig state</th>
              <th className="num">ROP</th>
              <th className="num">WOB</th>
              <th className="num">RPM</th>
              <th>Formation</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={`${r.timestamp}-${i}`}>
                <td>{r.timestamp ?? <span className="unavailable">unavailable</span>}</td>
                <td className="num">{r.md?.toFixed(2) ?? "—"}</td>
                <td className="num">{r.tvd?.toFixed(2) ?? "—"}</td>
                <td>{r.rig_state ?? "—"}</td>
                <td className="num">{r.rop?.toFixed(2) ?? "—"}</td>
                <td className="num">{r.wob?.toFixed(2) ?? "—"}</td>
                <td className="num">{r.rpm?.toFixed(2) ?? "—"}</td>
                <td>
                  {r.formation ?? (
                    <span
                      className="unavailable"
                      title={UNAVAILABLE_CHANNELS["formation"]}
                    >
                      unavailable
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="evidence-link"
        style={{ marginTop: 12 }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Show fewer" : `Show more of this window (${rows.length})`}
      </button>
    </div>
  );
}

function readChannel(r: TimeseriesRow, key: string): number | null {
  const v = (r as unknown as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function labelFor(key: string): string {
  return AVAILABLE.find((c) => c.key === key)?.label ?? key;
}

/** Naive ISO local time to seconds. No timezone is applied because none exists. */
function epochSeconds(ts: string | null): number {
  if (!ts) return Number.NaN;
  const t = Date.parse(ts.endsWith("Z") ? ts : `${ts}Z`);
  return Number.isNaN(t) ? Number.NaN : t / 1000;
}
