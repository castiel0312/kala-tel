import { chromium } from '@playwright/test'
const dir = '/Users/shantanu/Downloads/nwis-build-kit/01-frontend-design-source/screens'
const [,, file, needle] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('file://' + dir + '/' + file, { waitUntil: 'load' })
await p.waitForTimeout(400)
const rows = await p.evaluate((needle) => {
  const out = []
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)
    if (needle === 'sidebar' && !(r.width >= 240 && r.width <= 260 && r.height > 400)) continue
    if (needle === 'text' && !t.toLowerCase().includes(arg)) continue
    out.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 30), t, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bgc: cs.backgroundColor })
  }
  return out.slice(0, 20)
}, needle)
for (const r of rows) console.log(JSON.stringify(r))
await b.close()
