import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })
const hosts = new Map()
page.on('response', (r) => {
  const h = new URL(r.url()).host
  if (/cartocdn|mapbox|openstreetmap|tile/i.test(h)) hosts.set(h, (hosts.get(h) ?? 0) + 1)
})
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0,200)) })
await page.goto(process.argv[2] ?? 'http://localhost:5173/command', { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(4000)
console.log('tile/asset hosts:', [...hosts.entries()].map(([k,v]) => `${k}: ${v}`).join('\n  ') || 'none')
console.log('errors:', errs.slice(0,5).join(' | ') || 'none')
const webgl = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return 'no canvas'
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  return gl ? `webgl ok, drawingBuffer ${c.width}x${c.height}` : 'no gl context'
})
console.log(webgl)
await browser.close()
