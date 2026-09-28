import {
  SECTION_BOTTOM_MD,
  SECTION_FLOOR_MD,
  SECTION_LAYOUT,
  SECTION_TOP_MD,
  type Lithology,
  type SectionLayer,
} from '../../lib/section'

/**
 * One projection, shared by the 3D scene and the overlay.
 *
 * The section is drawn with a yaw of exactly zero, which is what makes it a section: the
 * camera looks straight down the line of the cut, so a depth is a distance on the screen and
 * nothing converges towards a vanishing point. Tilting down by `pitchDeg` is then only a
 * rotation about the horizontal axis, and a rotation maps to a linear map — so
 *
 *     screenX = eastPx
 *     screenY = ySection − d · sin(pitch)
 *
 * holds for every point in the scene, where `d` is how far behind the cut plane a surface
 * sits. The rock's own top surfaces therefore lift by a constant factor, and a DOM element
 * placed with these two functions lands on the pixel the canvas drew. That is the whole
 * reason the section is an orthographic camera and not a perspective one: the ruler has to
 * be able to measure it.
 *
 * ## The contacts are surfaces, not lines
 *
 * The second contract here is newer and it is what separates a cutaway from a chart. A contact
 * between two formations is a *surface* — an unconformity, a bedding plane, the top of a sand —
 * and rock is never laid down perfectly flat. So every contact is a curve, and the curve is a
 * property of this projection rather than of either renderer: the canvas builds its rock from
 * `bandPath`, the overlay draws its contact lines and its hit targets from the same polyline,
 * and the two therefore cannot disagree. There is one exception and it is the ground line,
 * which is the machine's datum and has to be a straight line for the machine to stand on.
 *
 * The ruler does not lie about any of this. `contactY` returns the contact's *nominal* depth
 * at the centre of the cut, and the wander is tapered to nothing at the two ends of the frame,
 * so every printed depth is still a depth the contact passes through — the same promise the
 * break line below makes about the compressed skin.
 *
 * There is one deliberate lie elsewhere, and it is the only thing in the picture that is not
 * to scale: the band between the ground line and the break. A hundred metres of topsoil at
 * true scale is four pixels, so the near-surface rock is compressed into a third of the frame
 * and `yForLayer` places it by share rather than by metres. Everything below the break is
 * linear in measured depth, and the break line says which is which.
 */

/** How far a contact wanders, as a share of the unit's own drawn thickness. */
const CONTACT_ROUGH: Record<Lithology, number> = {
  /** the unit the surface follows, and the one whose thickness varies most */
  topsoil: 0.62,
  soil: 0.52,
  /** loose sand: dune-scale relief on the top of a bed */
  sand: 0.66,
  sandstone: 0.58,
  /** a uniform fine-grained seal is the flattest thing in any section */
  shale: 0.32,
  clay: 0.3,
  /** channel fill: the most irregular thing here, and the reason delta sand looks like delta sand */
  delta: 0.72,
  water: 0.5,
  reservoir: 0.48,
  /** crystalline and massive, so it barely has bedding to be irregular about */
  basement: 0.2,
}

/** …but never more than this many px, so a thick band cannot wander off the ruler. */
const CONTACT_MAX_PX = 8
/** …and never less than this, so a thin band still has a visible edge. */
const CONTACT_MIN_PX = 1.1
/** the fraction of the cut's width over which the wander is faded out at each end */
const EDGE_TAPER = 0.075
/** the regional dip, as a share of depth below the ground line: every contact leans the same way */
const REGIONAL_DIP = 0.05

export interface SectionView {
  width: number
  height: number
  /** screen y of the ground line — the machine's datum, and the only straight boundary here */
  groundY: number
  /**
   * How far the crust's own light reaches above the ground line.
   *
   * The band between the section's top edge and the ground line is the crust: the surface the
   * machine stands on, receding away from the cut. It belongs to the section rather than to the
   * site, because only the section knows where the ground line is. This is that band's height, and
   * it is the depth the horizon wash is drawn over — a soft body of surface light, brightest at the
   * datum and gone by the top of the frame, so the dusk and the topsoil meet in a gradient rather
   * than at a seam.
   */
  groundWash: number
  /** screen y of the break line, where the compressed overburden meets the true depth axis */
  breakY: number
  /** screen y of the bottom of the axis */
  axisBottomY: number
  /** screen y of a measured depth, on the cut plane */
  yForMd(md: number): number
  /** screen x for a point this many km east of the active well */
  xForKm(km: number): number
  /** the y offset of a surface `d` px behind the cut plane */
  yBehind(d: number): number
  /** screen y of a band: its share of the compressed skin, or its depth on the true axis */
  yForLayer(layer: SectionLayer): number
  /** the drawn height of a band */
  layerH(layer: SectionLayer): number
  /**
   * Screen y of a unit's own top contact, away from the ruler's depth.
   *
   * A contact is a *surface* — an unconformity, a bedding plane, the top of a sand — and rock is
   * never laid down perfectly flat, so the contact is a curve and `yForLayer` is only its nominal
   * depth. `yForLayer` and `contactY` agree at the centre of the cut, which is where the ruler
   * reads, so every printed depth is still a depth the contact passes through.
   *
   * The one exception is the ground line: the top of the first unit is exactly the machine's
   * datum and is dead straight, because the machine has to stand on it and the ruler has to be
   * able to measure the crust off it.
   */
  contactY(layer: SectionLayer, x: number): number
  /** A unit's own top contact, sampled across the cut as `[x, y]`, ready for a mesh or a `d`. */
  contactPoints(layer: SectionLayer, n?: number): [number, number][]
  /**
   * A unit's own base contact, sampled the same way.
   *
   * This is `contactPoints` of the unit *beneath* it, which is the whole point: one contact, one
   * polyline, drawn once. A unit's base and the next unit's top are the same numbers, so the rock
   * cannot develop a gap at a contact and the overlay's outline cannot drift off it. The deepest
   * unit has nothing beneath it and ends on the foot of the axis.
   */
  basePoints(layer: SectionLayer, n?: number): [number, number][]
  /** The contact as an SVG path in the overlay's own coordinates. */
  contactPath(layer: SectionLayer, n?: number): string
  /** A unit's closed outline: its top contact out, its base contact back. */
  bandPath(layer: SectionLayer, n?: number): string
  /**
   * The broken left and right edge of the cut.
   *
   * A block of rock that has been sawn in half has two sawn faces, and the sawn faces are the
   * straight ones — but the rock *in* the picture is cut back by the tool as it goes and has
   * already broken away where it was weak, so the boundary between the cut face and the paper is
   * ragged rather than ruled. One function for the whole block, so it is one broken face and not
   * eleven, and tapered to nothing at the ground line and at the foot of the section: those two
   * are the measurements the machine and the ruler agree on, and they stay straight.
   */
  edgePoints(n?: number): [number, number][]
  /** How far the cut's left edge has been broken back at a given screen y, in px. */
  edgeOffset(y: number): number
  /** px of depth per metre of measured depth */
  pxPerM: number
  /** px per km of true east–west distance */
  pxPerKm: number
  /** half of the east–west span the cut covers, in km */
  halfSpanKm: number
  /** how far the rock's own surfaces recede behind the cut, in px */
  ledgePx: number
  sinPitch: number
  cosPitch: number
  /** the drawn extent of the rock */
  rockLeft: number
  rockRight: number
  rulerW: number
  /** x where the formation label column starts */
  labelX: number
  /** the deepest labelled depth, for the axis caption */
  floorMd: number
  /** true in a narrow column, where the gutters give ground and the legend loses its ranges */
  compact: boolean
}

export function createSectionView(
  width: number,
  height: number,
  eastings: number[],
  layers: readonly SectionLayer[] = [],
): SectionView {
  const L = SECTION_LAYOUT
  const w = Math.max(240, width)
  const h = Math.max(200, height)
  const pitch = (L.pitchDeg * Math.PI) / 180
  const sinPitch = Math.sin(pitch)
  const cosPitch = Math.cos(pitch)
  /** a narrow column cannot spend a sixth of its width on gutters */
  const compact = w < 560
  const rulerW = compact ? 40 : L.rulerW
  const labelW = compact ? 96 : L.labelW
  const marginKm = compact ? 0.35 : L.marginKm

  const reach = eastings.reduce((a, km) => Math.max(a, Math.abs(km)), 0)
  const halfSpanKm = Math.max(compact ? 2.6 : L.minHalfSpanKm, reach + marginKm)
  const pxPerKm = (w / 2 - L.edgeInsetPx) / halfSpanKm

  const axisTop = L.breakFrac * h
  const axisBottom = L.axisBottomFrac * h
  const pxPerM = (axisBottom - axisTop) / (SECTION_BOTTOM_MD - SECTION_TOP_MD)

  const groundY = L.groundFrac * h
  const skinH = axisTop - groundY
  const rockLeft = rulerW
  const rockRight = w - labelW
  const rockW = Math.max(1, rockRight - rockLeft)

  const yForMd = (md: number) => axisTop + (md - SECTION_TOP_MD) * pxPerM
  const yForLayer = (layer: SectionLayer) =>
    layer.role === 'strata' ? yForMd(layer.fromMd) : groundY + (layer.bandIndex / layer.bandCount) * skinH
  const layerH = (layer: SectionLayer) =>
    layer.role === 'strata' ? yForMd(layer.toMd) - yForMd(layer.fromMd) : skinH / layer.bandCount

  /* ----------------------------------------------------------------- contacts -- */

  /** Only units with a drawn thickness take part in the shared boundary. */
  const ordered = layers.filter((l) => layerH(l) >= 0.5)
  /** Position in the section, or −1 for a unit with no drawn thickness. */
  const indexOf = (layer: SectionLayer): number => ordered.findIndex((l) => l.key === layer.key)

  /**
   * The wander itself: four octaves of sine, each with the unit's own seed as its phase, so two
   * units never undulate in step and the same unit undulates the same way on every render.
   * Octaves rather than noise because a sum of sines is exactly what a bedding surface traced
   * across a hundred metres of dip looks like — long, low swells with smaller ones on top.
   */
  const shape = (seed: number, u: number): number =>
    0.58 * Math.sin(u * 3.05 + seed * 1.71) +
    0.31 * Math.sin(u * 7.4 - seed * 0.93 + 1.7) +
    0.17 * Math.sin(u * 13.3 + seed * 2.37) +
    0.09 * Math.sin(u * 24.1 - seed * 1.19 + 0.4)

  /**
   * How far this contact moves, and how much of that is a lean every contact shares.
   *
   * The dip is the reason the section reads as a *place* rather than a stack: real contacts in
   * one field are broadly parallel and lean the same way, so the units are not independent
   * squiggles but a gently inclined sequence, and the eye follows the dip straight down to the
   * reservoir. It is scaled by depth below the ground line, so the near-surface contacts stay
   * almost level and the deep ones are visibly tilted.
   */
  const wander = (layer: SectionLayer, nominal: number, x: number): number => {
    const u = (x - rockLeft) / rockW
    const edge = Math.min(1, Math.min(u, 1 - u) / EDGE_TAPER)
    if (edge <= 0) return nominal
    const thick = Math.max(CONTACT_MIN_PX, layerH(layer))
    const amp = Math.min(CONTACT_MAX_PX, Math.max(CONTACT_MIN_PX, (CONTACT_ROUGH[layer.lithology] ?? 0.5) * thick))
    const dip = (nominal - groundY) * REGIONAL_DIP * (u - 0.5)
    return nominal + (shape(layer.seed, u) * amp + dip) * edge * edge
  }

  const cache = new Map<string, [number, number][]>()
  const SEGS = 44

  /**
   * How far the cut has been broken back at a given screen y, in px. Positive is left, negative
   * is right, and it is the same number for the left and the right edge at a given depth because
   * the sawn face is a single surface.
   */
  const edgeOffset = (y: number): number => {
    const v = (y - groundY) / Math.max(1, h - groundY)
    if (v <= 0 || v >= 1) return 0
    const t = Math.sin(v * Math.PI)
    return (2.1 * Math.sin(v * 5.1 + 0.7) + 1.2 * Math.sin(v * 11.3 + 2.2)) * t
  }

  /** A boundary with no relief on it, sampled the same way a contact is so it can be drawn with it. */
  const straight = (y: number, n: number): [number, number][] => {
    const pts: [number, number][] = []
    for (let i = 0; i <= n; i++) pts.push([rockLeft + (rockW * i) / n, y])
    return pts
  }

  const contactPoints = (layer: SectionLayer, n = SEGS): [number, number][] => {
    const key = `${layer.key}:${n}`
    const hit = cache.get(key)
    if (hit) return hit
    const nominal = yForLayer(layer)
    /** the top of the first unit is the ground line, and the ground line is straight */
    if (indexOf(layer) <= 0) return straight(nominal, n)
    const pts: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const x = rockLeft + (rockW * i) / n
      const y = wander(layer, nominal, x)
      /** the sample's own x is pulled in by the broken edge, so the block is not a ruled rectangle */
      pts.push([x + edgeOffset(y), y])
    }
    cache.set(key, pts)
    return pts
  }

  const contactY = (layer: SectionLayer, x: number): number =>
    indexOf(layer) <= 0 ? yForLayer(layer) : wander(layer, yForLayer(layer), x)

  /** A unit's base is the unit beneath's top — one polyline, asked for twice. */
  const basePoints = (layer: SectionLayer, n = SEGS): [number, number][] => {
    const i = indexOf(layer)
    const below = i >= 0 ? ordered[i + 1] : undefined
    if (below) return contactPoints(below, n)
    return straight(yForLayer(layer) + layerH(layer), n)
  }

  const pathOf = (pts: [number, number][]): string => {
    let d = `M${pts[0]?.[0] ?? 0} ${pts[0]?.[1] ?? 0}`
    for (let i = 1; i < pts.length; i++) d += ` L${pts[i]?.[0] ?? 0} ${pts[i]?.[1] ?? 0}`
    return d
  }

  const contactPath = (layer: SectionLayer, n = SEGS): string => pathOf(contactPoints(layer, n))

  /**
   * A unit's closed outline, walked out along its own top contact and back along its base. The two
   * polylines share their end points exactly, so the shape closes without a seam and the 3D
   * ribbon built from the same two curves has no gap at either contact.
   */
  const bandPath = (layer: SectionLayer, n = SEGS): string => {
    const top = contactPoints(layer, n)
    const base = basePoints(layer, n)
    let d = pathOf(top)
    for (let i = base.length - 2; i >= 0; i--) d += ` L${base[i]?.[0] ?? 0} ${base[i]?.[1] ?? 0}`
    return `${d} Z`
  }

  /**
   * The ragged edge of the cut, sampled top to bottom as `[y, offset]`, ready for a polyline.
   * The same wander that `contactPoints` bakes into its x samples, exposed so the overlay can
   * draw a closing edge without guessing at it.
   */
  const EDGE_SEGS = 18
  const edgePoints = (n = EDGE_SEGS): [number, number][] => {
    const pts: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const y = groundY + (i / n) * (h - groundY)
      pts.push([y, edgeOffset(y)])
    }
    return pts
  }

  return {
    width: w,
    height: h,
    groundY,
    groundWash: groundY,
    breakY: axisTop,
    axisBottomY: axisBottom,
    yForMd,
    xForKm: (km) => w / 2 + km * pxPerKm,
    yBehind: (d) => -d * sinPitch,
    /**
     * The one place a depth is not a depth. Above the break the section is compressed, so a skin
     * band is placed by its share of that band rather than by its metres — which is why `share`
     * exists on the layer and why the break line and its caption are not optional.
     */
    yForLayer,
    layerH,
    contactY,
    contactPoints,
    basePoints,
    contactPath,
    bandPath,
    edgePoints,
    edgeOffset,
    pxPerM,
    pxPerKm,
    halfSpanKm,
    ledgePx: L.ledgeFrac * h,
    sinPitch,
    cosPitch,
    rockLeft,
    rockRight,
    rulerW,
    labelX: w - labelW,
    floorMd: SECTION_FLOOR_MD,
    compact,
  }
}
