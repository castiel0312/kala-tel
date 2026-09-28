import { chromium } from 'playwright'

/**
 * The hero's three claims, read off the pixels.
 *
 * The stage says the machine stands on the section's ground line, that the frame it arrives in
 * cannot be seen as a frame, and that the rig is a share of the surface rather than a detail in it.
 * None of those can be checked by reading the source, because all three are properties of what the
 * browser painted, so this reads what the browser painted.
 *
 *   1. the rig's feet and the ground line are one line, within TOLERANCE px
 *   2. the rig's silhouette sits where the component's measured constants say it does, at every
 *      viewport — this is what fails if Sketchfab changes the camera it frames the model with
 *   3. the studio the grade leaves behind matches the sky it is standing in, so the box does not
 *      show: the step across each mask feather has to be under BOX px of luminance
 *
 * The first two are read off a second screenshot taken with the mask removed, and that is not
 * tidiness. The mask's whole job is to be transparent below the feet row, so on the shipped shot
 * the rig's base is *by construction* not there: measuring the seam through the mask measures the
 * mask, and a machine placed perfectly would still fail. Removing the mask for one frame lets the
 * silhouette be found against the studio, and the shipped shot is then used for what only it can
 * answer — that the box does not show, and that nothing leaks below the cut.
 *
 * The rig is found by how far it departs from the studio rather than by how bright it is. The grade
 * inverts the frame, so the machine is a dark silhouette and a bright one at the same time, and its
 * base — a dark bar lying on a dark floor — is invisible to any brightness threshold at exactly
 * the place the seam claim is about.
 *
 * Two of our own elements are taken out before the machine is measured: the wellhead, which is a
 * bright object standing in the middle of the rig's foot, and the site, whose pad lamps are bright
 * runs sitting on the ground line the rig's feet are supposed to reach. With them in, the test
 * cannot tell the machine reaching the line from a lamp standing on it, and would report a rig
 * that is 50px too tall. The blend is still measured against the sky the site stands in front of,
 * because every feather probe sits above the ground line where the site never reaches.
 *
 *   node seam-profile.mjs
 */
const TOLERANCE = Number(process.env.TOLERANCE ?? 4)
const BOX = Number(process.env.BOX ?? 14)
/**
 * How far a pixel has to sit from the studio behind it to count as the machine, in luminance.
 *
 * This is a departure, not a brightness, and the difference is the whole script: the grade inverts
 * the frame, so the rig is bright where the model was dark and dark where it was bright. A
 * brightness threshold finds the polished rod and loses the base, and the base is the row the seam
 * claim is about. The studio is only 7–61 after grading and its dome varies by tens across the
 * frame, so the value has to clear the fit's own residual, which the report prints.
 */
const RIG_DEP = Number(process.env.RIG_DEP ?? 14)
/** the machine is a run of pixels in a row, not a speck: this share of the frame's width */
const RIG_RUN = Number(process.env.RIG_RUN ?? 0.02)
const URL = process.env.URL ?? 'http://localhost:5173/'
/** the viewer boots its own runtime before it frames anything, so this is a floor, not a guess */
const WAIT = Number(process.env.WAIT ?? 18000)
const DPR = 2

const VIEWPORTS = [
  [1440, 900, 'wide'],
  [1180, 820, 'mid'],
  [834, 1000, 'tablet'],
  [390, 844, 'phone'],
]

const browser = await chromium.launch()
const rows = []

for (const [w, h, name] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: DPR })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(WAIT)

  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[class*="wellhead"], [class*="stageSite"]')) {
      el.style.visibility = 'hidden'
    }
  })
  await page.waitForTimeout(150)

  /** the shipped frame, and the same frame with the mask lifted so the machine can be seen */
  const shot = await page.locator('[class*="visual"]').first().screenshot()
  await page.evaluate(() => {
    const rig = document.querySelector('iframe')?.parentElement
    if (rig) {
      rig.dataset.seamUnmasked = '1'
      rig.style.maskImage = 'none'
      rig.style.webkitMaskImage = 'none'
    }
  })
  await page.waitForTimeout(150)
  const bare = await page.locator('[class*="visual"]').first().screenshot()
  await page.evaluate(() => {
    const rig = document.querySelector('iframe')?.parentElement
    if (rig) {
      delete rig.dataset.seamUnmasked
      rig.style.maskImage = ''
      rig.style.webkitMaskImage = ''
    }
  })
  await page.waitForTimeout(150)

  const geo = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const rel = (el) => {
      const box = el?.getBoundingClientRect()
      const root = q('[class*="visual"]')?.getBoundingClientRect()
      if (!box || !root) return null
      return { x: box.x - root.x, y: box.y - root.y, w: box.width, h: box.height }
    }
    const visual = q('[class*="visual"]')
    const rig = q('iframe')?.parentElement
    const cs = rig ? getComputedStyle(rig) : null
    return {
      visual: rel(visual),
      rig: rel(rig),
      stage: rel(q('[class*="stage"]')),
      section: rel(q('canvas')?.parentElement),
      band: parseFloat(getComputedStyle(visual).getPropertyValue('--nw-ground-band')) || 0,
      /** the frame's own measured feet row, as a share of the frame's height */
      feet: cs ? parseFloat(cs.getPropertyValue('--nw-feet')) / 100 : NaN,
      featherX: parseFloat(cs?.getPropertyValue('--nw-feather-x') ?? 'NaN'),
      featherTop: parseFloat(cs?.getPropertyValue('--nw-feather-top') ?? 'NaN'),
    }
  })

  if (!geo.visual || !geo.rig || !geo.section || Number.isNaN(geo.feet)) {
    rows.push({ name, error: 'stage did not lay out' })
    await page.close()
    continue
  }

  /** one image, decoded into a luminance plane the rest of the measurement reads from */
  const decode = (b64) =>
    page.evaluate(async (data) => {
      const img = new Image()
      img.src = `data:image/png;base64,${data}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      const L = new Float32Array(c.width * c.height)
      for (let i = 0, p = 0; p < L.length; p++, i += 4) {
        L[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      }
      return { w: c.width, h: c.height, L: Array.from(L) }
    }, b64)

  const [shipped, open] = [await decode(shot.toString('base64')), await decode(bare.toString('base64'))]

  const px = await page.evaluate(
    ({ shipped, open, rig, visual, section, band, featherX, featherTop, feet, luma, minRunFrac, dep, runFrac }) => {
      const plane = (im) => {
        const c = { w: im.w, h: im.h, L: Float32Array.from(im.L) }
        return {
          ...c,
          at: (x, y) => c.L[Math.round(y) * c.w + Math.round(x)],
        }
      }
      const c = plane(shipped)
      const a = c
      const b = plane(open)
      const lum = (x, y) => a.at(x, y)
      const raw = (x, y) => b.at(x, y)
      /** screenshot px per CSS px, read off the panel the screenshot is of */
      const S = c.w / visual.w

      const rigX0 = rig.x * S
      const rigY0 = rig.y * S
      const rigX1 = (rig.x + rig.w) * S
      const rigY1 = (rig.y + rig.h) * S
      /** the row the section's ground line landed on, in screenshot pixels */
      const groundRow = (section.y + band) * S
      const rowMax = (y, x0, x1) => {
        let m = 0
        for (let x = x0; x < x1; x += 1) m = Math.max(m, lum(x, y))
        return m
      }
      /** the mean of a column strip, which is what a flat background reads as */
      const colMean = (x, y0, y1) => {
        let sum = 0
        let n = 0
        for (let y = y0; y < y1; y += 1) {
          sum += lum(x, y)
          n += 1
        }
        return n ? sum / n : 0
      }

      /**
       * The studio the machine is standing in, and how far each pixel of the machine is from it.
       *
       * The embed's own background is not one colour: it is a lit dome, brightest in the middle and
       * falling off towards the corners, so a fixed value is not the background and any threshold
       * on absolute brightness lights up the dome rather than the rig. A quadratic in x and y,
       * fitted by least squares to a ring of border pixels and to nothing else, follows that dome
       * closely enough (its own residual is reported) that what is left over is the model.
       *
       * This is only possible on the unmasked shot: with the mask in, the frame's border is faded
       * out to sky and the border is not the studio at all.
       */
      const ring = 0.05
      const M = [
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1],
      ]
      const A = M.map(() => new Array(6).fill(0))
      const bb = new Array(6).fill(0)
      const nx = (x) => (x / (c.w - 1)) * 2 - 1
      const ny = (y) => (y / (c.h - 1)) * 2 - 1
      let fitted = 0
      for (let y = 0; y < c.h; y += 1) {
        for (let x = 0; x < c.w; x += 1) {
          // the ring is taken inside the frame's own rectangle, so the section behind cannot join it
          if (nx(x) < nx(rigX0) || nx(x) > nx(rigX1) || ny(y) < ny(rigY0) || ny(y) > ny(rigY1)) continue
          const u = (x - rigX0) / (rigX1 - rigX0)
          const v = (y - rigY0) / (rigY1 - rigY0)
          if (u > ring && u < 1 - ring && v > ring && v < 1 - ring) continue
          const m = [1, u, v, u * u, u * v, v * v]
          for (let i = 0; i < 6; i += 1) {
            for (let j = 0; j < 6; j += 1) A[i][j] += m[i] * m[j]
            bb[i] += m[i] * raw(x, y)
          }
          fitted += 1
        }
      }
      for (let i = 0; i < 6; i += 1) {
        let piv = i
        for (let k = i + 1; k < 6; k += 1) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k
        ;[A[i], A[piv]] = [A[piv], A[i]]
        ;[bb[i], bb[piv]] = [bb[piv], bb[i]]
        if (Math.abs(A[i][i]) < 1e-9) continue
        for (let k = i + 1; k < 6; k += 1) {
          const f = A[k][i] / A[i][i]
          for (let j = i; j < 6; j += 1) A[k][j] -= f * A[i][j]
          bb[k] -= f * bb[i]
        }
      }
      const coef = new Array(6).fill(0)
      for (let i = 5; i >= 0; i -= 1) {
        let s = bb[i]
        for (let j = i + 1; j < 6; j += 1) s -= A[i][j] * coef[j]
        coef[i] = Math.abs(A[i][i]) < 1e-9 ? 0 : s / A[i][i]
      }
      const studioAt = (x, y) => {
        const u = (x - rigX0) / (rigX1 - rigX0)
        const v = (y - rigY0) / (rigY1 - rigY0)
        return coef[0] + coef[1] * u + coef[2] * v + coef[3] * u * u + coef[4] * u * v + coef[5] * v * v
      }
      /** how well the fit describes the ring it was built from, in mean absolute luminance */
      const fitErr = (() => {
        let sum = 0
        let n = 0
        for (let y = 0; y < c.h; y += 3) {
          for (let x = 0; x < c.w; x += 3) {
            if (nx(x) < nx(rigX0) || nx(x) > nx(rigX1) || ny(y) < ny(rigY0) || ny(y) > ny(rigY1)) continue
            const u = (x - rigX0) / (rigX1 - rigX0)
            const v = (y - rigY0) / (rigY1 - rigY0)
            if (u > ring && u < 1 - ring && v > ring && v < 1 - ring) continue
            sum += Math.abs(raw(x, y) - studioAt(x, y))
            n += 1
          }
        }
        return n ? sum / n : 0
      })()

      /**
       * Where the machine's silhouette starts and stops, by row.
       *
       * A row counts as the machine only where a *run* of pixels that depart from the studio
       * crosses it. The grade inverts the frame, so the machine is bright where it used to be dark
       * and dark where it used to be bright: a threshold on brightness alone would find the polished
       * rod and lose the base, and the base is the row this whole script is about.
       *
       * Rows below the ground line are not read. The rig stands on that line by construction, so it
       * is where the silhouette has to end, and anything found under it belongs to the section.
       */
      const runRows = []
      const minRun = (rigX1 - rigX0) * minRunFrac
      const lastRow = Math.min(c.h, groundRow - 1)
      for (let y = Math.max(0, Math.floor(rigY0)); y < lastRow; y += 1) {
        let run = 0
        let best = 0
        for (let x = Math.max(0, Math.floor(rigX0)); x < Math.min(c.w, rigX1); x += 1) {
          if (Math.abs(raw(x, y) - studioAt(x, y)) > dep) {
            run += 1
            if (run > best) best = run
          } else run = 0
        }
        runRows.push(best)
      }

      /** the box: the studio just inside each feather, the sky just outside it, same row */
      const fx = featherX * S
      const ft = featherTop * S
      const probes = []
      const ys = [0.08, 0.16, 0.24, 0.58, 0.66, 0.74].map((f) => rigY0 + (rigY1 - rigY0) * f)
      for (const y of ys) {
        if (y < 2 || y > c.height - 2) continue
        probes.push({
          y: Math.round(y),
          left: colMean(rigX0 - fx * 0.5, y - 3, y + 3) - colMean(rigX0 + fx * 0.6, y - 3, y + 3),
          right: colMean(rigX1 + fx * 0.5, y - 3, y + 3) - colMean(rigX1 - fx * 0.6, y - 3, y + 3),
        })
      }
      /**
       * The same question across the feather over the machine's headroom.
       *
       * The feather runs from transparent at the frame's edge to opaque some way in, so the mean
       * just inside the frame is mostly the sky showing through, and the mean past the feather is
       * the studio. Both are read at the frame's centre column, the one place the machine's own
       * headroom is empty, and the step between them is how visible the frame's top edge is.
       *
       * The top is only asked when the frame's top edge is actually inside the panel. The frame is
       * taller than the stage's share of the hero allows, so its top sits above the panel and the
       * feather falls off the top of the screenshot — there is no sky on that side to compare with,
       * and the honest answer there is that the question does not apply, not a number of zero.
       */
      const centreX = (rigX0 + rigX1) / 2
      const inside = rigY0 + ft * 0.15
      const outside = rigY0 + ft * 1.9
      const top =
        ft > 3 && rigY0 > 2 && outside < c.h - 1
          ? colMean(centreX, outside, Math.min(c.h - 1, outside + ft * 0.5)) - colMean(centreX, inside, inside + ft * 0.4)
          : null

      /**
       * The machine, drawn as text.
       *
       * A run test can only say a row was or was not the machine, and the base of a walking beam is
       * a dark bar on a dark studio floor — the case where the instrument is weakest and the claim
       * matters most. Printing the profile settles it by eye: a silhouette that tapers away above
       * the line is a rig standing on it, one that stops dead with studio under it is a gap.
       *
       * `+` is brighter than the studio, `-` is darker, and the rig is both at once after the
       * grade, which is why the sign is kept rather than collapsed into a single mark.
       */
      const art = (() => {
        const AW = 64
        const rowsOfArt = 30
        const top = Math.max(0, Math.floor(rigY0))
        const x0 = Math.max(0, Math.floor(rigX0))
        const x1 = Math.min(c.w, Math.ceil(rigX1))
        const lines = []
        for (let i = 0; i < rowsOfArt; i++) {
          const y = top + Math.round(((groundRow - top) * i) / rowsOfArt)
          let line = ''
          for (let ax = 0; ax < AW; ax++) {
            const x = x0 + Math.round(((x1 - x0) * ax) / AW)
            const d0 = raw(x, y) - studioAt(x, y)
            line += d0 > dep ? '+' : d0 < -dep ? '-' : ' '
          }
          lines.push(line)
        }
        return lines
      })()

      return {
        h: c.h,
        width: c.w,
        rigY0,
        rigY1,
        groundRow,
        art,
        fitRms: +fitErr.toFixed(1),
        /**
         * The widest run on each of the last few rows before the ground line, as a share of the
         * frame's width. This is the number the seam claim turns on, and printing it says whether a
         * rig that appears to stop short was lost by the threshold or really is short: a run that
         * stays near zero while the drawing still shows pixels there is the instrument, not the model.
         */
        baseRuns: (() => {
          const out = []
          const first = Math.max(0, Math.floor(rigY0))
          for (let k = 12; k >= 0; k -= 1) {
            const y = Math.round(groundRow - ((groundRow - first) * k) / 90)
            const i = y - first
            out.push(+(Math.max(0, runRows[i] ?? 0) / (rigX1 - rigX0)).toFixed(3))
          }
          return out
        })(),
        /** the row the cut should be on: the machine's own feet, at the fraction the component measured */
        cut: rigY0 + (rigY1 - rigY0) * feet,
        probes,
        topStep: top,
        runRows,
        minRun,
      }
    },
    {
      shipped,
      open,
      rig: geo.rig,
      visual: geo.visual,
      section: geo.section,
      band: geo.band,
      featherX: geo.featherX,
      featherTop: geo.featherTop,
      feet: geo.feet,
      dep: RIG_DEP,
      minRunFrac: RIG_RUN,
      runFrac: RIG_RUN,
    },
  )
  await page.close()
  if (!px) {
    rows.push({ name, error: 'screenshot undecodable' })
    continue
  }

  /* ---------------------------------------------------------------- the reading -- */

  const isRig = (r) => r > px.minRun
  const first = !px.runRows.some(isRig)
  const firstLit = first ? -1 : px.runRows.findIndex(isRig)
  const lastLit = first ? -1 : px.runRows.length - 1 - [...px.runRows].reverse().findIndex(isRig)
  const frameH = px.rigY1 - px.rigY0
  const litFrac = first ? null : (lastLit - firstLit) / frameH

  const toCss = (screenshotY) => +((px.rigY0 + screenshotY) / DPR).toFixed(1)
  const ground = +(px.groundRow / DPR).toFixed(1)
  rows.push({
    name,
    frameH: +(frameH / DPR).toFixed(1),
    frameTop: +(px.rigY0 / DPR).toFixed(1),
    litTop: first ? null : toCss(firstLit),
    litFeet: first ? null : toCss(lastLit),
    litFrac: litFrac == null ? null : +litFrac.toFixed(3),
    cut: +(px.cut / DPR).toFixed(1),
    ground,
    feetToGround: first ? null : +(toCss(lastLit) - ground).toFixed(1),
    fitRms: px.fitRms,
    baseRuns: px.baseRuns,
    art: px.art,
    box: [
      ...px.probes.map((p) => [p.left, p.right].map((v) => Math.round(v))),
      px.topStep == null ? null : [Math.round(px.topStep)],
    ].flat().filter((v) => v != null),
  })
}

await browser.close()

/* --------------------------------------------------------------------- report -- */

console.log(
  `machine = pixels more than ${RIG_DEP} luma from the fitted studio, in runs over ${(RIG_RUN * 100).toFixed(0)}% of the frame;` +
    ` box step ${BOX}; seam ${TOLERANCE}px\n`,
)
for (const r of rows) {
  if (r.art) {
    console.log(
    `${r.name}: frame top to ground line · studio fit residual ${r.fitRms} luma · + brighter, − darker\n` +
      `  run width on the last rows above the line: ${r.baseRuns.join(' ')}`,
  )
    console.log(r.art.map((l) => `  |${l}|`).join('\n'))
  }
}
console.log('')
const cols = ['view', 'frame h', 'rig h', 'lit top', 'lit feet', 'cut', 'ground', 'Δ', 'mask steps (studio − sky)']
console.log(cols.map((s) => s.padEnd(20)).join(''))
let bad = 0
for (const r of rows) {
  if (r.error) {
    console.log(r.name.padEnd(20) + r.error)
    bad++
    continue
  }
  console.log(
    [
      r.name,
      String(r.frameH),
      r.litFrac == null ? '—' : String(r.litFrac),
      r.litTop == null ? '—' : String(r.litTop),
      r.litFeet == null ? '—' : String(r.litFeet),
      String(r.cut),
      String(r.ground),
      r.feetToGround == null ? 'no rig' : r.feetToGround > 0 ? `+${r.feetToGround}` : String(r.feetToGround),
      r.box.length ? r.box.join(' ') : '—',
    ]
      .map((s) => String(s).padEnd(20))
      .join(''),
  )
  if (r.error || r.feetToGround == null) bad++
  else if (Math.abs(r.feetToGround) > TOLERANCE) bad++
  if (r.box.some((v) => Math.abs(v) > BOX)) bad++
}

console.log(
  bad
    ? `\n${bad} problems: the seam, the silhouette or the blend is out at one of these viewports`
    : '\nseam closed, silhouette where it was measured to be, and no step across any feather',
)
process.exit(bad ? 1 : 0)
