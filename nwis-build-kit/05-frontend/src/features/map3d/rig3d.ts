/**
 * The 3D rigs, as three instanced scenegraph layers in the same interleaved overlay as everything
 * else deck draws.
 *
 * Three things make this correct rather than decorative:
 *
 *  1. **They stand on the terrain.** `z` is the exaggerated ground height under the wellhead,
 *     queried from the map itself, so a rig never floats and never sinks as the exaggeration
 *     changes. The map owns the terrain, so the map is what has to be asked.
 *  2. **They are sized to their 2D glyphs, not to scale.** A 7.3 m pump jack at the working zoom
 *     is a *third of a pixel* wide. Sizing a 3D model honestly is the same as not drawing it, so
 *     each rig is scaled to the on-screen height of the glyph that replaces it — same reading,
 *     same zoom ramp, no jump when the reader flips to 3D. The distances and depths in the panel
 *     are the real numbers; the rigs are symbols.
 *  3. **They are the fallback's replacement, not its competitor.** The 2D glyph for a model type
 *     only fades once *that* type's model has actually drawn, so a slow or failed GLB leaves a
 *     readable symbol on the map instead of a hole.
 */

import type { Layer } from '@deck.gl/core'
import { ScenegraphLayer } from 'deck.gl'
import { PathLayer } from '@deck.gl/layers'
import { GLTFLoader } from '@loaders.gl/gltf'
import type { Map as MapboxMap } from 'mapbox-gl'
import { set2dIconOpacity, setWellIconFadedModels } from './wellLayers'
import { inRadius } from './wellData'
import { MODEL_HEIGHT_M, type WellModelUrls } from './wellModels'
import type { Well } from './types'

/** Below this zoom the rigs are more clutter than information; the 2D glyphs stay instead. */
export const RIG_MIN_ZOOM = 12.5

/** The reference rig is 1.5× the rest, mirroring the 2D icon, because it is the well in question. */
const REFERENCE_SCALE = 1.5

/** The zoom ramp the 2D icons use, in pixels of glyph: 0.45, 0.8, 1.2 × 24 px. */
const GLYPH_PX: [number, number, number] = [10.8, 19.2, 28.8]

const EARTH_CIRCUMFERENCE_M = 40075016.686

/** Ground resolution in metres per screen pixel at a latitude and zoom. */
export function metresPerPixel(zoom: number, lat: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom)
}

function lerpGlyphPx(zoom: number): number {
  const [z10, z13, z16] = GLYPH_PX
  if (zoom <= 10) return z10
  if (zoom >= 16) return z16
  if (zoom <= 13) return z10 + ((z13 - z10) * (zoom - 10)) / 3
  return z13 + ((z16 - z13) * (zoom - 13)) / 3
}

/** Metres per unit of model scale, so a rig occupies the same pixels as its glyph. */
export function rigScale(model: keyof typeof MODEL_HEIGHT_M, zoom: number, lat: number, reference: boolean): number {
  const heightM = MODEL_HEIGHT_M[model]
  if (!heightM) return 1
  const px = lerpGlyphPx(zoom) * (reference ? REFERENCE_SCALE : 1)
  return (px * metresPerPixel(zoom, lat)) / heightM
}

/** A stable, well-specific heading, so the yard does not look stamped from one template. */
function yawFor(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (Math.abs(h) % 360) - 180
}

export interface RigSceneOptions {
  map: MapboxMap
  wells: Well[]
  models: WellModelUrls
  radiusKm: number
  selectedId: string | null
  /** Bumped whenever the terrain, the exaggeration, the zoom or the style changes. */
  revision: number
  zoom: number
  onSelect: (id: string) => void
  onError: (message: string) => void
  onDrawn: (model: keyof typeof MODEL_HEIGHT_M) => void
}

/**
 * One layer per model type, each instanced over every in-range well that carries it. The positions
 * are cached for the current revision: `getPosition` must return the *same* array for the same
 * well or deck re-uploads the instance buffer on every frame.
 */
export function buildRigScene(opts: RigSceneOptions): Layer[] {
  const { map, wells, models, radiusKm, selectedId, revision, zoom, onSelect, onError, onDrawn } = opts
  if (zoom < RIG_MIN_ZOOM) return []

  const lat = map.getCenter().lat
  const inRange = wells.filter((w) => inRadius(w, radiusKm))
  const positions = new Map<string, [number, number, number]>()
  for (const w of inRange) {
    const ground = map.queryTerrainElevation(w.surface, { exaggerated: true })
    positions.set(w.id, [w.surface[0], w.surface[1], Number.isFinite(ground ?? NaN) ? (ground ?? 0) : 0])
  }

  const layers: Layer[] = []
  for (const model of ['derrick', 'pumpjack', 'wellhead'] as const) {
    const data = inRange.filter((w) => w.model === model)
    if (data.length === 0) continue
    const url = models[model]
    if (!url) continue
    layers.push(
      new ScenegraphLayer({
        id: `nwis-rig-${model}`,
        data,
        scenegraph: url,
        loaders: [GLTFLoader],
        /* Flat lighting: these are symbols, and PBR on a symbol only muddies it. */
        _lighting: 'flat',
        sizeScale: 1,
        pickable: true,
        getPosition: (w: Well) => positions.get(w.id) ?? [w.surface[0], w.surface[1], 0],
        getOrientation: (w: Well) => [0, yawFor(w.id), 0] as [number, number, number],
        getScale: (w: Well) => {
          const s = rigScale(model, zoom, lat, w.role === 'reference' || w.id === selectedId)
          return [s, s, s] as [number, number, number]
        },
        /* The only reason the terrain revision is a prop: the accessor result is memoised, so deck
         * needs a reason to re-read it. */
        updateTriggers: { getPosition: revision, getScale: `${revision}:${zoom.toFixed(2)}` },
        onClick: (info: { object?: Well }) => {
          if (info?.object?.id) onSelect(info.object.id)
        },
        onError: (err: unknown) => onError(describe(err, model)),
        onFirstDraw: () => onDrawn(model),
      }),
    )
  }
  return layers
}

function describe(err: unknown, model: string): string {
  const message = err instanceof Error ? err.message : String(err)
  return `3D ${model} model failed: ${message}`
}

/**
 * The reference wellbore, as a section through the ground rather than a plan trace of it.
 *
 * Everything else in this module stands on the terrain; this one goes through it, and that is the
 * point — a 2,968 m hole is 2,968 m below the reader's feet, so terrain depth testing would hide
 * it perfectly. It is drawn with the depth test off, which is the x-ray every subsurface screen
 * has always been: the plan view says *where* the hole goes, this line says *how deep*, and the
 * trajectory exaggeration is what stretches it. The label in the readout names it as a projection
 * off the surveyed bit, which is all it is.
 */
export function rigBoreholeLayer(opts: { map: MapboxMap; well: Well | null; exaggeration: number; revision: number }): Layer | null {
  const { map, well, exaggeration, revision } = opts
  if (!well) return null
  const tvdssM = well.bitTvdssM ?? 2968
  const ground = map.queryTerrainElevation(well.surface, { exaggerated: true }) ?? 0
  return new PathLayer({
    id: 'nwis-borehole',
    data: [{ id: well.id }],
    getPath: (): [number, number, number][] => [
      [well.surface[0], well.surface[1], ground],
      [well.bit[0], well.bit[1], ground - tvdssM * Math.max(1, exaggeration)],
    ],
    getColor: [244, 196, 0, 235],
    widthMinPixels: 2,
    widthMaxPixels: 6,
    capRounded: true,
    jointsRounded: true,
    /* The one layer on the map that is deliberately not behind the ground. */
    parameters: { depthTest: false },
    updateTriggers: { getPath: `${exaggeration}:${revision}` },
  })
}

/** 2D mode, or no model yet: the glyphs are the map. */
export function use2dGlyphs(map: MapboxMap, enabled: boolean): void {
  set2dIconOpacity(map, enabled ? 1 : 0)
}

/**
 * Fades the glyph for one model type, leaving the others alone. Set on the icon layer as an
 * expression rather than as a layer-wide opacity, because the three model types do not load
 * together and a layer-wide fade would take the un-loaded ones down with them.
 */
export function fadeModelGlyphs(map: MapboxMap, models: readonly string[]): void {
  setWellIconFadedModels(map, models)
}
