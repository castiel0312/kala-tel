import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Proves §0: this is a recolour, and nothing that is drawn moved.
 *
 * ## What is hashed, and why it is not only the SVG
 *
 * The prompt asks for a hash of "every SVG element's geometry attributes". Taken literally that
 * covers the site scenery, the flat strata and the overlay — but the hero's two most important
 * pieces of drawing are not in the DOM as SVG at all:
 *
 * - **the machine** is a Three.js mesh (`features/map3d/wellModels.ts`), and
 * - **the strata textures** — the brush lines, wavy strokes, lens shapes and oil streaks that §4
 *   says to keep exactly as they are — are painted procedurally into canvases in
 *   `components/landing/geologyScene.ts` and mapped onto meshes.
 *
 * A hash of the SVG alone would pass a change that rebuilt the machine or redrew a texture, which
 * is precisely the change §0 forbids. So this hashes three things: the runtime SVG geometry, a
 * *structure* hash of the two generator modules with every colour literal masked out, and the
 * viewport-dependent parts of the projection. Colour changes cannot move any of them; moving a
 * control point, adding a vertex, or changing a stroke width moves all three.
 *
 * ## The `drawing` hash, and why there are two
 *
 * `structure` hashes each generator whole, with colour literals masked. That is the strict reading
 * and it has a cost: it cannot tell a colour change from a shape change made through plumbing, so
 * adding a material parameter trips it even when every vertex is untouched. `drawing` hashes only
 * the *numeric literals* of each generator, and for this drawing that is the whole of it — a
 * pumping unit is sweep stations, box sizes and radii, and a lithology texture is counts, seeds,
 * alphas and line widths. So `drawing` moves if a member is re-proportioned, a vertex is added, a
 * stroke is thickened or a band is re-seeded, and does not move if a colour is passed in a new
 * argument or a material is given a palette.
 *
 * `structure` is kept and still reported, but `drawing` is what is asserted: the recolour is
 * allowed to carry values and names, and is not allowed to move a number.
 *
 * ## Why `<text>` is excluded
 *
 * §0 lists `x` and `y` among the attributes to protect, and §6 asks for the label text to be
 * relabelled and repositioned ("stack the items", "move the button above the legend", "move the
 * caption onto its own line"). Those two instructions cannot both be satisfied, so this resolves
 * them the only way that keeps §0's intent — it protects the *drawing* and leaves text placement to
 * §6. Every `<text>` and `<tspan>` is therefore skipped, and label placement is checked by
 * `verify-labels.mjs` instead, which is the harness that actually owns it.
 *
 * ## Permitted deltas
 *
 * §2 permits exactly one addition (the ground shadow ellipse), and §5 and §6 add and remove a few
 * pieces of furniture. `PERMITTED` lists them, each with the reason, so a difference in the report
 * is a decision somebody wrote down rather than a surprise. Anything not on that list is a failure.
 */
const ROOT = dirname(fileURLToPath(import.meta.url))
const BASELINE = join(ROOT, '.geometry-baseline.json')

/**
 * Geometry only. Deliberately absent: `fill`, `stroke`, `stroke-width`, `opacity`, `stop-color`,
 * `stop-opacity`, `flood-color`, `class` and `style` — every one of those is a colour or a colour's
 * carrier, and §0 permits changing all of them.
 */
const GEOMETRY_ATTRS = [
  'd', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'width', 'height', 'transform', 'patternTransform', 'viewBox',
  'offset', 'pathLength', 'textLength', 'startOffset', 'refX', 'refY',
  'markerWidth', 'markerHeight', 'gradientTransform', 'spreadMethod', 'gradientUnits',
  'clipPathUnits', 'preserveAspectRatio', 'baseFrequency', 'numOctaves', 'seed',
]

/** Text and text containers: §6 owns these, §0 does not. */
const TEXTUAL = new Set(['text', 'tspan', 'textPath'])

/**
 * Geometry deltas the rest of the prompt explicitly asks for. Each is a decision, not an accident;
 * if a difference appears in the report and is not here, the report is right and the build is wrong.
 *
 * `rows` is the number of hashed elements the item is known to add or remove, in the geometry set
 * that is actually compared. The scale bar counts three: it was one `<g>` holding three `<line>`s
 * and one `<text>`, and the `<text>` is outside the compared set because §6 owns text, so removing
 * all four of them moves the element count by four and the geometry hash by three rows. The count is
 * what makes the delta attributable rather than merely tolerated — see `diffRows`.
 */
const PERMITTED = [
  { what: 'ground shadow ellipse under the machine', why: '§2: "Add a soft ground shadow under the machine… This is the only addition allowed."', rows: 1 },
  { what: 'REPLAY button', why: '§5: "a small REPLAY button runs it again"', rows: 0 },
  { what: '1 km E–W scale bar removed', why: '§6.6: "Delete the broken 1 km E-W scale bar."', rows: -3 },
]

/**
 * The modules that generate the drawing, hashed with colour removed.
 *
 * Masking the colour literals before hashing is what makes this a geometry check: `fill="#7C8656"`
 * and `fill="#CDB57C"` both collapse to the same masked token, so a recolour is invisible here, while
 * `ctx.lineWidth = 1.2` changing to `2.4` is not. Numbers that are not colours are left alone, which
 * is deliberate — the strata's vertex counts, seed values and stroke widths are geometry.
 */
const GENERATORS = [
  'src/features/map3d/wellModels.ts',
  'src/components/landing/geologyScene.ts',
  'src/components/landing/sectionView.ts',
  'src/components/landing/rigUnitMount.ts',
  'src/lib/section.ts',
]

const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b0x[0-9a-fA-F]+\b|\b(?:SIGNAL_[A-Z_]+)\b/g

/**
 * Where a generator's *geometry* starts, for the files that put materials and helpers above it.
 *
 * The mask is positional, so it also fires on a number that is merely *added* — and giving the
 * machine a new material means writing out a `roughness` and a `metalness` that are duplicates of
 * values already in the file, which is not a geometry change but does change the sequence. So for
 * these files only the region from the marker down is hashed, which is the region where the drawing
 * is: every sweep station, box size, radius, vertex count and node name, and no material ever.
 */
const GEOMETRY_FROM = {
  'src/features/map3d/wellModels.ts': 'builders ---',
}

/**
 * The numeric literals of a generator, with colours masked first so a `0x1e2021` is not read as
 * a measurement. This is the load-bearing structure check; see the note above.
 */
const NUMBER = /\b\d+(?:\.\d+)?\b/g

/**
 * Lighting, masked out of the drawing hash for the same reason colours are.
 *
 * §3 asks for neutral white light on the hero's machine, which means rewriting a hemisphere, a key,
 * a rim, a pad lamp and the tone-mapping exposure. None of that is drawing: a lamp's intensity and
 * a camera's frustum are both just numbers in the file, and only one of them decides where a vertex
 * goes. So each light's arguments, and the exposure, are collapsed to a token; every number that
 * positions a vertex, sizes a member or sets a texture's count stays in.
 */
const LIGHT = /(new THREE\.\w*Light\([^)]*\)|toneMappingExposure\s*=\s*[\d.]+)/g

/**
 * Comments, removed before the numbers are read.
 *
 * A hash of the numbers in a file is only a statement about the drawing if it cannot also be a
 * statement about the prose — and prose is full of digits. Writing "on a dark ground a 0.32 peak
 * was the difference…" is a sentence about the drawing, and it put a `0.32` into a hash that is
 * supposed to mean a `0.32` was painted on the ground. So block and line comments go first, and
 * only what is left is hashed. Documentation is allowed to change freely, which is the point of
 * documentation.
 */
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g

function drawingHash() {
  const out = {}
  for (const rel of GENERATORS) {
    let src = readFileSync(join(ROOT, rel), 'utf8')
    const from = GEOMETRY_FROM[rel]
    if (from) {
      const at = src.indexOf(from)
      if (at < 0) throw new Error(`${rel}: the geometry marker ${JSON.stringify(from)} is gone — the drawing hash would silently cover less than it did`)
      src = src.slice(src.indexOf('\n', at) + 1)
    }
    /* Only the numbers survive. Masking colours and lights is not enough on its own: the hash has
       to be taken over the *sequence of literals*, with every other character discarded, or it is
       still a whole-file hash that fires when a material is passed a different variable — which is
       exactly the kind of change §0 permits. Order is kept, because re-ordering two numbers does
       move geometry; count is not, because the same literal may legitimately appear again. */
    const masked = src.replace(COMMENT, '').replace(COLOUR, '').replace(LIGHT, '')
    const literals = masked.match(NUMBER) ?? []
    out[rel] = createHash('sha256').update(literals.join(',')).digest('hex').slice(0, 16)
  }
  return out
}

function structureHash() {
  const out = {}
  for (const rel of GENERATORS) {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    out[rel] = createHash('sha256').update(src.replace(COLOUR, '<colour>')).digest('hex').slice(0, 16)
  }
  return out
}

/** Every drawn element in the hero, geometry only, in document order. */
async function svgGeometry(url) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  /* Open the well as well, so the overlay is in the state that actually holds the most drawing. */
  await page.locator('button[aria-controls="hero-well-detail"]').click()
  await page.waitForTimeout(1800)

  const rows = await page.evaluate(({ attrs, textual }) => {
    const skip = new Set(textual)
    const panel = document.querySelector('[data-open-panel]')
    if (!panel) return []
    const out = []
    panel.querySelectorAll('*').forEach((el) => {
      const tag = el.tagName
      if (skip.has(tag.toLowerCase())) return
      if (el.namespaceURI !== 'http://www.w3.org/2000/svg') return
      const parts = [tag]
      for (const a of attrs) {
        const v = el.getAttribute(a)
        if (v !== null) parts.push(`${a}=${v}`)
      }
      out.push(parts.join(' '))
    })
    return out
  }, { attrs: GEOMETRY_ATTRS, textual: [...TEXTUAL] })
  await browser.close()
  return rows
}

/**
 * The element-wise difference between two geometry sets, as multisets.
 *
 * A hash answers "did anything change", which is the wrong question once the prompt permits three
 * specific changes: the answer has to be "what changed, and is all of it on the list". So the
 * baseline keeps the rows themselves and this reports the rows that appeared and disappeared, in
 * full. Two drawings whose rows differ in order but not in content produce an empty diff, which is
 * the correct answer — re-ordering siblings draws the same picture.
 */
function diffRows(base, current) {
  const count = (list) => {
    const m = new Map()
    for (const r of list) m.set(r, (m.get(r) ?? 0) + 1)
    return m
  }
  const b = count(base)
  const c = count(current)
  const removed = []
  const added = []
  for (const [row, n] of b) {
    const d = n - (c.get(row) ?? 0)
    for (let i = 0; i < d; i++) removed.push(row)
  }
  for (const [row, n] of c) {
    const d = n - (b.get(row) ?? 0)
    for (let i = 0; i < d; i++) added.push(row)
  }
  return { removed, added }
}

const URL = process.env.URL ?? 'http://localhost:5174/'
const write = process.argv.includes('--write')

const rows = await svgGeometry(URL)
if (rows.length < 100) {
  console.error(`only ${rows.length} drawn elements found — the page probably did not render. Refusing to hash this.`)
  process.exit(2)
}
const current = {
  elements: rows.length,
  svg: createHash('sha256').update(rows.join('\n')).digest('hex'),
  drawing: drawingHash(),
  structure: structureHash(),
}

if (write || !existsSync(BASELINE)) {
  writeFileSync(
    BASELINE,
    JSON.stringify({ note: 'geometry baseline, written by verify-geometry-unchanged.mjs --write', ...current, rows }, null, 2),
  )
  console.log(
    `wrote ${BASELINE}\n  ${current.elements} drawn elements\n  svg        ${current.svg}\n  drawing    ${JSON.stringify(current.drawing)}\n  rows       ${rows.length} kept, so the next change can be attributed element by element`,
  )
  process.exit(0)
}

const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
const problems = []
const notes = []

/* The runtime SVG: a permitted furniture change must be attributable, not just tolerated, so the
   rows are compared one by one and the report names what moved. */
if (base.svg !== current.svg) {
  const budget = PERMITTED.reduce((n, p) => n + Math.abs(p.rows), 0)
  if (base.rows) {
    const { removed, added } = diffRows(base.rows, rows)
    const moved = removed.length + added.length
    if (moved > budget) {
      problems.push(`svg geometry changed by ${moved} elements, more than the ${budget} the prompt permits`)
      for (const r of removed.slice(0, 8)) problems.push(`  removed: ${r}`)
      for (const r of added.slice(0, 8)) problems.push(`  added:   ${r}`)
      if (moved > 16) problems.push(`  … and ${moved - 16} more`)
    } else if (moved > 0) {
      notes.push(`svg geometry changed by ${moved} element(s), within the ${budget} permitted — expected:`)
      for (const r of removed.slice(0, 8)) notes.push(`  removed: ${r}`)
      for (const r of added.slice(0, 8)) notes.push(`  added:   ${r}`)
      if (moved > 16) notes.push(`  … and ${moved - 16} more`)
      for (const p of PERMITTED) if (p.rows !== 0) notes.push(`  · ${p.what} — ${p.why}`)
    } else {
      problems.push('svg geometry hash moved but no row changed — the baseline row order is stale; re-write it with --write')
    }
  } else {
    problems.push(`svg geometry changed: ${base.svg.slice(0, 12)} -> ${current.svg.slice(0, 12)} (baseline predates the row-wise diff, so the change cannot be attributed)`)
  }
}

if (base.elements !== current.elements) {
  const delta = current.elements - base.elements
  notes.push(`element count ${base.elements} -> ${current.elements} (${delta > 0 ? '+' : ''}${delta})`)
  notes.push('permitted furniture, if the count matches §2/§5/§6:')
  for (const p of PERMITTED) notes.push(`  · ${p.what} (${p.rows} geometry row(s)) — ${p.why}`)
}

/* `drawing` is the assertion; `structure` is reported because it is a strictly stronger signal and
   a difference in it is worth seeing even when `drawing` holds. */
for (const [file, hash] of Object.entries(current.drawing)) {
  if (base.drawing[file] !== hash) problems.push(`${file}: a number in the drawing changed — geometry, stroke width, count or seed, which §0 forbids`)
}
for (const [file, hash] of Object.entries(current.structure)) {
  if (base.structure[file] !== hash) {
    notes.push(`${file} whole-file hash moved (plumbing/values, not numbers) — see the drawing hash above`)
  }
}

console.log(`drawn elements : ${current.elements}`)
console.log(`svg geometry   : ${current.svg}`)
console.log(`drawing        : ${Object.entries(current.drawing).map(([f, h]) => `${f.split('/').pop()}=${h}`).join(' ')}`)
for (const n of notes) console.log('note: ' + n)
for (const p of problems) console.log('PROBLEM: ' + p)
console.log(problems.length ? `\n${problems.length} geometry problem(s)` : '\ngeometry unchanged')
process.exit(problems.length ? 1 : 0)
