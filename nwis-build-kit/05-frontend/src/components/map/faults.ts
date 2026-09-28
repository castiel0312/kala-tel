/**
 * What is wrong with a map that has nothing to show, in the map's own frame.
 *
 * A map that fails does not fail loudly. It renders an empty rectangle: the canvas exists, the
 * tiles answer 200, the token validates, and the picture is still black — because Mapbox GL draws
 * nothing until the style resolves, and because a container that collapses to zero height looks
 * exactly like a map with no imagery. Both of those were true of a real bug in this page, and
 * neither produced a message, so the page shipped a black box for a release.
 *
 * So every way this map can fail to draw resolves to one of these, and the map says which.
 */

export interface MapFault {
  /** what failed, in the operator's terms rather than the renderer's */
  title: string
  /** why the frame is empty as a result */
  body: string
  /** the one concrete thing to do about it */
  hint: string
}

export const FAULTS = {
  webgl: {
    title: 'This browser cannot draw the map',
    body:
      'NWIS renders its basemap, its terrain and every wellfield layer in one WebGL context, and ' +
      'that context could not be created. Hardware acceleration is off, or the GPU is on a driver ' +
      'blocklist, so there is nothing for the map to draw into.',
    hint: 'Enable hardware acceleration, or open NWIS in a browser with WebGL 2.',
  },
  style: {
    title: 'The basemap style could not be loaded',
    body:
      'The map is running — it is the ground under it that is missing. Mapbox GL could not ' +
      'resolve the style, so it has no basemap and no terrain to drape the wellfield onto.',
    hint: 'Check the token’s styles scope, and that the style URL still exists.',
  },
  tiles: {
    title: 'The basemap imagery stopped arriving',
    body:
      'The style loaded but its tiles are not being served, so the map is drawing onto empty ' +
      'ground. Terrain and wellfield layers may still be present, floating over nothing.',
    hint: 'Check the network tab for failing tile requests and the token’s tiles scope.',
  },
  auth: {
    title: 'Mapbox rejected the access token',
    body:
      'A token is present but Mapbox would not accept it. As an invalid token is not an error the ' +
      'renderer surfaces on its own, this is only detectable by watching for it.',
    hint: 'Confirm VITE_MAPBOX_TOKEN is a public pk. token, and that the dev server was restarted after setting it.',
  },
} as const satisfies Record<string, MapFault>

/**
 * Whether a WebGL context can be had at all.
 *
 * Asked before the map is constructed rather than caught afterwards, because Mapbox GL's own
 * failure in this case is an exception thrown inside its constructor with a message about
 * something else entirely, and the section it dies in is the wrong place to be told the truth.
 * The probe context is thrown away immediately: a context that is merely *created* still counts
 * against the browser's limit, and leaving one lying around is how a map ends up working on the
 * first mount and blank on the second.
 */
export function webglAvailable(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    /** lose the context rather than leaving it counted against the browser's budget */
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}

/** Mapbox's own error text, matched against the faults above. */
const RE = {
  style: /style|glyphs|sprite/i,
  auth: /access token is required|invalid access token|401|403/i,
  tile: /tile|raster|dem|429|5\d\d/i,
} as const

/**
 * Which fault, if any, a Mapbox error event is.
 *
 * A single `ErrorEvent` carries a source, so the message is matched against every category rather
 * than trusted to say which layer failed — Mapbox's wording for a missing raster source is not
 * reliably the word "tile".
 */
export function classify(error: unknown): keyof typeof FAULTS | null {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '')
  if (RE.auth.test(message)) return 'auth'
  if (RE.style.test(message)) return 'style'
  if (RE.tile.test(message)) return 'tiles'
  return null
}
