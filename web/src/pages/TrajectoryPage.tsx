import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, useApi } from "../api/client";
import type { TrajectoryPoint } from "../api/types";
import { Chart } from "../components/Chart";
import { thin } from "../lib/plot";
import { Empty, ErrorBox, Loading, UnavailableNote } from "../components/Data";
import { WellNav } from "../components/WellNav";

/** Last survey station depth: TVD is undefined below this and is not extrapolated. */
function surveyFloor(points: TrajectoryPoint[]): number | null {
  if (points.length === 0) return null;
  return points.reduce((max, p) => Math.max(max, p.md), Number.NEGATIVE_INFINITY);
}

export function TrajectoryPage() {
  const { wellId = "" } = useParams();
  const state = useApi((s) => api.trajectory(wellId, s), [wellId]);
  const [cursor, setCursor] = useState<number | null>(null);

  const mdSeries = useMemo(() => {
    if (state.status !== "ready") return { md: [] as number[], tvd: [], tvdss: [], inc: [], azi: [] };
    const pts = thin(state.data, 1200);
    return {
      md: pts.map((p) => p.md),
      tvd: pts.map((p) => p.tvd),
      tvdss: pts.map((p) => p.tvdss),
      inc: pts.map((p) => p.inclination),
      azi: pts.map((p) => p.azimuth),
    };
  }, [state]);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorBox error={state.error} />;

  const points = state.data;
  if (points.length === 0) {
    return (
      <section>
        <WellNav wellId={wellId} />
        <Empty>No trajectory survey stations exist for this well.</Empty>
      </section>
    );
  }

  const floor = surveyFloor(points);
  const first = points[0];
  const last = points[points.length - 1];
  const mdValues = points.map((p) => p.md);
  const mdMin = Math.min(...mdValues);
  const mdMax = Math.max(...mdValues);
  const hasTvd = points.some((p) => p.tvd !== null);
  const hasTvdss = points.some((p) => p.tvdss !== null);
  const missingInc = points.filter((p) => p.inclination === null).length;
  const missingAzi = points.filter((p) => p.azimuth === null).length;

  const cursorPoint =
    cursor === null ? null : nearestByMd(points, cursor);

  return (
    <section>
      <div className="page-head">
        <h1>Trajectory</h1>
        <p className="muted">
          {points.length.toLocaleString()} survey stations &middot; MD{" "}
          {mdMin.toLocaleString()}–{mdMax.toLocaleString()} m
        </p>
      </div>

      <WellNav wellId={wellId} />

      <div className="panel">
        <h2>MD against TVD and TVDSS</h2>
        <div className="chart-legend">
          <span>
            <span className="swatch" style={{ background: "#1f6feb" }} />
            TVD
          </span>
          <span>
            <span className="swatch" style={{ background: "#2da44e" }} />
            TVDSS
          </span>
        </div>
        <Chart
          x={mdSeries.md}
          xLabel="MD (m)"
          yLabel="Depth (m)"
          series={[
            { label: "TVD", values: mdSeries.tvd, stroke: "#1f6feb" },
            { label: "TVDSS", values: mdSeries.tvdss, stroke: "#2da44e", dashed: true },
          ]}
          height={320}
        />
        <p className="chart-note">
          Gaps are genuine absences in the source, drawn as breaks rather than
          zero. TVD is never extrapolated past MD {floor?.toLocaleString()} m, the
          last survey station.
        </p>
      </div>

      <div className="panel">
        <h2>MD against inclination and azimuth</h2>
        <Chart
          x={mdSeries.md}
          xLabel="MD (m)"
          yLabel="Degrees"
          series={[
            { label: "Inclination", values: mdSeries.inc, stroke: "#8250df" },
            { label: "Azimuth", values: mdSeries.azi, stroke: "#bf8700", dashed: true },
          ]}
          height={260}
        />
        {missingInc > 0 || missingAzi > 0 ? (
          <p className="chart-note">
            {missingInc.toLocaleString()} station(s) lack inclination and{" "}
            {missingAzi.toLocaleString()} lack azimuth. Those points are left
            blank.
          </p>
        ) : null}
      </div>

      <div className="panel">
        <h2>Depth cursor</h2>
        <div className="controls">
          <label htmlFor="md-cursor">MD</label>
          <input
            id="md-cursor"
            type="range"
            min={mdMin}
            max={mdMax}
            step={0.5}
            value={cursor ?? mdMax}
            onChange={(e) => setCursor(Number(e.target.value))}
          />
          <span className="cursor-readout">
            {cursorPoint ? `${cursorPoint.md.toLocaleString(undefined, { maximumFractionDigits: 2 })} m` : "—"}
          </span>
        </div>
        {cursorPoint ? (
          <table>
            <thead>
              <tr>
                <th>MD</th>
                <th>TVD</th>
                <th>TVDSS</th>
                <th>Inclination</th>
                <th>Azimuth</th>
                <th>DLS</th>
                <th>Survey time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="num">{cursorPoint.md.toLocaleString()} m</td>
                <td className="num">{fmt(cursorPoint.tvd, "m")}</td>
                <td className="num">{fmt(cursorPoint.tvdss, "m")}</td>
                <td className="num">{fmt(cursorPoint.inclination, "°")}</td>
                <td className="num">{fmt(cursorPoint.azimuth, "°")}</td>
                <td className="num">{fmt(cursorPoint.dogleg_severity, "°/30 m")}</td>
                <td>{cursorPoint.survey_time ?? <Unavailable>unavailable</Unavailable>}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <Empty>Move the cursor to inspect a station.</Empty>
        )}
        <p className="chart-note">
          Survey time is a single dated reference, not per-station timing; the
          source publishes no timezone.
        </p>
      </div>

      <div className="panel">
        <h2>Coverage limits</h2>
        <table>
          <thead>
            <tr>
              <th>Quantity</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>First station</td>
              <td className="num">
                {first?.md.toLocaleString()} m MD
                {first?.tvd !== null && first?.tvd !== undefined
                  ? ` / ${first.tvd.toLocaleString()} m TVD`
                  : " / TVD unavailable"}
              </td>
            </tr>
            <tr>
              <td>Last station (survey floor)</td>
              <td className="num">
                {last?.md.toLocaleString()} m MD
                {last?.tvd !== null && last?.tvd !== undefined
                  ? ` / ${last.tvd.toLocaleString()} m TVD`
                  : " / TVD unavailable"}
              </td>
            </tr>
            <tr>
              <td>TVD below survey floor</td>
              <td>
                <span className="unavailable">Not available</span>
              </td>
            </tr>
            <tr>
              <td>Coordinate reference system</td>
              <td>{first?.source ?? "—"}</td>
            </tr>
          </tbody>
        </table>
        <UnavailableNote>
          {hasTvd && hasTvdss
            ? "Below the survey floor, drilling-sample TVD is interpolated and flagged in the conversion rule. It is not a measured value."
            : "TVD and TVDSS are only present at survey stations."}
        </UnavailableNote>
      </div>
    </section>
  );
}

function nearestByMd(points: TrajectoryPoint[], md: number): TrajectoryPoint | null {
  let best: TrajectoryPoint | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const p of points) {
    const d = Math.abs(p.md - md);
    if (d < bestDelta) {
      bestDelta = d;
      best = p;
    }
  }
  return best;
}

function fmt(v: number | null | undefined, unit: string) {
  if (v === null || v === undefined) return <Unavailable>unavailable</Unavailable>;
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

function Unavailable({ children }: { children: string }) {
  return <span className="unavailable">{children}</span>;
}
