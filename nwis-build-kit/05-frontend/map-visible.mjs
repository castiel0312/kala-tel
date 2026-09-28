import { chromium } from 'playwright'

/**
 * The §1 check: does the map draw at all, and is the terrain on it.
 *
 * The map used to render a 2px black strip — the canvas existed, the tiles 200'd, the token was
 * valid, and nothing was visible, because a CSS cascade collapsed the container to nothing. Every
 * one of those facts is true of a map that is working, so none of them proves the map draws. This
 * asks the only question that does: is the frame the size it is supposed to be, and is it carrying
 * satellite imagery rather than the page's background colour?
 *
 *   node map-visible.mjs
 *   URL=http://localhost:5173/#map node map-visible.mjs
 */
const URL = process.env.URL ?? 'http://localhost:5173/#map'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
const failedRequests = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 180)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 180)))
page.on('requestfailed', (r) => failedRequests.push(`${r.failure()?.errorText} ${r.url().slice(0, 90)}`))
/**
 * Every raster and DEM URL the page asks for, kept as a count by kind.
 *
 * This is the terrain check that does not depend on the page's own chrome. A HUD label is a string
 * a component wrote about the map; a DEM tile request is Mapbox GL going to the network for
 * elevation, and there is no way to see one without terrain on.
 */
const requests = { dem: 0, satellite: 0, other: 0 }
page.on('request', (r) => {
  const u = r.url()
  if (/terrain-dem|terrarium|elevation-tiles/.test(u)) requests.dem += 1
  else if (/satellite|mapbox\.tiles|tiles\.mapbox/.test(u)) requests.satellite += 1
  else requests.other += 1
})
await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(6000)

const r = await page.evaluate(async () => {
  const canvas = document.querySelector('.mapboxgl-canvas')
  if (!canvas) return { error: 'no mapbox canvas' }
  const box = canvas.getBoundingClientRect()
  const cs = getComputedStyle(canvas)
  const stage = canvas.closest('[class*="mapStage"], [class*="frame"]')
  const stageBox = stage?.getBoundingClientRect()
  const container = canvas.parentElement
  const containerBox = container?.getBoundingClientRect()
  return {
    canvas: { w: Math.round(box.width), h: Math.round(box.height), attr: [canvas.width, canvas.height] },
    display: cs.display,
    opacity: cs.opacity,
    visibility: cs.visibility,
    container: containerBox ? { w: Math.round(containerBox.width), h: Math.round(containerBox.height) } : null,
    stage: stageBox ? { w: Math.round(stageBox.width), h: Math.round(stageBox.height) } : null,
  }
})

/** is the canvas carrying imagery? measured from a compositor screenshot, not the GL buffer */
const shot = await page.locator('.mapboxgl-canvas').first().screenshot().catch(() => null)
const pixels = shot
  ? await page.evaluate(async (b64) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + b64
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const x = c.getContext('2d')
      x.drawImage(img, 0, 0)
      const d = x.getImageData(0, 0, c.width, c.height).data
      const hist = new Map()
      let n = 0
      for (let i = 0; i < d.length; i += 4) {
        const k = `${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`
        hist.set(k, (hist.get(k) ?? 0) + 1)
        n += 1
      }
      const top = [...hist.entries()].sort((a, b) => b[1] - a[1])[0]
      return { distinctColours: hist.size, dominantShare: Number((top[1] / n).toFixed(3)) }
    }, shot.toString('base64'))
  : null

/**
 * The fault panel, exercised rather than assumed.
 *
 * These five classifications are the whole reason an empty map is now explainable, and the reason
 * is the bug this file exists for: a black frame with a console message. So the mapping from
 * Mapbox's own wording to a named fault is checked directly, here, against the messages Mapbox
 * actually raises. It runs against the real module through Vite.
 */
const faults = await page.evaluate(async () => {
  const m = await import('/src/components/map/faults.ts')
  const cases = [
    ['access token is required', 'auth'],
    ['Invalid access token', 'auth'],
    ['Unauthorized: 401', 'auth'],
    ['Failed to load style: https://api.mapbox.com/styles/v1/...', 'style'],
    ['sprite: could not load glyphs', 'style'],
    ['Failed to load tile for source mapbox://mapbox.satellite', 'tiles'],
    ['raster-dem source returned 429', 'tiles'],
    ['something entirely unexpected', null],
  ]
  const got = cases.map(([message, want]) => ({
    message,
    want,
    got: m.classify(new Error(message)),
  }))
  return {
    got,
    webgl: m.webglAvailable(),
    complete: Object.values(m.FAULTS).every((f) => f.title && f.body && f.hint),
    faults: Object.keys(m.FAULTS),
  }
})

/**
 * The map's own account of its terrain, plus what it asked the network for.
 *
 * Read from `textContent`, not `innerText`: the HUD is CSS-hidden inside this older section's
 * layout, and `innerText` skips hidden content — so asking it for the terrain label returns
 * nothing and looks like a map with no terrain on it. `textContent` is what the component
 * actually rendered, and the DEM request count is the independent check beside it.
 */
const terrain = await page.evaluate(() => {
  const text = document.body.textContent ?? ''
  return {
    // one digit only: the exaggeration is 1–8, and a greedy [\d.]+ runs on into the "2x" control
    // sitting next to the label and reports the terrain as 32x
    dem: text.match(/(Mapbox Terrain DEM|Terrain Tiles[^·\n]{0,24})\s*[×x]\s*(\d)/)?.[0] ?? null,
    flat: /terrain flat/.test(text),
    pitch: text.match(/pitch\s*(\d+)°/)?.[1] ?? null,
    attribution: text.match(/© Mapbox[^\n]{0,40}/)?.[0] ?? null,
  }
})
terrain.demRequests = requests.dem
terrain.satelliteRequests = requests.satellite
/** the style's name is not in the DOM, but its imagery is on the wire */
terrain.style = requests.satellite > 0 ? 'satellite-streets' : 'none'

await browser.close()
const tallEnough = (r.canvas?.h ?? 0) > 300
const wideEnough = (r.canvas?.w ?? 0) > 400
const drawn = (pixels?.distinctColours ?? 0) > 40
const classified = faults.got.every((c) => c.got === c.want)
/**
 * Terrain counts as on if Mapbox GL went and fetched elevation, which is the signal that cannot be
 * faked by a stale label. The HUD's own account is reported beside it but is not what decides.
 */
const terrainOn = requests.dem > 0 && !terrain.flat

console.log(
  JSON.stringify(
    { ...r, pixels, terrain, faults: { webgl: faults.webgl, complete: faults.complete, faults: faults.faults, misclassified: faults.got.filter((c) => c.got !== c.want) }, errors: errors.slice(0, 5), failedRequests: failedRequests.slice(0, 5) },
    null,
    1,
  ),
)
const problems = [
  r.error,
  tallEnough ? null : `canvas only ${r.canvas?.h}px tall`,
  wideEnough ? null : `canvas only ${r.canvas?.w}px wide`,
  drawn ? null : `only ${pixels?.distinctColours ?? 0} distinct colours — not imagery`,
  terrainOn ? null : `terrain is not on — ${requests.dem} DEM tiles requested`,
  faults.webgl ? null : 'webgl probe says this browser has no WebGL',
  faults.complete ? null : 'a fault is missing its title/body/hint',
  classified ? null : 'a Mapbox message is classified as the wrong fault',
].filter(Boolean)
console.log(
  problems.length
    ? `\nFAIL\n  ${problems.join('\n  ')}`
    : `\nmap draws ${r.canvas.w}x${r.canvas.h} on ${terrain.style} · ${terrain.dem} · ${terrain.demRequests} DEM tiles · ${terrain.pitch}° pitch · every empty-frame cause is named`,
)
process.exit(problems.length ? 1 : 0)
