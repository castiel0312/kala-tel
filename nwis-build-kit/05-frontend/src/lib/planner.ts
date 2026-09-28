/**
 * The potential-well planner's data model.
 *
 * The section is built on one rule, and every type here exists to make that rule enforceable in
 * types rather than in a comment: **the language model proposes, the deterministic layer
 * disposes.** A candidate location is a *geological argument* (where the rock is worth
 * penetrating) sitting next to a *set of hard spatial constraints* (the radius the reader asked
 * for, minimum spacing to a bore that already exists, the depth the offsets actually reached).
 *
 * So a {@link LlmCandidate} is what came back from Groq — untrusted, in the sense that its
 * coordinates are offsets in kilometres that nobody has checked yet. A {@link ScreenedCandidate}
 * is that same proposal after {@link screenCandidate} has measured it against the real wellfield
 * and attached numbers the page computed itself. The UI only ever renders the second, and every
 * rejected proposal is kept in {@link Screening.rejected} rather than dropped, because "the model
 * proposed this and NWIS refused it, for this reason" is the most useful thing on the panel.
 *
 * Nothing in this file invents a value. Distances, spacing and formation agreement are computed
 * from the coordinates the API returned for the existing wells.
 */

import type { HistoricalEvent, OffsetWell, RiskSummary } from '../api/types'
import { kmDistance, type Km } from './geo'

/* ------------------------------------------------------------------ the brief */

/** Everything the model is allowed to know, assembled from API responses by the section. */
export interface PlanningBrief {
  field: string
  activeWellId: string
  /** The active well's own position, in km from the deployment origin. */
  activeSurfaceKm: Km
  activeTdMdM: number
  currentFormation: string
  /** Formation tops on the active well, TVDSS metres, as the API reports them. */
  formationTopsTvdssM: Record<string, number>
  /** The historical wells inside the radius, exactly as `/offsets` returned them. */
  offsets: OffsetWell[]
  /** Events the offsets logged, used so a citation points at a real occurrence. */
  events: HistoricalEvent[]
  risks: RiskSummary[]
  radiusKm: number
  /** Closest approach NWIS will allow to a bore that already exists. */
  minSpacingKm: number
  /** How many candidates to ask for. */
  candidateCount: number
}

/* --------------------------------------------------------- what the model returns */

/** A proposal, exactly as the model wrote it. Nothing here has been measured. */
export interface LlmCandidate {
  /** Short well name, e.g. "OIL-WELL-105". */
  name: string
  /** Kilometres east / north of the deployment origin — the same frame as `surfaceKm`. */
  eastKm: number
  northKm: number
  targetFormation: string
  wellType: string
  targetTdM: number
  /** 0–100. The model's own stated confidence in the location. */
  confidence: number
  /** One paragraph: why this ground. */
  rationale: string
  /** Ids of the offset wells the argument leans on. Verified against the brief on arrival. */
  citedWells: string[]
  riskOutlook: string
  /** Percentage contributions to `confidence`, summing to 100. */
  confidenceFactors: { factor: string; weight: number; note: string }[]
  /** How the well should be drilled, as ordered steps. */
  drillPlan: { step: string; detail: string }[]
  /** What the model could not establish. Shown as prominently as the claims. */
  caveats: string[]
}

/* ------------------------------------------------------------- what the page shows */

/** Why a proposal did not survive. `rejected` is a result, not an error. */
export type RejectionReason =
  | 'OUTSIDE_RADIUS'
  | 'SPACING_CONFLICT'
  | 'TOO_SHALLOW'
  | 'UNPARSEABLE'
  | 'DUPLICATE'

export interface Rejection {
  name: string
  reason: RejectionReason
  /** Written for a drilling engineer, not a developer. */
  detail: string
  eastKm: number | null
  northKm: number | null
}

/** A proposal that passed screening, with every number on it measured by the page. */
export interface ScreenedCandidate {
  id: string
  name: string
  eastKm: number
  northKm: number
  targetFormation: string
  wellType: string
  targetTdM: number
  confidence: number
  rationale: string
  citedWells: OffsetWell[]
  riskOutlook: string
  confidenceFactors: { factor: string; weight: number; note: string }[]
  drillPlan: { step: string; detail: string }[]
  caveats: string[]
  /** The existing bore closest to this one, by the page's own measurement. */
  nearestWell: { id: string; distanceKm: number; similarity: number; hasLossEvents: boolean } | null
  /** Second-nearest, so a candidate wedged between two wells is visible as such. */
  secondNearestWell: { id: string; distanceKm: number } | null
  /** Distance from the active well being drilled. */
  distanceFromActiveKm: number
  /**
   * Depth below the target that no offset reached. A proposal deeper than the deepest offset is
   * rejected outright, so on a survivor this is the interval the archive leaves unconstrained.
   */
  unconstrainedDepthM: number
  /** Cids the model claimed that were not in the brief, so the panel can say so. */
  uncitedClaims: string[]
}

export interface Screening {
  accepted: ScreenedCandidate[]
  rejected: Rejection[]
}

/* ------------------------------------------------------------------ the screening */

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)
/** Same guard for a percentage the model states on a 0-100 scale. */
const clamp100 = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0)

/** A value the model produced, or `null` when it produced something that is not a number. */
function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN
  return Number.isFinite(n) ? n : null
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
}

function factorList(v: unknown): { factor: string; weight: number; note: string }[] {
  if (!Array.isArray(v)) return []
  return v
    .map((f) => {
      const o = (f ?? {}) as Record<string, unknown>
      const weight = clamp01(num(o.weight) ?? 0)
      return { factor: str(o.factor, 'unnamed driver'), weight, note: str(o.note) }
    })
    .filter((f) => f.factor.length > 0)
}

function planList(v: unknown): { step: string; detail: string }[] {
  if (!Array.isArray(v)) return []
  return v
    .map((s) => {
      if (typeof s === 'string') return { step: s, detail: '' }
      const o = (s ?? {}) as Record<string, unknown>
      return { step: str(o.step), detail: str(o.detail) }
    })
    .filter((s) => s.step.length > 0)
}

/**
 * Reads the model's reply.
 *
 * A model asked for JSON will sometimes wrap it, sometimes fence it, and sometimes apologise in
 * prose and then produce the JSON anyway. This unwraps the first balanced object it can find and
 * hands back `null` rather than throwing, so a bad reply becomes a rejected candidate in the UI
 * instead of an exception that takes the section down.
 */
export function parseCandidates(raw: string): LlmCandidate[] {
  const text = raw.trim()
  const start = text.indexOf('{')
  if (start < 0) return []
  let depth = 0
  let inString = false
  let escaped = false
  let end = -1
  for (let i = start; i < text.length; i += 1) {
    const c = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (c === '\\') {
      escaped = true
      continue
    }
    if (c === '"') inString = !inString
    if (inString) continue
    if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end < 0) return []
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { candidates?: unknown }
    const list = Array.isArray(parsed.candidates) ? parsed.candidates : []
    return list.map((c) => {
      const o = (c ?? {}) as Record<string, unknown>
      return {
        name: str(o.name, 'unnamed candidate'),
        eastKm: num(o.eastKm) ?? Number.NaN,
        northKm: num(o.northKm) ?? Number.NaN,
        targetFormation: str(o.targetFormation, 'unspecified'),
        wellType: str(o.wellType, 'Development'),
        targetTdM: num(o.targetTdM) ?? 0,
        // 0-100, so it must not go through clamp01: that saturates anything >= 1 to 1, which turned
    // every real model confidence (e.g. 45) into a flat 100.
    confidence: clamp100(num(o.confidence) ?? 0),
        rationale: str(o.rationale),
        citedWells: strList(o.citedWells),
        riskOutlook: str(o.riskOutlook),
        confidenceFactors: factorList(o.confidenceFactors),
        drillPlan: planList(o.drillPlan),
        caveats: Array.isArray(o.caveats) ? strList(o.caveats) : [],
      }
    })
  } catch {
    return []
  }
}

/** The two existing wells nearest a point, ordered. The page measures this; the model never does. */
function nearestWells(point: Km, offsets: OffsetWell[]) {
  const ranked = offsets
    .map((w) => ({ w, d: kmDistance(point, w.surfaceKm) }))
    .sort((a, b) => a.d - b.d)
  const first = ranked[0]
  const second = ranked[1]
  return {
    nearest: first ? { id: first.w.id, distanceKm: first.d, well: first.w } : null,
    second: second ? { id: second.w.id, distanceKm: second.d } : null,
  }
}

/**
 * Applies NWIS's own rules to a model proposal.
 *
 * Four rejections, each with a stated reason:
 *  - the point falls outside the radius the reader selected;
 *  - the point crowds an existing bore closer than the minimum spacing;
 *  - the target is deeper than the deepest offset in reach, so there is no evidence under it;
 *  - it is a repeat of a point already accepted.
 *
 * Everything that survives comes back with the distance to the nearest and second-nearest bore
 * recomputed from the API's coordinates, so the number on the map is a measurement and not a
 * number the model chose.
 */
export function screenCandidate(
  c: LlmCandidate,
  brief: PlanningBrief,
  seen: ReadonlySet<string>,
): ScreenedCandidate | Rejection {
  if (!Number.isFinite(c.eastKm) || !Number.isFinite(c.northKm)) {
    return {
      name: c.name,
      reason: 'UNPARSEABLE',
      detail: 'The model returned no usable coordinates, so there is nothing to place on the map.',
      eastKm: null,
      northKm: null,
    }
  }

  const point: Km = [c.eastKm, c.northKm]
  const { nearest, second } = nearestWells(point, brief.offsets)

  const fromActive = kmDistance(point, brief.activeSurfaceKm)
  if (fromActive > brief.radiusKm) {
    return {
      name: c.name,
      reason: 'OUTSIDE_RADIUS',
      detail: `${fromActive.toFixed(2)} km from ${brief.activeWellId}, outside the ${brief.radiusKm} km search radius.`,
      eastKm: c.eastKm,
      northKm: c.northKm,
    }
  }

  if (nearest && nearest.distanceKm < brief.minSpacingKm) {
    return {
      name: c.name,
      reason: 'SPACING_CONFLICT',
      detail: `Only ${nearest.distanceKm.toFixed(2)} km from the existing bore ${nearest.id}, inside the ${brief.minSpacingKm} km minimum spacing.`,
      eastKm: c.eastKm,
      northKm: c.northKm,
    }
  }

  const deepestOffset = brief.offsets.reduce((max, w) => Math.max(max, w.tdMdM), 0)
  if (c.targetTdM > deepestOffset) {
    return {
      name: c.name,
      reason: 'TOO_SHALLOW',
      detail: `Target of ${Math.round(c.targetTdM).toLocaleString('en-IN')} m is below the deepest offset in reach (${Math.round(deepestOffset).toLocaleString('en-IN')} m), so nothing in the archive constrains it.`,
      eastKm: c.eastKm,
      northKm: c.northKm,
    }
  }

  const key = `${c.eastKm.toFixed(3)}:${c.northKm.toFixed(3)}`
  if (seen.has(key)) {
    return {
      name: c.name,
      reason: 'DUPLICATE',
      detail: 'A second proposal for ground already on the shortlist.',
      eastKm: c.eastKm,
      northKm: c.northKm,
    }
  }

  const byId = new Map(brief.offsets.map((w) => [w.id, w] as const))
  const cited = c.citedWells.map((id) => byId.get(id)).filter((w): w is OffsetWell => Boolean(w))
  const uncited = c.citedWells.filter((id) => !byId.has(id))

  return {
    id: c.name,
    name: c.name,
    eastKm: c.eastKm,
    northKm: c.northKm,
    targetFormation: c.targetFormation,
    wellType: c.wellType,
    targetTdM: c.targetTdM,
    confidence: c.confidence,
    rationale: c.rationale,
    citedWells: cited,
    riskOutlook: c.riskOutlook,
    confidenceFactors: c.confidenceFactors,
    drillPlan: c.drillPlan,
    caveats: c.caveats,
    nearestWell: nearest
      ? {
          id: nearest.id,
          distanceKm: nearest.distanceKm,
          similarity: nearest.well.similarity,
          hasLossEvents: nearest.well.hasLossEvents,
        }
      : null,
    secondNearestWell: second,
    distanceFromActiveKm: fromActive,
    unconstrainedDepthM: Math.max(0, deepestOffset - c.targetTdM),
    uncitedClaims: uncited,
  }
}

/** Screens a whole reply. Order is preserved; the section ranks by confidence afterwards. */
export function screenAll(candidates: LlmCandidate[], brief: PlanningBrief): Screening {
  const accepted: ScreenedCandidate[] = []
  const rejected: Rejection[] = []
  const seen = new Set<string>()

  for (const c of candidates) {
    const outcome = screenCandidate(c, brief, seen)
    if ('reason' in outcome) {
      rejected.push(outcome)
      continue
    }
    seen.add(`${outcome.eastKm.toFixed(3)}:${outcome.northKm.toFixed(3)}`)
    accepted.push(outcome)
  }

  accepted.sort((a, b) => b.confidence - a.confidence)
  return { accepted, rejected }
}

/* --------------------------------------------------------------- the evidence packet */

/**
 * Renders the brief as the compact text block the model reads.
 *
 * Deliberately plain: no prose, no invitation to be creative. The model is being used as a
 * ranking function over a table of measurements, and the prompt in `groq.ts` says so. Every line
 * here is a value the API returned, so a citation in the answer can be checked against this text
 * and the section drops any that cannot be.
 */
export function briefAsText(brief: PlanningBrief): string {
  const lines: string[] = []
  lines.push(`FIELD: ${brief.field}`)
  lines.push(`ACTIVE WELL: ${brief.activeWellId}`)
  lines.push(`ACTIVE WELL POSITION: east ${brief.activeSurfaceKm[0].toFixed(2)} km, north ${brief.activeSurfaceKm[1].toFixed(2)} km`)
  lines.push(`ACTIVE WELL TD: ${Math.round(brief.activeTdMdM).toLocaleString('en-IN')} m MD`)
  lines.push(`CURRENT FORMATION: ${brief.currentFormation}`)
  lines.push(`SEARCH RADIUS: ${brief.radiusKm} km from the active well`)
  lines.push(`MINIMUM SPACING FROM AN EXISTING BORE: ${brief.minSpacingKm} km`)

  lines.push('')
  lines.push('FORMATION TOPS ON THE ACTIVE WELL (TVDSS m):')
  for (const [name, tvdss] of Object.entries(brief.formationTopsTvdssM).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${name}: ${Math.round(tvdss).toLocaleString('en-IN')} m`)
  }

  lines.push('')
  lines.push(`EXISTING WELLS IN RANGE (${brief.offsets.length}): id | east km | north km | similarity % | TD m MD | Barail top TVDSS m | loss events | risk | status`)
  for (const w of brief.offsets) {
    lines.push(
      `  ${w.id} | ${w.surfaceKm[0].toFixed(2)} | ${w.surfaceKm[1].toFixed(2)} | ${w.similarity} | ${Math.round(w.tdMdM).toLocaleString('en-IN')} | ${
        w.barailTopTvdssM === null ? 'not reported' : Math.round(w.barailTopTvdssM).toLocaleString('en-IN')
      } | ${w.hasLossEvents ? 'yes' : 'no'} | ${w.risk} | ${w.status}`,
    )
  }

  if (brief.risks.length) {
    lines.push('')
    lines.push('PREDICTIVE RISK ON THE ACTIVE WELL:')
    for (const r of brief.risks) {
      lines.push(`  ${r.name}: ${r.probability}% (${r.level}) over ${r.windowMdM[0]}-${r.windowMdM[1]} m MD, ${r.confidence}% confidence. ${r.evidenceSummary}`)
    }
  }

  if (brief.events.length) {
    lines.push('')
    lines.push(`EVENTS LOGGED BY THE OFFSETS (${brief.events.length} of the most relevant):`)
    for (const e of brief.events.slice(0, 24)) {
      lines.push(`  ${e.wellId} | ${e.type} | ${e.formation} | ${Math.round(e.mdM).toLocaleString('en-IN')} m | ${e.title} | cause: ${e.cause} | outcome: ${e.outcome}`)
    }
  }

  return lines.join('\n')
}
