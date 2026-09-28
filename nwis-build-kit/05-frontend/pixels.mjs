import { chromium } from 'playwright'

/**
 * Colour probe: counts how many pixels of a selector land near each target colour, so
 * "is the yellow trajectory actually on screen" becomes a yes/no instead of a guess.
 */
const [url = 'http://localhost:5173/command', selector = 'body', colors = '#f8b800'] = process.argv.slice(2)
const targets = colors.split(',').map((c) => ({ c: c.trim().toLowerCase(), n: 0 }))
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)))
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(3500)
const buf = await page.locator(selector).first().screenshot()
const out = await page.evaluate(
  async ({ b64, targets }) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    const total = c.width * c.height
    const res = []
    for (const t of targets) {
      const h = t.c
      const tr = parseInt(h.slice(1, 3), 16), tg = parseInt(h.slice(3, 5), 16), tb = parseInt(h.slice(5, 7), 16)
      let n = 0
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - tr) < 26 && Math.abs(d[i + 1] - tg) < 26 && Math.abs(d[i + 2] - tb) < 26) n++
      }
      res.push(`${h}: ${n} (${((n / total) * 100).toFixed(2)}%)`)
    }
    return { size: `${c.width}×${c.height}`, res }
  },
  { b64: buf.toString('base64'), targets },
)
console.log(out.size, '|', out.res.join('  '))
console.log('errors:', errors.length ? errors.slice(0, 3).join(' | ') : 'none')
await browser.close()
