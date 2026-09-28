import { chromium } from 'playwright'
const mean = async (page) => {
  const d = (await page.screenshot()).toString('base64')
  return page.evaluate(async (s) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode()
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
    const r = ctx.getImageData(0, 0, c.width, c.height).data
    const cv = window.__map.getCanvas()
    const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height
    t.getContext('2d').drawImage(cv, 0, 0)
    const d2 = t.getContext('2d').getImageData(0, 0, t.width, t.height).data
    let sum = 0, n = 0
    for (let i = 0; i < d2.length; i += 4) { sum += (d2[i] + d2[i+1] + d2[i+2]) / 3; n++ }
    return +(sum / n).toFixed(1)
  }, d)
}
const b = await chromium.launch()
for (const q of ['', '?terrain=1']) {
  const p = await b.newPage({ viewport: { width: 900, height: 700 } })
  const demFails = []
  p.on('response', (r) => { if (/terrarium|elevation/.test(r.url()) && r.status() >= 400) demFails.push(r.status() + ' ' + r.url().slice(0, 90)) })
  await p.goto('http://localhost:5173/probe-map.html' + q, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForFunction(() => window.__ready === true, { timeout: 60000 }).catch(() => console.log('never ready', q))
  await p.waitForTimeout(5000)
  console.log((q || 'flat').padEnd(14), 'canvasMean', await mean(p), 'demFails', demFails.length, demFails.slice(0, 2).join(' | '))
  await p.close()
}
await b.close()
