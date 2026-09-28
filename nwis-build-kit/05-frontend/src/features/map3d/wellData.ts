/**
 * The demo wellfield as absolute map geometry.
 *
 * The API describes wells as kilometre offsets from a local origin, which is a rendering problem
 * rather than a data one: the offsets are fine, but nothing on this section draws from them. The
 * demo file in `public/data` carries the same ten wells with both absolute positions already
 * projected — a wellhead and the point its bore reaches at the reference bit depth — so this module
 * reads those, and every position on the map comes from them. `ORIGIN` and `kmToLngLat` stay where
 * they are for the sections that still work in offsets; this section does not.
 *
 * Everything returned here is a plain GeoJSON `FeatureCollection`, ready for `setData` on a
 * Mapbox source, so changing the radius or the selection rewrites data and never the style.
 */

import { circle } from '@turf/circle'
import type { Feature, FeatureCollection, LineString, Point, Polygon, Position } from 'geojson'
import { ORIGIN } from '../../lib/geo'
import type { RisksResponse } from '../../api/types'
import { formatKm, isRelevant, modelFor, type RiskLevel, type Well, type WellModel, type WellRole, type WellStatus } from './types'

export const REFERENCE_ID = 'OIL-WELL-104'

/** Vite serves `public/` at the base path, so the file is fetchable without a bundler round trip. */
export const DEMO_WELLFIELD_URL = `${import.meta.env.BASE_URL}data/wellfield-demo.geojson`

/**
 * The anchor the file's kilometre offsets were projected from, and only that.
 *
 * It is here for one thing: the camera's opening position, which has to exist on the first frame
 * rather than after the file has been fetched and parsed. Nothing on the map is drawn from it — the
 * ten wells carry their own positions, and using an approximation as a layer position is exactly
 * how a field ends up 72 km from where it belongs.
 *
 * It reads `ORIGIN` rather than repeating the degrees. It was a second hard-coded copy of the same
 * two numbers, which is the one thing a single source of truth exists to prevent: it agreed with
 * `geo.ts` only until one of them was edited, and nothing would have said so.
 */
export const DEMO_ANCHOR: [number, number] = [ORIGIN.lng, ORIGIN.lat]

/** Rings always present, whatever the reader has selected. */
export const BASE_RING_RADII_KM = [0.5, 1, 2, 5] as const

/** The radius buttons. The selection also becomes the fit distance and the camera anchor. */
export const RADIUS_STEPS_KM = [1, 3, 5, 10] as const
export const DEFAULT_RADIUS_KM = 5

/** The risk zone reads at a 250 m scale — half the smallest ring, and legible from the air. */
export const RISK_RADIUS_KM = 0.25

/** Metres per degree of latitude, so a ring's label can sit exactly at the ring's north point. */
/**
 * Kilometres per degree of latitude, at this latitude.
 *
 * Both operands of every conversion below are kilometres, which is the whole point of writing the
 * constant this way round. The obvious-looking alternative — a metres-per-degree constant next to
 * kilometre arguments — divides 5 km by 110 574 and puts a 5 km ring 45 m across: the ring, its
 * label and the camera fit all agree with each other and are all wrong by 1000×, so nothing
 * contradicts anything and the only symptom is a map that cannot be zoomed out of its own symbols.
 */
const KM_PER_DEG_LAT = 110.574

const STATUSES: readonly WellStatus[] = ['Drilling', 'Producing', 'Suspended', 'Abandoned']
const MODELS: readonly WellModel[] = ['derrick', 'pumpjack', 'wellhead']
const LEVELS: readonly RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW']

/* ------------------------------------------------------------------------- load --- */

export async function loadWellfield(url: string = DEMO_WELLFIELD_URL): Promise<Well[]> {
  const res = await fetch(url, { headers: { accept: 'application/geo+json, application/json' } })
  if (!res.ok) throw new Error(`Wellfield data: ${res.status} ${res.statusText} for ${url}`)
  return parseWellfield(await res.json())
}

/**
 * The file is data, not a suggestion, so it is validated on the way in: a wellfield with a missing
 * bit position would draw a path that is quietly in the wrong place, and a broken map that looks
 * fine is worse than one that says it could not load.
 */
export function parseWellfield(raw: unknown): Well[] {
  const fc = raw as { type?: unknown; features?: unknown } | null
  if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    throw new Error('Wellfield data: expected a GeoJSON FeatureCollection')
  }
  if (fc.features.length === 0) throw new Error('Wellfield data: no features')

  const wells = fc.features.map((f, i) => wellFrom(f as { properties?: Record<string, unknown> }, i))
  const reference = wells.find((w) => w.role === 'reference')
  if (!reference) throw new Error('Wellfield data: no reference well')
  return wells
}

function wellFrom(feature: { properties?: Record<string, unknown> }, index: number): Well {
  const p = feature.properties ?? {}
  const id = str(p.id) ?? `well-${index + 1}`
  const role: WellRole = p.role === 'reference' ? 'reference' : 'offset'
  const status = oneOf(p.status, STATUSES)
  if (!status) throw new Error(`Wellfield data: ${id} has no usable status`)
  const model = oneOf(p.model, MODELS) ?? modelFor({ status, model: 'derrick' })
  const surface = lngLat(p.surface) ?? lngLat(p.geometry) ?? null
  const bit = lngLat(p.bit)
  if (!surface) throw new Error(`Wellfield data: ${id} has no wellhead position`)
  if (!bit) throw new Error(`Wellfield data: ${id} has no bit position`)

  return {
    id,
    role,
    status,
    model,
    surface,
    bit,
    distanceAtBitKm: num(p.distanceAtBitKm) ?? 0,
    similarity: num(p.similarity) ?? null,
    riskLevel: oneOf(p.riskLevel, LEVELS) ?? 'LOW',
    eventCount: num(p.eventCount),
    eventSummary: str(p.eventSummary),
    tdMdM: num(p.tdMdM),
    barailTopTvdssM: num(p.barailTopTvdssM),
    spud: num(p.spud),
    bitMdM: num(p.bitMdM),
    bitTvdssM: num(p.bitTvdssM),
    formation: str(p.formation),
    nextTop: str(p.nextTop),
    topRisk: str(p.topRisk),
    region: str(p.region),
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined
}

function lngLat(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length < 2) return null
  const [a, b] = v
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) return null
  return [a, b]
}

/* ----------------------------------------------------------------------- risk --- */

export interface RiskZone {
  name: string
  probability: number
  level: RiskLevel
  windowMdM: [number, number] | null
  metresAhead: number | null
}

/** The one risk the map labels: whatever the engine says is next, not the highest on the list. */
export function riskZoneFrom(res: RisksResponse | undefined): RiskZone | null {
  const next = res?.risks.find((r) => r.id === res.nextZone?.riskId) ?? res?.risks[0]
  if (!next) return null
  const win = Array.isArray(next.windowMdM) && next.windowMdM.length === 2 ? ([next.windowMdM[0], next.windowMdM[1]] as [number, number]) : null
  return { name: next.name, probability: next.probability, level: next.level, windowMdM: win, metresAhead: res?.nextZone?.metresAhead ?? null }
}

/** `MUD LOSS 83 % · 3,180–3,240 m` — the label is the data, so it is built from the data. */
export function riskLabel(zone: RiskZone | null | undefined): string | null {
  if (!zone) return null
  const head = `${zone.name.toUpperCase()} ${zone.probability} %`
  if (!zone.windowMdM) return head
  const [from, to] = zone.windowMdM
  return `${head} · ${Math.round(from).toLocaleString('en-GB')}–${Math.round(to).toLocaleString('en-GB')} m`
}

/* --------------------------------------------------------------------- geometry --- */

export interface WellLayerData {
  /** Wellheads, one point each. Drives the 2D icons, the haloes and the labels. */
  wells: FeatureCollection<Point>
  /** Wellhead → bit, per well. The plan-view trace of each hole. */
  paths: FeatureCollection<LineString>
  /** Reference bit → offset bit: the distance NWIS actually defines. */
  links: FeatureCollection<LineString>
  /** Distance rings plus a point at each ring's north point to hang its label on. */
  rings: FeatureCollection<LineString | Point>
  /** The risk zone and the point its label hangs from. */
  risk: FeatureCollection<Polygon | Point>
  radii: number[]
  /** The selected radius, kept separately from `radii`: the rings include the 5 km ring even when
   * the reader has selected 3 km, and the well filter must use the selection, not the last ring. */
  radiusKm: number
  reference: Well
  selected: Well
  inRadius: Well[]
}

/** `OIL-WELL-104` for the reference well, `W-067 · 1.2 km` for everything else. */
export function wellLabel(well: Well): string {
  if (well.role === 'reference') return well.id
  return `${well.id} · ${formatKm(well.distanceAtBitKm)}`
}

export function wellLabelFor(wells: Well[], id: string | null): string {
  const well = wells.find((w) => w.id === id)
  return well ? wellLabel(well) : REFERENCE_ID
}

export function ringRadiiFor(radiusKm: number): number[] {
  const set = new Set<number>(BASE_RING_RADII_KM)
  set.add(radiusKm)
  return [...set].sort((a, b) => a - b)
}

export function buildWellLayerData(
  wells: Well[],
  opts: { radiusKm: number; selectedId?: string | null; risk?: RiskZone | null },
): WellLayerData | null {
  const reference = wells.find((w) => w.role === 'reference')
  if (!reference) return null
  const selected = wells.find((w) => w.id === opts.selectedId) ?? reference
  const radii = ringRadiiFor(opts.radiusKm)

  const wellPoints: Feature<Point>[] = wells.map((w) => ({
    type: 'Feature',
    id: w.id,
    geometry: { type: 'Point', coordinates: w.surface },
    properties: {
      id: w.id,
      role: w.role,
      status: w.status,
      model: w.model,
      label: wellLabel(w),
      riskLevel: w.riskLevel,
      similarity: w.similarity,
      distanceAtBitKm: w.distanceAtBitKm,
      relevant: isRelevant(w),
      inRadius: inRadius(w, opts.radiusKm),
      selected: w.id === selected.id,
    },
  }))

  const paths: Feature<LineString>[] = wells.map((w) => ({
    type: 'Feature',
    id: w.id,
    geometry: { type: 'LineString', coordinates: [w.surface, w.bit] },
    properties: {
      id: w.id,
      role: w.role,
      /* The path is a different feature from the wellhead, so the similarity the paint expressions
       * read has to travel with it. */
      similarity: w.similarity,
      riskLevel: w.riskLevel,
      relevant: isRelevant(w),
      selected: w.id === selected.id,
      /**
       * The radius filter, or the filter that hides the path of a well whose wellhead is in range.
       *
       * Every NWIS layer shares one filter — `["any", reference, distance <= radius]` — which is
       * the only way a wellhead, its path and the link to it can be guaranteed to agree about which
       * wells are in range. A feature missing `distanceAtBitKm` does not fail the filter open, it
       * fails it shut: `["get", …]` on an absent property is null, and null compares false against
       * every radius. So the field travels with the feature, and a path is never orphaned from a
       * wellhead the reader can see.
       */
      distanceAtBitKm: w.distanceAtBitKm,
    },
  }))

  /**
   * The tie lines from the reference bit to each offset bit.
   *
   * These are the plan trace of the same thing the paths are the section of, so they carry the
   * same two fields and therefore the same filter — see the note above.
   */
  const links: Feature<LineString>[] = wells
    .filter((w) => w.role === 'offset')
    .map((w) => ({
      type: 'Feature',
      id: `link-${w.id}`,
      geometry: { type: 'LineString', coordinates: [reference.bit, w.bit] },
      properties: {
        id: w.id,
        role: w.role,
        km: w.distanceAtBitKm,
        distanceAtBitKm: w.distanceAtBitKm,
        relevant: isRelevant(w),
      },
    }))

  const ringFeatures: Feature<LineString | Point>[] = []
  for (const km of radii) {
    ringFeatures.push({
      type: 'Feature',
      id: `ring-${km}`,
      geometry: { type: 'LineString', coordinates: ringCoords(reference.bit, km) },
      properties: { kind: 'ring', km, selected: km === opts.radiusKm },
    })
    ringFeatures.push({
      type: 'Feature',
      id: `ring-label-${km}`,
      geometry: { type: 'Point', coordinates: northPoint(reference.bit, km) },
      properties: { kind: 'ringLabel', km, selected: km === opts.radiusKm },
    })
  }

  const riskFeatures: Feature<Polygon | Point>[] = []
  const label = riskLabel(opts.risk)
  if (label) {
    const zone = circle(reference.bit, RISK_RADIUS_KM, { steps: 48, units: 'kilometers' })
    riskFeatures.push({ type: 'Feature', id: 'risk-zone', geometry: zone.geometry, properties: { kind: 'zone', level: opts.risk?.level ?? 'HIGH' } })
    riskFeatures.push({ type: 'Feature', id: 'risk-label', geometry: { type: 'Point', coordinates: northPoint(reference.bit, RISK_RADIUS_KM) }, properties: { kind: 'label', text: label } })
  }

  return {
    wells: fc(wellPoints),
    paths: fc(paths),
    links: fc(links),
    rings: fc(ringFeatures),
    risk: fc(riskFeatures),
    radii,
    radiusKm: opts.radiusKm,
    reference,
    selected,
    inRadius: wells.filter((w) => inRadius(w, opts.radiusKm)),
  }
}

/** The reference well is always in range; everything else is inside or on the selected radius. */
export function inRadius(well: Well, radiusKm: number): boolean {
  return well.role === 'reference' || well.distanceAtBitKm <= radiusKm
}

function ringCoords(centre: [number, number], radiusKm: number): Position[] {
  const f = circle(centre, radiusKm, { steps: 128, units: 'kilometers' })
  return f.geometry.coordinates[0] ?? []
}

/** Due north of the centre, exactly `radiusKm` away — where a ring's label belongs. */
function northPoint(centre: [number, number], radiusKm: number): [number, number] {
  return [centre[0], centre[1] + radiusKm / KM_PER_DEG_LAT]
}

/**
 * The bounding box of a radius around a bit position, for `map.fitBounds`.
 *
 * The box of a circle rather than the circle itself, because that is the only shape `fitBounds`
 * takes — and the right edge of the frame is inset far enough to clear the inspector, so the ring
 * still lands fully inside the map the reader is looking at.
 */
export function circleBounds(centre: [number, number], radiusKm: number): [[number, number], [number, number]] {
  const dLat = radiusKm / KM_PER_DEG_LAT
  /* A degree of longitude is shorter away from the equator; at 27° N it is 88 % of a degree of
   * latitude, and leaving that out is a 12 % error in the width of every fitted radius. */
  const dLng = radiusKm / (KM_PER_DEG_LAT * Math.cos((centre[1] * Math.PI) / 180))
  return [
    [centre[0] - dLng, centre[1] - dLat],
    [centre[0] + dLng, centre[1] + dLat],
  ]
}

function fc<T extends Point | LineString | Polygon>(features: Feature<T>[]): FeatureCollection<T> {
  return { type: 'FeatureCollection', features }
}
