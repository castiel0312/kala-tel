import type { PlanningScenario } from "./types";

interface ScenarioComparisonProps {
  scenarios: PlanningScenario[];
  activeScenario: PlanningScenario;
  onSelectScenario: (scenario: PlanningScenario) => void;
}

export function ScenarioComparison({
  scenarios,
  activeScenario,
  onSelectScenario,
}: ScenarioComparisonProps) {
  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <h2>Planning Scenario Comparison</h2>
        <div className="channel-picker" style={{ margin: 0 }}>
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              aria-pressed={activeScenario.id === sc.id}
              onClick={() => onSelectScenario(sc)}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
        Evaluate trade-offs between mud hydrostatic pressure, drilling days, non-productive time (NPT), and wellbore stability.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              {scenarios.map((sc) => (
                <th
                  key={sc.id}
                  className="num"
                  style={{
                    background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.08)" : undefined,
                    borderBottom: activeScenario.id === sc.id ? "2px solid var(--accent)" : undefined,
                  }}
                >
                  {sc.name}
                  <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
                    {sc.label.length > 22 ? `${sc.label.substring(0, 22)}…` : sc.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>KOP (Kick-off Point)</strong>
              </td>
              {scenarios.map((sc) => (
                <td key={sc.id} className="num" style={{ background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.04)" : undefined }}>
                  {sc.kopMd.toLocaleString()} m
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <strong>Mud Weight (SG)</strong>
              </td>
              {scenarios.map((sc) => (
                <td key={sc.id} className="num" style={{ background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.04)" : undefined }}>
                  <code>{sc.mudWeightSG.toFixed(2)} SG</code>
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <strong>Est. Drilling Time</strong>
              </td>
              {scenarios.map((sc) => (
                <td key={sc.id} className="num" style={{ background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.04)" : undefined }}>
                  <strong>{sc.estDrillingDays} days</strong>
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <strong>Est. NPT (Non-Productive Time)</strong>
              </td>
              {scenarios.map((sc) => (
                <td key={sc.id} className="num" style={{ background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.04)" : undefined }}>
                  <span style={{ color: sc.estNptDays >= 7 ? "#dc2626" : sc.estNptDays >= 5 ? "#d97706" : "#059669", fontWeight: 600 }}>
                    {sc.estNptDays} days
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <strong>Mud Loss Risk</strong>
              </td>
              {scenarios.map((sc) => (
                <td key={sc.id} className="num" style={{ background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.04)" : undefined }}>
                  <span style={{ color: sc.mudLossRiskPct >= 60 ? "#dc2626" : sc.mudLossRiskPct >= 35 ? "#d97706" : "#059669", fontWeight: 600 }}>
                    {sc.mudLossRiskPct}%
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <strong>Stuck Pipe Risk</strong>
              </td>
              {scenarios.map((sc) => (
                <td key={sc.id} className="num" style={{ background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.04)" : undefined }}>
                  <span style={{ color: sc.stuckPipeRiskPct >= 30 ? "#dc2626" : sc.stuckPipeRiskPct >= 20 ? "#d97706" : "#059669", fontWeight: 600 }}>
                    {sc.stuckPipeRiskPct}%
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <strong>Overall Risk Rating</strong>
              </td>
              {scenarios.map((sc) => (
                <td key={sc.id} className="num" style={{ background: activeScenario.id === sc.id ? "rgba(31, 111, 235, 0.04)" : undefined }}>
                  <span
                    className="severity"
                    data-sev={sc.overallRisk === "HIGH" ? "high" : sc.overallRisk === "MEDIUM" ? "medium" : "low"}
                  >
                    {sc.overallRisk}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Selected Scenario Details & Key Mitigations */}
      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "var(--bg)",
          borderRadius: "var(--radius)",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <strong>Active Selection: {activeScenario.name} &mdash; {activeScenario.label}</strong>
          <span className="pill" data-state="PARTIAL">
            {activeScenario.overallRisk} RISK
          </span>
        </div>
        <p style={{ margin: "0 0 8px", color: "var(--ink)" }}>{activeScenario.description}</p>
        <div>
          <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.04em" }}>
            Engineered Mitigations:
          </strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
            {activeScenario.keyMitigations.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
