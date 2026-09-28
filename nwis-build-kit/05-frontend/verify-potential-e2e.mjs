/**
 * End-to-end against the real stack: the dev API on :8000 and the real Groq model, with no
 * network stubbing whatsoever. This is the check that mirrors what a person sees in the browser.
 * Requires: 02-api/dev-server.mjs and the 05-frontend dev server both running.
 */
import { chromium } from 'playwright'

const BASE = process.env.NWIS_BASE || 'http://localhost:5199'
let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`)
}
const norm = (s) => s.replace(/\s+/g, ' ').trim()

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const apiFails = []
page.on('response', (r) => {
  if (r.url().includes('/api/v1/') && r.status() >= 400) apiFails.push(`${r.status()} ${new URL(r.url()).pathname}`)
})

const sec = page.locator('#potential')
await page.goto(`${BASE}/#potential`, { waitUntil: 'domcontentloaded' })
await sec.waitFor({ timeout: 30000 })

/* the evidence base must fill from the real API before anything else is believable */
try {
  await sec.locator('[class*=metricLabel]').first().waitFor({ timeout: 25000 })
  await page.waitForTimeout(2500)
} catch {
  /* reported below */
}

const labels = (await sec.locator('[class*=metricLabel]').allInnerTexts()).map(norm)
const t = norm(await sec.innerText())

check('no API endpoint returned an error', apiFails.length === 0, apiFails.slice(0, 4).join(', '))
check('the evidence base is populated from the live API', labels.length === 6, `${labels.length} metrics`)
/* Ask the API what it should return rather than hardcoding, then require the section to agree.
 * The counts are radius- and type-filtered on purpose: 3 bores inside the 3 km default radius,
 * 4 of the 12 events are LOSS. */
const api = await page.evaluate(async () => {
  const r = await fetch('/api/v1/wells/OIL-WELL-104/offsets?radius_km=3')
  const o = await r.json()
  const e = await (await fetch('/api/v1/events?type=LOSS')).json()
  return { wells: o.count, loss: e.count }
})

check('field name comes from /wells/active', t.includes('Upper Assam'))
check(`bore count matches the API (${api.wells} within the 3 km radius)`, t.includes(`${api.wells} wells`), (t.match(/\b\d+ wells\b/) || [''])[0])
check(`loss-event count matches the API (${api.loss} LOSS)`, t.includes(`${api.loss} indexed`), (t.match(/\b\d+ indexed\b/) || [''])[0])
check('the map area is present, not a blank box', (await sec.locator('svg').count()) > 0, `${await sec.locator('svg').count()} svg`)

/* now the real model, one call */
await sec.locator('button:has-text("Run placement")').first().click()
let outcome = 'timeout'
try {
  await page.waitForSelector('#potential svg[aria-label^="Placement plan"], #potential [role="alert"]', { timeout: 180000 })
  outcome = (await sec.locator('#potential svg[aria-label^="Placement plan"]').count()) ? 'plan' : 'alert'
} catch { /* timeout */ }
await page.waitForTimeout(1200)

const t2 = norm(await sec.innerText())
check('a placement run completed', outcome === 'plan', outcome === 'alert' ? norm(await sec.locator('[role="alert"]').first().innerText()).slice(0, 160) : outcome)
const rows = await sec.locator('[class*=pwpShortlistRow]').count()
check('candidates are listed', rows > 0, `${rows} rows`)
check('the plan draws the reference well and the bores', (await sec.locator('#potential svg[aria-label^="Placement plan"] title').count()) > 0)
check('the inspector explains the selection', /WHY HERE|PLACEMENT CASE/.test(t2))
check('provenance is shown', /PLACEMENT BASIS/.test(t2), (t2.match(/PLACEMENT BASIS [^A-Z]{0,40}/) || [''])[0])

await page.screenshot({ path: 'C:/Users/adira/AppData/Local/Temp/opencode/pwp-real.png' })
const plannerErrors = errors.filter((e) => /Potential|planner|candidate/i.test(e))
check('no errors from the planner', plannerErrors.length === 0, plannerErrors.slice(0, 2).join(' | ').slice(0, 200))
const other = [...new Set(errors)].filter((e) => !/Potential|planner|candidate/i.test(e))
if (other.length) console.log(`  note: ${other.length} unrelated error(s), first: ${norm(other[0]).slice(0, 140)}`)

await browser.close()
console.log(failed === 0 ? '\nEND-TO-END PASSED' : `\n${failed} END-TO-END CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
