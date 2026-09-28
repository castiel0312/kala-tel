import { chromium } from 'playwright'

/**
 * §6, measured: every piece of text in the hero's right-hand visual, at six widths, in both states.
 *
 * The old version of this file measured the three formation names and the bit's depth, because those
 * were the only two things that had ever collided. §6 makes the claim much larger — *nothing* under
 * 11px, and no two labels overlapping in two dimensions — so this measures every `<text>` in the
 * panel rather than the handful that used to be a problem, and it measures the open state as well as
 * the landing state, because the full labels, the ruler, the casing, the neighbour wells and the
 * history only exist once the well is open.
 *
 * ## What counts as a label
 *
 * One `<text>` is one label, including its `<tspan>`s: a name and the depth printed under it are one
 * label, and treating them as two would report a collision with a line that is not there. Two
 * *different* `<text>` elements that share pixels in both axes are a real collision, because both are
 * painted. There is no exemption for anything — the ruler's ticks included — and if the ruler turns
 * out to need one, that is a finding rather than a limitation of the check.
 *
 * The 11px floor is read from the *computed* style rather than from the stylesheet, so a size that
 * arrives through a custom property, a media query or an inline style is held to it too.
 */

const SIZES = [
  { name: '1440', w: 1440, h: 900 },
  { name: '1180', w: 1180, h: 820 },
  { name: '834', w: 834, h: 1000 },
  { name: '390', w: 390, h: 844 },
  { name: '360', w: 360, h: 780 },
  { name: '320', w: 320, h: 700 },
]

const MIN_PX = 11
/** Two boxes closer than this in both axes are treated as touching; sub-pixel is not a collision. */
const EPS = 0.5

const label = (t) => (t ?? '').replace(/\s+/g, ' ').trim().slice(0, 24)

const browser = await chromium.launch()
let bad = 0
const allTooSmall = new Map()

for (const s of SIZES) {
  for (const state of ['landing', 'open']) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } })
    await page.goto(process.env.URL ?? 'http://localhost:5174/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)
    if (state === 'open') {
      await page.locator('button[aria-controls="hero-well-detail"]').click()
      await page.waitForTimeout(1900)
    }

    const r = await page.evaluate(({ min }) => {
      const panel = document.querySelector('[data-open-panel]')
      /* A missing panel is a finding, not an excuse: the caller has to be able to say "there was
         nothing there to measure" rather than have the whole run die on a TypeError. */
      if (!panel) return { items: [], labels: [], missing: true }
      const out = []
      const groups = new Map()
      const byGroup = new Map()
      panel.querySelectorAll('text').forEach((el) => {
        /* hidden by the state it is in — `display:none`, an ancestor at zero opacity, or off-panel */
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return
        let node = el
        let shown = true
        while (node && node !== panel) {
          const c = getComputedStyle(node)
          if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) === 0) { shown = false; break }
          node = node.parentElement
        }
        if (!shown) return
        const r = el.getBoundingClientRect()
        if (r.width < 0.5 || r.height < 0.5) return
        /* A name and the depth printed under it are one label, not two, so the collision test is
           run between *groups*: the nearest ancestor <g>, or the element itself if it has none.
           The 11px floor is still applied per <text>, because each line has to be legible on its
           own, and a group of two 8px lines is not an 11px label. */
        let host = el
        while (host.parentElement && host.parentElement !== panel && host.tagName.toLowerCase() !== 'g') host = host.parentElement
        const key = host === el ? `solo:${out.length}` : `g:${groups.get(host) ?? (() => { const n = groups.size; groups.set(host, n); return n })()}`
        ;(byGroup.get(key) ?? byGroup.set(key, []).get(key)).push({ t: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24), size: Math.round(parseFloat(cs.fontSize) * 10) / 10 })
        out.push({
          t: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24),
          key,
          left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
          min,
        })
      })
      const labels = [...byGroup.entries()].map(([key, parts]) => {
        const rows = out.filter((i) => i.key === key)
        return {
          key,
          t: label_of(parts.map((p) => p.t).join(' / ')),
          left: Math.min(...rows.map((r) => r.left)), right: Math.max(...rows.map((r) => r.right)),
          top: Math.min(...rows.map((r) => r.top)), bottom: Math.max(...rows.map((r) => r.bottom)),
        }
      })
      return { items: out, labels }
      function label_of(t) { return t.replace(/\s+/g, ' ').trim().slice(0, 24) }
    }, { min: MIN_PX })
    const items = r.items

    if (r.missing) {
      bad++
      console.log(`BAD   ${s.name.padEnd(5)} ${state.padEnd(7)} no [data-open-panel] in the DOM — nothing to measure`)
      await page.close()
      continue
    }
    const tooSmall = items.filter((i) => i.size < MIN_PX)
    for (const i of tooSmall) {
      const key = `${i.t || '(blank)'} @${i.size}px`
      allTooSmall.set(key, (allTooSmall.get(key) ?? 0) + 1)
    }

    /* Text against text, skipping pairs that belong to the same group.
     *
     * The group is the exemption, not the unit of comparison: a name and the depth under it are
     * allowed to touch, and nothing else is. Comparing the *bounding box of a whole group* would
     * instead be a claim about a box no glyph occupies — the bit's three labels are one group with
     * their first and last lines a long way apart, and the union of those two boxes covers
     * everything between them, so every risk label in that stretch would be reported as overprinted
     * by a bit label that is nowhere near it. */
    const clashes = []
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        if (a.key === b.key) continue
        if (a.left < b.right - EPS && b.left < a.right - EPS && a.top < b.bottom - EPS && b.top < a.bottom - EPS) {
          clashes.push(`${label(a.t)} x ${label(b.t)}`)
        }
      }
    }

    const ok = tooSmall.length === 0 && clashes.length === 0
    if (!ok) bad++
    console.log(
      `${ok ? 'ok  ' : 'BAD '} ${s.name.padEnd(5)} ${state.padEnd(7)} labels=${String(items.length).padStart(3)}` +
        (tooSmall.length ? ` under11=${tooSmall.length}` : '') +
        (clashes.length ? ` clashes=${clashes.length}` : ''),
    )
    for (const t of [...new Set(tooSmall.map((i) => `${label(i.t) || '(blank)'}=${i.size}px`))].slice(0, 12)) {
      console.log(`       small: ${t}`)
    }
    for (const c of [...new Set(clashes)].slice(0, 12)) console.log(`       clash: ${c}`)
    await page.close()
  }
}

await browser.close()

if (allTooSmall.size) {
  console.log(`\nlabels under ${MIN_PX}px, by item:`)
  for (const [k, n] of [...allTooSmall.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k}  ×${n}`)
}
console.log(bad ? `\n${bad} of ${SIZES.length * 2} state/width combinations have label problems` : `\nno label problems in ${SIZES.length * 2} state/width combinations`)
process.exit(bad ? 1 : 0)
