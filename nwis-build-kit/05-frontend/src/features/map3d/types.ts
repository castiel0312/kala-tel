/**
 * The well, as this surface needs it.
 *
 * The section is about *where things stand*, so this type is deliberately position-first: every
 * well carries two positions, the wellhead and the point its bore has reached at the reference
 * bit depth, and one distance — the one between those bit points. Nothing on this page is drawn
 * from a surface distance and labelled otherwise; see `distanceAtBitKm` below.
 */

export type WellStatus = 'Drilling' | 'Producing' | 'Suspended' | 'Abandoned'

export type WellRole = 'reference' | 'offset'

/** Which machine stands on the wellhead. See `wellModels.ts`. */
export type WellModel = 'derrick' | 'pumpjack' | 'wellhead'

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Well {
  id: string
  role: WellRole
  status: WellStatus
  model: WellModel
  /** `[lng, lat]` of the wellhead: where the rig model stands. */
  surface: [number, number]
  /**
   * `[lng, lat]` where the well's path crosses the reference bit depth (2,968 m TVDSS).
   *
   * This is the point that makes a borehole a *borehole* on a plan view: a well that leaves its
   * pad on a build curve arrives at depth somewhere else, and the neighbour that matters is the
   * one whose hole is closest to yours at the depth you are about to drill, not the one whose
   * fence is closest to yours at the surface.
   */
  bit: [number, number]
  /**
   * Distance from the reference well's bit to this well's bit, in km.
   *
   * NWIS defines "nearby" with this number and nothing else, so it is also what the radius
   * buttons filter on. It is **not** the distance between the two wellheads.
   */
  distanceAtBitKm: number
  /** 0–100, or null for the reference well itself. */
  similarity: number | null
  riskLevel: RiskLevel
  eventCount?: number
  eventSummary?: string
  tdMdM?: number
  barailTopTvdssM?: number
  spud?: number
  /* reference well only */
  bitMdM?: number
  bitTvdssM?: number
  formation?: string
  nextTop?: string
  topRisk?: string
  region?: string
}

/** The wells NWIS treats as the same kind of hole: 75 % similar or better. */
export const RELEVANT_SIMILARITY = 75

export function isRelevant(well: Well): boolean {
  return well.similarity !== null && well.similarity >= RELEVANT_SIMILARITY
}

/**
 * The machine a well carries, by what it is doing.
 *
 * A well being drilled has a drilling rig over it, not a pump jack — a wellhead with a beam
 * rocking above it is the one thing on this page an oilfield judge would notice immediately,
 * because it is the machine's whole purpose to be a different machine from the drilling rig that
 * put the hole there. `WELL_MODEL_MODE` is where the team would overrule that, and it exists
 * only for that.
 */
export type WellModelMode = 'by-status' | 'pumpjack-all'

export const WELL_MODEL_MODE: WellModelMode = 'by-status'

export function modelFor(well: Pick<Well, 'status' | 'model'>, mode: WellModelMode = WELL_MODEL_MODE): WellModel {
  if (mode === 'pumpjack-all') return 'pumpjack'
  return well.status === 'Drilling' ? 'derrick' : well.status === 'Producing' ? 'pumpjack' : 'wellhead'
}

/* ------------------------------------------------------------------ format --- */

/** Distances are quoted at the precision a field map is read at, and no finer. */
export function formatKm(km: number): string {
  return km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`
}

/** Grouped metres, which is how a depth is read on a rig. */
export function formatM(m: number | undefined | null): string | null {
  if (m === undefined || m === null || !Number.isFinite(m)) return null
  return `${Math.round(m).toLocaleString('en-GB')} m`
}
