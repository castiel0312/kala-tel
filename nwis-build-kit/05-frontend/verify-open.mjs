import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

/**
 * Drives the open sequence the way a reader does, and reports what the browser built at each stage.
 *
 * It presses the machine — not a label — and reads the master number the sequence writes, so the
 * report describes the actual transition rather than the end state. Four moments are checked: the
 * landing page as it arrives, the press, the fully lit section, and the page after the machine has
 * been pressed again.
 *
 * The landing page is not an empty state, so it is measured like a state. A shut well and a landing
 * page would both report `--nw-open: 0`, and that number alone cannot tell the two apart — the
 * difference is what is *on* the page at 0 (the rock, three names, the bore) against what arrives
 * with the number (the ruler, the full column, the casing, the neighbours). Both halves are read
 * here, because a landing page that has quietly regressed into a cover and a row of hairlines still
 * reports a perfect 0.
 */
const URL = process.env.URL ?? 'http://localhost:5173/'
const OUT = process.env.OUT ?? '/tmp/nwis-open'
mkdirSync(OUT, { recursive: true })

const SIZES = [
  { name: '1440', w: 1440, h: 900 },
  { name: '1180', w: 1180, h: 820 },
  { name: '834', w: 834, h: 1000 },
  { name: '390', w: 390, h: 844 },
]

const browser = await chromium.launch()
let bad = 0

for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)

  const errorsSeen = []
  const panel = '[data-open-panel]'
  const readOpen = () =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel)
      return el ? Number.parseFloat(el.style.getPropertyValue('--nw-open') || '0') : null
    }, panel)

  /** Everything the sequence is supposed to have put on screen by now. */
  const stage = async (label, want) => {
    const v = await readOpen()
    const info = await page.evaluate((sel) => {
      const p = document.querySelector(sel)
      const cs = (el) => (el ? getComputedStyle(el) : null)
      /* Each stage is read by the property that actually drives it, and they are not the same
         property: the lead and the record are opacities, the casing's growth is a `scaleY` about
         the ground line, and the rock is a `<g>` whose reveal is handed to WebGL rather than to
         the DOM. Reading one of these for all of them returns a default of 1 for the others, which
         is how a shut well comes to look fully open in a report and the report is believed. */
      const alpha = (sel) => {
        const el = document.querySelector(sel)
        return el ? Number.parseFloat(getComputedStyle(el).opacity) : null
      }
      const scaleY = (sel) => {
        const el = document.querySelector(sel)
        return el ? Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).d) : null
      }
      const count = (sel) => document.querySelectorAll(sel).length

      const rig = document.querySelector('[class*="stageHotspot"]')
      /* The control that must not exist. There is no second way into the section, so any button in
         the hero that offers a verb is a regression to a cover and a cue — and it is the one fault
         in this arrangement a reader would notice first, because it is what the page used to do. */
      const cue = [...document.querySelectorAll('button')].find((b) =>
        /explore (well|the)|open (well|the section|underground)/i.test(b.textContent ?? ''),
      )
      const close = document.querySelector('[class*="sectionClose"]')
      const bands = [...document.querySelectorAll('[class*="fallbackBand"]')]

      /* On the landing page three names are printed and the full column is not. Both are in the
         DOM at all times — the reading is faded, not unmounted, so the hand-off is a cross-fade —
         which is exactly why this is two opacities and not a row count. */
      const restNames = count('[class*="stNames"] [class*="formName"]')
      const fullNames = alpha('[class*="stLabels"]')
      const ruler = alpha('[class*="ruler"]')
      const bore = count('[class*="boreHair"]')

      return {
        open: p ? Number.parseFloat(p.style.getPropertyValue('--nw-open') || '0') : null,
        canvas: Boolean(p?.querySelector('canvas')),
        hotspot: Boolean(rig),
        expanded: rig?.getAttribute('aria-expanded') ?? null,
        cue: Boolean(cue),
        closeVisible: close ? Number.parseFloat(cs(close).opacity) > 0.1 : null,
        lead: alpha('[class*="whLead"]'),
        rock: alpha('[class*="stRock"]'),
        ground: alpha('[class*="stGround"]'),
        casing: scaleY('[class*="stCasing"]'),
        neighbours: alpha('[class*="stNeighbours"]'),
        history: alpha('[class*="stHistory"]'),
        restNames,
        fullNames,
        ruler,
        bore,

        bandsLit: bands.filter((b) => Number.parseFloat(cs(b).opacity) > 0.5).length,
        bands: bands.length,
        /* Only ink counts. The machine's frame is full-width and scales during the lean, so
           `scrollWidth` reports a few px of overhang that is transparent and is clipped by the panel
           on purpose. What would be a real fault is *drawn* content past the panel's edge, so this
           measures the painted boxes of the stage's own parts rather than the scroll area. */
        ink: p
          ? (() => {
              const pr = p.getBoundingClientRect()
              const parts = [...p.querySelectorAll('[class*="stageSite"], [class*="stageSky"], [class*="wellhead"], [class*="whLead"], [class*="hotspotRing"]')]
              let over = 0
              for (const el of parts) {
                const r = el.getBoundingClientRect()
                if (r.width === 0) continue
                over = Math.max(over, Math.round(Math.max(r.right - pr.right, pr.left - r.left)))
              }
              return over
            })()
          : 0,
      }
    }, panel)
    const open = typeof v === 'number' && v >= 0
    /* The landing page's own claim, checked rather than assumed: the rock is on the page, it is
       painted, the bore reaches the bit, three names are printed, the full column is not, the ruler
       is not, and the machine is the only way in. A cover fails this at `bandsLit` and `bore`, which
       is the point of measuring it.
       `want` is which of the two pictures this moment is supposed to be holding, and only that
       picture is asserted of it. The sequence passes back through the landing picture on its way
       shut, and a stage held to the wrong one of the two would report a fault in a transition that
       is working; a moment deliberately *between* the two is asked for nothing beyond the master
       number, because which of the two pictures a cross-fade is holding at 260ms is a question about
       the machine's speed and not about the design. */
    const landingOk =
      want !== 'landing' ||
      (info.bandsLit > 0 && info.bore > 0 && info.restNames > 0 && info.restNames <= 4 && (info.fullNames ?? 1) < 0.5 && (info.ruler ?? 1) < 0.5)
    const litOk = want !== 'lit' || (info.fullNames > 0.5 && info.ruler > 0.5 && info.bandsLit > 0)
    const ok = open && info.ink <= 1 && !info.cue && info.hotspot
    if (!ok || !landingOk || !litOk) bad++

    console.log(
      `${ok && landingOk && litOk ? 'ok  ' : 'BAD '} ${size.name.padEnd(5)} ${label.padEnd(13)} t=${String(v).padEnd(7)} ` +
        `canvas=${info.canvas ? 'y' : 'n'} ring=${info.hotspot ? 'y' : 'n'} exp=${info.expanded ?? '-'} cue=${info.cue ? 'y' : 'n'} ` +
        `close=${info.closeVisible === null ? 'n/a' : info.closeVisible ? 'y' : 'n'} ` +
        `gnd=${f(info.ground)} lead=${f(info.lead)} rock=${f(info.rock)} casing=${f(info.casing)} nb=${f(info.neighbours)} hist=${f(info.history)} ` +
        `names=${info.restNames}/${f(info.fullNames)} ruler=${f(info.ruler)} bore=${info.bore} ` +
        `bands=${info.bandsLit}/${info.bands}` +
        (info.ink > 1 ? ` INK PAST EDGE ${info.ink}px` : ''),
    )
    await page.screenshot({ path: `${OUT}/${size.name}-${label}.png` })
  }

  await stage('landing', 'landing')

  // The press: the machine's own rectangle, which is what a reader clicks. Brought into view
  // first, because a press is a press wherever the machine happens to be sitting.
  await page.evaluate(() => {
    const el = document.querySelector('[class*="stageHotspot"]')
    el?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(400)

  const box = await page.evaluate(() => {
    const el = document.querySelector('[class*="stageHotspot"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (!box) {
    console.log(`BAD  ${size.name} no machine to press`)
    bad++
  } else {
    await page.mouse.click(box.x, box.y)
    await page.waitForTimeout(260)
    await stage('opening', 'between')
    await page.waitForTimeout(2200)
    await stage('open', 'lit')

    /* The machine is a toggle, so pressing it again is the way back — checked here rather than only
       through the section's own close control, because "the same press that lit the ground puts it
       back" is a claim about the machine, not about the close button. The close control is then
       still exercised, since it is the one a reader who has scrolled past the rig will reach for. */
    await page.evaluate(() => {
      const el = document.querySelector('[class*="stageHotspot"]')
      el?.scrollIntoView({ block: 'center' })
    })
    await page.waitForTimeout(300)
    const back = await page.evaluate(() => {
      const el = document.querySelector('[class*="stageHotspot"]')
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    await page.mouse.click(back.x, back.y)
    await page.waitForTimeout(1600)
    await stage('toggled-back', 'landing')

    await page.mouse.click(box.x, box.y)
    await page.waitForTimeout(2000)

    const closeBox = await page.evaluate(() => {
      const el = document.querySelector('[class*="sectionClose"]')
      if (!el) return null
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    await page.waitForTimeout(400)
    if (!closeBox) {
      console.log(`BAD  ${size.name} no close control when open`)
      bad++
    } else {
      await page.mouse.click(closeBox.x, closeBox.y)
      await page.waitForTimeout(1600)
      await stage('closed2', 'landing')
    }
  }

  if (errors.length) {
    console.log(`     errors: ${errors.slice(0, 4).join(' | ')}`)
    bad++
  }
  await ctx.close()
}

await browser.close()
console.log(bad ? `\n${bad} problem(s)` : '\nall stages ok')
process.exit(bad ? 1 : 0)

function f(n) {
  return n === null ? ' n/a' : n.toFixed(2)
}
