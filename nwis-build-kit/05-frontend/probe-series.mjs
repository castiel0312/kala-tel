import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 220)) })
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 220)))
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
for (const t of [400, 800, 1600, 3000, 5000, 8000, 12000]) {
  await p.waitForTimeout(t === 400 ? 400 : 0)
  const s = await p.evaluate(async () => {
    const m = window.__nwisMap
    if (!m) return { map: false }
    if (!window.__rc) { window.__rc = 0; m.on('render', () => window.__rc++) }
    m.triggerRepaint()
    const cv = m.getCanvas()
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height
    const x = c.getContext('2d'); x.drawImage(cv, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    let sum = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { sum += (d[i] + d[i+1] + d[i+2]) / 3; n++ }
    return {
      mean: +(sum / n).toFixed(1),
      renders: window.__rc,
      center: m.getCenter().toArray().map((v) => +v.toFixed(3)),
      zoom: +m.getZoom().toFixed(2),
      pitch: +m.getPitch().toFixed(1),
      bearing: +m.getBearing().toFixed(1),
      bounds: ['toArray' in m.getBounds() ? m.getBounds().toArray() : [m.getBounds().getWest(), m.getBounds().getSouth(), m.getBounds().getEast(), m.getBounds().getNorth()].map(Number)].map((v) => +Number(v).toFixed(2)),
      terrain: m.getTerrain() ? m.getTerrain().exaggeration : null,
      imLoaded: m.isSourceLoaded('imagery'),
      styleLoaded: m.isStyleLoaded(),
    }
  })
  console.log(String(t).padStart(6), JSON.stringify(s))
  await p.waitForTimeout(t === 400 ? 400 : 1000)
}
await b.close()
