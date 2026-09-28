import { chromium } from 'playwright'

/**
 * Audits every route in one browser session and prints a single table, so a regression in one
 * screen is visible next to the others instead of in a separate log per URL.
 */
const BASE = process.argv[2] ?? 'http://localhost:5173'
const W = Number(process.argv[3] ?? 1512)
const H = Number(process.argv[4] ?? 950)

const ROUTES = [
  ['/', 'Landing'],
  ['/command', 'Command Centre'],
  ['/nearby', 'Nearby Wells'],
  ['/active', 'Active Well'],
  ['/compare/W-067', 'Well Compare'],
  ['/risk', 'Risk Centre'],
  ['/risk/mud_loss', 'Risk detail'],
  ['/alerts', 'Alerts'],
  ['/analytics', 'Analytics'],
  ['/knowledge', 'Knowledge Centre'],
  ['/graph', 'Knowledge Graph'],
  ['/documents', 'Document Library'],
  ['/documents/W-067_WCR_2019.pdf/47', 'Document Intel'],
  ['/assistant', 'Assistant'],
  ['/rig', 'Rig Floor'],
  ['/nope', 'Not Found'],
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })
const rows = []

for (const [route, name] of ROUTES) {
  const errors = []
  const onMsg = (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 90)) }
  const onErr = (e) => errors.push('PAGEERROR ' + e.message.slice(0, 90))
  page.on('console', onMsg)
  page.on('pageerror', onErr)
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 })
  // Layout is measured only once webfonts have settled, otherwise a fallback metric reports a
  // truncation that disappears a frame later.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2200)
  // Measured twice: layout that is still settling (fonts, SVG scaling, scrollbar appearance) reports
  // overflow for one frame. A real truncation is still there on the second pass.
  const measure = () => page.evaluate(() => {
    const de = document.documentElement
    // A truncation is content that overflows a box which refuses to scroll. Deliberate scroll
    // regions (auto/scroll) are not defects, so they are counted separately as scrollable.
    const trunc = []
    const truncDetail = []
    const scrollable = []
    for (const el of document.querySelectorAll('body, body *')) {
      // The document itself is expected to scroll on the landing and rig-floor views.
      if (el.tagName === 'BODY') continue
      const b = el.getBoundingClientRect()
      if (b.width < 8 || b.height < 8) continue
      if (!el.clientWidth) continue
      const overX = el.scrollWidth > el.clientWidth + 2
      const overY = el.scrollHeight > el.clientHeight + 2
      if (!overX && !overY) continue
      const cs = getComputedStyle(el)
      const name = `${el.tagName}.${String(el.className).slice(0, 22)}`
      const hidden = (v) => v === 'hidden' || v === 'clip'
      const scrolls = (v) => v === 'auto' || v === 'scroll'
      // Text that ends in an ellipsis is truncating on purpose, and scrollWidth still reports the
      // unclipped line, so it is not a layout defect.
      if (cs.textOverflow === 'ellipsis') continue
      // SVG has no box model: a <text> run paints past its advance width by a glyph metric or two
      // and is never truncated, so it is not a layout defect.
      if (el.namespaceURI === 'http://www.w3.org/2000/svg') continue
      // A badge or marker that deliberately hangs outside its box (a corner count, a caret) is
      // positioned on purpose. Hiding the out-of-flow children proves whether the in-flow content
      // is what actually overflows.
      const outOfFlow = [...el.children].filter((c) => {
        const p = getComputedStyle(c).position
        return p === 'absolute' || p === 'fixed'
      })
      if (outOfFlow.length) {
        const prev = outOfFlow.map((c) => c.style.display)
        outOfFlow.forEach((c) => (c.style.display = 'none'))
        const inFlowX = el.scrollWidth > el.clientWidth + 2
        const inFlowY = el.scrollHeight > el.clientHeight + 2
        outOfFlow.forEach((c, i) => (c.style.display = prev[i]))
        if (!inFlowX && !inFlowY) continue
      }
      // Each axis is judged on its own: `overflow-x: auto` with `overflow-y: hidden` is a scroll
      // region, and a box is only broken when an axis that refuses to scroll is the one overflowing.
      const cutX = overX && hidden(cs.overflowX)
      const cutY = overY && hidden(cs.overflowY)
      const scrollX = overX && scrolls(cs.overflowX)
      const scrollY = overY && scrolls(cs.overflowY)
      const by = [overX ? `w+${el.scrollWidth - el.clientWidth}` : '', overY ? `h+${el.scrollHeight - el.clientHeight}` : ''].join('')
      if (cutX || cutY) {
        trunc.push(name)
        truncDetail.push(`${name} cut ${by}`)
      } else if (scrollX || scrollY) {
        scrollable.push(name)
      } else if (overX) {
        // A horizontal spill on a `visible` axis runs into the neighbouring box. Vertical spill is
        // normal for stacked content inside a scrolling ancestor, so it is not reported.
        trunc.push(name)
        truncDetail.push(`${name} spill ${by}`)
      }
    }
    const canvases = [...document.querySelectorAll('canvas')].map((c) => {
      const r = c.getBoundingClientRect()
      return Math.round(r.width) + '×' + Math.round(r.height)
    })
    return {
      overflowX: de.scrollWidth > de.clientWidth + 1 ? de.scrollWidth - de.clientWidth : 0,
      pageScroll: de.scrollHeight > de.clientHeight + 1,
      clipped: trunc.slice(0, 3),
      clippedN: trunc.length,
      clippedDetail: truncDetail.slice(0, 3),
      scrollN: scrollable.length,
      canvases,
      text: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
    }
  })
  const passA = await measure()
  await page.waitForTimeout(700)
  const passB = await measure()
  // Only report a truncation that is present in both passes.
  const stable = passA.clippedDetail.filter((d) => passB.clippedDetail.includes(d))
  const r = { ...passB, clippedN: stable.length, clipped: stable.slice(0, 3), clippedDetail: stable.slice(0, 3) }
  page.off('console', onMsg)
  page.off('pageerror', onErr)
  rows.push({ route, name, ...r, errors: [...new Set(errors)] })
}

console.log(`viewport ${W}×${H}\n`)
const pad = (v, n) => String(v).padEnd(n)
console.log(pad('ROUTE', 40) + pad('overflowX', 10) + pad('trunc', 7) + pad('scroll', 8) + pad('canvases', 18) + 'errors')
for (const r of rows) {
  console.log(
    pad(r.route, 40) +
      pad(r.overflowX || 'ok', 10) +
      pad(r.clippedN ? String(r.clippedN) : 'ok', 7) +
      pad(r.scrollN || '—', 8) +
      pad(r.canvases.join(' ') || '—', 18) +
      (r.errors.length ? r.errors.slice(0, 2).join(' | ') : 'none'),
  )
}
if (rows.some((r) => r.clipped.length)) {
  console.log('\nclipped elements:')
  for (const r of rows) if (r.clipped.length) console.log(' ', r.route, JSON.stringify(r.clippedDetail))
}
await browser.close()
const bad = rows.filter((r) => r.overflowX || r.clippedN || r.errors.length)
console.log(`\n${rows.length - bad.length}/${rows.length} routes clean`)
process.exit(bad.length ? 1 : 0)
