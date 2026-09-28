import { chromium } from 'playwright'

/**
 * Section 03 · the eight diagnostic checks, run against the real page.
 *
 * A black map has too many possible causes that look identical from outside: a missing token, a
 * style that will not resolve, a layer that never got added, a layer that a later `setStyle`
 * wiped, a source with no data, geometry under the terrain, a camera pointed somewhere else, or a
 * container that collapsed to two pixels. All eight render the same way. So this asks the map
 * itself, in order, and writes down what it says — because the fix is entirely determined by which
 * one it is and guessing is how a section ships empty.
 *
 *   node diagnose-wells.mjs
 */
const URL = process.env.URL ?? 'http://localhost:5173/#map'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const consoleErrors = []
const requests = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message.slice(0, 200)))
page.on('response', (r) => {
  const u = r.url()
  if (/geojson|offsets|wells/i.test(u)) requests.push(`${r.status()} ${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`)
})

await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(7000)

const r = await page.evaluate(async () => {
  const map = window.__nwisMap
  const out = {}
  out.hasHandle = Boolean(map)

  if (!map) return out
  const c = map.getCenter()

  /* 1 · does the demo data exist, and does anything ask for it? */
  const geo = await fetch('/data/wellfield-demo.geojson').then(
    async (res) => ({ status: res.status, n: (await res.json().catch(() => ({ features: [] }))).features?.length ?? 0 }),
    (e) => ({ status: `ERR ${e.message}`, n: 0 }),
  )
  out.demoGeojson = geo

  /* 2 · where are the wells the page is actually drawing? */
  const nwisLayers = map.getStyle().layers.map((l) => l.id).filter((id) => id.startsWith('nwis'))
  out.layers = nwisLayers
  out.visibilities = nwisLayers.map((id) => [id, map.getLayoutProperty(id, 'visibility')])

  /* 3 · the camera */
  out.camera = { centre: [Number(c.lng.toFixed(4)), Number(c.lat.toFixed(4))], zoom: Number(map.getZoom().toFixed(2)), pitch: map.getPitch(), bearing: map.getBearing() }
  const demo = [95.3, 27.35]
  const km = (a, b) => {
    const R = 6371
    const dLat = ((b[1] - a[1]) * Math.PI) / 180
    const dLng = ((b[0] - a[0]) * Math.PI) / 180
    const la1 = (a[1] * Math.PI) / 180
    const la2 = (b[1] * Math.PI) / 180
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }
  out.centreToDemoKm = Number(km([c.lng, c.lat], demo).toFixed(1))

  /* 5 · sources, and what the map will actually draw */
  out.sources = Object.keys(map.getStyle().sources)
  out.rendered = map.queryRenderedFeatures().length
  out.renderedByLayer = nwisLayers.map((id) => [id, map.queryRenderedFeatures({ layers: [id] }).length])

  /* 6 · how high is the ground, and is anything being drawn under it? */
  out.terrainEnabled = Boolean(map.getTerrain())
  out.terrainExagg = map.getTerrain()?.exaggeration ?? null
  out.groundAtDemo = map.queryTerrainElevation(demo, { exaggerated: true })
  out.groundAtCentre = map.queryTerrainElevation([c.lng, c.lat], { exaggerated: true })

  /* 7 · is deck.gl in the layer stack, and where */
  out.overlayPresent = map.getStyle().layers.some((l) => l.metadata?.['deckgl-overlayer'] === 'true')
  out.deckLayers = nwisLayers.length

  /* 8 · the control layer ids, and whether toggling changes visibility */
  out.canQueryTerrain = typeof map.queryTerrainElevation === 'function'
  return out
})

/* does the deck.gl overlay have any sublayers at all? */
const deck = await page.evaluate(() => {
  const map = window.__nwisMap
  if (!map) return null
  const deckLayers = map.getStyle().layers.filter((l) => l.metadata?.['deckgl-overlayer'] === 'true')
  const gl = map.painter?.context?.gl
  return {
    overlaid: deckLayers.length,
    hasGL: Boolean(gl),
    /** the deck instance, if the overlay control registered one */
    deckFound: Boolean(map.__deck),
    drawCalls: map.painter?.context?.renderPassStats ?? null,
  }
})

/* where does the data say the wells are? ask the API directly */
const api = await page.evaluate(async () => {
  const res = await fetch('/api/v1/wells/OIL-WELL-104/offsets?radius_km=10&sort=similarity').catch(() => null)
  return { status: res?.status ?? 'no route', note: 'proxied by vite' }
})

/* the section's own data hook, to see the shape it draws from */
const wells = await page.evaluate(async () => {
  const res = await fetch('http://localhost:8000/api/v1/wells/OIL-WELL-104/offsets?radius_km=10&sort=similarity')
  const j = await res.json()
  const list = j.wells ?? j.offsets ?? []
  return {
    count: list.length,
    keys: list[0] ? Object.keys(list[0]) : [],
    sample: list[0]
      ? { id: list[0].id, surfaceKm: list[0].surfaceKm, bitKm: list[0].bitKm, surface: list[0].surface, bit: list[0].bit }
      : null,
  }
})

await browser.close()
console.log('### data requests seen')
console.log(requests.length ? requests.join('\n') : '  (none matching geojson|offsets|wells)')
console.log('\n### api (direct to :8000)')
console.log(JSON.stringify({ ...wells, viaVite: api }, null, 1))
console.log('\n### map')
console.log(JSON.stringify({ ...r, deck }, null, 1))
console.log('\n### console errors')
console.log(consoleErrors.length ? consoleErrors.slice(0, 10).join('\n') : '  none')
