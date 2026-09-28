import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, KeyboardEvent } from "react";
import type { RiskFactor, RiskLevel, RiskProfilePoint } from "./wellRisk";
import "./WellRiskGauge.css";

export interface WellRiskGaugeProps {
  profile: RiskProfilePoint[];
  selectedMd: number;
  compact?: boolean;
  wellName?: string;
}

export interface RiskProfileCardProps {
  profile: RiskProfilePoint[];
  selectedMd: number;
  td: number;
  events: Array<{ event_type: string; end_md: number | null; severity: string | null; npt_hours: number | null }>;
  onDepthChange: (md: number) => void;
}

const riskColors: Record<RiskLevel, string> = {
  low: "#6F8F4E", moderate: "#D9A520", high: "#D2691E", critical: "#A93226",
};
const levelText: Record<RiskLevel, string> = { low: "Low", moderate: "Moderate", high: "High", critical: "Critical" };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatNumber = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

function useCountUp(target: number, duration = 260): number {
  const [prefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [shown, setShown] = useState(target);
  const previous = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const from = previous.current;
    previous.current = target;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = clamp((now - start) / duration, 0, 1);
      setShown(from + (target - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, prefersReducedMotion]);
  return Math.round(prefersReducedMotion ? target : shown);
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

function arcPath(start: number, end: number, radius = 78): string {
  const [x1, y1] = polar(110, 100, radius, start);
  const [x2, y2] = polar(110, 100, radius, end);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
}

function scoreColor(score: number): string {
  if (score >= 75) return riskColors.critical;
  if (score >= 50) return riskColors.high;
  if (score >= 25) return riskColors.moderate;
  return riskColors.low;
}

function GaugeDial({ score, level }: { score: number; level: RiskLevel }) {
  const angle = -180 + score * 1.8;
  const [nx, ny] = polar(110, 100, 61, angle);
  const ticks = Array.from({ length: 21 }, (_, index) => {
    const tickAngle = -180 + index * 9;
    const [x1, y1] = polar(110, 100, index % 5 === 0 ? 88 : 91, tickAngle);
    const [x2, y2] = polar(110, 100, index % 5 === 0 ? 96 : 94, tickAngle);
    return <line className={`wrg-tick${index % 5 === 0 ? " wrg-tick-major" : ""}`} key={index} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });
  return (
    <svg className="wrg-dial" viewBox="0 0 220 140" aria-hidden="true">
      <path className="wrg-segment wrg-segment-low" d={arcPath(-178, -137)} />
      <path className="wrg-segment wrg-segment-moderate" d={arcPath(-133, -92)} />
      <path className="wrg-segment wrg-segment-high" d={arcPath(-88, -47)} />
      <path className="wrg-segment wrg-segment-critical" d={arcPath(-43, -2)} />
      {ticks}
      <text className="wrg-dial-label" x="19" y="119">0</text>
      <text className="wrg-dial-label" x="47" y="43">25</text>
      <text className="wrg-dial-label" x="106" y="17">50</text>
      <text className="wrg-dial-label" x="164" y="43">75</text>
      <text className="wrg-dial-label" x="190" y="119">100</text>
      <line className="wrg-needle" x1="110" y1="100" x2={nx} y2={ny} style={{ stroke: riskColors[level] }} />
      <circle className="wrg-hub" cx="110" cy="100" r="5" />
    </svg>
  );
}

function RiskChart({
  profile, selectedMd, td, events, onDepthChange,
}: RiskProfileCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const maxDepth = Math.max(td, profile.at(-1)?.md ?? 0, 1);
  const chart = { left: 48, right: 960, top: 18, bottom: 270 };
  const xAt = (md: number) => chart.left + clamp(md / maxDepth, 0, 1) * (chart.right - chart.left);
  const yAt = (score: number) => chart.bottom - clamp(score, 0, 100) / 100 * (chart.bottom - chart.top);
  const path = profile.map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(point.md)} ${yAt(point.score)}`).join(" ");
  const firstPoint = profile.at(0);
  const lastPoint = profile.at(-1);
  const area = firstPoint && lastPoint ? `${path} L ${xAt(lastPoint.md)} ${chart.bottom} L ${xAt(firstPoint.md)} ${chart.bottom} Z` : "";
  const x = xAt(selectedMd);
  const selected = profile.reduce<RiskProfilePoint | null>((best, item) => !best || Math.abs(item.md - selectedMd) < Math.abs(best.md - selectedMd) ? item : best, null);

  const updateFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const bounds = svg?.getBoundingClientRect();
    if (!svg || !bounds || bounds.width === 0) return;
    const viewBox = svg.viewBox.baseVal;
    const svgX = viewBox.x + ((event.clientX - bounds.left) / bounds.width) * viewBox.width;
    onDepthChange(clamp(((svgX - chart.left) / (chart.right - chart.left)) * maxDepth, 0, maxDepth));
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const increment = maxDepth / 100;
    if (event.key === "Home") onDepthChange(0);
    else if (event.key === "End") onDepthChange(maxDepth);
    else onDepthChange(clamp(selectedMd + (event.key === "ArrowRight" ? increment : -increment), 0, maxDepth));
  };

  return (
    <section className="wrg-profile-card">
      <header className="wrg-profile-card-heading"><h2>Risk profile</h2><span>DEEPER →</span></header>
      <div className="wrg-chart-wrap">
      <svg
        className="wrg-chart"
        ref={svgRef}
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
        role="slider"
        tabIndex={0}
        aria-label="Selected well depth"
        aria-valuemin={0}
        aria-valuemax={Math.round(maxDepth)}
        aria-valuenow={Math.round(selectedMd)}
        aria-valuetext={`${formatNumber(selectedMd)} metres, risk ${selected?.score ?? 0} percent, ${selected?.level ?? "unknown"}`}
        onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); updateFromPointer(event); }}
        onPointerMove={(event) => { if (dragging || event.buttons > 0) updateFromPointer(event); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={onKeyDown}
      >
        {[0, 25, 50, 75, 100].map((score) => <g key={score}><line className="wrg-gridline" x1={chart.left} y1={yAt(score)} x2={chart.right} y2={yAt(score)} /><text className="wrg-chart-label" x="18" y={yAt(score) + 3} textAnchor="middle">{score}</text></g>)}
        {[0, 0.25, 0.5, 0.75, 1].map((portion) => <g key={portion}><line className="wrg-depth-grid" x1={chart.left + portion * (chart.right - chart.left)} y1={chart.top} x2={chart.left + portion * (chart.right - chart.left)} y2={chart.bottom} /><text className="wrg-depth-label" x={chart.left + portion * (chart.right - chart.left)} y="290" textAnchor="middle">{formatNumber(portion * maxDepth)}</text></g>)}
        {area && <path className="wrg-profile-area" d={area} />}
        {profile.length > 1 && <path className="wrg-profile-line" d={path} />}
        {events.filter((event) => event.end_md !== null && event.end_md >= 0 && event.end_md <= maxDepth).map((event, index) => (
          <circle className="wrg-event-marker" key={`${event.event_type}-${event.end_md}-${index}`} cx={xAt(event.end_md ?? 0)} cy={chart.bottom + 8} r="4">
            <title>{`${event.event_type} · ${formatNumber(event.end_md ?? 0)} m · ${event.severity ?? "severity not reported"} · ${event.npt_hours ?? "hours not reported"} h lost`}</title>
          </circle>
        ))}
        <line className="wrg-cursor" x1={x} y1={chart.top} x2={x} y2={chart.bottom} />
        <circle className="wrg-cursor-dot" cx={x} cy={yAt(selected?.score ?? 0)} r="5" />
      </svg>
      <p className="wrg-chart-hint">Move the cursor along the profile to inspect depth.</p>
      </div>
    </section>
  );
}

function FactorList({ factors }: { factors: RiskFactor[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="wrg-factors">
      <h3>Risk factors</h3>
      {factors.map((factor) => (
        <button
          aria-expanded={expanded === factor.id}
          className={`wrg-factor${expanded === factor.id ? " wrg-factor-open" : ""}`}
          key={factor.id}
          onClick={() => setExpanded(expanded === factor.id ? null : factor.id)}
          type="button"
        >
          <span className="wrg-factor-top"><span>{factor.label}</span><span>{Math.round(factor.score)} <i>· {Math.round(factor.weight * 100)}%</i></span></span>
          <span className="wrg-factor-track"><span style={{ width: `${factor.score}%`, background: scoreColor(factor.score) }} /></span>
          {expanded === factor.id && <span className="wrg-factor-detail"><span>{factor.detail}</span><span>{factor.inputs.join(" · ")}</span></span>}
        </button>
      ))}
      <p className="wrg-footnote">Not scored: gas, H2S, flow balance (no sensor data for this well)</p>
    </div>
  );
}

export function RiskProfileCard(props: RiskProfileCardProps) {
  return <RiskChart {...props} />;
}

export function WellRiskGauge({ profile, selectedMd, compact = false, wellName = "Well" }: WellRiskGaugeProps) {
  const point = useMemo(() => {
    const first = profile.at(0);
    if (!first) return null;
    let closest = first;
    for (const item of profile) if (Math.abs(item.md - selectedMd) < Math.abs(closest.md - selectedMd)) closest = item;
    return closest;
  }, [profile, selectedMd]);
  const score = point?.score ?? 0;
  const animatedScore = useCountUp(score);

  return (
    <section className={`wrg-root${compact ? " wrg-compact" : ""}`} data-risk-level={point?.level ?? "none"}>
      <header className="wrg-header"><span>{wellName}</span><span>WELL RISK PROFILE</span></header>
      {!point ? <p className="wrg-empty">Risk profile is unavailable for this well.</p> : (
        <div className="wrg-columns">
          <div className="wrg-summary">
            <p className="wrg-depth-readout">{formatNumber(selectedMd)} m <span>MEASURED DEPTH</span></p>
            <div className="wrg-gauge-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={`Well risk ${score} percent, ${levelText[point.level]}`}>
              <GaugeDial score={score} level={point.level} />
              <div className="wrg-scoreline"><span className="wrg-score">{animatedScore}%</span><span className="wrg-level"><i style={{ background: riskColors[point.level] }} />{levelText[point.level]}</span></div>
            </div>
            <FactorList factors={point.factors} />
          </div>
        </div>
      )}
    </section>
  );
}
