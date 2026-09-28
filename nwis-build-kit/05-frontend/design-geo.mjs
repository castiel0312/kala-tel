import { chromium } from '@playwright/test'
import fs from 'fs'
const dir = '/Users/shantanu/Downloads/nwis-build-kit/01-frontend-design-source/screens'
const [,, file, mode, arg] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('file://' + dir + '/' + file, { waitUntil: 'load' })
await p.waitForTimeout(400)
const rows = await p.evaluate(({ mode, arg }) => {
  const label = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)
  const out = []
  if (mode === 'near') {
    const [y0, y1] = arg.split('-').map(Number)
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.height === 0) continue
      const y = r.y + window.scrollY
      if (y >= y0 && y < y1) {
        const cs = getComputedStyle(el)
        out.push({ tag: el.tagName, t: label(el), x: Math.round(r.x), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, gap: cs.gap, pad: cs.padding, fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing, br: cs.borderRadius, bgc: cs.backgroundColor })
      }
    }
  } else if (mode === 'text') {
    const needle = arg.toLowerCase()
    for (const el of document.querySelectorAll('body *')) {
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!txt.toLowerCase().includes(needle)) continue
      if ([...el.children].some(c => (c.textContent || '').replace(/\s+/g,' ').trim().toLowerCase().includes(needle))) continue
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      out.push({ tag: el.tagName, t: txt.slice(0, 46), x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height), fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing, ff: cs.fontFamily.slice(0, 22), color: cs.color, bgc: cs.backgroundColor, br: cs.borderRadius, bd: cs.border })
    }
  }
  return out
}, { mode, arg })
for (const r of rows) console.log(JSON.stringify(r))
await b.close()
