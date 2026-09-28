import { chromium } from 'playwright'

/**
 * Layout audit. Screenshots are useless if you cannot look at them, so this walks the
 * rendered DOM and reports the things a screenshot would show: overflow past the
 * viewport, collapsed panels, clipped text, and the size of every major region.
 */
const url = process.argv[2] ?? 'http://localhost:5173/'
const width = Number(process.argv[3] ?? 1512)
const height = Number(process.argv[4] ?? 950)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 240)))
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => errors.push('goto: ' + e.message.slice(0, 120)))
await page.waitForTimeout(2200)

const report = await page.evaluate(() => {
  const out = { overflowX: document.documentElement.scrollWidth > window.innerWidth + 1, regions: [], clipped: [], tiny: [], zero: [] }
  const vw = window.innerWidth
  const vh = window.innerHeight
  for (const el of document.querySelectorAll('section, main, header, footer, article, div')) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const style = getComputedStyle(el)
    if (style.overflow === 'hidden' || style.overflowX === 'hidden') continue
    if (r.right > vw + 2 || r.left < -2) {
      const id = el.className && typeof el.className === 'string' ? el.className.split(' ').slice(0, 2).join('.') : el.tagName
      out.clipped.push(`${id} x:${Math.round(r.left)}..${Math.round(r.right)} (vw ${vw})`)
    }
  }
  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : ''
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`
  }
  for (const sel of ['header', 'main > div', 'main section', 'main footer']) {
    for (const el of document.querySelectorAll(sel)) out.regions.push(label(el))
  }
  // text clipped by its own box
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue
    const t = (el.textContent || '').trim()
    if (!t) continue
    const r = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    if (style.overflow === 'hidden' && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && el.clientWidth > 0) {
      out.clipped.push(`text "${t.slice(0, 34)}" in ${Math.round(r.width)}×${Math.round(r.height)} (needs ${el.scrollWidth}×${el.scrollHeight})`)
    }
  }
  const canvases = [...document.querySelectorAll('canvas')].map((c) => `${Math.round(c.getBoundingClientRect().width)}×${Math.round(c.getBoundingClientRect().height)}`)
  return { ...out, canvases, text: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 1400) }
})

console.log(JSON.stringify(report, null, 1).slice(0, 4200))
console.log('ERRORS:', errors.length ? errors.slice(0, 6).join('\n  ') : 'none')
await browser.close()
