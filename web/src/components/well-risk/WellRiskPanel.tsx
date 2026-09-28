import { useCallback, useMemo, useRef, useState } from "react";
import { RiskProfileCard, WellRiskGauge } from "./WellRiskGauge";
import { WellSectionDiagram } from "./WellSectionDiagram";
import { useWellRiskData } from "./useWellRiskData";
import "./WellRiskGauge.css";

export interface WellRiskPanelProps {
  wellId?: string;
  compact?: boolean;
}

export function WellRiskPanel({ wellId, compact = false }: WellRiskPanelProps) {
  return <WellRiskPanelContent key={wellId ?? "first-well"} wellId={wellId} compact={compact} />;
}

interface WellRiskPanelContentProps {
  wellId: string | undefined;
  compact: boolean;
}

function WellRiskPanelContent({ wellId, compact }: WellRiskPanelContentProps) {
  const data = useWellRiskData(wellId);
  const latestMd = data.profile.at(-1)?.md ?? 0;
  const [selectedMd, setSelectedMd] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const frame = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const maxMd = Math.max(data.td, latestMd, 1);
  const md = selectedMd ?? latestMd;
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const replay = useCallback(() => {
    if (replaying) {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      startTime.current = null;
      setReplaying(false);
      return;
    }
    if (reducedMotion) return;
    setSelectedMd(0);
    setReplaying(true);
    startTime.current = null;
    const animate = (time: number) => {
      if (startTime.current === null) startTime.current = time;
      const progress = Math.min(1, (time - startTime.current) / 8000);
      setSelectedMd(progress * maxMd);
      if (progress >= 1) {
        frame.current = null;
        startTime.current = null;
        setReplaying(false);
      } else frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  }, [maxMd, reducedMotion, replaying]);

  if (data.status === "loading") {
    return <section className={`wrg-root wrg-panel${compact ? " wrg-compact" : ""}`} aria-label="Loading well risk profile">
      <header className="wrg-header"><span className="wrg-skeleton wrg-skeleton-name" /><span className="wrg-skeleton wrg-skeleton-label" /></header>
      <div className="wrg-columns"><div className="wrg-skeleton-summary"><div className="wrg-skeleton wrg-skeleton-line" /><div className="wrg-skeleton wrg-skeleton-dial" />{[0, 1, 2, 3].map((item) => <div className="wrg-skeleton wrg-skeleton-factor" key={item} />)}</div><div className="wrg-skeleton wrg-skeleton-chart" /></div>
    </section>;
  }
  if (data.status === "error") {
    return <section className={`wrg-root wrg-error-panel${compact ? " wrg-compact" : ""}`} role="alert"><p>Could not reach the well data service</p><button className="wrg-retry" onClick={data.retry} type="button">Retry</button></section>;
  }

  return <section className={`wrg-root wrg-panel wrg-panel-layout${compact ? " wrg-panel-compact" : ""}`}>
    <div className="wrg-panel-primary">
      <WellSectionDiagram profile={data.profile} trajectory={data.trajectory} bins={data.bins} events={data.events.map((event) => ({ event_type: event.event_subtype ?? event.event_type, end_md: event.end_md, severity: event.severity, npt_hours: event.npt_hours }))} selectedMd={md} td={data.td} onDepthChange={setSelectedMd} />
      <WellRiskGauge profile={data.profile} selectedMd={md} compact={compact} wellName={data.wellName} />
    </div>
    <div className="wrg-panel-profile">
      <RiskProfileCard profile={data.profile} selectedMd={md} td={data.td} events={data.events.map((event) => ({ event_type: event.event_subtype ?? event.event_type, end_md: event.end_md, severity: event.severity, npt_hours: event.npt_hours }))} onDepthChange={setSelectedMd} />
      <div className="wrg-replay-row"><button className="wrg-replay" disabled={reducedMotion} onClick={replay} type="button">{reducedMotion ? "Replay unavailable with reduced motion" : replaying ? "Pause replay" : "Replay drilling"}</button><span>Surface to {Math.round(maxMd).toLocaleString("en-US")} m · 8 sec</span></div>
    </div>
    <footer className="wrg-disclaimer">Heuristic decision-support indicator, not a validated safety system.</footer>
  </section>;
}
