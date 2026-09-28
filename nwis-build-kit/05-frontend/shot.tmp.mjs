import { chromium } from 'playwright'
const url = process.env.URL ?? 'http://localhost:5174/'
const out = process.argv[2] ?? '/tmp/hero.png'
const w = Number(process.argv[3] ?? 1440)
const open = process.argv[4] === 'open'
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: w, height: w < 500 ? 900 : 1000 }, deviceScaleFactor: 2 })
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', (e) => errs.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
if (open) {
  await page.locator('button[aria-controls="hero-well-detail"]').click()
  await page.waitForTimeout(2000)
}
const el = page.locator('[data-open-panel]')
await (await el.count() ? el.first() : page.locator('body')).screenshot({ path: out })
console.log('shot', out, 'errors:', errs.length ? errs.slice(0, 4) : 'none')
await b.close()
