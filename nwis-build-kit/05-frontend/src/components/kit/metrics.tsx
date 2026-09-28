import type { CSSProperties, ReactNode } from 'react'
import s from './kit.module.css'

/* ============================================================================
   Metric blocks. Drilling telemetry is the product's heartbeat: depth, ROP,
   WOB, RPM, torque, ECD. Numbers are mono, labels are Archivo caps, the unit
   is always visible but quiet.
   ========================================================================== */

export interface MetricDatum {
  key: string
  label: string
  value: ReactNode
  unit?: string
  note?: string
  tone?: 'signal' | 'danger' | 'ok' | 'plain'
  size?: 'sm' | 'md' | 'lg'
  title?: string
}

export function MetricBlock({ d, style }: { d: MetricDatum; style?: CSSProperties }) {
  const tone =
    d.tone === 'signal' ? s['metric--signal'] : d.tone === 'danger' ? s['metric--danger'] : d.tone === 'ok' ? s['metric--ok'] : ''
  const noteTone = d.tone === 'danger' ? s['metricNote--alarm'] : d.tone === 'signal' ? s['metricNote--watch'] : ''
  return (
    <div className={[s.metric, tone].filter(Boolean).join(' ')} style={style} title={d.title}>
      <span className={s.metricLabel}>
        {d.label}
        {d.title && <span aria-hidden style={{ opacity: 0.5 }}>ⓘ</span>}
      </span>
      <span
        className={[
          s.metricValue,
          d.size === 'sm' && s['metricValue--sm'],
          d.size === 'lg' && s['metricValue--lg'],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {d.value}
        {d.unit && <span className={s.metricUnit}>{d.unit}</span>}
      </span>
      {d.note && <span className={[s.metricNote, noteTone].filter(Boolean).join(' ')}>{d.note}</span>}
    </div>
  )
}

export function MetricStrip({
  data,
  tone = 'light',
  flush,
  paper,
  columns,
  minHeight,
}: {
  data: MetricDatum[]
  tone?: 'light' | 'black'
  flush?: boolean
  paper?: boolean
  columns?: number
  minHeight?: number
}) {
  return (
    <div
      className={[s.metricStrip, tone === 'black' && s['metricStrip--black'], flush && s['metricStrip--flush'], paper && s['metricStrip--paper']]
        .filter(Boolean)
        .join(' ')}
      style={{
        gridAutoFlow: columns ? 'row' : undefined,
        gridTemplateColumns: columns ? `repeat(${columns}, minmax(0,1fr))` : undefined,
        minHeight,
      }}
    >
      {data.map((d) => (
        <MetricBlock key={d.key} d={d} />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- bar -- */

export function Bar({
  value,
  max = 100,
  tone = 'black',
  ticks = 4,
  height = 6,
  onBlack,
}: {
  value: number
  max?: number
  tone?: 'black' | 'yellow' | 'red' | 'green' | 'steel'
  ticks?: number
  height?: number
  onBlack?: boolean
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  const fill = tone === 'yellow' ? s['barFill--yellow'] : tone === 'red' ? s['barFill--red'] : tone === 'green' ? s['barFill--green'] : tone === 'steel' ? s['barFill--steel'] : ''
  return (
    <div className={[s.bar, onBlack && s['bar--black']].filter(Boolean).join(' ')} style={{ height }}>
      <div className={[s.barFill, fill].filter(Boolean).join(' ')} style={{ width: `${pct}%` }} />
      {ticks > 1 && (
        <div className={s.barTicks} aria-hidden>
          {Array.from({ length: ticks - 1 }, (_, i) => (
            <span key={i} className={s.barTick} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------- horizontal comparison row ---- */

export function CompareRow({
  label,
  unit,
  active,
  offset,
  max,
  diffPct,
  flagged,
  higherIsWorse,
}: {
  label: string
  unit: string
  active: number
  offset: number
  max: number
  diffPct?: number
  flagged?: boolean
  higherIsWorse?: boolean
}) {
  const aPct = (active / max) * 100
  const oPct = (offset / max) * 100
  const sign = (diffPct ?? 0) >= 0 ? '+' : ''
  const bad = flagged || (higherIsWorse != null && (diffPct ?? 0) * (higherIsWorse ? 1 : -1) > 0)
  return (
    <div className={s.cmpRow}>
      <div>
        <div className="label" style={{ fontSize: 'var(--nw-fs-micro)', color: 'var(--nw-text-2)' }}>
          {label}
        </div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--nw-text-4)' }}>
          {unit}
        </div>
      </div>
      <div className={s.cmpBars}>
        <div className={s.cmpBar}>
          <div className={s.cmpBarTrack}>
            <div className={`${s.cmpBarFill} ${s['cmpBarFill--active']}`} style={{ width: `${aPct}%` }} />
          </div>
          <span className={s.cmpBarVal}>{active}</span>
        </div>
        <div className={s.cmpBar}>
          <div className={s.cmpBarTrack}>
            <div className={`${s.cmpBarFill} ${s['cmpBarFill--offset']}`} style={{ width: `${oPct}%` }} />
          </div>
          <span className={s.cmpBarVal}>{offset}</span>
        </div>
      </div>
      <div
        className="mono"
        style={{
          fontSize: 'var(--nw-fs-sm)',
          textAlign: 'right',
          color: bad ? 'var(--nw-red)' : 'var(--nw-text-2)',
          minWidth: 46,
        }}
      >
        {sign}
        {diffPct?.toFixed(1)}%
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- similarity -- */

export function SimilarityBar({ value, width = 44 }: { value: number; width?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className="mono" style={{ fontSize: 'var(--nw-fs-sm)', minWidth: 24, textAlign: 'right' }}>
        {value}
      </span>
      <span style={{ width, height: 5, background: 'var(--nw-surface-2)', border: '1px solid var(--nw-border)', position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: `${value}%`,
            background: value >= 80 ? 'var(--nw-yellow)' : value >= 60 ? 'var(--nw-text-2)' : 'var(--nw-border-2)',
          }}
        />
      </span>
    </span>
  )
}
