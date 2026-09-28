/* Every deep link has to land on its section, not near it, and the settle loop has to
   surrender the moment the reader scrolls for themselves. */

import { chromium } from 'playwright'

const IDS = ['overview', 'live', 'map', 'wells', 'corridor', 'risk', 'alerts', 'memory', 'graph', 'documents', 'analytics', 'assistant']
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const rows = []
for (const id of IDS) {
  await p.goto(`http://localhost:5173/#${id}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2600)
  rows.push(
    await p.evaluate((s) => {
      const port = document.getElementById('nwis-scroll')
      const el = document.getElementById(s)
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      // the opening section is the top of the page
      const want = s === 'overview' ? 0 : Math.round(el.getBoundingClientRect().top + port.scrollTop - margin)
      const active = document.querySelector('[data-active="true"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 16)
      return { id: s, want, got: Math.round(port.scrollTop), off: Math.round(port.scrollTop - want), active, top: Math.round(el.getBoundingClientRect().top) }
    }, id),
  )
}

/* in-page nav click stays smooth and exact */
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
const click = await p.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const link = [...document.querySelectorAll('nav a')].find((a) => /documents/i.test(a.textContent))
  link.click()
  const seen = []
  for (let i = 0; i < 30; i++) {
    await sleep(120)
    seen.push(Math.round(document.getElementById('nwis-scroll').scrollTop))
  }
  const port = document.getElementById('nwis-scroll')
  const el = document.getElementById('documents')
  const want = Math.round(el.getBoundingClientRect().top + port.scrollTop - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0))
  return { animated: new Set(seen).size > 3, off: Math.round(port.scrollTop - want), end: Math.round(port.scrollTop) }
})

/* the reader scrolls during the settle window and must not be dragged back */
await p.goto('http://localhost:5173/#risk', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const takeover = await p.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const port = document.getElementById('nwis-scroll')
  port.scrollTop += 700
  const mine = port.scrollTop
  await sleep(3000)
  return { movedBy: Math.round(port.scrollTop - mine) }
})

console.log(JSON.stringify({ rows, click, takeover }, null, 1))
await b.close()
