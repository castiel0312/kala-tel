import type { ReactNode } from 'react'
import s from './kit.module.css'

/* ============================================================================
   Event vocabulary. One glyph, one colour rule, one label, used by the depth
   corridor, the alert feed, the knowledge graph and the map so that a mud loss
   always looks like a mud loss.
     ●  LOSS       ■  STUCK      ▲  KICK
     ◆  TORQUE     ━  CEMENT     ▪  OTHER
   ========================================================================== */

export type EventType = 'LOSS' | 'STUCK' | 'KICK' | 'TORQUE' | 'CEMENT' | 'OTHER' | string

export const EVENT_META: Record<
  string,
  { label: string; glyph: string; color: string; short: string }
> = {
  LOSS: { label: 'Mud loss', glyph: '●', color: 'var(--nw-red)', short: 'LOSS' },
  STUCK: { label: 'Stuck pipe', glyph: '■', color: 'var(--nw-yellow-deep)', short: 'STUCK' },
  KICK: { label: 'Kick', glyph: '▲', color: 'var(--nw-orange)', short: 'KICK' },
  TORQUE: { label: 'Torque spike', glyph: '◆', color: 'var(--nw-text-2)', short: 'TRQ' },
  CEMENT: { label: 'Cementing', glyph: '━', color: 'var(--nw-steel)', short: 'CMT' },
  OTHER: { label: 'Event', glyph: '▪', color: 'var(--nw-text-4)', short: 'EVT' },
}

const EVENT_FALLBACK = EVENT_META.OTHER as { label: string; glyph: string; color: string; short: string }

export function eventMeta(type: EventType) {
  return EVENT_META[type] ?? EVENT_FALLBACK
}

export const SEV_COLOR: Record<string, string> = {
  high: 'var(--nw-red)',
  med: 'var(--nw-yellow-deep)',
  medium: 'var(--nw-yellow-deep)',
  low: 'var(--nw-text-3)',
}

export function sevColor(sev?: string) {
  return SEV_COLOR[(sev ?? 'low').toLowerCase()] ?? 'var(--nw-text-3)'
}

/** Inline glyph used in dense tables and legends. */
export function EventGlyph({ type, severity, size = 11 }: { type: EventType; severity?: string; size?: number }) {
  const m = eventMeta(type)
  const color = severity ? sevColor(severity) : m.color
  return (
    <span
      aria-hidden
      title={m.label}
      style={{
        color,
        fontSize: size,
        lineHeight: 1,
        display: 'inline-block',
      }}
    >
      {m.glyph}
    </span>
  )
}

export function EventLegendRow({ onBlack }: { onBlack?: boolean }) {
  return (
    <div className={s.legend} style={onBlack ? { color: 'var(--nw-ink-2)' } : undefined} role="list">
      {Object.entries(EVENT_META)
        .filter(([k]) => k !== 'OTHER')
        .map(([k, m]) => (
          <span className={s.legendItem} role="listitem" key={k}>
            <span
              aria-hidden
              style={{ color: m.color, fontSize: 11, lineHeight: 1, width: 10, display: 'inline-block' }}
            >
              {m.glyph}
            </span>
            {m.label}
          </span>
        ))}
    </div>
  )
}

/* ------------------------------------------------------- formation palette */

export const FORMATION_FILL: Record<string, string> = {
  Girujan: 'var(--nw-geo-girujan)',
  Tipam: 'var(--nw-geo-tipam)',
  Barail: 'var(--nw-geo-barail)',
  Dihing: 'var(--nw-geo-dihing)',
  Tura: 'var(--nw-geo-tura)',
}

export const FORMATION_PATTERN: Record<string, string> = {
  // lithology vocabulary: distinct but restrained
  Girujan: 'sand',
  Tipam: 'clay',
  Barail: 'sand',
  Dihing: 'shale',
  Tura: 'basement',
}

export function formationFill(name: string) {
  return FORMATION_FILL[name] ?? 'var(--nw-geo-unknown)'
}

export function lithologyPattern(name: string) {
  return FORMATION_PATTERN[name] ?? 'shale'
}

export function EventListRow({
  glyph,
  color,
  title,
  meta,
  right,
  onClick,
  selected,
}: {
  glyph: ReactNode
  color: string
  title: ReactNode
  meta?: ReactNode
  right?: ReactNode
  onClick?: () => void
  selected?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: '16px 1fr auto',
        gap: 8,
        alignItems: 'start',
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        borderBottom: '1px solid var(--nw-border)',
        background: selected ? 'var(--nw-yellow-soft)' : 'transparent',
        boxShadow: selected ? 'inset 3px 0 0 var(--nw-yellow)' : undefined,
      }}
    >
      <span style={{ color, fontSize: 12, lineHeight: 1.35 }} aria-hidden>
        {glyph}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'var(--nw-fs-sm)', fontWeight: 600, lineHeight: 1.3 }}>{title}</span>
        {meta && (
          <span className="mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--nw-text-3)', marginTop: 2 }}>
            {meta}
          </span>
        )}
      </span>
      {right && <span style={{ textAlign: 'right' }}>{right}</span>}
    </button>
  )
}
