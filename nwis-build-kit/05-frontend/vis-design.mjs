import { chromium } from '@playwright/test'
import fs from 'fs'
const b = await chromium.launch()
const dir = '/Users/shantanu/Downloads/nwis-build-kit/01-frontend-design-source/screens'
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'))
for (const f of files) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto('file://' + dir + '/' + f, { waitUntil: 'load' })
  await p.waitForTimeout(300)
  await p.addStyleTag({ content: 'body{overflow:visible!important}html{overflow:visible!important}' })
  const info = await p.evaluate(() => {
    const c = document.querySelector('body > div')
    return { cH: c ? c.getBoundingClientRect().height : 0, body: document.body.scrollHeight }
  })
  const name = f.replace('.dc.html', '')
  const H = Math.max(info.cH, info.body)
  const n = Math.min(6, Math.ceil(H / 900))
  for (let i = 0; i < n; i++) {
    await p.screenshot({ path: `/tmp/vis/design/${name}-${i}.png`, clip: { x: 0, y: i * 900, width: 1440, height: Math.min(900, H - i * 900) } })
  }
  console.log(name.padEnd(20), 'canvas', Math.round(H), 'slices', n)
  await p.close()
}
await b.close()
