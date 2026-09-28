import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('http://localhost:5173/command', { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)
const info = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('canvas').forEach((c) => {
    let el = c
    const chain = []
    while (el && el !== document.body) {
      const cs = getComputedStyle(el)
      chain.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + String(el.className).split(' ').join('.') : ''} pos=${cs.position} z=${cs.zIndex}`)
      el = el.parentElement
    }
    out.push({ canvas: c.className || '(deck)', size: `${c.width}x${c.height}`, chain: chain.slice(0, 5) })
  })
  // what is actually painted at the centre of the map?
  return out
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
