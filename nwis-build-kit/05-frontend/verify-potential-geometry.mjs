/** Geometry and palette check for section 13. Complements verify-potential.mjs, which covers behaviour. */
import { chromium } from '@playwright/test'

const BASE = process.env.NWIS_BASE || 'http://localhost:5173'
let failures = 0
const check = (label, ok, extra = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? `  [${extra}]` : ''}`)
}

const browser = await chromium.launch()
let page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

const ACTIVE = {
  id: 'OIL-WELL-104',
  field: 'Upper Assam',
  surfaceKm: [0, 0],
  bitKm: [0, 0],
  currentFormation: 'Barail',
  formationTopsTvdssM: { Barail: 1800 },
  bit: { mdM: 2400, tvdssM: 2200, mdMinusTvdssM: 200 },
}

/* Two viewports: the desktop grid, and the stacked mobile layout. */
for (const [w, h, label] of [
  [1600, 1000, 'desktop 1600'],
  [1280, 900, 'laptop 1280'],
  [390, 844, 'mobile 390'],
]) {
  await page.setViewportSize({ width: w, height: h })
  await page.route('**/api/v1/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(new URL(r.request().url()).pathname.endsWith('/active') ? ACTIVE : {}),
    }),
  )
  await page.goto(`${BASE}/#potential`, { waitUntil: 'domcontentloaded' })
  await page.locator('#potential').waitFor({ timeout: 30000 })
  await page.locator('#potential [class*=pwpGrounding]').waitFor({ timeout: 20000 })

  const geo = await page.locator('#potential').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) }
  })
  check(`${label}: section fits the viewport, no horizontal overflow`, geo.right <= w + 1 && geo.left >= -1, `left=${geo.left} right=${geo.right} vw=${w}`)

  /* The two-column grid must not clip: every panel's right edge sits inside the section. */
  const clipped = await page.locator('#potential section, #potential ol, #potential ul').evaluateAll((nodes) =>
    nodes
      .filter((n) => {
        const p = n.closest('#potential')
        if (!p) return false
        const a = n.getBoundingClientRect()
        const b = p.getBoundingClientRect()
        return a.width > 0 && (a.right > b.right + 2 || a.left < b.left - 2)
      })
      .map((n) => n.className.slice(0, 40)),
  )
  check(`${label}: no panel overflows its section`, clipped.length === 0, clipped.join(', '))
}

/* The plan itself has to be a real drawing, not a collapsed box. A fresh context is used on
   purpose: the loop above warmed the TanStack cache with an empty offsets response, and
   `staleTime` would otherwise keep the empty set alive across the navigation. */
const OFFSET = {
  id: 'W-067',
  surfaceKm: [0.4, 0.3],
  bitDepthKm: [0.4, 0.3],
  distanceAtBitKm: 0.9,
  similarity: 82,
  tdMdM: 3200,
  tipamTopTvdssM: 2100,
  barailTopTvdssM: 1800,
  mdMinusTvdssM: 150,
  spud: 2019,
  status: 'Producing',
  risk: 'LOW',
  hasLossEvents: false,
  similarityFactors: { stratigraphy: 90, trajectory: 80, mudSystem: 75, proximity: 70 },
  relevant: true,
}

await page.context().close()
const ctx2 = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
page = await ctx2.newPage()
await page.route('**/api/v1/**', (route) => {
  const p = new URL(route.request().url()).pathname
  if (p.endsWith('/offsets'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ radiusKm: 10, count: 1, relevantCount: 1, wells: [OFFSET] }) })
  if (p.endsWith('/active'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTIVE) })
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
})
await page.goto(`${BASE}/#potential`, { waitUntil: 'domcontentloaded' })
await page.locator('#potential').waitFor({ timeout: 30000 })
await page.route('**/api.groq.com/**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ candidates: [{ name: 'A-1', eastKm: 1.2, northKm: 0.8, targetFormation: 'Barail', wellType: 'Appraisal', targetTdM: 2900, confidence: 70, rationale: 'x', citedWells: [], riskOutlook: 'y', confidenceFactors: [], drillPlan: [], caveats: [] }] }) } }] }) }),
)
// The key field only exists when VITE_GROQ_API_KEY is absent from .env; this run stubs Groq
// anyway, so either source is fine.
const keyField = page.locator('#potential input[aria-label="Groq API key"]')
if (await keyField.count()) {
  await keyField.fill('gsk_x')
  await page.locator('#potential button:has-text("Use this key")').click()
}
await page.locator('#potential button:has-text("Run placement")').first().click()
await page.waitForSelector('#potential svg[aria-label^="Placement plan"]', { timeout: 20000 }).catch(async (e) => {
  console.log('DEBUG section text:', (await page.locator('#potential').innerText()).slice(0, 500).replace(/\n/g, ' | '))
  throw e
})

const plan = await page.locator('#potential svg[aria-label^="Placement plan"]').evaluate((el) => {
  const r = el.getBoundingClientRect()
  const vb = el.getAttribute('viewBox')
  const circles = [...el.querySelectorAll('circle')]
  const radii = circles.map((c) => Number(c.getAttribute('r'))).filter((n) => n > 0)
  return { w: Math.round(r.width), h: Math.round(r.height), vb, maxR: Math.max(...radii, 0) }
})
check('plan renders at a usable size', plan.w > 380 && Math.abs(plan.w - plan.h) < 4, `${plan.w}x${plan.h} viewBox=${plan.vb}`)
check('plan has a preserved aspect ratio', plan.vb === '0 0 760 760')
check('the radius ring is actually drawn', plan.maxR > 200, `largest r=${plan.maxR}px`)

const tokens = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement)
  const want = ['--nw-paper', '--nw-yellow', '--nw-text', '--nw-red', '--nw-charcoal']
  return want.map((t) => `${t}=${cs.getPropertyValue(t).trim()}`).join(' ')
})
check('NWIS palette tokens resolve', !/=\s*$/.test(tokens), tokens)

await browser.close()
console.log('')
console.log(failures === 0 ? 'GEOMETRY OK' : `${failures} GEOMETRY CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
