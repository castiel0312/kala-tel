import { useMemo, useState } from 'react'
import type { OffsetWell } from '../../api/types'
import { Icon } from '../../components/kit/icons'
import { kmDistance, kmToLngLat, type Km } from '../../lib/geo'
import type { Rejection, ScreenedCandidate } from '../../lib/planner'
import s from '../sections.module.css'

/* The square the plan view is drawn in, and the margin left for the ring labels. */
const VB = 760
const PAD = 62

export interface PotentialWellMapProps {
  centreKm: Km
  radiusKm: number
  activeWellId: string
  offsets: OffsetWell[]
  candidates: ScreenedCandidate[]
  rejected: Rejection[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/**
 * The placement plan.
 *
 * A plan view rather than the Mapbox surface the map section uses, for one reason: this diagram
 * has to be *the same drawing* as the evidence beside it. Every mark on it is a coordinate the
 * API returned, plotted in the same kilometre frame, so the distance printed next to a candidate
 * is the distance the reader can measure between two marks. A 3D terrain basemap would add
 * context the placement argument does not use, and would hide the only thing that matters here —
 * how far each proposal is from a bore that already exists.
 *
 * The frame is the radius the reader selected, centred on the active well, so the outer ring is
 * always exactly the boundary the screening enforced.
 */
export function PotentialWellMap({
  centreKm,
  radiusKm,
  activeWellId,
  offsets,
  candidates,
  rejected,
  selectedId,
  onSelect,
}: PotentialWellMapProps) {
  const [hover, setHover] = useState<string | null>(null)

  const half = VB / 2
  const pxPerKm = (half - PAD) / Math.max(radiusKm, 0.001)

  /** Kilometres east/north of the frame's centre → SVG x/y, with north up. */
  const project = useMemo(() => {
    return (km: Km | number[]) => {
      const e = (km[0] ?? 0) - centreKm[0]
      const n = (km[1] ?? 0) - centreKm[1]
      return { x: half + e * pxPerKm, y: half - n * pxPerKm, east: e, north: n }
    }
  }, [centreKm, half, pxPerKm])

  const centre = project(centreKm)
  const selected = candidates.find((c) => c.id === selectedId) ?? null

  /** Offsets labelled in full; the rest keep their mark, which is enough to read density from. */
  const labelled = useMemo(
    () =>
      [...offsets]
        .sort((a, b) => kmDistance(centreKm, a.surfaceKm) - kmDistance(centreKm, b.surfaceKm))
        .slice(0, 9),
    [offsets, centreKm],
  )
  const labelledIds = useMemo(() => new Set(labelled.map((o) => o.id)), [labelled])

  /** Ring steps that stay legible: one ring per km, thinning out as the radius grows. */
  const ringStep = radiusKm <= 2 ? 0.5 : radiusKm <= 6 ? 1 : 2
  const rings: number[] = []
  for (let r = ringStep; r <= radiusKm + 1e-9; r += ringStep) rings.push(Number(r.toFixed(3)))

  /** The measured link the panel quotes, drawn so the number has something to point at. */
  const link = useMemo(() => {
    const neighbour = selected?.nearestWell
    if (!neighbour) return null
    const target = offsets.find((o) => o.id === neighbour.id)
    if (!target) return null
    const a = project([selected.eastKm, selected.northKm])
    const b = project(target.surfaceKm)
    return { a, b, distanceKm: neighbour.distanceKm, id: target.id }
  }, [selected, offsets, project])

  const scaleKm = ringStep
  const scalePx = scaleKm * pxPerKm
  const scaleMark = scalePx > half * 0.5 ? scaleKm * 2 : scaleKm

  return (
    <div className={s.pwpMapFrame}>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className={s.pwpPlan}
        role="img"
        aria-label={`Placement plan: ${candidates.length} candidate future wells within ${radiusKm} km of ${activeWellId}, against ${offsets.length} existing wells`}
      >
        <defs>
          {/* The search radius reads as a boundary, not as a fill, so marks inside stay legible. */}
          <radialGradient id="pwp-radius" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--nw-yellow)" stopOpacity="0.07" />
            <stop offset="88%" stopColor="var(--nw-yellow)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--nw-yellow)" stopOpacity="0.16" />
          </radialGradient>
          <pattern id="pwp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--nw-border)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={VB} height={VB} fill="var(--nw-surface)" />
        <rect x="0" y="0" width={VB} height={VB} fill="url(#pwp-hatch)" opacity="0.5" />

        {/* distance rings, labelled so the grid is a scale and not decoration */}
        <g>
          {rings.map((r) => (
            <g key={r}>
              <circle
                cx={half}
                cy={half}
                r={r * pxPerKm}
                fill="none"
                stroke="var(--nw-border)"
                strokeWidth="1"
              />
              <text
                x={half + 4}
                y={half - r * pxPerKm - 4}
                className={s.pwpTick}
              >
                {r} km
              </text>
            </g>
          ))}
        </g>

        {/* the boundary screening enforced */}
        <circle cx={half} cy={half} r={radiusKm * pxPerKm} fill="url(#pwp-radius)" />
        <circle
          cx={half}
          cy={half}
          r={radiusKm * pxPerKm}
          fill="none"
          stroke="var(--nw-yellow-deep)"
          strokeWidth="1.6"
          strokeDasharray="7 5"
        />
        <text
          x={half}
          y={half - radiusKm * pxPerKm - 10}
          textAnchor="middle"
          className={s.pwpRadiusLabel}
        >
          {radiusKm} km search radius
        </text>

        {/* existing bores */}
        <g>
          {offsets.map((o) => {
            const p = project(o.surfaceKm)
            const isActive = o.id === activeWellId
            const isNeighbour = link?.id === o.id
            return (
              <g
                key={o.id}
                className={s.pwpMark}
                onMouseEnter={() => setHover(o.id)}
                onMouseLeave={() => setHover(null)}
              >
                <title>
                  {o.id} — existing well, {kmDistance(centreKm, o.surfaceKm).toFixed(2)} km from {activeWellId}
                  {o.hasLossEvents ? ' · loss events in its history' : ''}
                </title>
                {isNeighbour && (
                  <circle cx={p.x} cy={p.y} r="11" fill="none" stroke="var(--nw-black)" strokeWidth="1" strokeDasharray="3 2" />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 7 : hover === o.id ? 6 : 5}
                  fill={isActive ? 'var(--nw-black)' : 'var(--nw-charcoal)'}
                  stroke="var(--nw-white)"
                  strokeWidth="1.6"
                />
                {o.hasLossEvents && !isActive && (
                  <circle cx={p.x + 6} cy={p.y - 6} r="2.6" fill="var(--nw-red)" stroke="var(--nw-white)" strokeWidth="1" />
                )}
                {isActive && (
                  <g stroke="var(--nw-black)" strokeWidth="1.6" fill="none">
                    <line x1={p.x - 12} y1={p.y} x2={p.x - 9} y2={p.y} />
                    <line x1={p.x + 9} y1={p.y} x2={p.x + 12} y2={p.y} />
                    <line x1={p.x} y1={p.y - 12} x2={p.x} y2={p.y - 9} />
                    <line x1={p.x} y1={p.y + 9} x2={p.x} y2={p.y + 12} />
                  </g>
                )}
                {labelledIds.has(o.id) && (
                  <text x={p.x + 10} y={p.y + 3.5} className={isActive ? s.pwpLabelActive : s.pwpLabel}>
                    {o.id}
                  </text>
                )}
              </g>
            )
          })}
        </g>

        {/* proposals the model made that NWIS refused */}
        <g>
          {rejected
            .filter((r): r is Rejection & { eastKm: number; northKm: number } => r.eastKm !== null && r.northKm !== null)
            .map((r) => {
              const p = project([r.eastKm, r.northKm])
              return (
                <g key={`rej-${r.name}-${r.eastKm}`} className={s.pwpMark}>
                  <title>{`${r.name} — rejected: ${r.detail}`}</title>
                  <rect
                    x={p.x - 5}
                    y={p.y - 5}
                    width="10"
                    height="10"
                    fill="var(--nw-surface)"
                    stroke="var(--nw-text-4)"
                    strokeWidth="1.3"
                    strokeDasharray="2 2"
                    transform={`rotate(45 ${p.x} ${p.y})`}
                  />
                  <line x1={p.x - 7} y1={p.y - 7} x2={p.x + 7} y2={p.y + 7} stroke="var(--nw-text-4)" strokeWidth="1.1" />
                </g>
              )
            })}
        </g>

        {/* the measured link, behind the candidates so the marks stay on top */}
        {link && (
          <g>
            <line
              x1={link.a.x}
              y1={link.a.y}
              x2={link.b.x}
              y2={link.b.y}
              stroke="var(--nw-black)"
              strokeWidth="1.4"
              strokeDasharray="4 3"
            />
            <g transform={`translate(${(link.a.x + link.b.x) / 2}, ${(link.a.y + link.b.y) / 2})`}>
              <rect x="-30" y="-9" width="60" height="17" rx="2" fill="var(--nw-black)" />
              <text x="0" y="3.5" textAnchor="middle" className={s.pwpLinkLabel}>
                {link.distanceKm.toFixed(2)} km
              </text>
            </g>
          </g>
        )}

        {/* candidates */}
        <g>
          {candidates.map((c, i) => {
            const p = project([c.eastKm, c.northKm])
            const on = c.id === selectedId
            const hot = hover === c.id
            const r = on ? 11 : hot ? 10 : 8.5
            const [lng, lat] = kmToLngLat([c.eastKm, c.northKm])
            return (
              <g
                key={c.id}
                className={s.pwpMark}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${c.name}, ${c.wellType} to ${Math.round(c.targetTdM).toLocaleString('en-IN')} metres in ${c.targetFormation}, confidence ${Math.round(c.confidence)} percent, ${c.distanceFromActiveKm.toFixed(2)} kilometres from the active well`}
                onClick={() => onSelect(on ? null : c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(on ? null : c.id)
                  }
                }}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
              >
                <title>
                  {`${c.name} — ${c.wellType}, TD ${Math.round(c.targetTdM).toLocaleString('en-IN')} m in ${c.targetFormation}. Confidence ${Math.round(c.confidence)}%. Nearest existing well ${c.nearestWell?.id ?? 'none in range'} at ${c.nearestWell ? c.nearestWell.distanceKm.toFixed(2) : '—'} km.`}
                </title>
                {on && <circle cx={p.x} cy={p.y} r="20" fill="none" stroke="var(--nw-yellow-deep)" strokeWidth="1.2" strokeDasharray="4 3" />}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={on ? 'var(--nw-yellow)' : 'var(--nw-white)'}
                  stroke="var(--nw-black)"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  className={on ? s.pwpRankOn : s.pwpRank}
                >
                  {i + 1}
                </text>
                <g transform={`translate(${p.x + 13}, ${p.y - 20})`}>
                  <rect x="0" y="0" width={c.name.length * 6.2 + 26} height="16" rx="2" fill={on ? 'var(--nw-black)' : 'var(--nw-white)'} stroke="var(--nw-border-2)" />
                  <text x="4" y="11.5" className={on ? s.pwpCandLabelOn : s.pwpCandLabel}>
                    {c.name}
                  </text>
                  <text x={c.name.length * 6.2 + 22} y="11.5" textAnchor="end" className={on ? s.pwpConfOn : s.pwpConf}>
                    {Math.round(c.confidence)}%
                  </text>
                </g>
                <text x={p.x} y={p.y + 26} textAnchor="middle" className={s.pwpSub}>
                  {lat.toFixed(4)}°N {lng.toFixed(4)}°E
                </text>
              </g>
            )
          })}
        </g>

        {/* the well being drilled, always on top and always labelled */}
        <g>
          <circle cx={centre.x} cy={centre.y} r="9" fill="var(--nw-yellow)" stroke="var(--nw-black)" strokeWidth="2.2" />
          <circle cx={centre.x} cy={centre.y} r="3" fill="var(--nw-black)" />
          <g transform={`translate(${centre.x - 11}, ${centre.y + 14})`}>
            <rect x="0" y="0" width={activeWellId.length * 6.2 + 46} height="16" rx="2" fill="var(--nw-black)" />
            <text x="5" y="11.5" className={s.pwpCandLabelOn}>
              {activeWellId}
            </text>
            <text x={activeWellId.length * 6.2 + 41} y="11.5" textAnchor="end" className={s.pwpConfOn}>
              LIVE
            </text>
          </g>
        </g>

        {/* scale bar and north */}
        <g transform={`translate(${PAD - 18}, ${VB - 30})`}>
          <line x1="0" y1="0" x2={scaleMark * pxPerKm} y2="0" stroke="var(--nw-text)" strokeWidth="2" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--nw-text)" strokeWidth="2" />
          <line x1={scaleMark * pxPerKm} y1="-4" x2={scaleMark * pxPerKm} y2="4" stroke="var(--nw-text)" strokeWidth="2" />
          <text x={scaleMark * pxPerKm / 2} y="-7" textAnchor="middle" className={s.pwpTick}>
            {scaleMark} km
          </text>
        </g>
        <g transform={`translate(${VB - PAD + 6}, ${PAD - 6})`}>
          <path d="M 0 -16 L 5 4 L 0 -1 L -5 4 Z" fill="var(--nw-black)" />
          <text x="0" y="18" textAnchor="middle" className={s.pwpTick}>
            N
          </text>
        </g>
      </svg>

      <div className={s.pwpLegend}>
        <span>
          <i className={s.pwpSwatchLive} aria-hidden />
          {activeWellId} · active
        </span>
        <span>
          <i className={s.pwpSwatchExisting} aria-hidden />
          existing bore
        </span>
        <span>
          <i className={s.pwpSwatchLoss} aria-hidden />
          loss history
        </span>
        <span>
          <i className={s.pwpSwatchCandidate} aria-hidden />
          candidate well
        </span>
        <span>
          <i className={s.pwpSwatchRejected} aria-hidden />
          rejected
        </span>
      </div>

      {selected && (
        <button type="button" className={s.pwpClear} onClick={() => onSelect(null)}>
          <Icon name="close" size={11} /> Clear selection
        </button>
      )}
    </div>
  )
}
