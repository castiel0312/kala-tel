import { chromium } from 'playwright'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(13000)

const mean = async (label) => {
  const d = (await p.screenshot()).toString('base64')
  const v = await p.evaluate(async (s) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + s
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const r = ctx.getImageData(0, 0, c.width, c.height).data
    let sum = 0
    let n = 0
    for (let i = 0; i < r.length; i += 4) {
      sum += (r[i] + r[i + 1] + r[i + 2]) / 3
      n++
    }
    return +(sum / n).toFixed(1)
  }, d)
  console.log(label.padEnd(30), v)
}

await mean('as loaded:')

const minimal = {
  version: 8,
  sources: {
    img: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 18, attribution: 'ESRI' },
  },
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#204060' } }, { id: 'r', type: 'raster', source: 'img' }],
}

await p.evaluate((style) => {
  const m = window.__nwisMap
  window.__probe = () => ({ loaded: m.isStyleLoaded(), layers: m.getStyle().layers.map((l) => l.id) })
  m.setStyle(style)
}, minimal)
await p.waitForTimeout(9000)
await mean('minimal style:')
console.log('state:', JSON.stringify(await p.evaluate(() => window.__probe())))

// The one thing a working frame needs that a dark one does not: a repaint.
await p.evaluate(() => window.__nwisMap.triggerRepaint())
await p.waitForTimeout(1500)
await mean('after triggerRepaint:')

// And: does Mapbox think it is done rendering?
console.log(
  'render state:',
  JSON.stringify(
    await p.evaluate(() => {
      const m = window.__nwisMap
      return {
        loaded: m.loaded(),
        areTilesLoaded: m.areTilesLoaded(),
        areImagesLoaded: m.listImages().length,
        styleLoaded: m.isStyleLoaded(),
        hasTerrain: Boolean(m.getTerrain()),
        contextLost: (() => {
          try {
            return m.painter?.context?.gl?.isContextLost?.() ?? 'n/a'
          } catch {
            return 'err'
          }
        })(),
      }
    }),
  ),
)
await b.close()
