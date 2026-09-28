import { useMemo, useState } from 'react'
import type { Corridor, CorridorColumn } from '../../api/types'
import { DepthRuler } from '../kit/charts'
import { EventGlyph, formationFill, lithologyPattern } from '../kit/events'
import { Icon } from '../kit/icons'
import { fmtInt } from '../../lib/format'
import s from './corridor.module.css'

/* ============================================================================
   DepthCorridor — the section view, drawn as a section view.

   Every subsurface question on this platform comes down to "at what depth, and
   how far below the top of a formation". So the corridor is aligned three ways
   (measured depth, true vertical depth, formation top) and drawn as parallel
   well columns against a shared depth axis. Bands are formations, glyphs are
   historical events, and the yellow window is the active well's look-ahead.

   The band intervals come from `/corridor`; the flattening is the align mode.
   Nothing here is a schematic — it is the API's numbers, positioned.
   ========================================================================== */

export interface DepthCorridorProps {
  corridor: Corridor
  /** metres; the corridor has to be tall enough to read the look-ahead */
  height?: number
  selectedWellId?: string | null
  onSelectWell?: (wellId: string) => void
  onPickEvent?: (wellId: string, eventId: string) => void
}

export function DepthCorridor({
  corridor,
  height = 420,
  selectedWellId,
  onSelectWell,
  onPickEvent,
}: DepthCorridorProps) {
  const { axis, bit, columns, predictedTop } = corridor
  const top = axis.topM
  const bottom = axis.topM + axis.spanM
  const span = Math.max(1, bottom - top)
  const [hover, setHover] = useState<string | null>(null)

  const at = useMemo(
    () => ({
      lookAhead: axis.unit.includes('TVDSS') ? bit.depthM + bit.lookAheadM : bit.depthM + bit.lookAheadM,
      bit: bit.depthM,
      predicted: predictedTop?.depthM,
    }),
    [axis.unit, bit, predictedTop],
  )

  const marks = useMemo(
    () => [
      ...(at.predicted != null ? [{ depth: at.predicted, color: 'var(--nw-yellow-deep)', title: `${predictedTop?.name} top` }] : []),
      ...(at.predicted != null
        ? [
            { depth: at.predicted - predictedTop!.uncertaintyM, color: 'var(--nw-yellow-deep)', title: 'top, low bound' },
            { depth: at.predicted + predictedTop!.uncertaintyM, color: 'var(--nw-yellow-deep)', title: 'top, high bound' },
          ]
        : []),
    ],
    [at.predicted, predictedTop],
  )

  return (
    <div className={s.wrap} style={{ height }}>
      <div className={s.axis}>
        <DepthRuler top={top} bottom={bottom} step={50} height={height} activeDepth={at.bit} markDepths={marks} unit={axis.unit} />
      </div>

      <div className={s.columns} role="table" aria-label="depth corridor">
        {columns.map((col) => (
          <CorridorColumnView
            key={col.wellId}
            col={col}
            top={top}
            span={span}
            height={height}
            bit={at.bit}
            lookAhead={at.lookAhead}
            selected={selectedWellId === col.wellId}
            hovered={hover === col.wellId}
            onHover={setHover}
            onSelect={onSelectWell ? () => onSelectWell(col.wellId) : undefined}
            onPickEvent={onPickEvent ? (id) => onPickEvent(col.wellId, id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function CorridorColumnView({
  col,
  top,
  span,
  height,
  bit,
  lookAhead,
  selected,
  hovered,
  onHover,
  onSelect,
  onPickEvent,
}: {
  col: CorridorColumn
  top: number
  span: number
  height: number
  bit: number
  lookAhead: number
  selected: boolean
  hovered: boolean
  onHover: (id: string | null) => void
  onSelect?: () => void
  onPickEvent?: (eventId: string) => void
}) {
  const active = col.distanceKm === 0
  const bottom = top + span
  /**
   * The look-ahead window starts at the bit, not at its own end point, and is clipped to the visible
   * slice. A formation that continues past the slice is clipped the same way, so nothing is laid out
   * outside the column and a band that runs off the bottom says so.
   */
  const windowStart = Math.max(top, Math.min(bit, lookAhead))
  const windowEnd = Math.min(bottom, lookAhead)
  const windowPct = windowEnd > windowStart ? ((windowEnd - windowStart) / span) * 100 : 0

  return (
    <div
      className={[s.col, active ? s['col--active'] : '', selected ? s['col--selected'] : '', hovered ? s['col--hover'] : ''].filter(Boolean).join(' ')}
      style={{ height }}
      role="row"
      onMouseEnter={() => onHover(col.wellId)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={s.colHead}>
        {onSelect ? (
          <button type="button" className={s.colBtn} onClick={onSelect} aria-pressed={selected}>
            {col.wellId}
          </button>
        ) : (
          <span className={s.colId}>{col.wellId}</span>
        )}
        <span className={s.colDist}>{active ? 'this well' : `${col.distanceKm.toFixed(1)} km`}</span>
        {active && <span className={s.colActive}>active</span>}
        {!active && col.shiftM !== 0 && (
          <span className={s.colShift} title="how far this well's section is shifted against the active well">
            {col.shiftM > 0 ? '+' : ''}
            {Math.round(col.shiftM)} m
          </span>
        )}
      </div>

      <div className={s.colBody} style={{ backgroundImage: lithologyPattern('sandstone') }}>
        {col.bands.map((b) => {
          const from = Math.max(b.fromM, top)
          const to = Math.min(b.toM, bottom)
          if (to <= from) return null
          return (
            <div
              key={`${b.name}-${b.fromM}`}
              className={[s.band, b.toM > bottom ? s['band--continues'] : ''].filter(Boolean).join(' ')}
              style={{
                top: `${((from - top) / span) * 100}%`,
                height: `${((to - from) / span) * 100}%`,
                background: formationFill(b.name),
              }}
              title={`${b.name} · ${fmtInt(b.fromM)}–${fmtInt(b.toM)} m`}
            >
              <span className={s.bandName}>{b.name}</span>
            </div>
          )
        })}

        {windowPct > 0 && (
          <div
            className={s.lookAhead}
            style={{ top: `${((windowStart - top) / span) * 100}%`, height: `${windowPct}%` }}
            title={`look-ahead window · ${fmtInt(bit)}–${fmtInt(lookAhead)} m`}
          />
        )}

        {col.events.map((e) => (
          <button
            key={e.eventId}
            type="button"
            className={[s.event, e.inLookAhead ? s['event--window'] : ''].filter(Boolean).join(' ')}
            style={{ top: `${((e.depthM - top) / span) * 100}%` }}
            title={`${e.label} · ${fmtInt(e.depthM)} m`}
            onClick={onPickEvent ? () => onPickEvent(e.eventId) : undefined}
          >
            <EventGlyph type={e.type} severity={e.severity} />
            <span className={s.eventLabel}>{e.label}</span>
          </button>
        ))}

        <div className={s.bitLine} style={{ top: `${((bit - top) / span) * 100}%` }} title={`bit ${fmtInt(bit)} m`} />
      </div>
    </div>
  )
}

/** A small inline readout for the event a user picked, so the corridor has a caption row. */
export function CorridorReadout({ label, depth, inWindow }: { label: string; depth: number; inWindow: boolean }) {
  return (
    <div className={s.readout}>
      <Icon name="target" size={13} />
      <span className={s.readoutT}>{label}</span>
      <span className="mono">{fmtInt(depth)} m</span>
      {inWindow ? <span className={s.readoutFlag}>inside the look-ahead</span> : <span className={s.readoutFlagMuted}>above the look-ahead</span>}
    </div>
  )
}
