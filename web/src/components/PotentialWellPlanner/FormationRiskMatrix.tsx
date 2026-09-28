import { useState } from "react";
import type { FormationHazard } from "./types";

interface FormationRiskMatrixProps {
  forecasts: FormationHazard[];
}

function probBadge(prob: number) {
  let bg = "var(--missing-bg)";
  let color = "var(--muted)";

  if (prob >= 50) {
    bg = "#fee2e2";
    color = "#991b1b";
  } else if (prob >= 30) {
    bg = "#fef3c7";
    color = "#92400e";
  } else if (prob >= 15) {
    bg = "#fef9c3";
    color = "#854d0e";
  } else {
    bg = "#dcfce7";
    color = "#166534";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "var(--radius)",
        background: bg,
        color: color,
        fontWeight: 600,
        fontSize: 12,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prob}%
    </span>
  );
}

export function FormationRiskMatrix({ forecasts }: FormationRiskMatrixProps) {
  const [viewMode, setViewMode] = useState<"risk" | "mud" | "lithology">("risk");

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2>Formation-wise Forecast & Hazard Probabilities</h2>
        <div className="channel-picker" style={{ margin: 0 }}>
          <button
            type="button"
            aria-pressed={viewMode === "risk"}
            onClick={() => setViewMode("risk")}
          >
            Risk Probabilities
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "mud"}
            onClick={() => setViewMode("mud")}
          >
            Mud Weight & Hydrology
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "lithology"}
            onClick={() => setViewMode("lithology")}
          >
            Lithology & Precedents
          </button>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
        Hazards derived from probabilistic Bayesian synthesis of nearby offset well events across each stratigraphic interval.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Formation</th>
              <th className="num">Top (m)</th>
              <th className="num">Base (m)</th>
              {viewMode === "risk" && (
                <>
                  <th className="num">Mud Loss</th>
                  <th className="num">Stuck Pipe</th>
                  <th className="num">Kick Influx</th>
                  <th className="num">Overpressure</th>
                  <th>Overall Rating</th>
                </>
              )}
              {viewMode === "mud" && (
                <>
                  <th>Rec. Mud Weight (SG)</th>
                  <th className="num">Mud Loss Risk</th>
                  <th className="num">Kick Risk</th>
                  <th>Risk Rating</th>
                </>
              )}
              {viewMode === "lithology" && (
                <>
                  <th>Lithology Description</th>
                  <th>Historical Offset Incidents</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {forecasts.map((fm) => (
              <tr key={fm.formation}>
                <td>
                  <strong>{fm.formation}</strong>
                </td>
                <td className="num">{fm.topMd.toLocaleString()}</td>
                <td className="num">{fm.baseMd.toLocaleString()}</td>

                {viewMode === "risk" && (
                  <>
                    <td className="num">{probBadge(fm.mudLossProb)}</td>
                    <td className="num">{probBadge(fm.stuckPipeProb)}</td>
                    <td className="num">{probBadge(fm.kickProb)}</td>
                    <td className="num">{probBadge(fm.overpressureProb)}</td>
                    <td>
                      <span
                        className="severity"
                        data-sev={
                          fm.riskRating === "CRITICAL" || fm.riskRating === "HIGH"
                            ? "high"
                            : fm.riskRating === "MEDIUM"
                              ? "medium"
                              : "low"
                        }
                      >
                        {fm.riskRating}
                      </span>
                    </td>
                  </>
                )}

                {viewMode === "mud" && (
                  <>
                    <td>
                      <code>{fm.recMudWeightSG} SG</code>
                    </td>
                    <td className="num">{probBadge(fm.mudLossProb)}</td>
                    <td className="num">{probBadge(fm.kickProb)}</td>
                    <td>
                      <span
                        className="severity"
                        data-sev={
                          fm.riskRating === "CRITICAL" || fm.riskRating === "HIGH"
                            ? "high"
                            : fm.riskRating === "MEDIUM"
                              ? "medium"
                              : "low"
                        }
                      >
                        {fm.riskRating}
                      </span>
                    </td>
                  </>
                )}

                {viewMode === "lithology" && (
                  <>
                    <td style={{ maxWidth: 300, whiteSpace: "normal" }}>{fm.lithology}</td>
                    <td style={{ maxWidth: 350, whiteSpace: "normal" }} className="muted">
                      {fm.historicalIncidents}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
