import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 900, height: 700 } })
p.on('requestfailed', (r) => console.log('FAILED', r.url().slice(0,120), r.failure()?.errorText))
p.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(0,120)) })
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)) })
await p.goto('http://localhost:5173/probe-map.html', { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForFunction(() => window.__loaded === true, { timeout: 60000 }).catch(() => console.log('load never fired'))
await p.waitForTimeout(6000)
const d = (await p.screenshot()).toString('base64')
console.log(JSON.stringify(await p.evaluate(async (s) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode()
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
  const r = ctx.getImageData(0, 0, c.width, c.height).data
  let sum = 0, n = 0
  for (let i = 0; i < r.length; i += 4) { sum += (r[i] + r[i+1] + r[i+2]) / 3; n++ }
  const cv = window.__map.getCanvas()
  // the canvas' own pixels, read through its drawing buffer
  const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height
  tmp.getContext('2d').drawImage(cv, 0, 0)
  const t = tmp.getContext('2d').getImageData(0, 0, tmp.width, tmp.height).data
  let s2 = 0, n2 = 0
  for (let i = 0; i < t.length; i += 4) { s2 += (t[i] + t[i+1] + t[i+2]) / 3; n2++ }
  return { pageMean: +(sum / n).toFixed(1), canvasMean: +(s2 / n2).toFixed(1), buf: [cv.width, cv.height], err: window.__err.slice(0, 3) }
}, d)))
await b.close()
