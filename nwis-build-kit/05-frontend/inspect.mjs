import { chromium } from '@playwright/test'
const [,, route, mode, arg] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
const res = await p.evaluate(({ mode, arg }) => {
  const label = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)
  const rows = []
  if (mode === 'near') {
    const [y0, y1] = arg.split('-').map(Number)
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.height === 0) continue
      if (r.top + window.scrollY >= y0 && r.top + window.scrollY < y1) {
        const cs = getComputedStyle(el)
        rows.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 34), t: label(el), x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height), pos: cs.position, disp: cs.display, ov: cs.overflow, fs: cs.fontSize })
      }
    }
  } else if (mode === 'sel') {
    for (const el of document.querySelectorAll(arg)) {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      rows.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 34), t: label(el), x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height), pos: cs.position, disp: cs.display, ov: cs.overflow, fs: cs.fontSize, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight })
    }
  }
  return rows
}, { mode, arg })
for (const r of res) console.log(JSON.stringify(r))
await b.close()
