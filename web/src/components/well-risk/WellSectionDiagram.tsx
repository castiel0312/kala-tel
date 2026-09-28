import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { IntervalAssessment, RiskBin, RiskEvent, RiskLevel, RiskProfilePoint, RiskTrajectoryPoint } from "./wellRisk";
import { assessInterval, RISK_CONFIG } from "./wellRisk";
import { IntervalAssessmentCard } from "./IntervalAssessmentCard";
import { buildRiskTvdSlices, type RiskTvdSlice } from "./wellSectionGeometry";
import "./WellSectionDiagram.css";

export interface WellSectionDiagramProps {
  profile: RiskProfilePoint[];
  trajectory: RiskTrajectoryPoint[];
  events: RiskEvent[];
  selectedMd: number;
  td: number;
  bins: RiskBin[];
  onDepthChange: (md: number) => void;
}

interface PathPoint {
  md: number;
  tvd: number;
  x: number;
  y: number;
  level: RiskLevel;
  reached: boolean;
}

interface Zone {
  start: number;
  end: number;
  level: RiskLevel;
}


const riskColor: Record<RiskLevel, string> = {
  low: "#6F8F4E",
  moderate: "#D9A520",
  high: "#D2691E",
  critical: "#A93226",
};
const groundRiskColor: Record<RiskLevel, string> = {
  low: "#2E9E44",
  moderate: "#F5C518",
  high: "#F57C00",
  critical: "#D32F2F",
};
const levelLabel: Record<RiskLevel, string> = { low: "Low", moderate: "Moderate", high: "High", critical: "Critical" };
const levelForScore = (score: number): RiskLevel => score >= RISK_CONFIG.levels.critical ? "critical" : score >= RISK_CONFIG.levels.high ? "high" : score >= RISK_CONFIG.levels.moderate ? "moderate" : "low";
const severityColor = (severity: string | null): string => {
  const value = severity?.toLowerCase() ?? "";
  if (value.includes("critical") || value.includes("high")) return "#A93226";
  if (value.includes("medium")) return "#D2691E";
  return "#D9A520";
};
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const formatNumber = (value: number): string => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

function nearestProfile(profile: RiskProfilePoint[], md: number): RiskProfilePoint | null {
  let found: RiskProfilePoint | null = null;
  for (const point of profile) {
    if (!found || Math.abs(point.md - md) < Math.abs(found.md - md)) found = point;
  }
  return found;
}

function mergeSmallZones(profile: RiskProfilePoint[], td: number): Zone[] {
  if (!profile.length) return [];
  const zones: Zone[] = [];
  let start = profile[0];
  if (!start) return [];
  let level = start.level;
  for (let index = 1; index < profile.length; index += 1) {
    const point = profile[index];
    if (!point) continue;
    if (point.level !== level) {
      const previous = profile[index - 1];
      zones.push({ start: start.md, end: previous?.md ?? point.md, level });
      start = point;
      level = point.level;
    }
  }
  const last = profile.at(-1);
  if (last) zones.push({ start: start.md, end: last.md, level });
  const threshold = Math.max(1, td * 0.03);
  const merged: Zone[] = [];
  for (const zone of zones) {
    const previous = merged.at(-1);
    if (previous && zone.end - zone.start < threshold) {
      const next = zones[zones.indexOf(zone) + 1];
      if (next && next.level === previous.level) previous.end = zone.end;
      else if (next) {
        next.start = previous.start;
        merged.pop();
        merged.push(next);
      } else previous.end = zone.end;
    } else merged.push({ ...zone });
  }
  return merged;
}

function WellPath({
  points, cursorY, surfaceX, surfaceY, reachedPath, futurePath, segments,
}: {
  points: PathPoint[];
  cursorY: number;
  surfaceX: number;
  surfaceY: number;
  reachedPath: string;
  futurePath: string;
  segments: Array<{ d: string; color: string; reached: boolean }>;
}) {
  const selected = points.reduce<PathPoint | null>((best, point) =>
    !best || Math.abs(point.y - cursorY) < Math.abs(best.y - cursorY) ? point : best, null);
  const wellheadX = selected?.x ?? surfaceX;
  return (
    <g>
      <line className="wrg-ground-line" x1="42" y1={surfaceY} x2="520" y2={surfaceY} />
      <g className="wrg-rig" transform={`translate(${surfaceX} ${surfaceY})`}>
        <path d="M -18 0 L 0 -54 L 18 0 M -12 -18 L 12 -18 M -8 -30 L 8 -30 M -4 -42 L 4 -42 M -9 -27 L 9 -33 M -9 -39 L 9 -45 M 0 -54 L 0 -64 M -12 0 L 12 0" />
        <path d="M -22 0 L -18 6 L 18 6 L 22 0 M -8 -18 L 8 -18" />
      </g>
      <path className="wrg-well-outer" d={futurePath} />
      <path className="wrg-well-future" d={futurePath} />
      <path className="wrg-well-outer" d={reachedPath} />
      {segments.map((segment, index) => (
        <path className={`wrg-well-segment${segment.reached ? "" : " wrg-well-segment-dim"}`} d={segment.d} key={`${index}-${segment.color}`} style={{ stroke: segment.reached ? segment.color : undefined }} />
      ))}
      <line className="wrg-depth-guide" x1="42" y1={cursorY} x2={wellheadX + 10} y2={cursorY} />
      <g className="wrg-bit" transform={`translate(${wellheadX} ${cursorY})`}>
        <path d="M -7 -6 L 7 -6 L 4 0 L 0 5 L -4 0 Z M -4 -1 L -9 2 M 4 -1 L 9 2" />
        <circle cx="0" cy="-2" r="1.5" />
      </g>
    </g>
  );
}

export function WellSectionDiagram({ profile, trajectory, events, bins, selectedMd, td, onDepthChange }: WellSectionDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selection, setSelection] = useState<IntervalAssessment | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const selectInterval = (mdFrom: number, mdTo: number) => {
    const assessment = assessInterval(mdFrom, mdTo, bins, trajectory, events, profile);
    setSelection(assessment);
    onDepthChange((assessment.mdFrom + assessment.mdTo) / 2);
  };
  const validTrajectory = trajectory.filter((point) => Number.isFinite(point.md) && point.tvd !== null);
  const hasPath = validTrajectory.length >= 2;
  const source = hasPath ? validTrajectory : profile.map((point) => ({ md: point.md, tvd: point.md, inclination: null, dogleg_severity: null, northing: null, easting: null }));
  const maxTvd = Math.max(td, ...source.map((point) => point.tvd ?? point.md), 1);
  const maxDepth = Math.max(td, profile.at(-1)?.md ?? 0, maxTvd, 1);
  const view = { left: 72, right: 510, top: 70, bottom: 560 };
  const scale = (view.bottom - view.top) / maxTvd;
  const surfaceX = 285;
  const surfaceY = view.top;
  const horizontalOrigin = source[0];
  const horizontalCoordinates = source.map((point) => {
    const northing = "northing" in point ? point.northing : null;
    const easting = "easting" in point ? point.easting : null;
    const originN = horizontalOrigin && "northing" in horizontalOrigin ? horizontalOrigin.northing : null;
    const originE = horizontalOrigin && "easting" in horizontalOrigin ? horizontalOrigin.easting : null;
    return northing !== null && easting !== null && originN !== null && originE !== null
      ? Math.hypot(northing - originN, easting - originE)
      : 0;
  });
  const maxHorizontal = Math.max(1, ...horizontalCoordinates);
  const horizontalScale = Math.min(scale, (surfaceX - view.left - 20) / maxHorizontal, (view.right - surfaceX - 20) / maxHorizontal);
  const origins = source[0];
  const originNorth = origins && "northing" in origins ? origins.northing : null;
  const originEast = origins && "easting" in origins ? origins.easting : null;
  const points: PathPoint[] = source.map((point, index) => {
    const matched = nearestProfile(profile, point.md);
    const tvd = point.tvd ?? point.md;
    const northing = "northing" in point ? point.northing : null;
    const easting = "easting" in point ? point.easting : null;
    const horizontal = hasPath && northing !== null && easting !== null && originNorth !== null && originEast !== null
      ? Math.hypot(northing - originNorth, easting - originEast)
      : 0;
    const displacement = horizontalCoordinates[index] ?? 0;
    const signedDirection = point === origins || horizontal === 0 ? 0 : Math.sign((northing ?? 0) - (originNorth ?? 0)) || Math.sign((easting ?? 0) - (originEast ?? 0)) || 1;
    return {
      md: point.md, tvd, x: clamp(surfaceX + displacement * horizontalScale * signedDirection, view.left + 8, view.right - 8),
      y: clamp(surfaceY + tvd * scale, view.top, view.bottom), level: matched?.level ?? "low", reached: point.md <= selectedMd,
    };
  });
  const selectedPoint = points.reduce<PathPoint | null>((best, point) =>
    !best || Math.abs(point.md - selectedMd) < Math.abs(best.md - selectedMd) ? point : best, null);
  const cursorY = selectedPoint?.y ?? surfaceY;
  const cursorRisk = nearestProfile(profile, selectedMd);
  const pathFor = (items: PathPoint[]) => items.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const reachedPoints = points.filter((point) => point.md <= selectedMd);
  const futurePoints = points.filter((point) => point.md > selectedMd);
  const reachedPath = pathFor(reachedPoints);
  const futurePath = pathFor(futurePoints);
  const segments = points.slice(1).flatMap((point, index) => {
    const previous = points[index];
    if (!previous) return [];
    const matched = nearestProfile(profile, (previous.md + point.md) / 2);
    return [{ d: `M ${previous.x} ${previous.y} L ${point.x} ${point.y}`, color: riskColor[matched?.level ?? "low"], reached: (previous.md + point.md) / 2 <= selectedMd }];
  });
  const zones = useMemo(() => mergeSmallZones(profile, maxDepth), [profile, maxDepth]);
  const riskSlices = useMemo(() => buildRiskTvdSlices(trajectory, profile, maxTvd), [trajectory, profile, maxTvd]);
  const mdAtPointer = (event: PointerEvent<SVGSVGElement>): number => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return selectedMd;
    const y = ((event.clientY - bounds.top) / bounds.height) * 600;
    const targetY = clamp(y, view.top, view.bottom);
    const closest = points.reduce<PathPoint | null>((best, point) =>
      !best || Math.abs(point.y - targetY) < Math.abs(best.y - targetY) ? point : best, null);
    return closest?.md ?? selectedMd;
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Home") { event.preventDefault(); onDepthChange(0); }
    else if (event.key === "End") { event.preventDefault(); onDepthChange(maxDepth); }
    else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const closestIndex = points.reduce((bestIndex, point, index) => {
        const best = points[bestIndex];
        return best && Math.abs(point.md - selectedMd) < Math.abs(best.md - selectedMd) ? index : bestIndex;
      }, 0);
      const next = points[clamp(closestIndex + direction, 0, Math.max(0, points.length - 1))];
      if (next) onDepthChange(next.md);
    }
  };
  const handleEvent = (event: RiskEvent) => `${event.event_type} · ${event.end_md === null ? "depth not reported" : `${formatNumber(event.end_md)} m`} · ${event.severity ?? "severity not reported"} · ${event.npt_hours ?? "hours not reported"} h lost`;
  const zoneDetails = (zone: Zone) => {
    const assessment = assessInterval(zone.start, zone.end, bins, trajectory, events, profile);
    const factorDefinitions = [
      { id: "depth", label: "Depth exposure", weight: RISK_CONFIG.depth.weight },
      { id: "incident", label: "Incident history", weight: RISK_CONFIG.incident.weight },
      { id: "geometry", label: "Hole geometry", weight: RISK_CONFIG.geometry.weight },
      { id: "dynamics", label: "Drilling dynamics", weight: RISK_CONFIG.dynamics.weight },
      { id: "control", label: "Well-control signals", weight: RISK_CONFIG.control.weight },
    ] as const;
    const available = factorDefinitions.flatMap((factor) => {
      const score = assessment.factorScores[factor.id];
      return score === null || !Number.isFinite(score) ? [] : [{ ...factor, score }];
    });
    const availableWeight = available.reduce((sum, factor) => sum + factor.weight, 0);
    const factors = available.map((factor) => ({
      ...factor,
      contribution: availableWeight > 0 ? factor.score * factor.weight / availableWeight : 0,
    }));
    const total = factors.reduce((sum, factor) => sum + factor.contribution, 0);
    const score = assessment.meanScore ?? 0;
    return { assessment, factors, total, score, level: assessment.level ?? levelForScore(score) };
  };
  const toggleZone = (zone: Zone) => {
    const key = `${zone.start}:${zone.end}`;
    if (expandedZone === key) {
      setExpandedZone(null);
      return;
    }
    setExpandedZone(key);
    onDepthChange((zone.start + zone.end) / 2);
  };
  const assessSlice = (slice: RiskTvdSlice) => {
    if (slice.mdTop === null || slice.mdBottom === null) return;
    selectInterval(slice.mdTop, slice.mdBottom);
  };
  const onDiagramKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Escape" && selection) {
      event.preventDefault();
      setSelection(null);
      return;
    }
    onKeyDown(event);
  };

  return (
    <section className="wrg-section-card">
      <header className="wrg-section-header"><h2>Well section</h2><span>SCHEMATIC · TVD (m)</span></header>
      <div className="wrg-section-layout">
        <div className="wrg-section-visual">
          <svg
            className="wrg-section-svg"
            ref={svgRef}
            viewBox="0 0 560 600"
            preserveAspectRatio="xMidYMin meet"
            role="slider"
            tabIndex={0}
            aria-label="Well section selected depth"
            aria-valuemin={0}
            aria-valuemax={Math.round(maxDepth)}
            aria-valuenow={Math.round(selectedMd)}
            aria-valuetext={`${formatNumber(selectedMd)} metres, risk ${cursorRisk?.score ?? 0} percent, ${cursorRisk?.level ?? "unknown"}`}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onDepthChange(mdAtPointer(event)); }}
            onPointerMove={(event) => { if (event.buttons > 0) onDepthChange(mdAtPointer(event)); }}
            onKeyDown={onDiagramKeyDown}
          >
            <defs>
              <pattern id="wrg-topsoil" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="#2A2418" fillOpacity=".1" /><circle cx="9" cy="10" r=".6" fill="#2A2418" fillOpacity=".1" /></pattern>
              <pattern id="wrg-sediment" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 0 3 H 5 M 5 8 H 10" stroke="#2A2418" strokeOpacity=".1" strokeWidth=".7" /></pattern>
              <pattern id="wrg-weathered" width="11" height="11" patternUnits="userSpaceOnUse"><path d="M 2 0 L 0 3 M 8 3 L 5 6 M 11 8 L 8 11" stroke="#2A2418" strokeOpacity=".1" strokeWidth=".8" /></pattern>
              <pattern id="wrg-basement" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r=".7" fill="#2A2418" fillOpacity=".1" /><circle cx="11" cy="10" r=".7" fill="#2A2418" fillOpacity=".1" /><path d="M 0 12 L 4 10" stroke="#2A2418" strokeOpacity=".1" strokeWidth=".6" /></pattern>
            </defs>
            <rect className="wrg-earth-band" x="42" y={surfaceY} width="478" height="122" fill="url(#wrg-topsoil)" />
            <rect className="wrg-earth-band" x="42" y="192" width="478" height="122" fill="url(#wrg-sediment)" />
            <rect className="wrg-earth-band" x="42" y="314" width="478" height="123" fill="url(#wrg-weathered)" />
            <rect className="wrg-earth-band" x="42" y="437" width="478" height="123" fill="url(#wrg-basement)" />
            {[192, 314, 437].map((y) => <line className="wrg-strata-boundary" key={y} x1="42" y1={y} x2="520" y2={y} />)}
            {riskSlices.map((slice, index) => {
              const top = clamp(surfaceY + slice.tvdTop * scale, surfaceY, view.bottom);
              const bottom = clamp(surfaceY + slice.tvdBottom * scale, surfaceY, view.bottom);
              const reached = slice.mdTop !== null && slice.mdTop <= selectedMd;
              const fill = slice.level ? groundRiskColor[slice.level] : "#8A7F68";
              const fillOpacity = reached ? 0.85 : 0.35;
              const selected = selection !== null && slice.mdTop !== null && slice.mdBottom !== null
                && selection.mdFrom === slice.mdTop && selection.mdTo === slice.mdBottom;
              const sliceLabel = `${formatNumber(slice.mdTop ?? slice.tvdTop)} to ${formatNumber(slice.mdBottom ?? slice.tvdBottom)} metres, ${slice.level ? levelLabel[slice.level] : "unavailable"} risk`;
              return <g className={`wrg-risk-slice${selected ? " wrg-risk-slice-selected" : ""}`} key={`risk-slice-${index}`}>
                <rect className="wrg-risk-overlay" x="48" y={top} width="472" height={Math.max(0, bottom - top)} fill={fill} fillOpacity={fillOpacity} role="button" tabIndex={0} aria-label={sliceLabel} aria-pressed={selected} onClick={() => assessSlice(slice)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); assessSlice(slice); } }}>
                  <title>{`${formatNumber(slice.tvdTop)}–${formatNumber(slice.tvdBottom)} m TVD · ${slice.level ? levelLabel[slice.level] : "No data"}`}</title>
                </rect>
                {selected && <rect className="wrg-risk-slice-outline" x="48" y={top} width="472" height={Math.max(0, bottom - top)} />}
                <rect className="wrg-risk-strip" x="42" y={top} width="6" height={Math.max(0, bottom - top)} fill={fill} />
                {!reached && <line className="wrg-risk-future-edge" x1="48" y1={top} x2="520" y2={top} />}
              </g>;
            })}
            <line className="wrg-surface-line" x1="42" y1={surfaceY} x2="520" y2={surfaceY} />
            {[0, 500, 1000, 1500, 2000, 2500, 3000].filter((depth) => depth <= maxDepth).map((depth) => {
              const y = surfaceY + depth * scale;
              return <g key={depth}><line className="wrg-ruler-tick" x1="47" y1={y} x2="58" y2={y} /><text className="wrg-ruler-label" x="43" y={y - 4} textAnchor="end">{depth.toLocaleString("en-US")}</text></g>;
            })}
            {Array.from({ length: 5 }, (_, index) => {
              const depth = maxDepth * index / 4;
              const y = surfaceY + depth * scale;
              return <g key={`pct-${index}`}><line className="wrg-percent-tick" x1="57" y1={y} x2="64" y2={y} /><text className="wrg-percent-label" x="66" y={y + 3}>{index * 25}%</text></g>;
            })}
            <text className="wrg-ruler-title" x="14" y="56">TVD (m)</text>
            <WellPath points={points} cursorY={cursorY} surfaceX={surfaceX} surfaceY={surfaceY} reachedPath={reachedPath} futurePath={futurePath} segments={segments} />
            {events.filter((event) => event.end_md !== null).map((event, index) => {
              const markerPoint = points.reduce<PathPoint | null>((best, point) =>
                !best || Math.abs(point.md - (event.end_md ?? point.md)) < Math.abs(best.md - (event.end_md ?? point.md)) ? point : best, null);
              return markerPoint ? <g className="wrg-section-event" key={`${event.event_type}-${event.end_md}-${index}`} tabIndex={0} role="button" aria-label={handleEvent(event)} onClick={() => { if (event.end_md !== null) selectInterval(event.end_md, event.end_md); }} onKeyDown={(keyEvent) => { if ((keyEvent.key === "Enter" || keyEvent.key === " ") && event.end_md !== null) { keyEvent.preventDefault(); selectInterval(event.end_md, event.end_md); } }}>
                <line x1={markerPoint.x - 5} y1={markerPoint.y} x2={markerPoint.x + 7} y2={markerPoint.y} style={{ stroke: severityColor(event.severity) }} />
                <title>{handleEvent(event)}</title>
              </g> : null;
            })}
            {cursorRisk && selectedPoint && <g className="wrg-bit-label" transform={`translate(${Math.min(selectedPoint.x + 15, 380)} ${Math.max(30, cursorY - 13)})`}>
              <rect x="0" y="-16" width="150" height="24" rx="4" />
              <text className="wrg-bit-depth" x="7" y="0">{formatNumber(selectedMd)} m MD</text>
              <text className="wrg-bit-score" x="83" y="0">- {cursorRisk.score}%</text>
              <rect className="wrg-bit-square" x="119" y="-9" width="7" height="7" style={{ fill: riskColor[cursorRisk.level] }} />
              <text className="wrg-bit-level" x="130" y="0">{levelLabel[cursorRisk.level]}</text>
            </g>}
          </svg>
          <p className="wrg-section-caption">Illustrative ground section. Formation tops are not available for this well. Colour overlay = risk level, not formation.</p>
        </div>
        <div className="wrg-risk-zones">
          <h3>Risk zones</h3>
          {zones.map((zone, index) => {
            const key = `${zone.start}:${zone.end}`;
            const expanded = expandedZone === key;
            const details = expanded ? zoneDetails(zone) : null;
            return <div className="wrg-zone" key={`${zone.level}-${index}`}>
              <button className="wrg-zone-row" aria-expanded={expanded} onClick={() => toggleZone(zone)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleZone(zone); } }} type="button">
                <i style={{ background: groundRiskColor[zone.level] }} />
                <span>{formatNumber(zone.start)} - {formatNumber(zone.end)} m</span>
                <strong>{levelLabel[zone.level]}</strong>
              </button>
              {details && <div className="wrg-zone-details">
                <div className="wrg-zone-detail-summary"><strong>{details.score.toFixed(1)}%</strong><span>{levelLabel[details.level]} · interval score</span></div>
                {details.factors.map((factor) => <p className="wrg-zone-factor" key={factor.id}>
                  <span>{factor.label}</span>
                  <span>{factor.score.toFixed(1)} x {(factor.weight * 100).toFixed(0)}% = {factor.contribution.toFixed(1)}</span>
                </p>)}
                <p className="wrg-zone-total">Total: {details.factors.map((factor) => factor.contribution.toFixed(1)).join(" + ") || "0.0"} = {details.total.toFixed(1)} points · zone mean {details.score.toFixed(1)}%</p>
                <p className="wrg-zone-not-scored">Not scored: gas, H2S, flow balance — no sensor data for this well</p>
                <p className="wrg-zone-events">Events inside zone: {details.assessment.events.length}</p>
              </div>}
            </div>;
          })}
        </div>
      </div>
      {selection && <IntervalAssessmentCard assessment={selection} onClear={() => setSelection(null)} />}
    </section>
  );
}
