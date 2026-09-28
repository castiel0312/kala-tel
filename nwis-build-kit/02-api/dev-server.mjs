/**
 * NWIS development API.
 *
 * There is no backend implementation in this repository: `02-api` holds only `openapi.yaml`
 * and `demo-data.json`. The frontend proxies `/api` to http://localhost:8000 (see
 * `05-frontend/vite.config.ts`), so with nothing listening every request came back 500 and every
 * panel in the experience rendered empty. This serves the contract in `openapi.yaml` out of
 * `demo-data.json` so the frontend has something real to talk to while the API is being written.
 *
 * It is a development stand-in, not the product. Reads are filtered and shaped from the fixture;
 * writes (ack, confirm, upload) are accepted and acknowledged but not persisted, so a reload
 * restores the fixture.
 *
 *   node dev-server.mjs            # listens on 8000
 *   PORT=9000 node dev-server.mjs
 *
 * Zero dependencies: node:http only.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = JSON.parse(readFileSync(join(HERE, 'demo-data.json'), 'utf8'))
const PORT = Number(process.env.PORT || 8000)
const WELL = DATA.activeWell.id

/* A missing query param arrives as null, and Number(null) is 0 rather than NaN, so null has to
 * be treated as absent explicitly. Otherwise /offsets with no radius_km defaulted to a 0 km
 * radius and returned no wells at all. */
const num = (v, d) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v))
const byCount = (rows, field) => rows.reduce((acc, r) => ((acc[r[field]] = (acc[r[field]] || 0) + 1), acc), {})
const distanceKm = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** The event list for one well, in the shape the offset detail and corridor both read. */
const eventsFor = (wellId) => DATA.events.filter((e) => e.wellId === wellId)

/**
 * The corridor is the one response with no fixture behind it, so it is derived: one column per
 * offset, banded by that offset's own formation tops, carrying its own events. The section
 * flatMaps `columns[].events`, so a column without an events array is what was crashing it.
 */
function corridor(align) {
  const lookAheadM = 250
  const tops = DATA.activeWell.formationTopsTvdssM || {}
  const bitM = num(DATA.activeWell.bit?.depthMdM, 3000)
  const columns = DATA.offsetWells.map((w) => {
    const wBarail = w.barailTopTvdssM
    const wTipam = w.tipamTopTvdssM
    const shiftM = wBarail && tops.Barail ? Math.round(wBarail - tops.Barail) : 0
    return {
      wellId: w.id,
      distanceKm: Number(distanceKm(w.surfaceKm, DATA.activeWell.surfaceKm).toFixed(2)),
      shiftM,
      bands: [
        { name: 'Tipam', fromM: 0, toM: wTipam ?? 0 },
        { name: 'Barail', fromM: wTipam ?? 0, toM: wBarail ?? 0 },
        { name: 'Below Barail', fromM: wBarail ?? 0, toM: w.tdMdM ?? 0 },
      ].filter((b) => b.toM > b.fromM),
      events: eventsFor(w.id).map((e) => ({
        eventId: e.id,
        depthM: e.mdM,
        inLookAhead: Math.abs((e.mdM ?? 0) - bitM) <= lookAheadM,
        type: e.type,
        severity: e.severity,
        label: e.title,
      })),
    }
  })
  return {
    align: align || 'formation',
    axis: { topM: Math.max(0, bitM - 600), spanM: 1200, unit: 'TVDSS' },
    bit: { depthM: bitM, lookAheadM },
    predictedTop: tops.Barail
      ? { name: 'Barail', depthM: tops.Barail, uncertaintyM: 12 }
      : undefined,
    caption: `${columns.length} offsets aligned on formation, against the active bit.`,
    columns,
  }
}

/** Risk response needs counts by level and the next zone ahead, both derived. */
function risks(level) {
  const rows = level ? DATA.risks.filter((r) => r.level === level) : DATA.risks
  return {
    counts: byCount(DATA.risks, 'level'),
    nextZone: {
      riskId: rows[0]?.id ?? '',
      text: rows[0]?.recommendation ?? rows[0]?.name ?? 'No zone ahead.',
      metresAhead: 250,
    },
    risks: rows,
  }
}

function events(q) {
  let rows = DATA.events
  if (q.get('type')) rows = rows.filter((e) => e.type === q.get('type'))
  if (q.get('well')) rows = rows.filter((e) => e.wellId === q.get('well'))
  if (q.get('formation')) rows = rows.filter((e) => e.formation === q.get('formation'))
  if (q.get('severity')) rows = rows.filter((e) => e.severity === q.get('severity'))
  const search = (q.get('q') || '').toLowerCase()
  if (search) {
    rows = rows.filter((e) => `${e.title} ${e.cause ?? ''} ${e.wellId}`.toLowerCase().includes(search))
  }
  return {
    count: rows.length,
    events: rows,
    presets: [],
    facets: {
      wells: Object.entries(byCount(DATA.events, 'wellId')).map(([id, count]) => ({ id, count })),
      types: Object.entries(byCount(DATA.events, 'type')).map(([type, count]) => ({ type, count })),
      formations: Object.entries(byCount(DATA.events, 'formation')).map(([name, count]) => ({ name, count })),
    },
  }
}

function offsets(q) {
  const radiusKm = num(q.get('radius_km'), 10)
  let rows = DATA.offsetWells.filter(
    (w) => distanceKm(w.surfaceKm, DATA.activeWell.surfaceKm) <= radiusKm,
  )
  if (q.get('has_loss_events') === 'true') rows = rows.filter((w) => w.hasLossEvents)
  const minSim = num(q.get('min_similarity'), null)
  if (minSim !== null) rows = rows.filter((w) => (w.similarity ?? 0) >= minSim)
  if (q.get('sort') === 'distance') {
    rows = rows.sort(
      (a, b) => distanceKm(a.surfaceKm, DATA.activeWell.surfaceKm) - distanceKm(b.surfaceKm, DATA.activeWell.surfaceKm),
    )
  }
  return {
    radiusKm,
    count: rows.length,
    relevantCount: rows.filter((w) => w.relevant !== false).length,
    wells: rows,
  }
}

const send = (res, body, status = 200) => {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(payload)
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, {})
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const p = url.pathname
  const q = url.searchParams
  const well = p.match(/^\/api\/v1\/wells\/([^/]+)/)?.[1] ?? WELL

  if (p === '/api/v1/health') return send(res, { status: 'ok' })
  if (p === '/api/v1/landing') return send(res, DATA.landing)
  if (p === '/api/v1/wells/active') return send(res, DATA.activeWell)

  if (p === `/api/v1/wells/${well}/dashboard`) {
    return send(res, {
      activeWell: DATA.activeWell,
      live: DATA.live,
      topRisk: DATA.dashboard.topRisk,
      mapWells: DATA.offsetWells,
      summary: DATA.dashboard.summary,
    })
  }
  if (p === `/api/v1/wells/${well}/live`) return send(res, DATA.live)
  if (p === `/api/v1/wells/${well}/offsets`) return send(res, offsets(q))

  const offsetId = p.match(/^\/api\/v1\/wells\/[^/]+\/offsets\/([^/]+)$/)?.[1]
  if (offsetId) {
    const w = DATA.offsetWells.find((o) => o.id === offsetId)
    if (!w) return send(res, { detail: `no offset ${offsetId}` }, 404)
    return send(res, { ...w, events: eventsFor(offsetId), profile: undefined })
  }

  if (p === `/api/v1/wells/${well}/corridor`) return send(res, corridor(q.get('align')))

  if (p.match(/^\/api\/v1\/wells\/[^/]+\/compare\/[^/]+$/)) {
    const target = p.split('/').pop()
    const w = DATA.offsetWells.find((o) => o.id === target)
    if (!w) return send(res, { detail: `no offset ${target}` }, 404)
    return send(res, {
      offset: w,
      rows: [
        { label: 'Similarity', active: 100, offset: w.similarity ?? 0, unit: '%' },
        { label: 'Total depth', active: DATA.activeWell.design?.tdMdM ?? 0, offset: w.tdMdM ?? 0, unit: 'm' },
        { label: 'Barail top', active: topsOf('Barail'), offset: w.barailTopTvdssM ?? 0, unit: 'm' },
      ],
    })
  }

  if (p === `/api/v1/wells/${well}/risks`) return send(res, risks(q.get('level')))
  const riskId = p.match(/^\/api\/v1\/wells\/[^/]+\/risks\/([^/]+)$/)?.[1]
  if (riskId) {
    const r = DATA.risks.find((x) => x.id === riskId)
    return r ? send(res, r) : send(res, { detail: `no risk ${riskId}` }, 404)
  }

  if (p === `/api/v1/wells/${well}/alerts`) {
    const rows = q.get('status') === 'open' ? DATA.alerts.filter((a) => !a.acknowledged) : DATA.alerts
    return send(res, {
      counts: {
        all: DATA.alerts.length,
        open: DATA.alerts.filter((a) => !a.acknowledged).length,
        acknowledged: DATA.alerts.filter((a) => a.acknowledged).length,
      },
      alerts: rows,
    })
  }
  if (p.match(/^\/api\/v1\/alerts\/[^/]+\/ack$/)) {
    const id = p.split('/')[4]
    const a = DATA.alerts.find((x) => x.id === id)
    if (!a) return send(res, { detail: `no alert ${id}` }, 404)
    a.acknowledged = req.method !== 'DELETE'
    return send(res, req.method === 'DELETE' ? { ok: true } : a)
  }

  if (p === '/api/v1/events') return send(res, events(q))
  const eventId = p.match(/^\/api\/v1\/events\/([^/]+)$/)?.[1]
  if (eventId) {
    const e = DATA.events.find((x) => x.id === eventId)
    if (!e) return send(res, { detail: `no event ${eventId}` }, 404)
    return send(res, { ...e, related: DATA.events.filter((o) => o.cause && o.cause === e.cause && o.id !== e.id) })
  }

  if (p === '/api/v1/graph/neighbourhood') {
    return send(res, { ...DATA.graph, center: q.get('node') || DATA.graph.center, hops: num(q.get('hops'), DATA.graph.hops) })
  }

  if (p === '/api/v1/documents') {
    if (req.method === 'POST') {
      return send(res, {
        id: 'JOB-UPLOAD',
        documentId: 'UPLOADED',
        description: 'Upload queued (dev server does not persist).',
        stages: { ocr: 0, nlp: 0, graph: 0 },
        state: 'queued',
      })
    }
    let docs = DATA.documents
    if (q.get('type')) docs = docs.filter((d) => d.type === q.get('type'))
    if (q.get('q')) docs = docs.filter((d) => d.id.toLowerCase().includes(String(q.get('q')).toLowerCase()))
    return send(res, { totals: DATA.libraryTotals, documents: docs })
  }
  if (p === '/api/v1/jobs') return send(res, DATA.processingJobs)

  const extract = p.match(/^\/api\/v1\/documents\/([^/]+)\/pages\/(\d+)\/extraction$/)
  if (extract) return send(res, { ...DATA.extraction, documentId: extract[1], page: Number(extract[2]) })

  if (p.match(/^\/api\/v1\/extractions\/fields\/[^/]+(\/confirm)?$/)) {
    return send(res, { field: { id: 'FIELD', value: '', confirmed: true, source: 'dev-server' } })
  }

  if (p === '/api/v1/analytics/summary') return send(res, DATA.analytics)
  if (p === '/api/v1/assistant/suggestions') return send(res, DATA.assistant)
  if (p === '/api/v1/assistant/ask') {
    return send(res, {
      answer: 'The dev API has no model behind it. Ask the Groq-backed planner in section 13 instead.',
      citations: [],
      confidence: 0,
    })
  }

  if (p === '/api/v1/rig/checklist') return send(res, DATA.rigMobileChecklist)
  if (p === '/api/v1/demo/reset') return send(res, { reset: true })

  return send(res, { detail: `no route for ${req.method} ${p}` }, 404)
})

function topsOf(name) {
  return DATA.activeWell.formationTopsTvdssM?.[name] ?? 0
}

server.listen(PORT, () => {
  console.log(`NWIS dev API on http://localhost:${PORT}`)
  console.log(`  active well ${WELL}, ${DATA.offsetWells.length} offsets, ${DATA.events.length} events`)
  console.log('  serving 02-api/demo-data.json; writes are not persisted')
})
