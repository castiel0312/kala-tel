import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
p.on('console', (m) => console.log('[' + m.type() + ']', m.text().slice(0, 200)))
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))
await p.addInitScript(() => {
  window.__log = []
  const push = (k, v) => window.__log.push([performance.now() | 0, k, typeof v === 'string' ? v : JSON.stringify(v)?.slice(0, 160)])
  Object.defineProperty(window, '__push', { value: push })
  const iv = setInterval(() => {
    const m = window.__nwisMap
    if (!m) return
    clearInterval(iv)
    for (const e of ['error', 'styledata', 'style.load', 'load', 'idle', 'dataloading', 'dataabort', 'render', 'sourcedata'])
      m.on(e, (ev) => {
        if (e === 'render' || e === 'sourcedata') return
        push('evt:' + e, { err: ev?.error?.message?.slice(0, 90) || undefined, src: ev?.sourceId, id: ev?.isStyleLoaded?.() })
      })
    const st = m.setStyle.bind(m)
    m.setStyle = (...a) => { push('setStyle', { style: a[0]?.name || a[0]?.sources ? Object.keys(a[0].sources ?? {}) : String(a[0]).slice(0, 60) }); return st(...a) }
    const tt = m.setTerrain.bind(m)
    m.setTerrain = (...a) => { push('setTerrain', a[0]); return tt(...a) }
    push('mapready', { center: m.getCenter().toArray().map((v) => +v.toFixed(3)), zoom: +m.getZoom().toFixed(2) })
  }, 60)
})
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(14000)
console.log(JSON.stringify(await p.evaluate(async () => {
  const m = window.__nwisMap
  const cv = m.getCanvas()
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height
  const x = c.getContext('2d'); x.drawImage(cv, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height).data
  let s = 0, n = 0
  for (let i = 0; i < d.length; i += 4) { s += (d[i] + d[i+1] + d[i+2]) / 3; n++ }
  return { mean: +(s / n).toFixed(1), log: window.__log }
}), null, 1))
await b.close()
