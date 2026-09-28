import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/#map'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const net = []
page.on('request', (r) => { const u = r.url(); if (u.includes('mapbox') || u.includes('maptiler') || u.includes('carto') || u.includes('elevation-tiles')) net.push(`REQ  ${r.method()} ${u.slice(0,160)}`) })
page.on('response', (r) => { const u = r.url(); if (u.includes('mapbox') || u.includes('carto') || u.includes('elevation-tiles')) net.push(`RES  ${r.status()} ${u.slice(0,160)}`) })
page.on('requestfailed', (r) => net.push(`FAIL ${r.url().slice(0,160)} ${r.failure()?.errorText}`))
page.on('console', (m) => { if (m.type()==='error'||m.type()==='warning') net.push(`CON  [${m.type()}] ${m.text().slice(0,300)}`) })
page.on('pageerror', (e) => net.push(`ERR  ${e.message.slice(0,300)}`))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await page.evaluate(() => document.querySelector('#map')?.scrollIntoView({ block: 'center' }))
await page.waitForTimeout(7000)
const geo = await page.evaluate(() => {
  const st = document.querySelector('#map [class*="mapStage"]')
  const fr = document.querySelector('#map [class*="frame"]')
  const cs = (el) => el ? (({width,height,minHeight,maxHeight,display,position,overflow}) => ({width,height,minHeight,maxHeight,display,position,overflow}))(getComputedStyle(el)) : null
  return { stage: cs(st), frame: cs(fr), stageCls: st?.className, frameCls: fr?.className }
})
console.log(JSON.stringify(geo,null,2))
console.log('--- network (mapbox-ish) ---')
console.log(net.filter(n=>!n.includes('GL Driver')&&!n.includes('luma.gl')).slice(0,80).join('\n'))
await browser.close()
