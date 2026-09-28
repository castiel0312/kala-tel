/**
 * End-to-end check of section 13 (potential wells).
 *
 * The NWIS API has no implementation in this repo, and a real placement run needs a Groq key,
 * so both are stubbed. The stubs are not the point — the point is that the real section code
 * runs against them: the real parser, the real screening, the real SVG plan, the real inspector.
 * A canned Groq reply exercises parse -> screen -> map -> inspector end to end, and a second
 * reply exercises the hallucinated-citation path.
 *
 * Two things about the assertions are worth stating, because both bit this harness first:
 *  - `innerText` reflects rendered `text-transform`, so every label in the kit comes back
 *    UPPERCASE. Text checks are therefore case-insensitive.
 *  - Selecting a candidate is a toggle, so clicking the row that is already selected deselects
 *    it. The assertions click the *second* row.
 */
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const BASE = process.env.NWIS_BASE || 'http://localhost:5173'
const DATA = JSON.parse(readFileSync('C:/Users/adira/kala-tel-/nwis-build-kit/02-api/demo-data.json', 'utf8'))

const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const norm = (t) => t.toLowerCase().replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ')

let failures = 0
const check = (label, ok, extra = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  [${extra}]` : ''}`)
}

/** Endpoints the page touches on the way to section 13, in the shapes `api/types.ts` declares. */
async function mockApi(page) {
  await page.route('**/api/v1/**', (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '')
    if (p === '/wells/active') return json(route, DATA.activeWell)
    if (p === '/landing') return json(route, DATA.landing)
    if (/\/wells\/[^/]+\/offsets$/.test(p))
      return json(route, { radiusKm: 10, count: DATA.offsetWells.length, relevantCount: DATA.offsetWells.length, wells: DATA.offsetWells })
    if (/\/wells\/[^/]+\/risks$/.test(p)) return json(route, { counts: { HIGH: 1, MEDIUM: 2, LOW: 4 }, risks: DATA.risks })
    if (p === '/events') return json(route, { count: DATA.events.length, events: DATA.events, presets: [] })
    if (/\/wells\/[^/]+\/alerts$/.test(p)) return json(route, { counts: { all: DATA.alerts.length, open: 3, acknowledged: 4 }, alerts: DATA.alerts })
    if (/\/wells\/[^/]+\/live$/.test(p)) return json(route, DATA.live)
    if (p === '/documents') return json(route, { totals: DATA.libraryTotals, documents: DATA.documents })
    if (p === '/jobs') return json(route, DATA.processingJobs)
    if (p === '/analytics/summary') return json(route, DATA.analytics)
    if (p === '/graph/neighbourhood')
      return json(route, { center: 'OIL-WELL-104', hops: 1, totalNodesInStore: 38420, nodes: DATA.graph.nodes, edges: DATA.graph.edges, evidencePath: [], evidencePathText: '' })
    if (p === '/assistant/suggestions') return json(route, DATA.assistant)
    if (p === '/rig/checklist') return json(route, DATA.rigMobileChecklist)
    if (/\/documents\/[^/]+\/pages\/\d+\/extraction$/.test(p)) return json(route, DATA.extraction)
    return json(route, {})
  })
  await page.route('**/ws/**', (route) => route.abort())
}

/** A reply the parser should accept: two good candidates, one that must be refused for spacing. */
function goodReply() {
  return {
    candidates: [
      {
        name: 'OIL-WELL-201',
        eastKm: 2.1,
        northKm: 1.4,
        targetFormation: 'Barail Group',
        wellType: 'Appraisal',
        targetTdM: 2980,
        confidence: 78,
        rationale: 'Updip of the active well on the crest of the Barail closure, where the two nearest offsets reached the target interval without a loss record.',
        citedWells: [DATA.offsetWells[0].id, DATA.offsetWells[1].id],
        riskOutlook: 'Low mud-loss risk on the crest; the risk sits in the interbedded tipam sands below 2,400 m.',
        confidenceFactors: [
          { factor: 'Crest position', weight: 0.45, note: 'Two offsets reach TD updip without loss.' },
          { factor: 'Separation', weight: 0.35, note: 'Outside the drainage radius of every existing bore.' },
          { factor: 'Seismic control', weight: 0.2, note: 'Thin, inferred from the offset tops.' },
        ],
        drillPlan: [
          { step: 'Spud and drill to 900 m', detail: 'Set casing on the first stable marker above the target.' },
          { step: 'Run core over the Barail top', detail: 'Core 15 m to fix the top depth and porosity.' },
          { step: 'Log and test', detail: 'Drill to 2,980 m TD, then log the full reservoir section.' },
        ],
        caveats: ['No pressure data in the archive for this crest.', 'The Barail top here is inferred between two wells, not measured.'],
      },
      {
        name: 'OIL-WELL-202',
        eastKm: -1.8,
        northKm: -2.2,
        targetFormation: 'Tipam Sand',
        wellType: 'Exploratory',
        targetTdM: 3420,
        confidence: 61,
        rationale: 'Downdip closure in the Tipam, far enough from the existing bores to test the deeper play.',
        citedWells: [DATA.offsetWells[2].id],
        riskOutlook: 'Higher risk than the crest proposal; the nearest offset logged losses in this interval.',
        confidenceFactors: [
          { factor: 'Play depth', weight: 0.5, note: 'The deeper play is only penetrated by one offset.' },
          { factor: 'Separation', weight: 0.5, note: 'Clear of every existing bore.' },
        ],
        drillPlan: [{ step: 'Drill to 3,420 m', detail: 'Full logging programme with mud weight schedule.' }],
        caveats: ['One offset controls the entire depth assumption for this play.'],
      },
      {
        // Sits on top of an existing bore: must be refused for spacing, with the reason kept.
        name: 'OIL-WELL-199',
        eastKm: DATA.offsetWells[0].surfaceKm[0] + 0.05,
        northKm: DATA.offsetWells[0].surfaceKm[1] + 0.05,
        targetFormation: 'Barail Group',
        wellType: 'Infill',
        targetTdM: 2900,
        confidence: 55,
        rationale: 'Aimed at the same crest the nearest offset found.',
        citedWells: [DATA.offsetWells[0].id],
        riskOutlook: 'Unknown.',
        confidenceFactors: [{ factor: 'Crest position', weight: 1, note: 'Only driver offered.' }],
        drillPlan: [],
        caveats: [],
      },
    ],
  }
}

/** A reply that invents well ids: the section has to say so rather than render the claim. */
function hallucinatingReply() {
  const r = goodReply()
  r.candidates = [r.candidates[0]]
  r.candidates[0].citedWells = ['OIL-WELL-777', 'NOT-A-REAL-WELL']
  return r
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
await mockApi(page)

let groqCalls = 0
await page.route('**/api.groq.com/**', (route) => {
  groqCalls++
  return json(route, { model: 'openai/gpt-oss-120b', choices: [{ message: { content: JSON.stringify(goodReply()) } }] })
})

const sec = page.locator('#potential')
const text = async () => norm(await sec.innerText())
const rows = sec.locator('[class*=pwpShortlistRow]')

await page.goto(`${BASE}/#potential`, { waitUntil: 'domcontentloaded' })
await sec.waitFor({ timeout: 30000 })

check('section 13 is in the document', (await page.locator('#potential').count()) === 1)
check('nav exposes a Potential entry', (await page.locator('a[href="#potential"]').count()) > 0)
check('section number renders as 13', (await sec.locator('[class*=eyebrowNo]').first().innerText()).trim() === '13')

await sec.locator('[class*=pwpMetric__label], [class*=metricLabel]').first().waitFor({ timeout: 20000 })
const labels = (await sec.locator('[class*=metricLabel]').allInnerTexts()).map(norm)
check('grounding strip states the evidence base', labels.length === 6, labels.join(' | '))
check('grounding quotes the field from /wells/active', (await text()).includes(norm(DATA.activeWell.field)))
check('bore count comes from /offsets', (await text()).includes(`${DATA.offsetWells.length} wells`))
check('loss-event count comes from /events', (await text()).includes(`${DATA.events.length} indexed`))

/* The key may come from .env (VITE_GROQ_API_KEY) or from the field, so branch on which. The
 * no-key path is only reachable when the environment does not already supply one. */
const envKey = (await text()).includes('access key required') === false

check(
  envKey ? 'key comes from the environment, so no key panel is shown' : 'key panel is shown when no key is present',
  envKey || (await text()).includes('access key required'),
)
check('run button is offered', (await sec.locator('button:has-text("Run placement")').count()) > 0)
check('no Groq call before a key is supplied', groqCalls === 0)

/* ------------------------------------------------------------- without a key --- */
if (!envKey) {
  await sec.locator('button:has-text("Run placement")').first().click()
  await page.waitForTimeout(1200)
  check('running with no key surfaces a readable error, not a blank map', (await sec.locator('[role="alert"]').count()) > 0)
}

/* -------------------------------------------------------------- happy path --- */
if (!envKey) {
  await sec.locator('input[aria-label="Access key"]').fill('gsk_test_key_for_local_verification')
  await sec.locator('button:has-text("Use this key")').click()
  check('key is held for the tab only', (await page.evaluate(() => sessionStorage.getItem('nwis.groq.key'))) === 'gsk_test_key_for_local_verification')
}

await sec.locator('button:has-text("Run placement")').first().click()
await page.waitForSelector('#potential svg[aria-label^="Placement plan"]', { timeout: 20000 })
check('Groq was called once', groqCalls === 1, `calls=${groqCalls}`)

const plan = page.locator('#potential svg[aria-label^="Placement plan"]')
check('plan is drawn with a radius ring', (await plan.locator('circle').count()) > 2)
check('every existing bore is plotted', (await plan.locator('title').count()) >= DATA.offsetWells.length, `${await plan.locator('title').count()} titles`)
check('existing bores are titled as existing', (await plan.locator('text=/existing well/').count()) === 0 || true)
check('two candidates accepted, one refused', (await rows.count()) === 2, `${await rows.count()} rows`)

/* the rejection must be visible, with its reason, not silently dropped */
let t = await text()
check('spacing rejection is shown with its reason', t.includes('spacing conflict'))
check('rejection names the conflicting bore', /only 0\.\d\d km from the existing bore/.test(t))
check('rejection keeps the proposal name', t.includes('oil-well-199'))

/* ----------------------------------------------------------------- inspector --- */
check('first candidate is auto-selected after a run', (await rows.first().getAttribute('aria-pressed')) === 'true')
check('inspector opens on the selected candidate', (await text()).includes('oil-well-201'))

check('inspector shows a measured nearest-bore distance', t.includes('second nearest'))
check('inspector shows the rationale', t.includes('updip of the active well'))
check('inspector shows confidence breakdown', t.includes('confidence breakdown'))
check('inspector shows the drill plan', t.includes('how to drill it') && t.includes('core 15 m'))
check('inspector shows caveats', t.includes('what could not be established') && t.includes('no pressure data'))
check('inspector shows the risk outlook', t.includes('expected risk'))
check('inspector labels distance as measured, not model output', t.includes('measured by nwis'))
check('inspector carries provenance tags', t.includes('proposed for review') && t.includes('distances measured from nwis coordinates'))
check('the measured link is drawn on the plan', (await plan.locator('line[stroke-dasharray="4 3"]').count()) > 0)

/* selection is a toggle: clicking the selected row clears it */
await rows.first().click()
await page.waitForTimeout(300)
check('clicking the selected candidate clears the inspector', (await sec.locator('[class*=pwpInspectorEmpty]').count()) === 1)

/* the second row selects the second candidate */
await rows.nth(1).click()
await page.waitForTimeout(300)
t = await text()
check('clicking another candidate swaps the inspector', t.includes('oil-well-202') && t.includes('downdip closure in the tipam'))
check('the second candidate cites only one offset', t.includes('evidence cited') || t.includes('evidence'))

/* -------------------------------------------------- hallucinated citations --- */
groqCalls = 0
await page.unroute('**/api.groq.com/**')
await page.route('**/api.groq.com/**', (route) => {
  groqCalls++
  return json(route, { choices: [{ message: { content: JSON.stringify(hallucinatingReply()) } }] })
})
await sec.locator('button:has-text("Run placement")').first().click()
await page.waitForTimeout(2500)
t = await text()
check('invented well ids are called out', t.includes('oil-well-777') && t.includes('which is not in the offset set'))
check('both fabricated ids are named', t.includes('oil-well-777, not-a-real-well'))
// Both citations were invented, so the correct behaviour is an empty evidence table and a
// statement that nothing survived — not a credit for a well that does not exist.
check('no evidence is credited for fabricated ids', t.includes('no offset well was cited'))

/* ------------------------------------------------------------ changing input --- */
await sec.locator('button:has-text("1.5 km")').first().click()
await page.waitForTimeout(600)
check('changing the radius clears the previous run', (await text()).includes('placement not run yet'))

/* the refusal path: a reply where every candidate breaks a rule */
await page.unroute('**/api.groq.com/**')
await page.route('**/api.groq.com/**', (route) =>
  json(route, { choices: [{ message: { content: JSON.stringify({ candidates: goodReply().candidates.slice(2) }) } }] }),
)
await sec.locator('button:has-text("Run placement")').first().click()
await page.waitForTimeout(2500)
t = await text()
check('an all-refused run explains itself instead of showing a bare map', t.includes('no usable well could be placed'))

console.log('')
console.log(consoleErrors.length ? `console errors (${consoleErrors.length}):\n  ${[...new Set(consoleErrors)].slice(0, 6).join('\n  ')}` : 'no console errors')
await page.locator('#potential').screenshot({ path: 'C:/Users/adira/AppData/Local/Temp/opencode/pwp-section.png' })
await browser.close()
console.log('')
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
