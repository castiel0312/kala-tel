import { chromium } from 'playwright'

/**
 * Verifies that the Document Intelligence highlight overlay sits on the lines the API says it
 * should, by comparing each overlay box against the PDF.js text layer's own span positions.
 * This is the only way to be sure a source-linked highlight is honest without looking at it.
 */
const url = process.argv[2] ?? 'http://localhost:5173/documents/W-067_WCR_2019.pdf/47'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)))
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForSelector('[class*=mark]', { timeout: 20000 })
await page.waitForTimeout(2500)

const out = await page.evaluate(() => {
  const canvas = document.querySelector('.react-pdf__Page__canvas')
  const cr = canvas.getBoundingClientRect()
  const marks = [...document.querySelectorAll('[class*="mark"]')].filter((m) => m.tagName === 'BUTTON').map((m) => {
    const r = m.getBoundingClientRect()
    return { id: m.getAttribute('aria-label')?.replace('Highlight for ', ''), top: Math.round(r.top), h: Math.round(r.height), left: Math.round(r.left) }
  })
  const spans = [...document.querySelectorAll('.react-pdf__Page__textContent span')]
  const lineTops = {}
  for (const s of spans) {
    const r = s.getBoundingClientRect()
    const key = Math.round(r.top / 2) * 2
    if (!lineTops[key]) lineTops[key] = { top: Math.round(r.top), text: '' }
    lineTops[key].text += s.textContent
  }
  return { canvas: { top: Math.round(cr.top), h: Math.round(cr.height), w: Math.round(cr.width) }, marks, lines: Object.values(lineTops).sort((a, b) => a.top - b.top), spanCount: spans.length }
})

console.log('text layer spans:', out.spanCount, '| page canvas:', JSON.stringify(out.canvas))
console.log('\ntext lines (top px, text):')
for (const l of out.lines) console.log('  ', l.top, JSON.stringify(l.text.slice(0, 52)))
console.log('\noverlay boxes:')
for (const m of out.marks) {
  const near = out.lines.reduce((best, l) => (Math.abs(l.top - m.top) < Math.abs(best.top - m.top) ? l : best), out.lines[0] ?? { top: -1, text: '' })
  console.log(`  ${m.id} top=${m.top} h=${m.h} left=${m.left} -> nearest line top=${near.top} Δ=${Math.abs(near.top - m.top)}px  ${JSON.stringify(near.text.slice(0, 46))}`)
}
console.log('\nerrors:', errors.length ? errors.slice(0, 4) : 'none')
await browser.close()
