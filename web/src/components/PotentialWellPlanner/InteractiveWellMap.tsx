import { useState } from "react";
import type { LandAreaPreset, PotentialWell, OffsetWellAnalogue } from "./types";

interface InteractiveWellMapProps {
  area: LandAreaPreset;
  selectedWell: PotentialWell;
  onSelectWell: (well: PotentialWell) => void;
  selectedRadiusKm: number;
  onSelectRadiusKm: (radius: number) => void;
  selectedOffset: OffsetWellAnalogue | null;
  onSelectOffset: (offset: OffsetWellAnalogue | null) => void;
}

export function InteractiveWellMap({
  area,
  selectedWell,
  onSelectWell,
  selectedRadiusKm,
  onSelectRadiusKm,
  selectedOffset,
  onSelectOffset,
}: InteractiveWellMapProps) {
  const [mapMode, setMapMode] = useState<"geohazard" | "topo" | "satellite">("geohazard");
  const [showFaults, setShowFaults] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showBuffers, setShowBuffers] = useState(true);
  const [hoveredWell, setHoveredWell] = useState<string | null>(null);

  // Map canvas coordinate system (center at 400, 300 in 800x600 SVG)
  const svgWidth = 820;
  const svgHeight = 520;
  const centerX = 410;
  const centerY = 260;

  // Scale: 1 km = 32 pixels
  const kmToPx = 32;

  // Convert lat/lng delta to local X/Y offset in km relative to area center
  const getCoords = (lat: number, lng: number) => {
    // 1 deg lat approx 111 km, 1 deg lng approx 111 * cos(lat) km
    const latKm = (lat - area.centerLat) * 111.0;
    const cosLat = Math.cos((area.centerLat * Math.PI) / 180);
    const lngKm = (lng - area.centerLng) * (111.0 * cosLat);

    const x = centerX + lngKm * kmToPx;
    const y = centerY - latKm * kmToPx; // Invert Y for screen coords
    return { x, y, latKm, lngKm };
  };

  const currentCoords = getCoords(selectedWell.surfaceLat, selectedWell.surfaceLng);

  // Background style based on map mode
  const bgFill =
    mapMode === "satellite"
      ? "#13231b"
      : mapMode === "topo"
        ? "#f2f5f8"
        : "#0f172a";

  const gridStroke =
    mapMode === "satellite"
      ? "rgba(255,255,255,0.06)"
      : mapMode === "topo"
        ? "rgba(0,0,0,0.06)"
        : "rgba(255,255,255,0.07)";

  return (
    <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
      {/* Map Control Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "var(--panel)",
          borderBottom: "1px solid var(--line)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
            Map View
          </span>
          <div className="channel-picker" style={{ margin: 0 }}>
            <button
              type="button"
              aria-pressed={mapMode === "geohazard"}
              onClick={() => setMapMode("geohazard")}
            >
              Geohazards & Subsurface
            </button>
            <button
              type="button"
              aria-pressed={mapMode === "satellite"}
              onClick={() => setMapMode("satellite")}
            >
              Satellite (Field View)
            </button>
            <button
              type="button"
              aria-pressed={mapMode === "topo"}
              onClick={() => setMapMode("topo")}
            >
              Topographic (Standard)
            </button>
          </div>
        </div>

        {/* Distance Radius Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Search Radius:</span>
          <div className="channel-picker" style={{ margin: 0 }}>
            {[5, 10, 15, 25].map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={selectedRadiusKm === r}
                onClick={() => onSelectRadiusKm(r)}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {/* Layer Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--muted)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showFaults}
              onChange={(e) => setShowFaults(e.target.checked)}
            />
            Faults
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showRiskZones}
              onChange={(e) => setShowRiskZones(e.target.checked)}
            />
            Risk Zones
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showBuffers}
              onChange={(e) => setShowBuffers(e.target.checked)}
            />
            Buffer Rings
          </label>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: "relative", width: "100%", background: bgFill, minHeight: 460 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={gridStroke} strokeWidth="1" />
            </pattern>

            {/* High-Risk Zone Gradients */}
            <radialGradient id="lossZoneGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="kickZoneGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Target Pulse Glow */}
            <filter id="glowYellow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.9" />
            </filter>
            <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#1f6feb" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width={svgWidth} height={svgHeight} fill={bgFill} />
          <rect width={svgWidth} height={svgHeight} fill="url(#mapGrid)" />

          {/* Scale Bars & Cardinal Indicator */}
          <g transform="translate(24, 470)">
            <rect x="0" y="0" width="120" height="28" rx="4" fill="rgba(0,0,0,0.5)" />
            <line x1="12" y1="18" x2={12 + 2 * kmToPx} y2="18" stroke="#fff" strokeWidth="2.5" />
            <line x1="12" y1="12" x2="12" y2="24" stroke="#fff" strokeWidth="2" />
            <line x1={12 + 2 * kmToPx} y1="12" x2={12 + 2 * kmToPx} y2="24" stroke="#fff" strokeWidth="2" />
            <text x={12 + kmToPx} y="10" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="600">
              2 km
            </text>
          </g>

          {/* Compass Rose */}
          <g transform="translate(760, 60)">
            <circle cx="0" cy="0" r="22" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.2)" />
            <path d="M 0 -18 L 4 0 L 0 -4 L -4 0 Z" fill="#ef4444" />
            <path d="M 0 18 L 4 0 L 0 4 L -4 0 Z" fill="#94a3b8" />
            <text x="0" y="-8" fill="#fff" fontSize="10" fontWeight="700" textAnchor="middle">
              N
            </text>
          </g>

          {/* Distance Buffer Rings centered on active well */}
          {showBuffers && (
            <g>
              {[2, 5, 10, 15]
                .filter((r) => r <= selectedRadiusKm + 2)
                .map((radius) => {
                  const rPx = radius * kmToPx;
                  const isCurrentFilter = radius === selectedRadiusKm;
                  return (
                    <g key={radius}>
                      <circle
                        cx={currentCoords.x}
                        cy={currentCoords.y}
                        r={rPx}
                        fill="none"
                        stroke={
                          isCurrentFilter
                            ? "rgba(31, 111, 235, 0.75)"
                            : mapMode === "topo"
                              ? "rgba(0,0,0,0.2)"
                              : "rgba(255,255,255,0.22)"
                        }
                        strokeWidth={isCurrentFilter ? 1.8 : 1}
                        strokeDasharray={isCurrentFilter ? "none" : "5,4"}
                      />
                      <rect
                        x={currentCoords.x + rPx - 26}
                        y={currentCoords.y - 9}
                        width="52"
                        height="18"
                        rx="3"
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke={isCurrentFilter ? "#1f6feb" : "rgba(255,255,255,0.2)"}
                      />
                      <text
                        x={currentCoords.x + rPx}
                        y={currentCoords.y + 3}
                        fill={isCurrentFilter ? "#60a5fa" : "#cbd5e1"}
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {radius} km
                      </text>
                    </g>
                  );
                })}
            </g>
          )}

          {/* High-Risk Zones */}
          {showRiskZones &&
            area.highRiskZones.map((zone, idx) => {
              const zoneCoords = getCoords(zone.centerLat, zone.centerLng);
              const rPx = zone.radiusKm * kmToPx;
              const gradId = idx % 2 === 0 ? "lossZoneGrad" : "kickZoneGrad";
              return (
                <g key={zone.name}>
                  <circle
                    cx={zoneCoords.x}
                    cy={zoneCoords.y}
                    r={rPx}
                    fill={`url(#${gradId})`}
                    stroke="#ef4444"
                    strokeWidth="1.2"
                    strokeDasharray="4,3"
                  />
                  <text
                    x={zoneCoords.x}
                    y={zoneCoords.y - rPx - 6}
                    fill="#f87171"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    ⚠️ {zone.name}
                  </text>
                  <text
                    x={zoneCoords.x}
                    y={zoneCoords.y - rPx + 7}
                    fill="rgba(255,255,255,0.75)"
                    fontSize="9.5"
                    textAnchor="middle"
                  >
                    {zone.riskType}
                  </text>
                </g>
              );
            })}

          {/* Fault Lines */}
          {showFaults &&
            area.faultLines.map((fault) => {
              if (fault.coords.length === 0) return null;
              const points = fault.coords
                .map((c) => {
                  const pt = getCoords(c.lat, c.lng);
                  return `${pt.x},${pt.y}`;
                })
                .join(" ");

              const firstCoord = fault.coords[0];
              const firstPt = firstCoord ? getCoords(firstCoord.lat, firstCoord.lng) : { x: centerX, y: centerY };
              return (
                <g key={fault.name}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeDasharray="6,4"
                    strokeLinecap="round"
                  />
                  <rect
                    x={firstPt.x - 4}
                    y={firstPt.y - 20}
                    width={fault.name.length * 7 + 14}
                    height="16"
                    rx="3"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke="#f43f5e"
                  />
                  <text
                    x={firstPt.x + 3}
                    y={firstPt.y - 8}
                    fill="#fca5a5"
                    fontSize="10"
                    fontWeight="700"
                  >
                    Fault: {fault.name}
                  </text>
                </g>
              );
            })}

          {/* Distance vectors from Selected Well to all Offset Wells */}
          {selectedWell.offsetWells.map((offset) => {
            // Estimate offset location based on distance and bearing
            const bearingAngles: Record<string, number> = {
              NW: 315,
              SW: 220,
              NE: 40,
              SE: 135,
              South: 180,
              West: 260,
              SSW: 205,
              ENE: 65,
              NNE: 25,
            };
            const angleKey = Object.keys(bearingAngles).find((k) => offset.bearing.startsWith(k)) ?? "NW";
            const deg = bearingAngles[angleKey] ?? 315;
            const rad = ((deg - 90) * Math.PI) / 180;
            const distPx = offset.distanceKm * kmToPx;
            const offX = currentCoords.x + Math.cos(rad) * distPx;
            const offY = currentCoords.y + Math.sin(rad) * distPx;

            const isSelected = selectedOffset?.wellId === offset.wellId;
            const isHovered = hoveredWell === offset.wellId;

            return (
              <g
                key={offset.wellId}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectOffset(isSelected ? null : offset)}
                onMouseEnter={() => setHoveredWell(offset.wellId)}
                onMouseLeave={() => setHoveredWell(null)}
              >
                {/* Distance dotted line */}
                <line
                  x1={currentCoords.x}
                  y1={currentCoords.y}
                  x2={offX}
                  y2={offY}
                  stroke={isSelected ? "#38bdf8" : "rgba(148, 163, 184, 0.45)"}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSelected ? "none" : "4,3"}
                />

                {/* Distance Label on line midpoint */}
                <rect
                  x={(currentCoords.x + offX) / 2 - 22}
                  y={(currentCoords.y + offY) / 2 - 9}
                  width="44"
                  height="17"
                  rx="3"
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke={isSelected ? "#38bdf8" : "rgba(255,255,255,0.2)"}
                />
                <text
                  x={(currentCoords.x + offX) / 2}
                  y={(currentCoords.y + offY) / 2 + 3}
                  fill={isSelected ? "#38bdf8" : "#94a3b8"}
                  fontSize="9.5"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {offset.distanceKm} km
                </text>

                {/* Offset Well Marker */}
                <circle
                  cx={offX}
                  cy={offY}
                  r={isSelected || isHovered ? 9 : 7}
                  fill={isSelected ? "#0284c7" : "#0369a1"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="url(#glowBlue)"
                />
                <circle cx={offX} cy={offY} r="3" fill="#ffffff" />

                {/* Offset Tag */}
                <rect
                  x={offX - 32}
                  y={offY - 26}
                  width="64"
                  height="16"
                  rx="3"
                  fill={isSelected ? "#0369a1" : "rgba(15, 23, 42, 0.88)"}
                  stroke={isSelected ? "#ffffff" : "rgba(56, 189, 248, 0.4)"}
                />
                <text
                  x={offX}
                  y={offY - 14}
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {offset.wellId}
                </text>
              </g>
            );
          })}

          {/* Other Potential Wells in the Area */}
          {area.potentialWells.map((pWell) => {
            const isCurrent = pWell.id === selectedWell.id;
            const pt = getCoords(pWell.surfaceLat, pWell.surfaceLng);
            const isHovered = hoveredWell === pWell.id;

            return (
              <g
                key={pWell.id}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectWell(pWell)}
                onMouseEnter={() => setHoveredWell(pWell.id)}
                onMouseLeave={() => setHoveredWell(null)}
              >
                {/* Outer animated target circle for active well */}
                {isCurrent && (
                  <>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="22"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="5,3"
                      opacity="0.8"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="rgba(245, 158, 11, 0.2)"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                  </>
                )}

                {/* Marker Center */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isCurrent ? 9 : isHovered ? 8 : 7}
                  fill={isCurrent ? "#f59e0b" : isHovered ? "#fbbf24" : "#d97706"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="url(#glowYellow)"
                />
                <circle cx={pt.x} cy={pt.y} r="3" fill="#ffffff" />

                {/* Flag / Tag */}
                <rect
                  x={pt.x - 48}
                  y={pt.y + 14}
                  width="96"
                  height="22"
                  rx="4"
                  fill={isCurrent ? "#f59e0b" : "rgba(15, 23, 42, 0.9)"}
                  stroke={isCurrent ? "#ffffff" : "#f59e0b"}
                  strokeWidth={isCurrent ? 1.5 : 1}
                />
                <text
                  x={pt.x}
                  y={pt.y + 26}
                  fill={isCurrent ? "#000000" : "#fbbf24"}
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  📍 {pWell.code}
                </text>
                <text
                  x={pt.x}
                  y={pt.y + 34}
                  fill={isCurrent ? "#1c1917" : "#cbd5e1"}
                  fontSize="8"
                  textAnchor="middle"
                >
                  {isCurrent ? "TARGET (PLANNED)" : `${pWell.targetTdMd} m TD`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Map Legend */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            background: "rgba(15, 23, 42, 0.88)",
            color: "#f8fafc",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            fontSize: 12,
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 170,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8" }}>
            Map Legend
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", border: "2px solid #fff" }} />
            <span>Planned Candidate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0284c7", border: "1.5px solid #fff" }} />
            <span>Existing Offset Wells</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 14, height: 10, borderRadius: 3, background: "rgba(239, 68, 68, 0.4)", border: "1px dashed #ef4444" }} />
            <span>High Risk Zone</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 3, background: "#f43f5e" }} />
            <span>Geological Fault</span>
          </div>
        </div>
      </div>

      {/* Selected Well / Offset Quick Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "var(--bg)",
          borderTop: "1px solid var(--line)",
          fontSize: 13,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <strong>Active Candidate: </strong>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{selectedWell.name}</span> &middot;{" "}
          <span className="muted">
            {selectedWell.surfaceLat.toFixed(3)}°N, {selectedWell.surfaceLng.toFixed(3)}°E &middot; TD {selectedWell.targetTdMd} m MD
          </span>
        </div>

        {selectedOffset ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="tag" data-origin="PUBLIC_REAL">
              Offset Selected: {selectedOffset.wellId}
            </span>
            <span className="muted">Distance: <strong>{selectedOffset.distanceKm} km</strong> ({selectedOffset.bearing})</span>
            <button
              type="button"
              className="evidence-link"
              style={{ fontSize: 11, padding: "2px 6px" }}
              onClick={() => onSelectOffset(null)}
            >
              Clear Offset
            </button>
          </div>
        ) : (
          <span className="muted">Click any offset well or candidate marker to inspect details</span>
        )}
      </div>
    </div>
  );
}
