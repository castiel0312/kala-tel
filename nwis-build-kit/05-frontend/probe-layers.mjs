import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(14000)
const mean = () =>
  p.evaluate(async () => {
    const m = window.__nwisMap
    m.triggerRepaint()
    const cv = m.getCanvas()
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height
    const x = c.getContext('2d'); x.drawImage(cv, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    let s = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { s += (d[i] + d[i+1] + d[i+2]) / 3; n++ }
    return +(s / n).toFixed(1)
  })
console.log('baseline (all layers)   ', await mean())
// strip every nwis layer, keep paper + imagery
const stripped = await p.evaluate(() => {
  const m = window.__nwisMap
  const gone = []
  for (const l of m.getStyle().layers.map((x) => x.id)) {
    if (l.startsWith('nwis')) { m.removeLayer(l); gone.push(l) }
  }
  return gone
})
await p.waitForTimeout(2500)
console.log('nwis layers removed     ', await mean(), `(${stripped.length} removed)`)
// put them back one at a time, smallest first
for (const id of ['nwis-paths-casing', 'nwis-paths', 'nwis-links', 'nwis-link-labels', 'nwis-rings', 'nwis-ring-labels', 'nwis-risk-outline', 'nwis-risk', 'nwis-risk-labels', 'nwis-halo', 'nwis-wells-2d', 'nwis-labels']) {
  const re = await p.evaluate(async (lid) => {
    const m = window.__nwisMap
    const before = m.getStyle().layers.find((l) => l.id === 'imagery')
    try {
      m.addLayer(m.__nwisDefs?.[lid] ?? { id: lid, type: 'circle', source: 'nwis-wells' }, before?.id)
      return 'ok'
    } catch (e) {
      return 'err ' + String(e.message).slice(0, 60)
    }
  }, id)
  await p.waitForTimeout(1200)
  console.log(('re-add ' + id).padEnd(26), re, await mean())
}
await b.close()
