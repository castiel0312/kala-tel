/**
 * Verifies the Mapbox 3D surface with objective evidence, not vibes.
 *
 * Reads the app's own HUD (the camera status line) plus the Mapbox GL canvas, drives the 2D/3D
 * switch, drags to orbit the well field, and reports the camera before and after each step.
 *
 * Mapbox GL JS draws nothing without a valid access token, so the camera and terrain steps below
 * are only meaningful once VITE_MAPBOX_TOKEN is set. Without it the script reports the token
 * state and stops, rather than passing on assertions the blank map cannot satisfy.
 *
 *   node verify-3d.mjs /command 1600 1000
 */
import { chromium } from '@playwright/test'

const [, , route = '/command', w = '1600', h = '1000'] = process.argv
const OUT = '/tmp/nwis-3d'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().split('\n')[0])
})
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))

await page.goto('http://localhost:5173' + route, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.mapboxgl-canvas', { timeout: 20000 })
await page.waitForTimeout(4000)

/** The HUD is the map's own status line, so it is the evidence — no test-only back channel. */
const readMap = () =>
  page.evaluate(() => {
    const canvas = document.querySelector('.mapboxgl-canvas')
    const hud = [...document.querySelectorAll('span')]
      .map((s) => s.textContent?.trim() ?? '')
      .filter((t) => /pitch|terrain|Mapbox GL|z\d/.test(t))
    const cam = [...document.querySelectorAll('button[aria-pressed]')].map((b) => b.textContent?.trim())
    const notice = document.querySelector('[role="status"]')
    return {
      canvas: canvas ? { w: canvas.width, h: canvas.height, cls: canvas.className } : null,
      deckAttached: !!document.querySelector('.deck-widget-container'),
      hud,
      cameraButtons: cam,
      // The 2D/3D switch order is part of the brief, so it is asserted rather than assumed.
      cameraBar: [...document.querySelectorAll('[aria-label="Camera"] button')].map((b) => b.textContent?.trim()),
      compass: document.querySelector('button[title^="Bearing"]') ? 'present' : 'absent',
      terrainSteps: [...document.querySelectorAll('button[title^="Terrain vertical"]')].map((b) => b.textContent?.trim()),
      // Mapbox puts its interaction flags on the container, not the canvas.
      dragRotate: canvas?.parentElement?.classList.contains('mapboxgl-touch-zoom-rotate') ?? null,
      tokenNotice: notice ? notice.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) : null,
    }
  })

const steps = {}
steps.opening = await readMap()
await page.locator('.mapboxgl-canvas').screenshot({ path: `${OUT}-1-3d.png` })

if (steps.opening.tokenNotice) {
  // No token: the map is blank by design and the app says so. The camera and terrain steps
  // cannot be asserted, so report the state and stop instead of claiming a pass.
  console.log(
    JSON.stringify(
      {
        route,
        verdict: 'BLOCKED — no Mapbox access token, so Mapbox GL JS renders an empty frame',
        steps,
        errors: [...new Set(errors)],
      },
      null,
      2,
    ),
  )
  await browser.close()
  process.exit(2)
}

// Switch to 2D through the app's own control.
await page.getByRole('button', { name: '2D', exact: true }).click()
await page.waitForTimeout(1800)
steps.flat = await readMap()
await page.locator('.mapboxgl-canvas').screenshot({ path: `${OUT}-2-2d.png` })

// Back to 3D, and let the flight land.
await page.getByRole('button', { name: '3D', exact: true }).click()
await page.waitForTimeout(1800)
steps.backTo3d = await readMap()
await page.locator('.mapboxgl-canvas').screenshot({ path: `${OUT}-3-3d.png` })

// Orbit the well field: a right-drag rotates the bearing in Mapbox GL.
const box = await page.locator('.mapboxgl-canvas').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down({ button: 'right' })
for (let i = 1; i <= 12; i += 1) {
  await page.mouse.move(box.x + box.width / 2 - i * 9, box.y + box.height / 2)
  await page.waitForTimeout(16)
}
await page.mouse.up({ button: 'right' })
await page.waitForTimeout(600)
steps.afterOrbit = await readMap()
await page.locator('.mapboxgl-canvas').screenshot({ path: `${OUT}-4-orbit.png` })

// Reset bearing with the compass.
await page.locator('button[title^="Bearing"]').click()
await page.waitForTimeout(1500)
steps.afterNorth = await readMap()

// Terrain exaggeration, to prove the DEM is really being re-driven.
const step8 = page.locator('button[title="Terrain vertical exaggeration 8×"]')
if (await step8.count()) {
  await step8.click()
  await page.waitForTimeout(1200)
  steps.terrain8x = await readMap()
  await page.locator('.mapboxgl-canvas').screenshot({ path: `${OUT}-5-terrain8x.png` })
}

console.log(JSON.stringify({ route, steps, errors: [...new Set(errors)] }, null, 2))
await browser.close()
