import { chromium } from 'playwright'

/**
 * The keyboard path, asserted rather than assumed.
 *
 * The machine is a real button, so it has to be one: reachable by Tab, operable with Enter and
 * Space, and described by a name a screen reader would read out. This walks the path in order and
 * reports what a reader using only a keyboard would meet, including what has focus at each step.
 *
 * The machine is a toggle rather than a one-way opener, and that changes what the keyboard owes the
 * reader. A control that disappears when it has done its job takes the reader's focus with it, and
 * dumps them at the top of the document with no announcement of what changed — which is why the
 * focus staying put, and the control renaming itself to say what it will do now, are both asserted
 * here rather than assumed.
 */
const URL = process.env.URL ?? 'http://localhost:5173/'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)

const focused = () =>
  page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 46) ?? ''
    return { tag: el.tagName.toLowerCase(), cls: el.getAttribute('class')?.split(/\s+/)[0] ?? '', name }
  })

/* Tab until the machine has focus, and record everything walked past on the way there. */
const walked = []
let found = false
for (let i = 0; i < 24 && !found; i++) {
  await page.keyboard.press('Tab')
  const f = await focused()
  walked.push(f)
  if (f?.cls?.includes('stageHotspot')) found = true
}

const problems = []
if (!found) problems.push('Tab never reached the machine')
else {
  const onMachine = walked[walked.length - 1]
  /* The name has to say what pressing it will do, and where it will do it — the reader cannot see
     that the section under the machine is what is about to change. */
  if (!/inspect|explore/i.test(onMachine.name)) problems.push(`machine's accessible name is "${onMachine.name}"`)
  if (!/beneath|section|under/i.test(onMachine.name)) problems.push(`machine's name does not say what it controls: "${onMachine.name}"`)
  if (onMachine.tag !== 'button') problems.push(`machine is a <${onMachine.tag}>, not a button`)

  /* Enter, the keyboard's way of pressing a button. */
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2400)
  const opened = await page.evaluate(() => ({
    t: Number.parseFloat(document.querySelector('[data-open-panel]').style.getPropertyValue('--nw-open') || '0'),
    closeVisible: Number.parseFloat(getComputedStyle(document.querySelector('[class*="sectionClose"]')).opacity),
    focused: document.activeElement?.getAttribute('class')?.split(/\s+/)[0] ?? '',
    name: document.activeElement?.getAttribute('aria-label') ?? '',
    expanded: document.activeElement?.getAttribute('aria-expanded') ?? null,
  }))
  if (opened.t !== 1) problems.push(`Enter did not open the well (t=${opened.t})`)
  if (opened.closeVisible < 0.5) problems.push('close control not shown after opening')

  /* The machine is still there — it is a toggle — so the focus should still be on it, and it should
     now say so. A control that unmounts on activation takes the reader's place on the page with
     it, and this is the assertion that catches that. */
  if (!opened.focused.includes('stageHotspot')) problems.push(`focus left the machine after opening (on "${opened.focused}")`)
  if (!/close/i.test(opened.name)) problems.push(`machine did not rename itself when lit: "${opened.name}"`)
  if (opened.expanded !== 'true') problems.push(`aria-expanded is "${opened.expanded}" when lit`)

  /* Enter again: the same press, put back the way it was. */
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1600)
  const retoggled = await page.evaluate(() => ({
    t: Number.parseFloat(document.querySelector('[data-open-panel]').style.getPropertyValue('--nw-open') || '-1'),
    expanded: document.querySelector('[class*="stageHotspot"]')?.getAttribute('aria-expanded') ?? null,
  }))
  if (retoggled.t !== 0) problems.push(`Enter did not put the well back (t=${retoggled.t})`)
  if (retoggled.expanded !== 'false') problems.push(`aria-expanded is "${retoggled.expanded}" when back on the landing page`)

  /* Escape, the keyboard's way back. */
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1600)
  const closed = await page.evaluate(() => ({
    t: Number.parseFloat(document.querySelector('[data-open-panel]').style.getPropertyValue('--nw-open') || '-1'),
    detail: Boolean(document.querySelector('[class*="_detail_"]')),
  }))
  if (closed.t !== 0) problems.push(`Escape did not close the well (t=${closed.t})`)
  if (closed.detail) problems.push('record still mounted after closing')

  /* And Space on the way in, since it is the other half of activating a button. */
  await page.evaluate(() => document.querySelector('[class*="stageHotspot"]')?.focus())
  await page.keyboard.press('Space')
  await page.waitForTimeout(2400)
  const viaSpace = await page.evaluate(() =>
    Number.parseFloat(document.querySelector('[data-open-panel]').style.getPropertyValue('--nw-open') || '0'),
  )
  if (viaSpace !== 1) problems.push(`Space did not open the well (t=${viaSpace})`)
}

console.log('tab path:', walked.map((w) => `${w.tag}.${w.cls || '-'}`).join(' -> '))
console.log('machine name:', walked[walked.length - 1]?.name)
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nkeyboard path ok')

await browser.close()
process.exit(problems.length ? 1 : 0)
