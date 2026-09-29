import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, KeyboardEvent } from 'react'
import type { RiskFactor, RiskLevel, RiskProfilePoint } from './wellRisk'
import s from './WellRisk.module.css'

export interface WellRiskGaugeProps {
  profile: RiskProfilePoint[]
  selectedMd: number
  compact?: boolean
  wellName?: string
}

export interface RiskProfileCardProps {
  profile: RiskProfilePoint[]
  selectedMd: number
  td: number
  events: Array<{ event_type: string; end_md: number | null; severity: string | null; npt_hours: number | null }>
  onDepthChange: (md: number) => void
}

const levelText: Record<RiskLevel, string> = { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical' }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const formatNumber = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)

function useCountUp(target: number, duration = 260): number {
  const [prefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [shown, setShown] = useState(target)
  const previous = useRef(target)
  useEffect(() => {
    if (prefersReducedMotion) return
    const from = previous.current
    previous.current = target
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = clamp((now - start) / duration, 0, 1)
      setShown(from + (target - from) * progress)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, prefersReducedMotion])
  return Math.round(prefersReducedMotion ? target : shown)
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)]
}

function arcPath(start: number, end: number, radius = 78): string {
  const [x1, y1] = polar(110, 100, radius, start)
  const [x2, y2] = polar(110, 100, radius, end)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`
}

function GaugeDial({ score, level }: { score: number; level: RiskLevel }) {
  const angle = -180 + score * 1.8
  const [nx, ny] = polar(110, 100, 61, angle)
  const ticks = Array.from({ length: 21 }, (_, index) => {
    const tickAngle = -180 + index * 9
    const [x1, y1] = polar(110, 100, index % 5 === 0 ? 88 : 91, tickAngle)
    const [x2, y2] = polar(110, 100, index % 5 === 0 ? 96 : 94, tickAngle)
    return <line className={index % 5 === 0 ? `${s.tick} ${s.tickMajor}` : s.tick} key={index} x1={x1} y1={y1} x2={x2} y2={y2} />
  })
  return (
    <svg className={s.dial} viewBox='0 0 220 140' aria-hidden='true'>
      <path className={`${s.segment} ${s.segmentLow}`} d={arcPath(-178, -137)} data-active={level === 'low'} />
      <path className={`${s.segment} ${s.segmentModerate}`} d={arcPath(-133, -92)} data-active={level === 'moderate'} />
      <path className={`${s.segment} ${s.segmentHigh}`} d={arcPath(-88, -47)} data-active={level === 'high'} />
      <path className={`${s.segment} ${s.segmentCritical}`} d={arcPath(-43, -2)} data-active={level === 'critical'} />
      {ticks}
      <text className={s.dialLabel} x='19' y='119'>0</text>
      <text className={s.dialLabel} x='47' y='43'>25</text>
      <text className={s.dialLabel} x='106' y='17'>50</text>
      <text className={s.dialLabel} x='164' y='43'>75</text>
      <text className={s.dialLabel} x='190' y='119'>100</text>
      <line className={s.needle} x1='110' y1='100' x2={nx} y2={ny} data-level={level} />
      <circle className={s.hub} cx='110' cy='100' r='5' />
    </svg>
  )
}

function RiskChart({ profile, selectedMd, td, events, onDepthChange }: RiskProfileCardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const maxDepth = Math.max(td, profile.at(-1)?.md ?? 0, 1)
  const chart = { left: 48, right: 960, top: 18, bottom: 270 }
  const xAt = (md: number) => chart.left + clamp(md / maxDepth, 0, 1) * (chart.right - chart.left)
  const yAt = (score: number) => chart.bottom - clamp(score, 0, 100) / 100 * (chart.bottom - chart.top)
  const path = profile.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xAt(point.md)} ${yAt(point.score)}`).join(' ')
  const firstPoint = profile.at(0)
  const lastPoint = profile.at(-1)
  const area = firstPoint && lastPoint ? `${path} L ${xAt(lastPoint.md)} ${chart.bottom} L ${xAt(firstPoint.md)} ${chart.bottom} Z` : ''
  const x = xAt(selectedMd)
  const selected = profile.reduce<RiskProfilePoint | null>((best, item) => !best || Math.abs(item.md - selectedMd) < Math.abs(best.md - selectedMd) ? item : best, null)

  const updateFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const bounds = svg?.getBoundingClientRect()
    if (!svg || !bounds || bounds.width === 0) return
    const viewBox = svg.viewBox.baseVal
    const svgX = viewBox.x + ((event.clientX - bounds.left) / bounds.width) * viewBox.width
    onDepthChange(clamp(((svgX - chart.left) / (chart.right - chart.left)) * maxDepth, 0, maxDepth))
  }
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const increment = maxDepth / 100
    if (event.key === 'Home') onDepthChange(0)
    else if (event.key === 'End') onDepthChange(maxDepth)
    else onDepthChange(clamp(selectedMd + (event.key === 'ArrowRight' ? increment : -increment), 0, maxDepth))
  }

  return (
    <section className={s.profileCard}>
      <header className={s.profileCardHeading}><h2>Risk profile</h2><span>DEEPER →</span></header>
      <div className={s.chartWrap}>
        <svg
          className={s.chart}
          ref={svgRef}
          viewBox='0 0 1000 300'
          preserveAspectRatio='none'
          role='slider'
          tabIndex={0}
          aria-label='Selected well depth'
          aria-valuemin={0}
          aria-valuemax={Math.round(maxDepth)}
          aria-valuenow={Math.round(selectedMd)}
          aria-valuetext={`${formatNumber(selectedMd)} metres, risk ${selected?.score ?? 0} percent, ${selected?.level ?? 'unknown'}`}
          onPointerDown={(event) => { setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); updateFromPointer(event) }}
          onPointerMove={(event) => { if (dragging || event.buttons > 0) updateFromPointer(event) }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={onKeyDown}
        >
          {[0, 25, 50, 75, 100].map((score) => (
            <g key={score}>
              <line className={s.gridline} x1={chart.left} y1={yAt(score)} x2={chart.right} y2={yAt(score)} />
              <text className={s.chartLabel} x='18' y={yAt(score) + 3} textAnchor='middle'>{score}</text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((portion) => (
            <g key={portion}>
              <line className={s.depthGrid} x1={chart.left + portion * (chart.right - chart.left)} y1={chart.top} x2={chart.left + portion * (chart.right - chart.left)} y2={chart.bottom} />
              <text className={s.depthLabel} x={chart.left + portion * (chart.right - chart.left)} y='290' textAnchor='middle'>{formatNumber(portion * maxDepth)}</text>
            </g>
          ))}
          {area && <path className={s.profileArea} d={area} />}
          {profile.length > 1 && <path className={s.profileLine} d={path} />}
          {events.filter((event) => event.end_md !== null && event.end_md >= 0 && event.end_md <= maxDepth).map((event, index) => (
            <circle className={s.eventMarker} key={`${event.event_type}-${event.end_md}-${index}`} cx={xAt(event.end_md ?? 0)} cy={chart.bottom + 8} r='4'>
              <title>{`${event.event_type} · ${formatNumber(event.end_md ?? 0)} m · ${event.severity ?? 'severity not reported'} · ${event.npt_hours ?? 'hours not reported'} h lost`}</title>
            </circle>
          ))}
          <line className={s.cursor} x1={x} y1={chart.top} x2={x} y2={chart.bottom} />
          <circle className={s.cursorDot} cx={x} cy={yAt(selected?.score ?? 0)} r='5' />
        </svg>
        <p className={s.chartHint}>Move the cursor along the profile to inspect depth.</p>
      </div>
    </section>
  )
}

function FactorList({ factors }: { factors: RiskFactor[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div className={s.factors}>
      <h3>Risk factors</h3>
      {factors.map((factor) => (
        <button
          key={factor.id}
          type='button'
          aria-expanded={expanded === factor.id}
          className={expanded === factor.id ? `${s.factor} ${s.factorOpen}` : s.factor}
          onClick={() => setExpanded(expanded === factor.id ? null : factor.id)}
        >
          <span className={s.factorTop}>
            <span>{factor.label}</span>
            <span>{Math.round(factor.score)} <i>· {Math.round(factor.weight * 100)}%</i></span>
          </span>
          <span className={s.factorTrack}>
            <span style={{ width: `${factor.score}%` }} data-level={factor.score >= 75 ? 'critical' : factor.score >= 50 ? 'high' : factor.score >= 25 ? 'moderate' : 'low'} />
          </span>
          {expanded === factor.id && (
            <span className={s.factorDetail}>
              <span>{factor.detail}</span>
              <span>{factor.inputs.join(' · ')}</span>
            </span>
          )}
        </button>
      ))}
      <p className={s.footnote}>Not scored: gas, H2S, flow balance (no sensor data for this well)</p>
    </div>
  )
}

export function RiskProfileCard(props: RiskProfileCardProps) {
  return <RiskChart {...props} />
}

export function WellRiskGauge({ profile, selectedMd, compact = false, wellName = 'Well' }: WellRiskGaugeProps) {
  const point = useMemo(() => {
    const first = profile.at(0)
    if (!first) return null
    let closest = first
    for (const item of profile) if (Math.abs(item.md - selectedMd) < Math.abs(closest.md - selectedMd)) closest = item
    return closest
  }, [profile, selectedMd])
  const score = point?.score ?? 0
  const animatedScore = useCountUp(score)

  return (
    <section className={compact ? `${s.gaugeRoot} ${s.compact}` : s.gaugeRoot} data-risk-level={point?.level ?? 'none'}>
      <header className={s.gaugeHeader}><span>{wellName}</span><span>WELL RISK PROFILE</span></header>
      {!point ? (
        <p className={s.gaugeEmpty}>Risk profile is unavailable for this well.</p>
      ) : (
        <div className={s.gaugeColumns}>
          <div className={s.gaugeSummary}>
            <p className={s.depthReadout}>{formatNumber(selectedMd)} m <span>MEASURED DEPTH</span></p>
            <div
              className={s.gaugeMeter}
              role='meter'
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={score}
              aria-label={`Well risk ${score} percent, ${levelText[point.level]}`}
            >
              <GaugeDial score={score} level={point.level} />
              <div className={s.scoreline}>
                <span className={s.score}>{animatedScore}%</span>
                <span className={s.levelLabel}>
                  <i className={s[`level${point.level.charAt(0).toUpperCase()}${point.level.slice(1)}` as keyof typeof s]} aria-hidden />
                  {levelText[point.level]}
                </span>
              </div>
            </div>
            <FactorList factors={point.factors} />
          </div>
        </div>
      )}
    </section>
  )
}
