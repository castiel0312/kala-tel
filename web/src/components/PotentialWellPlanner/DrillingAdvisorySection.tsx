import { useState } from "react";
import type { PotentialWell } from "./types";

interface DrillingAdvisorySectionProps {
  well: PotentialWell;
}

export function DrillingAdvisorySection({ well }: DrillingAdvisorySectionProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const rec = well.drillingRecommendations;

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h2>Drilling Engineering Advisory & Operational Instructions</h2>
        <span className="tag" data-origin="PUBLIC_REAL">
          Drilling Program
        </span>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>
        Step-by-step drilling execution guidelines derived from historical drilling mechanics, casing design, and offset hazard mitigation.
      </p>

      {/* Casing Program Summary */}
      <div style={{ marginBottom: 16 }}>
        <h3>Engineered Casing & Hole Program</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Phase / Section</th>
                <th>Hole Size</th>
                <th>Casing / Liner Size</th>
                <th>Setting Depth</th>
              </tr>
            </thead>
            <tbody>
              {rec.casingProgram.map((c) => (
                <tr key={c.section}>
                  <td>
                    <strong>{c.section}</strong>
                  </td>
                  <td>
                    <code>{c.holeSize}</code>
                  </td>
                  <td>
                    <code>{c.casingSize}</code>
                  </td>
                  <td>
                    <strong>{c.shoeDepth}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step-by-Step Interval Instructions Accordion */}
      <div style={{ marginBottom: 16 }}>
        <h3>Interval-by-Interval Operational Execution ("How to Drill")</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rec.steps.map((step, idx) => {
            const isOpen = expandedStep === idx;
            return (
              <div
                key={step.interval}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  background: "var(--panel)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: isOpen ? "var(--bg)" : "var(--panel)",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => setExpandedStep(isOpen ? null : idx)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <strong>{step.interval}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>
                      ({step.formation})
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{isOpen ? "▲ Hide" : "▼ Expand"}</span>
                </div>

                {isOpen && (
                  <div style={{ padding: "14px", borderTop: "1px solid var(--line)", fontSize: 13, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <strong style={{ color: "var(--ink)" }}>Operational Instruction:</strong>
                      <p style={{ margin: "4px 0 0", color: "var(--ink)", lineHeight: 1.6 }}>{step.operationalGuideline}</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                      <div style={{ background: "var(--bg)", padding: "10px", borderRadius: "var(--radius)" }}>
                        <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--muted)" }}>
                          Mud Weight & Rheology
                        </strong>
                        <div style={{ marginTop: 4 }}>{step.mudWeightAndRheology}</div>
                      </div>

                      <div style={{ background: "var(--bg)", padding: "10px", borderRadius: "var(--radius)" }}>
                        <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--muted)" }}>
                          BHA & Bit Selection
                        </strong>
                        <div style={{ marginTop: 4 }}>{step.bhaAndBitType}</div>
                      </div>

                      <div style={{ background: "var(--bg)", padding: "10px", borderRadius: "var(--radius)" }}>
                        <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--muted)" }}>
                          Hydraulics, WOB & RPM
                        </strong>
                        <div style={{ marginTop: 4 }}>{step.hydraulicsAndRpm}</div>
                      </div>
                    </div>

                    <div style={{ padding: "8px 12px", background: "var(--warn-bg)", borderLeft: "3px solid var(--warn-line)", borderRadius: "0 var(--radius) var(--radius) 0", color: "var(--warn-ink)" }}>
                      <strong>Hazard Precaution: </strong>
                      {step.hazardPrecaution}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Mud & Loss Strategies */}
      <div className="panel-row" style={{ marginTop: 12 }}>
        <div style={{ background: "var(--bg)", padding: "12px 14px", borderRadius: "var(--radius)", fontSize: 13 }}>
          <strong style={{ display: "block", marginBottom: 6, color: "var(--ink)" }}>
            ⚡ ECD & Torque Management Strategy
          </strong>
          <p style={{ margin: 0, lineHeight: 1.5, color: "var(--ink)" }}>{rec.ecdTorqueMitigation}</p>
        </div>

        <div style={{ background: "var(--bg)", padding: "12px 14px", borderRadius: "var(--radius)", fontSize: 13 }}>
          <strong style={{ display: "block", marginBottom: 6, color: "var(--ink)" }}>
            🧪 Pre-emptive LCM Pill & Loss Control
          </strong>
          <p style={{ margin: 0, lineHeight: 1.5, color: "var(--ink)" }}>{rec.lcmPillStrategy}</p>
        </div>
      </div>
    </div>
  );
}
