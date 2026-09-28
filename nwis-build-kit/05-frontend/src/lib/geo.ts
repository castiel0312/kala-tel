/**
 * Spatial engine for NWIS.
 *
 * Everything here is derived from values the API already returns. Two kinds of derivation:
 *
 *  1. **Projection** — the API describes well positions as kilometre offsets from a local origin
 *     (`surfaceKm`, `bitDepthKm`). Mapbox GL and deck.gl need `[lng, lat]`, so the offsets go
 *     through a local tangent plane around `ORIGIN` (Upper Assam). The origin is a *rendering*
 *     constant, not data: the API carries no absolute position. Override it per deployment with
 *     `VITE_NWIS_ORIGIN_LNG` / `VITE_NWIS_ORIGIN_LAT`.
 *
 *  2. **Subsurface geometry** — the API returns two anchor points per well (surface and bit) and
 *     a Barail top TVDSS per well. Plan-view well paths are the minimum-curvature build-and-hold
 *     curve between those two anchors; the Barail structure surface is an inverse-distance
 *     interpolation of the per-well tops, contoured with marching squares. Both are geometric
 *     reconstructions, marked `DERIVED` in the legends, and are what a real survey/interpreter
 *     feed would replace — the components consuming them take plain data props, so swapping in
 *     real surveys changes this file only.
 */

/** Metres per degree at the origin latitude (WGS84 local tangent plane). */
const M_PER_DEG_LAT = 110574
const M_PER_DEG_LNG = 111320

export const ORIGIN = {
  lng: Number(import.meta.env?.VITE_NWIS_ORIGIN_LNG ?? 95.3),
  lat: Number(import.meta.env?.VITE_NWIS_ORIGIN_LAT ?? 27.35),
} as const

const LNG_PER_KM = 1000 / (M_PER_DEG_LNG * Math.cos((ORIGIN.lat * Math.PI) / 180))
const LAT_PER_KM = 1000 / M_PER_DEG_LAT

export type Km = readonly [east: number, north: number]
export type LngLat = readonly [lng: number, lat: number]
export type LngLatAlt = [lng: number, lat: number, alt: number]

/** Kilometre offsets → `[lng, lat]`. */
export function kmToLngLat(km: Km | number[] | undefined): [number, number] {
  const [east = 0, north = 0] = km ?? [0, 0]
  return [ORIGIN.lng + east * LNG_PER_KM, ORIGIN.lat + north * LAT_PER_KM]
}

/** `[lng, lat]` → kilometre offsets, the inverse of {@link kmToLngLat}. */
export function lngLatToKm(lngLat: LngLat): Km {
  return [(lngLat[0] - ORIGIN.lng) / LNG_PER_KM, (lngLat[1] - ORIGIN.lat) / LAT_PER_KM]
}

export function kmDistance(a: Km | number[], b: Km | number[]): number {
  const dx = (a[0] ?? 0) - (b[0] ?? 0)
  const dy = (a[1] ?? 0) - (b[1] ?? 0)
  return Math.hypot(dx, dy)
}

/** Circular ring of `segments` vertices at `radiusKm` around a centre. */
export function ringKm(centre: Km, radiusKm: number, segments = 96): number[][] {
  const out: number[][] = []
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2
    out.push([centre[0] + Math.cos(a) * radiusKm, centre[1] + Math.sin(a) * radiusKm])
  }
  return out
}

export const ringToLngLat = (ring: number[][]): [number, number][] =>
  ring.map(([e, n]) => kmToLngLat([e, n] as Km))

/* ------------------------------------------------------------------ trajectories */

export interface PathPoint {
  /** Fraction along the path, 0 at the wellhead, 1 at TD. */
  t: number
  mdM: number
  tvdssM: number
  km: Km
}

export interface PathOptions {
  tdMdM: number
  /** `MD − TVDSS` at TD from the API; sets how far the hole is off vertical at the bottom. */
  mdMinusTvdssM?: number | null
  samples?: number
  /** Share of the plan-view path spent building inclination before the hold. */
  buildFraction?: number
}

/**
 * Plan-view well path: a build section that leaves the wellhead at an angle, curves, then holds
 * a constant azimuth to the bit. Both endpoints are the API's `surfaceKm` and `bitDepthKm`, and
 * the arc length is mapped onto MD so the path is readable as a real survey.
 */
export function wellPath(surface: Km | number[], bit: Km | number[], opts: PathOptions): PathPoint[] {
  const samples = opts.samples ?? 48
  const td = Math.max(1, opts.tdMdM)
  const s: Km = [surface[0] ?? 0, surface[1] ?? 0]
  const b: Km = [bit[0] ?? 0, bit[1] ?? 0]
  const dx = b[0] - s[0]
  const dy = b[1] - s[1]
  const span = Math.hypot(dx, dy)

  // Vertical hold: the hole is `mdMinusTvdss` metres off vertical at TD.
  const inclineRatio = Math.max(0, Math.min(0.85, (opts.mdMinusTvdssM ?? 0) / td))

  if (span < 0.02) {
    // Vertical hole: no plan-view movement, so the path is a single point per depth step.
    return Array.from({ length: samples + 1 }, (_, i) => {
      const t = i / samples
      return point(t, s)
    })
  }

  const f = Math.max(0.15, Math.min(0.6, opts.buildFraction ?? 0.4))
  const ux = dx / span
  const uy = dy / span
  const px = -uy
  const py = ux

  // Kick-off point: the end of the build section, offset laterally from the straight line so the
  // path reads as a curve rather than a corner.
  const kx = s[0] + ux * span * f * 0.55 + px * span * 0.17
  const ky = s[1] + uy * span * f * 0.55 + py * span * 0.17

  // Bézier control points: leave the wellhead heading away from the pad, arrive along the hold.
  const c1: Km = [s[0] + ux * span * 0.06 + px * span * 0.1, s[1] + uy * span * 0.06 + py * span * 0.1]
  const holdX = b[0] - kx
  const holdY = b[1] - ky
  const holdLen = Math.hypot(holdX, holdY) || 1
  const c2: Km = [kx - (holdX / holdLen) * span * 0.22, ky - (holdY / holdLen) * span * 0.22]

  const buildSamples = Math.max(8, Math.round(samples * f))
  const km: Km[] = []
  for (let i = 0; i <= buildSamples; i += 1) {
    const u = i / buildSamples
    const v = 1 - u
    km.push([
      v * v * v * s[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * kx,
      v * v * v * s[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * ky,
    ])
  }
  const holdSamples = samples - buildSamples
  for (let i = 1; i <= holdSamples; i += 1) {
    const u = i / holdSamples
    km.push([kx + holdX * u, ky + holdY * u])
  }

  return km.map((p, i) => point(i / (km.length - 1), p))

  function point(t: number, p: Km): PathPoint {
    const md = t * td
    return { t, mdM: md, tvdssM: md - md * inclineRatio, km: [p[0], p[1]] }
  }
}

/**
 * Extends a path past its last point, along the final hold direction.
 *
 * Nothing in the API describes the hole below the bit, but every drilling display
 * has to show the look-ahead window, so the window is projected along the last
 * survey direction using the MD→TVDSS slope of the last real segment. This is a
 * projection, not a survey: anything drawn from it is labelled DERIVED.
 */
export function extendPath(path: PathPoint[], extraM: number, stepM = 12): PathPoint[] {
  if (path.length < 2 || extraM <= 0) return path
  const last = path[path.length - 1]!
  const prev = path[path.length - 2]!
  const dkm: Km = [last.km[0] - prev.km[0], last.km[1] - prev.km[1]]
  const dmd = last.mdM - prev.mdM
  const dTvd = last.tvdssM - prev.tvdssM
  if (dmd <= 0) return path
  const ux = dkm[0] / dmd
  const uy = dkm[1] / dmd
  const slope = dTvd / dmd
  const out = path.slice()
  for (let d = stepM; d <= extraM + 0.001; d += stepM) {
    const md = last.mdM + Math.min(d, extraM)
    out.push({
      t: 1 + (md - last.mdM) / (last.mdM || 1),
      mdM: md,
      tvdssM: last.tvdssM + (md - last.mdM) * slope,
      km: [last.km[0] + ux * (md - last.mdM), last.km[1] + uy * (md - last.mdM)] as Km,
    })
  }
  return out
}

/** The plan position of a well at a given TVDSS, read off its path. */
export function positionAtTvdss(path: PathPoint[], tvdssM: number): Km | null {
  if (path.length === 0) return null
  const deepest = path[path.length - 1]!
  if (tvdssM <= 0) return path[0]?.km ?? null
  if (tvdssM >= deepest.tvdssM) return deepest.km
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1]!
    const c = path[i]!
    if (c.tvdssM >= tvdssM) {
      const span = c.tvdssM - a.tvdssM || 1
      const u = (tvdssM - a.tvdssM) / span
      return [a.km[0] + (c.km[0] - a.km[0]) * u, a.km[1] + (c.km[1] - a.km[1]) * u]
    }
  }
  return deepest.km
}

/** Path → deck.gl `PathLayer` geometry, flat in 2D or with depth in 3D. */
export function pathToLngLat(path: PathPoint[]): [number, number][] {
  return path.map((p) => kmToLngLat(p.km))
}

/** Path → deck.gl 3D geometry. `alt` is metres below the surface plane, exaggerated for legibility. */
export function pathToLngLatAlt(path: PathPoint[], exaggeration: number): LngLatAlt[] {
  return path.map((p) => {
    const [lng, lat] = kmToLngLat(p.km)
    return [lng, lat, -p.tvdssM * exaggeration]
  })
}

/* ------------------------------------------------------- structure surface + contours */

export interface DepthPoint {
  km: Km
  /** TVDSS of the surface at this location, e.g. the Barail top. */
  tvdssM: number
}

export interface DepthField {
  /** Grid origin and step, in kilometres. */
  originKm: Km
  stepKm: number
  cols: number
  rows: number
  /** Row-major TVDSS values. */
  values: Float64Array
  minM: number
  maxM: number
}

function idw(points: DepthPoint[], x: number, y: number, power = 3): number {
  let num = 0
  let den = 0
  let nearest = points[0]
  let nearestD = Infinity
  for (const p of points) {
    const d = Math.hypot(p.km[0] - x, p.km[1] - y)
    // Power 3 with a tight clamp: the surface passes through the real well tops (which is what a
    // structure contour has to do) while staying smooth between them.
    const w = 1 / Math.pow(Math.max(d, 0.03), power)
    num += w * p.tvdssM
    den += w
    if (d < nearestD) {
      nearestD = d
      nearest = p
    }
  }
  if (!Number.isFinite(num) || den === 0) return nearest?.tvdssM ?? 0
  // Past the control points the weighted mean degenerates towards a flat mean, so blend to the
  // nearest top: the surface keeps dipping away from the data instead of levelling off.
  if (nearestD > 7 && nearest) {
    const blend = Math.min(1, (nearestD - 7) / 7)
    return (num / den) * (1 - blend) + nearest.tvdssM * blend
  }
  return num / den
}

/** Samples the per-well tops onto a regular grid, so they can be contoured. */
export function depthField(
  points: DepthPoint[],
  bounds: { minKm: Km; maxKm: Km },
  resolution = 56,
): DepthField {
  const cols = resolution
  const rows = resolution
  // The grid is square-celled: one step for both axes, over a box grown to the larger span.
  // Every consumer (`sampleField`, `bandCells`, `contours`) walks X and Y with the same
  // increment, so a non-square box would silently misplace contours and the target band.
  const spanX = Math.abs(bounds.maxKm[0] - bounds.minKm[0])
  const spanY = Math.abs(bounds.maxKm[1] - bounds.minKm[1])
  const step = Math.max(spanX, spanY) / (resolution - 1) || 0.1
  const half = (step * (resolution - 1)) / 2
  const cx = (bounds.minKm[0] + bounds.maxKm[0]) / 2
  const cy = (bounds.minKm[1] + bounds.maxKm[1]) / 2
  const origin: Km = [cx - half, cy - half]
  const values = new Float64Array(cols * rows)
  let min = Infinity
  let max = -Infinity
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = origin[0] + c * step
      const y = origin[1] + r * step
      const v = idw(points, x, y)
      values[r * cols + c] = v
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  return {
    originKm: origin,
    stepKm: step,
    cols,
    rows,
    values,
    minM: min,
    maxM: max,
  }
}

export function sampleField(field: DepthField, xKm: number, yKm: number): number {
  const c = (xKm - field.originKm[0]) / field.stepKm
  const r = (yKm - field.originKm[1]) / field.stepKm
  const c0 = Math.max(0, Math.min(field.cols - 2, Math.floor(c)))
  const r0 = Math.max(0, Math.min(field.rows - 2, Math.floor(r)))
  const fu = Math.max(0, Math.min(1, c - c0))
  const fv = Math.max(0, Math.min(1, r - r0))
  const at = (rr: number, cc: number) => field.values[rr * field.cols + cc] ?? 0
  const a = at(r0, c0) * (1 - fu) + at(r0, c0 + 1) * fu
  const b = at(r0 + 1, c0) * (1 - fu) + at(r0 + 1, c0 + 1) * fu
  return a * (1 - fv) + b * fv
}

/** Nice contour interval for a field spanning `span` metres. */
export function contourStep(span: number): number {
  const target = span / 7
  const steps = [2, 5, 10, 20, 25, 50, 100, 200]
  return steps.find((s) => s >= target) ?? 200
}

/**
 * Marching squares. Returns stitched polylines, so a contour draws as one continuous line
 * instead of a cloud of segments.
 */
export function contours(field: DepthField, level: number): number[][][] {
  const segs: [number, number, number, number][] = []
  const cross = (
    ax: number,
    ay: number,
    av: number,
    bx: number,
    by: number,
    bv: number,
  ): [number, number] | null => {
    if ((av < level) === (bv < level)) return null
    const t = (level - av) / (bv - av)
    return [ax + (bx - ax) * t, ay + (by - ay) * t]
  }

  for (let r = 0; r < field.rows - 1; r += 1) {
    for (let c = 0; c < field.cols - 1; c += 1) {
      const x0 = field.originKm[0] + c * field.stepKm
      const y0 = field.originKm[1] + r * field.stepKm
      const x1 = x0 + field.stepKm
      const y1 = y0 + field.stepKm
      const v00 = field.values[r * field.cols + c] ?? 0
      const v10 = field.values[r * field.cols + c + 1] ?? 0
      const v11 = field.values[(r + 1) * field.cols + c + 1] ?? 0
      const v01 = field.values[(r + 1) * field.cols + c] ?? 0
      const idx = (v00 < level ? 1 : 0) | (v10 < level ? 2 : 0) | (v11 < level ? 4 : 0) | (v01 < level ? 8 : 0)
      if (idx === 0 || idx === 15) continue
      const top = cross(x0, y0, v00, x1, y0, v10)
      const right = cross(x1, y0, v10, x1, y1, v11)
      const bottom = cross(x0, y1, v01, x1, y1, v11)
      const left = cross(x0, y0, v00, x0, y1, v01)
      const push = (a: [number, number], b: [number, number]) => segs.push([a[0], a[1], b[0], b[1]])
      switch (idx) {
        case 1:
        case 14:
          if (left && top) push(left, top)
          break
        case 2:
        case 13:
          if (top && right) push(top, right)
          break
        case 3:
        case 12:
          if (left && right) push(left, right)
          break
        case 4:
        case 11:
          if (right && bottom) push(right, bottom)
          break
        case 6:
        case 9:
          if (top && bottom) push(top, bottom)
          break
        case 7:
        case 8:
          if (left && bottom) push(left, bottom)
          break
        case 5:
          if (left && top && right && bottom) {
            push(left, top)
            push(right, bottom)
          }
          break
        case 10:
          if (top && right && left && bottom) {
            push(top, right)
            push(left, bottom)
          }
          break
        default:
          break
      }
    }
  }
  return stitch(segs)
}

function stitch(segs: [number, number, number, number][]): number[][][] {
  const key = (x: number, y: number) => `${Math.round(x * 1e4)}:${Math.round(y * 1e4)}`
  const edgeId = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const pts = new Map<string, [number, number]>()
  const adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (a === b) return
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }
  for (const [ax, ay, bx, by] of segs) {
    pts.set(key(ax, ay), [ax, ay])
    pts.set(key(bx, by), [bx, by])
    link(key(ax, ay), key(bx, by))
  }

  // Shared cell edges recompute identical crossing points, so the chain joins are exact, and each
  // undirected segment is consumed once: no breaks in a contour, no doubled-back polylines.
  const used = new Set<string>()
  const lines: number[][][] = []
  for (const [start, neighbours] of adj) {
    for (const first of neighbours) {
      if (used.has(edgeId(start, first))) continue
      const chain: string[] = [start]
      let prev = start
      let cur = first
      for (;;) {
        used.add(edgeId(prev, cur))
        chain.push(cur)
        const next = [...(adj.get(cur) ?? [])].find((k) => k !== prev && !used.has(edgeId(cur, k)))
        if (!next) break
        prev = cur
        cur = next
      }
      if (chain.length > 2) lines.push(chain.map((k) => pts.get(k)!))
    }
  }
  return lines
}

/**
 * Filled band between two levels, as grid cells that straddle the interval, each grown slightly
 * so the seams do not show. Contour lines carry the boundary; this is the fill behind them.
 */
export function bandCells(
  field: DepthField,
  fromM: number,
  toM: number,
  grow = 0.06,
): { shape: [number, number][]; midM: number }[] {
  const out: { shape: [number, number][]; midM: number }[] = []
  const g = 1 + grow
  for (let r = 0; r < field.rows - 1; r += 1) {
    for (let c = 0; c < field.cols - 1; c += 1) {
      const x0 = field.originKm[0] + c * field.stepKm
      const y0 = field.originKm[1] + r * field.stepKm
      const w = field.stepKm
      const cx = x0 + w / 2
      const cy = y0 + w / 2
      const v = field.values[r * field.cols + c] ?? 0
      const v2 = field.values[(r + 1) * field.cols + c + 1] ?? v
      const mid = (v + v2) / 2
      if (mid < fromM || mid > toM) continue
      out.push({
        shape: [
          [cx - (w * g) / 2, cy - (w * g) / 2],
          [cx + (w * g) / 2, cy - (w * g) / 2],
          [cx + (w * g) / 2, cy + (w * g) / 2],
          [cx - (w * g) / 2, cy + (w * g) / 2],
          [cx - (w * g) / 2, cy - (w * g) / 2],
        ] as [number, number][],
        midM: mid,
      })
    }
  }
  return out
}

export interface ContourLine {
  /** Kilometre coordinates, one `[east, north]` pair per vertex. */
  path: [number, number][]
  level: number
  /** Index contours are drawn heavier, the way a structure map is read. */
  thickness: number
}

/** Contour lines of a field, ready for a deck.gl `PathLayer`. */
export function contourLines(field: DepthField, fromM: number, toM: number, stepM: number): ContourLine[] {
  const out: ContourLine[] = []
  const index = stepM * 5
  for (let level = Math.ceil(fromM / stepM) * stepM; level <= toM; level += stepM) {
    for (const line of contours(field, level)) {
      out.push({ path: line as [number, number][], level, thickness: Math.abs(level % index) < 1e-6 ? 2 : 1 })
    }
  }
  return out
}

/** Contour lines converted to `[lng, lat]` for a deck.gl `PathLayer`. */
export function contourLinesLngLat(field: DepthField, fromM: number, toM: number, stepM: number): ContourLine[] {
  return contourLines(field, fromM, toM, stepM).map((c) => ({
    ...c,
    path: c.path.map(([x, y]) => kmToLngLat([x, y])),
  }))
}

/** Contour lines draped on the structure surface, for 3D. */
export function contourLines3d(
  field: DepthField,
  fromM: number,
  toM: number,
  stepM: number,
  exaggeration: number,
): { path: LngLatAlt[]; level: number; thickness: number }[] {
  return contourLines(field, fromM, toM, stepM).map((c) => ({
    level: c.level,
    thickness: c.thickness,
    path: c.path.map(([x, y]) => {
      const [lng, lat] = kmToLngLat([x, y])
      return [lng, lat, -sampleField(field, x, y) * exaggeration] as LngLatAlt
    }),
  }))
}
