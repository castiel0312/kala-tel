/**
 * The section registry. One list, used for the navigation rail, the scroll spy, the
 * progress rail and the footer, so a section can never appear in one and miss another.
 */
export interface SectionDef {
  id: string
  no: string
  nav: string
  eyebrow: string
  title: string
  lede: string
  tone: 'paper' | 'white' | 'black'
}

/** Keyed by id so a section file can write `SEC.risk` instead of counting array slots. */
const DEFS = {
  overview: {
    id: 'overview',
    no: '01',
    nav: 'Overview',
    eyebrow: 'NWIS · Neighbourhood Well Intelligence System',
    title: 'Nearby wells. Institutional memory. Real-time intelligence.',
    lede: 'One continuous operational picture of a live well, stitched from 128 indexed well reports and every well within 10 km.',
    tone: 'paper',
  },
  live: {
    id: 'live',
    no: '02',
    nav: 'Live',
    eyebrow: 'Live drilling snapshot',
    title: 'Live drilling snapshot',
    lede: 'The active well, exactly as the rig reports it. One WebSocket, one source of truth.',
    tone: 'white',
  },
  map: {
    id: 'map',
    no: '03',
    nav: '3D Map',
    eyebrow: 'Mapbox 3D operational map',
    title: 'The wellfield, in three dimensions',
    lede: 'Satellite terrain with every well in range: the rig on OIL-WELL-104, the wells around it, their paths at bit depth and the risk ahead.',
    tone: 'black',
  },
  wells: {
    id: 'wells',
    no: '04',
    nav: 'Wells',
    eyebrow: 'Nearby well intelligence',
    title: 'What happened nearby?',
    lede: 'Ranked by stratigraphic, trajectory and mud-system similarity — not by distance alone.',
    tone: 'paper',
  },
  corridor: {
    id: 'corridor',
    no: '05',
    nav: 'Corridor',
    eyebrow: 'Active well depth corridor',
    title: 'Depth corridor: the rock, and what the neighbours found in it',
    lede: 'The active borehole beside the offset bores, formation-aligned, with every event they logged at this depth.',
    tone: 'white',
  },
  risk: {
    id: 'risk',
    no: '06',
    nav: 'Risk',
    eyebrow: 'Predictive risk engine',
    title: 'Predictive risk, with the reasoning attached',
    lede: 'Probability from offset history and live likelihood, shown with the evidence and the calibration behind it.',
    tone: 'paper',
  },
  alerts: {
    id: 'alerts',
    no: '07',
    nav: 'Alerts',
    eyebrow: 'Live alerts',
    title: 'Live alerts and operational alarms',
    lede: 'Only what needs a decision. The queue and the acknowledged history stay one click away.',
    tone: 'white',
  },
  memory: {
    id: 'memory',
    no: '08',
    nav: 'Memory',
    eyebrow: 'Knowledge repository',
    title: 'Search the drilling memory',
    lede: '4,812 extracted events, every one traceable to a document, a page and a confidence.',
    tone: 'paper',
  },
  graph: {
    id: 'graph',
    no: '09',
    nav: 'Graph',
    eyebrow: 'Knowledge graph',
    title: 'What is connected to what',
    lede: 'Wells, formations, events, causes, mitigations and documents — and the path the reasoning took.',
    tone: 'black',
  },
  documents: {
    id: 'documents',
    no: '10',
    nav: 'Documents',
    eyebrow: 'Document intelligence',
    title: 'Document intelligence and verification',
    lede: 'Scanned report in, structured field out, with the confidence on every value and a human in the loop.',
    tone: 'paper',
  },
  analytics: {
    id: 'analytics',
    no: '11',
    nav: 'Analytics',
    eyebrow: 'Historical analytics',
    title: 'What the field has always done',
    lede: '27 years and 24 wells within 10 km, aggregated honestly — with the scope stated on the panel.',
    tone: 'white',
  },
  assistant: {
    id: 'assistant',
    no: '12',
    nav: 'Ask',
    eyebrow: 'NWIS intelligence assistant',
    title: 'Ask NWIS',
    lede: 'Answers from the indexed records, with sources and confidence. It will not guess.',
    tone: 'black',
  },
  potential: {
    id: 'potential',
    no: '13',
    nav: 'Potential',
    eyebrow: 'Potential / future well planner',
    title: 'Where should the next well go?',
    lede: 'Candidate locations proposed from the measured wellfield, then checked by NWIS against the radius, the spacing rules and the depth the offsets actually reached — with the reasoning and the distances attached.',
    tone: 'paper',
  },
} satisfies Record<string, SectionDef>

/** Every section, in reading order. One list for the nav, the scroll spy and the footer. */
export const SECTIONS: readonly SectionDef[] = Object.values(DEFS)

/** A single section by id. */
export const SEC = DEFS

export const SECTION_IDS = SECTIONS.map((s) => s.id)
/** The numbered sections the navigation rail offers; the hero is section 01 but reads as the top. */
export const NAV_SECTIONS = SECTIONS
