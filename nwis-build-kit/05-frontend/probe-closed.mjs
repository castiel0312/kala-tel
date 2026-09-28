import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1512, height: 950 } })
await p.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
const info = await p.evaluate(() => {
  const panel = document.querySelector('[data-open-panel]')
  const vis = [...document.querySelectorAll('button,a,[role=button]')].map(e => ({
    tag: e.tagName, cls: (e.className||'').toString().slice(0,60),
    txt: (e.textContent||'').trim().replace(/\s+/g,' ').slice(0,70),
    title: e.getAttribute('title'), aria: e.getAttribute('aria-label'),
  }))
  return {
    nwOpen: panel ? getComputedStyle(panel).getPropertyValue('--nw-open') : 'NO PANEL',
    panelClass: panel ? panel.className : '',
    controls: vis,
  }
})
console.log(JSON.stringify(info, null, 1))
await b.close()
