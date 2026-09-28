import { chromium } from 'playwright'

/**
 * Where the rig's feet really are, at the size the hero actually renders the frame.
 *
 * `pumpjack-profile.mjs` measures the embed at 900x640 and `seam-profile.mjs` finds the machine
 * sitting ~10px above the ground line in the hero. Those two disagree, and the disagreement has to
 * be one of three things: the constant is right and the hero's instrument is wrong, the constant is
 * wrong at small frame sizes, or the component is placing the frame off the measured silhouette.
 *
 * This settles it by measuring the same two things at the same size in one place: the bare embed
 * rendered inside the hero's real frame rectangle, and the feet fraction the component is placing
 * the ground line at. If they agree, the placement is right and the seam script is misreading. If
 * they differ, the constant is what has to move.
 *
 *   node probe-feet.mjs
 */
const URL = process.env.URL ?? 'http://localhost:5173/'
const WAIT = Number(process.env.WAIT ?? 18000)
const DPR = 2
const VIEWPORTS = [
  [1440, 900, 'wide'],
  [1180, 820, 'mid'],
  [834, 1000, 'tablet'],
  [390, 844, 'phone'],
]
/** the fraction the component cuts at, which the stage reads off RIG.feet */
const CUT = 0.858

const browser = await chromium.launch()
console.log(`component cuts at feet=${CUT} of the frame; measuring the embed in the hero's own frame rect\n`)
console.log(['view', 'frame w x h', 'topFrac', 'feetFrac', 'cut − feet', 'stripSpread', 'modelFrac'].map((s) => s.padEnd(18)).join(''))

for (const [w, h, name] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: DPR })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(WAIT)

  /** the iframe's own box, and the feet fraction the wrapper was told to cut at */
  const geo = await page.evaluate(() => {
    const frame = document.querySelector('iframe')
    const box = frame?.getBoundingClientRect()
    const cs = frame?.parentElement ? getComputedStyle(frame.parentElement) : null
    return {
      w: box?.width ?? 0,
      h: box?.height ?? 0,
      feet: cs ? parseFloat(cs.getPropertyValue('--nw-feet')) / 100 : NaN,
    }
  })
  if (!geo.w || !geo.h || Number.isNaN(geo.feet)) {
    console.log(`${name}: no frame`)
    await page.close()
    continue
  }

  /**
   * The embed on its own, at the exact size the hero gives it.
   *
   * The mask is on the iframe's wrapper and the grade is on the iframe, so both are lifted: the mask
   * to see the studio behind the machine, and the grade because this question is about where the
   * model is, not about how the hero renders it — a grade that inverts the frame turns the studio's
   * smooth dome into something the background fit cannot follow, and the measurement then describes
   * the filter instead of the model.
   *
   * The frame is left exactly where the hero put it: moving it would change the size the measurement
   * is supposed to be about.
   */
  await page.evaluate(() => {
    const wrap = document.querySelector('iframe')?.parentElement
    if (wrap) {
      wrap.style.maskImage = 'none'
      wrap.style.webkitMaskImage = 'none'
    }
    const frame = document.querySelector('iframe')
    if (frame) frame.style.filter = 'none'
    // the site and the wellhead are drawn over the frame, and both are bright and wide: left in,
    // they are read as the model, which is exactly the mistake this probe exists to rule out
    for (const el of document.querySelectorAll('[class*="wellhead"], [class*="stageSite"], [class*="stageSky"]')) {
      el.style.visibility = 'hidden'
    }
  })
  await page.waitForTimeout(300)
  const shot = await page.locator('iframe').first().screenshot()

  const out = await page.evaluate(
    async ({ b64, thr }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      const L = new Float32Array(c.width * c.height)
      for (let i = 0, p = 0; p < L.length; p++, i += 4) L[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]

      // the same smooth-dome background fit pumpjack-profile.mjs uses, so the two agree
      const M = [[1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1]]
      const A = M.map(() => new Array(6).fill(0))
      const b = new Array(6).fill(0)
      const ring = 0.055
      const nx = (x) => (x / (c.width - 1)) * 2 - 1
      const ny = (y) => (y / (c.height - 1)) * 2 - 1
      let fitted = 0
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (Math.abs(nx(x)) < 1 - 2 * ring && Math.abs(ny(y)) < 1 - 2 * ring) continue
          const m = [1, nx(x), ny(y), nx(x) * nx(x), nx(x) * ny(y), ny(y) * ny(y)]
          for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) A[i][j] += m[i] * m[j]
            b[i] += m[i] * L[y * c.width + x]
          }
          fitted++
        }
      }
      for (let i = 0; i < 6; i++) {
        let piv = i
        for (let k = i + 1; k < 6; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k
        ;[A[i], A[piv]] = [A[piv], A[i]]
        ;[b[i], b[piv]] = [b[piv], b[i]]
        if (Math.abs(A[i][i]) < 1e-9) continue
        for (let k = i + 1; k < 6; k++) {
          const f = A[k][i] / A[i][i]
          for (let j = i; j < 6; j++) A[k][j] -= f * A[i][j]
          b[k] -= f * b[i]
        }
      }
      const coef = new Array(6).fill(0)
      for (let i = 5; i >= 0; i--) {
        let s = b[i]
        for (let j = i + 1; j < 6; j++) s -= A[i][j] * coef[j]
        coef[i] = Math.abs(A[i][i]) < 1e-9 ? 0 : s / A[i][i]
      }
      const bg = (x, y) => {
        const u = nx(x)
        const v = ny(y)
        return coef[0] + coef[1] * u + coef[2] * v + coef[3] * u * u + coef[4] * u * v + coef[5] * v * v
      }
      const dep = new Float32Array(L.length)
      let mn = 0
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          dep[y * c.width + x] = Math.abs(L[y * c.width + x] - bg(x, y))
          if (dep[y * c.width + x] > thr) mn++
        }
      }
      const rowRun = []
      for (let y = 0; y < c.height; y++) {
        let best = 0
        let run = 0
        for (let x = 0; x < c.width; x++) {
          if (dep[y * c.width + x] > thr) {
            run++
            if (run > best) best = run
          } else run = 0
        }
        rowRun.push(best / c.width)
      }
      const lit = []
      for (let y = 0; y < c.height; y++) if (rowRun[y] > 0.02) lit.push(y)
      // the run profile's own tail, printed so a threshold that is losing the base is visible
      const tail = []
      for (let y = Math.max(0, lit[0] ?? 0); y < c.height; y += Math.max(1, Math.round(c.height * 0.02))) {
        tail.push(+rowRun[y].toFixed(2))
      }

      /** the frame as text, for when the numbers disagree with each other */
      const AW = 78
      const AH = 34
      const ramp = ' .:-=+*#%@'
      const art = []
      for (let ay = 0; ay < AH; ay++) {
        let line = ''
        for (let ax = 0; ax < AW; ax++) {
          const sx = Math.floor((ax / AW) * c.width)
          const sy = Math.floor((ay / AH) * c.height)
          const p = sy * c.width + sx
          line += dep[p] > thr ? '#' : ramp[Math.min(ramp.length - 1, Math.round((L[p] / 255) * 9))]
        }
        art.push(line)
      }
      let fitErr = 0
      for (let y = 0; y < c.height; y += 3) {
        for (let x = 0; x < c.width; x += 3) {
          if (Math.abs(nx(x)) < 1 - 2 * ring && Math.abs(ny(y)) < 1 - 2 * ring) continue
          fitErr += Math.abs(L[y * c.width + x] - bg(x, y))
        }
      }
      return {
        topFrac: lit.length ? +(lit[0] / c.height).toFixed(3) : null,
        feetFrac: lit.length ? +(lit[lit.length - 1] / c.height).toFixed(3) : null,
        spread: +(fitErr / (fitted / 9)).toFixed(1),
        modelFrac: +(mn / dep.length).toFixed(3),
        tail,
        art: art.join('\n'),
        /** a column and a row of raw luminance, so a wrong-looking frame can be diagnosed as numbers */
        columnDown: [0, 0.02, 0.05, 0.08, 0.12, 0.2, 0.5, 0.8, 0.95, 0.99].map((f) =>
          Math.round(L[Math.round(f * (c.height - 1)) * c.width + Math.round(c.width * 0.5)]),
        ),
        rowAcrossTop: [0.02, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.98].map((f) =>
          Math.round(L[Math.round(c.height * 0.02) * c.width + Math.round(f * (c.width - 1))]),
        ),
        rowAcrossFeet: [0.02, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.98].map((f) =>
          Math.round(L[Math.round(c.height * 0.86) * c.width + Math.round(f * (c.width - 1))]),
        ),
      }
    },
    { b64: shot.toString('base64'), thr: 26 },
  )
  await page.close()
  if (!out || out.feetFrac == null) {
    console.log(`${name}: no silhouette in the embed`)
    continue
  }
  console.log(
    [
      name,
      `${Math.round(geo.w)} x ${Math.round(geo.h)}`,
      String(out.topFrac),
      String(out.feetFrac),
      (CUT - out.feetFrac).toFixed(3),
      String(out.spread),
      String(out.modelFrac),
    ]
      .map((s) => String(s).padEnd(18))
      .join(''),
  )
  if (process.env.ART) {
    console.log(`  run profile, every 2% of the frame: ${out.tail.join(' ')}`)
    console.log(`  luma down the centre column, 0→1: ${out.columnDown.join(' ')}`)
    console.log(`  luma across row 2%: ${out.rowAcrossTop.join(' ')}`)
    console.log(`  luma across row 86%: ${out.rowAcrossFeet.join(' ')}`)
    console.log(out.art)
  }
}

await browser.close()
