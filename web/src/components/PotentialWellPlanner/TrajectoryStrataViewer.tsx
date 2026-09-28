import { useState } from "react";
import type { PotentialWell, PlanningScenario } from "./types";

interface TrajectoryStrataViewerProps {
  well: PotentialWell;
  activeScenario: PlanningScenario;
}

const DEFAULT_COLOR = { bg: "#fef3c7", border: "#fde68a", text: "#92400e" };

const FORMATION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Alluvium: { bg: "#fef3c7", border: "#fde68a", text: "#92400e" },
  "Tipam Sandstone": { bg: "#fef9c3", border: "#fef08a", text: "#854d0e" },
  "Girujan Clay": { bg: "#fed7aa", border: "#fdba74", text: "#9a3412" },
  "Disang Formation": { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  "Barail Shale": { bg: "#e2e8f0", border: "#cbd5e1", text: "#334155" },
  "Basement Complex": { bg: "#ddd6fe", border: "#c4b5fd", text: "#5b21b6" },
};

export function TrajectoryStrataViewer({ well, activeScenario }: TrajectoryStrataViewerProps) {
  const [hoveredDepth, setHoveredDepth] = useState<number | null>(null);

  const maxDepth = Math.max(well.targetTdMd + 300, 3800);
  const svgWidth = 420;
  const svgHeight = 440;
  const margin = { top: 30, right: 30, bottom: 30, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const depthToY = (d: number) => margin.top + (d / maxDepth) * plotHeight;

  // Compute planned trajectory curve:
  // 0 to KOP: Vertical (X = margin.left + 30)
  // KOP to Target TD: Curved build to target inclination / displacement
  const surfaceX = margin.left + 35;
  const kopY = depthToY(activeScenario.kopMd);
  const tdY = depthToY(well.targetTdMd);
  const maxDisplacementPx = plotWidth * 0.75;
  const targetX = surfaceX + maxDisplacementPx;

  // SVG path for trajectory
  const trajectoryPath = `
    M ${surfaceX} ${margin.top}
    L ${surfaceX} ${kopY}
    Q ${surfaceX} ${(kopY + tdY) / 2 + 10} ${targetX} ${tdY}
  `;

  return (
    <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>Planned Trajectory & Subsurface Strata</h2>
        <span className="tag" data-origin="PUBLIC_REAL">
          3D Cross-Section
        </span>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
        Geological formation layering along planned wellbore. Shows Kick-off Point (KOP {activeScenario.kopMd} m),
        target inclination ({activeScenario.targetInclinationDeg}°), and casing shoe points.
      </p>

      <div style={{ position: "relative", width: "100%", flex: 1 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const d = Math.max(0, Math.min(maxDepth, ((y - margin.top) / plotHeight) * maxDepth));
            setHoveredDepth(Math.round(d));
          }}
          onMouseLeave={() => setHoveredDepth(null)}
        >
          {/* Depth Axis Ticks & Labels */}
          {[0, 500, 1000, 1500, 2000, 2500, 3000, 3500].map((d) => {
            const y = depthToY(d);
            return (
              <g key={d}>
                <line
                  x1={margin.left - 6}
                  y1={y}
                  x2={svgWidth - margin.right}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  fill="var(--muted)"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {d}m
                </text>
              </g>
            );
          })}

          {/* Formation Strata Rectangles */}
          {well.formationForecast.map((fm) => {
            const yTop = depthToY(fm.topMd);
            const yBase = depthToY(fm.baseMd);
            const height = Math.max(4, yBase - yTop);
            const key = Object.keys(FORMATION_COLORS).find((k) => fm.formation.includes(k)) ?? "Alluvium";
            const color = FORMATION_COLORS[key] ?? DEFAULT_COLOR;

            const isHighRisk = fm.riskRating === "HIGH" || fm.riskRating === "CRITICAL";

            return (
              <g key={fm.formation}>
                <rect
                  x={margin.left}
                  y={yTop}
                  width={plotWidth}
                  height={height}
                  fill={color.bg}
                  stroke={color.border}
                  strokeWidth="1"
                  opacity={isHighRisk ? 0.95 : 0.8}
                />
                {/* Formation label inside strata */}
                <text
                  x={svgWidth - margin.right - 8}
                  y={yTop + Math.min(18, height / 2 + 5)}
                  fill={color.text}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {fm.formation} {isHighRisk ? "⚠️" : ""}
                </text>
                <text
                  x={svgWidth - margin.right - 8}
                  y={yTop + Math.min(32, height / 2 + 18)}
                  fill="var(--muted)"
                  fontSize="9.5"
                  textAnchor="end"
                >
                  {fm.topMd} - {fm.baseMd} m
                </text>
              </g>
            );
          })}

          {/* High-Risk Fracture Zone Highlight */}
          <rect
            x={margin.left}
            y={depthToY(3020)}
            width={plotWidth}
            height={depthToY(3180) - depthToY(3020)}
            fill="rgba(239, 68, 68, 0.22)"
            stroke="#ef4444"
            strokeWidth="1.2"
            strokeDasharray="4,2"
          />
          <text
            x={margin.left + 8}
            y={depthToY(3100)}
            fill="#b91c1c"
            fontSize="10"
            fontWeight="700"
          >
            🚨 High Mud Loss Zone (3,020 - 3,180 m)
          </text>

          {/* Planned Well Trajectory Path */}
          <path
            d={trajectoryPath}
            fill="none"
            stroke="#1f6feb"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d={trajectoryPath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="6,4"
            strokeLinecap="round"
          />

          {/* KOP Marker */}
          <circle cx={surfaceX} cy={kopY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
          <rect
            x={surfaceX + 10}
            y={kopY - 10}
            width="110"
            height="18"
            rx="3"
            fill="var(--panel)"
            stroke="#f59e0b"
          />
          <text x={surfaceX + 16} y={kopY + 3} fill="var(--ink)" fontSize="10" fontWeight="600">
            KOP: {activeScenario.kopMd} m
          </text>

          {/* Target TD Marker */}
          <circle cx={targetX} cy={tdY} r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
          <rect
            x={targetX - 120}
            y={tdY + 8}
            width="120"
            height="18"
            rx="3"
            fill="var(--panel)"
            stroke="#10b981"
          />
          <text x={targetX - 60} y={tdY + 21} fill="var(--ink)" fontSize="10" fontWeight="700" textAnchor="middle">
            🎯 Target TD: {well.targetTdMd} m
          </text>

          {/* Hover Depth Indicator Line */}
          {hoveredDepth !== null && (
            <g>
              <line
                x1={margin.left}
                y1={depthToY(hoveredDepth)}
                x2={svgWidth - margin.right}
                y2={depthToY(hoveredDepth)}
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
              <rect
                x={margin.left + 5}
                y={depthToY(hoveredDepth) - 18}
                width="70"
                height="16"
                rx="3"
                fill="#0284c7"
              />
              <text
                x={margin.left + 40}
                y={depthToY(hoveredDepth) - 6}
                fill="#ffffff"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {hoveredDepth} m MD
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Trajectory Specifications Footer */}
      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "var(--bg)",
          borderRadius: "var(--radius)",
          fontSize: 12,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        <div>
          <span className="muted" style={{ display: "block", fontSize: 11 }}>
            KOP DEPTH
          </span>
          <strong>{activeScenario.kopMd} m MD</strong>
        </div>
        <div>
          <span className="muted" style={{ display: "block", fontSize: 11 }}>
            MAX INCLINATION
          </span>
          <strong>{activeScenario.targetInclinationDeg}°</strong>
        </div>
        <div>
          <span className="muted" style={{ display: "block", fontSize: 11 }}>
            TARGET AZIMUTH
          </span>
          <strong>{activeScenario.azimuthDeg}°</strong>
        </div>
      </div>
    </div>
  );
}
