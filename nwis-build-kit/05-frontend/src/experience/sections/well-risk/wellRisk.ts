export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'
export type RiskFactorId = 'depth' | 'incident' | 'geometry' | 'dynamics' | 'control'

export interface RiskFactor {
  id: RiskFactorId
  label: string
  score: number
  weight: number
  detail: string
  inputs: string[]
}

export interface RiskBin {
  md: number
  tvd: number | null
  rop: number | null
  wob: number | null
  rpm: number | null
  hookload: number | null
  standpipe_pressure: number | null
  pit_volume: number | null
  pump_rate: number | null
}

export interface RiskTrajectoryPoint {
  md: number
  tvd?: number | null
  northing?: number | null
  easting?: number | null
  inclination: number | null
  dogleg_severity: number | null
}

export interface RiskEvent {
  event_type: string
  end_md: number | null
  severity: string | null
  npt_hours: number | null
}

export interface RiskProfilePoint {
  md: number
  score: number
  level: RiskLevel
  factors: RiskFactor[]
}

export interface IntervalAssessment {
  mdFrom: number
  mdTo: number
  tvdFrom: number | null
  tvdTo: number | null
  level: RiskLevel | null
  peakScore: number | null
  meanScore: number | null
  factorScores: Record<RiskFactorId, number | null>
  events: Array<{ title: string; type: string; md: number }>
  inclination: { min: number | null; max: number | null }
  doglegSeverity: { min: number | null; max: number | null }
  averages: {
    rop: number | null
    wob: number | null
    rpm: number | null
    hookload: number | null
    pump_rate: number | null
    standpipe_pressure: number | null
  }
  notScored: string[]
}

// All thresholds and weights are centralised here for domain-expert tuning.
interface RiskConfig {
  levels: { moderate: number; high: number; critical: number }
  depth: { weight: number; curveStart: number; safe: number; danger: number }
  incident: { weight: number; radiusMetres: number; severity: { low: number; medium: number; high: number }; nptCapHours: number; dangerPoints: number; defaultPoints: number }
  geometry: { weight: number; dogleg: { safe: number; danger: number }; inclination: { safe: number; danger: number }; subWeights: { dogleg: number; inclination: number } }
  dynamics: { weight: number; rollingRadiusBins: number; deviation: { safeZ: number; dangerZ: number }; pitGain: { safe: number; danger: number }; subWeights: { rop: number; wob: number; hookload: number; standpipe_pressure: number; pit: number } }
  control: { weight: number; imbalance: { safe: number; danger: number }; gas: { safe: number; danger: number }; h2s: { safe: number; danger: number }; ecdGap: { safe: number; danger: number }; subWeights: { flow: number; gas: number; h2s: number; ecd: number } }
  smoothingRadiusBins: number
}

export const RISK_CONFIG: RiskConfig = {
  levels: { moderate: 25, high: 50, critical: 75 },
  depth: { weight: 0.15, curveStart: 0.7, safe: 0, danger: 1 },
  incident: {
    weight: 0.3,
    radiusMetres: 150,
    severity: { low: 1, medium: 2, high: 4 },
    nptCapHours: 24,
    dangerPoints: 8,
    defaultPoints: 1,
  },
  geometry: {
    weight: 0.2,
    dogleg: { safe: 0, danger: 12 },
    inclination: { safe: 20, danger: 90 },
    subWeights: { dogleg: 0.65, inclination: 0.35 },
  },
  dynamics: {
    weight: 0.25,
    rollingRadiusBins: 15,
    deviation: { safeZ: 1, dangerZ: 3.5 },
    pitGain: { safe: 0, danger: 5 },
    subWeights: { rop: 0.2, wob: 0.2, hookload: 0.2, standpipe_pressure: 0.2, pit: 0.2 },
  },
  control: {
    weight: 0.1,
    imbalance: { safe: 2, danger: 20 },
    gas: { safe: 0, danger: 500 },
    h2s: { safe: 0, danger: 10 },
    ecdGap: { safe: 0, danger: 1.5 },
    subWeights: { flow: 0.25, gas: 0.25, h2s: 0.25, ecd: 0.25 },
  },
  smoothingRadiusBins: 2,
}

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value))
const finite = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value)
const interpolate = (value: number, safe: number, danger: number): number =>
  danger <= safe ? (value >= danger ? 100 : 0) : clamp(((value - safe) / (danger - safe)) * 100)
const mean = (values: Array<number | null>): number | null => {
  const valid = values.filter(finite)
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null
}
const levelFor = (score: number): RiskLevel => {
  if (score >= RISK_CONFIG.levels.critical) return 'critical'
  if (score >= RISK_CONFIG.levels.high) return 'high'
  if (score >= RISK_CONFIG.levels.moderate) return 'moderate'
  return 'low'
}

function nearest<T extends { md: number }>(items: T[], md: number): T | null {
  let closest: T | null = null
  let distance = Number.POSITIVE_INFINITY
  for (const item of items) {
    const nextDistance = Math.abs(item.md - md)
    if (nextDistance < distance) { closest = item; distance = nextDistance }
  }
  return closest
}

interface ControlSignals {
  flow_in: number | null
  flow_out: number | null
  gas_total: number | null
  h2s: number | null
  ecd: number | null
  mud_weight: number | null
}

function calculatePoint(
  bin: RiskBin,
  index: number,
  bins: RiskBin[],
  trajectory: RiskTrajectoryPoint[],
  events: RiskEvent[],
  td: number,
  control: Partial<ControlSignals> | undefined,
): RiskProfilePoint {
  const factors: RiskFactor[] = []
  const depthFraction = td > 0 ? clamp(bin.md / td, 0, 1) : null
  if (depthFraction !== null) {
    const curveStart = RISK_CONFIG.depth.curveStart
    const curved = depthFraction <= curveStart
      ? depthFraction * 0.45 / curveStart
      : 0.45 + ((depthFraction - curveStart) / (1 - curveStart)) * 0.55
    factors.push({
      id: 'depth', label: 'Depth exposure',
      score: Math.round(interpolate(curved, RISK_CONFIG.depth.safe, RISK_CONFIG.depth.danger) * 100) / 100,
      weight: RISK_CONFIG.depth.weight,
      detail: `At ${Math.round(depthFraction * 100)}% of planned depth; the final 30% carries greater exposure.`,
      inputs: [`Measured depth: ${Math.round(bin.md)} m`, `Total depth: ${Math.round(td)} m`],
    })
  }

  const nearby = events
    .filter((event) => finite(event.end_md) && Math.abs(event.end_md - bin.md) <= RISK_CONFIG.incident.radiusMetres)
    .map((event) => ({ event, distance: Math.abs((event.end_md ?? bin.md) - bin.md) }))
    .sort((a, b) => a.distance - b.distance)
  if (events.length) {
    const points = nearby.reduce((sum, item) => {
      const severity = item.event.severity?.toLowerCase() ?? ''
      const severityWeight = severity.includes('high') || severity.includes('critical')
        ? RISK_CONFIG.incident.severity.high
        : severity.includes('medium') ? RISK_CONFIG.incident.severity.medium : RISK_CONFIG.incident.severity.low
      const hours = finite(item.event.npt_hours) ? clamp(item.event.npt_hours, 0, RISK_CONFIG.incident.nptCapHours) : 0
      return sum + severityWeight * (1 + hours / RISK_CONFIG.incident.nptCapHours)
    }, 0)
    const score = interpolate(points, 0, RISK_CONFIG.incident.dangerPoints)
    const closest = nearby[0]
    const detail = closest
      ? `${closest.event.event_type} recorded ${Math.round(closest.distance)} m away.`
      : 'No recorded events within 150 m of this depth.'
    const inputs = closest
      ? [`${nearby.length} nearby event${nearby.length === 1 ? '' : 's'}`, `Closest severity: ${closest.event.severity ?? 'not reported'}`, `Lost time: ${finite(closest.event.npt_hours) ? `${closest.event.npt_hours} h` : 'not reported'}`]
      : ['No events within 150 m']
    factors.push({ id: 'incident', label: 'Incident history', score: Math.round(score * 100) / 100, weight: RISK_CONFIG.incident.weight, detail, inputs })
  }

  const survey = nearest(trajectory, bin.md)
  if (survey && Math.abs(survey.md - bin.md) <= RISK_CONFIG.incident.radiusMetres) {
    const dogleg = finite(survey.dogleg_severity)
      ? interpolate(survey.dogleg_severity, RISK_CONFIG.geometry.dogleg.safe, RISK_CONFIG.geometry.dogleg.danger)
      : null
    const inclination = finite(survey.inclination)
      ? interpolate(survey.inclination, RISK_CONFIG.geometry.inclination.safe, RISK_CONFIG.geometry.inclination.danger)
      : null
    const geometryParts: Array<{ score: number; weight: number }> = []
    if (dogleg !== null) geometryParts.push({ score: dogleg, weight: RISK_CONFIG.geometry.subWeights.dogleg })
    if (inclination !== null) geometryParts.push({ score: inclination, weight: RISK_CONFIG.geometry.subWeights.inclination })
    if (geometryParts.length) {
      const total = geometryParts.reduce((sum, part) => sum + part.weight, 0)
      const score = geometryParts.reduce((sum, part) => sum + part.score * part.weight, 0) / total
      factors.push({
        id: 'geometry', label: 'Hole geometry', score: Math.round(score * 100) / 100, weight: RISK_CONFIG.geometry.weight,
        detail: 'Survey geometry combines dogleg severity and inclination near this depth.',
        inputs: [`Dogleg severity: ${finite(survey.dogleg_severity) ? survey.dogleg_severity : 'not reported'}`, `Inclination: ${finite(survey.inclination) ? `${survey.inclination}°` : 'not reported'}`],
      })
    }
  }

  const radius = RISK_CONFIG.dynamics.rollingRadiusBins
  const window = bins.slice(Math.max(0, index - radius), Math.min(bins.length, index + radius + 1))
  const prior = bins.slice(Math.max(0, index - radius), index)
  const deviationParts = [
    { key: 'rop', label: 'ROP', value: bin.rop, values: window.map((item) => item.rop) },
    { key: 'wob', label: 'WOB', value: bin.wob, values: window.map((item) => item.wob) },
    { key: 'hookload', label: 'Hookload', value: bin.hookload, values: window.map((item) => item.hookload) },
    { key: 'standpipe_pressure', label: 'Standpipe pressure', value: bin.standpipe_pressure, values: window.map((item) => item.standpipe_pressure) },
  ]
  const dynamicParts = deviationParts.map((part) => {
    const baseline = mean(part.values)
    const spread = mean(part.values.map((value) => finite(value) && finite(baseline) ? Math.abs(value - baseline) : null))
    const current = finite(part.value) && finite(baseline) && finite(spread)
      ? interpolate(spread === 0 ? 0 : Math.abs(part.value - baseline) / spread, RISK_CONFIG.dynamics.deviation.safeZ, RISK_CONFIG.dynamics.deviation.dangerZ)
      : null
    return { ...part, score: current, baseline }
  }).filter((part): part is typeof part & { score: number } => part.score !== null)
  const pitBase = mean(prior.slice(-Math.max(1, radius)).map((item) => item.pit_volume))
  const pitScore = finite(bin.pit_volume) && finite(pitBase)
    ? interpolate(Math.max(0, bin.pit_volume - pitBase), RISK_CONFIG.dynamics.pitGain.safe, RISK_CONFIG.dynamics.pitGain.danger)
    : null
  const allDynamic = [
    ...dynamicParts.map((part) => ({ score: part.score ?? 0, weight: RISK_CONFIG.dynamics.subWeights[part.key as keyof typeof RISK_CONFIG.dynamics.subWeights] })),
    ...(pitScore === null ? [] : [{ score: pitScore, weight: RISK_CONFIG.dynamics.subWeights.pit }]),
  ]
  if (allDynamic.length) {
    const total = allDynamic.reduce((sum, part) => sum + part.weight, 0)
    const score = allDynamic.reduce((sum, part) => sum + part.score * part.weight, 0) / total
    factors.push({
      id: 'dynamics', label: 'Drilling dynamics', score: Math.round(score * 100) / 100, weight: RISK_CONFIG.dynamics.weight,
      detail: 'Change from the local rolling pattern, including sudden pit-volume gain.',
      inputs: [
        ...dynamicParts.map((part) => `${part.label}: ${part.value ?? 'not reported'} (local mean ${part.baseline?.toFixed(2) ?? 'not available'})`),
        `Pit-volume gain: ${finite(bin.pit_volume) && finite(pitBase) ? `${(bin.pit_volume - pitBase).toFixed(2)}` : 'not available'}`,
      ],
    })
  }

  if (control && Object.values(control).some((value) => finite(value))) {
    const flow = finite(control.flow_in) && finite(control.flow_out)
      ? interpolate(Math.max(0, control.flow_out - control.flow_in) / Math.max(Math.abs(control.flow_in), 1) * 100, RISK_CONFIG.control.imbalance.safe, RISK_CONFIG.control.imbalance.danger)
      : null
    const gas = finite(control.gas_total) ? interpolate(control.gas_total, RISK_CONFIG.control.gas.safe, RISK_CONFIG.control.gas.danger) : null
    const h2s = finite(control.h2s) ? interpolate(control.h2s, RISK_CONFIG.control.h2s.safe, RISK_CONFIG.control.h2s.danger) : null
    const ecd = finite(control.ecd) && finite(control.mud_weight)
      ? interpolate(Math.abs(control.ecd - control.mud_weight), RISK_CONFIG.control.ecdGap.safe, RISK_CONFIG.control.ecdGap.danger)
      : null
    const signals = [
      { id: 'flow', label: 'Flow balance', score: flow, weight: RISK_CONFIG.control.subWeights.flow },
      { id: 'gas', label: 'Gas', score: gas, weight: RISK_CONFIG.control.subWeights.gas },
      { id: 'h2s', label: 'H2S', score: h2s, weight: RISK_CONFIG.control.subWeights.h2s },
      { id: 'ecd', label: 'ECD margin', score: ecd, weight: RISK_CONFIG.control.subWeights.ecd },
    ].filter((signal): signal is typeof signal & { score: number } => signal.score !== null)
    if (signals.length) {
      const total = signals.reduce((sum, signal) => sum + signal.weight, 0)
      const score = signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / total
      factors.push({ id: 'control', label: 'Well-control signals', score: Math.round(score * 100) / 100, weight: RISK_CONFIG.control.weight, detail: 'Available well-control sensor channels at this depth.', inputs: signals.map((signal) => `${signal.label}: ${signal.score.toFixed(0)} risk points`) })
    }
  }

  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0)
  const score = totalWeight > 0 ? Math.round(clamp(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / totalWeight)) : 0
  return { md: bin.md, score, level: levelFor(score), factors }
}

// Heuristic decision-support indicator, not a validated safety system.
export function computeRiskProfile(
  bins: RiskBin[],
  trajectory: RiskTrajectoryPoint[],
  events: RiskEvent[],
  td: number,
  control?: Partial<ControlSignals>,
): RiskProfilePoint[] {
  if (!bins.length) return []
  const ordered = bins.filter((bin) => finite(bin.md)).slice().sort((a, b) => a.md - b.md)
  const raw = ordered.map((bin, index) => calculatePoint(bin, index, ordered, trajectory, events, td, control))
  const radius = RISK_CONFIG.smoothingRadiusBins
  return raw.map((point, index) => {
    const nearby = raw.slice(Math.max(0, index - radius), Math.min(raw.length, index + radius + 1))
    const score = Math.round(nearby.reduce((sum, item) => sum + item.score, 0) / nearby.length)
    return { ...point, score, level: levelFor(score) }
  })
}

function finiteMean(values: Array<number | null>): number | null {
  const valid = values.filter(finite)
  if (!valid.length) return null
  const result = valid.reduce((sum, value) => sum + value, 0) / valid.length
  return Number.isFinite(result) ? result : null
}

function finiteRange(values: Array<number | null>): { min: number | null; max: number | null } {
  const valid = values.filter(finite)
  if (!valid.length) return { min: null, max: null }
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : { min: null, max: null }
}

export function assessInterval(
  mdFrom: number,
  mdTo: number,
  bins: RiskBin[],
  trajectory: RiskTrajectoryPoint[],
  events: RiskEvent[],
  profile: RiskProfilePoint[],
): IntervalAssessment {
  const from = Math.min(mdFrom, mdTo)
  const to = Math.max(mdFrom, mdTo)
  const intervalBins = bins.filter((bin) => finite(bin.md) && bin.md >= from && bin.md <= to)
  const intervalTrajectory = trajectory.filter((point) => finite(point.md) && point.md >= from && point.md <= to)
  const intervalProfile = profile.filter((point) => finite(point.md) && point.md >= from && point.md <= to && finite(point.score))
  const riskValues = intervalProfile.map((point) => point.score)
  const peakScore = riskValues.length ? Math.max(...riskValues) : null
  const meanScore = finiteMean(riskValues)
  const levelPoint = intervalProfile.reduce<RiskProfilePoint | null>((best, point) =>
    !best || point.score > best.score ? point : best, null)
  const factorIds: RiskFactorId[] = ['depth', 'incident', 'geometry', 'dynamics', 'control']
  const factorScores = Object.fromEntries(factorIds.map((id) => {
    const scores = intervalProfile.flatMap((point) => {
      const factor = point.factors.find((c) => c.id === id)
      return factor && finite(factor.score) ? [factor.score] : []
    })
    return [id, finiteMean(scores)]
  })) as Record<RiskFactorId, number | null>
  const scoredLabels: Record<RiskFactorId, string> = {
    depth: 'Depth exposure', incident: 'Incident history', geometry: 'Hole geometry',
    dynamics: 'Drilling dynamics', control: 'Well-control signals',
  }
  const notScored = factorIds.filter((id) => factorScores[id] === null).map((id) => scoredLabels[id])
  const intervalEvents = events.flatMap((event) =>
    finite(event.end_md) && event.end_md >= from && event.end_md <= to
      ? [{ title: event.event_type, type: event.event_type, md: event.end_md }]
      : [],
  )
  const tvdValues = intervalTrajectory.map((point) => point.tvd ?? null)
  const tvdRange = finiteRange(tvdValues)
  const safeScore = (value: number | null): number | null => finite(value) ? value : null
  return {
    mdFrom: from, mdTo: to,
    tvdFrom: tvdRange.min, tvdTo: tvdRange.max,
    level: levelPoint?.level ?? null,
    peakScore: safeScore(peakScore), meanScore: safeScore(meanScore),
    factorScores, events: intervalEvents,
    inclination: finiteRange(intervalTrajectory.map((point) => point.inclination)),
    doglegSeverity: finiteRange(intervalTrajectory.map((point) => point.dogleg_severity)),
    averages: {
      rop: finiteMean(intervalBins.map((bin) => bin.rop)),
      wob: finiteMean(intervalBins.map((bin) => bin.wob)),
      rpm: finiteMean(intervalBins.map((bin) => bin.rpm)),
      hookload: finiteMean(intervalBins.map((bin) => bin.hookload)),
      pump_rate: finiteMean(intervalBins.map((bin) => bin.pump_rate)),
      standpipe_pressure: finiteMean(intervalBins.map((bin) => bin.standpipe_pressure)),
    },
    notScored,
  }
}

export function riskAt(profile: RiskProfilePoint[], md: number): RiskProfilePoint | null {
  if (!profile.length || !Number.isFinite(md)) return null
  let low = 0
  let high = profile.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    const candidate = profile[middle]
    if (!candidate) return null
    if (candidate.md < md) low = middle + 1
    else high = middle
  }
  const selected = profile[low]
  if (!selected) return null
  if (low === 0 || selected.md === md) return selected
  const previous = profile[low - 1]
  if (!previous) return selected
  return Math.abs(previous.md - md) <= Math.abs(selected.md - md) ? previous : selected
}
