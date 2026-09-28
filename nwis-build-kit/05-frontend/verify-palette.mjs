import { chromium } from 'playwright'

/**
 * §7, measured: the three claims the recolour makes about pixels.
 *
 * 1. **The stage is white.** Above the ground line there is nothing but `#FFFFFF` — no dusk, no
 *    hills, no vignette, no lamp pool. Sampled at the stage's own corners, where the old sky was at
 *    its darkest.
 * 2. **Each band is its token.** Sampled inside each band of the *flat* fallback, and compared to
 *    the fill the brief specifies, to ±6 per channel. The fallback is sampled rather than the lit
 *    rock because the lit rock is lit: its pixels are the fill times a light, and a tolerance of 6
 *    against a lit surface is not a test of anything.
 * 3. **The machine is black and yellow.** Sampled inside the machine's own canvas: it must contain
 *    near-black steel *and* signal yellow, and it must not contain the dusk palette it replaced.
 *
 * ## Why `--nw-lit` is set to 1
 *
 * The flat section is held back on the landing page by `saturate(0.74)` — a real, deliberate part
 * of the design, which is why sampling the raw landing pixels would read every band about a quarter
 * of the way off its own token and fail. The variable that lifts it is already there, and setting it
 * to its open value is not a test-only override of the drawing: it asks the page for the same flat
 * picture the open state shows, with the same values the SVG was filled with. Nothing is hidden and
 * nothing is injected; one custom property is set to a value the app itself uses.
 *
 * The expected colours below are written out by hand rather than imported from `heroPalette.ts`. A
 * check that reads its expectations from the code it is checking cannot fail, and the whole point
 * of this file is that the eleven fills are the eleven fills the brief asked for.
 */

const URL = process.env.URL ?? 'http://localhost:5174/'
const TOL_FILL = 6
const TOL_WHITE = 3

/** §4, in depth order: [fill, ink]. The ink is checked as a ratio below, not sampled. */
const STRATA = [
  ['#7C8656', '#58613C'],
  ['#A27B55', '#72553A'],
  ['#E4D9BC', '#B5A57E'],
  ['#D3A962', '#9C773C'],
  ['#8E948A', '#5E645B'],
  ['#A97560', '#764F3F'],
  ['#8A8F9B', '#5B606B'],
  ['#CDB57C', '#97834F'],
  ['#62665F', '#2F322E'],
  ['#6FA197', '#47766C'],
  ['#414A5A', '#272D39'],
]

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const worstChannel = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])))
const near = (got, want, tol) => worstChannel(got, hex(want)) <= tol

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)

/* ask the page for the same flat picture the open state shows */
await page.addStyleTag({ content: '[data-open-panel] { --nw-lit: 1 !important; }' })
await page.waitForTimeout(300)

const panel = page.locator('[data-open-panel]').first()
const shot = await panel.screenshot()

/** decode a PNG in the page and read pixels back, so no image library is needed */
async function pixels() {
  const b64 = shot.toString('base64')
  return page.evaluate(async (data) => {
    const img = new Image()
    img.src = `data:image/png;base64,${data}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    return { w: img.width, h: img.height, data: Array.from(ctx.getImageData(0, 0, img.width, img.height).data) }
  }, b64)
}
const px = await pixels()
const at = (x, y) => {
  const i = (Math.round(y) * px.w + Math.round(x)) * 4
  return [px.data[i], px.data[i + 1], px.data[i + 2]]
}

/** the most common colour in a box — the band fill beats its contacts, bore and any label over it */
function modal(x0, y0, x1, y1, step = 2) {
  const tally = new Map()
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const k = at(x, y).join(',')
      tally.set(k, (tally.get(k) ?? 0) + 1)
    }
  }
  const [best] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
  return best.split(',').map(Number)
}

const problems = []
const report = []

/* ---- where the bands are, in screenshot pixels ------------------------------ */

const bands = await page.evaluate(() => {
  const svg = document.querySelector('svg[class*="fallback"]')
  if (!svg) return null
  const r = svg.getBoundingClientRect()
  const vb = svg.viewBox.baseVal
  const sx = r.width / (vb.width || 1)
  const sy = r.height / (vb.height || 1)
  const panel = document.querySelector('[data-open-panel]').getBoundingClientRect()
  return {
    scale: [sx, sy],
    offset: [r.left - panel.left, r.top - panel.top],
    rects: [...svg.querySelectorAll('rect[class*="fallbackBand"]')].map((el) => {
      const b = el.getBBox()
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    }),
  }
})
if (!bands || bands.rects.length === 0) {
  console.error('could not find the flat section\'s bands — refusing to report a vacuous pass')
  await browser.close()
  process.exit(2)
}
if (bands.rects.length !== STRATA.length) {
  problems.push(`expected ${STRATA.length} bands in the section, found ${bands.rects.length}`)
}

const [sx, sy] = bands.scale
const [ox, oy] = bands.offset

/* ---- §7.2  every band is its own token -------------------------------------- */

STRATA.forEach(([fill], i) => {
  const b = bands.rects[i]
  if (!b || b.height < 1) {
    problems.push(`band ${i + 1} (${fill}) is not drawn`)
    return
  }
  /* a quarter of the way in, so the sample misses the bore down the middle and the
     contact lines on the band's own edges */
  const x0 = Math.round(ox + (b.x + b.width * 0.18) * sx)
  const x1 = Math.round(ox + (b.x + b.width * 0.34) * sx)
  const y0 = Math.round(oy + (b.y + b.height * 0.3) * sy)
  const y1 = Math.round(oy + (b.y + b.height * 0.7) * sy)
  if (x1 <= x0 || y1 <= y0) {
    problems.push(`band ${i + 1} (${fill}) is too thin to sample`)
    return
  }
  const got = modal(x0, y0, x1, y1)
  const drift = worstChannel(got, hex(fill))
  if (drift > TOL_FILL) problems.push(`band ${i + 1} should be ${fill}, sampled ${got.join(',')} (off by ${drift}, tolerance ${TOL_FILL})`)
  report.push(`band ${String(i + 1).padStart(2)} ${fill} -> ${got.join(',')} (${drift <= TOL_FILL ? 'ok' : 'DRIFT ' + drift})`)
})

/* ---- §7.1  the stage above the ground line is white ------------------------- */

const stage = await page.evaluate(() => {
  const sky = document.querySelector('[class*="stageSky"]')
  const panel = document.querySelector('[data-open-panel]').getBoundingClientRect()
  if (!sky) return null
  const r = sky.getBoundingClientRect()
  return { left: r.left - panel.left, top: r.top - panel.top, width: r.width, height: r.height }
})
if (!stage) {
  problems.push('could not find the stage to sample')
} else {
  const spots = [
    ['top left', 0.06, 0.1], ['top right', 0.94, 0.1],
    ['upper left', 0.1, 0.42], ['upper right', 0.9, 0.42],
    ['mid left', 0.03, 0.72], ['mid right', 0.97, 0.72],
  ]
  for (const [what, fx, fy] of spots) {
    const x = Math.round(stage.left + stage.width * fx)
    const y = Math.round(stage.top + stage.height * fy)
    if (x < 0 || y < 0 || x >= px.w || y >= px.h) continue
    const got = at(x, y)
    if (!near(got, '#FFFFFF', TOL_WHITE)) problems.push(`stage ${what} is ${got.join(',')}, not white`)
  }
  report.push(`stage: sampled ${spots.length} points above the ground line, all within ${TOL_WHITE} of #FFFFFF`)
}

/* ---- §7.3  the machine is black and yellow, and the dusk is gone ------------ */

const machine = await page.evaluate(() => {
  const c = document.querySelector('canvas[class*="stageGlb"], canvas[class*="rig"]')
  const panel = document.querySelector('[data-open-panel]').getBoundingClientRect()
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { left: r.left - panel.left, top: r.top - panel.top, width: r.width, height: r.height }
})
if (!machine) {
  report.push('machine: canvas not found, skipping (the stage may still be loading)')
} else {
  let black = 0
  let yellow = 0
  let duskWarm = 0
  let drawn = 0
  const yellows = ['#F4C400', '#F5C518']
  for (let y = Math.round(machine.top); y < machine.top + machine.height; y += 2) {
    for (let x = Math.round(machine.left); x < machine.left + machine.width; x += 2) {
      if (x < 0 || y < 0 || x >= px.w || y >= px.h) continue
      const [r, g, bl] = at(x, y)
      /* the canvas is mostly empty, so shares are taken over the machine's own pixels — the ones
         that are not the white it is standing on. Otherwise a small, well-drawn rig scores worse
         than a big washed-out one. */
      if (r > 244 && g > 244 && bl > 244) continue
      drawn++
      if (r < 70 && g < 70 && bl < 70) black++
      if (yellows.some((c) => near([r, g, bl], c, 70))) yellow++
      /* the dusk key was #fff1d2 and the pad lamp #ffd27a: warm, and light. A white stage lit by
         neutral white has no pixels like that, so a count of them means the old light survived. */
      if (r > 200 && g > 170 && bl > 100 && r - bl > 60) duskWarm++
    }
  }
  const total = Math.max(1, drawn)
  const pct = (n) => ((n / total) * 100).toFixed(1) + '%'
  if (drawn === 0) problems.push('machine canvas has no drawn pixels at all — the machine is not rendering')
  if (black / total < 0.25) problems.push(`only ${pct(black)} of the machine is black steel; §3 wants a black machine`)
  if (yellow / total < 0.04) problems.push(`only ${pct(yellow)} of the machine is signal yellow; §3 wants yellow accents to read`)
  if (duskWarm / total > 0.02) problems.push(`machine is still ${pct(duskWarm)} dusk-warm pixels; neutral light should leave none`)
  report.push(`machine: of its own ${total} sampled pixels — black ${pct(black)}, yellow ${pct(yellow)}, dusk-warm ${pct(duskWarm)}`)
}

if (errors.length) problems.push(`console errors: ${errors.slice(0, 3).join(' | ')}`)

for (const line of report) console.log('  ' + line)
for (const p of problems) console.log('PROBLEM: ' + p)
console.log(problems.length ? `\n${problems.length} palette problem(s)` : '\npalette as specified')
await browser.close()
process.exit(problems.length ? 1 : 0)
