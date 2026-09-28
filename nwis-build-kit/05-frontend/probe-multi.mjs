import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(13000)
console.log(JSON.stringify(await p.evaluate(async () => {
  const m = window.__nwisMap
  const own = m.getCanvas()
  const all = [...document.querySelectorAll('canvas')]
  const read = (cv) => {
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height
    const x = c.getContext('2d'); x.drawImage(cv, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    let s = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { s += (d[i] + d[i+1] + d[i+2]) / 3; n++ }
    return +(s / n).toFixed(1)
  }
  return {
    canvasCount: all.length,
    mapCanvasIsOurs: all.some((c) => c === own),
    canvases: all.map((c) => ({ cls: c.className, buf: [c.width, c.height], css: [c.clientWidth, c.clientHeight], rect: (({ x, y, width, height }) => [Math.round(x), Math.round(y), Math.round(width), Math.round(height)])(c.getBoundingClientRect()), mean: read(c) })),
    own: { buf: [own.width, own.height], mean: read(own), inDoc: document.contains(own) },
  }
}), null, 1))
await b.close()
