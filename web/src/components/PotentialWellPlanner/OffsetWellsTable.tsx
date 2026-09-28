import type { OffsetWellAnalogue } from "./types";

interface OffsetWellsTableProps {
  offsetWells: OffsetWellAnalogue[];
  selectedOffset: OffsetWellAnalogue | null;
  onSelectOffset: (offset: OffsetWellAnalogue | null) => void;
}

export function OffsetWellsTable({
  offsetWells,
  selectedOffset,
  onSelectOffset,
}: OffsetWellsTableProps) {
  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2>Offset Wells (Analogues for Forecasting)</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          {offsetWells.length} verified offset analogues in search radius
        </span>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
        Correlation scores quantify formation stratigraphy match, directional trajectory similarity, and historical drilling hazard relevance.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Well ID</th>
              <th className="num">Distance</th>
              <th>Bearing</th>
              <th className="num">Formation Match</th>
              <th className="num">Trajectory Sim.</th>
              <th className="num">Event Sim.</th>
              <th className="num">Overall Score</th>
              <th>Key Offset Events</th>
            </tr>
          </thead>
          <tbody>
            {offsetWells.map((w) => {
              const isSelected = selectedOffset?.wellId === w.wellId;
              const scoreColor =
                w.overallScorePct >= 85
                  ? "#059669"
                  : w.overallScorePct >= 75
                    ? "#0284c7"
                    : "#d97706";

              return (
                <tr
                  key={w.wellId}
                  className={`clickable ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectOffset(isSelected ? null : w)}
                >
                  <td>
                    <strong>{w.wellName}</strong>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {w.operator} &middot; Spud {w.spudDate}
                    </div>
                  </td>
                  <td className="num">
                    <strong>{w.distanceKm} km</strong>
                  </td>
                  <td>{w.bearing}</td>
                  <td className="num">{w.formationMatchPct}%</td>
                  <td className="num">{w.trajectorySimilarityPct}%</td>
                  <td className="num">{w.eventSimilarityPct}%</td>
                  <td className="num">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "var(--radius)",
                        background: `${scoreColor}18`,
                        color: scoreColor,
                        fontWeight: 700,
                      }}
                    >
                      {w.overallScorePct}%
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {w.keyHazardsRecorded.map((h) => (
                        <span key={h} className="severity" data-sev="medium" style={{ fontSize: 10 }}>
                          {h}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedOffset && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            background: "var(--bg)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "0 var(--radius) var(--radius) 0",
            fontSize: 13,
          }}
        >
          <strong>Detailed Analogue Inspection: {selectedOffset.wellName}</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 8 }}>
            <div>
              <span className="muted">Offset Distance:</span> <strong>{selectedOffset.distanceKm} km</strong> ({selectedOffset.bearing})
            </div>
            <div>
              <span className="muted">Total Drilled TD:</span> <strong>{selectedOffset.actualTd} m MD</strong>
            </div>
            <div>
              <span className="muted">Documented Events:</span> <strong>{selectedOffset.recordedEventsCount} incidents</strong>
            </div>
            <div>
              <span className="muted">Stratigraphic Match:</span> <strong>{selectedOffset.formationMatchPct}%</strong>
            </div>
          </div>
          <div style={{ marginTop: 8, color: "var(--ink)" }}>
            <strong>Hazard Precedents: </strong>
            {selectedOffset.keyHazardsRecorded.join(" &bull; ")}
          </div>
        </div>
      )}
    </div>
  );
}
