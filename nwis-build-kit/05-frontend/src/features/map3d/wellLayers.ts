/**
 * Every flat layer on the 3D map, as Mapbox style layers.
 *
 * These are Mapbox layers on their own GeoJSON sources, not deck.gl layers, and that is the whole
 * point. Mapbox composites native layers in screen space, in the order the style lists them, so
 * they cannot be depth-tested against the terrain that Mapbox also draws — which is what buried
 * every deck layer in the previous build, where flat geometry sat at `z = 0` under 3× terrain and
 * the ground simply painted over it. Native layers are also the only kind that survive a camera
 * pitch, a 1–8× terrain exaggeration change, and a `setStyle` basemap switch without a re-render.
 *
 * Two rules hold the module together:
 *
 *  1. **Mount is idempotent.** `map.on('style.load')` re-adds sources, images and layers after a
 *     basemap switch, and every add is guarded by `getSource`/`getImage`/`getLayer`.
 *  2. **Updates are data updates.** Changing the radius, the selection or a checkbox calls
 *     `setData` or `setFilter`. Nothing re-creates a layer, so no state is lost and no flicker.
 */

import type { ExpressionSpecification, FilterSpecification, Map as MapboxMap, SymbolLayerSpecification } from 'mapbox-gl'
import type { WellLayerData } from './wellData'

/** Every id this module owns, in draw order. */
export const NWIS = {
  sources: {
    wells: 'nwis-wells',
    paths: 'nwis-paths',
    links: 'nwis-links',
    rings: 'nwis-rings',
    risk: 'nwis-risk',
  },
  layers: {
    pathsCasing: 'nwis-paths-casing',
    paths: 'nwis-paths',
    linkLabels: 'nwis-link-labels',
    links: 'nwis-links',
    ringLabels: 'nwis-ring-labels',
    rings: 'nwis-rings',
    riskLabels: 'nwis-risk-labels',
    risk: 'nwis-risk',
    riskOutline: 'nwis-risk-outline',
    halo: 'nwis-halo',
    wells2d: 'nwis-wells-2d',
    labels: 'nwis-labels',
  },
  images: {
    derrick: 'rig-derrick',
    pumpjack: 'rig-pumpjack',
    wellhead: 'rig-wellhead',
  },
} as const

/** House palette, so the map and the rest of the page cannot drift apart. */
const SIGNAL = '#F4C400'
const RELEVANT = '#D6A900'
const QUIET = '#E8E9E5'
const INK = '#080909'
const RED = '#D9362B'
const GREY = '#A3A6A1'
const WHITE = '#FFFFFF'

/** The 75 % similarity floor that decides whether an offset is a neighbour or just a well. */
const RELEVANT_FLOOR = 75

/**
 * The label font stack. `DIN Pro Bold` is the house face and leads the stack; `Arial Unicode MS
 * Bold` is the fallback that exists on every machine this demo runs on. A stack the glyph endpoint
 * cannot serve renders nothing at all, so this is checked by the map verifier rather than assumed.
 */
/**
 * Which font the label layers ask for.
 *
 * A style that carries no `glyphs` property rejects every text layer outright, and one that carries
 * a Mapbox `glyphs` URL will only serve Mapbox's own fonts. So the font is not a constant here: it
 * follows the basemap, and the caller passes it in, because "which font exists" and "which basemap
 * is on screen" are the same question. Set on mount, and re-set if the basemap changes.
 */
let labelFont: string = 'DIN Pro Bold'

/**
 * The GL typings model `text-font` as an array, and v3 enforces it: a bare string is dropped with
 * "array expected, string found" and the layer goes with it. The fix is a one-element array and not
 * a two-element one — `['DIN Pro Bold', 'Arial Unicode MS Bold']` is read as a single stack *named*
 * "DIN Pro Bold,Arial Unicode MS Bold" and looked up as such, so a font stack is not a fallback, it
 * is a font that does not exist. Which name goes in it is the basemap's business.
 */
const fontSpec = (font: string) => [font] as NonNullable<SymbolLayerSpecification['layout']>['text-font']

export function setWellLabelFont(map: MapboxMap, font: string): void {
  if (labelFont === font && map.getLayer(NWIS.layers.labels)) return
  labelFont = font
  for (const id of [NWIS.layers.labels, NWIS.layers.ringLabels, NWIS.layers.riskLabels, NWIS.layers.linkLabels]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'text-font', fontSpec(font))
  }
}

/**
 * "In range" is the reference well plus every well whose bit is inside the selected radius. The
 * reference well is in every view: it is the well the whole section is about, and dropping it when
 * the radius narrows would leave a map with nothing on it.
 */
export function wellFilter(radiusKm: number): FilterSpecification {
  return [
    'any',
    ['==', ['get', 'role'], 'reference'],
    ['<=', ['get', 'distanceAtBitKm'], radiusKm],
  ] as unknown as FilterSpecification
}

const isRingLine = ['==', ['geometry-type'], 'LineString'] as unknown as FilterSpecification
const isPoint = ['==', ['geometry-type'], 'Point'] as unknown as FilterSpecification
const isPolygon = ['==', ['geometry-type'], 'Polygon'] as unknown as FilterSpecification

/** Which layers the reader's checkboxes own. */
export interface WellLayerVisibility {
  rings: boolean
  risk: boolean
  paths: boolean
  links: boolean
  halo: boolean
  wells: boolean
  labels: boolean
}

export const ALL_VISIBLE: WellLayerVisibility = { rings: true, risk: true, paths: true, links: true, halo: true, wells: true, labels: true }

/** The per-well layers, all sharing the one radius filter. */
const PER_WELL = [NWIS.layers.pathsCasing, NWIS.layers.paths, NWIS.layers.links, NWIS.layers.linkLabels, NWIS.layers.halo, NWIS.layers.wells2d, NWIS.layers.labels]

/* ------------------------------------------------------------------------- icons --- */

/**
 * The 2D rig glyphs. Drawn in signal yellow over the dark risk halo, anchored `bottom` so the base
 * of the machine sits on the wellhead rather than the middle of it. Hand-written rather than
 * exported from the GLB yard, because a symbol layer needs a rasterised icon and the yard is a
 * signed-distance scene only deck can draw.
 */
export const RIG_SVGS = {
  'rig-derrick': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><g fill="none" stroke="#F4C400" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.5 5.8 19h12.4L12 3.5Z"/><path d="M8.7 13.5h6.6M7.3 16.2h9.4"/><path d="M12 3.5V19" stroke-width="1"/></g></svg>`,
  'rig-pumpjack': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><g fill="none" stroke="#F4C400" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 19h18.8"/><path d="M6.6 19V10.4"/><path d="m4.3 10.9 9.4-3.2"/><path d="m13.7 7.7 2.7 2.1"/><path d="m9.7 9.3-1.3 9.7"/><path d="M3.6 19v-2.4h5.2V19"/><circle cx="6.6" cy="10.4" r="1.5"/></g></svg>`,
  'rig-wellhead': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><g fill="none" stroke="#F4C400" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19h18"/><circle cx="12" cy="18.4" r="2.6"/><path d="M12 15.8V9.4"/><path d="M9.1 9.4h5.8"/><path d="M12 9.4V7.2"/><path d="M9.6 11.2h4.8"/></g></svg>`,
} as const

function imageFrom(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('rig icon failed to load'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

/** Idempotent: each glyph is decoded and uploaded once per style. */
export async function addRigImages(map: MapboxMap): Promise<void> {
  await Promise.all(
    Object.values(RIG_SVGS).map(async (svg) => {
      const id = Object.keys(RIG_SVGS).find((k) => RIG_SVGS[k as keyof typeof RIG_SVGS] === svg)
      if (!id || map.hasImage(id)) return
      try {
        map.addImage(id, await imageFrom(svg), { pixelRatio: 2 })
      } catch {
        /* A missing glyph leaves the halo behind, which still reads as a well. */
      }
    }),
  )
}

/* ------------------------------------------------------------------------- mount --- */

/**
 * Adds the sources, the icons and the layers, in that order, all guarded. Safe on load, on every
 * `style.load` after a basemap switch, and again if a caller is unsure which of those happened.
 */
export function mountWellLayers(map: MapboxMap, data: WellLayerData): void {
  const { sources, layers } = NWIS

  if (!map.getSource(sources.wells)) map.addSource(sources.wells, { type: 'geojson', data: data.wells as never, promoteId: 'id' })
  if (!map.getSource(sources.paths)) map.addSource(sources.paths, { type: 'geojson', data: data.paths as never, promoteId: 'id' })
  if (!map.getSource(sources.links)) map.addSource(sources.links, { type: 'geojson', data: data.links as never, promoteId: 'id' })
  if (!map.getSource(sources.rings)) map.addSource(sources.rings, { type: 'geojson', data: data.rings as never })
  if (!map.getSource(sources.risk)) map.addSource(sources.risk, { type: 'geojson', data: data.risk as never })

  void addRigImages(map)

  const add = (spec: Parameters<MapboxMap['addLayer']>[0]) => {
    if (!map.getLayer(spec.id)) map.addLayer(spec)
  }

  /* A casing under the paths: a 1 px black edge is what keeps a 1.25 px pale line from vanishing
   * over bright satellite sand. */
  add({
    id: layers.pathsCasing,
    type: 'line',
    source: sources.paths,
    filter: wellFilter(data.radiusKm),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': INK,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10,
        ['+', ['case', ['==', ['get', 'role'], 'reference'], 3, ['>=', ['coalesce', ['get', 'similarity'], 0], RELEVANT_FLOOR], 2, 1.25], 1],
        14,
        ['+', ['case', ['==', ['get', 'role'], 'reference'], 3, ['>=', ['coalesce', ['get', 'similarity'], 0], RELEVANT_FLOOR], 2, 1.25], 1],
      ],
      'line-opacity': 0.9,
    },
  })

  add({
    id: layers.paths,
    type: 'line',
    source: sources.paths,
    filter: wellFilter(data.radiusKm),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': [
        'case',
        ['==', ['get', 'role'], 'reference'],
        SIGNAL,
        ['>=', ['coalesce', ['get', 'similarity'], 0], RELEVANT_FLOOR],
        RELEVANT,
        QUIET,
      ],
      'line-width': [
        'case',
        ['==', ['get', 'role'], 'reference'],
        3,
        ['>=', ['coalesce', ['get', 'similarity'], 0], RELEVANT_FLOOR],
        2,
        1.25,
      ],
      'line-opacity': 0.9,
    },
  })

  /* The link label sits a little above the midpoint so the line does not strike through it. */
  add({
    id: layers.linkLabels,
    type: 'symbol',
    source: sources.links,
    filter: wellFilter(data.radiusKm),
    layout: {
      'symbol-placement': 'point',
      'text-field': ['concat', ['to-string', ['get', 'km']], ' km'],
      'text-font': fontSpec(labelFont),
      'text-size': 10,
      'text-offset': [0, -0.9],
      'text-anchor': 'bottom',
      'text-rotation-alignment': 'viewport',
      'text-allow-overlap': false,
    },
    paint: { 'text-color': WHITE, 'text-halo-color': INK, 'text-halo-width': 1.4, 'text-halo-blur': 0.2 },
  })

  add({
    id: layers.links,
    type: 'line',
    source: sources.links,
    filter: wellFilter(data.radiusKm),
    paint: { 'line-color': WHITE, 'line-width': 1, 'line-opacity': 0.55, 'line-dasharray': [2, 4] },
  })

  add({
    id: layers.ringLabels,
    type: 'symbol',
    source: sources.rings,
    filter: isPoint,
    layout: {
      'symbol-placement': 'point',
      'text-field': ['concat', ['to-string', ['get', 'km']], ' km'],
      'text-font': fontSpec(labelFont),
      'text-size': 11,
      'text-offset': [0, 0.5],
      'text-anchor': 'top',
      'text-rotation-alignment': 'viewport',
      'text-allow-overlap': false,
    },
    paint: { 'text-color': WHITE, 'text-halo-color': INK, 'text-halo-width': 1.5, 'text-halo-blur': 0.2 },
  })

  add({
    id: layers.rings,
    type: 'line',
    source: sources.rings,
    filter: isRingLine,
    paint: { 'line-color': SIGNAL, 'line-width': 1.25, 'line-opacity': 0.85, 'line-dasharray': [3, 3] },
  })

  add({
    id: layers.riskLabels,
    type: 'symbol',
    source: sources.risk,
    filter: isPoint,
    layout: {
      'symbol-placement': 'point',
      'text-field': ['get', 'text'],
      'text-font': fontSpec(labelFont),
      'text-size': 11,
      'text-offset': [0, 0.6],
      'text-anchor': 'top',
      'text-rotation-alignment': 'viewport',
      'text-allow-overlap': false,
    },
    paint: { 'text-color': WHITE, 'text-halo-color': INK, 'text-halo-width': 1.6, 'text-halo-blur': 0.2 },
  })

  /* No `fill-extrusion` anywhere on the risk: the zone is a mark on the ground, and extruding it
   * would make it depend on the terrain it is supposed to be read against. */
  add({
    id: layers.risk,
    type: 'fill',
    source: sources.risk,
    filter: isPolygon,
    paint: { 'fill-color': RED, 'fill-opacity': 0.16 },
  })
  add({
    id: layers.riskOutline,
    type: 'line',
    source: sources.risk,
    filter: isPolygon,
    paint: { 'line-color': RED, 'line-width': 1.5, 'line-opacity': 0.9, 'line-dasharray': [2, 2] },
  })

  add({
    id: layers.halo,
    type: 'circle',
    source: sources.wells,
    filter: wellFilter(data.radiusKm),
    paint: {
      'circle-pitch-alignment': 'map',
      'circle-pitch-scale': 'map',
      'circle-radius': ['interpolate', ['exponential', 1.2], ['zoom'], 9, 4, 13, 14, 16, 30],
      'circle-color': [
        'case',
        ['==', ['get', 'role'], 'reference'],
        SIGNAL,
        ['==', ['get', 'riskLevel'], 'HIGH'],
        RED,
        ['==', ['get', 'riskLevel'], 'MEDIUM'],
        SIGNAL,
        GREY,
      ],
      'circle-opacity': 0.22,
      'circle-stroke-color': INK,
      'circle-stroke-width': 1.5,
      'circle-stroke-opacity': 0.9,
    },
  })

  add(wellIconLayer())
  add(labelLayer())
}

/** `1.5×` for the reference well, so the rig being drilled is the first thing the eye lands on. */
function wellIconLayer(): SymbolLayerSpecification {
  return {
    id: NWIS.layers.wells2d,
    type: 'symbol',
    source: NWIS.sources.wells,
    layout: {
      'icon-image': ['concat', 'rig-', ['get', 'model']],
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-pitch-alignment': 'viewport',
      'icon-rotation-alignment': 'viewport',
      /**
       * A top-level `interpolate` on zoom, with the reference/offset choice as its output.
       *
       * The other way round — a `case` whose branches each interpolate on zoom — is rejected
       * outright: Mapbox GL allows `zoom` only as the input of a top-level `step` or `interpolate`,
       * and the whole layer is dropped with a console error. The reference well is drawn 1.5× the
       * size of an offset at every zoom, which is what makes it findable in a ten-well field.
       */
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10,
        ['case', ['==', ['get', 'role'], 'reference'], 0.675, 0.45],
        13,
        ['case', ['==', ['get', 'role'], 'reference'], 1.2, 0.8],
        16,
        ['case', ['==', ['get', 'role'], 'reference'], 1.8, 1.2],
      ],
    },
    paint: { 'icon-opacity': 1 },
  }
}

/**
 * Every in-range well gets a name.
 *
 * Overlap is allowed deliberately, which it was not before. The old collision problem was not a
 * collision problem: every well was being drawn at the section origin 72 km away, so eleven labels
 * sat on one spot and no amount of collision detection could have made that readable. With the
 * wells at the positions the file gives them they are 3–10 km apart, so the labels have room, and at
 * the radii this map offers they all fit. Where two genuinely do collide the sort key still decides
 * which one wins, and the reference well always wins.
 */
function labelLayer(): SymbolLayerSpecification {
  return {
    id: NWIS.layers.labels,
    type: 'symbol',
    source: NWIS.sources.wells,
    layout: {
      'text-field': ['get', 'label'],
      'text-anchor': 'top',
      'text-offset': [0, 0.4],
      'text-font': fontSpec(labelFont),
      'text-size': 11,
      'text-rotation-alignment': 'viewport',
      'text-pitch-alignment': 'viewport',
      'text-allow-overlap': true,
      'text-optional': false,
      'symbol-sort-key': ['case', ['==', ['get', 'role'], 'reference'], 1, 0],
    },
    paint: { 'text-color': WHITE, 'text-halo-color': INK, 'text-halo-width': 2, 'text-halo-blur': 0.2 },
  }
}

/* ----------------------------------------------------------------------- update --- */

/** Data only. Called on every radius, selection or risk change. */
export function updateWellLayerData(map: MapboxMap, data: WellLayerData): void {
  const { sources } = NWIS
  setData(map, sources.wells, data.wells)
  setData(map, sources.paths, data.paths)
  setData(map, sources.links, data.links)
  setData(map, sources.rings, data.rings)
  setData(map, sources.risk, data.risk)
  setRadiusFilter(map, data.radiusKm)
}

function setData(map: MapboxMap, id: string, data: unknown): void {
  const src = map.getSource(id) as { setData?: (d: unknown) => void } | undefined
  src?.setData?.(data)
}

/** Re-filters every per-well layer. The radius is a filter, never a re-mount. */
export function setRadiusFilter(map: MapboxMap, radiusKm: number): void {
  const filter = wellFilter(radiusKm)
  for (const id of PER_WELL) {
    if (map.getLayer(id)) map.setFilter(id, filter)
  }
}

export function setWellLayerVisibility(map: MapboxMap, v: WellLayerVisibility): void {
  const { layers } = NWIS
  const off = (id: string, on: boolean) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
  }
  off(layers.rings, v.rings)
  off(layers.ringLabels, v.rings)
  off(layers.risk, v.risk)
  off(layers.riskOutline, v.risk)
  off(layers.riskLabels, v.risk)
  off(layers.paths, v.paths)
  off(layers.pathsCasing, v.paths)
  off(layers.links, v.links)
  off(layers.linkLabels, v.links)
  off(layers.halo, v.halo)
  off(layers.wells2d, v.wells)
  off(layers.labels, v.labels)
}

/**
 * Which glyphs the 3D models have taken over, and whether glyphs are wanted at all.
 *
 * Per-map rather than module-global, because the two facts are drawn state: the icon-opacity
 * expression is rewritten when either changes, and a 3D model that has drawn only ever removes its
 * own glyph.
 */
const glyphState = new WeakMap<MapboxMap, { enabled: boolean; faded: string[] }>()

/**
 * Fades the 2D glyphs out once their 3D counterparts are on screen, and leaves the haloes and
 * labels alone: the halo is the readability aid, and the label is how you find a well at a zoom
 * where its model is too small to pick out.
 */
export function set2dIconOpacity(map: MapboxMap, opacity: number): void {
  const state = stateFor(map)
  state.enabled = opacity >= 0.5
  applyIconOpacity(map)
}

/** Fades the glyphs of the model types that have drawn, one type at a time. */
export function setWellIconFadedModels(map: MapboxMap, models: readonly string[]): void {
  stateFor(map).faded = [...models]
  applyIconOpacity(map)
}

function stateFor(map: MapboxMap): { enabled: boolean; faded: string[] } {
  let state = glyphState.get(map)
  if (!state) {
    state = { enabled: true, faded: [] }
    glyphState.set(map, state)
  }
  return state
}

function applyIconOpacity(map: MapboxMap): void {
  if (!map.getLayer(NWIS.layers.wells2d)) return
  const { enabled, faded } = stateFor(map)
  map.setPaintProperty(
    NWIS.layers.wells2d,
    'icon-opacity',
    [
      'case',
      ['==', ['literal', enabled], false],
      0,
      ['in', ['get', 'model'], ['literal', faded]],
      0,
      1,
    ] as unknown as ExpressionSpecification,
  )
}
