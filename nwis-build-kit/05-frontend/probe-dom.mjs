import { chromium } from 'playwright'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5173/#map', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(13000)

console.log(
  JSON.stringify(
    await p.evaluate(() => {
      const m = window.__nwisMap
      const c = m.getCanvas()
      const r = c.getBoundingClientRect()
      const cs = getComputedStyle(c)
      const cx = r.x + r.width / 2
      const cy = r.y + r.height / 2
      const stack = document.elementsFromPoint(cx, cy).slice(0, 6).map((el) => {
        const s = getComputedStyle(el)
        return {
          tag: el.tagName,
          cls: typeof el.className === 'string' ? el.className.slice(0, 40) : '',
          bg: s.backgroundColor,
          opacity: s.opacity,
          z: s.zIndex,
          pos: s.position,
        }
      })
      const parent = c.parentElement
      return {
        canvas: { w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), opacity: cs.opacity, visibility: cs.visibility, display: cs.display, z: cs.zIndex, pos: cs.position, transform: cs.transform.slice(0, 40) },
        parent: parent && { cls: parent.className, style: parent.getAttribute('style'), z: getComputedStyle(parent).zIndex },
        stackAtCentre: stack,
        stageChildren: [...document.querySelectorAll('[class*="mapStage"] > *')].map((el) => ({ cls: typeof el.className === 'string' ? el.className.slice(0, 30) : '', z: getComputedStyle(el).zIndex, bg: getComputedStyle(el).backgroundColor })),
      }
    }),
    null,
    1,
  ),
)
await b.close()
