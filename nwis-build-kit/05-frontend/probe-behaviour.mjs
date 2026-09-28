/* Two audits the screenshots cannot do: every design token the page references
   actually resolves, and the cross-section state really is shared. */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const run = async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  page.on('console', async (m) => {
    if (m.type() !== 'error') return
    const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => '?')))
    errors.push(args.map(String).join(' ').replace(/\x1b\[[0-9;]*m/g, '').slice(0, 2000))
  })

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#assistant')

  /* ---------------------------------------------------- tokens and contrast */

  /* A source-level check: `getComputedStyle` has already resolved every `var()`, so a token
     audit has to read the stylesheets. Anything referenced but never defined would silently
     fall back to the cascade, which is exactly the bug this is meant to catch. */
  const tokens = (() => {
    const dir = new URL('.', import.meta.url).pathname
    const walk = (d) =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = join(d, e.name)
        if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dist' ? [] : walk(p)
        return /\.(css|tsx|ts)$/.test(e.name) ? [p] : []
      })
    const defined = new Set()
    const used = new Map()
    for (const file of walk(join(dir, 'src'))) {
      const text = readFileSync(file, 'utf8')
      if (file.endsWith('.css')) for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1])
      // a component that sets its own custom property inline has defined it
      for (const m of text.matchAll(/['"](--[\w-]+)['"][^:,}]*:/g)) defined.add(m[1])
      for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (!used.has(m[1])) used.set(m[1], file.replace(dir, ''))
      }
    }
    const missing = [...used].filter(([name]) => !defined.has(name)).map(([name, file]) => `${name} in ${file}`)
    return { defined: defined.size, used: used.size, missing }
  })()

  const contrast = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
      const f = (v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (l1 + 0.05) / (l2 + 0.05)
    }
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor
        if (bg && !bg.startsWith('rgba(0, 0, 0, 0)')) return bg
      }
      return 'rgb(255,255,255)'
    }
    const out = []
    for (const id of ['live', 'map', 'risk', 'assistant', 'documents', 'memory']) {
      const sec = document.getElementById(id)
      const el = sec.querySelector('p, h2, dd, b, figcaption')
      if (!el) continue
      const cs = getComputedStyle(el)
      out.push({
        id,
        text: (el.textContent ?? '').slice(0, 22),
        ratio: +ratio(cs.color, bgOf(el)).toFixed(2),
        size: cs.fontSize,
      })
    }
    return out
  })

  /* ------------------------------------------------------ shared selection */

  const shared = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const root = document.getElementById('nwis-scroll')
    const card = [...document.querySelectorAll('button, [role="button"]')].find((b) =>
      (b.textContent ?? '').includes('W-067'),
    )
    if (!card) return { clicked: false }
    card.click()
    await sleep(700)
    const wells = document.getElementById('wells')
    const drawer = document.querySelector('[role="dialog"]')
    return {
      clicked: true,
      wellsOn: (wells?.querySelector('[aria-pressed="true"]')?.textContent ?? '').trim().slice(0, 30),
      openDialogs: document.querySelectorAll('[role="dialog"]').length,
      scrolled: root.scrollTop > 0,
      bodyOverflow: getComputedStyle(document.body).overflow,
      scrollportOverflow: getComputedStyle(root).overflowY,
      drawer: drawer ? (drawer.textContent ?? '').slice(0, 40).replace(/\s+/g, ' ') : null,
    }
  })

  /* ------------------------------------------------------ deep link + alert */

  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const deep = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    window.history.pushState({}, '', '/#risk')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await new Promise((r) => setTimeout(r, 900))
    const root = document.getElementById('nwis-scroll')
    const r = document.getElementById('risk').getBoundingClientRect()
    return { scrollTop: Math.round(root.scrollTop), riskTop: Math.round(r.top) }
  })

  const alert = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const sec = document.getElementById('alerts')
    // exact match: the history drawer's trigger reads "6 acknowledged", the action reads "Acknowledge"
    const btn = [...sec.querySelectorAll('button')].find((b) => /^acknowledge$/i.test(b.textContent.trim()))
    if (!btn) return { found: false }
    const before = sec.querySelectorAll('[class*="alertCard"]').length
    const counter = () => (sec.textContent.match(/(\d+)\s+acknowledged/) ?? [])[1] ?? null
    const counterBefore = counter()
    btn.click()
    await sleep(1600)
    return {
      found: true,
      cardsBefore: before,
      cardsAfter: sec.querySelectorAll('[class*="alertCard"]').length,
      counterBefore,
      counterAfter: counter(),
    }
  })

  /* The path a reader takes: one of the suggested questions, which the store can answer. */
  const ask = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const sec = document.getElementById('assistant')
    const chip = [...sec.querySelectorAll('button')].filter((x) => x.closest('[class*="askChips"]'))[0]
    if (!chip) return { found: false }
    const question = chip.textContent.trim()
    chip.click()
    await sleep(2600)
    return {
      found: true,
      question,
      answer: (sec.querySelector('[class*="answerA"]')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 90),
      evidenceLines: sec.querySelectorAll('[class*="evidenceLines"] li').length,
      confidence: (sec.querySelector('[class*="confidence"]')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 40),
      refused: !!sec.querySelector('[class*="answerRefused"]'),
    }
  })

  /* And the path that must NOT invent an answer: a question with nothing behind it. */
  const refusal = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const sec = document.getElementById('assistant')
    const ta = sec.querySelector('textarea')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, 'What is the mud loss risk and what should we do?')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    await sleep(150)
    sec.querySelector('form')?.requestSubmit()
    await sleep(2400)
    return {
      refused: !!sec.querySelector('[class*="answerRefused"]'),
      evidenceLines: sec.querySelectorAll('[class*="evidenceLines"] li').length,
      text: (sec.querySelector('[class*="answerA"]')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 70),
    }
  })

  console.log(JSON.stringify({ errors, tokens, contrast, shared, deep, alert, ask, refusal }, null, 1))

  /* Acknowledging is a write. Put the demo back the way it was found so the next run — and
     the next person — sees the fixture rather than this suite's leftovers. */
  await fetch('http://localhost:8000/api/v1/demo/reset', { method: 'POST' })
  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
