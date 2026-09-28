import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useActiveWell } from '../hooks/useActiveWell'
import { useLive } from '../hooks/useLive'
import { NAV_ITEMS, type NavItem } from '../lib/nav'
import { fmtInt } from '../lib/format'
import { Icon } from '../components/kit/icons'
import { LiveIndicator, ProvenanceTag, StatusChip } from '../components/kit'
import { OilfieldScene } from '../components/landing/OilfieldScene'
import s from './Landing.module.css'

/* ============================================================================
   Landing.

   The claim this page has to make in three seconds: this is an oil and gas
   intelligence system. So the top of the page is a subsurface section with a
   live drilling operation on it, not a headline and a button.

   Every number below is read from /api/v1. The whole dataset is demo data and
   says so, repeatedly, because a drilling platform that hides where its
   numbers come from is worthless.
   ========================================================================== */

const SCREEN_PURPOSE: Record<string, string> = {
  command: 'Live well state, top risk, what to do next',
  nearby: 'Offsets by distance, similarity and risk',
  active: 'Depth corridor, formation tops, parameters',
  compare: 'Active against offset, parameter by parameter',
  risk: 'Risk ahead, composition, evidence, mitigation',
  alerts: 'Real-time feed with acknowledge',
  knowledge: 'What happened at this depth before',
  graph: 'Wells, events, documents as one graph',
  documents: 'WCR, DDR and report index',
  docintel: 'Page image with the extracted fields',
  analytics: 'ROP, ECD and loss frequency over time',
  assistant: 'Ask a question, get evidence back',
  rig: 'Field layout for the handset',
}

export function Landing() {
  const { data: well } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'
  const live = useLive(well?.id, Boolean(well?.id))

  const [landingQ, dashQ, offsetsQ, risksQ, alertsQ, eventsQ, docsQ] = useQueries({
    queries: [
      { queryKey: qk.landing, queryFn: api.landing, staleTime: 300_000 },
      { queryKey: qk.dashboard(wellId), queryFn: () => api.dashboard(wellId), staleTime: 20_000 },
      { queryKey: qk.offsets(wellId, {}), queryFn: () => api.offsets(wellId), staleTime: 60_000 },
      { queryKey: qk.risks(wellId), queryFn: () => api.risks(wellId), staleTime: 30_000 },
      { queryKey: qk.alerts(wellId, 'open'), queryFn: () => api.alerts(wellId, 'open'), staleTime: 10_000 },
      { queryKey: qk.events({}), queryFn: () => api.events(), staleTime: 60_000 },
      { queryKey: qk.documents(undefined, undefined), queryFn: () => api.documents(), staleTime: 300_000 },
    ],
  })

  const primary = live.lastFrame?.primary ?? []
  const more = live.lastFrame?.more ?? []
  const all = useMemo(() => {
    const byKey = new Map<string, { label: string; value: number; unit: string; note?: string; status?: string }>()
    for (const m of [...primary, ...more]) byKey.set(m.key, m)
    return byKey
  }, [primary, more])

  const counters = useMemo(() => {
    const stats = new Map((landingQ.data?.stats ?? []).map((s) => [s.label, s.value]))
    const offsets = offsetsQ.data?.wells ?? []
    const risks = risksQ.data?.risks ?? []
    const events = eventsQ.data?.events ?? []
    const docs = docsQ.data?.documents ?? []
    const summary = dashQ.data?.summary
    return [
      { k: 'Wells indexed', v: stats.get('wells indexed') ?? '—', n: 'historical + active', tone: '' },
      { k: 'Live drilling', v: well?.status === 'DRILLING' ? '01' : '00', n: well ? `${well.id} · ${well.rigState}` : '', tone: 'signal' },
      { k: 'Offset wells in scope', v: fmtInt(offsets.length), n: 'within 5 km of the active well', tone: '' },
      { k: 'Open alerts', v: fmtInt(alertsQ.data?.alerts.filter((a) => !a.acknowledged).length ?? 0), n: 'unacknowledged, real time', tone: 'danger' },
      { k: 'Risk zones ahead', v: fmtInt(summary?.riskZonesAhead.total ?? 0), n: `${summary?.riskZonesAhead.high ?? 0} high · ${summary?.riskZonesAhead.medium ?? 0} medium`, tone: 'danger' },
      { k: 'Events extracted', v: stats.get('events extracted') ?? '—', n: `${fmtInt(events.length)} in the demo index`, tone: '' },
      { k: 'Loss events', v: fmtInt(events.filter((e) => e.type === 'LOSS').length), n: 'historical, by well', tone: '' },
      { k: 'High-risk offsets', v: fmtInt(risks.filter((r) => r.level === 'HIGH').length), n: 'offsets with a HIGH band', tone: 'danger' },
      { k: 'Documents indexed', v: fmtInt(docs.length), n: 'WCR, DDR, reports', tone: '' },
    ]
  }, [landingQ.data, offsetsQ.data, risksQ.data, eventsQ.data, docsQ.data, alertsQ.data, dashQ.data, well])

  const facts = [
    { k: 'Active well', v: <b>{well?.id ?? '—'}</b> },
    { k: 'Bit depth', v: <>{fmtInt(well?.bit.mdM ?? 0)} m MD</> },
    { k: 'Formation', v: <>{well?.currentFormation ?? '—'}</> },
    { k: 'Next top', v: <>{well?.nextFormation?.name ?? '—'} · {well?.nextFormation?.distanceM ?? '—'} m</> },
  ]

  const liveCells = useMemo(
    () =>
      [
        { key: 'depth', signal: true },
        { key: 'rop' },
        { key: 'wob' },
        { key: 'torque' },
        { key: 'ecd' },
        { key: 'flowOut' },
        { key: 'mudWeight' },
        { key: 'pitVolume' },
      ]
        .map(({ key, signal }) => {
          const m = all.get(key)
          if (!m) return null
          return { ...m, signal: signal || m.status === 'WATCH' }
        })
        .filter(Boolean) as { key: string; label: string; value: number; unit: string; note?: string; status?: string; signal: boolean }[],
    [all],
  )

  const socketState = live.status === 'open' ? 'live' : live.status === 'connecting' ? 'warn' : 'off'

  return (
    <div className={s.page}>
      {/* ------------------------------------------------------------- nav */}
      <nav className={s.nav} aria-label="Landing">
        <Link to="/" className={s.navMark}>
          <span className={s.navGlyph} aria-hidden>
            N
          </span>
          <span>
            <span className={s.navName}>NWIS</span>
            <br />
            <span className={s.navSub}>National Well Intelligence System</span>
          </span>
        </Link>
        <div className={s.navLinks}>
          <Link className={s.navLink} to="/command">
            Command
          </Link>
          <Link className={s.navLink} to="/nearby">
            Nearby wells
          </Link>
          <Link className={s.navLink} to="/risk">
            Risk
          </Link>
          <Link className={s.navLink} to="/knowledge">
            Knowledge
          </Link>
          <Link className={s.navLink} to="/documents">
            Documents
          </Link>
        </div>
        <Link className={s.navCta} to="/command">
          Open command centre
          <Icon name="arrowRight" size={13} />
        </Link>
      </nav>

      {/* ------------------------------------------------------------ hero */}
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <div className={s.heroEyebrow}>
            <span style={{ width: 22, height: 3, background: 'var(--nw-yellow)' }} />
            Oil &amp; gas · drilling operations · subsurface
          </div>
          <h1 className={s.heroTitle}>
            National Well
            <br />
            <em>Intelligence</em>
            <br />
            System
          </h1>
          <div className={s.heroRule} />
          <p className={s.heroSub}>
            Real-time drilling intelligence, historical well knowledge, geospatial context and predictive risk —
            unified on one section, from the bit to the report it will be written into.
          </p>
          <div className={s.heroActions}>
            <Link className={`${s.heroBtn} ${s['heroBtn--primary']}`} to="/command">
              Enter command centre
              <Icon name="arrowRight" size={14} />
            </Link>
            <Link className={s.heroBtn} to="/nearby">
              <Icon name="cube3d" size={14} />
              3D well context
            </Link>
            <Link className={s.heroBtn} to="/risk">
              <Icon name="risk" size={14} />
              What is the risk?
            </Link>
          </div>
          <div className={s.heroFacts}>
            {facts.map((f) => (
              <div className={s.heroFact} key={f.k}>
                <div className={s.heroFact__k}>{f.k}</div>
                <div className={s.heroFact__v}>{f.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.heroStage}>
          <div className={s.heroBadge}>
            <span className={`${s.heroTag} ${s['heroTag--signal']}`}>
              <LiveIndicator state={socketState} onBlack label={socketState === 'live' ? 'eRTMAC live' : socketState === 'warn' ? 'linking' : 'offline'} />
            </span>
            <span className={s.heroTag}>Mapbox GL · deck.gl · 3D trajectories</span>
            <span className={s.heroTag}>Schematic section · demo data</span>
          </div>
          <div className={s.heroStageInner}>
            <OilfieldScene />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- live telemetry */}
      <section className={s.liveBand} aria-label="Live drilling parameters">
        <div className={s.liveBandHead}>
          <span className={s.liveBandTitle}>Live drilling · {well?.id ?? '—'}</span>
          <StatusChip status={well?.status} />
          <div className={s.liveBandMeta}>
            <span>{live.lastFrame?.source ?? 'eRTMAC (WITSML)'}</span>
            <span>·</span>
            <span>{live.lastFrame?.latencySeconds ?? 2} s</span>
            <ProvenanceTag kind={live.lastFrame ? 'LIVE' : 'DEMO'} label={live.lastFrame ? 'LIVE FEED' : 'DEMO'} />
          </div>
        </div>
        <div className={s.liveStrip}>
          {liveCells.map((c) => (
            <div
              key={c.key}
              className={[s.liveCell, c.signal && s['liveCell--signal'], c.status === 'WATCH' && s['liveCell--watch']]
                .filter(Boolean)
                .join(' ')}
            >
              <div className={s.liveCell__k}>{c.label}</div>
              <div className={s.liveCell__v}>
                {typeof c.value === 'number' && c.value % 1 !== 0 ? c.value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') : fmtInt(c.value)}
                <span className={s.liveCell__u}>{c.unit}</span>
              </div>
              <div className={s.liveCell__n}>{c.note ?? (c.status === 'WATCH' ? 'watch' : 'normal')}</div>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- counters */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <div>
            <div className={s.heroEyebrow} style={{ color: 'var(--nw-yellow)', marginBottom: 8 }}>
              <span style={{ width: 18, height: 3, background: 'var(--nw-yellow)' }} />
              The index
            </div>
            <h2 className={s.sectionTitle}>What the system holds</h2>
            <p className={s.sectionSub}>
              Counts read live from the NWIS API for the active well. Every figure below is demo data from the
              prototype dataset, not Oil India production data.
            </p>
          </div>
          <div className={s.sectionAside}>
            <ProvenanceTag kind="DEMO" label="DEMO DATA" />
          </div>
        </div>
        <div className={s.counters}>
          {counters.map((c) => (
            <div className={[s.counter, c.tone && s[`counter--${c.tone}`]].filter(Boolean).join(' ')} key={c.k}>
              <div className={s.counter__k}>{c.k}</div>
              <div className={s.counter__v}>{c.v}</div>
              <div className={s.counter__n}>{c.n}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ capabilities */}
      <section className={`${s.section} ${s['section--paper']}`}>
        <div className={s.sectionHead}>
          <div>
            <div className={s.heroEyebrow} style={{ color: 'var(--nw-yellow-deep)', marginBottom: 8 }}>
              <span style={{ width: 18, height: 3, background: 'var(--nw-yellow-deep)' }} />
              How it works
            </div>
            <h2 className={s.sectionTitle}>Three questions, answered on the surface</h2>
            <p className={s.sectionSub}>
              Where is the well and what is it drilling through. What is the risk and why. What happened here
              before, and what evidence says so.
            </p>
          </div>
        </div>
        <div className={s.caps}>
          <article className={s.cap}>
            <header className={s.capHead}>
              <span className={s.capHead__t}>Depth corridor</span>
              <span className={s.capHead__m}>3,061 m</span>
            </header>
            <div className={s.capStage}>
              <CorridorPreview />
            </div>
            <div className={s.capBody}>
              <ul className={s.capPoints}>
                <li className={s.capPoint}>Formations drawn as lithology, with the bit and the look-ahead window in view.</li>
                <li className={s.capPoint}>Every historical event sits at its real depth and opens its source report.</li>
                <li className={s.capPoint}>Offset wells alongside, aligned on formation rather than on clock.</li>
              </ul>
              <div className={s.capFoot}>
                <Link className={s.capLink} to="/active">
                  Active well <Icon name="arrowRight" size={12} />
                </Link>
              </div>
            </div>
          </article>

          <article className={s.cap}>
            <header className={s.capHead}>
              <span className={s.capHead__t}>Risk composition</span>
              <span className={s.capHead__m}>83% HIGH</span>
            </header>
            <div className={s.capStage}>
              <RiskPreview />
            </div>
            <div className={s.capBody}>
              <ul className={s.capPoints}>
                <li className={s.capPoint}>A risk is a window in depth plus the reason it is high, not a number alone.</li>
                <li className={s.capPoint}>Every component traces to a well, a depth and a page of a report.</li>
                <li className={s.capPoint}>Mitigations that worked on the offsets are shown before the ones that did not.</li>
              </ul>
              <div className={s.capFoot}>
                <Link className={s.capLink} to="/risk">
                  Risk centre <Icon name="arrowRight" size={12} />
                </Link>
              </div>
            </div>
          </article>

          <article className={s.cap}>
            <header className={s.capHead}>
              <span className={s.capHead__t}>Knowledge graph</span>
              <span className={s.capHead__m}>2 hops</span>
            </header>
            <div className={s.capStage}>
              <GraphPreview />
            </div>
            <div className={s.capBody}>
              <ul className={s.capPoints}>
                <li className={s.capPoint}>Wells, formations, events, causes, documents and mitigations in one graph.</li>
                <li className={s.capPoint}>Click a node to walk from a well to the paragraph that recorded the event.</li>
                <li className={s.capPoint}>The evidence path is explicit, so a conclusion can be checked end to end.</li>
              </ul>
              <div className={s.capFoot}>
                <Link className={s.capLink} to="/graph">
                  Open graph <Icon name="arrowRight" size={12} />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------- provenance */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <div>
            <div className={s.heroEyebrow} style={{ color: 'var(--nw-yellow)', marginBottom: 8 }}>
              <span style={{ width: 18, height: 3, background: 'var(--nw-yellow)' }} />
              Where the numbers come from
            </div>
            <h2 className={s.sectionTitle}>Provenance is part of the interface</h2>
            <p className={s.sectionSub}>
              A drilling decision is only as good as its evidence. Every value in NWIS carries a source class, and the
              prototype is explicit that none of it is live Oil India production data.
            </p>
          </div>
        </div>
        <div className={s.provGrid}>
          {[
            {
              k: 'LIVE OIL INDIA DATA',
              cls: 'live',
              b: 'eRTMAC / WITSML drilling feed once connected. Depth, ROP, WOB, torque, ECD, flow.',
            },
            {
              k: 'DEMO DATA',
              cls: 'demo',
              b: 'What this prototype shows. Internally consistent, invented, and labelled everywhere it appears.',
            },
            {
              k: 'PUBLIC DATASET',
              cls: 'public',
              b: 'Volve, FORCE 2020, Utah FORGE, BSEE, open drilling sets. Integration slots, not live feeds.',
            },
            {
              k: 'HISTORICAL DATA',
              cls: 'hist',
              b: 'WCR, DDR and completion reports already in the index, with page-level extraction.',
            },
            {
              k: 'SYNTHETIC DATA',
              cls: 'synth',
              b: 'Interpolated structure contours and derived trajectories between measured points.',
            },
          ].map((p) => (
            <div className={`${s.provCell} ${s[`provCell--${p.cls}`]}`} key={p.k}>
              <div className={s.provCell__k}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    background:
                      p.cls === 'live' ? 'var(--nw-green-on-black)' : p.cls === 'demo' ? 'var(--nw-yellow)' : p.cls === 'synth' ? '#a9bcc6' : 'var(--nw-ink-3)',
                  }}
                />
                {p.k}
              </div>
              <div className={s.provCell__b}>{p.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ index */}
      <section className={s.section} style={{ paddingBottom: 40 }}>
        <div className={s.sectionHead}>
          <div>
            <div className={s.heroEyebrow} style={{ color: 'var(--nw-yellow)', marginBottom: 8 }}>
              <span style={{ width: 18, height: 3, background: 'var(--nw-yellow)' }} />
              The platform
            </div>
            <h2 className={s.sectionTitle}>Thirteen working surfaces</h2>
          </div>
          <div className={s.sectionAside}>
            <Link className={s.navLink} to="/command" style={{ color: 'var(--nw-yellow)' }}>
              Start at the command centre →
            </Link>
          </div>
        </div>
        <div className={s.index}>
          {NAV_ITEMS.map((item: NavItem, i) => (
            <Link className={s.indexRow} to={item.to} key={item.key}>
              <span className={s.indexRow__n}>{String(i + 1).padStart(2, '0')}</span>
              <span className={s.indexRow__m}>
                <span className={s.indexRow__t}>{item.label}</span>
                <span className={s.indexRow__d}>{SCREEN_PURPOSE[item.key]}</span>
              </span>
              <Icon name="chevronRight" size={14} className={s.indexRow__i} />
            </Link>
          ))}
          <Link className={s.indexRow} to="/rig">
            <span className={s.indexRow__n}>14</span>
            <span className={s.indexRow__m}>
              <span className={s.indexRow__t}>Rig-site mobile</span>
              <span className={s.indexRow__d}>Field layout for the handset</span>
            </span>
            <Icon name="chevronRight" size={14} className={s.indexRow__i} />
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------- footer */}
      <footer className={s.foot}>
        <div style={{ height: 4, backgroundImage: 'var(--nw-hazard)', backgroundSize: '19.8px 19.8px', width: 180 }} />
        <div className={s.footGrid}>
          <div className={s.footCol}>
            <div className={s.footCol__t}>NWIS</div>
            <p className={s.footNote}>
              National Well Intelligence System. A drilling intelligence platform for live operations, subsurface
              context and historical well knowledge. Built for engineers who need the evidence, not a summary of it.
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              <ProvenanceTag kind="DEMO" label="DEMO DATA" />
              <ProvenanceTag kind="SYNTHETIC" label="SYNTHETIC" />
            </div>
          </div>
          <div className={s.footCol}>
            <div className={s.footCol__t}>Operations</div>
            <Link className={s.footLink} to="/command">
              Command centre
            </Link>
            <Link className={s.footLink} to="/nearby">
              Nearby wells
            </Link>
            <Link className={s.footLink} to="/active">
              Active well
            </Link>
            <Link className={s.footLink} to="/compare">
              Well compare
            </Link>
          </div>
          <div className={s.footCol}>
            <div className={s.footCol__t}>Intelligence</div>
            <Link className={s.footLink} to="/risk">
              Risk centre
            </Link>
            <Link className={s.footLink} to="/alerts">
              Alerts
            </Link>
            <Link className={s.footLink} to="/knowledge">
              Knowledge centre
            </Link>
            <Link className={s.footLink} to="/graph">
              Knowledge graph
            </Link>
          </div>
          <div className={s.footCol}>
            <div className={s.footCol__t}>Data</div>
            <Link className={s.footLink} to="/documents">
              Documents
            </Link>
            <Link className={s.footLink} to="/analytics">
              Analytics
            </Link>
            <Link className={s.footLink} to="/assistant">
              NWIS Assistant
            </Link>
            <Link className={s.footLink} to="/rig">
              Rig-site mobile
            </Link>
          </div>
        </div>
        <div className={s.footBottom}>
          <span>SIH26121 · Oil India Limited</span>
          <span>·</span>
          <span>API: /api/v1 · WebSocket: /ws/wells/&#123;id&#125;/live</span>
          <span>·</span>
          <span>Mapbox GL JS + deck.gl + Cytoscape.js + PDF.js</span>
          <span style={{ marginLeft: 'auto' }}>All figures are demo values</span>
        </div>
      </footer>
    </div>
  )
}

/* ======================================================================== */
/* capability previews — small, real, and built from the same vocabulary as  */
/* the screens they point at.                                               */
/* ======================================================================== */

function CorridorPreview() {
  const bands = [
    { name: 'Girujan', from: 0, to: 46, fill: '#ded8c6' },
    { name: 'Tipam', from: 46, to: 72, fill: '#e8e4d6' },
    { name: 'Barail', from: 72, to: 100, fill: '#c9b487' },
  ]
  const events = [
    { d: 30, t: 'LOSS', c: 'var(--nw-red)' },
    { d: 55, t: 'STUCK', c: 'var(--nw-yellow-deep)' },
    { d: 80, t: 'LOSS', c: 'var(--nw-red)' },
    { d: 92, t: 'KICK', c: 'var(--nw-orange, #e8721c)' },
  ]
  return (
    <svg viewBox="0 0 320 178" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }} aria-label="depth corridor preview">
      <rect width="320" height="178" fill="var(--nw-surface)" />
      {bands.map((b) => (
        <g key={b.name}>
          <rect x={62} y={b.from * 1.78} width={74} height={(b.to - b.from) * 1.78} fill={b.fill} />
          <rect x={62} y={b.from * 1.78} width={74} height={(b.to - b.from) * 1.78} fill="url(#none)" opacity={0.5} />
          <line x1={62} x2={136} y1={b.from * 1.78} y2={b.from * 1.78} stroke="var(--nw-border-2)" />
          <text x={140} y={b.from * 1.78 + 9} fontSize="8" fill="var(--nw-text-3)" fontFamily="Archivo, sans-serif" letterSpacing="1.2">
            {b.name.toUpperCase()}
          </text>
        </g>
      ))}
      <rect x={62} y={82} width={74} height={12} fill="var(--nw-red)" opacity={0.22} />
      {/* offset tracks */}
      <rect x={152} y={16} width={40} height={146} fill="var(--nw-surface-2)" stroke="var(--nw-border)" />
      <rect x={204} y={22} width={40} height={140} fill="var(--nw-surface-2)" stroke="var(--nw-border)" />
      <line x1={99} x2={99} y1={0} y2={166} stroke="var(--nw-yellow)" strokeWidth={3} />
      <polygon points="99,166 105,178 93,178" fill="var(--nw-yellow)" />
      {events.map((e, i) => (
        <g key={i}>
          <rect x={57} y={e.d * 1.78 - 3.5} width={7} height={7} fill={e.c} transform={`rotate(45 ${60.5} ${e.d * 1.78})`} />
          <line x1={136} x2={152} y1={e.d * 1.78} y2={e.d * 1.78} stroke={e.c} strokeWidth={1} strokeDasharray="2 2" />
        </g>
      ))}
      <text x={4} y={12} fontSize="8" fill="var(--nw-text-4)" fontFamily="'IBM Plex Mono', monospace">
        3,600
      </text>
      <text x={4} y={172} fontSize="8" fill="var(--nw-text-4)" fontFamily="'IBM Plex Mono', monospace">
        2,700
      </text>
      <line x1={40} x2={40} y1={8} y2={166} stroke="var(--nw-border-2)" />
    </svg>
  )
}

function RiskPreview() {
  // Three drivers only: the preview shares a 178px stage with the other two captions, and the full
  // factor breakdown lives on the risk screen itself.
  const rows = [
    { k: 'Formation pressure', v: 26 },
    { k: 'Depth behaviour', v: 24 },
    { k: 'ECD trend', v: 18 },
  ]
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--nw-font-display)', fontSize: 40, fontWeight: 800, lineHeight: 1, color: 'var(--nw-red)' }}>
          83
        </span>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="label" style={{ fontSize: 9, color: 'var(--nw-text-3)' }}>
            MUD LOSS
          </span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--nw-text-3)' }}>
            3,180–3,240 m MD
          </span>
        </span>
        <span
          className="label"
          style={{ marginLeft: 'auto', fontSize: 9, background: 'var(--nw-red)', color: '#fff', padding: '2px 5px' }}
        >
          HIGH
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.k} style={{ display: 'grid', gridTemplateColumns: '1fr 30px', gap: 8, alignItems: 'center' }}>
          <div>
            <div className="label" style={{ fontSize: 8.5, color: 'var(--nw-text-2)' }}>
              {r.k}
            </div>
            <div style={{ height: 7, background: 'var(--nw-surface-2)', border: '1px solid var(--nw-border)', position: 'relative', marginTop: 2 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: `${(r.v / 30) * 100}%`,
                  background: 'var(--nw-black)',
                }}
              />
            </div>
          </div>
          <span className="mono" style={{ fontSize: 10, textAlign: 'right' }}>
            {r.v}%
          </span>
        </div>
      ))}
    </div>
  )
}

function GraphPreview() {
  const nodes = [
    { x: 44, y: 92, r: 9, c: '#f5c518', l: 'W' },
    { x: 118, y: 46, r: 7, c: '#ffffff', l: 'W' },
    { x: 118, y: 140, r: 7, c: '#8e928b', l: 'W' },
    { x: 190, y: 30, r: 6, c: '#ffffff', l: 'F' },
    { x: 196, y: 92, r: 8, c: '#d33a2b', l: 'E' },
    { x: 190, y: 156, r: 6, c: '#8e928b', l: 'F' },
    { x: 258, y: 62, r: 5.5, c: '#ffffff', l: 'D' },
    { x: 262, y: 124, r: 5.5, c: '#45bd83', l: 'A' },
  ]
  const edges = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [4, 6],
    [4, 7],
    [1, 3],
    [2, 5],
  ]
  return (
    <svg viewBox="0 0 320 178" width="100%" height="100%" aria-label="knowledge graph preview">
      <rect width="320" height="178" fill="#0a0b0b" />
      {edges.map(([a, b], i) => {
        const from = nodes[a ?? 0]!
        const to = nodes[b ?? 0]!
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(255,255,255,0.24)" strokeWidth={1} />
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} />
          <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={7} fontWeight="800" fill="#0a0b0b" fontFamily="Archivo, sans-serif">
            {n.l}
          </text>
        </g>
      ))}
      <text x={8} y={16} fontSize="8" fill="rgba(255,255,255,0.5)" fontFamily="Archivo, sans-serif" letterSpacing="1.6">
        OCCURRED_IN
      </text>
      <text x={8} y={172} fontSize="8" fill="#f5c518" fontFamily="'IBM Plex Mono', monospace">
        W-067 → 17 m below Barail top → 40 ppb LCM
      </text>
    </svg>
  )
}
