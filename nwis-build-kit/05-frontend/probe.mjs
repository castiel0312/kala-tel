import { chromium } from 'playwright'

/**
 * Pixel probe. A screenshot is only useful if it can be read, so this one renders the page,
 * screenshots a selector, then decodes it back inside the browser and prints a coarse
 * luminance map plus a colour histogram. That is enough to tell "the basemap is grey mush"
 * from "the trajectories and structure are actually drawn".
 */
const url = process.argv[2] ?? 'http://localhost:5173/command'
const selector = process.argv[3] ?? 'body'
const cols = Number(process.argv[4] ?? 90)
const rows = Number(process.argv[5] ?? 34)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 200)))
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(3500)

const el = page.locator(selector).first()
const buf = await el.screenshot()

const result = await page.evaluate(
  async ({ b64, cols, rows }) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = cols
    c.height = rows
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0, cols, rows)
    const d = ctx.getImageData(0, 0, cols, rows).data
    const ramp = ' .:-=+*#%@'
    const lines = []
    const hist = new Map()
    for (let y = 0; y < rows; y++) {
      let line = ''
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        line += ramp[Math.min(ramp.length - 1, Math.max(0, Math.round(lum * (ramp.length - 1))))]
        const key = `${r >> 5}_${g >> 5}_${b >> 5}`
        hist.set(key, (hist.get(key) ?? 0) + 1)
      }
      lines.push(line)
    }
    const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => {
      const [r, g, b] = k.split('_').map((v) => Number(v) * 32 + 16)
      return `rgb(${r},${g},${b}) ${((n / (cols * rows)) * 100).toFixed(1)}%`
    })
    return { size: `${img.naturalWidth}×${img.naturalHeight}`, map: lines.join('\n'), palette: top }
  },
  { b64: buf.toString('base64'), cols, rows },
)

console.log(`size ${result.size}\n${result.map}\npalette: ${result.palette.join('  ')}`)
console.log('errors:', errors.length ? errors.slice(0, 4).join(' | ') : 'none')
await browser.close()
