/**
 * The NWIS basemap and its terrain.
 *
 * The map engine is Mapbox GL JS, always — see `MapCanvas`. What an access token changes here is
 * the cartography underneath it, never the renderer: with a *working* token the style is one of
 * Mapbox's own and the ground is Mapbox's terrain DEM; without one the style is ESRI World
 * Imagery or a CARTO raster over the open Terrain Tiles (terrarium) DEM. Both are real `raster-dem`
 * sources draped by Mapbox GL's own terrain implementation, so 3D elevation is genuine either way.
 *
 * A token is a preference, not a prerequisite, and this file used to claim the opposite — which is
 * how a dead token became a black rectangle rather than a slightly plainer map. The two halves of
 * that mistake are both corrected here:
 *
 *   · Mapbox GL JS only needs a *well-formed* token to boot. It does not check it against the
 *     network, so a token nobody ever validates keeps the engine running and every Mapbox-hosted
 *     resource returns 401 instead — which is a style fault, not a missing-token fault, and reads
 *     from the outside as an empty frame.
 *   · So it is settled *before* the map is built. The choice is made by asking Mapbox, once, over
 *     a plain `fetch`, and the map is not mounted until the answer is in. Letting the engine
 *     discover it instead — a 401 on the style request, then `setStyle` to recover — wedges the
 *     map: `setStyle` while the first style is still in flight cannot be diffed, Mapbox discards
 *     both styles and never reports either as loaded, so there is no `load` event, no `style.load`
 *     and no `isStyleLoaded`, and the frame is stuck on whatever was drawn first. The 401 that
 *     settles the question comes from our own request, not from the renderer's, which also keeps
 *     the console free of a second red line.
 */

import { MAPBOX_TOKEN, TOKEN_CONFIGURED, TOKEN_REQUIRED } from './token'
export { TOKEN_CONFIGURED, TOKEN_REQUIRED }

/** A `raster-dem` source, in either of the two encodings NWIS can be pointed at. */
export interface DemSourceSpec {
  id: string
  source: {
    type: 'raster-dem'
    url?: string
    tiles?: string[]
    tileSize: number
    encoding?: 'terrarium' | 'mapbox'
    maxzoom?: number
    attribution?: string
  }
  name: string
}

/**
 * A cartographic pair and the ground under it.
 *
 * The satellite and streets styles are one choice rather than two settings, because they are only
 * meaningful together: a satellite that cannot be switched away from is not a basemap, it is a
 * picture. `streets` is a plan sheet for locating things by road, `satellite` is the ground.
 */
export interface BasemapChoice {
  id: 'mapbox' | 'open'
  label: string
  /** the renderer identity shown in the map HUD */
  engine: string
  /** shown verbatim in the camera readout */
  source: string
  /** Mapbox GL accepts either a style URL or a style object; both are used here */
  satellite: string | object
  streets: string | object
  dem: DemSourceSpec
  /**
   * The font the NWIS label layers must name.
   *
   * Not decoration: a style's `glyphs` property decides which fonts exist at all. A Mapbox style
   * serves Mapbox's fonts; a keyless style serves whatever its own glyph server has, and asking for
   * `DIN Pro Bold` against the latter returns 404 per label, silently, and the reader gets a map of
   * ten wells with no names on them.
   */
  fontBold: string
  /** whether this choice spends a Mapbox token */
  token: boolean
  /** set once a configured token has been refused, so the fallback is explainable */
  degraded?: boolean
}

/* ------------------------------------------------------------- elevation --- */

/** Mapbox's global DEM: 30 m postings, the reference terrain for the 3D mode. */
export const MAPBOX_DEM: DemSourceSpec = {
  id: 'nwis-dem',
  source: {
    type: 'raster-dem',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
    tileSize: 512,
    encoding: 'mapbox',
    maxzoom: 14,
    attribution: '© Mapbox © OpenStreetMap',
  },
  name: 'Mapbox Terrain DEM',
}

/**
 * Open Terrain Tiles in terrarium encoding: free, unauthenticated, and served to z15, which is
 * finer than the z12–14 band the well field is read at.
 */
export const TERRARIUM_DEM: DemSourceSpec = {
  id: 'nwis-dem',
  source: {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    tileSize: 256,
    encoding: 'terrarium',
    maxzoom: 15,
    attribution: 'Terrain Tiles © Mapzen, © OpenStreetMap contributors',
  },
  name: 'Terrain Tiles (terrarium)',
}

/* ---------------------------------------------------------------- basemap --- */

/**
 * ESRI World Imagery, unauthenticated.
 *
 * The tokenless satellite. It is a keyless tile service, so it is the only way to keep the brief's
 * satellite terrain — genuine overhead imagery with the drainage legible under 3× exaggeration —
 * on a machine whose Mapbox token does not work. A slightly lifted saturation, because the default
 * is grey enough to read as weather rather than as ground.
 */
/**
 * Glyphs, from the MapLibre demo font server.
 *
 * A `text-field` is a refusal without this line, and the refusal is total: the layer is dropped
 * with a console error and every well goes nameless. It is the one keyless font server that serves
 * plain SDF ranges on CORS, which is exactly what Mapbox GL's symbol layout wants.
 */
const OPEN_GLYPHS = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'

const OPEN_SATELLITE_STYLE = {
  version: 8,
  name: 'NWIS · ESRI World Imagery over open Terrain Tiles',
  glyphs: OPEN_GLYPHS,
  sources: {
    imagery: {
      type: 'raster',
      // ESRI numbers rows before columns: {z}/{y}/{x}.
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': '#0b0c0c' } },
    {
      id: 'imagery',
      type: 'raster',
      source: 'imagery',
      paint: { 'raster-saturation': 0.14, 'raster-contrast': 0.06, 'raster-brightness-min': 0.02, 'raster-brightness-max': 0.98 },
    },
  ],
  sky: {
    'sky-color': '#8ea3ad',
    'horizon-color': '#c9c3b4',
    'fog-color': '#c9c3b4',
    'horizon-fog-blend': 0.5,
    'sky-horizon-blend': 0.7,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 8, 0.35, 14, 0],
  },
  /**
   * Terrain needs light, and v3's `lights` is unforgiving in a way that fails the whole style
   * rather than the light. A v3 light is `{ id, type, properties: { … } }` — the settings live one
   * level down, under `properties`, and a flat v2-shaped object is rejected outright. Rejection here
   * is the worst kind of silent: the style never loads, so no `load`, no `style.load`,
   * `isStyleLoaded()` false forever, no tiles ever requested, and a black frame whose only evidence
   * is one buried validation line.
   *
   * Ambient plus a single directional from the north-west at a high polar angle — the conventional
   * survey direction, kept steep so the imagery keeps its own contrast instead of being flattened by
   * a low sun. Both are named, because `id` is required and is how a light is addressed later.
   */
  lights: [
    { id: 'fill', type: 'ambient', properties: { color: '#ffffff', intensity: 0.55 } },
    {
      id: 'sun',
      type: 'directional',
      properties: { color: '#fff6e8', intensity: 0.45, direction: [315, 55] },
    },
  ],
}

/** Desaturated streets: the data layer has to be the only saturated thing on screen. */
const MUTED_STREETS = {
  'raster-saturation': -0.72,
  'raster-contrast': -0.04,
  'raster-brightness-min': 0.06,
  'raster-brightness-max': 0.97,
} as const

const OPEN_STREETS_STYLE = {
  version: 8,
  name: 'NWIS · CARTO voyager over open Terrain Tiles',
  glyphs: OPEN_GLYPHS,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
        'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': '#e9e7e1' } },
    { id: 'carto', type: 'raster', source: 'carto', paint: { ...MUTED_STREETS, 'raster-opacity': 0.9 } },
  ],
  sky: {
    'sky-color': '#b3bcc0',
    'horizon-color': '#dcd7ca',
    'fog-color': '#dcd7ca',
    'horizon-fog-blend': 0.5,
    'sky-horizon-blend': 0.7,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 8, 0.35, 14, 0],
  },
  lights: [
    { id: 'fill', type: 'ambient', properties: { color: '#ffffff', intensity: 0.6 } },
    { id: 'sun', type: 'directional', properties: { color: '#ffffff', intensity: 0.35, direction: [315, 60] } },
  ],
}

/** Mapbox's own pair, used only when the token actually works. */
const MAPBOX_PAIR = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
}

/**
 * The choice, and the store that can change it.
 *
 * Not a constant, because whether Mapbox's own cartography is available is not knowable at module
 * load — it is a question about the network, and the answer can be no. A module-level `let` with a
 * subscriber list is the smallest thing that can hold that answer and still let React re-render
 * when it arrives; `useBasemapChoice` is the hook over it.
 */
function pick(mapboxAvailable: boolean): BasemapChoice {
  return mapboxAvailable
    ? {
        id: 'mapbox',
        label: 'Mapbox Satellite Streets',
        engine: 'Mapbox GL JS 3',
        source: 'Mapbox satellite + streets',
        satellite: MAPBOX_PAIR.satellite,
        streets: MAPBOX_PAIR.streets,
        dem: MAPBOX_DEM,
        fontBold: 'DIN Pro Bold',
        token: true,
      }
    : {
        id: 'open',
        label: 'ESRI World Imagery',
        engine: 'Mapbox GL JS 3',
        source: 'ESRI imagery · open Terrain Tiles',
        satellite: OPEN_SATELLITE_STYLE,
        streets: OPEN_STREETS_STYLE,
        dem: TERRARIUM_DEM,
        fontBold: 'Noto Sans Bold',
        token: false,
        // Only a *configured* token that turned out to be dead is a degradation worth naming.
        degraded: TOKEN_CONFIGURED,
      }
}

let active: BasemapChoice = pick(TOKEN_CONFIGURED)
/**
 * Which of the pair is on screen.
 *
 * This lives here, beside the choice, and not in the section that offers the control, because both
 * of them used to keep their own copy: the section held the selected id in `useState` and handed
 * the resolved style to the map as a prop. Two copies of the same fact, created independently and
 * updated separately, and they disagreed exactly once — on the first render after the token probe
 * answered, the map had the open basemap and the prop still said `mapbox://…`, so the map was
 * built with the style that had just been rejected. The section knows what the reader asked for;
 * only the store knows what is drawable. The store is therefore the one that answers, and the
 * section's control writes to it.
 */
let activeId: 'satellite' | 'streets' = 'satellite'
const listeners = new Set<() => void>()

export function basemapChoice(): BasemapChoice {
  return active
}

export function basemapId(): 'satellite' | 'streets' {
  return activeId
}

export function setBasemap(id: 'satellite' | 'streets'): void {
  if (id === activeId) return
  activeId = id
  for (const listener of listeners) listener()
}

/** The store's subscription, for `useSyncExternalStore`. Exported so the hook stays trivial. */
export function subscribeBasemap(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setActive(next: BasemapChoice): void {
  if (next.id === active.id) return
  active = next
  for (const listener of listeners) listener()
}

/**
 * The legacy constant, kept because the HUD and the readouts import it by that name.
 *
 * It is the *initial* choice, not the final one: a section that reads it before the probe has
 * answered gets Mapbox's cartography, and the hook below is what to read if the difference
 * matters. `MAP_STYLE.engine` and `.source` are labels and are true either way.
 */
export const BASEMAP: BasemapChoice = active
/** Kept under the old name because the HUD and the readouts import it by that name. */
export const MAP_STYLE = BASEMAP

/** Credit for whatever is actually on screen, which is not knowable at module load either. */
export function attributionFor(choice: BasemapChoice): string {
  return choice.token
    ? '© Mapbox © OpenStreetMap'
    : '© Esri, Maxar, Earthstar Geographics · elevation © Mapzen · © OpenStreetMap contributors © CARTO'
}

export const MAP_ATTRIBUTION = attributionFor(active)

/**
 * Give up on Mapbox's cartography, once, and say why.
 *
 * Single-shot and idempotent: `setStyle` on a token that is still bad would otherwise trade a black
 * frame for a reload loop. Safe to call from an error handler *after* the map has settled, which is
 * the second line of defence — a token that passed the check below and then failed the style load.
 */
export function degradeBasemap(): BasemapChoice {
  setActive(pick(false))
  return active
}

/**
 * Ask Mapbox, once, whether the configured token can do the job.
 *
 * The question is put to the exact resource the map is about to load, and nothing else: a public
 * token needs no scope beyond what the style itself needs, so a pass is a pass. A fail means the map
 * was never going to draw from Mapbox and nothing is lost by not trying — which is what makes it
 * safe to answer before the renderer exists.
 *
 * It never throws and it never guesses. A probe that cannot reach the network — offline, blocked, a
 * captive portal — leaves the token trusted, because an unreachable question is not a rejected
 * token, and the fault panel already explains a style that will not load.
 */
let probed: Promise<BasemapChoice> | null = null
export function ensureBasemap(): Promise<BasemapChoice> {
  if (!TOKEN_CONFIGURED) return Promise.resolve(active)
  probed ??= (async () => {
    try {
      const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`
      if (!(await fetch(url)).ok) setActive(pick(false))
    } catch {
      // Offline, or the probe itself is blocked. Not evidence about the token.
    }
    return active
  })()
  return probed
}

/**
 * Default vertical exaggeration for the terrain.
 *
 * The well field sits on the Brahmaputra alluvium, where ten kilometres of ground carries very
 * little relief, so 1× is honest but nearly invisible. 3× makes the drainage readable at field
 * scale, and the control beside it is there to put the exaggeration back to 1.
 */
export const TERRAIN_EXAGGERATION_DEFAULT = 3
export const TERRAIN_EXAGGERATION_STEPS = [1, 2, 3, 5, 8] as const
