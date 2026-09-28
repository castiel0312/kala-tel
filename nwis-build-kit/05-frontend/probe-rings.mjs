import { chromium } from 'playwright'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(12000)
console.log(
  JSON.stringify(
    await p.evaluate(() => {
      const m = window.__nwisMap
      const ref = m
        .querySourceFeatures('nwis-wells', { filter: ['==', ['get', 'role'], 'reference'] })[0]
      const rings = m.getSource('nwis-rings')._data.features ?? []
      const lbls = m.queryRenderedFeatures({ layers: ['nwis-ring-labels'] })
      return {
        refCoords: ref?.geometry?.coordinates,
        refProps: ref?.properties,
        ringProps: rings.map((f) => f.properties),
        ringLabelFeatures: lbls.map((f) => ({ props: f.properties, type: f.geometry?.type })),
      }
    }),
    null,
    1,
  ),
)
await b.close()
