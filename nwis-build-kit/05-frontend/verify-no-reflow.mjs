import { chromium } from 'playwright'

/**
 * Whether the machine stays reachable after the well opens.
 *
 * The section is a fixed height and the open sequence must not reflow it, so the answer to "where
 * is the machine" cannot change. This measures it closed, mid-sequence and open, at the widths
 * where the hero stacks.
 */
const URL = process.env.URL ?? 'http://localhost:5173/'

const browser = await chromium.launch()

for (const size of [
  { name: '1440x900', w: 1440, h: 900 },
  { name: '1180x820', w: 1180, h: 820 },
  { name: '834x1000', w: 834, h: 1000 },
  { name: '390x844', w: 390, h: 844 },
]) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)

  const read = () =>
    page.evaluate(() => {
      const s = document.querySelector('.nwis-scroll')
      const stage = document.querySelector('[class*="_stage_"]')
      const hot = document.querySelector('[class*="stageHotspot"]')
      const close = document.querySelector('[class*="sectionClose"]')
      const sr = s.getBoundingClientRect()
      const rel = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: Math.round(r.top - sr.top), h: Math.round(r.height) }
      }
      return {
        scrollTop: Math.round(s.scrollTop),
        stage: rel(stage),
        stageH: rel(stage)?.h,
        hotspot: rel(hot),
        closeY: close ? Math.round(close.getBoundingClientRect().top - sr.top) : null,
        closeHits: close
          ? (() => {
              /* Only meaningful if the control is on screen at all: below the fold there is
                 nothing to intercept it, and `elementFromPoint` answers null rather than the
                 control — which is a fact about the scroll position, not about the stacking. */
              const r = close.getBoundingClientRect()
              if (r.top < 0 || r.bottom > s.clientHeight) return 'below-fold'
              return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === close
            })()
          : null,
      }
    })

  const landing = await read()
  await page.evaluate(() => document.querySelector('[class*="stageHotspot"]')?.click())
  await page.waitForTimeout(250)
  const mid = await read()
  await page.waitForTimeout(2200)
  const open = await read()

  const movedStage = Boolean(landing.stage && open.stage && landing.stage.h !== open.stage.h)
  const movedPage = landing.scrollTop !== open.scrollTop
  const ok = !movedStage && !movedPage && open.closeHits === true
  console.log(
    `${ok ? 'ok  ' : 'BAD '} ${size.name.padEnd(9)} stageH ${landing.stage?.h} -> ${open.stage?.h}` +
      `  scrollTop ${landing.scrollTop} -> ${open.scrollTop}` +
      `  closeY ${open.closeY} hits=${open.closeHits}`,
  )
  await ctx.close()
}

await browser.close()
