import { chromium } from 'playwright'

/**
 * The reduced-motion contract, stated as a test.
 *
 * The requirement is not "the animation is shorter" — it is that a reader who has asked for less
 * motion is given the *destination*, not a blank or a half-open state. So this asserts the end
 * state is reached on the first frame: the number is 1 immediately, every stage is at its final
 * value, and nothing in the tree is still waiting to arrive.
 *
 * It also asserts the landing page, because that is now a state with a claim of its own: the ground
 * is on the page before anything is pressed, and a reader who has asked for less motion should
 * arrive at exactly the same ground — just without the ground coming *on*. Reading the landing page
 * only for `--nw-open: 0` would pass a cover and a row of hairlines as readily as it passes this.
 */
const URL = process.env.URL ?? 'http://localhost:5173/'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
})
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)

const read = () =>
  page.evaluate(() => {
    const p = document.querySelector('[data-open-panel]')
    const alpha = (sel) => {
      const el = document.querySelector(sel)
      return el ? Number.parseFloat(getComputedStyle(el).opacity) : null
    }
    const scaleY = (sel) => {
      const el = document.querySelector(sel)
      return el ? Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).d) : null
    }
    const bands = [...document.querySelectorAll('[class*="fallbackBand"]')]
    const rig = document.querySelector('[class*="stageHotspot"]')
    return {
      t: Number.parseFloat(p.style.getPropertyValue('--nw-open') || '-1'),
      rock: alpha('[class*="stRock"]'),
      casing: scaleY('[class*="stCasing"]'),
      neighbours: alpha('[class*="stNeighbours"]'),
      history: alpha('[class*="stHistory"]'),
      closeVisible: alpha('[class*="sectionClose"]'),
      system: Boolean(document.querySelector('[class*="systemBar"]')),
      detail: Boolean(document.querySelector('[class*="_detail_"]')),
      /* The machine is a toggle, so it is still on the page when lit and now says it will close the
         well. Asserting that it has gone would be asserting the old design. */
      machineThere: Boolean(rig),
      expanded: rig?.getAttribute('aria-expanded') ?? null,
      /* The cover is not a thing any more: it should not be in the document in any state. */
      coverThere: Boolean(document.querySelector('[class*="cover"]')),
      /* …and the landing picture should be. */
      bandsLit: bands.filter((b) => Number.parseFloat(getComputedStyle(b).opacity) > 0.5).length,
      bore: document.querySelectorAll('[class*="boreHair"]').length,
      restNames: document.querySelectorAll('[class*="stNames"] [class*="formName"]').length,
    }
  })

const landing = await read()
await page.evaluate(() => document.querySelector('[class*="stageHotspot"]')?.click())
/* One frame. Not a wait: if the state is wrong it is wrong now, and waiting would let a real
   animation paper over it. */
await page.waitForTimeout(120)
const firstFrame = await read()
await page.waitForTimeout(1200)
const settled = await read()

const open = firstFrame
const problems = []
if (landing.t !== 0) problems.push(`landing t=${landing.t}, expected 0`)
if (landing.coverThere) problems.push('a cover element is in the document')
if (landing.bandsLit < 1) problems.push(`landing page has no lit rock (${landing.bandsLit})`)
if (landing.bore < 1) problems.push('landing page has no bore drawn to the bit')
if (landing.restNames < 1 || landing.restNames > 4) problems.push(`landing page prints ${landing.restNames} names, expected 1–3`)
if (open.t !== 1) problems.push(`first frame t=${open.t}, expected 1`)
for (const k of ['rock', 'casing', 'neighbours', 'history', 'closeVisible']) {
  if (Math.abs((open[k] ?? 0) - 1) > 0.02) problems.push(`first frame ${k}=${open[k]}, expected 1`)
}
if (open.coverThere) problems.push('a cover element is in the document once lit')
if (!open.system) problems.push('readouts did not mount on the first frame')
if (!open.detail) problems.push('record did not mount on the first frame')
if (!open.machineThere) problems.push('the machine is gone once lit, so there is no way back from the keyboard')
if (open.expanded !== 'true') problems.push(`machine aria-expanded is "${open.expanded}" when lit`)
if (Math.abs(settled.t - 1) > 0.001) problems.push(`settled t=${settled.t}`)

console.log('landing     ', JSON.stringify(landing))
console.log('first frame ', JSON.stringify(firstFrame))
console.log('settled     ', JSON.stringify(settled))
console.log(errors.length ? `console errors: ${errors.slice(0, 3).join(' | ')}` : 'no console errors')
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nreduced motion: destination on the first frame')

await browser.close()
process.exit(problems.length || errors.length ? 1 : 0)
