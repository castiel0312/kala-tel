import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(13000)
const mean = () =>
  p.evaluate(async () => {
    const m = window.__nwisMap
    const cv = m.getCanvas()
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height
    const x = c.getContext('2d'); x.drawImage(cv, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    let s = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { s += (d[i] + d[i+1] + d[i+2]) / 3; n++ }
    return +(s / n).toFixed(1)
  })
const step = async (label, fn) => {
  const r = await p.evaluate(fn)
  await p.waitForTimeout(2200)
  await p.evaluate(() => window.__nwisMap.triggerRepaint())
  await p.waitForTimeout(700)
  console.log(label.padEnd(34), await mean(), r ?? '')
}
console.log('black at rest'.padEnd(34), await mean())
await step('setTerrain(null)', () => { window.__nwisMap.setTerrain(null); return 'ok' })
await step('background-only style', () => {
  const m = window.__nwisMap
  m.setStyle({ version: 8, sources: {}, layers: [{ id: 'b', type: 'background', paint: { 'background-color': '#ff00ff' } }] })
  return 'setStyle'
})
await step('terrain back, magenta only', () => { window.__nwisMap.setTerrain(null); return 'ok' })
await p.close()

// fresh page: magenta background from the start, then the real imagery source added by hand
const p2 = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p2.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p2.waitForTimeout(13000)
const mean2 = () => p2.evaluate(async () => {
  const m = window.__nwisMap
  const cv = m.getCanvas()
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height
  const x = c.getContext('2d'); x.drawImage(cv, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height).data
  let s = 0, n = 0
  for (let i = 0; i < d.length; i += 4) { s += (d[i] + d[i+1] + d[i+2]) / 3; n++ }
  return +(s / n).toFixed(1)
})
console.log('page2 black at rest'.padEnd(34), await mean2())
const keys = await p2.evaluate(() => {
  const m = window.__nwisMap
  const st = m.getStyle()
  m.setStyle({ version: 8, sources: { imagery: st.sources.imagery }, layers: [{ id: 'b', type: 'background', paint: { 'background-color': '#ff00ff' } }, { id: 'r', type: 'raster', source: 'imagery' }] })
  return Object.keys(st.sources)
})
await p2.waitForTimeout(5000)
console.log('page2 magenta bg + imagery'.padEnd(34), await mean2(), keys.join(','))
await b.close()
