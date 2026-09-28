import { chromium } from 'playwright'
const [,, url, out, w, h, full] = process.argv
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w)||1512, height: Number(h)||950 }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 300)))
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => console.log('goto:', e.message.slice(0,120)))
await page.waitForTimeout(2500)
await page.screenshot({ path: out, fullPage: full === 'full' })
console.log('ERRORS:', errors.length ? errors.slice(0, 8).join('\n  ') : 'none')
await browser.close()
