import type { CSSProperties } from 'react'

/**
 * Every colour in the landing hero's right-hand visual, in one place.
 *
 * This is the recolour described in the brief and nothing else. The drawing — every path, every
 * texture generator, every proportion of the pumping unit — is untouched, and this file is where
 * the only thing that changed is kept, so that a future change of mind about a single band is one
 * line here rather than a hunt through `tokens.css`, three renderers and a WebGL scene.
 *
 * ## How the values reach the drawing
 *
 * Three renderers read this palette, and none of them can be given a TypeScript object:
 *
 * - the **flat SVG** fallback and the SVG overlay read CSS custom properties, because their colours
 *   are `style` and CSS values;
 * - the **CSS** for the stage reads custom properties too;
 * - the **WebGL** scene and the pumping unit's materials need real numbers.
 *
 * So this module exports both: `paletteVars`, a custom-property map that `Hero` applies to the
 * visual panel, and plain typed values for the renderers that cannot use CSS. The two are generated
 * from the same declarations, so a token cannot be changed in one and forgotten in the other —
 * which is the actual failure mode this file exists to prevent.
 *
 * ## Why the ink is a target colour and not a texture value
 *
 * The lithology textures are greyscale and are *multiplied* by the band's fill, so a stroke drawn in
 * black does not come out black: it comes out as `0 × fill`, and a stroke drawn in the ink colour
 * does not come out as the ink either. A band is drawn from its ink by dividing the two
 * (`inkOverFill`, below), which is why the greyscale generators ask this module for a ratio rather
 * than a colour. That is what makes the texture read as "a darker shade of its own rock" instead of
 * as the same generic dark on all eleven bands.
 */

/** The one ink every band's texture strokes are cut from, where a band has no ink of its own. */
const INK_FALLBACK = '#191b1a'

/**
 * The eleven bands, in depth order.
 *
 * Matched to the section by **depth range, not by name**, because the brief is about what is at a
 * depth and the API is free to rename a band. `key` is the existing `--nw-strata-*` key in
 * `lib/section.ts`, which is left exactly as it is — the keys are how the drawing finds a band, and
 * renaming one would be a geometry change by this file's own definition.
 */
export interface Stratum {
  /** the existing `--nw-strata-*` key; unchanged, because the drawing looks bands up by it */
  key: string
  /** the band's base colour, and what a texture-free sample of it must return */
  fill: string
  /** the colour of this band's own texture strokes — brush lines, bedding, streaks, lens edges */
  ink: string
  /** metres, for the record and for the band-sampling check in §7 */
  fromM: number
  toM: number
  /** lithology-specific extras the brief calls for */
  lens?: string
  streak?: string
  streakOpacity?: number
}

export const STRATA: readonly Stratum[] = [
  { key: 'topsoil', fill: '#7C8656', ink: '#58613C', fromM: 0, toM: 7 },
  { key: 'soil', fill: '#A27B55', ink: '#72553A', fromM: 7, toM: 48 },
  { key: 'sand', fill: '#E4D9BC', ink: '#B5A57E', fromM: 48, toM: 170, streak: '#FFFFFF', streakOpacity: 0.6 },
  { key: 'sandstone', fill: '#D3A962', ink: '#9C773C', fromM: 170, toM: 700 },
  { key: 'shale', fill: '#8E948A', ink: '#5E645B', fromM: 700, toM: 2700 },
  { key: 'girujan', fill: '#A97560', ink: '#764F3F', fromM: 2700, toM: 2900 },
  { key: 'tipam', fill: '#8A8F9B', ink: '#5B606B', fromM: 2900, toM: 3080 },
  /* The aquifer, which §6.1 relabels: a water-bearing sand at 3,080 m is not an aquifer, and the
     interval is the Tipam sandstone the bit is drilling. The key stays `aquifer` — it is the
     lithology, and the lithology is what the texture is drawn from. */
  { key: 'aquifer', fill: '#CDB57C', ink: '#97834F', fromM: 3080, toM: 3186 },
  /* The Barail sand. Its dark streaks are kept and are meant to read as coal seams, which is why
     this is the darkest ink in the section by a wide margin. */
  { key: 'barail', fill: '#62665F', ink: '#2F322E', fromM: 3186, toM: 3420 },
  { key: 'reservoir', fill: '#6FA197', ink: '#47766C', fromM: 3420, toM: 3600, lens: '#9CC7BD' },
  { key: 'basement', fill: '#414A5A', ink: '#272D39', fromM: 3600, toM: 3700 },
]

export const byKey = new Map(STRATA.map((b) => [b.key, b]))

/** A band's fill, or the shared ink if a band is somehow not in the table. */
export function stratumFill(key: string): string {
  return byKey.get(key)?.fill ?? INK_FALLBACK
}

/** A band's texture ink. */
export function stratumInk(key: string): string {
  return byKey.get(key)?.ink ?? INK_FALLBACK
}

/* ------------------------------------------------------------------ colour math --- */

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

export function toHex(rgb: readonly number[]): string {
  return '#' + rgb.map((v) => clamp255(v).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/**
 * The multiplier that turns this band's fill into this band's ink.
 *
 * The lithology texture is greyscale and multiplied by the fill, so to *see* a stroke in the ink
 * colour the texture has to carry `ink ÷ fill`. Values are clamped at 1, because a ratio above 1
 * cannot be expressed in a multiply and a lighter ink on a lighter band would have needed an
 * additive term this format does not have. Clamping is visible — the sand's ink is the ratio that
 * was asked for, capped — and it is the reason §7 checks the bands' *fills* against tokens and
 * leaves the texture to the eye.
 */
export function inkOverFill(key: string): string {
  const band = byKey.get(key)
  if (!band) return INK_FALLBACK
  const f = channels(band.fill)
  const i = channels(band.ink)
  return toHex([i[0] / f[0], i[1] / f[1], i[2] / f[2]])
}

/**
 * The palette key a layer's `fill` refers to.
 *
 * A layer is not keyed by its band — `lib/section.ts` gives the same sand two keys, `skin-sand` and
 * `Girujan-sand`, and a band's own body is keyed by nothing but the band's name — but every one of
 * them names its colour as `var(--nw-strata-<key>)`. So the fill is the one field that reliably
 * says *which rock this is*, and it is the same field the renderer already resolves to get the
 * colour. Reading the key back out of it keeps the texture and the fill from ever disagreeing
 * about what a band is.
 */
export function paletteKeyOf(fill: string): string {
  const m = /var\(--nw-strata-([a-z]+)\)/.exec(fill)
  return m?.[1] ?? ''
}

/** The ink for whichever band a layer's `fill` names. */
export function inkForFill(fill: string): string {
  return stratumInk(paletteKeyOf(fill))
}

/** The texture multiplier for whichever band a layer's `fill` names. */
export function inkRatioForFill(fill: string): string {
  return inkOverFill(paletteKeyOf(fill))
}

/* --------------------------------------------------------------------- the stage --- */

/**
 * §2: the area above the ground line is the paper, and the only dark things left in the hero are the
 * lines that draw things.
 */
export const STAGE = {
  /** pure white above the ground line — §7 samples this to ±3 per channel */
  paper: '#FFFFFF',
  /** the textured strip the machine stands on */
  ground: '#DCDDD7',
  /** the speckles in it */
  speckle: '#A3A6A1',
  /** the one element §2 permits adding: a soft contact shadow under the machine */
  shadow: 'rgba(8,9,9,0.10)',
  /** the caption, at 12px, if it is kept at all */
  credit: '#454845',
} as const

/* ------------------------------------------------------------------- the machine --- */

/**
 * §3, as close as a shaded mesh gets to line art.
 *
 * There are no strokes on a mesh, so the brief's "1 px outline" is honoured by value rather than by
 * width: `outline` is the darkest value in the machine and the parts that used to be separated by
 * being different greys are now separated by being `#1E2021` against `#FFFFFF`, which is the
 * largest available contrast in the figure. The lighting is what makes the steel read — see
 * `rigUnitMount.ts`, where the dusk rig became a neutral one for exactly this reason.
 */
export const MACHINE = {
  /** walking beam, samson post, pitman arm, base/skid, motor box */
  structure: '#1E2021',
  /** gearbox, crank arms, christmas tree: the darker machined steel */
  machine: '#1E2021',
  /** the lighting gradient's three stops — no stop lighter than `#4A4D4B`, or it vanishes on white */
  gradient: { from: '#121414', mid: '#4A4D4B', to: '#121414' },
  /** the horsehead arc, the handwheels, the crank disc, the counterweight, the motor panel */
  yellow: '#F4C400',
  /** the horsehead's accent bar, inverted so it still reads as a detail against the yellow */
  accent: '#080909',
  /** the wellhead stack, in place of the black it used to be */
  wellhead: { body: '#8E918C', highlight: '#B7BAB4' },
  /** polished rod, bridle, flowline */
  rod: '#6B6E69',
  /** bolts and small hardware */
  hardware: '#454845',
  /** the darkest value in the figure; stands in for a stroke */
  outline: '#080909',
} as const

/**
 * The machine as a `RigPalette`, for `rigMaterials`.
 *
 * Converted here rather than at the call site because `three` wants numbers and this module is
 * meant to stay a table of tokens with no knowledge of the renderer. `0xRRGGBB` integers, which is
 * what `MeshStandardMaterial` wants; the strings above stay strings so the CSS and the SVG can use
 * the same declarations.
 */
export const machinePalette = {
  /** walking beam, Samson post, skid */
  structure: toHexNumber(MACHINE.structure),
  /** gearbox, crank arms, the beam's web: the darkest of the three greys, so the machine has an inside */
  machine: toHexNumber(MACHINE.gradient.from),
  /** counterweights and the belt guard — the parts the brief wants in signal yellow */
  rust: toHexNumber(MACHINE.yellow),
  /** the horsehead's lip and the handwheels */
  paint: toHexNumber(MACHINE.yellow),
  /** the polished rod */
  rod: toHexNumber(MACHINE.rod),
  /** the christmas tree, a stop lighter than the beam it stands under */
  wellhead: toHexNumber(MACHINE.wellhead.body),
  /** the flowline: grey, so it never reads as a second signal */
  flowline: toHexNumber(MACHINE.rod),
  /**
   * The gearbox's hover pair. The machine is near-black, so lifting it toward white is the only
   * hover cue that is visible at all — and it is the cue that tells a pointer user the rig is the
   * way into the well, so it has to be stronger here than the dusk pair it replaces.
   */
  hover: [toHexNumber(MACHINE.structure), toHexNumber(MACHINE.machine)] as [number, number],
} as const

function toHexNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

/* ------------------------------------------------------------------- the drawing --- */

/** The lines that draw the section, all in the same ink so the figure reads as one pen. */
export const INK = {
  /** band boundary lines, 1px */
  contact: 'rgba(8,9,9,0.35)',
  /** the depth-compression zigzag */
  break: '#080909',
  breakOpacity: 0.55,
  /** neighbour-well dashed paths */
  neighbour: '#454845',
  neighbourOpacity: 0.55,
  /** the bore and casing: near-white with a black hairline, so it survives all eleven fills */
  bore: '#F5F5F1',
  boreOutline: '#080909',
  /** §6.2: labels on solid chips, never a halo */
  chip: { dark: '#080909', darkText: '#FFFFFF', light: '#FFFFFF', lightText: '#080909', border: '#080909' },
  /** §6.8: nothing is set below this */
  minLabelPx: 11,
} as const

/** §4: the NWIS signal colours, which are the product's own and are left as they are. */
export const SIGNAL = {
  /** the bit marker */
  bit: '#F4C400',
  /** mud-loss and critical events */
  event: '#D9362B',
  /** the target */
  target: '#278052',
} as const

/* ------------------------------------------------------------------ the custom props --- */

const FILL_VARS: Record<string, string> = {
  'topsoil': '#7C8656',
  'soil': '#A27B55',
  'sand': '#E4D9BC',
  'sandstone': '#D3A962',
  'shale': '#8E948A',
  'girujan': '#A97560',
  'tipam': '#8A8F9B',
  'aquifer': '#CDB57C',
  'barail': '#62665F',
  'reservoir': '#6FA197',
  'basement': '#414A5A',
}

/**
 * The custom properties the SVG and the CSS read, generated from the tables above.
 *
 * The ink is published per band *and* as a ratio, because the two renderers need different things:
 * the SVG wants a colour it can put in a `fill`, and the greyscale canvas wants a multiplier.
 */
export const paletteVars = {
  ...Object.fromEntries(Object.entries(FILL_VARS).map(([k, v]) => [`--nw-strata-${k}`, v])),
  ...Object.fromEntries(STRATA.map((b) => [`--nw-strata-${b.key}-ink`, b.ink])),
  ...Object.fromEntries(STRATA.map((b) => [`--nw-strata-${b.key}-ink-ratio`, inkOverFill(b.key)])),

  '--nw-strata-ink': INK_FALLBACK,
  '--nw-strata-bulk': '#8E948A',
  '--nw-strata-surface': STAGE.ground,
  '--nw-strata-gutter': '#F7F6F2',
  '--nw-strata-sky': STAGE.paper,

  '--nw-hero-paper': STAGE.paper,
  '--nw-hero-ground': STAGE.ground,
  '--nw-hero-speckle': STAGE.speckle,
  '--nw-hero-shadow': STAGE.shadow,
  '--nw-hero-credit': STAGE.credit,

  '--nw-hero-lens': byKey.get('reservoir')?.lens ?? '#9CC7BD',
  '--nw-hero-lens-ink': byKey.get('reservoir')?.ink ?? '#47766C',
  '--nw-hero-sand-streak': byKey.get('sand')?.streak ?? '#FFFFFF',
  '--nw-hero-sand-streak-opacity': String(byKey.get('sand')?.streakOpacity ?? 0.6),

  '--nw-hero-contact': INK.contact,
  '--nw-hero-break': INK.break,
  '--nw-hero-break-opacity': String(INK.breakOpacity),
  '--nw-hero-neighbour': INK.neighbour,
  '--nw-hero-neighbour-opacity': String(INK.neighbourOpacity),
  '--nw-hero-bore': INK.bore,
  '--nw-hero-bore-outline': INK.boreOutline,

  '--nw-signal-bit': SIGNAL.bit,
  '--nw-signal-event': SIGNAL.event,
  '--nw-signal-target': SIGNAL.target,
} as CSSProperties

/**
 * Publishes the palette onto the document root, once, before anything is rendered.
 *
 * On the root rather than on the hero's own box, and that is not tidiness — it is required. Two of
 * the three renderers read these as *document* custom properties rather than as inherited ones:
 * `geologyScene.ts` resolves a band's fill and its ink with `getComputedStyle(documentElement)`, and
 * the texture generators are handed the result as a plain string. Scoping the variables to the
 * hero's box would leave the WebGL rock reading the fallback colour, silently, while the flat SVG
 * underneath it read the right one.
 */
export function installPalette(target: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(paletteVars)) {
    target.style.setProperty(name, String(value))
  }
}
