import { chromium } from 'playwright'

/**
 * Profiles a Sketchfab embed, so the stage's geometry comes from the model's own pixels.
 *
 * The pumpjack is a published model inside somebody else's document: it brings a studio
 * background and a camera framing we do not control, and the only honest way to place it is to
 * look at where it actually landed. This renders the bare embed at a known size and aspect,
 * separates the model from its background, and reports the numbers the stage needs — the row
 * the rig's feet stand on, and the box its silhouette occupies — as fractions of the frame, so
 * one measurement can drive every viewport.
 *
 * It also prints the frame as ASCII, because a picture of a picture is the only way to tell a
 * silhouette from its own shadow, and because the eye is the last check on a threshold.
 *
 *   node pumpjack-profile.mjs
 *   MODEL=b5d3e545213a47c49c4ae299cb0159a5 ASPECT=1.40625 node pumpjack-profile.mjs
 */
const MODELS = process.env.MODEL
  ? [{ uid: process.env.MODEL, label: process.env.LABEL ?? 'MODEL' }]
  : [
      { uid: '7c5fdd845bf54d3e80d954bd4b08c5b5', label: 'current (Felnev walking-beam)' },
      { uid: 'b5d3e545213a47c49c4ae299cb0159a5', label: 'prompt (Oil Pump Jack)' },
    ]
const ASPECT = Number(process.env.ASPECT ?? 1.40625)
const H = Number(process.env.H ?? 640)
const W = Math.round(H * ASPECT)
const WAIT = Number(process.env.WAIT ?? 14000)
/** departure from the background wash, in luminance, that counts as model */
const THR = Number(process.env.THR ?? 26)
const EMBED = (uid) =>
  `https://sketchfab.com/models/${uid}/embed?ui_watermark_link=0&ui_watermark=0&ui_infos=0&ui_hint=0&ui_controls=0&ui_settings=0&ui_share=0&ui_vr=0&ui_fullscreen=1&ui_annotations=0&ui_help=0&ui_inspector=0&dpr=1`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

for (const { uid, label } of MODELS) {
  await page.goto(EMBED(uid), { waitUntil: 'domcontentloaded' })
  // The viewer boots its own runtime and only then frames the model; give it room, then settle.
  await page.waitForTimeout(WAIT)

  const b64 = (await page.screenshot({ type: 'jpeg', quality: 92 })).toString('base64')
  const out = await page.evaluate(
    async ({ b64, thr }) => {
      const img = new Image()
      img.src = `data:image/jpeg;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      const L = new Float32Array(c.width * c.height)
      for (let i = 0, p = 0; p < L.length; p++, i += 4) {
        L[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      }

      /**
       * Background model: a smooth surface fitted to the frame's border.
       *
       * Sketchfab's studio is not one colour — it is a lit dome, brighter in the middle and
       * darker at the edges, sometimes with a floor and a ceiling in it — so a single value per
       * row is not the background and a threshold on it lights up the whole frame. A quadratic
       * in x and y, fitted by least squares to the ring of border pixels and nothing else,
       * follows that dome and leaves the model standing out of it. The model sits in the middle
       * of the frame, so excluding the border also excludes most of the model from the fit.
       */
      const M = [
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1],
      ]
      const A = M.map(() => new Array(6).fill(0))
      const b = new Array(6).fill(0)
      const ring = 0.055
      let fitted = 0
      let resid = 0
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const nx = (x / (c.width - 1)) * 2 - 1
          const ny = (y / (c.height - 1)) * 2 - 1
          if (Math.abs(nx) < 1 - 2 * ring && Math.abs(ny) < 1 - 2 * ring) continue
          const m = [1, nx, ny, nx * nx, nx * ny, ny * ny]
          for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) A[i][j] += m[i] * m[j]
            b[i] += m[i] * L[y * c.width + x]
          }
          fitted++
          resid += L[y * c.width + x]
        }
      }
      // Gaussian elimination with partial pivoting; the matrix is small and well conditioned.
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
      const bgFit = (x, y) => {
        const nx = (x / (c.width - 1)) * 2 - 1
        const ny = (y / (c.height - 1)) * 2 - 1
        return coef[0] + coef[1] * nx + coef[2] * ny + coef[3] * nx * nx + coef[4] * nx * ny + coef[5] * ny * ny
      }
      // How well the fit describes the ring it was built from: a large number means the studio is
      // not a smooth dome and nothing below can be trusted.
      let fitErr = 0
      for (let y = 0; y < c.height; y += 3) {
        for (let x = 0; x < c.width; x += 3) {
          const nx = (x / (c.width - 1)) * 2 - 1
          const ny = (y / (c.height - 1)) * 2 - 1
          if (Math.abs(nx) < 1 - 2 * ring && Math.abs(ny) < 1 - 2 * ring) continue
          fitErr += Math.abs(L[y * c.width + x] - bgFit(x, y))
        }
      }
      const fitRms = fitErr / (fitted / 9)

      const dep = new Float32Array(L.length)
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) dep[y * c.width + x] = Math.abs(L[y * c.width + x] - bgFit(x, y))
      const bgS = new Float32Array(c.height)
      for (let y = 0; y < c.height; y++) bgS[y] = bgFit(c.width / 2, y)

      // The silhouette is a *run* of strong pixels in a row, not a sprinkling, so rows are
      // scored by their strongest run and columns likewise.
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
      const litRows = []
      for (let y = 0; y < c.height; y++) if (rowRun[y] > 0.02) litRows.push(y)
      const top = litRows[0] ?? null
      const feet = litRows.length ? litRows[litRows.length - 1] : null

      /** The per-2% run profile, so a threshold that caught a studio edge is visible as text. */
      const runProfile = []
      for (let y = 0; y < c.height; y += Math.max(1, Math.round(c.height * 0.02))) {
        let best = 0
        for (let k = 0; k < Math.max(1, Math.round(c.height * 0.02)); k++) best = Math.max(best, rowRun[y + k] ?? 0)
        runProfile.push(+best.toFixed(2))
      }

      /** Luminance split between the model and its background, which is what grading has to keep. */
      let modelSum = 0
      let modelN = 0
      let modelMin = 255
      let modelMax = 0
      let bgSum = 0
      let bgN = 0
      for (let p = 0; p < dep.length; p++) {
        if (dep[p] > thr) {
          modelSum += L[p]
          modelN++
          if (L[p] < modelMin) modelMin = L[p]
          if (L[p] > modelMax) modelMax = L[p]
        } else {
          bgSum += L[p]
          bgN++
        }
      }

      let xa = null
      let xb = null
      if (top != null && feet != null) {
        for (let x = 0; x < c.width; x++) {
          let best = 0
          let run = 0
          for (let y = top; y <= feet; y++) {
            if (dep[y * c.width + x] > thr) {
              run++
              if (run > best) best = run
            } else run = 0
          }
          if (best / (feet - top) > 0.06) {
            if (xa == null) xa = x
            xb = x
          }
        }
      }

      // The corners: whatever Sketchfab paints in them is chrome, not the model.
      const corner = (fx, fy) => {
        const x = Math.round((c.width - 1) * fx)
        const y = Math.round((c.height - 1) * fy)
        return +L[y * c.width + x].toFixed(0)
      }
      const cornerDep = (fx, fy) => {
        let n = 0
        let t = 0
        const x0 = Math.round(c.width * fx)
        const y0 = Math.round(c.height * fy)
        for (let y = y0; y < y0 + 26; y++) {
          for (let x = x0; x < x0 + 26; x++) {
            if (x >= c.width || y >= c.height) continue
            t++
            if (dep[y * c.width + x] > thr) n++
          }
        }
        return +(n / Math.max(1, t)).toFixed(2)
      }

      const AW = 78
      const AH = 32
      const ramp = ' .:-=+*#%@'
      const art = []
      for (let ay = 0; ay < AH; ay++) {
        let line = ''
        for (let ax = 0; ax < AW; ax++) {
          const sx = Math.floor((ax / AW) * c.width)
          const sy = Math.floor((ay / AH) * c.height)
          const p = sy * c.width + sx
          line += dep[p] > thr ? (L[p] > bgS[sy] ? '#' : 'O') : ramp[Math.min(ramp.length - 1, Math.round((L[p] / 255) * 9))]
        }
        art.push(line)
      }

      /**
       * Grade candidates.
       *
       * The studio dome is the wrong value for a dark hero: whatever mask is drawn over it, its
       * brightness is the brightness of the box. These are the filter chains the stage could put
       * on the iframe, applied here as arithmetic so the numbers can be compared side by side:
       * what matters is that the sky lands close to the page's own sky, and that the rig still
       * separates from it.
       */
      const CHAINS = [
        { name: 'none', f: (v) => v },
        { name: 'brightness(0.42)', f: (v) => v * 0.42 },
        { name: 'invert brightness(0.30)', f: (v) => (255 - v) * 0.3 },
        { name: 'invert brightness(0.24) contrast(1.1)', f: (v) => ((255 - v) * 0.24 - 127.5) * 1.1 + 127.5 },
        { name: 'invert(0.92) brightness(0.34)', f: (v) => (255 - v * 0.92) * 0.34 },
        // the chain the stage ships, so the numbers the sky is painted to are the numbers here
        { name: '* invert(0.92) brightness(0.34) contrast(1.1)', f: (v) => ((255 - v * 0.92) * 0.34 - 127.5) * 1.1 + 127.5 },
        { name: 'greyscale brightness(0.34) contrast(1.25)', f: (v) => (v * 0.34 - 127.5) * 1.25 + 127.5 },
      ]
      const grades = CHAINS.map((c) => {
        const cl = (v) => Math.max(0, Math.min(255, c.f(v)))
        let mSum = 0
        let mN = 0
        let bSum = 0
        let bN = 0
        let bMin = 255
        let bMax = 0
        for (let p = 0; p < dep.length; p++) {
          if (dep[p] > thr) {
            mSum += cl(L[p])
            mN++
          } else {
            const v = cl(L[p])
            bSum += v
            bN++
            if (v < bMin) bMin = v
            if (v > bMax) bMax = v
          }
        }
        return {
          chain: c.name,
          rig: Math.round(mSum / Math.max(1, mN)),
          sky: Math.round(bSum / Math.max(1, bN)),
          skyRange: `${Math.round(bMin)}–${Math.round(bMax)}`,
          rigOverSky: Math.round(mSum / Math.max(1, mN) - bSum / Math.max(1, bN)),
        }
      })

      return {
        w: c.width,
        h: c.height,
        thr,
        topFrac: top == null ? null : +(top / c.height).toFixed(3),
        feetFrac: feet == null ? null : +(feet / c.height).toFixed(3),
        xaFrac: xa == null ? null : +(xa / c.width).toFixed(3),
        xbFrac: xb == null ? null : +(xb / c.width).toFixed(3),
        boxWFrac: xa == null ? null : +((xb - xa) / c.width).toFixed(3),
        boxHFrac: top == null ? null : +((feet - top) / c.height).toFixed(3),
        stripSpread: +fitRms.toFixed(1),
        modelMean: +(modelSum / Math.max(1, modelN)).toFixed(0),
        modelMin: +modelMin.toFixed(0),
        modelMax: +modelMax.toFixed(0),
        modelFrac: +(modelN / dep.length).toFixed(3),
        bgMean: +(bgSum / Math.max(1, bgN)).toFixed(0),
        runProfile,
        grades,
        bgTop: +bgS[2].toFixed(0),
        bgMid: +bgS[(c.height / 2) | 0].toFixed(0),
        bgBottom: +bgS[c.height - 3].toFixed(0),
        corners: {
          tl: [corner(0.01, 0.01), cornerDep(0.01, 0.01)],
          tr: [corner(0.99, 0.01), cornerDep(0.97, 0.01)],
          bl: [corner(0.01, 0.99), cornerDep(0.01, 0.95)],
          br: [corner(0.99, 0.99), cornerDep(0.97, 0.95)],
        },
        art: art.join('\n'),
      }
    },
    { b64, thr: THR },
  )

  const { art, ...rest } = out
  console.log(`\n================ ${label} · ${uid}`)
  console.log(JSON.stringify(rest, null, 1))
  console.log(art)
}
await browser.close()
