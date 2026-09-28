import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/* ============================================================================
   Charts. Hand-built SVG: no chart library, no gradients, no rounded bubbles.
   Yellow is the primary signal, black/grey the context, red only for a limit
   that has been breached. Every chart supports hover readout and keyboard focus.
   ========================================================================== */

export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setW(entry.contentRect.width)
    })
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function niceMax(v: number) {
  if (v <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / mag
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * mag
}

export interface Series {
  key: string
  label: string
  color: string
  points: number[]
  dashed?: boolean
  width?: number
  /** render as a filled area down to the axis */
  area?: boolean
}

export function TrendChart({
  series,
  xLabels,
  height = 150,
  unit,
  yLabel,
  limit,
  limitLabel,
  band,
  bands,
  format = (v: number) => String(v),
  onPointClick,
  showLegend = true,
  xTitle,
  ariaLabel,
}: {
  series: Series[]
  xLabels?: string[]
  height?: number
  unit?: string
  yLabel?: string
  /** danger threshold, drawn as a red rule */
  limit?: number
  limitLabel?: string
  /** translucent yellow zone between [from,to] in data units */
  band?: [number, number]
  /** vertical event markers: { at: index, label, severity } */
  bands?: { at: number; label: string; severity?: 'high' | 'med' | 'low' }[]
  format?: (v: number) => string
  onPointClick?: (seriesKey: string, index: number, value: number) => void
  showLegend?: boolean
  xTitle?: string
  ariaLabel?: string
}) {
  const [ref, w] = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const padL = 42
  const padR = 10
  const padT = 8
  const padB = xLabels ? 18 : 10
  const innerW = Math.max(10, w - padL - padR)
  const innerH = Math.max(10, height - padT - padB)

  const n = series[0]?.points.length ?? 0
  const rawMax = Math.max(
    ...series.flatMap((sr) => sr.points),
    limit ?? 0,
    band?.[1] ?? 0,
    1,
  )
  const max = niceMax(rawMax * 1.06)
  const min = 0

  const x = useCallback(
    (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    [n, innerW, padL],
  )
  const y = useCallback((v: number) => padT + innerH - ((v - min) / (max - min)) * innerH, [innerH, max, min, padT])

  const ticks = useMemo(() => {
    const count = 3
    return Array.from({ length: count + 1 }, (_, i) => (max / count) * i)
  }, [max])

  const path = useCallback(
    (pts: number[]) => pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
    [x, y],
  )

  const areaPath = useCallback(
    (pts: number[]) =>
      `${path(pts)} L${x(pts.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`,
    [path, x, padT, innerH],
  )

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left - padL
    const i = Math.round((px / innerW) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  const hovered = hover != null && n > 0

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <div
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onClick={() => {
          if (!onPointClick || hover == null) return
          for (const sr of series) onPointClick(sr.key, hover, sr.points[hover] ?? 0)
        }}
        style={{ position: 'relative', cursor: onPointClick ? 'pointer' : 'crosshair' }}
      >
        <svg width="100%" height={height} role="img" aria-label={ariaLabel ?? yLabel ?? 'trend chart'}>
          {/* grid + y axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + innerW} y1={y(t)} y2={y(t)} stroke="var(--nw-border)" strokeWidth={1} />
              <text
                x={padL - 6}
                y={y(t) + 3}
                textAnchor="end"
                className="mono"
                fontSize={9}
                fill="var(--nw-text-4)"
              >
                {Math.round(t)}
              </text>
            </g>
          ))}

          {/* watch band */}
          {band && (
            <rect
              x={padL}
              width={innerW}
              y={y(band[1])}
              height={Math.max(0, y(band[0]) - y(band[1]))}
              fill="var(--nw-yellow)"
              opacity={0.1}
            />
          )}

          {/* event markers */}
          {bands?.map((b, i) => (
            <g key={i}>
              <line
                x1={x(b.at)}
                x2={x(b.at)}
                y1={padT}
                y2={padT + innerH}
                stroke={b.severity === 'high' ? 'var(--nw-red)' : b.severity === 'med' ? 'var(--nw-yellow-deep)' : 'var(--nw-border-2)'}
                strokeWidth={1}
                strokeDasharray={b.severity === 'low' ? '2 2' : undefined}
              />
              {padT + innerH > y(0) && null}
            </g>
          ))}

          {/* limit */}
          {limit != null && (
            <g>
              <line
                x1={padL}
                x2={padL + innerW}
                y1={y(limit)}
                y2={y(limit)}
                stroke="var(--nw-red)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
              />
              {limitLabel && (
                <text x={padL + innerW} y={y(limit) - 4} textAnchor="end" fontSize={9} className="mono" fill="var(--nw-red)">
                  {limitLabel}
                </text>
              )}
            </g>
          )}

          {/* series */}
          {series.map((sr) => (
            <g key={sr.key}>
              {sr.area && <path d={areaPath(sr.points)} fill={sr.color} opacity={0.09} />}
              <path
                d={path(sr.points)}
                fill="none"
                stroke={sr.color}
                strokeWidth={sr.width ?? 1.75}
                strokeDasharray={sr.dashed ? '4 3' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {hovered && (
                <circle cx={x(hover!)} cy={y(sr.points[hover!] ?? 0)} r={2.6} fill={sr.color} stroke="var(--nw-white)" strokeWidth={1} />
              )}
            </g>
          ))}

          {/* x axis */}
          <line x1={padL} x2={padL + innerW} y1={padT + innerH} y2={padT + innerH} stroke="var(--nw-border-2)" />
          {xLabels &&
            xLabels.map((l, i) => {
              if (n > 8 && i % Math.ceil(n / 6) !== 0 && i !== n - 1) return null
              return (
                <text key={i} x={x(i)} y={height - 5} textAnchor="middle" fontSize={9} className="mono" fill="var(--nw-text-4)">
                  {l}
                </text>
              )
            })}

          {/* hover crosshair */}
          {hovered && (
            <g>
              <line x1={x(hover!)} x2={x(hover!)} y1={padT} y2={padT + innerH} stroke="var(--nw-black)" strokeWidth={1} strokeDasharray="2 2" />
            </g>
          )}

          {yLabel && (
            <text x={2} y={9} fontSize={9} className="mono" fill="var(--nw-text-4)">
              {yLabel}
            </text>
          )}
          {unit && (
            <text x={padL - 6} y={padT - 1} textAnchor="end" fontSize={8.5} className="mono" fill="var(--nw-text-4)">
              {unit}
            </text>
          )}
        </svg>

        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: Math.min(Math.max(x(hover!) + 8, padL), Math.max(0, w - 150)),
              background: 'var(--nw-black)',
              color: 'var(--nw-ink)',
              border: '1px solid var(--nw-border-dark-2)',
              borderLeft: '2px solid var(--nw-yellow)',
              padding: '4px 7px',
              pointerEvents: 'none',
              zIndex: 3,
              minWidth: 116,
            }}
          >
            {xLabels?.[hover!] && (
              <div className="label" style={{ fontSize: 9, color: 'var(--nw-ink-3)', marginBottom: 3 }}>
                {xLabels[hover!]}
              </div>
            )}
            {series.map((sr) => (
              <div key={sr.key} className="mono" style={{ fontSize: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ width: 6, height: 6, background: sr.color, flex: '0 0 auto' }} />
                <span style={{ color: 'var(--nw-ink-3)' }}>{sr.label}</span>
                <b style={{ marginLeft: 'auto', fontWeight: 500 }}>
                  {format(sr.points[hover!] ?? 0)}
                  {unit ? ` ${unit}` : ''}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLegend && series.length > 1 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
          {series.map((sr) => (
            <span
              key={sr.key}
              className="label"
              style={{ fontSize: 9, color: 'var(--nw-text-2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <span style={{ width: 12, height: 3, background: sr.color, display: 'inline-block' }} />
              {sr.label}
            </span>
          ))}
          {xTitle && (
            <span className="label" style={{ fontSize: 9, color: 'var(--nw-text-4)', marginLeft: 'auto' }}>
              {xTitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- sparkline */

/**
 * A sparkline. `width` may be `'100%'`, in which case the sparkline measures its own box, because a
 * fixed pixel width inside a fluid cell is how a chart ends up clipped.
 */
export function Sparkline({
  points,
  color = 'var(--nw-text-2)',
  limit,
  width = 96,
  height = 22,
  fill,
}: {
  points: number[]
  color?: string
  limit?: number
  width?: number | '100%'
  height?: number
  fill?: string
}) {
  const [ref, measured] = useMeasure<HTMLSpanElement>()
  const fluid = width === '100%'
  const w = Math.max(24, fluid ? measured : (width as number))
  const max = Math.max(...points, limit ?? -Infinity)
  const min = points.length ? Math.min(...points) : 0
  const span = max - min || 1
  const x = (i: number) => (i / (points.length - 1 || 1)) * (w - 2) + 1
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4)
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  const svg = (
    <svg width={w} height={height} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={`${d} L${x(points.length - 1)},${height} L${x(0)},${height} Z`} fill={fill} opacity={0.12} />}
      {limit != null && (
        <line x1={0} x2={w} y1={y(limit)} y2={y(limit)} stroke="var(--nw-red)" strokeWidth={1} strokeDasharray="3 2" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  )

  if (fluid) {
    return (
      <span ref={ref} style={{ display: 'block', width: '100%', minWidth: 0 }}>
        {points.length ? svg : null}
      </span>
    )
  }
  return points.length ? svg : <svg width={w} height={height} aria-hidden />
}

/* ------------------------------------------------------- composition bars -- */

export function CompositionBars({
  rows,
  unit = '%',
  onSelect,
}: {
  rows: { label: string; value: number; color?: string; note?: string }[]
  unit?: string
  onSelect?: (label: string) => void
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={r.label}
          onClick={onSelect ? () => onSelect(r.label) : undefined}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onKeyDown={(e) => onSelect && (e.key === 'Enter' ? onSelect(r.label) : null)}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 44px',
            gap: 8,
            alignItems: 'center',
            padding: '4px 0',
            borderBottom: i < rows.length - 1 ? '1px solid var(--nw-border)' : 0,
            cursor: onSelect ? 'pointer' : undefined,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="label" style={{ fontSize: 'var(--nw-fs-micro)', color: 'var(--nw-text-2)' }}>
                {r.label}
              </span>
              {r.note && (
                <span className="mono" style={{ fontSize: 9, color: 'var(--nw-text-4)' }}>
                  {r.note}
                </span>
              )}
            </div>
            <div
              style={{
                height: 8,
                background: 'var(--nw-surface-2)',
                border: '1px solid var(--nw-border)',
                position: 'relative',
                marginTop: 3,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: `${(r.value / max) * 100}%`,
                  background: r.color ?? 'var(--nw-black)',
                }}
              />
            </div>
          </div>
          <span className="mono" style={{ fontSize: 'var(--nw-fs-sm)', textAlign: 'right' }}>
            {r.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- columns -- */

export function ColumnChart({
  rows,
  height = 130,
  unit,
  highlightLabel,
  onSelect,
  labelWidth = 86,
}: {
  rows: { label: string; value: number; highlight?: boolean; color?: string; note?: string }[]
  height?: number
  unit?: string
  highlightLabel?: string
  onSelect?: (label: string) => void
  labelWidth?: number
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  // The row pitch is derived from the requested height so a tall block reads as a chart and a
  // short one reads as a compact list, rather than both being 14px rows in a tall empty box.
  const pitch = Math.max(16, Math.min(30, height / Math.max(rows.length, 1)))
  return (
    <div>
      {rows.map((r, i) => {
        const isHi = r.highlight || r.label === highlightLabel
        return (
          <div
            key={r.label}
            onClick={onSelect ? () => onSelect(r.label) : undefined}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={(e) => onSelect && e.key === 'Enter' ? onSelect(r.label) : null}
            style={{
              display: 'grid',
              gridTemplateColumns: `${labelWidth}px 1fr 52px`,
              gap: 8,
              alignItems: 'center',
              padding: `${Math.max(1, (pitch - 16) / 2)}px 0`,
              borderBottom: i < rows.length - 1 ? '1px solid var(--nw-border)' : 0,
              cursor: onSelect ? 'pointer' : undefined,
            }}
          >
            <span
              className="label"
              style={{
                fontSize: 'var(--nw-fs-micro)',
                color: isHi ? 'var(--nw-text)' : 'var(--nw-text-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={r.label}
            >
              {r.label}
            </span>
            <span style={{ height: 14, background: 'var(--nw-surface-2)', border: '1px solid var(--nw-border)', position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: `${(r.value / max) * 100}%`,
                  background: r.color ?? (isHi ? 'var(--nw-yellow)' : 'var(--nw-text-2)'),
                  borderRight: isHi ? '2px solid var(--nw-black)' : undefined,
                }}
              />
            </span>
            <span
              className="mono"
              style={{
                fontSize: 'var(--nw-fs-sm)',
                textAlign: 'right',
                color: isHi ? 'var(--nw-text)' : 'var(--nw-text-2)',
                fontWeight: isHi ? 600 : 400,
              }}
            >
              {r.value}
              {unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------- depth bars -- */

/** Frequency by depth bin, drawn as a vertical section: the shape of trouble. */
export function DepthHistogram({
  bins,
  height = 120,
  currentDepth,
  lookAhead,
}: {
  bins: { label: string; value: number; highlight?: boolean }[]
  height?: number
  currentDepth?: number
  lookAhead?: number
}) {
  const [ref, w] = useMeasure<HTMLDivElement>()
  const max = Math.max(...bins.map((b) => b.value), 1)
  const bw = w / Math.max(bins.length, 1)
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width="100%" height={height} role="img" aria-label="events by depth">
        {bins.map((b, i) => {
          const h = (b.value / max) * (height - 18)
          return (
            <g key={b.label}>
              <rect
                x={i * bw + 1}
                y={height - 16 - h}
                width={Math.max(2, bw - 2)}
                height={Math.max(1, h)}
                fill={b.highlight ? 'var(--nw-yellow)' : 'var(--nw-text-2)'}
              />
              {bw > 26 && (
                <text x={i * bw + bw / 2} y={height - 5} textAnchor="middle" fontSize={8.5} className="mono" fill="var(--nw-text-4)">
                  {b.label}
                </text>
              )}
              {h > 2 && (
                <text
                  x={i * bw + bw / 2}
                  y={height - 20 - h}
                  textAnchor="middle"
                  fontSize={9}
                  className="mono"
                  fill={b.highlight ? 'var(--nw-text)' : 'var(--nw-text-3)'}
                >
                  {b.value}
                </text>
              )}
            </g>
          )
        })}
        {currentDepth != null && (
          <line x1={0} x2={w} y1={2} y2={2} stroke="var(--nw-yellow)" strokeWidth={2} />
        )}
        {lookAhead != null && (
          <line x1={0} x2={w} y1={6} y2={6} stroke="var(--nw-yellow-deep)" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------- gauge arc -- */

export function ScoreGauge({
  value,
  size = 96,
  level,
  label,
}: {
  value: number
  size?: number
  level?: 'HIGH' | 'MEDIUM' | 'LOW'
  label?: string
}) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const color = level === 'HIGH' ? 'var(--nw-red)' : level === 'MEDIUM' ? 'var(--nw-yellow)' : 'var(--nw-green)'
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--nw-surface-2)" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${(c * value) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="display"
          style={{ fontSize: size / 3.1, color: 'var(--nw-text)', lineHeight: 1 }}
        >
          {value}
        </span>
        <span className="label" style={{ fontSize: 8, color: 'var(--nw-text-4)', marginTop: 2 }}>
          {label ?? '%'}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- depth ruler */

export function DepthRuler({
  top,
  bottom,
  step = 50,
  height,
  width = 44,
  markDepths,
  activeDepth,
  onPick,
  unit = 'm',
  tone = 'light',
}: {
  top: number
  bottom: number
  step?: number
  height: number
  width?: number
  markDepths?: { depth: number; color: string; title?: string }[]
  activeDepth?: number
  onPick?: (depth: number) => void
  unit?: string
  tone?: 'light' | 'black'
}) {
  const span = bottom - top || 1
  const ticks: number[] = []
  for (let d = Math.ceil(top / step) * step; d <= bottom; d += step) ticks.push(d)
  const label = tone === 'black' ? 'var(--nw-ink-3)' : 'var(--nw-text-4)'
  const rule = tone === 'black' ? 'var(--nw-border-dark-2)' : 'var(--nw-border)'
  return (
    <svg width={width} height={height} role="img" aria-label="depth ruler" style={{ flex: '0 0 auto' }}>
      <line x1={width - 1} x2={width - 1} y1={0} y2={height} stroke={rule} />
      {ticks.map((d) => {
        const yy = ((d - top) / span) * height
        const major = d % (step * 2) === 0
        return (
          <g key={d} onClick={onPick ? () => onPick(d) : undefined}>
            <line x1={width - (major ? 8 : 4)} x2={width - 1} y1={yy} y2={yy} stroke={rule} />
            {major && (
              <text x={width - 10} y={yy + 3} textAnchor="end" fontSize={9} className="mono" fill={label}>
                {d.toLocaleString('en-IN')}
              </text>
            )}
          </g>
        )
      })}
      {markDepths?.map((m, i) => {
        const yy = ((m.depth - top) / span) * height
        return <rect key={i} x={0} y={yy - 1} width={width - 1} height={2} fill={m.color} opacity={0.9} />
      })}
      {activeDepth != null && (
        <g>
          <line x1={0} x2={width} y1={((activeDepth - top) / span) * height} y2={((activeDepth - top) / span) * height} stroke="var(--nw-yellow)" strokeWidth={2} />
          <polygon points={`0,0 6,3.5 0,7`} fill="var(--nw-yellow)" transform={`translate(0,${((activeDepth - top) / span) * height - 3.5})`} />
        </g>
      )}
      <text x={1} y={9} fontSize={8} className="mono" fill={label}>
        {unit}
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------- rig state -- */

export function StateStack({ states }: { states: { state: string; pct: number }[] }) {
  const tone: Record<string, string> = {
    ROTARY: 'var(--nw-yellow)',
    SLIDE: 'var(--nw-text-2)',
    CONNECTION: 'var(--nw-surface-2)',
    TRIP: 'var(--nw-steel)',
    CIRCULATE: 'var(--nw-green)',
  }
  return (
    <div>
      <div style={{ display: 'flex', height: 10, border: '1px solid var(--nw-border-2)' }}>
        {states.map((st, i) => (
          <div
            key={i}
            title={`${st.state} ${st.pct}%`}
            style={{
              width: `${st.pct}%`,
              background: tone[st.state] ?? 'var(--nw-surface-2)',
              borderRight: i < states.length - 1 ? '1px solid var(--nw-white)' : 0,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
        {states.map((st, i) => (
          <span key={i} className="label" style={{ fontSize: 9, color: 'var(--nw-text-2)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <span style={{ width: 7, height: 7, background: tone[st.state] ?? 'var(--nw-surface-2)', border: '1px solid var(--nw-border-2)' }} />
            {st.state} {st.pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------- lazy mount hook - */

export function useInView<T extends HTMLElement>(onEnter: () => void, once = true) {
  const ref = useRef<T>(null)
  const done = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && (!once || !done.current)) {
          done.current = true
          onEnter()
        }
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onEnter, once])
  return ref
}

export function KeyValueList({ items }: { items: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', margin: 0 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt className="label" style={{ fontSize: 'var(--nw-fs-micro)', color: 'var(--nw-text-3)' }}>
            {it.k}
          </dt>
          <dd className="mono" style={{ margin: 0, fontSize: 'var(--nw-fs-sm)' }}>
            {it.v}
          </dd>
        </div>
      ))}
    </dl>
  )
}
