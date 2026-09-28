import * as THREE from 'three'
import { SECTION_LAYOUT, type SectionLayer, type SectionRisk } from '../../lib/section'
import type { SectionView } from './sectionView'
import { inkForFill, inkRatioForFill } from './heroPalette'

/**
 * The rock, drawn once, in raw Three.js.
 *
 * The section is one solid block of rock, cut on the vertical plane the shared projection
 * describes and tilted back, so the only surfaces the camera can see are the cut face and the
 * ground it sits on. That constrains what can honestly be drawn, and the scene sticks to it: the
 * rock is a displaced face rather than a stack of boxes, the contacts are exactly where the ruler
 * says they are because the displacement is tapered to nothing along them, and the windows the
 * risk engine is watching are translucent planes flush with the cut.
 *
 * Everything is built in the projection's own units — x is screen x, y is screen y, d is how
 * far behind the cut a surface sits — and mapped into the camera's right-handed space in one
 * step. Because that map is a rotation and a scale, a point authored at a depth lands on the
 * pixel `yForMd` returns, which is what lets the DOM overlay sit on top of this canvas and
 * stay on it through a resize.
 *
 * ## Why it is bright
 *
 * The fills are the design tokens for the cutaway, and the lighting is deliberately *under* unity
 * so that a flat face lands on its own token colour rather than clipping to white: key + fill +
 * rim + ambient sum to about 0.88 of a face-on lambert, and a fifth of that comes back as
 * emissive so a band never goes muddy where the relief turns it away from the light. The relief
 * and the vertex gradient are then free to push any one facet up to 1.1 or down to 0.7 of its
 * token, which is the whole of the dimensionality — a slab lit from above, not a flat rectangle.
 */

export interface GeologySceneInput {
  view: SectionView
  layers: SectionLayer[]
  risks: SectionRisk[]
  /** measured depth of the bit, which sets how deep the marker stands */
  bitMd: number
  /** easting of the bit, in km, so the marker stands on the bore rather than on the axis */
  bitEastKm: number
  /** the band the well is being drilled for, which is the one that glows */
  target: SectionLayer | null
  /** the drawn wellbore's plan, so the scene can light the interval it is standing in */
  planTdMd: number
  reducedMotion: boolean
}

/**
 * A point in the projection's units, in the scene's own world space.
 *
 * Meshes built by `quadGeometry` are mapped on the way in; anything positioned afterwards —
 * the bit, the pulse ring, the glow — has to be mapped the same way or it will not sit where the
 * overlay has drawn its label.
 */
function toWorld(view: SectionView, sx: number, sy: number, d: number): THREE.Vector3 {
  return new THREE.Vector3(sx, (view.height - sy) / view.cosPitch, -d)
}

export interface GeologyScene {
  /** one frame at the current reveal state */
  render(): void
  resize(width: number, height: number): void
  /** 0 → 1; the rock is cut open from the surface down */
  reveal(t: number): void
  /** true when the tick actually changed something that needs a frame */
  tick(nowMs: number): boolean
  setBit(md: number): void
  /** the band under the pointer, which comes up out of the rock */
  setHighlight(key: string | null): void
  /** the reader has opened the well: the operational overlays come up behind the rock */
  setDetail(on: boolean): void
  dispose(): void
}

const MAX_DPR = 2
/**
 * px of screen the lithology texture repeats over.
 *
 * This was 210, which meant a 20px band showed a tenth of one tile of grain — so the sand looked
 * like a flat swatch and the shale's lamination was invisible. Rock texture has to be legible at
 * the size a band is actually drawn, which is 20–60px tall here, so the tile is roughly the width
 * of a band. The texture is tiled in screen space rather than per band, so the grain still lines
 * up across a contact and the whole block reads as one rock rather than eleven swatches.
 */
const FILL_TILE_PX = 96
/** the same, for the ground plane, which is much further away and can carry coarser grain */
const GROUND_TILE_PX = 190
const MAX_RELIEF = 5.6

/** How far a band comes up out of the rock when it is hovered, over its resting emissive. */
const EMISSIVE_REST = 0.2
const EMISSIVE_LIT = 0.62
/**
 * The reservoir used to sit at 0.36 of its own token as emissive *and* carry an additive halo on
 * top, which together clipped it to a flat sheet of near-white cyan — 22 separate runs of the same
 * value across the interval, the single most chart-like thing on the page. It is now lit like the
 * rock around it, with the sense of something in it coming from the geometry: darker oil streaks
 * and brighter porous patches, both of which read as depth rather than as brightness.
 */
const EMISSIVE_TARGET = 0.17
/**
 * The peak opacity of the reservoir's additive halo.
 *
 * At 1 it was adding a full-strength near-white sheet on top of a band whose own token is already
 * the lightest thing in the palette, and the interval clipped to a flat cyan rectangle: 22 runs of
 * the same value down 40px, which is exactly the chart look the rest of this work is undoing. It
 * now reads as a body of rock with light in it.
 */
const HALO_PEAK = 0.34

/* ------------------------------------------------------------------ colours --- */

function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Layer fills travel as CSS custom properties, so the rock matches the tokens on paper. */
function resolveFill(fill: string): THREE.Color {
  if (fill.startsWith('var(')) {
    const name = fill.slice(4, fill.indexOf(')')).trim()
    return new THREE.Color(token(name, '#8a8a80'))
  }
  return new THREE.Color(fill)
}

function riskColour(level: SectionRisk['level']): string {
  if (level === 'HIGH') return token('--nw-red', '#d33a2b')
  if (level === 'MEDIUM') return token('--nw-orange', '#e8721c')
  return token('--nw-text-3', '#777a74')
}

/* ----------------------------------------------------------------- textures --- */

/** Deterministic noise, so the same rock is the same rock on every render. */
function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE = 256

function finish(c: HTMLCanvasElement, repeat = true): THREE.Texture {
  const tex = new THREE.CanvasTexture(c)
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  }
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** A soft vertical falloff, used as the glow behind the reservoir. */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.24, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.5, 'rgba(255,255,255,1)')
  g.addColorStop(0.76, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 128)
  return finish(c)
}

/**
 * The texture's dark marks, as an `rgba()` triple.
 *
 * The lithology texture is greyscale and multiplied by the band's fill, so a mark drawn in black
 * arrives as `0 × fill` — the same black on all eleven bands, which is what made the old section
 * read as eleven greys of one rock. Drawing instead in the band's own ink-to-fill ratio means a
 * mark resolves to *that band's* ink, so the grain is a darker shade of its own stone. The alpha,
 * the count, the seed and the width are all left exactly as they were: this changes the colour a
 * mark is cut in and nothing else about it.
 */
function inkRgb(ink: string): string {
  const h = ink.replace('#', '')
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
}

function bedLines(ctx: CanvasRenderingContext2D, count: number, spread: number, weight: number, seed: number, ink: string): void {
  const r = rng(seed)
  for (let i = 0; i < count; i++) {
    const y = r() * SIZE
    const amp = spread * (0.3 + r() * 0.7)
    const phase = r() * Math.PI * 2
    const freq = 1 + r() * 2.5
    ctx.beginPath()
    for (let x = 0; x <= SIZE; x += 8) {
      const yy = y + Math.sin((x / SIZE) * Math.PI * 2 * freq + phase) * amp
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.strokeStyle = r() > 0.45 ? `rgba(${ink},${0.08 + r() * 0.18})` : `rgba(255,255,255,${0.06 + r() * 0.2})`
    ctx.lineWidth = weight * (0.5 + r())
    ctx.stroke()
  }
}

function speckle(ctx: CanvasRenderingContext2D, count: number, alpha: number, seed: number, maxR: number, ink: string): void {
  const r = rng(seed)
  for (let i = 0; i < count; i++) {
    ctx.beginPath()
    ctx.arc(r() * SIZE, r() * SIZE, 0.4 + r() * maxR, 0, Math.PI * 2)
    ctx.fillStyle = r() > 0.58 ? `rgba(255,255,255,${alpha * (0.4 + r())})` : `rgba(${ink},${alpha * (0.4 + r())})`
    ctx.fill()
  }
}

function lenses(ctx: CanvasRenderingContext2D, count: number, seed: number, strength: number, ink: string): void {
  const r = rng(seed)
  for (let i = 0; i < count; i++) {
    const y = r() * SIZE
    const w = 12 + r() * 46
    const h = 3 + r() * 8
    const g = ctx.createLinearGradient(0, y - h, 0, y + h)
    g.addColorStop(0, `rgba(255,255,255,${0.2 * strength})`)
    g.addColorStop(0.5, `rgba(255,255,255,${0.06 * strength})`)
    g.addColorStop(1, `rgba(${ink},${0.13 * strength})`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(r() * SIZE, y, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Faint oblique strokes: cross-bedding, and the only line work that reads as *sediment*. */
function crossBeds(ctx: CanvasRenderingContext2D, count: number, seed: number, alpha: number, ink: string): void {
  const r = rng(seed)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineWidth = 1.1
  for (let i = 0; i < count; i++) {
    const y0 = r() * SIZE
    const len = 40 + r() * 110
    const x0 = r() * SIZE
    const drop = 6 + r() * 16
    ctx.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.5)' : `rgba(${ink},0.5)`
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(x0 + len * 0.5, y0 + drop * 0.35, x0 + len, y0 + drop)
    ctx.stroke()
  }
  ctx.restore()
}

/** Straight, steep, joint-like fractures: the basement's only structure. */
function joints(ctx: CanvasRenderingContext2D, count: number, seed: number, ink: string): void {
  const r = rng(seed)
  ctx.save()
  ctx.globalAlpha = 0.34
  for (let i = 0; i < count; i++) {
    const x0 = r() * SIZE
    const y0 = r() * SIZE
    const lean = (r() - 0.5) * 46
    ctx.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.5)' : `rgba(${ink},0.55)`
    ctx.lineWidth = 0.7 + r() * 1.4
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + lean, y0 + 40 + r() * 120)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * A greyscale contrast map per lithology, tinted by the band's own token at draw time.
 *
 * The base is white rather than mid grey, because the material's colour multiplies this: the base
 * is what a texture-free part of a band resolves to, so a mid-grey base would come out as a dark
 * version of every token. The grain is what makes a band a rock and not a swatch: coarse and loose
 * for the sand, laminated and fine for the shale, and porous and blotched for the reservoir so the
 * pay reads as pay.
 *
 * `ink` arrives as this band's ink-*to-fill ratio*, not as a colour — see `inkOverFill` in
 * `heroPalette.ts` for why a multiply needs a ratio, and `inkRgb` below for the interpolation. The
 * light marks stay white: a multiply cannot brighten a band past its own fill, so on a white base
 * they read as clean sand between the dark grain rather than as a highlight, which is a change of
 * degree, not of kind — and it is the only honest way to keep both the white base and the marks.
 */
function lithologyTexture(kind: SectionLayer['lithology'], ink: string): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  /** the same ink as an `rgba()` triple, which is the form the grain helpers interpolate into */
  const rgb = inkRgb(ink)

  /* White, not the near-white it was: the texture is multiplied by the band's fill, so the base
     is what a texture-free part of the band resolves to, and a near-white base made every band
     sample a few percent under its own token — up to 8 on the pale sand, which is more than the
     band-fill check will forgive. White makes the base mean "no texture", so the fill is the fill. */
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SIZE, SIZE)

  switch (kind) {
    case 'topsoil':
      // the root zone: clumped, dark, and nothing bedded at all
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.16
      for (let i = 0; i < 90; i++) {
        const r = rng(7000 + i)
        ctx.beginPath()
        ctx.ellipse(r() * SIZE, r() * SIZE, 1.4 + r() * 5, 1 + r() * 2.6, r() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      speckle(ctx, 1100, 0.22, 701, 1.5, rgb)
      break
    case 'soil':
      // mottled, blocky, no bedding
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.1
      for (let i = 0; i < 220; i++) {
        const r = rng(7100 + i)
        ctx.beginPath()
        ctx.ellipse(r() * SIZE, r() * SIZE, 2 + r() * 9, 2 + r() * 5, r() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      speckle(ctx, 1300, 0.2, 711, 2.1, rgb)
      break
    case 'sand':
      // loose and coarse: the grain has to be visible at the size the band is drawn
      speckle(ctx, 2600, 0.26, 721, 2.6, rgb)
      speckle(ctx, 260, 0.4, 731, 5, rgb)
      bedLines(ctx, 7, 3, 1.6, 741, rgb)
      lenses(ctx, 9, 751, 0.8, rgb)
      break
    case 'sandstone':
      crossBeds(ctx, 22, 761, 0.26, rgb)
      bedLines(ctx, 16, 5.4, 2, 771, rgb)
      speckle(ctx, 1800, 0.24, 781, 1.4, rgb)
      break
    case 'shale':
      // closely laminated, and the laminae are what make a seal look like a seal
      bedLines(ctx, 96, 1.4, 1, 791, rgb)
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.12
      for (let i = 0; i < 18; i++) ctx.fillRect(0, (i / 18) * SIZE + 2, SIZE, 1.2)
      ctx.globalAlpha = 1
      speckle(ctx, 420, 0.12, 801, 1, rgb)
      break
    case 'clay':
      lenses(ctx, 8, 811, 1, rgb)
      bedLines(ctx, 40, 1.9, 1.2, 821, rgb)
      speckle(ctx, 520, 0.13, 831, 1.2, rgb)
      break
    case 'delta':
      bedLines(ctx, 44, 3.4, 1.6, 841, rgb)
      lenses(ctx, 16, 851, 1, rgb)
      speckle(ctx, 700, 0.18, 861, 1.6, rgb)
      break
    case 'water':
      // sand with water in it: the grain of the sand case above, cut by the flat quiet bedding of
      // something that has not moved, and by a few strings of darker water-bearing lenses
      bedLines(ctx, 14, 4, 1.8, 871, rgb)
      lenses(ctx, 22, 881, 1.2, rgb)
      ctx.globalAlpha = 0.2
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      for (let i = 0; i < 7; i++) {
        const r = rng(8800 + i)
        ctx.beginPath()
        const y = r() * SIZE
        ctx.moveTo(0, y)
        ctx.lineTo(SIZE, y + 3 + r() * 5)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      speckle(ctx, 1400, 0.2, 891, 1.2, rgb)
      break
    case 'reservoir':
      // the pay: coarse, blotchy, and streaked with oil in a way nothing else is
      lenses(ctx, 30, 901, 1.5, rgb)
      ctx.save()
      ctx.globalAlpha = 0.3
      for (let i = 0; i < 14; i++) {
        const r = rng(9000 + i)
        const y = r() * SIZE
        const g = ctx.createLinearGradient(0, y - 5, 0, y + 5)
        g.addColorStop(0, 'rgba(0,0,0,0)')
        g.addColorStop(0.5, 'rgba(0,0,0,0.85)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(r() * SIZE, y, 20 + r() * 60, 3 + r() * 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      /** vugs: the porosity the whole interval exists for */
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.22
      for (let i = 0; i < 110; i++) {
        const r = rng(9100 + i)
        ctx.beginPath()
        ctx.arc(r() * SIZE, r() * SIZE, 0.9 + r() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      speckle(ctx, 2000, 0.26, 921, 1.2, rgb)
      break
    default:
      joints(ctx, 30, 931, rgb)
      speckle(ctx, 800, 0.16, 941, 1.8, rgb)
  }

  return finish(c)
}

/**
 * The ground surface: the pale strip the machine stands on, speckled, fading to white at the
 * horizon so the plane recedes.
 *
 * This is a *colour* texture, not a contrast map — the ground plane is not multiplied by a band
 * fill, it is drawn as itself — so it takes the two stage values directly instead of a ratio, and
 * its speckles are the same `#A3A6A1` the flat SVG draws. The counts, seeds, alphas and radii are
 * the ones it always had.
 */
function groundTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const ground = token('--nw-hero-ground', '#DCDDD7')
  const speckleInk = token('--nw-hero-speckle', '#A3A6A1')
  const g = ctx.createLinearGradient(0, 0, 0, SIZE)
  g.addColorStop(0, speckleInk)
  g.addColorStop(0.4, ground)
  g.addColorStop(1, token('--nw-hero-paper', '#FFFFFF'))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
  speckle(ctx, 2400, 0.22, 951, 2.2, inkRgb(speckleInk))
  speckle(ctx, 70, 0.38, 961, 5.5, inkRgb(speckleInk))
  return finish(c)
}

/**
 * The lenses of porous sand inside the target interval.
 *
 * A reservoir is not a colour, it is a body with structure in it: sheets and pockets of good
 * sand inside duller rock, and oil sitting dark in the best of it. Drawing that as geometry —
 * irregular patches laid into the cut face and lit with the rest of it — does what an additive
 * glow could not, because the light now breaks across them and the interval gains a texture
 * instead of a brightness. Each lens is a lens: an ellipse pinched at both ends, following the
 * bedding, cut off at the unit's own contacts so it can never spill into the rock above.
 */
function reservoirLenses(
  view: SectionView,
  layer: SectionLayer,
  seed: number,
): THREE.BufferGeometry[] {
  const top = view.contactPoints(layer, 26)
  const base = view.basePoints(layer, 26)
  const n = Math.min(top.length, base.length)
  const x0 = top[0]?.[0] ?? 0
  const span = Math.max(1, (top[n - 1]?.[0] ?? 1) - x0)
  const unitH = Math.abs((base[0]?.[1] ?? 0) - (top[0]?.[1] ?? 0))
  const r = rng(seed)
  const out: THREE.BufferGeometry[] = []

  /** the unit's own top and base at a normalised x, so a lens rides the dip and the undulation */
  const edgesAt = (u: number): [number, number] => {
    const t = Math.min(1, Math.max(0, u)) * (n - 1)
    const lo = Math.floor(t)
    const hi = Math.min(n - 1, lo + 1)
    const k = t - lo
    const ty = (top[lo]?.[1] ?? 0) + ((top[hi]?.[1] ?? 0) - (top[lo]?.[1] ?? 0)) * k
    const by = (base[lo]?.[1] ?? 0) + ((base[hi]?.[1] ?? 0) - (base[lo]?.[1] ?? 0)) * k
    return [ty, by]
  }

  for (let i = 0; i < 7; i++) {
    const cu = 0.08 + r() * 0.84
    const cv = 0.18 + r() * 0.64
    const rx = span * (0.05 + r() * 0.11)
    const ry = Math.max(1.1, unitH * (0.1 + r() * 0.22))
    /** oil reads dark and warm; good porous sand reads pale */
    const dark = r() > 0.45
    const seg = 26
    const pos: number[] = []
    const uv: number[] = []
    const col: number[] = []
    const idx: number[] = []

    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2
      /** a lens, not an ellipse: pinched at both ends and thickest off the centre line */
      const pinch = Math.pow(Math.abs(Math.cos(a)), 0.62) * Math.sin(a)
      const u = cu + (Math.cos(a) * rx) / span
      const [ty, by] = edgesAt(u)
      const px = x0 + u * span
      const py = ty + (by - ty) * cv + pinch * ry
      /** the middle stands a little proud of the face, so it takes the key light */
      const lift = 0.9 * Math.max(0, 1 - Math.abs(Math.sin(a)))
      pos.push(px, py, 0.7 + lift)
      uv.push(u * 3, 0.5)
      const v = dark ? 0.42 : 1.26
      col.push(v, v, v)
    }
    for (let k = 1; k < seg; k++) idx.push(0, k + 1, k)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    geo.applyMatrix4(cutSpaceMatrix(view))
    out.push(geo)
  }
  return out
}

/* ------------------------------------------------------------------ geometry --- */

/**
 * Maps the projection's own units into the camera's right-handed space: x is already screen
 * x, screen y runs up the world, and `d` runs away from the camera. The determinant is
 * positive, so a closed mesh keeps its winding.
 */
function cutSpaceMatrix(view: SectionView): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeScale(1, -1 / view.cosPitch, -1)
  m.setPosition(0, view.height / view.cosPitch, 0)
  return m
}

interface QuadOptions {
  /** UVs at the four corners, in the same order as `corners` */
  uvs?: [number, number][]
  segX?: number
  segY?: number
  /** extra depth at a point, used to roughen the rock up */
  relief?: (sx: number, sy: number) => number
  /** how far the corners are lit and how far the ends fall away, 0 → 1 off the fill */
  shade?: { top: number; bottom: number; ends: number }
}

/** A quad authored in the projection's units, corners in winding order. */
function quadGeometry(view: SectionView, corners: [number, number, number][], opts: QuadOptions = {}): THREE.BufferGeometry {
  const uvs: [number, number][] = opts.uvs ?? [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]
  const segX = opts.segX ?? 1
  const segY = opts.segY ?? 1
  const relief = opts.relief
  const shade = opts.shade
  const [a, b, c, d] = corners as [
    [number, number, number],
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ]
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const lerp = (p: [number, number, number], q: [number, number, number], t: number): [number, number, number] => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
  ]
  const uvLerp = (p: [number, number], q: [number, number], t: number): [number, number] => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
  ]
  const uA = uvs[0] as [number, number]
  const uB = uvs[1] as [number, number]
  const uC = uvs[2] as [number, number]
  const uD = uvs[3] as [number, number]

  const x0 = Math.min(a[0], d[0])
  const x1 = Math.max(b[0], c[0])

  for (let j = 0; j <= segY; j++) {
    const ty = j / segY
    const left = lerp(a, d, ty)
    const right = lerp(b, c, ty)
    const uvLeft = uvLerp(uA, uD, ty)
    const uvRight = uvLerp(uB, uC, ty)
    for (let i = 0; i <= segX; i++) {
      const tx = i / segX
      const p = lerp(left, right, tx)
      pos.push(p[0], p[1], p[2] + (relief ? relief(p[0], p[1]) : 0))
      const q = uvLerp(uvLeft, uvRight, tx)
      uv.push(q[0], q[1])
      /**
       * The slab gradient: bright along the top contact, shaded down to the base, and falling
       * away at both ends of the cut so the block has sides. Multiplied into the token colour, so
       * it never changes a band's hue — only how lit it looks.
       */
      if (shade) {
        const w = x1 > x0 ? (p[0] - x0) / (x1 - x0) : 0.5
        const ends = 1 - shade.ends * Math.pow(Math.abs(w - 0.5) * 2, 2.4)
        const v = (shade.top + (shade.bottom - shade.top) * ty) * ends
        col.push(v, v, v)
      } else {
        col.push(1, 1, 1)
      }
    }
  }
  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segX; i++) {
      const i0 = j * (segX + 1) + i
      const i1 = i0 + 1
      const i2 = i0 + segX + 1
      const i3 = i2 + 1
      idx.push(i0, i1, i2, i1, i3, i2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  if (shade) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  geo.applyMatrix4(cutSpaceMatrix(view))
  return geo
}

/* -------------------------------------------------------------------- ribbons --- */

/**
 * The workhorse: a strip of rock between two of the projection's contact curves.
 *
 * Everything drawn inside a unit is one of these. The unit itself is the strip from its top
 * contact to its base; a bedding plane inside it is the strip between two fractions of the same
 * two curves; the shadow the bed above throws onto the top of this one is the strip from 0 to a
 * few per cent. Because they are all built from the same pair of polylines, they cannot disagree
 * about where the rock is, and a parting that is drawn as a straight line in one renderer is
 * curved in the other.
 *
 * The curve is sampled at its own resolution rather than linearly interpolated, because the whole
 * point is that it is not a straight line.
 */
function ribbonGeometry(
  view: SectionView,
  top: [number, number][],
  base: [number, number][],
  opts: {
    f0?: number
    f1?: number
    /** segments across the cut; partings need far fewer than the rock itself */
    segX?: number
    segY?: number
    /** extra depth behind the cut plane, which is what makes the face a surface */
    relief?: (sx: number, sy: number) => number
    /** a flat colour multiplied into the material, or `null` for the rock's own vertex shading */
    tint?: (t: number, w: number) => number
    /** px of screen tile per unit of u and v, for the lithology texture */
    tile?: number
  } = {},
): THREE.BufferGeometry {
  const f0 = opts.f0 ?? 0
  const f1 = opts.f1 ?? 1
  const segX = opts.segX ?? 40
  const segY = opts.segY ?? 6
  const relief = opts.relief
  const tint = opts.tint
  const tile = opts.tile ?? FILL_TILE_PX
  const n = Math.min(top.length, base.length)

  const at = (i: number, f: number): [number, number] => {
    const t = top[i] as [number, number]
    const b = base[i] as [number, number]
    return [t[0] + (b[0] - t[0]) * f, t[1] + (b[1] - t[1]) * f]
  }

  const x0 = top[0]?.[0] ?? 0
  const x1 = top[n - 1]?.[0] ?? 1
  const span = Math.max(1, x1 - x0)
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []

  for (let j = 0; j <= segY; j++) {
    const f = f0 + ((f1 - f0) * j) / segY
    for (let i = 0; i <= segX; i++) {
      /** sample the shared polyline, so a coarse ribbon still follows the exact contact */
      const s = Math.min(n - 1, Math.max(0, (i / segX) * (n - 1)))
      const lo = Math.floor(s)
      const hi = Math.min(n - 1, lo + 1)
      const k = s - lo
      const p0 = at(lo, f)
      const p1 = at(hi, f)
      const x = p0[0] + (p1[0] - p0[0]) * k
      const y = p0[1] + (p1[1] - p0[1]) * k
      pos.push(x, y, relief ? relief(x, y) : 0)
      /** the texture is tiled in screen space, so the grain lines up across every contact */
      uv.push((x - x0) / tile, y / tile)
      if (tint) {
        const w = (x - x0) / span
        const v = tint(j / segY, w)
        col.push(v, v, v)
      } else {
        col.push(1, 1, 1)
      }
    }
  }
  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segX; i++) {
      const i0 = j * (segX + 1) + i
      idx.push(i0, i0 + 1, i0 + segX + 1, i0 + 1, i0 + segX + 2, i0 + segX + 1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  if (tint) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  geo.applyMatrix4(cutSpaceMatrix(view))
  return geo
}

/**
 * The vertical extent of a band, as `[min, max]`, measured off the two contact curves rather than
 * off the nominal depths — the relief has to be faded out at the contacts *as drawn*, and a curve
 * that wanders by a few px would otherwise leave displacement hanging past the ruler.
 */
function bandY(top: [number, number][], base: [number, number][]): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const p of [...top, ...base]) {
    const y = p[1]
    if (y < lo) lo = y
    if (y > hi) hi = y
  }
  return [lo, hi]
}

/**
 * How lit a point on a unit's face is, as a multiplier on the token colour.
 *
 * Four things are going on, and all four are things a real cut face does:
 *
 *  - the bed is brighter along its own top and falls into shadow towards its base, because the
 *    bed above it overhangs and the light comes from above and to the left;
 *  - *both* sides of a contact darken, because the overhang shadows the rock immediately under it
 *    and the underside of the overhanging bed is itself turned away from the light. This is the
 *    single strongest cue that the units are stacked solids rather than a gradient;
 *  - a low-frequency mottle, so the face is not one flat value even where nothing else changes;
 *  - a fall-off at the two ends, so the block reads as having sides.
 *
 * It is a brightness only. Nothing here shifts a band's hue, so a formation still reads as the
 * colour the palette gives it when the reader is checking the legend against the rock.
 */
function faceShade(seed: number, top: number, bottom: number, ends: number, deepFrac: number) {
  return (v: number, w: number): number => {
    const grad = top + (bottom - top) * v
    /** the contact shadow, in a fixed share of the unit's own thickness so thin units keep it */
    const ao = Math.exp(-v * 9) * 0.3
    const under = Math.exp(-(1 - v) * 7) * 0.16
    const endFall = 1 - ends * Math.pow(Math.abs(w - 0.5) * 2, 2.4)
    const u = w * 9 + seed
    const mottle = 1 + 0.075 * Math.sin(u * 2.3 + seed) + 0.045 * Math.sin(w * 17 + v * 5 + seed * 2)
    /**
     * Depth darkens what is further down the block, so the section reads as going away from the
     * light rather than as a stack of equally bright swatches. Capped at 10%, and the reservoir
     * sits high enough in the frame to be barely touched by it.
     */
    const deep = 1 - Math.min(0.1, Math.max(0, deepFrac) * 0.1)
    return Math.max(0.34, grad * endFall * mottle * deep * (1 - ao - under * 0.5))
  }
}

/**
 * Roughness that stops at every contact and at the frame.
 *
 * The displacement is scaled by the distance to the nearest edge, so the cut's boundary stays
 * exactly on the depth the ruler prints while the rock between contacts is genuinely uneven. It
 * is several octaves rather than one, because a single sine reads as a wobble and a sum of them
 * reads as rock.
 */
function makeRelief(seed: number, x0: number, x1: number, y0: number, y1: number, amount = 1) {
  const w = Math.max(1, x1 - x0)
  const h = Math.max(1, y1 - y0)
  const fx = Math.max(22, w * 0.04)
  const fy = Math.max(5, h * 0.22)
  return (sx: number, sy: number): number => {
    const t =
      Math.min(1, Math.min(sx - x0, x1 - sx) / fx) * Math.min(1, Math.min(sy - y0, y1 - sy) / fy)
    if (t <= 0) return 0
    const u = sx / w
    const v = sy / h
    return (
      (Math.sin(u * 5.3 + seed * 1.7) * 1.35 +
        Math.sin(u * 11.1 - v * 0.21 + seed * 2.3) * 0.8 +
        Math.sin(u * 23.7 + v * 0.44 - seed * 0.7) * 0.42 +
        Math.sin(v * 7.9 + seed * 0.31) * 0.55) *
      t *
      t *
      MAX_RELIEF *
      amount
    )
  }
}

/** How far a band is roughened by its own rock: sand is loose, basement is not. */
const RELIEF: Record<SectionLayer['lithology'], number> = {
  topsoil: 0.62,
  soil: 0.7,
  sand: 1.25,
  sandstone: 1.05,
  shale: 0.62,
  clay: 0.5,
  delta: 0.95,
  water: 0.9,
  reservoir: 1.1,
  basement: 0.4,
}

/** How many bedding planes a unit of this rock carries, and how visible each one is. */
const BEDDING: Record<SectionLayer['lithology'], { count: number; weight: number }> = {
  topsoil: { count: 0, weight: 0 },
  soil: { count: 0, weight: 0 },
  sand: { count: 4, weight: 1.1 },
  sandstone: { count: 5, weight: 1.4 },
  shale: { count: 7, weight: 0.9 },
  clay: { count: 6, weight: 0.85 },
  delta: { count: 5, weight: 1.5 },
  water: { count: 4, weight: 1.2 },
  reservoir: { count: 3, weight: 1.5 },
  basement: { count: 2, weight: 1.1 },
}

/**
 * The ground the machine stands on, built in world space with its normals genuinely up.
 *
 * This one surface is the exception to the rule above, and it has to be. The cut-face ribbons are
 * authored in the projection's units and mapped in by a matrix that has a negative y scale — a
 * map which is a rotation and a scale, so it preserves winding and therefore *flips every normal*
 * it carries. That is harmless for a face pointing at the camera, because the shader reverses the
 * normal of a back-facing double-sided triangle anyway and the face still comes out lit. A
 * horizontal surface is not harmless: its normal in that space points up, the map turns it to
 * point down, and the ground ends up lit from underneath. It measured a fifth of the brightness of
 * the rock behind it, which is why the surface read as a black band between the site and the
 * topsoil.
 *
 * So the ground is built directly in world space instead: a plane at a constant world y, spanning
 * x and the receding z, with a normal of exactly `+y` and no matrix in the way. It also gets its
 * own shallow relief, which is what a gravel pad cut into a site looks like from above and which
 * is the only thing in the picture that can catch the low sun differently on the left than on the
 * right.
 */
function groundSurface(view: SectionView, x0: number, x1: number, depth: number): THREE.BufferGeometry {
  const segX = 48
  const segY = 10
  const y = (view.height - view.groundY) / view.cosPitch
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const w = Math.max(1, x1 - x0)

  for (let j = 0; j <= segY; j++) {
    const t = j / segY
    for (let i = 0; i <= segX; i++) {
      const u = i / segX
      const x = x0 + w * u
      const z = -depth * t
      /**
       * Shallow undulation, in world y. At this pitch a world y of 1 moves the surface by
       * cos(pitch) ≈ 0.93 px on the screen, so this is worth a couple of px of bump and no more.
       * Faded out at the front edge, which is the datum the machine stands on.
       */
      const swell =
        (Math.sin(u * 7.1 + 1.3) * 1.5 + Math.sin(u * 15.3 - 0.6) * 0.75 + Math.sin(t * 4.2 + u * 2) * 0.9) *
        Math.min(1, t * 3)
      pos.push(x, y + swell, z)
      uv.push((x - x0) / GROUND_TILE_PX, (t * depth) / GROUND_TILE_PX)
      /**
       * The pad is brighter at the front, where it is cut and compacted, and falls away as it
       * recedes into the site's own shadow. It also brightens towards the centre of the pad, so
       * the ground under the machine is the brightest thing in the crust.
       */
      const front = 1 - 0.3 * t
      const centre = 1 + 0.1 * (1 - Math.abs(u - 0.5) * 2)
      const dirt = 1 + 0.06 * Math.sin(u * 11.7 + 2.2)
      col.push(front * centre * dirt, front * centre * dirt, front * centre * dirt)
    }
  }
  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segX; i++) {
      const i0 = j * (segX + 1) + i
      const i1 = i0 + 1
      const i2 = i0 + segX + 1
      const i3 = i2 + 1
      /** wound so that the front face looks up, i.e. at the sky and at the low sun */
      idx.push(i0, i2, i1, i1, i2, i3)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/* --------------------------------------------------------------------- scene --- */

export function createGeologyScene(canvas: HTMLCanvasElement, input: GeologySceneInput): GeologyScene {
  const view = input.view
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping

  const scene = new THREE.Scene()
  /**
   * The frustum is `height` tall, and that is exactly right rather than merely convenient: because
   * the camera is tilted, the canvas's vertical axis is the dot product with the camera's up
   * vector, and for a point at screen `sy` and depth `d` that product comes to
   * `height − sy + d·sin(pitch)`. Measuring it off `height` recovers `sy − d·sin(pitch)`, which is
   * the projection's whole contract. Stretching the frustum to `height / cosPitch` would be wrong
   * and would move every contact off the depth the ruler prints.
   */
  const camera = new THREE.OrthographicCamera(0, view.width, view.height, 0, -4000, 4000)
  camera.position.set(0, 0, 0)
  // Looking down by the tilt, so a surface behind the cut sits *above* its contact on the
  // screen — the same way the ground recedes from the front edge of the block.
  camera.rotation.x = (-SECTION_LAYOUT.pitchDeg * Math.PI) / 180

  /**
   * Summed, a face-on surface receives about 0.88 of its own token colour from these four, and
   * the fifth of it comes back as emissive. Under unity on purpose: it is what lets a facet turn
   * up to white and another turn down to a third without either one changing hue.
   */
  const key = new THREE.DirectionalLight(0xfff6e8, 0.62)
  key.position.set(-0.72, 0.78, 1.15)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xb9d0dd, 0.2)
  fill.position.set(0.9, 0.25, 0.7)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 0.1)
  rim.position.set(0.2, -0.85, 0.55)
  scene.add(rim)
  scene.add(new THREE.AmbientLight(0xdfe6ea, 0.26))

  const disposables: { dispose(): void }[] = []
  const track = <T extends { dispose(): void }>(item: T): T => {
    disposables.push(item)
    return item
  }

  const rockLeft = view.rockLeft
  const rockRight = view.rockRight
  const ledge = Math.max(24, view.ledgePx)
  const root = new THREE.Group()
  scene.add(root)

  /** The bands, so a hover can find its own material again. */
  const bandMats = new Map<string, { material: THREE.MeshStandardMaterial; rest: number }>()
  /**
   * Bands that come up with the cut, how deep into it each one starts, and the opacity it settles
   * at. `peak` is only ever below 1, and only for the one additive element in the scene: additive
   * blending at full opacity on a token already near white clips the interval to a flat sheet, and
   * a halo is meant to say "there is something in here", not repaint the rock.
   */
  const rockReveal: { material: THREE.Material & { opacity: number }; at: number; peak?: number }[] = []
  const riskReveal: { material: THREE.MeshBasicMaterial; at: number; peak: number }[] = []
  const cutSpan = Math.max(1, view.height - view.groundY)
  /** the cut opens from the surface down, so a band's `at` is how far down it is */
  const revealAt = (y: number) => Math.max(0, Math.min(0.82, ((y - view.groundY) / cutSpan) * 0.62))

  /* ---- the ground the machine stands on ---------------------------------- */

  const groundTex = track(groundTexture())
  groundTex.repeat.set(1, 1)
  const groundMat = track(
    new THREE.MeshStandardMaterial({
      map: groundTex,
      color: new THREE.Color(token('--nw-strata-surface', '#c9b78f')),
      /**
       * Matte, and lit from the same four lights as the rock. The point of building this surface
       * in world space with real upward normals is that it can now be lit like ground at all: it
       * takes the key at a glancing angle across the pad and stays bright, instead of being
       * shaded from below and reading as a hole between the site and the topsoil.
       */
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      vertexColors: true,
    }),
  )
  /**
   * How far back the ground reaches, so that it actually covers the crust.
   *
   * The crust is the band between the section's own top edge and the ground line, `groundY` tall,
   * and a surface `d` behind the cut rises `d·sin(pitch)` on the screen. The rock's own ledge is
   * sized for the depth of the block, not for this, and came up about 5px short: the top of the
   * crust was left showing the section's background as a flat dark band between the ground and
   * the sky. Receding to the top of the frame and a little past it puts the ground's far edge
   * behind the site ridge, which is what a horizon is.
   */
  const groundDepth = Math.max(ledge, (view.groundY + 6) / view.sinPitch)
  const ground = new THREE.Mesh(track(groundSurface(view, rockLeft, rockRight, groundDepth)), groundMat)
  ground.renderOrder = 1
  root.add(ground)
  rockReveal.push({ material: groundMat, at: 0 })

  /* ---- the strata, skin and section alike --------------------------------- */

  /** Unlit strips drawn into the face: bedding planes and the shadow under each contact. */
  const inkMat = (opacity: number, colour: string): THREE.MeshBasicMaterial =>
    track(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(colour),
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
  const beddingGroup = new THREE.Group()
  root.add(beddingGroup)

  for (const layer of input.layers) {
    const top = view.contactPoints(layer)
    const base = view.basePoints(layer)
    const y0 = view.yForLayer(layer)
    const depth = Math.abs((base[0]?.[1] ?? y0) - y0)
    if (depth < 0.5) continue
    const fill = resolveFill(layer.fill)
    const segX = 48
    const segY = Math.max(3, Math.min(20, Math.round(depth / 4)))
    const x0 = top[0]?.[0] ?? rockLeft
    const x1 = top[top.length - 1]?.[0] ?? rockRight

    const geo = track(
      ribbonGeometry(view, top, base, {
        segX,
        segY,
        relief: makeRelief(layer.seed, x0, x1, ...bandY(top, base), RELIEF[layer.lithology] ?? 0.8),
        tint: faceShade(layer.seed, layer.target ? 1.1 : 1.06, layer.target ? 0.94 : 0.84, 0.1, (y0 - view.groundY) / cutSpan),
      }),
    )

    const rest = layer.target ? EMISSIVE_TARGET : EMISSIVE_REST
    const mat = track(
      new THREE.MeshStandardMaterial({
        map: track(lithologyTexture(layer.lithology, inkRatioForFill(layer.fill))),
        color: fill,
        emissive: fill.clone(),
        emissiveIntensity: rest,
        /** rock is matte; the two bodies with something in them are not */
        roughness: layer.lithology === 'reservoir' || layer.lithology === 'water' ? 0.72 : 0.96,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: true,
        vertexColors: true,
      }),
    )
    root.add(new THREE.Mesh(geo, mat))
    bandMats.set(layer.key, { material: mat, rest })
    rockReveal.push({ material: mat, at: revealAt(y0) })

    /**
     * Bedding. A sedimentary unit is not one colour, it is a stack of beds, and the planes
     * between them are the strongest cue that this is rock and not a chart. Each parting is a
     * strip between two fractions of the unit's *own* two contact curves, so it is automatically
     * curved, parallel to the contacts, and dipping with them.
     */
    const bed = BEDDING[layer.lithology] ?? { count: 0, weight: 1 }
    if (bed.count > 0) {
      const r = rng(layer.seed + 51)
      for (let i = 0; i < bed.count; i++) {
        const f = (i + 1) / (bed.count + 1) + (r() - 0.5) * 0.06
        const frac = Math.min(0.94, Math.max(0.06, f))
        const parting = track(
          ribbonGeometry(view, top, base, {
            f0: frac,
            f1: frac + Math.min(0.035, 0.9 / depth),
            segX,
            segY: 1,
          }),
        )
        const pm = inkMat(r() > 0.7 ? 0.2 : 0.11, inkForFill(layer.fill))
        const mesh = new THREE.Mesh(parting, pm)
        mesh.renderOrder = 1
        beddingGroup.add(mesh)
        rockReveal.push({ material: pm, at: revealAt(y0) + 0.02 })
      }
    }

    /**
     * The contact itself, read as a line of shadow where the bed above overhangs, and a thin
     * lighter seam immediately under it where fresh rock has been exposed. Both follow the shared
     * curve, and together they are what makes two adjacent units read as two solids in contact
     * rather than as one gradient that happens to change colour.
     */
    if (layer.role === 'strata') {
      const shadow = track(ribbonGeometry(view, top, base, { f0: 0, f1: Math.min(0.09, 3.4 / depth), segX, segY: 1 }))
      const sm = inkMat(0.26, inkForFill(layer.fill))
      const shadowMesh = new THREE.Mesh(shadow, sm)
      shadowMesh.renderOrder = 1
      beddingGroup.add(shadowMesh)
      rockReveal.push({ material: sm, at: revealAt(y0) })
    }
  }

  /* ---- the target interval's lenses, and its halo ------------------------ */

  const target = input.target
  if (target) {
    const lensMat = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(token('--nw-hero-lens', '#9CC7BD')),
        emissive: new THREE.Color(token('--nw-hero-lens', '#9CC7BD')),
        emissiveIntensity: 0.1,
        roughness: 0.68,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: true,
        vertexColors: true,
      }),
    )
    for (const g of reservoirLenses(view, target, target.seed)) {
      const mesh = new THREE.Mesh(track(g), lensMat)
      mesh.renderOrder = 1
      root.add(mesh)
    }
    rockReveal.push({ material: lensMat, at: revealAt(view.yForLayer(target)) })

    /**
     * A halo, but a restraintful one. It sits behind the cut and is no longer allowed to be
     * additive white: the interval is meant to look like it has something in it, not like a
     * highlighter has been run under it.
     */
    const ty0 = view.yForLayer(target) - 9
    const ty1 = view.yForLayer(target) + view.layerH(target) + 9
    const glowMat = track(
      new THREE.MeshBasicMaterial({
        map: track(glowTexture()),
        color: new THREE.Color(token('--nw-hero-lens', '#9CC7BD')),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    const halo = new THREE.Mesh(
      track(
        quadGeometry(view, [
          [rockLeft - 18, ty0, -3.2],
          [rockRight + 18, ty0, -3.2],
          [rockRight + 18, ty1, -3.2],
          [rockLeft - 18, ty1, -3.2],
        ]),
      ),
      glowMat,
    )
    halo.renderOrder = 0
    root.add(halo)
    rockReveal.push({ material: glowMat, at: revealAt(view.yForLayer(target)), peak: HALO_PEAK })
  }

  /* ---- the windows the risk engine is watching --------------------------- */

  for (const risk of input.risks) {
    const y0 = view.yForMd(risk.fromMd)
    const y1 = view.yForMd(risk.toMd)
    if (y1 - y0 < 0.5) continue
    const mat = track(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(riskColour(risk.level)),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    const mesh = new THREE.Mesh(
      track(
        quadGeometry(view, [
          [rockLeft, y0, -2.6],
          [rockRight, y0, -2.6],
          [rockRight, y1, -2.6],
          [rockLeft, y1, -2.6],
        ]),
      ),
      mat,
    )
    mesh.renderOrder = 2
    mesh.visible = false
    root.add(mesh)
    riskReveal.push({ material: mat, at: 0, peak: risk.level === 'HIGH' ? 0.2 : 0.14 })
  }

  /* ---- the bit, standing where the bore is ------------------------------- */

  const bitColour = new THREE.Color(token('--nw-yellow', '#f5c518'))
  const bitMat = track(new THREE.MeshBasicMaterial({ color: bitColour, transparent: true }))
  const bitGroup = new THREE.Group()
  const cone = new THREE.Mesh(track(new THREE.ConeGeometry(6, 13, 4)), bitMat)
  cone.rotation.z = Math.PI
  cone.position.set(0, 6.5, -4)
  const collar = new THREE.Mesh(track(new THREE.CylinderGeometry(3, 3, 22, 6)), bitMat)
  collar.position.set(0, -11, -4)
  bitGroup.add(cone, collar)
  bitGroup.renderOrder = 3
  bitGroup.position.copy(toWorld(view, view.xForKm(input.bitEastKm), view.yForMd(input.bitMd), 0))
  root.add(bitGroup)
  rockReveal.push({ material: bitMat, at: revealAt(view.yForMd(input.bitMd)) })

  const glowMat = track(new THREE.MeshBasicMaterial({ color: bitColour, transparent: true, opacity: 0, depthWrite: false }))
  const glow = new THREE.Mesh(track(new THREE.RingGeometry(9, 15, 22)), glowMat)
  glow.position.copy(toWorld(view, view.xForKm(input.bitEastKm), view.yForMd(input.bitMd), -4.4))
  glow.renderOrder = 3
  glow.visible = false
  root.add(glow)

  /* ---- assembly ----------------------------------------------------------- */

  let revealT = input.reducedMotion ? 1 : 0
  let lit: string | null = null
  let detail = false
  let detailT = 0

  function applyReveal(): void {
    for (const { material, at, peak } of rockReveal) {
      const t = Math.max(0, Math.min(1, (revealT - at) / 0.22))
      material.opacity = t * (peak ?? 1)
      material.visible = t > 0.004
    }
    const d = detail ? 1 : 0
    detailT += (d - detailT) * 0.2
    for (const { material, peak } of riskReveal) {
      material.opacity = detailT * peak
      material.visible = detailT > 0.02
    }
  }

  function render(): void {
    applyReveal()
    renderer.render(scene, camera)
  }

  function resize(w: number, h: number): void {
    renderer.setPixelRatio(Math.min(MAX_DPR, window.devicePixelRatio || 1))
    renderer.setSize(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)), false)
    camera.left = 0
    camera.right = Math.max(2, Math.round(w))
    camera.top = Math.max(2, Math.round(h))
    camera.bottom = 0
    camera.updateProjectionMatrix()
  }

  let lastGlow = -1

  return {
    render,
    resize,
    reveal(t: number) {
      revealT = Math.max(0, Math.min(1, t))
      render()
    },
    tick(nowMs: number) {
      if (input.reducedMotion || revealT < 1) return false
      let moved = false
      if (detailT > 0.02 && detailT < 0.999) {
        render()
        moved = true
      }
      const t = (Math.sin(nowMs / 640) + 1) / 2
      const next = 0.1 + t * 0.15
      if (Math.abs(next - lastGlow) > 0.004) {
        lastGlow = next
        glowMat.opacity = next
        const s = 1 + t * 0.14
        glow.scale.set(s, s, 1)
        moved = true
      }
      return moved
    },
    /**
     * Move the bit without rebuilding the scene. The live feed publishes depth continuously,
     * and a whole section is far too much to rebuild for a number that moves by a metre.
     */
    setBit(md: number) {
      const x = view.xForKm(input.bitEastKm)
      const y = view.yForMd(md)
      bitGroup.position.copy(toWorld(view, x, y, 0))
      glow.position.copy(toWorld(view, x, y, -4.4))
    },
    /** The band under the pointer comes up out of the rock, and only that band. */
    setHighlight(key) {
      if (key === lit) return
      lit = key
      for (const [bandKey, { material, rest }] of bandMats) {
        material.emissiveIntensity = bandKey === key ? EMISSIVE_LIT : rest
      }
    },
    setDetail(on: boolean) {
      if (on === detail) return
      detail = on
      glow.visible = on
      if (!on) {
        for (const { material } of riskReveal) {
          material.opacity = 0
          material.visible = false
        }
        detailT = 0
      }
    },
    dispose() {
      for (const item of disposables) item.dispose()
      scene.clear()
      renderer.dispose()
    },
  }
}
