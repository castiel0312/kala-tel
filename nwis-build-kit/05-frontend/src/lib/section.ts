import type { ActiveWell, Corridor, HistoricalEvent, OffsetWell, RiskLevel, RiskSummary } from '../api/types'

/**
 * The landing cutaway, as data.
 *
 * Every interval, bore, window and glyph in the hero's section comes from the same endpoints
 * the rest of the page reads: `/corridor` for the stratigraphic band boundaries, `/risks` for
 * the windows the engine is watching, `/events` for what the neighbours hit and where the
 * engine aligned those hits onto this well, and `/offsets` for the bores they happened in.
 * The only intervals the picture contains that the API does not publish are marked
 * `interpreted`, and the section prints that word next to them.
 *
 * The section is a vertical projection onto the active well's east–west line, so the
 * horizontal scale is real: each offset sits at its own easting, the kilometre scale bar is
 * printed from the same factor the bores are drawn with, and the bore leans by the amount of
 * its own survey. Depth is true and linear across the axis; only the surface above the first
 * labelled depth is compressed, and the break line says so.
 */

/** The window the hero cuts, in measured depth. The demo corridor uses the same range. */
export const SECTION_TOP_MD = 2700
export const SECTION_BOTTOM_MD = 3700
/** The deepest depth that gets a printed axis label; below it the rock runs off the frame. */
export const SECTION_FLOOR_MD = 3540

/**
 * Vertical layout as fractions of the section's height, so the axis stays true whatever the
 * column measures: the same 1000 m occupies the same share of the frame at every breakpoint.
 */
export const SECTION_LAYOUT = {
  /**
   * The ground line sits just below the top of the column rather than on it, because the
   * ground the machine stands on has to recede *away* from the cut, and receding goes up. The
   * band is handed to the stage above as a custom property, so the pumpjack's feet and the
   * section's ground line are the same line rather than two numbers that happen to be close.
   */
  groundFrac: 0.052,
  /**
   * The break line: the bottom of the compressed skin and the top of the true depth axis.
   *
   * Everything between the ground line and here is 0–2,700 m of near-surface rock drawn in a
   * third of the frame, which is the one dishonest thing the picture does and the one thing it
   * has to: a hundred metres of topsoil at true scale is four pixels. The break line and its
   * caption say so, and the ruler below it measures the axis for real.
   */
  breakFrac: 0.33,
  axisBottomFrac: 0.95,
  /** the ruler gutter and the label column are fixed px, everything else is proportional */
  rulerW: 54,
  labelW: 158,
  /** downward tilt of the section, in degrees. Yaw stays 0 so depth maps linearly to screen y. */
  pitchDeg: 22,
  /** how far the rock's own surfaces recede behind the cut, as a fraction of the height */
  ledgeFrac: 0.1,
  /** the east–west half-span is never narrower than this, so the scale bar stays readable */
  minHalfSpanKm: 4.2,
  /** clearance kept between the outermost bore and the frame edge */
  marginKm: 0.7,
  edgeInsetPx: 16,
} as const

/**
 * What the rock is called, which is both the texture it is drawn with and the word the tooltip
 * uses. Kept to one union so a band can never be named one way and textured another.
 */
export type Lithology =
  | 'topsoil'
  | 'soil'
  | 'sand'
  | 'sandstone'
  | 'shale'
  | 'clay'
  | 'delta'
  | 'water'
  | 'reservoir'
  | 'basement'

/** How each rock is described in the tooltip — the type, not the name of the band. */
export const ROCK_TYPE: Record<Lithology, string> = {
  topsoil: 'Topsoil · humic, root zone',
  soil: 'Soil · silty clay loam',
  sand: 'Sand · unconsolidated fluvial',
  sandstone: 'Sandstone · ferruginous, clastic',
  shale: 'Shale · fissile, sealing',
  clay: 'Clay · ferruginous, plastic',
  delta: 'Deltaic sand & clay',
  water: 'Aquifer · water-bearing sand',
  reservoir: 'Reservoir · porous sandstone, oil-bearing',
  basement: 'Basement · crystalline, impermeable',
}

/**
 * The operational name of an event type, for the labels printed in the rock.
 *
 * The API speaks in enum names; a drilling report speaks in mud loss and gas influx. The glyph
 * keeps the shape of the type, so the label beside it says the same thing in the reader's words.
 * Types the API does not emit yet are mapped anyway, so a new type degrades to its own name
 * rather than to `undefined`.
 */
const EVENT_LABEL: Record<string, string> = {
  LOSS: 'MUD LOSS',
  KICK: 'GAS INFLUX',
  CEMENT: 'POOR CEMENT',
  STUCK: 'STUCK PIPE',
  TORQUE: 'TORQUE SPIKE',
  OVERPRESSURE: 'OVERPRESSURE',
  FORMATION: 'FORMATION CHANGE',
  SURVEY: 'SURVEY',
  DDR: 'DAILY REPORT',
  WCR: 'COMPLETION REPORT',
}

export function eventLabel(type: string): string {
  return EVENT_LABEL[type] ?? type.replace(/_/g, ' ').toUpperCase()
}

/** How an offset is named at the surface: its well number and how far east it is stood. */
export function offsetLabel(bore: SectionBore): string {
  const km = bore.distanceKm != null ? `${bore.distanceKm.toFixed(1)} KM` : '—'
  return `${bore.id} · ${km}`
}

export interface SectionLayer {
  key: string
  /** the one line printed in the label column, in the band's own name */
  short: string
  name: string
  formation: string
  fromMd: number
  toMd: number
  /** true when the interval is our reading of the rock rather than an API band */
  interpreted: boolean
  lithology: Lithology
  fill: string
  /** fixes the contact's shape, so the same rock looks the same on every render */
  seed: number
  /** whether this band is named in the right-hand column */
  label: boolean
  /** the one band the well is being drilled for */
  target: boolean
  /** a sentence about the rock, for the tooltip and the formation log */
  note: string
  /**
   * `skin` bands live between the ground line and the break and are drawn by their share of
   * that band, because they are compressed; `strata` bands are on the true depth axis.
   */
  role: 'skin' | 'strata'
  /** a skin band's ordinal within the compressed band, and how many there are */
  bandIndex: number
  bandCount: number
}

export interface SectionRisk {
  riskId: string
  name: string
  level: RiskLevel
  status: RiskSummary['status']
  probability: number
  fromMd: number
  toMd: number
  /** metres of window still in front of the bit; negative once the bit is inside it */
  ahead: number
  confidence: number
  evidenceSummary: string | null
  stats: { value: string; label: string }[]
}

export interface SectionEvent {
  id: string
  wellId: string
  type: string
  title: string
  severity: HistoricalEvent['severity']
  /** depth on whichever axis this glyph hangs off */
  mdM: number
  /** km east of the active well, on the section's projection */
  eastKm: number
  /** true when the engine aligned this event onto the active bore rather than its own */
  aligned: boolean
  date: string
  cause: string
  action: string
  outcome: string
  nptHours: number
  documentId: string
  page: number | null
  confidence: number
}

export interface SectionBore {
  id: string
  active: boolean
  surfaceEastKm: number
  bottomEastKm: number
  tdMd: number
  status: string
  /** only the active well has one — the hole section the section header prints */
  holeSection: string | null
  risk: RiskLevel | null
  similarity: number | null
  distanceKm: number | null
  hasLossEvents: boolean
  spud: number | null
  lesson: string | null
  events: SectionEvent[]
}

export interface SectionModel {
  layers: SectionLayer[]
  risks: SectionRisk[]
  bores: SectionBore[]
  active: SectionBore | null
  /** the band the well is being drilled for — the reservoir, if the corridor gives us one */
  target: SectionLayer | null
  /** the API's own band boundaries, for the axis caption */
  bands: DemoBand[]
  barailTopMd: number
  bitMd: number
  shoeMd: number
  /**
   * Where the bore is being taken. Mid-target, so the drawn wellbore visibly stands inside the
   * reservoir rather than stopping at its top, and labelled as a plan wherever it is printed —
   * the bit is at `bitMd` and this is not a measurement.
   */
  planTdMd: number
  /** events found in the window whose well is not in scope, so the caption can be honest */
  droppedEvents: number
  /** aligned events sitting inside the top risk's window */
  cluster: SectionEvent[]
}

export interface DemoBand {
  name: string
  fromM: number
  toM: number
}

/**
 * The demo corridor's band boundaries, used until `/corridor` answers so the first paint is
 * already the right rock. These are the same numbers the API returns for this well.
 */
export const DEMO_BANDS: DemoBand[] = [
  { name: 'Girujan', fromM: 1856, toM: 2908 },
  { name: 'Tipam', fromM: 2908, toM: 3186 },
  { name: 'Barail', fromM: 3186, toM: 4456 },
]

/** The Barail top the API predicts ahead of the bit, before the corridor lands. */
export const DEMO_BARAIL_TOP_MD = 3186

/**
 * The rock between the ground and the first measured depth.
 *
 * A section that stops at 2,700 m is a strip of colour with no ground on it, and the one band
 * the reader is standing on — the topsoil — is the band that tells them the picture is the earth
 * and not a chart. So the skin exists to carry the surface: five bands, each a real shallow
 * sequence in its own hue, drawn in a third of the frame with the break line under them saying
 * that the depth scale up there is compressed.
 *
 * `share` is the fraction of the compressed band a unit is *drawn* in, which is deliberately not
 * its share of the depth: true to scale, 530 m of shale would be a fifth of the picture and the
 * topsoil would not be visible. The depths are real and the tooltip prints them, so nothing here
 * is a claim about the rock — only about how much room it was given.
 */
interface SkinUnit {
  short: string
  name: string
  topM: number
  baseM: number
  lithology: Lithology
  fill: string
  share: number
  label: boolean
  note: string
}

const SKIN: SkinUnit[] = [
  {
    short: 'TOPSOIL',
    name: 'Topsoil',
    topM: 0,
    baseM: 7,
    lithology: 'topsoil',
    fill: 'var(--nw-strata-topsoil)',
    share: 0.13,
    label: true,
    note: 'Humic topsoil and root zone over the terrace.',
  },
  {
    short: 'SOIL',
    name: 'Shallow soil',
    topM: 7,
    baseM: 48,
    lithology: 'soil',
    fill: 'var(--nw-strata-soil)',
    share: 0.19,
    label: true,
    note: 'Silty clay loam, ferruginous, the weathered cover.',
  },
  {
    short: 'SAND',
    name: 'Sand',
    topM: 48,
    baseM: 170,
    lithology: 'sand',
    fill: 'var(--nw-strata-sand)',
    share: 0.2,
    label: true,
    note: 'Unconsolidated fluvial sand, the fresh-water aquifer.',
  },
  {
    short: 'SANDSTONE',
    name: 'Sandstone',
    topM: 170,
    baseM: 700,
    lithology: 'sandstone',
    fill: 'var(--nw-strata-sandstone)',
    share: 0.22,
    label: true,
    note: 'Ferruginous sandstone and ferricrete, the hard pan.',
  },
  {
    short: 'SHALE',
    name: 'Shale',
    topM: 700,
    baseM: 2700,
    lithology: 'shale',
    fill: 'var(--nw-strata-shale)',
    share: 0.26,
    label: true,
    note: 'Compact shale and claystone: the long shallow seal.',
  },
]

/**
 * The intervals inside a band that the API does not break out.
 *
 * `aboveTop` is metres below the band's own top, and each part runs to the next part's edge, so
 * a part added here splits the band rather than appending to it. The Barail parts are the ones
 * the risk engine already reports windows against, and the reservoir part is the one the well is
 * being drilled for, so the reading of where the sand and the pay sit is the engine's own and not
 * an invention. The Tipam sandstone is flagged interpreted like the rest: the API returns the band,
 * not the water in it. The band is called sandstone on the diagram even though its role in the
 * argument is the water it carries, because a label that names the hazard instead of the rock is
 * not a name — the loss zone it is, is said in the note and on the event marker.
 */
interface BandPart {
  name: string
  short: string
  aboveTop: number
  lithology: Lithology
  fill: string
  interpreted: boolean
  label?: boolean
  target?: boolean
  note: string
}

const BAND_PARTS: Record<string, BandPart[]> = {
  Girujan: [
    {
      name: 'Girujan',
      short: 'GIRUJAN',
      aboveTop: 208,
      lithology: 'delta',
      fill: 'var(--nw-strata-girujan)',
      interpreted: false,
      note: 'Upper deltaic sand and clay, the base of the section’s first sand.',
    },
  ],
  Tipam: [
    {
      name: 'Tipam clay',
      short: 'TIPAM CLAY',
      aboveTop: 172,
      lithology: 'clay',
      fill: 'var(--nw-strata-tipam)',
      interpreted: false,
      note: 'Ferruginous clay, grey-blue, the interval the bit is in now.',
    },
    {
      name: 'Tipam sandstone',
      short: 'TIPAM SANDSTONE',
      aboveTop: Infinity,
      lithology: 'water',
      fill: 'var(--nw-strata-aquifer)',
      interpreted: true,
      label: true,
      note: 'Water-bearing sand at the base of the Tipam: a loss zone, and a drilling hazard.',
    },
  ],
  Barail: [
    {
      name: 'Barail sandstone',
      short: 'BARAIL SAND',
      aboveTop: 234,
      lithology: 'sandstone',
      fill: 'var(--nw-strata-barail)',
      interpreted: true,
      note: 'Barail sandstone — the loss-prone sand the engine watches the bit entering.',
    },
    {
      name: 'Barail reservoir',
      short: 'TARGET RESERVOIR',
      aboveTop: 414,
      lithology: 'reservoir',
      fill: 'var(--nw-strata-reservoir)',
      interpreted: true,
      label: true,
      target: true,
      note: 'Porous sand, oil-bearing. The interval this well is being drilled for.',
    },
    {
      name: 'Deep formation',
      short: 'DEEP FORMATION',
      aboveTop: Infinity,
      lithology: 'basement',
      fill: 'var(--nw-strata-basement)',
      interpreted: true,
      label: true,
      note: 'Crystalline basement: the impermeable floor, and the end of the section.',
    },
  ],
}

/** The band boundaries, preferring the corridor's own columns and falling back to the demo's. */
export function sectionBands(corridor: Corridor | undefined): DemoBand[] {
  const active = corridor?.columns?.[0]?.bands
  if (!active?.length) return DEMO_BANDS
  return active.map((b) => ({ name: b.name, fromM: b.fromM, toM: b.toM }))
}

/**
 * The compressed band between the ground line and the break, as layers.
 *
 * `share` is honoured by `SectionView`, not here: a skin layer carries its ordinal and the count,
 * and the projection divides the band. The last unit is clipped to the top of the true axis so the
 * skin and the strata meet at one contact rather than leaving a gap between them.
 */
function buildSkin(): SectionLayer[] {
  const units = SKIN.filter((u) => u.topM < SECTION_TOP_MD)
  let seed = 1
  return units.map((u, i) => ({
    key: `skin-${u.lithology}`,
    short: u.short,
    name: u.name,
    formation: 'Surface section',
    fromMd: u.topM,
    toMd: Math.min(u.baseM, SECTION_TOP_MD),
    interpreted: true,
    lithology: u.lithology,
    fill: u.fill,
    seed: seed++,
    label: u.label,
    target: false,
    note: u.note,
    role: 'skin' as const,
    bandIndex: i,
    bandCount: units.length,
  }))
}

/** The API's own bands, clipped to the window and opened up into the parts above. */
function buildStrata(bands: DemoBand[], barailTopMd: number): SectionLayer[] {
  const layers: SectionLayer[] = []
  let seed = 20
  for (const band of bands) {
    const bandTop = Math.max(band.fromM, SECTION_TOP_MD)
    const to = Math.min(band.toM, SECTION_BOTTOM_MD)
    if (to <= bandTop) continue

    /** the Barail starts at the top the engine predicts ahead of the bit, not at its own top */
    const start = band.name === 'Barail' ? Math.max(bandTop, barailTopMd) : bandTop
    const parts = BAND_PARTS[band.name]
    const bare = { short: band.name.toUpperCase(), note: `${band.name}, undivided.`, target: false, label: false, interpreted: false }

    let cursor = start
    for (const part of parts ?? []) {
      const end = Math.min(to, start + part.aboveTop)
      if (end <= cursor) continue
      layers.push({
        key: `${band.name}-${part.lithology}`,
        short: part.short,
        name: part.name,
        formation: band.name,
        fromMd: cursor,
        toMd: end,
        interpreted: part.interpreted,
        lithology: part.lithology,
        fill: part.fill,
        seed: seed++,
        label: part.label ?? false,
        target: part.target ?? false,
        note: part.note,
        role: 'strata',
        bandIndex: 0,
        bandCount: 1,
      })
      cursor = end
      if (cursor >= to) break
    }

    /** whatever is left below the last part is the band's own body, undivided */
    if (cursor < to) {
      layers.push({
        key: band.name,
        short: bare.short,
        name: band.name,
        formation: band.name,
        fromMd: cursor,
        toMd: to,
        interpreted: false,
        lithology: 'clay',
        fill: 'var(--nw-strata-bulk)',
        seed: seed++,
        label: false,
        target: false,
        note: bare.note,
        role: 'strata',
        bandIndex: 0,
        bandCount: 1,
      })
    }
  }
  return layers
}

/** The whole section: the skin the machine stands on, then the rock the bit is in. */
export function buildGeology(bands: DemoBand[], barailTopMd: number): SectionLayer[] {
  return [...buildSkin(), ...buildStrata(bands, barailTopMd)]
}

export function buildRisks(risks: RiskSummary[] | undefined, bitMd: number): SectionRisk[] {
  if (!risks?.length) return []
  return risks
    .filter((r) => r.windowMdM[1] > SECTION_TOP_MD && r.windowMdM[0] < SECTION_BOTTOM_MD)
    .map((r) => ({
      riskId: r.id,
      name: r.name,
      level: r.level,
      status: r.status,
      probability: r.probability,
      fromMd: Math.max(r.windowMdM[0], SECTION_TOP_MD),
      toMd: Math.min(r.windowMdM[1], SECTION_BOTTOM_MD),
      ahead: Math.round(r.windowMdM[0] - bitMd),
      confidence: r.confidence,
      evidenceSummary: r.evidenceSummary ?? null,
      stats: r.stats ?? [],
    }))
    .sort((a, b) => a.fromMd - b.fromMd)
}

/** The active bore, from the well's own survey: straight down from the wellhead, leaning east. */
export function buildActiveBore(well: ActiveWell | undefined): SectionBore | null {
  if (!well) return null
  return {
    id: well.id,
    active: true,
    surfaceEastKm: well.surfaceKm[0],
    bottomEastKm: well.bitKm[0],
    tdMd: well.bit.mdM,
    status: well.status,
    holeSection: well.holeSection ?? null,
    risk: null,
    similarity: null,
    distanceKm: 0,
    hasLossEvents: false,
    spud: null,
    lesson: null,
    events: [],
  }
}

export function buildOffsetBore(w: OffsetWell): SectionBore {
  return {
    id: w.id,
    active: false,
    surfaceEastKm: w.surfaceKm[0],
    bottomEastKm: w.bitDepthKm[0],
    tdMd: w.tdMdM,
    status: w.status,
    holeSection: null,
    risk: w.risk,
    similarity: w.similarity,
    distanceKm: w.distanceAtBitKm,
    hasLossEvents: w.hasLossEvents,
    spud: w.spud,
    lesson: w.lesson ?? null,
    events: [],
  }
}

/**
 * Events, placed twice where the engine aligned them.
 *
 * An event that carries `alignedMdOnActiveM` happened in a different well at a different depth,
 * and the engine's own alignment is what puts it on this well's axis — so it is drawn on the
 * active bore at the aligned depth and on its own bore at its real one. Events outside the
 * cutaway's window, or in wells the reader has filtered out, are counted rather than invented.
 */
export function placeEvents(events: HistoricalEvent[], bores: SectionBore[]): number {
  const byWell = new Map(bores.map((b) => [b.id, b]))
  const active = bores.find((b) => b.active)
  let dropped = 0

  for (const e of events) {
    const bore = byWell.get(e.wellId)
    const aligned = e.alignedMdOnActiveM != null && e.alignedMdOnActiveM > SECTION_TOP_MD && e.alignedMdOnActiveM < SECTION_BOTTOM_MD
    const own = bore != null && e.mdM > SECTION_TOP_MD && e.mdM < SECTION_BOTTOM_MD
    if (!aligned && !own) {
      dropped++
      continue
    }

    const base = {
      id: e.id,
      wellId: e.wellId,
      type: e.type,
      title: e.title,
      severity: e.severity,
      date: e.date,
      cause: e.cause,
      action: e.action,
      outcome: e.outcome,
      nptHours: e.nptHours,
      documentId: e.source.documentId,
      page: e.source.page,
      confidence: e.extractionConfidence,
    }

    if (own && bore) {
      bore.events.push({
        ...base,
        mdM: e.mdM,
        eastKm: bore.surfaceEastKm,
        aligned: false,
      })
    }
    if (aligned && active) {
      active.events.push({
        ...base,
        mdM: e.alignedMdOnActiveM as number,
        eastKm: active.surfaceEastKm,
        aligned: true,
      })
    }
  }

  for (const b of bores) b.events.sort((a, z) => a.mdM - z.mdM)
  return dropped
}

/** The whole section, assembled from what the API has answered so far. */
export function buildSectionModel(input: {
  well: ActiveWell | undefined
  corridor: Corridor | undefined
  risks: RiskSummary[] | undefined
  offsets: OffsetWell[]
  events: HistoricalEvent[]
}): SectionModel {
  const bands = sectionBands(input.corridor)
  const barailTopMd = input.well?.nextFormation.topMdM ?? DEMO_BARAIL_TOP_MD
  const bitMd = input.well?.bit.mdM ?? DEMO_BARAIL_TOP_MD - 62

  const active = buildActiveBore(input.well)
  const bores = [...(active ? [active] : []), ...input.offsets.map(buildOffsetBore)]
  const dropped = placeEvents(input.events, bores)

  const risks = buildRisks(input.risks, bitMd)
  const top = risks[0]
  const cluster = top
    ? (active?.events ?? []).filter((e) => e.aligned && e.mdM >= top.fromMd - 20 && e.mdM <= top.toMd + 20)
    : []

  const layers = buildGeology(bands, barailTopMd)
  const target = layers.find((l) => l.target) ?? null

  return {
    layers,
    risks,
    bores,
    active: active ?? null,
    target,
    bands,
    barailTopMd,
    bitMd,
    shoeMd: input.well?.casing.shoe9_5_8inMdM ?? bitMd - 74,
    planTdMd: target ? Math.round((target.fromMd + target.toMd) / 2) : bitMd,
    droppedEvents: dropped,
    cluster,
  }
}
