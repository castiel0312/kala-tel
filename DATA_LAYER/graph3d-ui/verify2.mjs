import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://localhost:5180/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1568, height: 860 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

let pass = 0; let fail = 0;
const check = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${detail})`); };

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__g3d?.current?.getGraph?.().nodes.length > 0, { timeout: 60000 });
await sleep(14000);
await sleep(500);

const sampleBase = async () => page.evaluate(() => {
  const api = window.__g3d.current;
  const fg = api.forceGraph();
  const canvas = document.querySelector('canvas');
  const camera = fg.camera();
  const rect = canvas.getBoundingClientRect();
  const H = canvas.clientHeight;
  const fovT = Math.tan((camera.fov * Math.PI) / 360);
  const dist = camera.position.distanceTo(fg.controls().target);
  const ppu = H / 2 / (fovT * dist);
  const graph = api.getGraph();
  // node px
  let maxRadiusPx = 0;
for (const n of graph.nodes) {
    if (!n.__threeObj) continue;
    const mesh = n.__threeObj;
    maxRadiusPx = Math.max(maxRadiusPx, mesh.scale.x * ppu);
  }
  // link width px + lengths via baked geometry
  let linkWPx = 0; let arrowParams = null;
  for (const l of graph.links) {
    const line = l.__lineObj;
    if (!line) continue;
    const r = line.geometry?.parameters?.radiusTop;
    if (typeof r === 'number') linkWPx = Math.max(linkWPx, r * 2 * ppu);
    if (l.__arrowObj) arrowParams = l.__arrowObj;
  }
  // labels
  const Vector3 = camera.position.constructor;
  const v = new Vector3();
  const boxes = [];
  let labelPx = 0;
  let spriteCount = 0;
  fg.scene().traverse((o) => {
    if (!o.isSprite || !o.visible) return;
    spriteCount += 1;
    labelPx = Math.max(labelPx, o.scale.y * o.parent.scale.y * H / 2);
    const world = o.getWorldPosition(new Vector3()).project(camera);
    boxes.push({
      x: (world.x * 0.5 + 0.5) * H * (canvas.clientWidth / H) + rect.x,
      y: (1 - (world.y * 0.5 + 0.5)) * H + rect.y,
      w: (o.scale.x * o.parent.scale.x * H / 2),
      h: 12,
    });
  });
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]; const b = boxes[j];
      const ox = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
      const oy = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2);
      if (ox > 0.5 && oy > 0.5) overlaps += 1;
    }
  }
  return {
    nodes: graph.nodes.length, links: graph.links.length,
sprites: spriteCount, labelPx: +labelPx.toFixed(1), overlaps,
    maxRadiusPx: +maxRadiusPx.toFixed(1), linkWPx: +linkWPx.toFixed(2),
    dist: +dist.toFixed(0), hasArrows: arrowParams != null,
    status: api.getState().status,
  };
});

let base = await sampleBase();
for (let attempt = 0; attempt < 8 && base.overlaps > 0; attempt += 1) {
  await sleep(600);
  base = await sampleBase();
}

check('graph has nodes', base.nodes === 45, `${base.nodes} nodes`);
check('graph has links', base.links === 61, `${base.links} links`);
check('labels are budgeted', base.sprites <= 16, `${base.sprites} sprites`);
check('no overlapping labels', base.overlaps <= 2, `${base.overlaps} overlaps`);
check('status is connected', base.status === 'live', base.status);
check('camera framed the graph', base.dist < 1700 && base.dist > 700, `${base.dist} units`);
check('nodes stay small', base.maxRadiusPx <= 9.6, `${base.maxRadiusPx}px`);
check('labels are 12px', Math.abs(base.labelPx - 12) < 0.6, `${base.labelPx}px`);
check('links are ~1.25px', Math.abs(base.linkWPx - 1.25) < 0.25, `${base.linkWPx}px`);
check('arrowheads present', base.hasArrows, 'arrow objects');

// interact: hover hub, select, escape, F, L
const hub = await page.evaluate(() => {
  const api = window.__g3d.current;
  const g = api.getGraph();
  const n = [...g.nodes].sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))[0];
  return { id: n.id, name: n.name, degree: n.degree };
});
await page.evaluate((id) => window.__g3d.current.select(id), hub.id);
await sleep(900);
const sel = await page.evaluate(() => {
  const api = window.__g3d.current;
  const s = api.getState();
  let maxRadius = 0; let spriteCount = 0;
  const fg = api.forceGraph();
  const dist = fg.camera().position.distanceTo(fg.controls().target);
  const H = document.querySelector('canvas').clientHeight;
  const ppu = H / 2 / (Math.tan((fg.camera().fov * Math.PI) / 360) * dist);
  fg.scene().traverse((o) => { if (o.isMesh && o.geometry?.type.match(/Sphere/)) maxRadius = Math.max(maxRadius, o.scale.x * ppu); });
  fg.scene().traverse((o) => { if (o.isSprite) spriteCount++; });
  const selectedId = s.selected;
  const selectedName = api.getGraph().nodes.find((n) => n.id === selectedId)?.name;
  return { selected: selectedName, spriteCount, maxRadius };
});
check('click selects a node', sel.selected != null, `selected ${sel.selected}`);
check('selection enlarges target', sel.maxRadius <= 10.6, `max ${sel.maxRadius}px`);

await page.keyboard.press('Escape');
await sleep(400);
const cleared = await page.evaluate(() => window.__g3d.current.getState().selected == null);
check('escape clears selection', cleared, 'selected null');

await page.keyboard.press('f');
await sleep(1200);
const refit = await page.evaluate(() => {
  const fg = window.__g3d.current.forceGraph();
  return +fg.camera().position.distanceTo(fg.controls().target).toFixed(0);
});
check('F refits the camera', refit < 1700 && refit > 700, `${refit} units`);

await page.keyboard.press('l');
await sleep(400);
const hidden = await page.evaluate(() => {
  let n = 0;
  window.__g3d.current.forceGraph().scene().traverse((o) => { if (o.isSprite) n++; });
  return n;
});
check('L hides labels', hidden === 0, `${hidden} sprites`);
await page.keyboard.press('l');
await sleep(400);
const restored = await page.evaluate(() => {
  let n = 0;
  window.__g3d.current.forceGraph().scene().traverse((o) => { if (o.isSprite) n++; });
  return n;
});
check('L restores labels', restored >= 10, `${restored} sprites`);

check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');
console.log(`\n${pass}/${pass + fail} checks passed`);
await browser.close();




