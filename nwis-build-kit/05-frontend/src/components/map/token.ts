/**
 * Mapbox access token handling.
 *
 * Mapbox GL JS is not an engine you can run unauthenticated. It reads the token before the first
 * draw: with an absent or invalid token it still loads the style and fetches every tile, and then
 * renders an empty frame. Because NWIS's deck.gl layers are mounted *interleaved*, they share
 * that same GL context, so the entire map — basemap, terrain, wellheads, trajectories — goes
 * blank together. This was measured, not assumed: a bare Mapbox GL page with no token rendered
 * 0.0% differing pixels between a plan camera and a pitch-70 terrain camera.
 *
 * So the token is a hard prerequisite, and when it is missing the honest thing to do is say so
 * rather than ship a white rectangle that looks like a bug.
 */

const RAW = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim() ?? ''

export const MAPBOX_TOKEN = RAW
export const TOKEN_CONFIGURED = RAW.length > 0

/** What the operator is told when the map has nothing to draw with. */
export const TOKEN_REQUIRED = {
  title: 'Mapbox access token required',
  body:
    'Mapbox GL JS will not draw without a valid token, so the basemap, the terrain and every NWIS ' +
    'layer stay blank. Set VITE_MAPBOX_TOKEN in .env and restart the dev server.',
  hint: 'Create a public token at https://account.mapbox.com/access-tokens/',
} as const

/**
 * The one error Mapbox raises for a missing or rejected token.
 *
 * Matched loosely on purpose. Mapbox words it three different ways depending on where it caught
 * you — "access token is required" for an absent one, "you may have provided an invalid Mapbox
 * access token" from the constructor's own check, and a bare 401 from the style endpoint — and a
 * pattern that only knows the first spelling misses the other two, which is how a rejected token
 * ends up being reported as a fault the page cannot fix rather than as a basemap to fall back to.
 */
const AUTH_ERROR = /access token is required|invalid[^.]*access token|unauthorized|\b401\b/i

/**
 * True for the token error, which is a configuration problem the UI already reports, and false
 * for every other Mapbox error. Used to keep the token failure from also being logged as an
 * unexplained renderer fault.
 */
export function isAuthError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '')
  return AUTH_ERROR.test(message)
}
