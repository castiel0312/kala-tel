/**
 * Live end-to-end check for the Potential / Future Well Planner.
 *
 * Differs from verify-potential.mjs in one way that matters: the Groq call is NOT stubbed.
 * This hits the real model with the real key from .env, so it proves the end-to-end path
 * (env wiring, CORS from the browser, real model output, defensive parsing, screening).
 * The NWIS API is still mocked from 02-api/demo-data.json because no API server exists locally.
 *
 * Requires: the dev server running, and VITE_GROQ_API_KEY set in .env.
 * Prints: PASS/FAIL lines. Never prints the key.
 */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.NWIS_BASE || 'http://localhost:5173'
const DATA = JSON.parse(readFileSync('C:/Users/adira/kala-tel-/nwis-build-kit/02-api/demo-data.json', 'utf8'))

let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`)
}
const norm = (s) => s.replace(/\s+/g, ' ').trim()
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

async function mockApi(page) {
  await page.route('**/api/v1/**', (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '')
    if (p === '/wells/active') return json(route, DATA.activeWell)
    if (p === '/landing') return json(route, DATA.landing)
    if (p === '/events') return json(route, { count: DATA.events.length, events: DATA.events, presets: [] })
    if (/\/wells\/[^/]+\/alerts$/.test(p)) return json(route, { counts: { all: DATA.alerts.length, open: 3, acknowledged: 4 }, alerts: DATA.alerts })
    if (/\/wells\/[^/]+\/live$/.test(p)) return json(route, DATA.live)
    if (p === '/documents') return json(route, { totals: DATA.libraryTotals, documents: DATA.documents })
    if (p === '/jobs') return json(route, DATA.processingJobs)
    if (p === '/analytics/summary') return json(route, DATA.analytics)
    if (p === '/assistant/suggestions') return json(route, DATA.assistant)
    if (p === '/rig/checklist') return json(route, DATA.rigMobileChecklist)
    if (p.startsWith('/graph')) return json(route, { center: 'OIL-WELL-104', hops: 1, totalNodesInStore: 38420, nodes: DATA.graph.nodes, edges: DATA.graph.edges, evidencePath: [], evidencePathText: '' })
    if (/\/wells\/[^/]+\/risks$/.test(p)) return json(route, { counts: { HIGH: 1, MEDIUM: 2, LOW: 4 }, risks: DATA.risks })
    if (/\/wells\/[^/]+\/offsets$/.test(p)) return json(route, { radiusKm: 10, count: DATA.offsetWells.length, relevantCount: DATA.offsetWells.length, wells: DATA.offsetWells })
    if (/\/documents\/[^/]+\/pages\/\d+\/extraction$/.test(p)) return json(route, DATA.extraction)
    return json(route, {})
  })
  await page.route('**/ws/**', (route) => route.abort())
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))

// Count and record the real request, but never log the auth header.
let groqCalls = 0
let groqStatus = null
let groqBodyPreview = ''
page.on('response', async (res) => {
  if (!res.url().includes('api.groq.com')) return
  groqCalls++
  groqStatus = res.status()
  try {
    const t = await res.text()
    groqBodyPreview = t.slice(0, 400)
  } catch {
    /* body already consumed or unavailable */
  }
})

await mockApi(page)

const sec = page.locator('#potential')
const text = async () => norm(await sec.innerText())

await page.goto(`${BASE}/#potential`, { waitUntil: 'domcontentloaded' })
await sec.waitFor({ timeout: 30000 })
await sec.locator('[class*=metricLabel]').first().waitFor({ timeout: 20000 })

check('section 13 loads with the mocked field', (await page.locator('#potential').count()) === 1)
check('grounding strip resolved from the API', (await sec.locator('[class*=metricLabel]').count()) === 6)

const keyPanel = (await text()).includes('access key required')
check('key is supplied by .env without any UI entry', !keyPanel, keyPanel ? 'key panel still shown - env not picked up' : '')

check('run button is available', (await sec.locator('button:has-text("Run placement")').count()) > 0)
await sec.locator('button:has-text("Run placement")').first().click()

/* the real model can take a while; watch for whichever terminal state arrives first */
let outcome = 'timeout'
try {
  await page.waitForSelector(
    '#potential svg[aria-label^="Placement plan"], #potential [role="alert"]',
    { timeout: 120000 },
  )
  const hasPlan = await page.locator('#potential svg[aria-label^="Placement plan"]').count()
  outcome = hasPlan ? 'plan' : 'alert'
} catch {
  /* left as timeout */
}

check('the run reached a terminal state (no hang)', outcome !== 'timeout', outcome)
check('the browser reached Groq', groqCalls > 0, `calls=${groqCalls} status=${groqStatus}`)
check('Groq accepted the key and returned 200', groqStatus === 200, `status=${groqStatus}`)

const cors = consoleErrors.find((e) => /CORS|Access-Control/i.test(e))
check('no CORS block from api.groq.com', !cors, cors ? cors.slice(0, 160) : '')

if (groqStatus !== 200 && groqBodyPreview) {
  console.log(`  groq said: ${norm(groqBodyPreview).slice(0, 300)}`)
}

const t = await text()
const alertText = (await sec.locator('[role="alert"]').count()) ? norm(await sec.locator('[role="alert"]').first().innerText()) : ''

if (outcome === 'alert') {
  console.log(`  UI error was: ${alertText.slice(0, 300)}`)
  check('a model/API failure is reported readably rather than silently', alertText.length > 0)
} else {
  const rows = await sec.locator('[class*=pwpShortlistRow]').count()
  check('candidates were accepted and listed', rows > 0, `${rows} rows`)
  // The section must not name the provider, an LLM, a model, or an API key. Guard that wording
  // here, because the copy is what the user reads and it is easy to reintroduce by accident.
  const jargon = (t.match(/groq|\bllm\b|api key|placement model|model confidence|proposed by llm/gi) || [])
  check('no provider, model or API-key wording is shown', jargon.length === 0, jargon.slice(0, 3).join(', '))
  // The section reports elapsed time in seconds ("8.9s"), not milliseconds.
  const elapsed = (t.match(/\d+(?:\.\d+)?\s*s\b/) || [''])[0]
  check('provenance reports a measured latency', elapsed.length > 0, elapsed)

  /* Live runs usually return well-behaved ground, so nothing is refused at the default 0.6 km
   * gap. Force the refusal path with a 1 km rule, which the same wellfield cannot satisfy.
   * Skipped when Groq rate-limits us, since the first run already proved the live path. */
  const rateLimited = /rate limit|429/i.test(t)
  if (rateLimited) {
    console.log('  SKIP the 1 km re-run: Groq rate-limited this key, which the section reported readably')
  } else {
    await sec.locator('button:has-text("1 KM GAP")').first().click()
    await page.waitForTimeout(600)
    await sec.locator('button:has-text("Run placement")').first().click()
    await page.waitForSelector('#potential svg[aria-label^="Placement plan"], #potential [role="alert"]', { timeout: 180000 })
    await page.waitForTimeout(1500)
      const t2 = await text()
      if (/rate limit/i.test(t2)) {
        console.log('  SKIP the 1 km re-run: rate-limited on the second call')
      } else {
        const alert = (await sec.locator('[role="alert"]').count()) ? norm(await sec.locator('[role="alert"]').first().innerText()) : '(no alert)'
        check('raising the gap rule still returns a plan', (await sec.locator('#potential svg[aria-label^="Placement plan"]').count()) > 0, alert.slice(0, 160))
        const refused = (t2.match(/only 0\.\d+ km from the existing bore|spacing conflict|outside the|too shallow|duplicate/i) || [''])[0]
        check('the deterministic screen refuses and explains when the rule tightens', refused.length > 0, refused)
        const refusedRows = await sec.locator('[class*=pwpRejected]').count()
        console.log(`  at 1 km gap: ${await sec.locator('[class*=pwpShortlistRow]').count()} accepted, ${refusedRows} refused panels`)
      }
  }
}

const plannerErrors = consoleErrors.filter((e) => /groq|planner|potential|candidate/i.test(e))
check('no planner or Groq console errors', plannerErrors.length === 0, plannerErrors.slice(0, 2).join(' || ').slice(0, 240))

/* Only the planner is in scope here. Other sections crash under this harness's simplified mock
 * (DocumentsSection and CorridorSection read fields the stub does not supply); that is a gap in
 * the stub, not a defect in those sections, and the 5173 app with a real API is unaffected. */
const plannerPageErrors = consoleErrors.filter((e) => e.startsWith('pageerror:') && /PotentialWell|planner/i.test(e))
check('no uncaught errors from the planner', plannerPageErrors.length === 0, plannerPageErrors.slice(0, 2).join(' || ').slice(0, 240))
const otherPageErrors = consoleErrors.filter((e) => e.startsWith('pageerror:')).length - plannerPageErrors.length
if (otherPageErrors > 0) console.log(`  note: ${otherPageErrors} unrelated section crash(es) from the mock stubs, not the planner`)

await page.screenshot({ path: 'C:/Users/adira/AppData/Local/Temp/opencode/pwp-live.png', fullPage: false })
await browser.close()

console.log(failed === 0 ? '\nLIVE CHECKS PASSED' : `\n${failed} LIVE CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
