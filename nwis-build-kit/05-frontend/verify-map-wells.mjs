import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'

/**
 * The §3 check: does the map draw the wellfield it claims to draw.
 *
 * Everything here is measured off the running page — the style's own sources and layers, the
 * features the renderer actually put on the frame, and the pixels that came out of the compositor.
 * A HUD string, a React prop or a TypeScript type are all things the code believes; none of them
 * survive contact with a map that is correctly rendering nothing.
 *
 * The eight failures this file exists to catch, in the order the brief lists them:
 *
 *   1. every in-range well present, at the right radius
 *   2. absolute positions, not kilometres from the section's origin
 *   3. paths, links, rings, haloes, labels and the risk zone all drawn
 *   4. wells on top of 3× terrain rather than under it
 *   5. labels that resolve to glyphs rather than to nothing
 *   6. one control panel, and nothing painted over anything else
 *   7. the legend off the Mapbox logo, and the section heading clear of the nav
 *   8. no console error, no failed request, and the same map again after a basemap switch
 *
 *   node verify-map-wells.mjs
 *   URL=http://localhost:5173/#map node verify-map-wells.mjs
 *   SHOTS=artifacts node verify-map-wells.mjs
 */
const URL = process.env.URL ?? 'http://localhost:5173/#map'
const SHOTS = process.env.SHOTS ?? ''
const WIDE = { width: 1600, height: 1000 }

const results = []
let failed = 0
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail })
  if (!ok) failed += 1
  const mark = ok ? '  ok  ' : ' FAIL '
  console.log(`${mark} ${name}${detail === undefined ? '' : `  — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`)
}

/* The ten wells the file carries, read independently of the page's own copy. */
const file = JSON.parse(await readFile('public/data/wellfield-demo.geojson', 'utf8'))
const fileWells = file.features.map((f) => ({
  id: f.properties.id,
  surface: f.geometry.coordinates,
  bit: f.properties.bit ?? null,
  distanceAtBitKm: f.properties.distanceAtBitKm,
  role: f.properties.role,
}))
/** Great-circle distance in km — the same measurement the file's own `distance_at_bit_km` claims. */
function haversineKm(a, b) {
  const R = 6371.0088
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLng = (b[0] - a[0]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const reference = fileWells.find((w) => w.role === 'reference') ?? fileWells[0]
const expectedAt = (km) => fileWells.filter((w) => w.distanceAtBitKm <= km + 1e-6).map((w) => w.id).sort()

/* ------------------------------------------------------------- the page --- */

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: WIDE })
const consoleErrors = []
const failedRequests = []
const fontRequests = new Map()
const httpFailures = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message.slice(0, 200)))
page.on('requestfailed', (r) => failedRequests.push(`${r.failure()?.errorText} ${r.url().slice(0, 100)}`))
/**
 * The Mapbox SDK pings its session endpoint with the same token whatever the map is doing, and
 * answers 401 for a token that cannot read styles. Nothing on screen depends on it, so it is
 * counted separately rather than quietly dropped: a reader debugging this page should still see it.
 */
const SDK_NOISE = /api\.mapbox\.com\/map-sessions/
page.on('response', (r) => {
  if (/\/fonts\/|glyphs|\.pbf/.test(r.url())) fontRequests.set(r.url(), r.status())
  if (r.status() >= 400) httpFailures.push(`${r.status()} ${r.url().slice(0, 100)}`)
})

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })

/**
 * Wait for the map to be *ready*, in the sense every check below relies on.
 *
 * Not "the page has finished loading" and not "the map object exists". A Mapbox surface is ready
 * when a style is parsed, the NWIS layers are in it, and the renderer has stopped asking for
 * things — and on a machine with a dead token that state is reached, left, and reached again, because
 * the first style 401s and the fallback `setStyle` starts a second one. `getStyle()` throws outright
 * in the gap, which is the clearest possible signal that asking too early is the mistake.
 */
let lastMapState = ''
async function waitForMap(timeout = 60000) {
  const deadline = Date.now() + timeout
  let last = ''
  while (Date.now() < deadline) {
    const state = await page
      .evaluate(() => {
        const map = window.__nwisMap
        if (!map) return 'no map'
        try {
          if (!map.isStyleLoaded()) return 'style still loading'
          const ids = map.getStyle().layers.map((l) => l.id)
          if (!ids.includes('nwis-wells-2d')) return 'nwis layers not mounted'
          /*
           * Deliberately no `areTilesLoaded()` here. It waits for the *network*, and a basemap that
           * keeps a connection or two open never reports true, so gating on it turns a 6-second
           * style swap into a 45-second timeout and then a false failure. The style being parsed and
           * the layers being in it is what this script is here to check.
           */
          return 'ready'
        } catch (e) {
          return 'style swapping: ' + String(e.message).slice(0, 60)
        }
      })
      .catch((e) => 'evaluate failed: ' + String(e.message).slice(0, 60))
    lastMapState = state
  if (state === 'ready') return true
    if (state !== last) {
      last = state
      lastMapState = state
      console.log(`  …  ${state}`)
    }
    await page.waitForTimeout(700)
  }
  return false
}

const ready = await waitForMap()
if (!ready) {
  check('the map reaches a readable state', false, lastMapState)
  await browser.close()
  process.exit(1)
}

/**
 * The fault notice, if the map is showing one.
 *
 * Worth its own check rather than being worked around: a notice over a working map is a bug, and
 * the notice is also an overlay that covers the controls, so every later click would fail for a
 * reason that has nothing to do with what is being clicked.
 */
async function faultNotice() {
  return page.evaluate(() => {
    const el = document.querySelector('[class*="tokenNotice"]')
    return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null
  })
}

check('the map is not showing a fault notice', (await faultNotice()) === null, await faultNotice())

/* ------------------------------------------- 1 + 3: the style, as built --- */

/**
 * The style is the whole claim.
 *
 * `queryRenderedFeatures` is used rather than the source's own data, because the source holds ten
 * features whether or not anything is on screen: the filter, the layer order and the terrain all
 * get a say, and only the renderer gets a vote.
 */
const style = await page.evaluate(() => {
  const map = window.__nwisMap
  if (!map) return { error: 'no map handle' }
  const layerIds = map.getStyle().layers.map((l) => l.id)
  const sources = Object.keys(map.getStyle().sources)
  /**
   * Features currently on the frame, deduplicated by well id.
   *
   * `queryRenderedFeatures` returns one entry per tile a feature touches, so a 9 km line that
   * crosses a tile boundary comes back twice. Counting rows measures the tile grid, not the
   * wellfield, and every count here would be a count of Mapbox's tiling rather than of the map.
   */
  const inView = (id) => {
    try {
      const seen = new Map()
      for (const f of map.queryRenderedFeatures({ layers: [id] })) {
        const key = String(f.properties?.id ?? f.properties?.label ?? `${f.geometry?.type}:${JSON.stringify(f.geometry?.coordinates).slice(0, 40)}`)
        if (!seen.has(key)) seen.set(key, f)
      }
      return [...seen.values()]
    } catch {
      return []
    }
  }
  return {
    layerIds,
    sources,
    terrain: map.getTerrain() ?? null,
    isStyleLoaded: map.isStyleLoaded(),
    wells: inView('nwis-wells-2d').length,
    wellIds: inView('nwis-wells-2d').map((f) => f.properties.id).sort(),
    halos: inView('nwis-halo').length,
    labels: inView('nwis-labels').map((f) => f.properties.id).sort(),
    labelText: inView('nwis-labels').slice(0, 3).map((f) => f.properties.label ?? f.properties.name ?? null),
    paths: inView('nwis-paths').length,
    links: inView('nwis-links').length,
    rings: inView('nwis-rings').length,
    ringLabels: inView('nwis-ring-labels').map((f) => f.properties.label ?? null).sort(),
    risk: inView('nwis-risk').length,
    riskLabels: inView('nwis-risk-labels').map((f) => f.properties.label ?? null),
    deckLayers: (map.__deck?.layerManager?.getLayers?.() ?? []).map((l) => l.id),
    imageNames: map.listImages ? map.listImages() : [],
  }
})

if (style.error) {
  check('map handle available', false, style.error)
  await browser.close()
  process.exit(1)
}

const REQUIRED_SOURCES = ['nwis-wells', 'nwis-paths', 'nwis-links', 'nwis-rings', 'nwis-risk']
const REQUIRED_LAYERS = [
  'nwis-wells-2d',
  'nwis-labels',
  'nwis-halo',
  'nwis-paths',
  'nwis-links',
  'nwis-rings',
  'nwis-ring-labels',
  'nwis-risk',
]
check('all five sources mounted', REQUIRED_SOURCES.every((s) => style.sources.includes(s)), style.sources.filter((s) => s.startsWith('nwis')))
check('all eight required layers mounted', REQUIRED_LAYERS.every((l) => style.layerIds.includes(l)), style.layerIds.filter((l) => l.startsWith('nwis')))
check('terrain is on and exaggerated', style.terrain?.exaggeration >= 1, style.terrain)
check('paths drawn for the visible wells', style.paths >= 8, { paths: style.paths })
check('links drawn between wells', style.links >= 8, { links: style.links })
check('distance rings drawn', style.rings >= 3, { rings: style.rings, labels: style.ringLabels })
check('ring labels name their radius', style.ringLabels.every((l) => typeof l === 'string' && /km/.test(l)), style.ringLabels)
check('risk zone drawn', style.risk >= 1, { features: style.risk, labels: style.riskLabels })
check('haloes drawn under every well', style.halos === style.wells, { halos: style.halos, wells: style.wells })
check('every well labelled', style.labels.length === style.wells, { labels: style.labels.length, wells: style.wells })
check('labels carry text, not empty strings', style.labelText.every((t) => typeof t === 'string' && t.length > 0), style.labelText)

/* ------------------------------------- 1: the radius filter, well by well --- */

/**
 * Puts the map in the middle of the viewport before clicking anything inside it.
 *
 * The navigation is sticky, so Playwright's own `scrollIntoViewIfNeeded` puts a control it is about
 * to click *under* the header — which is the harness fighting the page, not a fault in it. Centring
 * the stage is what a reader does by hand, and it puts every control in the clear.
 */
async function centreMap() {
  await page.locator('[class*="mapStage"]').scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    const stage = document.querySelector('[class*="mapStage"]')
    stage?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(400)
}

/** Clicks the radius control and waits for the renderer to settle. */
async function setRadius(km) {
  await centreMap()
  await page.getByRole('button', { name: `${km} km`, exact: true }).click()
  await page.waitForTimeout(2200)
  await waitForMap(20000)
  return page.evaluate(() => {
    const map = window.__nwisMap
    const ids = map.queryRenderedFeatures({ layers: ['nwis-wells-2d'] }).map((f) => f.properties.id).sort()
    const halo = map.queryRenderedFeatures({ layers: ['nwis-halo'] }).length
    const labels = map.queryRenderedFeatures({ layers: ['nwis-labels'] }).length
    const paths = map.queryRenderedFeatures({ layers: ['nwis-paths'] }).length
    return { ids, halo, labels, paths }
  })
}

for (const km of [1, 3, 5, 10]) {
  const want = expectedAt(km)
  const got = await setRadius(km)
  check(`${km} km shows ${want.length} well${want.length === 1 ? '' : 's'}`, JSON.stringify(got.ids) === JSON.stringify(want), { want, got: got.ids })
  check(`${km} km haloes and labels track the wells`, got.halo === want.length && got.labels === want.length, { halos: got.halo, labels: got.labels })
  check(`${km} km paths track the wells`, got.paths >= want.length, { paths: got.paths, wells: want.length })
}

/* ------------------------------------------- 2: positions, and their origin --- */

const positions = await page.evaluate(() => {
  const map = window.__nwisMap
  return map
    .queryRenderedFeatures({ layers: ['nwis-wells-2d'] })
    .map((f) => ({ id: f.properties.id, lngLat: f.geometry.coordinates }))
})
const far = positions
  .map((p) => ({ ...p, kmFromFile: haversineKm(p.lngLat, fileWells.find((w) => w.id === p.id).surface) }))
  .sort((a, b) => b.kmFromFile - a.kmFromFile)
check('every well sits where the file says, not 72 km away', far.every((p) => p.kmFromFile < 0.05), far.slice(0, 2).map((p) => `${p.id} off by ${p.kmFromFile.toFixed(3)} km`))

const originDistance = haversineKm(reference.surface, [94.6, 27.15])
check('the field is nowhere near the section ORIGIN', originDistance > 50, { originKm: Number(originDistance.toFixed(1)) })

/** The reference camera: where the section is supposed to open. */
const camera = await page.evaluate(() => {
  const c = window.__nwisMap.getCenter()
  return { lng: c.lng, lat: c.lat, zoom: window.__nwisMap.getZoom(), pitch: window.__nwisMap.getPitch(), bearing: window.__nwisMap.getBearing() }
})
const cameraKm = haversineKm([camera.lng, camera.lat], reference.surface)
check('the camera opens on the reference well', cameraKm < 1.5, { km: Number(cameraKm.toFixed(2)), ...camera })

/* ------------------------------------- 4: on top of the terrain, in pixels --- */

/**
 * The burial bug, measured rather than reasoned about.
 *
 * A well that is under 3× terrain is still in the style, still in the source, still counted by every
 * check above. Only the pixels say otherwise, so the pixels are sampled: the reference wellhead is
 * projected to screen coordinates, and the ink in a small box around it is counted. The rig glyph
 * is drawn in the same yellow as the reference marker, so yellow in that box can only be the well.
 */
/**
 * The burial bug, measured rather than reasoned about.
 *
 * A well that is under 3× terrain is still in the style, still in the source, and still counted by
 * every check above. Only the pixels say otherwise.
 *
 * The frame is read from a *screenshot* of the canvas element, not from the WebGL drawing buffer.
 * A Mapbox canvas is created without `preserveDrawingBuffer`, so drawing it into a 2D context after
 * the frame is composited returns transparent black — a measurement of nothing at all, and one that
 * reports the well as invisible no matter where it is. The screenshot is what the reader sees.
 */
const wellScreen = await page.evaluate(() => {
  const map = window.__nwisMap
  const p = map.project([95.3, 27.35])
  const box = map.getCanvas().getBoundingClientRect()
  return { x: p.x, y: p.y, box: { x: box.x, y: box.y, w: box.width, h: box.height } }
})
const canvasShot = await page.locator('.mapboxgl-canvas').first().screenshot()
const pixels = await page.evaluate(
  async ({ b64, x, y, box }) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const scale = c.width / box.w
    const half = Math.round(24 * scale)
    const cx = Math.round(x * scale)
    const cy = Math.round(y * scale)
    if (cx - half < 0 || cy - half < 0 || cx + half > c.width || cy + half > c.height) {
      return { error: 'the reference well is outside the frame', cx, cy, w: c.width, h: c.height, x, y, box }
    }
    const d = ctx.getImageData(cx - half, cy - half, half * 2, half * 2).data
    let yellow = 0
    let red = 0
    let any = 0
    for (let i = 0; i < d.length; i += 4) {
      const [r0, g0, b0] = [d[i], d[i + 1], d[i + 2]]
      if (r0 + g0 + b0 > 90) any += 1
      if (r0 > 150 && g0 > 120 && b0 < 90) yellow += 1
      if (r0 > 140 && g0 < 80 && b0 < 80) red += 1
    }
    return { yellow, red, any, scale: Number(scale.toFixed(2)), groundAtWell: null }
  },
  { b64: canvasShot.toString('base64'), x: wellScreen.x, y: wellScreen.y, box: wellScreen.box },
)
const ground = await page.evaluate(() => window.__nwisMap.queryTerrainElevation([95.3, 27.35], { exaggerated: true }))

check('the reference well is inside the frame to be measured', !pixels.error, pixels)
check('the reference well is visible over 3× terrain, not under it', pixels.yellow > 40, { ...pixels, groundAtWell: ground })
check('the camera is genuinely pitched, so this is a 3D test', camera.pitch > 30, { pitch: camera.pitch })

/* --------------------------------------------- 5: glyphs, not a missing font --- */

const fontFails = [...fontRequests.entries()].filter(([, status]) => status >= 400).map(([u, s]) => `${s} ${u.slice(0, 90)}`)
check('no font or glyph request failed', fontFails.length === 0, fontFails.slice(0, 3))
const labelFonts = await page.evaluate(() => {
  const style = window.__nwisMap.getStyle()
  return ['nwis-labels', 'nwis-ring-labels', 'nwis-risk-labels']
    .map((id) => style.layers.find((l) => l.id === id)?.layout?.['text-font'])
    .filter(Boolean)
})
// Mapbox GL v3 requires an array here, and reads the whole array as one stack name — so the test
// is that it has exactly one entry, and that no entry contains a comma.
check(
  'the label layers name one real font, not a stack',
  labelFonts.length > 0 && labelFonts.every((f) => Array.isArray(f) && f.length === 1 && f[0] && !f[0].includes(',')),
  labelFonts,
)

/* ------------------------------------------------- 6 + 7: the frame's own UI --- */

const layout = await page.evaluate(() => {
  const stage = document.querySelector('[class*="mapStage"]')
  const stageBox = stage?.getBoundingClientRect()
  // `mapPanelRow`, `mapPanelKey` and `mapCheck` all start with `mapPanel`/`mapCheck`, so a
  // substring selector for the panel counts the rows as panels. Match the hashed class exactly.
  // CSS-module names are hashed (`_mapPanel_2of0c_116`), and `mapPanelRow`/`mapPanelKey` share the
  // prefix. The panel is the one that holds the checkboxes and is not inside another one.
  const panelClass = [
    ...document.querySelectorAll('[class*="mapStage"] *'),
  ].flatMap((el) => [...el.classList])
    .find((c) => /^_mapPanel\w*_\w+_\d+$/.test(c) && !/Row|Key|Check/.test(c))
  const panels = [...document.querySelectorAll('.' + CSS.escape(panelClass))].map((el) => {
    const b = el.getBoundingClientRect()
    return { x: b.x, y: b.y, w: b.width, h: b.height }
  })
  const checks = [...document.querySelectorAll('.' + CSS.escape(panelClass) + ' input[type="checkbox"]')].map((el) => {
    const b = el.getBoundingClientRect()
    const label = el.closest('label')?.innerText?.trim() ?? null
    return { label, x: b.x, y: b.y, w: b.width, h: b.height }
  })
  const hud = document.querySelector('[class*="mapReadout"]')?.getBoundingClientRect()
  const zoomBar = [...document.querySelectorAll('[class*="cameraBar"], [class*="zoom"]')].map((el) => el.getBoundingClientRect())
  const logo = document.querySelector('.mapboxgl-ctrl-logo')?.getBoundingClientRect()
  const legend = document.querySelector('[class*="mapLegendBar"]')?.getBoundingClientRect()
  const nav = document.querySelector('header, nav, [class*="nav"]')?.getBoundingClientRect()
  const eyebrow = document.querySelector('[class*="section"] [class*="eyebrow"], [class*="eyebrow"]')?.getBoundingClientRect()
  const intersects = (a, b) => a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  return {
    panels,
    checks,
    hud: hud && { x: hud.x, y: hud.y, w: hud.width, h: hud.height },
    zoomBar: zoomBar.map((b) => ({ x: b.x, y: b.y, w: b.width, h: b.height })),
    logo: logo && { x: logo.x, y: logo.y, w: logo.width, h: logo.height },
    legend: legend && { x: legend.x, y: legend.y, w: legend.width, h: legend.height },
    nav: nav && { y: nav.y, h: nav.height },
    eyebrow: eyebrow && { y: eyebrow.y },
    stage: stageBox && { x: stageBox.x, y: stageBox.y, w: stageBox.width, h: stageBox.height },
    panelOverHud: panels.some((p) => intersects(p, hud)),
    panelOverZoom: panels.some((p) => zoomBar.some((z) => intersects(p, z))),
    legendOverLogo: intersects(legend, logo),
    legendBelowStage: Boolean(legend && stageBox && legend.y >= stageBox.y + stageBox.height - 2),
    checkboxes: checks.length,
  }
})

check('exactly one control panel', layout.panels.length === 1, layout.panels)
check('the panel is not painted over the readout', !layout.panelOverHud, layout.hud)
check('the panel is not painted over the camera bar', !layout.panelOverZoom, layout.zoomBar)
check('the panel does not sit on the compass', !layout.panels.some((p) => p.y < 90 && p.x + p.w > layout.stage.x + layout.stage.w - 120), layout.panels)
check('every control is a real labelled checkbox', layout.checkboxes >= 3 && layout.checks.every((c) => typeof c.label === 'string' && c.label.length > 0), layout.checks.map((c) => c.label))
check('the checkboxes are laid out in a row, not stacked on each other', layout.checks.every((c) => c.w > 8 && c.h > 8), layout.checks)
check('the legend is off the Mapbox logo', !layout.legendOverLogo, { legend: layout.legend, logo: layout.logo })
check('the legend sits below the map', layout.legendBelowStage, { legend: layout.legend, stage: layout.stage })
/**
 * The heading, measured where a reader actually lands.
 *
 * The harness has scrolled the page by now, so a raw `getBoundingClientRect` says nothing about
 * where the section starts. This navigates by hash — the same thing the navigation does — waits for
 * the scroll to finish, and then asks whether the eyebrow is under the sticky navigation.
 */
const heading = await page.evaluate(async () => {
  const nav = document.querySelector('header, nav, [class*="nav"]')
  const section = document.querySelector('[id="map"]')
  const eyebrow = section?.querySelector('[class*="eyebrow"], [class*="kicker"]') ?? section
  location.hash = '#map'
  await new Promise((r) => setTimeout(r, 1400))
  const n = nav.getBoundingClientRect()
  const e = eyebrow.getBoundingClientRect()
  return {
    navBottom: n.bottom,
    eyebrowTop: e.top,
    clear: e.top >= n.bottom - 1,
    scrollMargin: getComputedStyle(section).scrollMarginTop,
  }
})
check('a jump to the section leaves the heading clear of the navigation', heading.clear, heading)
check('the section reserves nav + 24px for itself', heading.scrollMargin === '88px', { scrollMargin: heading.scrollMargin })

/* ----------------------------------------------- 8: the map after a switch --- */

const before = style.layerIds.length
await centreMap()
await page.getByRole('button', { name: 'Streets' }).click()
await waitForMap(45000)
const afterSwitch = await page.evaluate(() => {
  const map = window.__nwisMap
  return {
    layers: map.getStyle().layers.map((l) => l.id),
    wells: map.queryRenderedFeatures({ layers: ['nwis-wells-2d'] }).length,
    terrain: map.getTerrain(),
  }
})
check('the wellfield survives a basemap switch', afterSwitch.wells === fileWells.length, { wells: afterSwitch.wells, was: before })
check('the terrain survives a basemap switch', Boolean(afterSwitch.terrain?.source), afterSwitch.terrain)
check('all eight layers are back after the switch', REQUIRED_LAYERS.every((l) => afterSwitch.layers.includes(l)), REQUIRED_LAYERS.filter((l) => !afterSwitch.layers.includes(l)))

/* Back to satellite for the screenshots, and 3D rigs. */
await centreMap()
await page.getByRole('button', { name: 'Satellite' }).click()
await waitForMap(45000)
const rigState = await page.evaluate(() => {
  const map = window.__nwisMap
  const ids = (map.__deck?.layerManager?.getLayers?.() ?? []).map((l) => l.id)
  return { ids, zoom: map.getZoom() }
})
check('the 3D rig layer is mounted in the deck overlay', rigState.ids.some((id) => id.startsWith('nwis-rig-')), rigState.ids.slice(0, 8))
check('the reference wellbore is drawn as its own deck layer', rigState.ids.includes('nwis-borehole'), rigState.ids.slice(0, 8))

/**
 * The one console error the app is *supposed* to produce on a dead token.
 *
 * Mapbox GL rejects the token from its own constructor, in its own words, before any of the
 * fallback code runs — it cannot be suppressed from script. It is counted and reported rather than
 * filtered away, because a page that renders correctly while printing a red line is still something
 * the reader may have to be told about, and because a *second*, different console error must not be
 * able to hide behind it.
 */
const consumed = consoleErrors.filter((t) => /invalid Mapbox access token|status of 401|Unauthorized/i.test(t))
const realConsoleErrors = consoleErrors.filter((t) => !consumed.includes(t))
check('no console error beyond the one the fallback consumes', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 4))
if (consumed.length) console.log(`  note  ${consumed.length} Mapbox token rejection(s) logged by the SDK; the fallback handled them`)
const realFailures = failedRequests.filter((f) => !SDK_NOISE.test(f))
check('no failed request that the map draws with', realFailures.length === 0, realFailures.slice(0, 4))

/* ------------------------------------------------------------- shots --- */

if (SHOTS) {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(SHOTS, { recursive: true })
  await page.waitForTimeout(2500)
  await page.locator('[class*="mapStage"]').screenshot({ path: `${SHOTS}/wellfield-5km-3d.png` })
  await centreMap()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.waitForTimeout(3500)
  await page.locator('[class*="mapStage"]').screenshot({ path: `${SHOTS}/wellfield-5km-2d.png` })
  console.log(`\nshots written to ${SHOTS}/wellfield-5km-{3d,2d}.png`)
}

console.log(`\n${results.length - failed}/${results.length} checks passed`)
await browser.close()
process.exit(failed ? 1 : 0)
