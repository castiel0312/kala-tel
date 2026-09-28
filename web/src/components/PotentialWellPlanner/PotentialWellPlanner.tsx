import { useState } from "react";
import { LAND_AREAS } from "./mockPlannerData";
import type { LandAreaPreset, PotentialWell, OffsetWellAnalogue, PlanningScenario } from "./types";
import { InteractiveWellMap } from "./InteractiveWellMap";
import { TrajectoryStrataViewer } from "./TrajectoryStrataViewer";
import { OffsetWellsTable } from "./OffsetWellsTable";
import { FormationRiskMatrix } from "./FormationRiskMatrix";
import { ScenarioComparison } from "./ScenarioComparison";
import { DrillingAdvisorySection } from "./DrillingAdvisorySection";
import { KeyRiskZonesAndAIReport } from "./KeyRiskZonesAndAIReport";
import { LLMWellIdentifier } from "./LLMWellIdentifier";

const DEFAULT_AREA = LAND_AREAS[0]!;
const DEFAULT_WELL = DEFAULT_AREA.potentialWells[0]!;
const DEFAULT_SCENARIO = DEFAULT_WELL.scenarios[0]!;

export function PotentialWellPlanner() {
  const [selectedAreaId, setSelectedAreaId] = useState<string>("duliajan-basin");
  const area: LandAreaPreset = LAND_AREAS.find((a) => a.id === selectedAreaId) ?? DEFAULT_AREA;

  const [selectedWellId, setSelectedWellId] = useState<string>(area.potentialWells[0]?.id ?? DEFAULT_WELL.id);
  const selectedWell: PotentialWell =
    area.potentialWells.find((w) => w.id === selectedWellId) ?? area.potentialWells[0] ?? DEFAULT_WELL;

  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(area.defaultRadiusKm);
  const [selectedOffset, setSelectedOffset] = useState<OffsetWellAnalogue | null>(null);

  const [activeScenarioId, setActiveScenarioId] = useState<string>(selectedWell.scenarios[0]?.id ?? DEFAULT_SCENARIO.id);
  const activeScenario: PlanningScenario =
    selectedWell.scenarios.find((s) => s.id === activeScenarioId) ?? selectedWell.scenarios[0] ?? DEFAULT_SCENARIO;

  // Handle area change
  const handleAreaChange = (areaId: string) => {
    setSelectedAreaId(areaId);
    const newArea = LAND_AREAS.find((a) => a.id === areaId) ?? DEFAULT_AREA;
    const firstWell = newArea.potentialWells[0] ?? DEFAULT_WELL;
    setSelectedWellId(firstWell.id);
    setSelectedRadiusKm(newArea.defaultRadiusKm);
    setSelectedOffset(null);
    setActiveScenarioId(firstWell.scenarios[0]?.id ?? DEFAULT_SCENARIO.id);
  };

  // Handle well change
  const handleWellChange = (well: PotentialWell) => {
    setSelectedWellId(well.id);
    setSelectedOffset(null);
    setActiveScenarioId(well.scenarios[0]?.id ?? DEFAULT_SCENARIO.id);
  };

  return (
    <section id="potential-well-planner" style={{ marginTop: 40, borderTop: "2px solid var(--line)", paddingTop: 28 }}>
      {/* Header */}
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>Future Well / Potential Well Planner</h1>
            <span className="pill" data-state="PARTIAL">
              Nearby Intelligence System
            </span>
          </div>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Predict drilling geohazards, optimize trajectory, and formulate step-by-step engineering plans using verified offset well analogues.
          </p>
        </div>

        {/* Area / Field Dropdown Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Field Area:</span>
          <select
            value={selectedAreaId}
            onChange={(e) => handleAreaChange(e.target.value)}
            style={{
              padding: "6px 12px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--panel)",
              color: "var(--ink)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {LAND_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Control Center Workflow Steps Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "8px 12px",
          background: "#0c1527",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          borderRadius: "var(--radius)",
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        {[
          { num: "1", label: "Define Well & Location", active: true },
          { num: "2", label: "Plan Trajectory (3D)", active: true },
          { num: "3", label: "Run Forecast (AI/ML)", active: true },
          { num: "4", label: "Compare Scenarios", active: true },
          { num: "5", label: "Final Drilling Plan", active: true },
        ].map((step, idx) => (
          <div
            key={step.num}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: "var(--radius)",
              background: idx === 0 ? "#1e293b" : "transparent",
              color: idx === 0 ? "#38bdf8" : "#94a3b8",
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: idx === 0 ? "#0284c7" : "rgba(255,255,255,0.1)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
              }}
            >
              {step.num}
            </span>
            <span>{step.label}</span>
            {idx < 4 && <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: 4 }}>&rarr;</span>}
          </div>
        ))}
      </div>

      {/* Candidate Well Selection Bar */}
      <div className="panel" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>
              Potential Well Candidates:
            </span>
            <div className="channel-picker" style={{ margin: 0 }}>
              {area.potentialWells.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={selectedWell.id === w.id}
                  onClick={() => handleWellChange(w)}
                >
                  📍 {w.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Target Formation: <strong>{selectedWell.targetFormation}</strong> &middot; Type: <strong>{selectedWell.wellType}</strong>
          </div>
        </div>
      </div>

      {/* LLM Historical Landsite Analysis & Target Discovery Engine */}
      <div style={{ marginBottom: 16 }}>
        <LLMWellIdentifier
          area={area}
          selectedWell={selectedWell}
          onSelectWell={handleWellChange}
        />
      </div>

      {/* Top Details & KPI Stats Grid */}
      <div className="stats" style={{ marginBottom: 16 }}>
        <div className="stat">
          <span className="stat-label">Target Well Name</span>
          <span className="stat-value" style={{ fontSize: 18, color: "var(--accent)" }}>
            {selectedWell.code}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Target Total Depth</span>
          <span className="stat-value">{selectedWell.targetTdMd.toLocaleString()} m</span>
        </div>
        <div className="stat">
          <span className="stat-label">Est. Drilling Time</span>
          <span className="stat-value">{activeScenario.estDrillingDays} days</span>
        </div>
        <div className="stat">
          <span className="stat-label">Est. NPT Days</span>
          <span className="stat-value" style={{ color: activeScenario.estNptDays >= 7 ? "#dc2626" : "#d97706" }}>
            {activeScenario.estNptDays} days
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Mud Loss Risk</span>
          <span className="stat-value" style={{ color: activeScenario.mudLossRiskPct >= 60 ? "#dc2626" : "#059669" }}>
            {activeScenario.mudLossRiskPct}%
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Overall Risk Level</span>
          <span className="stat-value">
            <span
              className="severity"
              data-sev={activeScenario.overallRisk === "HIGH" ? "high" : activeScenario.overallRisk === "MEDIUM" ? "medium" : "low"}
            >
              {activeScenario.overallRisk}
            </span>
          </span>
        </div>
      </div>

      {/* Main Interactive Row: Map View + 3D Strata Profile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16, marginBottom: 16 }}>
        <InteractiveWellMap
          area={area}
          selectedWell={selectedWell}
          onSelectWell={handleWellChange}
          selectedRadiusKm={selectedRadiusKm}
          onSelectRadiusKm={setSelectedRadiusKm}
          selectedOffset={selectedOffset}
          onSelectOffset={setSelectedOffset}
        />

        <TrajectoryStrataViewer well={selectedWell} activeScenario={activeScenario} />
      </div>

      {/* Middle Row: Offset Wells Analogues + Formation Risk Matrix */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16, marginBottom: 16 }}>
        <OffsetWellsTable
          offsetWells={selectedWell.offsetWells}
          selectedOffset={selectedOffset}
          onSelectOffset={setSelectedOffset}
        />

        <FormationRiskMatrix forecasts={selectedWell.formationForecast} />
      </div>

      {/* Scenario Planning & Comparison */}
      <div style={{ marginBottom: 16 }}>
        <ScenarioComparison
          scenarios={selectedWell.scenarios}
          activeScenario={activeScenario}
          onSelectScenario={(s) => setActiveScenarioId(s.id)}
        />
      </div>

      {/* Operational Instructions: How to Drill */}
      <div style={{ marginBottom: 16 }}>
        <DrillingAdvisorySection well={selectedWell} />
      </div>

      {/* Risk Zones, Geological Justification & AI Synthesis */}
      <div>
        <KeyRiskZonesAndAIReport well={selectedWell} activeScenario={activeScenario} />
      </div>
    </section>
  );
}
