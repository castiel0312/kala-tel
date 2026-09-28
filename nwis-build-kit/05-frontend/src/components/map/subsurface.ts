import { PathLayer, ScatterplotLayer, SolidPolygonLayer, TextLayer, type Layer } from 'deck.gl'
import type { ActiveWell, HistoricalEvent, OffsetWell, RiskSummary } from '../../api/types'
import {
  contourLines3d,
  contourStep,
  depthField,
  extendPath,
  kmToLngLat,
  wellPath,
  type DepthField,
  type PathPoint,
} from '../../lib/geo'

/* ============================================================================
   Subsurface layers.

   Every well on this platform is one 3D line from a wellhead to a bit, drawn
   through deck.gl. The interesting decisions here are geological, not graphical:

   - trajectories are built-and-hold curves between the two positions the API
     returns, exaggerated vertically by a fixed factor, and labelled DERIVED
   - the structure surface is an IDW interpolation of the per-well Barail tops,
     contoured with marching squares, also DERIVED
   - a risk window is a curtain in 3D hung on the active trajectory, so the
     question "how far is that from us" has a spatial answer
   ========================================================================== */

type RGB = [number, number, number]
type RGBA = [number, number, number, number]

/** deck.gl wants colours as tuples, so the palette is tuples from the start. */
const rgba = (c: RGB, a: number): RGBA => [c[0], c[1], c[2], a]

export const RISK_RGB = {
  HIGH: [211, 58, 43],
  MEDIUM: [245, 197, 24],
  LOW: [69, 189, 131],
} satisfies Record<string, RGB>

export const PALETTE = {
  ink: [22, 24, 23],
  yellow: [245, 197, 24],
  red: [211, 58, 43],
  green: [69, 189, 131],
  steel: [147, 163, 173],
  paper: [233, 231, 225],
  geo: [201, 180, 135],
} satisfies Record<string, RGB>

const SEV_RGBA: Record<string, [number, number, number, number]> = {
  high: [211, 58, 43, 235],
  med: [245, 197, 24, 225],
  low: [110, 122, 118, 200],
}

/* ------------------------------------------------------------------ paths -- */

export interface WellTrack {
  well: OffsetWell | ActiveWell
  path: PathPoint[]
  /** `path` extended through the look-ahead. Anything drawn from it is projected, not surveyed. */
  aheadPath: PathPoint[]
  active: boolean
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  relevant: boolean
}

function riskOf(w: OffsetWell | ActiveWell): WellTrack['risk'] {
  if ('risk' in w && w.risk) return w.risk
  return 'NONE'
}

function bitOf(w: OffsetWell | ActiveWell) {
  return 'bit' in w ? w.bit : null
}

/** Builds the plan-view path for one well, from the two positions the API gives. */
export function trackFor(w: OffsetWell | ActiveWell, active = false, aheadM = 0): WellTrack {
  const surface = w.surfaceKm
  const bit = 'bitKm' in w ? w.bitKm : w.bitDepthKm
  const bitPos = bitOf(w)
  const tdMdM = bitPos?.mdM ?? ('tdMdM' in w ? w.tdMdM : 0)
  const path = wellPath(surface, bit, {
    tdMdM,
    mdMinusTvdssM: bitPos?.mdMinusTvdssM ?? ('mdMinusTvdssM' in w ? w.mdMinusTvdssM : 0),
    samples: 56,
    buildFraction: active ? 0.46 : 0.38,
  })
  return {
    well: w,
    path,
    aheadPath: aheadM > 0 ? extendPath(path, aheadM, Math.max(8, tdMdM / 60)) : path,
    active,
    risk: active ? 'HIGH' : riskOf(w),
    relevant: 'relevant' in w ? Boolean(w.relevant) : true,
  }
}

/* -------------------------------------------------------------- structure -- */

export function barailField(active: ActiveWell, offsets: OffsetWell[]): DepthField | null {
  const points = offsets
    .filter((o) => o.barailTopTvdssM != null)
    .map((o) => ({ km: o.surfaceKm as [number, number], tvdssM: o.barailTopTvdssM as number }))
  if (active.formationTopsTvdssM?.Barail != null) {
    points.push({ km: active.surfaceKm, tvdssM: active.formationTopsTvdssM.Barail })
  }
  if (points.length < 2) return null
  const lngs = points.map((p) => p.km[0])
  const norths = points.map((p) => p.km[1])
  const pad = 1.2
  return depthField(
    points,
    {
      minKm: [Math.min(...lngs) - pad, Math.min(...norths) - pad],
      maxKm: [Math.max(...lngs) + pad, Math.max(...norths) + pad],
    },
    64,
  )
}

export function structureLayer(field: DepthField, exaggeration: number, opacity = 0.5): Layer[] {
  const step = contourStep(field.maxM - field.minM)
  const lines = contourLines3d(field, field.minM, field.maxM, step, exaggeration)
  return [
    new PathLayer<(typeof lines)[number]>({
      id: 'structure-contours',
      data: lines,
      getPath: (d) => d.path,
      getColor: [0, 0, 0, Math.round(140 * opacity)],
      getWidth: (d) => d.thickness,
      widthMinPixels: 0.7,
      widthMaxPixels: 2.2,
      jointRounded: true,
      capRounded: true,
      pickable: false,
    }),
  ]
}

/* ----------------------------------------------------------------- tracks -- */

export function trackLayer(
  tracks: WellTrack[],
  exaggeration: number,
  id: string,
  opacity = 1,
  width = 2.4,
): Layer {
  return new PathLayer<WellTrack & { coords: [number, number, number][] }>({
    id,
    data: tracks.map((t) => ({
      ...t,
      coords: t.path.map((p) => {
        const [lng, lat] = kmToLngLat(p.km)
        return [lng, lat, -p.tvdssM * exaggeration] as [number, number, number]
      }),
    })),
    getPath: (d) => d.coords,
    getColor: (d) => {
      const base: [number, number, number] = d.active
        ? PALETTE.ink
        : d.risk === 'HIGH'
          ? PALETTE.red
          : d.risk === 'MEDIUM'
            ? PALETTE.yellow
            : d.relevant
              ? PALETTE.ink
              : PALETTE.steel
      const alpha = Math.round(255 * opacity * (d.active ? 1 : d.relevant ? 0.82 : 0.42))
      return [base[0], base[1], base[2], alpha] as [number, number, number, number]
    },
    getWidth: (d) => (d.active ? width * 1.5 : width),
    widthMinPixels: 1.6,
    widthMaxPixels: 6,
    capRounded: true,
    jointRounded: true,
    pickable: true,
  })
}

/** The surface footprint: a wellhead ring, so a top-down view still reads as wells. */
export function wellheadLayer(tracks: WellTrack[], selectedId?: string | null): Layer {
  return new ScatterplotLayer<WellTrack>({
    id: 'wellheads',
    data: tracks,
    getPosition: (d) => kmToLngLat(d.well.surfaceKm),
    getRadius: (d) => (d.active ? 190 : d.relevant ? 130 : 95),
    radiusUnits: 'meters',
    radiusMinPixels: 3.4,
    radiusMaxPixels: 13,
    getFillColor: (d) =>
      d.active
        ? rgba(PALETTE.yellow, 245)
        : d.well.id === selectedId
          ? rgba(PALETTE.ink, 255)
          : d.risk === 'HIGH'
            ? rgba(PALETTE.red, 225)
            : d.relevant
              ? rgba(PALETTE.ink, 200)
              : rgba(PALETTE.steel, 170),
    getLineColor: [255, 255, 255, 235],
    getLineWidth: 1.1,
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
  })
}

export function bitLayer(tracks: WellTrack[]): Layer {
  return new ScatterplotLayer<WellTrack>({
    id: 'bits',
    data: tracks,
    getPosition: (d) => {
      const p = d.path[d.path.length - 1]
      if (!p) return kmToLngLat(d.well.surfaceKm)
      const [lng, lat] = kmToLngLat(p.km)
      return [lng, lat, -p.tvdssM * 0]
    },
    getRadius: 90,
    radiusUnits: 'meters',
    radiusMinPixels: 2.6,
    radiusMaxPixels: 8,
    getFillColor: (d) => (d.active ? rgba(PALETTE.yellow, 255) : d.risk === 'HIGH' ? rgba(PALETTE.red, 235) : rgba(PALETTE.ink, 210)),
    getLineColor: [255, 255, 255, 240],
    getLineWidth: 1,
    lineWidthMinPixels: 0.8,
    stroked: true,
    pickable: true,
  })
}

export function wellLabels(tracks: WellTrack[], exaggeration: number): Layer {
  return new TextLayer<WellTrack>({
    id: 'well-labels',
    data: tracks,
    getPosition: (d) => {
      const p = d.path[d.path.length - 1]
      if (!p) return kmToLngLat(d.well.surfaceKm)
      const [lng, lat] = kmToLngLat(p.km)
      return [lng, lat, -p.tvdssM * exaggeration] as [number, number, number]
    },
    getText: (d) => d.well.id,
    getSize: 11,
    sizeUnits: 'pixels',
    getColor: (d) => (d.active ? rgba(PALETTE.ink, 255) : d.relevant ? rgba(PALETTE.ink, 225) : rgba(PALETTE.steel, 170)),
    getPixelOffset: [0, -12],
    getTextAnchor: 'middle',
    fontFamily: 'Archivo, sans-serif',
    fontWeight: 800,
    outlineWidth: 2.6,
    outlineColor: [255, 255, 255, 235],
    fontSettings: { sdf: true },
    billboard: true,
    pickable: false,
  })
}

/* ---------------------------------------------------------- depth curtains */

/** A vertical curtain in 3D, hung on a path between two depths. Used for windows. */
export function curtain(
  track: WellTrack,
  fromM: number,
  toM: number,
  exaggeration: number,
): [number, number, number][][] {
  const path = track.aheadPath.length ? track.aheadPath : track.path
  const quads: [number, number, number][][] = []
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i]!
    const c = path[i + 1]!
    if (c.mdM < fromM || a.mdM > toM) continue
    const [al, aa] = kmToLngLat(a.km)
    const [bl, ba] = kmToLngLat(c.km)
    const midA = a.tvdssM * exaggeration
    const midC = c.tvdssM * exaggeration
    quads.push([
      [al, aa, 0],
      [bl, ba, 0],
      [bl, ba, -midC],
      [al, aa, -midA],
      [al, aa, 0],
    ])
  }
  return quads
}

export function windowLayer(
  track: WellTrack,
  fromM: number,
  toM: number,
  exaggeration: number,
  color: [number, number, number],
  alpha: number,
  id: string,
): Layer {
  const polygons = curtain(track, fromM, toM, exaggeration)
  return new SolidPolygonLayer<{ polygons: [number, number, number][][]; color: [number, number, number, number] }>({
    id,
    data: [{ polygons, color: [...color, alpha] }],
    getPolygon: (d) => d.polygons,
    getFillColor: (d) => d.color,
    filled: true,
    pickable: true,
  })
}

/** The look-ahead volume: a translucent prism from the bit to the end of the window. */
export function lookAheadLayer(
  track: WellTrack,
  bitM: number,
  lookAheadM: number,
  exaggeration: number,
  id = 'look-ahead',
): Layer[] {
  const from = bitM - 2
  const to = bitM + lookAheadM
  const polygons = curtain(track, from, to, exaggeration)
  // the rail: the projected section of hole, drawn as a fat yellow line so the window survives
  // a bright raster basemap. A translucent prism alone disappears into the map.
  const rail = (track.aheadPath.length ? track.aheadPath : track.path)
    .filter((p) => p.mdM >= from && p.mdM <= to)
    .map((p) => {
      const [lng, lat] = kmToLngLat(p.km)
      return [lng, lat, -p.tvdssM * exaggeration] as [number, number, number]
    })
  return [
    new SolidPolygonLayer<{ polygons: [number, number, number][][] }>({
      id,
      data: [{ polygons }],
      getPolygon: (d) => d.polygons,
      getFillColor: [...PALETTE.yellow, 70],
      filled: true,
      pickable: false,
    }),
    new PathLayer<[number, number, number][]>({
      id: `${id}-rail`,
      data: rail.length > 1 ? [rail] : [],
      getPath: (d) => d,
      getColor: [...PALETTE.yellow, 255],
      getWidth: 5,
      widthMinPixels: 2.4,
      capRounded: true,
      jointRounded: true,
      pickable: false,
    }),
  ]
}

/* ----------------------------------------------------------------- events -- */

export interface EventPoint {
  event: HistoricalEvent
  position: [number, number, number]
}

/** Places an event on a well path, by TVDSS where the API has it and by MD otherwise. */
export function eventPoints(track: WellTrack, events: HistoricalEvent[], exaggeration: number): EventPoint[] {
  const path = track.path
  if (!path.length) return []
  const deepest = path[path.length - 1]!
  const out: EventPoint[] = []
  for (const e of events) {
    const tvdss = e.tvdssM ?? e.mdM
    if (tvdss > deepest.tvdssM) continue
    let hit: [number, number] | null = null
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1]!
      const c = path[i]!
      if (c.tvdssM >= tvdss) {
        const span = c.tvdssM - a.tvdssM || 1
        const u = (tvdss - a.tvdssM) / span
        hit = [a.km[0] + (c.km[0] - a.km[0]) * u, a.km[1] + (c.km[1] - a.km[1]) * u]
        break
      }
    }
    if (!hit) continue
    const [lng, lat] = kmToLngLat(hit)
    out.push({ event: e, position: [lng, lat, -tvdss * exaggeration] })
  }
  return out
}

export function eventLayer(track: WellTrack, events: HistoricalEvent[], exaggeration: number): Layer {
  return new ScatterplotLayer<EventPoint>({
    id: 'events',
    data: eventPoints(track, events, exaggeration),
    getPosition: (d) => d.position,
    getRadius: 165,
    radiusUnits: 'meters',
    radiusMinPixels: 4,
    radiusMaxPixels: 11,
    getFillColor: (d) => SEV_RGBA[d.event.severity] ?? SEV_RGBA.med!,
    getLineColor: [255, 255, 255, 240],
    getLineWidth: 1.2,
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
  })
}

export function eventLabels(track: WellTrack, events: HistoricalEvent[], exaggeration: number): Layer {
  return new TextLayer<EventPoint>({
    id: 'event-labels',
    data: eventPoints(track, events, exaggeration),
    getPosition: (d) => d.position,
    getText: (d) => `${d.event.wellId} ${Math.round(d.event.mdM)} m`,
    getSize: 9.5,
    sizeUnits: 'pixels',
    getColor: [35, 37, 36, 235],
    getPixelOffset: [11, 0],
    getTextAnchor: 'start',
    fontFamily: 'IBM Plex Mono, monospace',
    outlineWidth: 2.4,
    outlineColor: [255, 255, 255, 240],
    fontSettings: { sdf: true },
    billboard: true,
    pickable: false,
  })
}

/* ------------------------------------------------------------------ rings -- */

/**
 * Distance rings from the active wellhead, drawn the way a spread map is: 1 km, 2 km, 5 km.
 *
 * The dashes are real geometry — short arcs with round caps — rather than a dash pattern, so
 * the rings read the same in the deck canvas and in an exported frame, and the layer needs no
 * style extension.
 */
export function distanceRings(activeKm: [number, number], radiiKm: number[], id = 'rings'): Layer {
  const data = radiiKm.flatMap((r) => {
    const dashes = Math.max(24, Math.round(r * 26))
    const span = (Math.PI * 2) / dashes
    return Array.from({ length: dashes }, (_, i) => {
      const a0 = i * span
      const a1 = a0 + span * 0.52
      const p0: [number, number] = [activeKm[0] + Math.cos(a0) * r, activeKm[1] + Math.sin(a0) * r]
      const p1: [number, number] = [activeKm[0] + Math.cos(a1) * r, activeKm[1] + Math.sin(a1) * r]
      return { r, path: [kmToLngLat(p0), kmToLngLat(p1)] as [number, number][] }
    })
  })
  return new PathLayer<{ r: number; path: [number, number][] }>({
    id,
    data,
    getPath: (d) => d.path,
    getColor: rgba(PALETTE.ink, 92),
    getWidth: 1.1,
    widthMinPixels: 0.9,
    capRounded: true,
    pickable: false,
  })
}

/* ------------------------------------------------------------- risk hooks -- */

/** One curtain per risk window, hung on the active trajectory. */
export function riskCurtains(
  track: WellTrack,
  risks: RiskSummary[],
  exaggeration: number,
): Layer[] {
  return risks
    .filter((r) => r.status !== 'MONITOR')
    .map((r) =>
      windowLayer(
        track,
        r.windowMdM[0],
        r.windowMdM[1],
        exaggeration,
        r.level === 'HIGH' ? PALETTE.red : PALETTE.yellow,
        r.level === 'HIGH' ? 58 : 40,
        `risk-${r.id}`,
      ),
    )
}
