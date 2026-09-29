import { useMemo, useState, type CSSProperties } from 'react'
import type { ComparisonMetric, MetricValue } from './compareMetrics'
import { computeMetrics, totalDepth } from './compareMetrics'
import { FieldMap } from './FieldMap'
import { buildSampleWells } from './sampleWells'
import { useWellCompareData, type WellCompareSummary } from './useWellCompareData'
import { WELL_LOCATIONS } from './wellLocations'
import { FORGE_UNAVAILABLE_CHANNELS } from '../../../api/forgeTypes'
import s from './WellsCompare.module.css'

type CssVars = CSSProperties & { [key: `--${string}`]: string | number }
type PlotPoint = { x: number; y: number; md: number; value: number; wellId: string }
type HoverChart = 'plan' | 'rop' | 'events' | null

const WELL_COLORS = ['#2F7BFF', '#F5A623', '#22C3B5', '#A06CFF', '#F062A5', '#9BD24A']
const GROUPS: ComparisonMetric['group'][] = ['Well details', 'Trajectory', 'Events', 'Data availability']

type ColEntry = { key: string; label: string; source: string }
const CHANNEL_COLUMNS = (
  [
    { key: 'gas_total', label: 'Gas', source: 'gas_total' },
    { key: 'h2s', label: 'H2S', source: 'h2s' },
    { key: 'flow_in', label: 'Flow in', source: 'flow_in' },
    { key: 'flow_out', label: 'Flow out', source: 'flow_out' },
    { key: 'ecd', label: 'ECD', source: 'ecd' },
    { key: 'mud_weight', label: 'Mud weight', source: 'mud_weight' },
    { key: 'torque', label: 'Torque', source: 'torque' },
    { key: 'rop', label: 'ROP', source: 'rop' },
    { key: 'wob', label: 'WOB', source: 'wob' },
    { key: 'rpm', label: 'RPM', source: 'rpm' },
    { key: 'hookload', label: 'Hookload', source: 'hookload' },
    { key: 'standpipe_pressure', label: 'Standpipe pressure', source: 'standpipe_pressure' },
    { key: 'pump_rate', label: 'Pump rate', source: 'pump_rate' },
    { key: 'pit_volume', label: 'Pit volume', source: 'pit_volume' },
  ] as const
).filter((col) => !(col.key in FORGE_UNAVAILABLE_CHANNELS))

function fmtWellLabel(item: WellCompareSummary): string {
  return item.well.well_name ?? item.well.well_id
}

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return 'Unavailable'
  return value.toLocaleString('en-US', { maximumFractionDigits: digits })
}

function formatValue(value: MetricValue, unit: string): string {
  if (value === null) return 'Unavailable'
  if (typeof value === 'string') return value
  return `${formatNumber(value)}${unit ? ` ${unit}` : ''}`
}

function difference(value: MetricValue, reference: MetricValue, unit: string): string | null {
  if (typeof value !== 'number' || typeof reference !== 'number') return null
  const delta = value - reference
  if (delta === 0) return `0${unit ? ` ${unit}` : ''}`
  return `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))}${unit ? ` ${unit}` : ''}`
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v))
  return valid.length ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null
}

function durationHours(item: WellCompareSummary): number | null {
  const timestamps = item.timeseries.flatMap((row) => {
    if (row.timestamp === null) return []
    const value = Date.parse(row.timestamp)
    return Number.isFinite(value) ? [value] : []
  })
  if (timestamps.length < 2) return null
  return (Math.max(...timestamps) - Math.min(...timestamps)) / 3_600_000
}

function eventType(event: WellCompareSummary['events'][number]): string {
  return event.event_subtype ?? event.event_type
}

function eventLatest(item: WellCompareSummary) {
  return item.events.slice().sort((l, r) => {
    const lt = l.start_time ? Date.parse(l.start_time) : Number.NEGATIVE_INFINITY
    const rt = r.start_time ? Date.parse(r.start_time) : Number.NEGATIVE_INFINITY
    return rt - lt
  }).slice(0, 5)
}

function useVisibleWells(wells: WellCompareSummary[], selectedIds: string[], visibility: Record<string, boolean>) {
  return useMemo(() => {
    const ids = selectedIds.length ? selectedIds : wells.map((item) => item.well.well_id).slice(0, 6)
    return ids.flatMap((id) => {
      const item = wells.find((c) => c.well.well_id === id)
      return item && visibility[id] !== false ? [item] : []
    })
  }, [selectedIds, visibility, wells])
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PanelHead({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className={s.panelHeading}>
      <h3>{title}</h3>
      {detail && <span>{detail}</span>}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return <div className={s.tooltip}>{children}</div>
}

function Empty({ text }: { text: string }) {
  return <div className={s.emptyPanel}>{text}</div>
}

function WellLegend({
  wells, colorFor, visibility, onToggle,
}: {
  wells: WellCompareSummary[]
  colorFor: (id: string) => string
  visibility: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  return (
    <div className={s.legend}>
      {wells.map((item) => (
        <button
          key={item.well.well_id}
          type='button'
          className={visibility[item.well.well_id] === false ? `${s.legendItem} ${s.legendHidden}` : s.legendItem}
          onClick={() => onToggle(item.well.well_id)}
        >
          <i style={{ '--wcp-color': colorFor(item.well.well_id) } as CssVars} aria-hidden />
          {fmtWellLabel(item)}
        </button>
      ))}
    </div>
  )
}

interface RankRow { id: string; label: string; value: number | null; isRef: boolean; color: string }

function RankSection({ title, unit, rows }: { title: string; unit: string; rows: RankRow[] }) {
  const sorted = rows.slice().sort((a, b) => {
    if (a.value === null && b.value === null) return 0
    if (a.value === null) return 1
    if (b.value === null) return -1
    return b.value - a.value
  })
  const maxVal = Math.max(1, ...sorted.flatMap((r) => r.value !== null ? [r.value] : []))
  return (
    <div className={s.rankSection}>
      <p className={s.rankSectionTitle}>{title}</p>
      {sorted.map((row) => (
        <div key={row.id} className={s.rankRow} style={{ '--wcp-color': row.color } as CssVars}>
          <span className={row.isRef ? `${s.rankLabel} ${s.rankLabelRef}` : s.rankLabel}>
            {row.label}{row.isRef && <span className={s.rankRefTag}>ref</span>}
          </span>
          {row.value !== null ? (
            <>
              <div className={s.rankTrack}><div className={s.rankBar} style={{ width: `${(row.value / maxVal) * 100}%` }} /></div>
              <span className={s.rankValue}>{row.value.toLocaleString('en-US', { maximumFractionDigits: 1 })} {unit}</span>
            </>
          ) : (
            <>
              <div className={s.rankTrack} />
              <span className={`${s.rankValue} ${s.rankNa}`}>Unavailable</span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Metric direction helpers ──────────────────────────────────────────────────

const TEXT_METRIC_KEYS = new Set(['well-name', 'field', 'operator', 'spud-date'])
const LOWER_IS_BETTER = new Set(['total-depth', 'max-inclination', 'max-dogleg', 'event-count'])
const HIGHER_IS_BETTER = new Set(['rop', 'avg-rop'])

function diffDirection(key: string): 'neutral' | 'lower-better' | 'higher-better' {
  if (key === 'drilling-duration' || key === 'active-time') return 'lower-better'
  if (key.startsWith('rop') || key === 'avg-rop') return 'higher-better'
  if (LOWER_IS_BETTER.has(key)) return 'lower-better'
  if (HIGHER_IS_BETTER.has(key)) return 'higher-better'
  return 'neutral'
}

function FragmentGroup({
  group, metrics, selected, reference, expandedMetric, setExpandedMetric,
}: {
  group: ComparisonMetric['group']
  metrics: ComparisonMetric[]
  selected: WellCompareSummary[]
  reference: WellCompareSummary | null
  expandedMetric: string | null
  setExpandedMetric: (key: string | null) => void
}) {
  const inGroup = metrics.filter((m) => m.group === group)
  if (!inGroup.length) return null
  return (
    <>
      <tr className={s.groupRow}><th colSpan={selected.length + 1} scope='colgroup'>{group}</th></tr>
      {inGroup.map((metric) => {
        const isText = TEXT_METRIC_KEYS.has(metric.key)
        const direction = diffDirection(metric.key)
        const numericValues = selected.flatMap((item) => {
          const v = metric.values[item.well.well_id] ?? null
          return typeof v === 'number' && Number.isFinite(v) ? [{ id: item.well.well_id, v }] : []
        })
        let bestId: string | null = null
        if (!isText && numericValues.length > 1) {
          const best = numericValues.reduce((a, b) => {
            if (direction === 'lower-better') return b.v < a.v ? b : a
            if (direction === 'higher-better') return b.v > a.v ? b : a
            return a
          })
          bestId = best.id
        }
        return (
          <tr key={metric.key}>
            <th scope='row'>
              <button
                className={s.metricToggle}
                type='button'
                aria-expanded={expandedMetric === metric.key}
                onClick={() => setExpandedMetric(expandedMetric === metric.key ? null : metric.key)}
              >
                {metric.label}<span className={s.expandMark}>{expandedMetric === metric.key ? '−' : '+'}</span>
              </button>
              {expandedMetric === metric.key && <p className={s.explanation}>{metric.explanation}</p>}
            </th>
            {selected.map((item) => {
              const value = metric.values[item.well.well_id] ?? null
              const refValue = reference ? metric.values[reference.well.well_id] ?? null : null
              const isReference = item.well.well_id === reference?.well.well_id
              const isBest = item.well.well_id === bestId
              if (isText || isReference) {
                return (
                  <td key={item.well.well_id} className={isBest ? s.cellBest : undefined}>
                    <span>{formatValue(value, metric.unit)}</span>
                    {isReference && <span className={s.diffNeutral}>Reference</span>}
                  </td>
                )
              }
              const delta = difference(value, refValue, metric.unit)
              let deltaClass = s.diffNeutral
              if (delta !== null && delta !== `0${metric.unit ? ` ${metric.unit}` : ''}`) {
                const positive = delta.startsWith('+')
                if (direction === 'higher-better') deltaClass = positive ? s.diffBetter : s.diffWorse
                else if (direction === 'lower-better') deltaClass = positive ? s.diffWorse : s.diffBetter
              }
              return (
                <td key={item.well.well_id} className={isBest ? s.cellBest : undefined}>
                  <span>{formatValue(value, metric.unit)}</span>
                  {delta !== null && <span className={`${s.difference} ${deltaClass}`}>{delta}</span>}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function WellComparePanel() {
  const data = useWellCompareData()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [referenceId, setReferenceId] = useState('')
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<PlotPoint | null>(null)
  const [hoveredChart, setHoveredChart] = useState<HoverChart>(null)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)

  const hookData = useMemo(() => data.status === 'ready' ? data.wells : [], [data])
  const wells = useMemo(() => {
    if (hookData.length === 0) return hookData
    const ref = hookData[0]
    if (ref === undefined) return hookData
    return [...hookData, ...buildSampleWells(ref)]
  }, [hookData])

  const selected = useVisibleWells(wells, selectedIds, visibility)
  const reference = selected.find((item) => item.well.well_id === referenceId) ?? selected[0] ?? null
  const metrics = useMemo(() => computeMetrics(selected), [selected])
  const allEvents = selected.flatMap((item) => item.events.map((event) => ({ item, event })))
  const eventTypes = [...new Set(allEvents.map(({ event }) => eventType(event)))].sort()

  const totalDepthValue = reference ? totalDepth(reference) : null
  const maxInclination = reference ? reference.trajectory.reduce<number | null>((max, p) =>
    typeof p.inclination === 'number' && Number.isFinite(p.inclination) && (max === null || p.inclination > max) ? p.inclination : max, null) : null
  const maxInclinationMd = reference ? reference.trajectory.reduce<number | null>((bestMd, p) => {
    if (typeof p.inclination !== 'number' || !Number.isFinite(p.inclination)) return bestMd
    if (maxInclination === null || p.inclination < maxInclination) return bestMd
    return p.md
  }, null) : null
  const maxDogleg = reference ? reference.trajectory.reduce<number | null>((max, p) =>
    typeof p.dogleg_severity === 'number' && Number.isFinite(p.dogleg_severity) && (max === null || p.dogleg_severity > max) ? p.dogleg_severity : max, null) : null
  const maxDoglegMd = reference ? reference.trajectory.reduce<number | null>((bestMd, p) => {
    if (typeof p.dogleg_severity !== 'number' || !Number.isFinite(p.dogleg_severity)) return bestMd
    if (maxDogleg === null || p.dogleg_severity < maxDogleg) return bestMd
    return p.md
  }, null) : null
  const tvdAtTd = (() => {
    if (!reference || totalDepthValue === null) return null
    const point = reference.trajectory.slice().reverse().find((p) => typeof p.tvd === 'number' && Number.isFinite(p.tvd))
    return point?.tvd ?? null
  })()
  const horizontalDisplacement = reference
    ? metrics.find((m) => m.key === 'horizontal-displacement')?.values[reference.well.well_id]
    : null
  const summaryTimestamps = reference ? reference.timeseries.flatMap((row) => {
    if (!row.timestamp) return []
    const value = Date.parse(row.timestamp)
    return Number.isFinite(value) ? [{ value, raw: row.timestamp }] : []
  }) : []
  const firstTimestamp = summaryTimestamps.length
    ? summaryTimestamps.reduce((min, t) => t.value < min.value ? t : min).raw : null
  const lastTimestamp = summaryTimestamps.length
    ? summaryTimestamps.reduce((max, t) => t.value > max.value ? t : max).raw : null
  const avgRop = reference ? average(reference.timeseries.map((row) => row.rop)) : null
  const ropZeroPct = reference ? (() => {
    const ropSamples = reference.timeseries.filter((row) => typeof row.rop === 'number' && Number.isFinite(row.rop))
    if (ropSamples.length === 0) return null
    const zeroCount = ropSamples.filter((row) => (row.rop as number) === 0).length
    return (zeroCount / ropSamples.length) * 100
  })() : null
  const activeTime = reference ? durationHours(reference) : null
  const latestEvents = reference ? eventLatest(reference) : []

  const selectedDefaultIds = selectedIds.length ? selectedIds : wells.map((item) => item.well.well_id).slice(0, 4)
  const selectable = wells.filter((item) => selectedDefaultIds.includes(item.well.well_id))
  const chartWells = selectable.filter((item) => visibility[item.well.well_id] !== false)
  const paletteIndex = (wellId: string) => Math.max(0, wells.findIndex((item) => item.well.well_id === wellId)) % WELL_COLORS.length
  const colorFor = (wellId: string) => WELL_COLORS[paletteIndex(wellId)] ?? '#2F7BFF'

  const setChartHover = (chart: HoverChart, point: PlotPoint | null) => {
    setHoveredChart(chart)
    setHoveredPoint(point)
  }
  const toggleWell = (id: string) => {
    setSelectedIds((current) => {
      const active = current.length ? current : wells.map((item) => item.well.well_id).slice(0, 4)
      if (active.includes(id)) return active.filter((wid) => wid !== id)
      return active.length >= 4 ? active : [...active, id]
    })
    setReferenceId((current) => current || id)
  }
  const toggleVisibility = (id: string) => {
    setVisibility((current) => ({ ...current, [id]: current[id] === false }))
  }

  // ── Loading / error / empty guards ───────────────────────────────────────
  if (data.status === 'loading') {
    return (
      <div className={s.skeletonRoot} aria-label='Loading well comparison' aria-busy='true'>
        <div className={s.skeletonKpiRow}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className={s.skeletonCard} />)}
        </div>
        <div className={s.skeletonGrid}>
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={s.skeletonPanel} />)}
        </div>
      </div>
    )
  }
  if (data.status === 'error') {
    return (
      <div className={s.errorRoot} role='alert'>
        <p>{data.error || 'Could not load well comparison data.'}</p>
        <button className={s.retryBtn} type='button' onClick={data.retry}>Retry</button>
      </div>
    )
  }
  if (!wells.length) {
    return <div className={s.emptyPanel}>No wells are available in this dataset.</div>
  }

  // ── Plan-view geometry ────────────────────────────────────────────────────

  function planNiceStep(range: number): number {
    if (range <= 0) return 1
    const raw = range / 5
    const mag = Math.pow(10, Math.floor(Math.log10(raw)))
    const norm = raw / mag
    const step = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10
    return step * mag
  }

  const planWellPoints = chartWells.map((item) => {
    const raw = item.trajectory.flatMap((point) =>
      typeof point.northing === 'number' && Number.isFinite(point.northing) &&
      typeof point.easting === 'number' && Number.isFinite(point.easting)
        ? [{ md: point.md, northing: point.northing, easting: point.easting }]
        : [])
    const empty = { item, points: [] as { relE: number; relN: number; md: number }[] }
    if (raw.length < 2) return empty
    const first = raw[0]
    if (first === undefined) return empty
    const originN = first.northing
    const originE = first.easting
    return { item, points: raw.map((p) => ({ relE: p.easting - originE, relN: p.northing - originN, md: p.md })) }
  })

  const planAllPoints = planWellPoints.flatMap((w) => w.points)
  const planHasData = planAllPoints.length >= 2

  const planRelEMin = planHasData ? Math.min(...planAllPoints.map((p) => p.relE)) : -1
  const planRelEMax = planHasData ? Math.max(...planAllPoints.map((p) => p.relE)) : 1
  const planRelNMin = planHasData ? Math.min(...planAllPoints.map((p) => p.relN)) : -1
  const planRelNMax = planHasData ? Math.max(...planAllPoints.map((p) => p.relN)) : 1
  const planERange = Math.max(planRelEMax - planRelEMin, 1)
  const planNRange = Math.max(planRelNMax - planRelNMin, 1)
  const planDataEMin = planRelEMin - planERange * 0.1
  const planDataEMax = planRelEMax + planERange * 0.1
  const planDataNMin = planRelNMin - planNRange * 0.1
  const planDataNMax = planRelNMax + planNRange * 0.1
  const planDataESpan = planDataEMax - planDataEMin
  const planDataNSpan = planDataNMax - planDataNMin

  const planW = 340; const planH = 300
  const planLeft = 42; const planRight = 10; const planTop = 10; const planBottom = 30
  const planPlotW = planW - planLeft - planRight
  const planPlotH = planH - planTop - planBottom
  const planScale = Math.min(planPlotW / Math.max(planDataESpan, 0.001), planPlotH / Math.max(planDataNSpan, 0.001))
  const planUsedW = planDataESpan * planScale
  const planUsedH = planDataNSpan * planScale
  const planOX = planLeft + (planPlotW - planUsedW) / 2
  const planOY = planTop + (planPlotH - planUsedH) / 2

  const planXY = (relE: number, relN: number) => ({
    x: planOX + (relE - planDataEMin) * planScale,
    y: planOY + (planDataNMax - relN) * planScale,
  })

  function ticksInRange(min: number, max: number, step: number): number[] {
    const result: number[] = []
    const start = Math.ceil(min / step) * step
    for (let v = start; v <= max + step * 0.001; v += step) result.push(Math.round(v))
    return result
  }
  const planETicks = ticksInRange(planDataEMin, planDataEMax, planNiceStep(planDataESpan))
  const planNTicks = ticksInRange(planDataNMin, planDataNMax, planNiceStep(planDataNSpan))
  const planTickLabel = (v: number) => Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v)

  const planScaleCandidates = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
  const planScaleM = planScaleCandidates.reduce((best, m) => {
    const px = m * planScale
    return px <= (planPlotW / 5) * 2 && px > 0 ? m : best
  }, planScaleCandidates[0] ?? 1)
  const planScalePx = planScaleM * planScale
  const planScaleLabel = planScaleM >= 1000 ? `${planScaleM / 1000} km` : `${planScaleM} m`
  const planSbX1 = planOX + 2; const planSbX2 = planSbX1 + planScalePx; const planSbY = planOY + planUsedH + 10
  const planNAX = planOX + planUsedW - 8; const planNAY = planOY + 28

  const planRefPoints = reference
    ? planWellPoints.find((w) => w.item.well.well_id === reference.well.well_id)?.points ?? []
    : []
  const planMaxOffsetEntry = planRefPoints.reduce<{ dist: number; relE: number; relN: number } | null>(
    (best, p) => { const d = Math.hypot(p.relE, p.relN); return best === null || d > best.dist ? { dist: d, relE: p.relE, relN: p.relN } : best }, null)
  const planMaxOffsetM = planMaxOffsetEntry?.dist ?? null
  const planMaxOffsetBearing = planMaxOffsetEntry !== null
    ? ((Math.atan2(planMaxOffsetEntry.relE, planMaxOffsetEntry.relN) * 180) / Math.PI + 360) % 360
    : null
  const planOffsetReadout = planMaxOffsetM !== null && planMaxOffsetBearing !== null
    ? `Max offset: ${formatNumber(planMaxOffsetM)} m at bearing ${formatNumber(planMaxOffsetBearing, 0)}°`
    : 'Max offset: Unavailable'

  // ── ROP vs depth ─────────────────────────────────────────────────────────

  const ropRawAll = chartWells.flatMap((item) =>
    item.timeseries.flatMap((row) =>
      typeof row.md === 'number' && Number.isFinite(row.md) &&
      typeof row.rop === 'number' && Number.isFinite(row.rop) && row.rop >= 0
        ? [{ item, md: row.md, rop: row.rop }]
        : []))

  const ropCapValue = (() => {
    const vals = ropRawAll.map((p) => p.rop).sort((a, b) => a - b)
    if (vals.length === 0) return 1
    const idx = Math.min(vals.length - 1, Math.floor(vals.length * 0.99))
    return Math.max(1, vals[idx] ?? 1)
  })()
  const maxRopMd = Math.max(1, ...ropRawAll.map((p) => p.md))

  const BIN_SIZE = 50
  function ropBins(rows: typeof ropRawAll): { md: number; rop: number }[] {
    if (rows.length === 0) return []
    const maxMd = Math.max(...rows.map((p) => p.md))
    const nBins = Math.ceil(maxMd / BIN_SIZE) + 1
    const sums: number[] = new Array(nBins).fill(0) as number[]
    const counts: number[] = new Array(nBins).fill(0) as number[]
    for (const p of rows) {
      const b = Math.floor(p.md / BIN_SIZE)
      if (b >= 0 && b < nBins) { sums[b] = (sums[b] ?? 0) + p.rop; counts[b] = (counts[b] ?? 0) + 1 }
    }
    const result: { md: number; rop: number }[] = []
    for (let b = 0; b < nBins; b++) {
      const c = counts[b] ?? 0
      if (c > 0) result.push({ md: (b + 0.5) * BIN_SIZE, rop: (sums[b] ?? 0) / c })
    }
    return result
  }

  function median(vals: number[]): number | null {
    if (vals.length === 0) return null
    const sorted = vals.slice().sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 1 ? (sorted[mid] ?? null) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
  }

  const ropWellStats = chartWells.map((item) => {
    const vals = item.timeseries.flatMap((row) =>
      typeof row.rop === 'number' && Number.isFinite(row.rop) && row.rop >= 0 ? [row.rop] : [])
    const mdVals = item.timeseries.flatMap((row) =>
      typeof row.rop === 'number' && Number.isFinite(row.rop) && row.rop >= 0 &&
      typeof row.md === 'number' && Number.isFinite(row.md)
        ? [{ rop: row.rop, md: row.md }] : [])
    if (vals.length === 0) return { item, avg: null, med: null, medOnBottom: null, max: null, maxMd: null }
    const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length
    const med = median(vals)
    const onBottomVals = vals.filter((v) => v > 0)
    const medOnBottom = onBottomVals.length > 0 ? median(onBottomVals) : null
    const maxEntry = mdVals.reduce<{ rop: number; md: number } | null>(
      (best, p) => best === null || p.rop > best.rop ? p : best, null)
    return { item, avg, med, medOnBottom, max: maxEntry?.rop ?? null, maxMd: maxEntry?.md ?? null }
  })

  function ropNiceStep(range: number): number {
    if (range <= 0) return 1
    const raw = range / 5
    const mag = Math.pow(10, Math.floor(Math.log10(raw)))
    const norm = raw / mag
    return (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag
  }
  const ropStep = ropNiceStep(ropCapValue)
  const ropTicks: number[] = []
  for (let v = 0; v <= ropCapValue + ropStep * 0.01; v += ropStep) ropTicks.push(Math.round(v))

  const maxEventCount = Math.max(1, ...eventTypes.flatMap((type) =>
    chartWells.map((item) => item.events.filter((event) => eventType(event) === type).length)))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={s.root} aria-label='Well comparison dashboard'>

      {/* Controls */}
      <div className={s.controls}>
        <label className={s.controlLabel}>
          Wells <span className={s.controlCount}>{selectedDefaultIds.length}/4</span>
          <div className={s.selectMenu}>
            <details>
              <summary className={s.selectSummary}>
                {selectable.length ? selectable.map(fmtWellLabel).join(', ') : 'Select wells'}
              </summary>
              <div className={s.selectOptions}>
                {wells.map((item) => {
                  const active = selectedDefaultIds.includes(item.well.well_id)
                  return (
                    <label key={item.well.well_id} className={s.selectOption}>
                      <input
                        type='checkbox'
                        checked={active}
                        disabled={!active && selectedDefaultIds.length >= 4}
                        onChange={() => toggleWell(item.well.well_id)}
                      />
                      <i style={{ '--wcp-color': colorFor(item.well.well_id) } as CssVars} aria-hidden />
                      {fmtWellLabel(item)}
                    </label>
                  )
                })}
              </div>
            </details>
          </div>
        </label>

        <label className={s.controlLabel}>
          Reference well
          <select
            className={s.controlSelect}
            value={reference?.well.well_id ?? ''}
            onChange={(e) => setReferenceId(e.target.value)}
          >
            {selectable.map((item) => (
              <option key={item.well.well_id} value={item.well.well_id}>{fmtWellLabel(item)}</option>
            ))}
          </select>
        </label>
      </div>

      {hookData.length === 1 && (
        <p className={s.infoBar}>Only one well is available in this dataset. More wells will appear here when added.</p>
      )}

      {/* KPI strip */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard} data-color='blue'>
          <span>Total depth (MD)</span><strong>{formatValue(totalDepthValue, 'm')}</strong>
        </div>
        <div className={s.kpiCard} data-color='teal'>
          <span>Max inclination</span><strong>{formatValue(maxInclination, '°')}</strong>
        </div>
        <div className={s.kpiCard} data-color='purple'>
          <span>Horiz. displacement</span>
          <strong>{formatValue(typeof horizontalDisplacement === 'number' ? horizontalDisplacement : null, 'm')}</strong>
        </div>
        <div className={s.kpiCard} data-color='orange'>
          <span>Avg ROP</span><strong>{formatValue(avgRop, 'm/h')}</strong>
        </div>
        <div className={s.kpiCard} data-color='signal'>
          <span>ROP = 0 (ref well)</span>
          <strong>{ropZeroPct !== null ? `${formatNumber(ropZeroPct, 1)}%` : 'Unavailable'}</strong>
        </div>
        {reference?.timeseries.some((row) => row.timestamp !== null) && (
          <div className={s.kpiCard} data-color='green'>
            <span>Drilling duration</span><strong>{formatValue(activeTime, 'h')}</strong>
          </div>
        )}
        <div className={s.kpiCard} data-color='default'>
          <span>Events</span>
          <strong>{reference ? formatNumber(reference.events.length, 0) : 'Unavailable'}</strong>
        </div>
      </div>

      {/* Row 1: field map · plan view · well summary */}
      <div className={s.gridThree}>
        <div className={s.panel}>
          <PanelHead title='Field map' detail='Satellite imagery · wells with known coordinates' />
          <FieldMap wells={WELL_LOCATIONS} referenceName={reference ? fmtWellLabel(reference) : ''} />
        </div>

        <div className={s.panel}>
          <PanelHead title='Plan view' detail='Northing / easting · local survey coordinates' />
          <p className={s.planOffset}>{planOffsetReadout}</p>
          {planHasData ? (
            <div className={s.chartBox}>
              <svg
                className={s.svg}
                viewBox={`0 0 ${planW} ${planH}`}
                role='img'
                aria-label='Well plan view'
                onMouseLeave={() => setChartHover(null, null)}
              >
                {planETicks.map((v) => {
                  const x = planXY(v, 0).x
                  return <line key={`pgx-${v}`} className={s.gridline} x1={x} x2={x} y1={planOY} y2={planOY + planUsedH} />
                })}
                {planNTicks.map((v) => {
                  const y = planXY(0, v).y
                  return <line key={`pgy-${v}`} className={s.gridline} x1={planOX} x2={planOX + planUsedW} y1={y} y2={y} />
                })}
                {planETicks.map((v) => {
                  const x = planXY(v, 0).x; const axisY = planOY + planUsedH
                  return (
                    <g key={`pet-${v}`}>
                      <line className={s.axisTick} x1={x} x2={x} y1={axisY} y2={axisY + 3} />
                      <text className={s.svgLabel} x={x} y={axisY + 9} textAnchor='middle'>{planTickLabel(v)}</text>
                    </g>
                  )
                })}
                <text className={s.svgLabel} x={planOX + planUsedW / 2} y={planH - 4} textAnchor='middle'>Easting (m)</text>
                {planNTicks.map((v) => {
                  const y = planXY(0, v).y
                  return (
                    <g key={`pnt-${v}`}>
                      <line className={s.axisTick} x1={planOX - 3} x2={planOX} y1={y} y2={y} />
                      <text className={s.svgLabel} x={planOX - 5} y={y + 3} textAnchor='end'>{planTickLabel(v)}</text>
                    </g>
                  )
                })}
                <text className={s.svgLabel} transform={`translate(9 ${planOY + planUsedH / 2}) rotate(-90)`} textAnchor='middle'>Northing (m)</text>
                {planWellPoints.map(({ item, points }) => {
                  if (points.length < 2) return null
                  const svgPts = points.map((p) => planXY(p.relE, p.relN))
                  const pathD = svgPts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ')
                  const head = svgPts[0]; const tail = svgPts[svgPts.length - 1]
                  const isRef = item.well.well_id === reference?.well.well_id
                  if (!head || !tail) return null
                  return (
                    <g key={item.well.well_id} style={{ '--wcp-color': colorFor(item.well.well_id) } as CssVars}>
                      <path className={s.chartLine} d={pathD} opacity={isRef ? 1 : 0.65} />
                      <circle className={s.headMarker} cx={head.x} cy={head.y} r='4'><title>{fmtWellLabel(item)} surface</title></circle>
                      <text className={`${s.svgLabel} ${s.planMarkerLabel}`} x={head.x + 5} y={head.y - 3}>Surface</text>
                      <line className={s.planTd} x1={tail.x - 4} x2={tail.x + 4} y1={tail.y} y2={tail.y} />
                      <line className={s.planTd} x1={tail.x} x2={tail.x} y1={tail.y - 4} y2={tail.y + 4} />
                      <text className={`${s.svgLabel} ${s.planMarkerLabel}`} x={tail.x + 5} y={tail.y + 3}>TD</text>
                      {points.map((p, index) => {
                        const pt = svgPts[index]
                        if (!pt) return null
                        return (
                          <circle
                            key={`${item.well.well_id}-${index}`}
                            className={s.hitPoint}
                            cx={pt.x} cy={pt.y} r='5'
                            onMouseEnter={() => setChartHover('plan', { x: pt.x, y: pt.y, md: p.md, value: Math.hypot(p.relE, p.relN), wellId: item.well.well_id })}
                          />
                        )
                      })}
                    </g>
                  )
                })}
                <line className={s.scaleLine} x1={planSbX1} x2={planSbX2} y1={planSbY} y2={planSbY} />
                <line className={s.scaleLine} x1={planSbX1} x2={planSbX1} y1={planSbY - 4} y2={planSbY + 4} />
                <line className={s.scaleLine} x1={planSbX2} x2={planSbX2} y1={planSbY - 4} y2={planSbY + 4} />
                <text className={s.svgLabel} x={(planSbX1 + planSbX2) / 2} y={planSbY - 5} textAnchor='middle'>{planScaleLabel}</text>
                <line className={s.compassLine} x1={planNAX} x2={planNAX} y1={planNAY} y2={planNAY - 14} />
                <path className={s.compassLine} d={`M${planNAX - 4},${planNAY - 8} L${planNAX},${planNAY - 14} L${planNAX + 4},${planNAY - 8}`} fill='none' />
                <text className={s.svgLabel} x={planNAX} y={planNAY + 8} textAnchor='middle'>N</text>
              </svg>
              {hoveredChart === 'plan' && hoveredPoint && (
                <Tip>{fmtWellLabel(wells.find((w) => w.well.well_id === hoveredPoint.wellId) ?? chartWells[0] as WellCompareSummary)} · offset {formatNumber(hoveredPoint.value)} m</Tip>
              )}
            </div>
          ) : <Empty text='Northing and easting survey coordinates unavailable.' />}
          <WellLegend wells={selectable} colorFor={colorFor} visibility={visibility} onToggle={toggleVisibility} />
        </div>

        <div className={s.panel}>
          <PanelHead title='Well summary' detail={reference ? fmtWellLabel(reference) : 'No reference well'} />
          {reference ? (
            <dl className={s.summaryList}>
              {[
                ['Total depth MD', totalDepthValue !== null ? `${formatNumber(totalDepthValue)} m` : 'Unavailable'],
                ['TVD at TD', tvdAtTd !== null ? `${formatNumber(tvdAtTd)} m` : 'Unavailable'],
                ['Max inclination', maxInclination !== null ? `${formatNumber(maxInclination)}°` : 'Unavailable', maxInclinationMd !== null ? `at ${formatNumber(maxInclinationMd)} m MD` : null],
                ['Max dogleg', maxDogleg !== null ? `${formatNumber(maxDogleg)} °/30 m` : 'Unavailable', maxDoglegMd !== null ? `at ${formatNumber(maxDoglegMd)} m MD` : null],
                ['Horiz. displacement', typeof horizontalDisplacement === 'number' && Number.isFinite(horizontalDisplacement) ? `${formatNumber(horizontalDisplacement)} m` : 'Unavailable'],
                ['First timestamp', firstTimestamp ?? 'Unavailable'],
                ['Last timestamp', lastTimestamp ?? 'Unavailable'],
                ['Drilling duration', activeTime !== null ? `${formatNumber(activeTime)} h` : 'Unavailable'],
                ['Avg ROP', avgRop !== null ? `${formatNumber(avgRop)} m/h` : 'Unavailable'],
                ['Event count', reference.events.length !== null ? formatNumber(reference.events.length, 0) : 'Unavailable'],
              ].map(([label, value, sub]) => (
                <div key={label as string} className={s.summaryRow}>
                  <dt>{label as string}</dt>
                  <dd>{value as string}{sub ? <span className={s.summarySub}>{sub as string}</span> : null}</dd>
                </div>
              ))}
            </dl>
          ) : <Empty text='Select a reference well to see the summary.' />}
        </div>
      </div>

      {/* Row 2: ROP small multiples · ROP ranking · data availability */}
      <div className={s.gridThree}>
        <div className={s.panel}>
          <PanelHead title='ROP vs depth' detail='Measured depth (m) · ROP (m/h) · one row per well' />
          {ropRawAll.length ? (() => {
            const smW = 360; const smRowH = 110
            const smLeft = 38; const smRight = 8; const smTop = 18; const smBottomLast = 22
            const smPlotW = smW - smLeft - smRight
            const smX = (md: number) => smLeft + (md / Math.max(maxRopMd, 1)) * smPlotW
            const smYTicks = ropTicks.filter((_, i, arr) => arr.length <= 3 || i === 0 || i === arr.length - 1 || i === Math.floor((arr.length - 1) / 2))
            const lastIdx = chartWells.length - 1

            return (
              <div className={s.ropSmall} onMouseLeave={() => setChartHover(null, null)}>
                {chartWells.map((item, wellIndex) => {
                  const isLast = wellIndex === lastIdx
                  const smBottomCur = isLast ? smBottomLast : 6
                  const smPlotH = smRowH - smTop - smBottomCur
                  const plotBottom = smTop + smPlotH
                  const smY = (rop: number) => smTop + smPlotH - Math.min(rop / ropCapValue, 1) * smPlotH
                  const wellRaw = item.timeseries.flatMap((row) =>
                    typeof row.md === 'number' && Number.isFinite(row.md) &&
                    typeof row.rop === 'number' && Number.isFinite(row.rop) && row.rop >= 0
                      ? [{ md: row.md, rop: row.rop }] : [])

                  if (wellRaw.length === 0) {
                    return (
                      <div key={item.well.well_id} className={s.ropRow} style={{ '--wcp-color': colorFor(item.well.well_id) } as CssVars}>
                        <svg className={s.svg} viewBox={`0 0 ${smW} ${smRowH}`} aria-hidden='true'>
                          <text x={smLeft} y={smTop - 4} fill={colorFor(item.well.well_id)} fontSize='8' fontWeight='650'>{fmtWellLabel(item)}</text>
                        </svg>
                        <div className={s.ropUnavail}>Unavailable</div>
                      </div>
                    )
                  }

                  const rawPath = wellRaw.map((p, i) => `${i === 0 ? 'M' : 'L'}${smX(p.md).toFixed(1)},${smY(p.rop).toFixed(1)}`).join(' ')
                  const bins = ropBins(wellRaw.map((p) => ({ item, ...p })))
                  const smoothPts = bins.map((p) => ({ x: smX(p.md), y: smY(p.rop) }))
                  const smoothPath = smoothPts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')
                  const firstPt = smoothPts[0]; const lastPt = smoothPts[smoothPts.length - 1]
                  const fillPath = firstPt && lastPt && smoothPath
                    ? `${smoothPath} L${lastPt.x.toFixed(1)},${plotBottom} L${firstPt.x.toFixed(1)},${plotBottom} Z`
                    : ''
                  const statEntry = ropWellStats.find((st) => st.item.well.well_id === item.well.well_id)
                  const maxRopVal = statEntry?.max ?? null
                  const maxRopMdVal = statEntry?.maxMd ?? null
                  const maxExceedsCap = maxRopVal !== null && maxRopVal > ropCapValue
                  const maxDotX = maxRopMdVal !== null ? smX(maxRopMdVal) : null
                  const maxDotY = maxRopVal !== null ? smY(maxRopVal) : null

                  return (
                    <div key={item.well.well_id} className={s.ropRow} style={{ '--wcp-color': colorFor(item.well.well_id) } as CssVars}>
                      <svg className={s.svg} viewBox={`0 0 ${smW} ${smRowH}`} role='img' aria-label={`ROP vs depth for ${fmtWellLabel(item)}`}>
                        <text x={smLeft} y={smTop - 4} fill={colorFor(item.well.well_id)} fontSize='8' fontWeight='650'>{fmtWellLabel(item)}</text>
                        {smYTicks.map((tick) => {
                          const ty = smY(tick)
                          return (
                            <g key={tick}>
                              <line className={s.gridline} x1={smLeft} x2={smLeft + smPlotW} y1={ty} y2={ty} />
                              <text className={s.svgLabel} x={smLeft - 3} y={ty + 3} textAnchor='end'>{tick}</text>
                            </g>
                          )
                        })}
                        {isLast && [0, 0.25, 0.5, 0.75, 1].map((frac) => {
                          const mdVal = maxRopMd * frac; const tx = smX(mdVal)
                          return (
                            <g key={frac}>
                              <line className={s.axisTick} x1={tx} x2={tx} y1={plotBottom} y2={plotBottom + 3} />
                              <text className={s.svgLabel} x={tx} y={plotBottom + 10} textAnchor='middle'>
                                {mdVal >= 1000 ? `${(mdVal / 1000).toFixed(1)}k` : String(Math.round(mdVal))}
                              </text>
                            </g>
                          )
                        })}
                        {isLast && <text className={s.svgLabel} x={smLeft + smPlotW / 2} y={smRowH - 2} textAnchor='middle'>Measured depth (m)</text>}
                        {fillPath && <path className={s.ropFill} d={fillPath} />}
                        {rawPath && <path className={s.ropRawTrace} d={rawPath} />}
                        {smoothPath && <path className={s.ropSmooth} d={smoothPath} />}
                        {maxDotX !== null && maxDotY !== null && maxRopVal !== null && maxRopMdVal !== null && (
                          <g>
                            {maxExceedsCap && (
                              <polygon points={`${maxDotX.toFixed(1)},${smTop + 1} ${(maxDotX - 4).toFixed(1)},${smTop + 8} ${(maxDotX + 4).toFixed(1)},${smTop + 8}`}
                                fill={colorFor(item.well.well_id)} opacity='0.8' />
                            )}
                            <circle className={s.ropMaxDot} cx={maxDotX} cy={maxDotY} r='3' />
                            <text className={s.ropMaxLabel} x={maxDotX + 5} y={maxDotY - 2}>
                              {formatNumber(maxRopVal)} at {formatNumber(maxRopMdVal, 0)} m
                            </text>
                          </g>
                        )}
                        {wellRaw.map((p, index) => {
                          const hx = smX(p.md); const hy = smY(p.rop)
                          return (
                            <circle key={`${item.well.well_id}-${index}`} className={s.hitPoint} cx={hx} cy={hy} r='5'
                              onMouseEnter={() => setChartHover('rop', { x: hx, y: hy, md: p.md, value: p.rop, wellId: item.well.well_id })} />
                          )
                        })}
                      </svg>
                    </div>
                  )
                })}
                {hoveredChart === 'rop' && hoveredPoint && (
                  <Tip>{fmtWellLabel(wells.find((w) => w.well.well_id === hoveredPoint.wellId) ?? chartWells[0] as WellCompareSummary)} · MD {formatNumber(hoveredPoint.md)} m · ROP {formatNumber(hoveredPoint.value)} m/h</Tip>
                )}
              </div>
            )
          })() : <Empty text='No ROP data for selected wells.' />}

          {/* Stats strip */}
          {ropWellStats.some((st) => st.avg !== null) && (
            <div className={s.ropStats}>
              <div className={s.ropStatsRow}>
                <span className={s.ropStatsLabel} />
                <span className={s.ropStatsHead}>Avg</span>
                <span className={s.ropStatsHead}>Median (all)</span>
                <span className={s.ropStatsHead}>Median (on bottom)</span>
                <span className={s.ropStatsHead}>Max</span>
                <span className={s.ropStatsHead}>Max @ MD</span>
              </div>
              {ropWellStats.map(({ item, avg, med, medOnBottom, max, maxMd }) => (
                <div key={item.well.well_id} className={s.ropStatsRow}>
                  <span className={s.ropStatsLabel} style={{ color: colorFor(item.well.well_id) }}>{fmtWellLabel(item)}</span>
                  <span className={avg !== null ? s.ropStatsVal : s.ropStatsNa}>{avg !== null ? `${formatNumber(avg)} m/h` : 'Unavailable'}</span>
                  <span className={med !== null ? s.ropStatsVal : s.ropStatsNa}>{med !== null ? `${formatNumber(med)} m/h` : 'Unavailable'}</span>
                  <span className={medOnBottom !== null ? s.ropStatsVal : s.ropStatsNa}>{medOnBottom !== null ? `${formatNumber(medOnBottom)} m/h` : 'Unavailable'}</span>
                  <span className={max !== null ? s.ropStatsVal : s.ropStatsNa}>{max !== null ? `${formatNumber(max)} m/h` : 'Unavailable'}</span>
                  <span className={maxMd !== null ? s.ropStatsVal : s.ropStatsNa}>{maxMd !== null ? `${formatNumber(maxMd, 0)} m` : 'Unavailable'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={s.panel}>
          <PanelHead title='ROP ranking' detail='Average · median (on bottom) · max · depth intervals · m/h' />
          {(() => {
            const toRows = (getValue: (st: typeof ropWellStats[number]) => number | null): RankRow[] =>
              ropWellStats.map((st) => ({
                id: st.item.well.well_id, label: fmtWellLabel(st.item),
                value: getValue(st), isRef: st.item.well.well_id === reference?.well.well_id,
                color: colorFor(st.item.well.well_id),
              }))

            const intervalRows = (interval: 0 | 1 | 2): RankRow[] =>
              ropWellStats.map((st) => {
                const pts = st.item.timeseries.flatMap((row) =>
                  typeof row.md === 'number' && Number.isFinite(row.md) &&
                  typeof row.rop === 'number' && Number.isFinite(row.rop) && row.rop >= 0
                    ? [{ md: row.md, rop: row.rop }] : [])
                if (pts.length === 0) return { id: st.item.well.well_id, label: fmtWellLabel(st.item), value: null, isRef: st.item.well.well_id === reference?.well.well_id, color: colorFor(st.item.well.well_id) }
                const minMd = Math.min(...pts.map((p) => p.md)); const maxMd = Math.max(...pts.map((p) => p.md))
                const span = maxMd - minMd
                const lo = minMd + span * (interval / 3); const hi = minMd + span * ((interval + 1) / 3)
                const slice = pts.filter((p) => p.md >= lo && p.md < hi)
                if (slice.length === 0) return { id: st.item.well.well_id, label: fmtWellLabel(st.item), value: null, isRef: st.item.well.well_id === reference?.well.well_id, color: colorFor(st.item.well.well_id) }
                return { id: st.item.well.well_id, label: fmtWellLabel(st.item), value: slice.reduce((sum, p) => sum + p.rop, 0) / slice.length, isRef: st.item.well.well_id === reference?.well.well_id, color: colorFor(st.item.well.well_id) }
              })

            const INTERVAL_LABELS = ['Shallow third', 'Middle third', 'Deep third'] as const
            const sortedAvg = toRows((st) => st.avg).slice().sort((a, b) => {
              if (a.value === null && b.value === null) return 0
              if (a.value === null) return 1; if (b.value === null) return -1
              return b.value - a.value
            })
            const avgMax = Math.max(1, ...toRows((st) => st.avg).flatMap((r) => r.value !== null ? [r.value] : []))

            return (
              <div className={s.rank}>
                <p className={s.rankSectionTitle} style={{ marginTop: 0 }}>Average ROP</p>
                {sortedAvg.map((row) => (
                  <div key={row.id} className={s.rankRow} style={{ '--wcp-color': row.color } as CssVars}>
                    <span className={row.isRef ? `${s.rankLabel} ${s.rankLabelRef}` : s.rankLabel}>
                      {row.label}{row.isRef && <span className={s.rankRefTag}>ref</span>}
                    </span>
                    {row.value !== null ? (
                      <>
                        <div className={s.rankTrack}><div className={s.rankBar} style={{ width: `${(row.value / avgMax) * 100}%` }} /></div>
                        <span className={s.rankValue}>{formatNumber(row.value)} m/h</span>
                      </>
                    ) : (
                      <><div className={s.rankTrack} /><span className={`${s.rankValue} ${s.rankNa}`}>Unavailable</span></>
                    )}
                  </div>
                ))}
                <RankSection title='Median ROP (on bottom)' unit='m/h' rows={toRows((st) => st.medOnBottom)} />
                <RankSection title='Max ROP' unit='m/h' rows={toRows((st) => st.max)} />
                <div className={s.rankSection}>
                  <p className={s.rankSectionTitle}>ROP by depth interval</p>
                  {([0, 1, 2] as const).map((interval) => (
                    <div key={interval} className={s.rankIntervalGroup}>
                      <span className={s.rankIntervalLabel}>{INTERVAL_LABELS[interval]}</span>
                      {intervalRows(interval).slice().sort((a, b) => {
                        if (a.value === null && b.value === null) return 0
                        if (a.value === null) return 1; if (b.value === null) return -1
                        return b.value - a.value
                      }).map((row) => {
                        const iMax = Math.max(1, ...intervalRows(interval).flatMap((r) => r.value !== null ? [r.value] : []))
                        return (
                          <div key={row.id} className={s.rankRow} style={{ '--wcp-color': row.color } as CssVars}>
                            <span className={row.isRef ? `${s.rankLabel} ${s.rankLabelRef}` : s.rankLabel}>
                              {row.label}{row.isRef && <span className={s.rankRefTag}>ref</span>}
                            </span>
                            {row.value !== null ? (
                              <>
                                <div className={s.rankTrack}><div className={s.rankBar} style={{ width: `${(row.value / iMax) * 100}%` }} /></div>
                                <span className={s.rankValue}>{formatNumber(row.value)} m/h</span>
                              </>
                            ) : (
                              <><div className={s.rankTrack} /><span className={`${s.rankValue} ${s.rankNa}`}>Unavailable</span></>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        <div className={s.panel}>
          <PanelHead title='Data availability' detail='Sample coverage by channel' />
          {chartWells.length ? (() => {
            const activeChannels = (CHANNEL_COLUMNS as readonly ColEntry[]).filter((col) =>
              chartWells.some((item) => item.timeseries.some((row) => {
                const v = (row as unknown as Record<string, unknown>)[col.key]
                return typeof v === 'number' && Number.isFinite(v)
              })))
            if (!activeChannels.length) return <Empty text='No channel data available for selected wells.' />

            type CellData = { populated: number; total: number; percentage: number | null; hasAny: boolean }
            const cellData: Record<string, Record<string, CellData>> = {}
            for (const item of chartWells) {
              cellData[item.well.well_id] = {}
              const total = item.timeseries.length
              for (const channel of activeChannels) {
                const populated = item.timeseries.reduce((count, row) => {
                  const v = (row as unknown as Record<string, unknown>)[channel.key]
                  return count + (typeof v === 'number' && Number.isFinite(v) ? 1 : 0)
                }, 0)
                const hasAny = total > 0 && populated > 0
                const pct = total > 0 ? (populated / total) * 100 : null
                const wc = cellData[item.well.well_id]
                if (wc) wc[channel.key] = { populated, total, percentage: pct, hasAny }
              }
            }

            const overallPct: Record<string, number | null> = {}
            for (const item of chartWells) {
              const pcts = activeChannels.flatMap((ch) => {
                const d = cellData[item.well.well_id]?.[ch.key]
                return d?.hasAny && d.percentage !== null ? [d.percentage] : []
              })
              overallPct[item.well.well_id] = pcts.length > 0 ? pcts.reduce((sum, v) => sum + v, 0) / pcts.length : null
            }

            const fillClass = (d: CellData) => {
              if (!d.hasAny) return s.heatNone
              if (d.percentage !== null && d.percentage >= 80) return s.heatHigh
              if (d.percentage !== null && d.percentage >= 40) return s.heatMid
              return s.heatLow
            }
            const fmtCount = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)} k` : String(n)

            return (
              <div className={s.heatScroll}>
                <table className={s.heatmap}>
                  <thead><tr><th>Channel</th>{chartWells.map((item) => <th key={item.well.well_id}>{fmtWellLabel(item)}</th>)}</tr></thead>
                  <tbody>
                    {activeChannels.map((channel) => (
                      <tr key={channel.key}>
                        <th scope='row'>{channel.label}</th>
                        {chartWells.map((item) => {
                          const d = cellData[item.well.well_id]?.[channel.key]
                          const cellKey = `${item.well.well_id}:${channel.key}`
                          if (!d?.hasAny) return <td key={cellKey}><span className={`${s.heatCell} ${s.heatNone}`}>Unavailable</span></td>
                          return (
                            <td key={cellKey}>
                              <button type='button' className={`${s.heatCell} ${fillClass(d)}`}
                                onClick={() => setSelectedChannel(selectedChannel === cellKey ? null : cellKey)}
                                title={`Source column: ${channel.source}`}>
                                {d.percentage !== null ? `${formatNumber(d.percentage, 0)}%` : 'Unavailable'}
                                <span className={s.heatCount}>{fmtCount(d.populated)} samples</span>
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr className={s.heatOverall}>
                      <th scope='row'>Overall</th>
                      {chartWells.map((item) => {
                        const pct = overallPct[item.well.well_id] ?? null
                        const fc = pct === null ? s.heatNone : pct >= 80 ? s.heatHigh : pct >= 40 ? s.heatMid : s.heatLow
                        return (
                          <td key={item.well.well_id}>
                            {pct !== null
                              ? <span className={`${s.heatCell} ${fc}`}>{formatNumber(pct, 0)}%</span>
                              : <span className={`${s.heatCell} ${s.heatNone}`}>Unavailable</span>}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })() : <Empty text='Select at least one well to inspect channel availability.' />}
          {selectedChannel && (
            <p className={s.sourceNote}>Source column: <code>{(CHANNEL_COLUMNS as readonly ColEntry[]).find((col) => selectedChannel.endsWith(`:${col.key}`))?.source ?? 'Unavailable'}</code></p>
          )}
        </div>
      </div>

      {/* Row 3: comparison table · events */}
      <div className={s.gridTwo}>
        <div className={`${s.panel} ${s.spanWide}`}>
          <PanelHead title='Well comparison' detail={reference ? `Delta vs ${fmtWellLabel(reference)}` : 'Reference unavailable'} />
          <div className={s.tableScroll}>
            <table className={s.compTable}>
              <thead>
                <tr>
                  <th scope='col'>Metric</th>
                  {selected.map((item) => (
                    <th scope='col' key={item.well.well_id}>
                      {fmtWellLabel(item)}
                      {item.well.well_id === reference?.well.well_id && <span className={s.referenceTag}>Reference</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((group) => (
                  <FragmentGroup
                    key={group} group={group} metrics={metrics} selected={selected}
                    reference={reference} expandedMetric={expandedMetric} setExpandedMetric={setExpandedMetric}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${s.panel} ${s.spanNarrow}`}>
          <PanelHead title='Events' detail='Count by type · latest reference events' />
          {eventTypes.length ? (
            <div className={s.eventChart} onMouseLeave={() => setChartHover(null, null)}>
              {eventTypes.map((type) => (
                <div key={type} className={s.eventRow}>
                  <span className={s.eventType}>{type}</span>
                  <div className={s.eventBars}>
                    {chartWells.map((item) => {
                      const count = item.events.filter((event) => eventType(event) === type).length
                      return (
                        <span key={item.well.well_id} className={s.eventBarLine}
                          onMouseEnter={() => setChartHover('events', { x: 0, y: 0, md: count, value: count, wellId: item.well.well_id })}>
                          <i style={{ '--wcp-color': colorFor(item.well.well_id), width: `${(count / maxEventCount) * 100}%` } as CssVars} />
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
              {hoveredChart === 'events' && hoveredPoint && (
                <Tip>{fmtWellLabel(wells.find((w) => w.well.well_id === hoveredPoint.wellId) ?? chartWells[0] as WellCompareSummary)} · {formatNumber(hoveredPoint.value, 0)} events</Tip>
              )}
              <WellLegend wells={selectable} colorFor={colorFor} visibility={visibility} onToggle={toggleVisibility} />
            </div>
          ) : <Empty text='No events recorded for selected wells.' />}
          <div className={s.latestList}>
            <span className={s.latestTitle}>Latest events · {reference ? fmtWellLabel(reference) : 'Unavailable'}</span>
            {latestEvents.length ? latestEvents.map((event) => (
              <div key={event.event_id} className={s.latestEvent}>
                <span>{eventType(event)}</span>
                <time>{event.start_time ?? 'Unavailable'}</time>
                <small>{event.start_md === null ? 'Unavailable' : `${formatNumber(event.start_md, 0)} m MD`}</small>
              </div>
            )) : <p className={s.emptyInline}>No events recorded for this well.</p>}
          </div>
        </div>
      </div>

      <p className={s.footNote}>Heuristic decision-support indicator, not a validated safety system. Reported values only — missing values are shown as unavailable.</p>
    </div>
  )
}
