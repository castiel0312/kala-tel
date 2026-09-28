import { chromium } from '@playwright/test'
const dir = '/Users/shantanu/Downloads/nwis-build-kit/01-frontend-design-source/screens'
const [,, file] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('file://' + dir + '/' + file, { waitUntil: 'load' })
await p.waitForTimeout(400)
const rows = await p.evaluate(() => {
  const out = []
  const walk = (el, d) => {
    if (d > 3) return
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) return
    const cs = getComputedStyle(el)
    out.push({ d, tag: el.tagName, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, bgc: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? '-' : cs.backgroundColor })
    for (const c of el.children) walk(c, d + 1)
  }
  walk(document.body, 0)
  return out
})
for (const r of rows) console.log('  '.repeat(r.d) + `${r.tag} x=${r.x} y=${r.y} w=${r.w} h=${r.h} ${r.disp} ${r.bgc}`)
await b.close()
