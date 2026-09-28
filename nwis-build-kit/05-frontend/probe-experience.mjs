/* One-shot audit of the consolidated experience. Loads the page at three widths,
   walks every section, and reports console errors, failed requests, empty panels
   and the elements that overflow their section. */

import { chromium } from 'playwright'

const SECTIONS = [
  'overview', 'live', 'map', 'wells', 'corridor', 'risk',
  'alerts', 'memory', 'graph', 'documents', 'analytics', 'assistant',
]
const WIDTHS = [
  { w: 1440, h: 900, label: 'desktop' },
  { w: 1024, h: 800, label: 'tablet' },
  { w: 390, h: 844, label: 'phone' },
]

const run = async () => {
  const browser = await chromium.launch()
  for (const vp of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    const errors = []
    const failed = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text().slice(0, 200))
    })
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`))
    page.on('requestfailed', (r) => {
      if (!r.url().includes('favicon')) failed.push(`${r.url().slice(0, 110)} ${r.failure()?.errorText ?? ''}`)
    })

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForSelector('#nwis-scroll', { timeout: 15000 })

    const report = { vp: vp.label, width: vp.w, errors: [], failed: [], sections: [], overflow: [] }

    for (const id of SECTIONS) {
      // goTo is the app's own scroll path, so this also exercises the navigation
      await page.evaluate((sid) => {
        const root = document.getElementById('nwis-scroll')
        const el = root?.querySelector(`#${CSS.escape(sid)}`)
        el?.scrollIntoView({ block: 'start' })
      }, id)
      await page.waitForTimeout(id === 'map' || id === 'graph' || id === 'documents' ? 2600 : 900)

      const info = await page.evaluate((sid) => {
        const el = document.querySelector(`#${CSS.escape(sid)}`)
        if (!el) return { id: sid, missing: true }
        const r = el.getBoundingClientRect()
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
        return {
          id: sid,
          h: Math.round(r.height),
          chars: text.length,
          figures: el.querySelectorAll('figure').length,
          canvases: el.querySelectorAll('canvas').length,
          empties: el.querySelectorAll('[data-empty], .react-pdf__Page').length,
          skeleton: (el.textContent ?? '').includes('could not be drawn'),
        }
      }, id)
      report.sections.push(info)
    }

    // anything wider than the scrollport means a broken layout at this width
    report.overflow = await page.evaluate(() => {
      const root = document.getElementById('nwis-scroll')
      const out = []
      if (!root) return out
      const inScroller = (el) => {
        for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true
        }
        return false
      }
      for (const el of root.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        // a horizontal scroller is meant to hold content wider than the frame
        if (r.width > 0 && r.right > root.clientWidth + 2 && !inScroller(el)) {
          out.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} right=${Math.round(r.right)}`)
        }
      }
      return out.slice(0, 8)
    })

    report.errors = errors.slice(0, 12)
    report.failed = failed.slice(0, 8)
    console.log(`\n===== ${vp.label} ${vp.w}x${vp.h} =====`)
    console.log(JSON.stringify(report, null, 1))

    await page.screenshot({ path: `/tmp/nwis-${vp.label}.png`, fullPage: false })
    await ctx.close()
  }
  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
