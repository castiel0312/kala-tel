import { chromium } from 'playwright'

/**
 * Can the parent page ask Sketchfab for a background colour?
 *
 * The embed iframe paints its own studio dome and ignores the `background` URL parameter, so the
 * only way the hero's environment can be *ours* rather than a mask over theirs is the Viewer API:
 * `setBackground({ color })` on an iframe we create ourselves. The docs require a Pro account for
 * a transparent background and say nothing about a solid colour, so the question is empirical.
 *
 *   node probe-bg.mjs
 */
const UID = process.env.UID ?? 'b5d3e545213a47c49c4ae299cb0159a5'
const W = Number(process.env.W ?? 900)
const H = Number(process.env.H ?? 640)

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
page.on('console', (m) => console.log(`  [console:${m.type()}] ${m.text().slice(0, 200)}`))
page.on('requestfailed', (r) => console.log(`  [failed] ${r.url().slice(0, 120)} ${r.failure()?.errorText ?? ''}`))

await page.setContent(
  `<!doctype html><html><body style="margin:0;background:#101010">
   <script src="https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js"></script>
   <iframe id="f" style="position:fixed;inset:0;width:100%;height:100%;border:0" allow="autoplay; fullscreen"></iframe>
   </body></html>`,
  { waitUntil: 'load' },
)

const api = await page.evaluate(
  ({ uid }) =>
    new Promise((resolve) => {
      const t0 = performance.now()
      const done = (step, extra) => resolve({ step, ms: Math.round(performance.now() - t0), ...extra })
      if (typeof window.Sketchfab !== 'function') return done('no-library')
      const client = new window.Sketchfab('1.12.1', document.getElementById('f'))
      client.init(uid, {
        dpr: 1,
        autostart: 0,
        ui_watermark: 0,
        ui_watermark_link: 0,
        ui_infos: 0,
        ui_hint: 0,
        ui_controls: 0,
        ui_settings: 0,
        ui_share: 0,
        ui_vr: 0,
        ui_fullscreen: 1,
        ui_annotations: 0,
        ui_help: 0,
        ui_inspector: 0,
        ui_animations: 0,
        ui_stop: 0,
        error: (e) => done('init-error', { e: String(e).slice(0, 200) }),
        success: (api) => {
          const after = (step) => () => done(step, { keys: Object.keys(api).filter((k) => /back|transp/i.test(k)) })
          api.setBackground({ color: [0.043, 0.047, 0.047] }, after('bg-set'))
          api.start(after('started'))
        },
      })
      setTimeout(() => done('timeout'), 25000)
    }),
  { uid: UID },
)
console.log('viewer api:', JSON.stringify(api))

await page.waitForTimeout(12000)
const b64 = (await page.screenshot({ type: 'jpeg', quality: 92 })).toString('base64')

const out = await page.evaluate(async ({ b64 }) => {
  const img = new Image()
  img.src = `data:image/jpeg;base64,${b64}`
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  const at = (x, y) => {
    const i = (y * c.width + x) * 4
    return [d[i], d[i + 1], d[i + 2]]
  }
  const corners = {
    tl: at(4, 4),
    tr: at(c.width - 5, 4),
    bl: at(4, c.height - 5),
    br: at(c.width - 5, c.height - 5),
    topMid: at((c.width / 2) | 0, 6),
    botMid: at((c.width / 2) | 0, c.height - 7),
  }
  const ramp = ' .:-=+*#%@'
  const AW = 78
  const AH = 30
  const art = []
  for (let ay = 0; ay < AH; ay++) {
    let line = ''
    for (let ax = 0; ax < AW; ax++) {
      const [r, g, b] = at(((ax / AW) * c.width) | 0, ((ay / AH) * c.height) | 0)
      line += ramp[Math.min(9, Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) / 25.6))]
    }
    art.push(line)
  }
  return { corners, art: art.join('\n') }
}, { b64 })

console.log(JSON.stringify(out.corners))
console.log(out.art)
await browser.close()
