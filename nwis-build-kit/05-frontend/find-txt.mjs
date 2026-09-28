import { chromium } from '@playwright/test'
const [,, route, needle] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
const rows = await p.evaluate((needle) => {
  const out = []
  const n = needle.toLowerCase()
  for (const el of document.querySelectorAll('body *')) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (!t.toLowerCase().includes(n)) continue
    if ([...el.children].some(c => (c.textContent || '').replace(/\s+/g,' ').trim().toLowerCase().includes(n))) continue
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    out.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,30), t: t.slice(0,40), x: Math.round(r.x), y: Math.round(r.y+window.scrollY), w: Math.round(r.width), h: Math.round(r.height), ox: el.scrollWidth - el.clientWidth, oy: el.scrollHeight - el.clientHeight, ov: cs.overflow, ws: cs.whiteSpace, fs: cs.fontSize, pos: cs.position, disp: cs.display })
  }
  return out
}, needle)
for (const r of rows) console.log(JSON.stringify(r))
await b.close()
