/**
 * Renders a route in a real browser and reports objective evidence about what was drawn:
 * console errors, canvas inventory, and a pixel analysis of the map stage.
 *
 * The pixel pass matters: a map that mounts but draws nothing looks identical to a map that
 * works unless you count the colours. We assert on the NWIS signal yellow, the ink, and the
 * overall colour variety, which together mean "trajectories, structure and marks are on screen".
 *
 *   node probe-map.mjs /nearby 1440 900
 */
import { chromium } from '@playwright/test'

const [, , route = '/nearby', w = '1440', h = '900'] = process.argv

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))

await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' })
// Let the map create its context, load the overlay and settle the camera.
await page.waitForSelector('.mapboxgl-canvas', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(2500)

const stage = page.locator('canvas').first()
const canvases = await page.evaluate(() =>
  [...document.querySelectorAll('canvas')].map((c) => ({
    cls: c.className || '(none)',
    parent: c.parentElement?.className || '(none)',
    w: c.width,
    h: c.height,
  })),
)

const dom = await page.evaluate(() => ({
  mapboxCanvas: !!document.querySelector('.mapboxgl-canvas'),
  ctrlGroups: document.querySelectorAll('.mapboxgl-ctrl-group').length,
  legendItems: document.querySelectorAll('[role="listitem"]').length,
  layerButtons: document.querySelectorAll('button[aria-pressed]').length,
  text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 240),
}))

// Pixel analysis of the rendered map area.
const shot = await stage.screenshot().catch(() => null)
let pixels = null
if (shot) {
  const b64 = shot.toString('base64')
  const probe = await browser.newPage()
  pixels = await probe.evaluate(async (data) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + data
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data: px } = ctx.getImageData(0, 0, c.width, c.height)
    const seen = new Set()
    let yellow = 0
    let ink = 0
    let red = 0
    let mid = 0
    const total = px.length / 4
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      seen.add((r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3))
      if (r > 200 && g > 150 && b < 90) yellow += 1
      if (r < 70 && g < 70 && b < 70) ink += 1
      if (r > 170 && g < 90 && b < 80) red += 1
      if (r > 150 && g > 150 && b > 140) mid += 1
    }
    return {
      w: c.width,
      h: c.height,
      distinctColours: seen.size,
      yellowPct: +((yellow / total) * 100).toFixed(2),
      inkPct: +((ink / total) * 100).toFixed(2),
      redPct: +((red / total) * 100).toFixed(2),
      paperPct: +((mid / total) * 100).toFixed(2),
    }
  }, b64)
  await probe.close()
}

console.log(JSON.stringify({ route, errors, canvases, dom, pixels }, null, 2))
await browser.close()
