import { chromium } from 'playwright'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(12000)
await p.getByRole('button', { name: '10 km', exact: true }).click()
await p.waitForTimeout(4000)

const shot = (await p.screenshot()).toString('base64')
console.log(
  'frame:',
  JSON.stringify(
    await p.evaluate(async (data) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + data
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const whole = ctx.getImageData(0, 0, c.width, c.height)
      let sum = 0
      const n = whole.data.length / 4
      for (let i = 0; i < whole.data.length; i += 4) sum += (whole.data[i] + whole.data[i + 1] + whole.data[i + 2]) / 3

      const m = window.__nwisMap
      const ref = [95.3, 27.35]
      const pt = m.project(ref)
      const box = m.getCanvas().getBoundingClientRect()
      const page = { x: box.x + pt.x, y: box.y + pt.y }
      const half = 40
      const local = ctx.getImageData(Math.round(pt.x - half), Math.round(pt.y - half), half * 2, half * 2)
      let yellow = 0
      let any = 0
      let bright = 0
      for (let i = 0; i < local.data.length; i += 4) {
        const [r, g, bl] = [local.data[i], local.data[i + 1], local.data[i + 2]]
        any += r + g + bl > 90 ? 1 : 0
        bright += r + g + bl > 480 ? 1 : 0
        if (r > 150 && g > 120 && bl < 90) yellow += 1
      }
      return {
        mean: +(sum / n).toFixed(1),
        pt: [Math.round(pt.x), Math.round(pt.y)],
        canvasBox: [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)],
        pagePt: [Math.round(page.x), Math.round(page.y)],
        sample: { yellow, any, bright, of: half * 2 * half * 2 },
        iconOpacity: m.getPaintProperty('nwis-wells-2d', 'icon-opacity'),
        iconColor: JSON.stringify(m.getPaintProperty('nwis-wells-2d', 'icon-color')),
        featuresAtRef: m.queryRenderedFeatures({ layers: ['nwis-wells-2d'] }).filter((f) => f.properties?.role === 'reference').length,
      }
    }, shot),
  ),
)
await b.close()
