import { chromium } from 'playwright'

/**
 * Checks the landing page's pumping unit now that its geometry has moved to `src/features/map3d`.
 *
 * The machine used to be built in `components/landing/rigUnit.ts`; it is now built once in
 * `wellModels.ts` and both the hero and the map's GLB come out of it. That is the only way the rig
 * in the hero and the rig on the map can be the same object, and it is exactly the kind of change
 * a TypeScript build accepts cheerfully and a reader notices immediately.
 *
 * So this measures the machine rather than the build:
 *
 *   lit      pixels standing above the dusk sky, counted in the rows *above the ground band* — the
 *            machine's silhouette, with the ground excluded, because the ground is a legal part of
 *            this scene that is not part of the machine
 *   warm     pixels where red leads blue, which is the machine's signal yellow surviving the key
 *            light; counted warm rather than near-exact, because a lit 3D surface is a tone-mapped
 *            version of its albedo and asking for #F4C400 off a shaded face asks for the wrong thing
 *   motion   pixels that differ between two frames a quarter of a stroke apart. This is the real
 *            test that the solved linkage is still driving the geometry: a static model, a broken
 *            `set()`, or a clip that never plays all leave this at zero
 *
 * `MAP=1` prints the frame as ASCII, because a picture of a picture is the only way to tell a
 * machine's silhouette from its own shadow.
 *
 *   node verify-pumpjack.mjs
 *   MAP=1 node verify-pumpjack.mjs
 */
const URL = process.env.URL ?? 'http://localhost:5173/'
const MAP = process.env.MAP === '1'
const VIEWPORTS = [
  [1512, 950],
  [1440, 900],
  [1180, 820],
  [390, 844],
]
/** a pixel counts as standing above the sky at this much luminance above the sky's own value */
const LIT = 22
/**
 * Where the ground band starts, as a fraction of the canvas height.
 *
 * Read off the frame rather than guessed: the ground reads brighter than the sky, so a silhouette
 * measured over the whole canvas is really a silhouette of the ground. Everything at or below this
 * row is not the machine.
 */
const GROUND_ROW = 0.78
/** the machine must fill at least this share of the sky above the ground */
const MIN_SHARE = 0.004
/** …and be at least this many pixels, so a phone viewport is not excused by the ratio */
const MIN_LIT = 700
/** a quarter of a stroke: enough for the beam to be visibly somewhere else */
const STROKE_S = 6.4
const FRAME_GAP = Math.round((STROKE_S * 1000) / 4)

/**
 * Reads the stage's presented frame.
 *
 * Not by drawing the WebGL canvas into a 2D context: the stage does not ask for
 * `preserveDrawingBuffer`, so a `drawImage` of that canvas outside its own frame comes back black
 * and every count reads zero. Playwright's element screenshot goes through the compositor and gets
 * the frame as presented, which is the frame a reader sees. The PNG is decoded back in the page
 * because this project has no PNG decoder in its dependencies to decode it out here.
 */
const analyse = async (page, shot) => {
  const b64 = shot.toString('base64')
  if (MAP) {
    const rows = await page.evaluate(async (data) => {
      const img = new Image()
      img.src = `data:image/png;base64,${data}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const W = c.width
      const H = c.height
      const px = ctx.getImageData(0, 0, W, H).data
      const COLS = 96
      const ROWS = 34
      const ramp = ' .:-=+*#%@'
      const out = []
      for (let ry = 0; ry < ROWS; ry += 1) {
        let line = ''
        for (let cx = 0; cx < COLS; cx += 1) {
          const sx = Math.floor(((cx + 0.5) * W) / COLS)
          const sy = Math.floor(((ry + 0.5) * H) / ROWS)
          const i = (sy * W + sx) * 4
          const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255
          line += ramp[Math.min(ramp.length - 1, Math.floor(lum * ramp.length))]
        }
        out.push(line)
      }
      return out
    }, b64)
    console.log(rows.join('\n'))
    return null
  }
  return page.evaluate(
    async ({ data, lit, groundRow, tol }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${data}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const W = c.width
      const H = c.height
      const px = ctx.getImageData(0, 0, W, H).data
      const lum = (i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]

      /** the sky's own luminance: the most common value in a dusk gradient */
      const hist = new Uint32Array(256)
      for (let i = 0; i < px.length; i += 4) hist[Math.min(255, Math.round(lum(i)))] += 1
      let sky = 0
      for (let i = 1; i < 256; i += 1) if (hist[i] > hist[sky]) sky = i

      const cut = Math.floor(H * groundRow)
      const box = { x0: W, y0: cut, x1: -1, y1: -1, n: 0 }
      let warm = 0
      for (let y = 0; y < cut; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const i = (y * W + x) * 4
          if (lum(i) > sky + lit) {
            if (x < box.x0) box.x0 = x
            if (y < box.y0) box.y0 = y
            if (x > box.x1) box.x1 = x
            if (y > box.y1) box.y1 = y
            box.n += 1
          }
          if (px[i] > px[i + 2] + 40 && px[i] > 60) warm += 1
        }
      }
      return {
        w: W,
        h: H,
        sky,
        lit: box.n,
        litBox: box.n ? { x: box.x0, y: box.y0, w: box.x1 - box.x0 + 1, h: box.y1 - box.y0 + 1 } : null,
        warm,
        px: Array.from(px),
      }
    },
    { data: b64, lit: LIT, groundRow: GROUND_ROW, tol: 0 },
  )
}

/** Pixels that changed between two frames — the machine's own motion, lighting held constant. */
const changed = (a, b) => {
  let n = 0
  const A = a.px
  const B = b.px
  for (let i = 0; i < A.length; i += 4) {
    const d =
      Math.abs(0.2126 * (A[i] - B[i]) + 0.7152 * (A[i + 1] - B[i + 1]) + 0.0722 * (A[i + 2] - B[i + 2]))
    if (d > 10) n += 1
  }
  return n
}

const browser = await chromium.launch()
let failures = 0
for (const [width, height] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 200)))
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 })
  /** the rig module is lazily imported by the stage, so give it room to arrive and draw */
  await page.waitForTimeout(4000)

  if (!(await page.locator('canvas').count())) {
    console.log(`=== ${width}x${height} ===\n  FAIL no canvas on the page`)
    failures += 1
    await page.close()
    continue
  }

  const selector = '[class*="rig"] canvas, canvas'
  const a = await analyse(page, await page.locator(selector).first().screenshot())
  await page.waitForTimeout(FRAME_GAP)
  const b = await analyse(page, await page.locator(selector).first().screenshot())

  if (MAP) {
    await page.close()
    continue
  }

  const share = a.lit / (a.w * a.h * GROUND_ROW)
  const moved = changed(a, b)
  const ok = a.lit >= MIN_LIT && share >= MIN_SHARE && a.warm > 20 && moved > 200
  if (!ok) failures += 1

  console.log(`=== ${width}x${height} ===`)
  console.log(
    JSON.stringify(
      {
        canvas: `${a.w}x${a.h}`,
        sky: a.sky,
        litPx: a.lit,
        litShare: Number(share.toFixed(4)),
        litBox: a.litBox,
        warmPx: a.warm,
        movedPx: moved,
        errors: errors.slice(0, 4),
      },
      null,
      1,
    ),
  )
  console.log(ok ? 'ok' : 'FAIL')
  await page.close()
}
await browser.close()
if (!MAP) {
  console.log(
    failures
      ? `\n${failures} viewport(s) failed`
      : '\npump jack present, coloured and animating at every viewport',
  )
}
process.exit(failures ? 1 : 0)
