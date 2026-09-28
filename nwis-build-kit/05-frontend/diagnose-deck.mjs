import { chromium } from 'playwright'

/**
 * Why is the deck.gl layer stack drawing nothing?
 *
 * `diagnose-wells.mjs` established the surrounding facts: the demo GeoJSON is served and has ten
 * features, the camera is 72.7 km from where the brief says the field is, terrain is on at 3x with
 * the ground 283 m up, and the map's own style contains no `nwis*` layer and no deck overlayer
 * layer. That last pair is the interesting one: the brief's usual suspect is layers *buried* under
 * exaggerated terrain, which can only happen if the overlay is interleaved. Zero overlayer layers
 * says the opposite — that the overlay is not in the map's layer stack at all, so the question is
 * not "why is it hidden" but "was it ever given anything to draw, and was it ever mounted".
 *
 * This reads the deck instance itself, and separately the section's own data, because those are two
 * independent ways for this to end up empty and they need telling apart.
 */
const URL = process.env.URL ?? 'http://localhost:5173/#map'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 250)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 250)))
await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(8000)

const out = await page.evaluate(async () => {
  const map = window.__nwisMap
  const res = {}
  res.map = Boolean(map)

  /* --- is the overlay actually a control on the map? --- */
  const controls = []
  for (const c of map._controls ?? []) {
    const cc = c.control ?? c
    controls.push({
      type: cc?.constructor?.name ?? 'unknown',
      onAdd: Boolean(cc?.onAdd),
      hasDeckProps: Boolean(cc?.props),
      interleaved: cc?.props?.interleaved ?? null,
      layerCount: cc?._deck?.props?.layers?.length ?? cc?.props?.layers?.length ?? null,
      layerIds: (cc?._deck?.props?.layers ?? cc?.props?.layers ?? []).map((l) => l.id ?? l.constructor?.name),
    })
  }
  res.controls = controls

  /* --- the deck instance, and whether it has drawn --- */
  const deck = map.__deck
  res.deck = deck
    ? {
        layerCount: deck.props?.layers?.length ?? null,
        layerIds: (deck.props?.layers ?? []).map((l) => l.id),
        layerTypes: (deck.props?.layers ?? []).map((l) => l.constructor?.name),
        interleaved: deck.props?.interleaved ?? deck._interleaved ?? null,
        views: deck.layerManager?.getLayers?.().length ?? null,
        /** has deck done a draw pass? */
        drawn: Boolean(deck._onBeforeRender),
        effectManager: Boolean(deck.effectManager),
        /** the device the deck instance believes it has */
        hasDevice: Boolean(deck.device),
      }
    : null

  /* --- the section's data: is the active well there at all? --- */
  const active = await fetch('http://localhost:8000/api/v1/wells/active')
    .then((r) => r.json())
    .catch((e) => ({ error: String(e) }))
  res.active = {
    ok: !active.error,
    keys: active.error ? [] : Object.keys(active),
    id: active.id ?? active.well?.id ?? null,
    surfaceKm: active.surfaceKm ?? active.well?.surfaceKm ?? null,
    hasSurface: Boolean(active.surface ?? active.well?.surface),
    hasBit: Boolean(active.bit ?? active.well?.bit),
  }

  /* --- the origin the whole page is projected through --- */
  const geo = await import('/src/lib/geo.ts')
  res.origin = { lng: geo.ORIGIN.lng, lat: geo.ORIGIN.lat, demoKm: geo.kmToLngLat([0, 0]) }
  res.projectedCentre = geo.kmToLngLat(active.surfaceKm ?? [0, 0])

  return res
})

await browser.close()
console.log(JSON.stringify(out, null, 1))
console.log('\n### console errors')
console.log(errors.length ? errors.slice(0, 8).join('\n') : '  none')
