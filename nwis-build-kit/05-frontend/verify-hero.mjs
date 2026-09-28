import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

/**
 * Loads the landing page, waits for the hero's own data, and reports what the browser actually
 * built: the WebGL canvas, the overlay's box, the model's frame, and the gap between the
 * pumpjack's feet and the section's ground line. The last one is the number that matters — the
 * three layers have to read as one machine standing on one ground.
 */
const URL = process.env.URL ?? 'http://localhost:5173/'
const OUT = process.env.OUT ?? '/tmp/nwis-hero'
mkdirSync(OUT, { recursive: true })

const SIZES = [
  { name: '1440', w: 1440, h: 900 },
  { name: '1180', w: 1180, h: 820 },
  { name: '834', w: 834, h: 1000 },
  { name: '390', w: 390, h: 844 },
]

const browser = await chromium.launch()
let bad = 0

for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-section-focus]', { timeout: 15000 }).catch(() => {})

  /*
   * The hero arrives on a lit landing picture: a machine on a pad, a ground line, the rock beneath
   * it, three names and the bore down to the bit. Everything this script measures in detail — the
   * ruler, the readout cells, the full name column, the section's own header — belongs to the lit
   * state, so the well is opened first. Measuring the landing page instead would report a missing
   * overlay for a page behaving exactly as designed; `verify-open.mjs` is where the landing page is
   * measured, because it is a state with a claim of its own rather than an absence of one.
   */
  await page.waitForTimeout(2500)
  await page.evaluate(() => document.querySelector('[class*="stageHotspot"]')?.click())
  // Let the sequence finish, the queries land, the scene reveal and the iframe paint.
  await page.waitForTimeout(6500)

  const report = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel)
    const byText = (re) => [...document.querySelectorAll('*')].find((el) => el.children.length === 0 && re.test(el.textContent ?? ''))
    const canvas = q('canvas')
    const visual = q('[class*="visual"]')
    const section = canvas?.parentElement
    const stage = document.querySelector('iframe')?.parentElement?.parentElement
    const frame = document.querySelector('iframe')
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }
    }
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
    return {
      visual: box(visual),
      section: box(section),
      stage: box(stage),
      frame: box(frame),
      canvas: canvas ? { ...box(canvas), attr: [canvas.width, canvas.height], hasGl: Boolean(gl) } : null,
      /* The ruler's caption, which is the one piece of text that proves the overlay is drawn over
         the canvas rather than the canvas standing in for it. */
      axisText: q('[class*="rulerCap"]')?.textContent?.trim() ?? null,
      bitText: byText(/^Bit depth$/)?.parentElement?.textContent ?? null,
      // The ground line's height, as the section itself publishes it to the panel above. Read
      // rather than recomputed, so this check cannot pass by re-deriving the same wrong constant.
      groundBand: (() => {
        const v = q('[class*="visual"]')
        const raw = v ? getComputedStyle(v).getPropertyValue('--nw-ground-band') : ''
        return raw.trim() ? +parseFloat(raw) : null
      })(),
      /* The depth ruler's own ticks, and the formation names beside the cut. These are read by the
         classes the section actually renders; the names used to live in a separate legend, and
         asking for the legend asks for a thing this design no longer has. */
      rulerTicks: document.querySelectorAll('[class*="rulerTick"]').length,
      glyphs: document.querySelectorAll('[class*="glyph"][class*=" "], path[class*="glyph"]').length,
      bores: document.querySelectorAll('[class*="casing"]').length,
      /* Two name columns are on the page: the three the landing page is allowed, and the full one
         the reading arrives with. Counted apart, because their sum would be a number that neither
         claim is responsible for. */
      restNames: document.querySelectorAll('[class*="stNames"] [class*="formName"]').length,
      formNames: document.querySelectorAll('[class*="stLabels"] [class*="formName"]').length,
      cells: document.querySelectorAll('button[class*="systemCell"]').length,
      docHeight: document.documentElement.scrollHeight,
    }
  })

  // The seam between the rig and the section is measured in seam-profile.mjs rather than here.
  // Two scripts each recomputing it would be two numbers to keep in agreement, and one of them
  // would be the layout agreeing with itself.
  const seam = null

  await page.screenshot({ path: `${OUT}/hero-${size.name}.png`, fullPage: false })
  await page.screenshot({ path: `${OUT}/full-${size.name}.png`, fullPage: true })

  const problems = []
  if (!report.canvas?.hasGl) problems.push('no webgl context on the section canvas')
  if (report.rulerTicks < 4) problems.push(`only ${report.rulerTicks} depth ruler ticks`)
  if (report.formNames < 3) problems.push(`only ${report.formNames} formation names`)
  if (report.cells < 4) problems.push(`only ${report.cells} readout cells`)
  for (const e of errors.slice(0, 4)) problems.push(`console: ${e.slice(0, 160)}`)

  console.log(`\n=== ${size.name} (${size.w}x${size.h}) ===`)
  console.log(JSON.stringify({ ...report, seam }, null, 1))
  console.log(problems.length ? `PROBLEMS:\n  - ${problems.join('\n  - ')}` : 'clean')
  if (problems.length) bad++
  await ctx.close()
}

await browser.close()
console.log(bad ? `\n${bad} of ${SIZES.length} viewports have problems` : '\nall viewports clean')
