import type { IntervalAssessment, RiskFactorId, RiskLevel } from "./wellRisk";
import "./WellSectionDiagram.css";

export interface IntervalAssessmentCardProps {
  assessment: IntervalAssessment;
  onClear: () => void;
}

const factorInfo: Array<{ id: RiskFactorId; label: string }> = [
  { id: "depth", label: "Depth exposure" },
  { id: "incident", label: "Incident history" },
  { id: "geometry", label: "Hole geometry" },
  { id: "dynamics", label: "Drilling dynamics" },
  { id: "control", label: "Well-control signals" },
];
const colors: Record<RiskLevel, string> = {
  low: "#6F8F4E", moderate: "#D9A520", high: "#D2691E", critical: "#A93226",
};
const levelName = (level: RiskLevel): string => level.charAt(0).toUpperCase() + level.slice(1);
const format = (value: number | null, digits = 0): string => value === null || !Number.isFinite(value)
  ? "Unavailable"
  : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

export function IntervalAssessmentCard({ assessment, onClear }: IntervalAssessmentCardProps) {
  const levelColor = assessment.level ? colors[assessment.level] : "#8A7F68";
  const averages: Array<[string, number | null]> = [
    ["ROP", assessment.averages.rop], ["WOB", assessment.averages.wob], ["RPM", assessment.averages.rpm],
    ["Hookload", assessment.averages.hookload], ["Pump rate", assessment.averages.pump_rate],
    ["Standpipe pressure", assessment.averages.standpipe_pressure],
  ];
  return (
    <section className="wrg-assessment-card" aria-label="Level details">
      <header className="wrg-assessment-header">
        <div><h2>Level details</h2><span className="wrg-assessment-level"><i style={{ background: levelColor }} />{assessment.level ? levelName(assessment.level) : "Unavailable"}</span></div>
        <button className="wrg-assessment-clear" onClick={onClear} type="button">Clear</button>
      </header>
      <p className="wrg-assessment-range">MD {format(assessment.mdFrom)}–{format(assessment.mdTo)} m <span>·</span> TVD {format(assessment.tvdFrom)}–{format(assessment.tvdTo)} m</p>
      <p className="wrg-assessment-score">Peak {format(assessment.peakScore)}% <span>·</span> Mean {format(assessment.meanScore)}%</p>
      <div className="wrg-assessment-factors">
        {factorInfo.map(({ id, label }) => {
          const score = assessment.factorScores[id];
          return <div className="wrg-assessment-factor" key={id}>
            <div><span>{label}</span><strong>{score === null ? "Unavailable" : `${format(score)}%`}</strong></div>
            <span className="wrg-assessment-track"><i style={{ width: score === null ? "0%" : `${Math.max(0, Math.min(100, score))}%`, background: levelColor }} /></span>
          </div>;
        })}
      </div>
      <div className="wrg-assessment-section">
        <h3>Events</h3>
        {assessment.events.length ? <ul>{assessment.events.map((event, index) => <li key={`${event.type}-${event.md}-${index}`}>{event.title} <span>{format(event.md)} m MD</span></li>)}</ul> : <p>No events in this interval.</p>}
      </div>
      <div className="wrg-assessment-section">
        <h3>Geometry</h3>
        <p>Inclination {format(assessment.inclination.min, 1)}–{format(assessment.inclination.max, 1)}° <span>·</span> Dogleg {format(assessment.doglegSeverity.min, 2)}–{format(assessment.doglegSeverity.max, 2)}</p>
      </div>
      <div className="wrg-assessment-section">
        <h3>Drilling averages</h3>
        <dl className="wrg-assessment-averages">{averages.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{format(value, 2)}</dd></div>)}</dl>
      </div>
      <p className="wrg-assessment-unscored">Not scored: {assessment.notScored.length ? assessment.notScored.join(", ") : "none"}{assessment.notScored.some((item) => item === "Well-control signals") ? " (no sensor data)" : ""}</p>
    </section>
  );
}
