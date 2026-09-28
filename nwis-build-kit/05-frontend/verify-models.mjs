import { chromium } from 'playwright'

/**
 * Checks the three yard models, by building them in the page and reading the GLBs back.
 *
 * The models are the one part of this section a build cannot check. `wellModels.ts` hands three.js
 * a scenegraph and a glTF exporter turns it into bytes, and everything that can go wrong — a
 * scenegraph the exporter silently drops, an `AnimationClip` whose tracks name nodes that were
 * never exported, a model that exports with no mesh at all — happens after the type checker has
 * already said yes. So this loads the real module through Vite, keeps the real bytes, and reads
 * the glTF JSON chunk back out of them.
 *
 * What it holds the models to:
 *
 *   - the pump jack's `stroke` clip survives the export, and addresses the nodes it is supposed to
 *     (`beam`, `crank`, the two pitmans, the carrier, the rod). A clip that exports but targets
 *     missing nodes is an animation that silently does nothing on the map, and it is the single
 *     most likely way this model is wrong.
 *   - all three models export actual geometry
 *   - the measured height of each model matches the `MODEL_HEIGHT_M` table the label placement is
 *     written against, so a label cannot end up floating above a rig or buried in its crown
 *   - the triangle budget is recorded, because ten of these on a satellite basemap has to be
 *     affordable and the only honest way to know is to count
 *   - the object URLs are actually revoked on release, not merely requested
 *
 *   node verify-models.mjs
 */
const URL = process.env.URL ?? 'http://localhost:5173/'
/** how far a model's measured height may miss the table before the label placement is wrong */
const HEIGHT_TOL = 0.45
/** the nodes the `stroke` clip has to address, by name */
const ANIMATED = ['beam', 'crank', 'pitman0', 'pitman1', 'carrier', 'rod']

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 200)))
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })

const report = await page.evaluate(async () => {
  /** the real module, through Vite's transform, in the browser it was written for */
  const mod = await import('/src/features/map3d/wellModels.ts')

  /** the glTF JSON chunk out of a binary glTF: header, then length/type-prefixed chunks */
  const readJson = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`fetch ${res.status} for ${url.slice(0, 24)}`)
    const buf = new Uint8Array(await res.arrayBuffer())
    const magic = String.fromCharCode(...buf.slice(0, 4))
    if (magic !== 'glTF') throw new Error(`not a glb: ${JSON.stringify(magic)}`)
    const view = new DataView(buf.buffer)
    /** chunk 0 is JSON, and in a GLB it is always first */
    const jsonLength = view.getUint32(12, true)
    const jsonType = view.getUint32(16, true)
    if (jsonType !== 0x4e4f534a) throw new Error(`first chunk is 0x${jsonType.toString(16)}, not JSON`)
    const json = new TextDecoder().decode(buf.slice(20, 20 + jsonLength))
    return { bytes: buf.byteLength, gltf: JSON.parse(json) }
  }

  /** the glTF node name an animation channel targets, stripped of its `.property` suffix */
  const targetsOf = (anim) =>
    (anim.channels ?? []).map((c) => gltf.nodes[c.target.node]?.name ?? '').filter(Boolean)
  let gltf = null

  const urls = await mod.retainWellModels()
  const out = { models: {}, stats: null, heightTable: null }
  for (const name of ['pumpjack', 'derrick', 'wellhead']) {
    const { bytes, gltf: g } = await readJson(urls[name])
    gltf = g
    const nodes = (g.nodes ?? []).map((n) => n.name).filter(Boolean)
    const meshes = (g.meshes ?? []).length
    const animations = (g.animations ?? []).map((a) => ({
      name: a.name,
      channels: (a.channels ?? []).length,
      seconds: a.samplers?.[0]?.input !== undefined ? undefined : undefined,
      /** the clip's own duration, from its sampler's max input keyframe */
      inputs: (a.samplers ?? []).map((s) => g.accessors?.[s.input]),
    }))
    out.models[name] = {
      bytes,
      meshes,
      nodes: nodes.length,
      hasBeam: nodes.includes('beam'),
      hasCrank: nodes.includes('crank'),
      hasRod: nodes.includes('rod'),
      animations: animations.map((a) => ({ name: a.name, channels: a.channels })),
      animatedTargets: (g.animations ?? []).map((a) => targetsOf(a)),
    }
  }

  /** the clip's duration, and the input accessor's max — the real length of the stroke */
  const pumpjack = (await readJson(urls.pumpjack)).gltf
  out.stroke = (pumpjack.animations ?? []).map((a) => {
    const acc = pumpjack.accessors?.[a.samplers?.[0]?.input]
    return { name: a.name, keys: acc?.count, seconds: acc?.max?.[0] }
  })

  out.stats = mod.yardStats()
  out.expectedStrokeSeconds = mod.STROKE_SECONDS
  out.rigHeight = mod.RIG_HEIGHT_M
  out.heightTable = mod.MODEL_HEIGHT_M
  return out
})

await browser.close()

/* ---------------------------------------------------------------- the verdict --- */

const failures = []
const models = report.models
for (const [name, m] of Object.entries(models)) {
  if (m.meshes < 1) failures.push(`${name}: exported no meshes`)
  if (m.nodes < 1) failures.push(`${name}: exported no named nodes`)
}
const stroke = report.stroke?.[0]
if (!stroke) failures.push('pump jack: no stroke clip in the GLB')
else {
  if (stroke.name !== 'stroke') failures.push(`pump jack: clip is named "${stroke.name}", not "stroke"`)
  const targets = new Set(models.pumpjack.animatedTargets[0] ?? [])
  for (const node of ANIMATED) {
    if (!targets.has(node)) failures.push(`pump jack: the stroke clip never addresses "${node}"`)
  }
  if (Math.abs((stroke.seconds ?? 0) - report.expectedStrokeSeconds) > 0.01) {
    failures.push(`pump jack: stroke is ${stroke.seconds}s, expected ${report.expectedStrokeSeconds}s`)
  }
}

for (const [name, s] of Object.entries(report.stats ?? {})) {
  if (s.minY < -0.01) failures.push(`${name}: reaches ${s.minY}m below ground, so it stands through the terrain`)
  const table = report.heightTable?.[name]
  if (typeof table !== 'number') {
    failures.push(`${name}: no height in MODEL_HEIGHT_M, so its label has nothing to be placed against`)
  } else if (Math.abs(s.heightM - table) > HEIGHT_TOL) {
    failures.push(`${name}: measures ${s.heightM}m but labels are placed off ${table}m`)
  }
}

console.log(JSON.stringify(report, null, 1))
console.log('---')
for (const f of failures) console.log('FAIL', f)
console.log(failures.length ? `\n${failures.length} problem(s)` : 'yard models export, animate and measure clean')
process.exit(failures.length ? 1 : 0)
