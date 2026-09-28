import { chromium } from 'playwright'

const b = await chromium.launch()
for (const url of ['http://localhost:5173/#map', 'http://localhost:5173/#map?']) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(13000)
  console.log(
    url,
    JSON.stringify(
      await p.evaluate(() => {
        const m = window.__nwisMap
        const c = m.getCanvas()
        const r = c.getBoundingClientRect()
        const stage = document.querySelector('[class*="mapStage"]')?.getBoundingClientRect()
        return {
          scrollY: Math.round(window.scrollY),
          canvasBuffer: [c.width, c.height],
          canvasCss: [Math.round(r.width), Math.round(r.height)],
          transformSize: [Math.round(m.transform.width), Math.round(m.transform.height)],
          stageRect: stage && [Math.round(stage.x), Math.round(stage.y), Math.round(stage.width), Math.round(stage.height)],
          center: m.getCenter().toArray().map((v) => +v.toFixed(4)),
        }
      }),
    ),
  )
  await p.close()
}
await b.close()
