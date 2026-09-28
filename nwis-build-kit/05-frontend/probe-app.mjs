import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(14000)
const d = (await p.screenshot()).toString('base64')
console.log(JSON.stringify(await p.evaluate(async (s) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode()
  const pc = document.createElement('canvas'); pc.width = img.naturalWidth; pc.height = img.naturalHeight
  const pctx = pc.getContext('2d'); pctx.drawImage(img, 0, 0)
  const stats = (data, w, h) => {
    let sum = 0, n = 0, mn = 255, mx = 0
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i] + data[i+1] + data[i+2]) / 3
      sum += l; n++; if (l < mn) mn = l; if (l > mx) mx = l
    }
    return { mean: +(sum/n).toFixed(1), min: +mn.toFixed(0), max: +mx.toFixed(0) }
  }
  const pageStats = stats(pctx.getImageData(0,0,pc.width,pc.height).data)
  const cv = window.__nwisMap.getCanvas()
  const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height
  const x2 = c2.getContext('2d'); x2.drawImage(cv, 0, 0)
  const canvasStats = stats(x2.getImageData(0,0,c2.width,c2.height).data)
  // and the locator screenshot of the canvas element
  return { pageStats, canvasStats, buf: [cv.width, cv.height], cssW: cv.clientWidth, cssH: cv.clientHeight,
    dpr: devicePixelRatio, style: window.__nwisMap.getStyle().sources && Object.keys(window.__nwisMap.getStyle().sources) }
}, d)))
const loc = await p.locator('canvas.mapboxgl-canvas').screenshot()
console.log('locator shot bytes', loc.length, 'mean', await p.evaluate(async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
  const x = c.getContext('2d'); x.drawImage(img, 0, 0)
  const d = x.getImageData(0,0,c.width,c.height).data
  let s = 0, n = 0
  for (let i = 0; i < d.length; i += 4) { s += (d[i]+d[i+1]+d[i+2])/3; n++ }
  return +(s/n).toFixed(1)
}, loc.toString('base64')))
await b.close()
