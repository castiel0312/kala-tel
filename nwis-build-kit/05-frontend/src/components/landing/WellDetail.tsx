import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import { useNearbyWells, useNwis } from '../../experience/useNwis'
import { buildSectionModel, eventLabel, ROCK_TYPE, SECTION_BOTTOM_MD, SECTION_TOP_MD, type SectionEvent } from '../../lib/section'
import s from './landing.module.css'

/**
 * What is behind the click.
 *
 * The hero opens on the one thing it is for — the well, drawn once, from the surface to the
 * interval it is being drilled for — and this is what the click is a promise of. It is a drawer
 * inside the hero rather than a page, and it is three columns of the answer: the rock, what the
 * neighbours did in it, and the windows the risk engine has open. The reader gets the well's
 * record without leaving the well.
 *
 * Nothing here is a new request. Every query below uses the key the section or the readout strip
 * has already populated, so opening the drawer costs a layout pass and not a round trip — the
 * same reason the strip is a second reading of the cache rather than a second call. And nothing
 * here is invented: the intervals are the ones the cutaway is drawn from, the events are the ones
 * aligned onto this bore, and the windows are the ones the engine returned.
 */

const CORRIDOR_Q = { align: 'md', look_ahead_m: 250 } as const
const EVENT_Q = {} as const

const RISK_INK: Record<string, string> = {
  HIGH: 'var(--nw-red-on-black)',
  MEDIUM: 'var(--nw-yellow)',
  LOW: 'var(--nw-steel)',
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB')

export function WellDetail({ open, onClose }: { open: boolean; onClose: () => void }) {  const { well, wellId, frame, goTo, openDocument, liveStatus } = useNwis()
  const nearby = useNearbyWells()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const corridor = useQuery({
    queryKey: qk.corridor(wellId ?? '', CORRIDOR_Q),
    queryFn: () => api.corridor(wellId as string, CORRIDOR_Q),
    enabled: open && Boolean(wellId),
    staleTime: 5 * 60_000,
  })
  const risks = useQuery({
    queryKey: qk.risks(wellId ?? ''),
    queryFn: () => api.risks(wellId as string),
    enabled: open && Boolean(wellId),
    staleTime: 60_000,
  })
  const events = useQuery({
    queryKey: qk.events(EVENT_Q),
    queryFn: () => api.events(EVENT_Q),
    enabled: open,
    staleTime: 5 * 60_000,
  })

  /** The same model the cutaway is drawn from, so the two can never disagree. */
  const model = buildSectionModel({
    well: well.data,
    corridor: corridor.data,
    risks: risks.data?.risks,
    offsets: nearby.data?.wells ?? [],
    events: events.data?.events ?? [],
  })

  const depth = frame?.primary.find((m) => m.key === 'depth')?.value
  const rop = frame?.primary.find((m) => m.key === 'rop')?.value
  const ecd = frame?.more.find((m) => m.key === 'ecd')?.value

  /* The drawer is a region the reader can leave: Escape closes it.
    *
    * It does *not* take the focus when it arrives, and the reason is the machine. The record is
    * mounted at the end of the open sequence, as a consequence of the reader pressing the pump jack
    * — and the pump jack is a toggle. Taking the focus here would put it on this heading, which
    * means the very next Enter would land on a heading rather than on the control the reader is
    * holding, and the way back would need finding again with Tab. A toggle that cannot be toggled
    * from the keyboard is not a toggle.
    *
    * Nor is the page scrolled. The reader pressed the machine, and the machine's answer — the ground
    * lighting up, the bore going down, the numbers arriving — happens in place, above the fold,
    * where they pressed it. A scroll here would be a way of saying the answer was somewhere else: the
    * hero's section is a fixed height and never reflows, so the machine is still standing in front
    * of them the moment the sequence ends, and a blind `scrollIntoView` could only push it away — far
    * enough, in fact, to slide the section's own close control under the sticky nav and take away the
    * way back.
    *
    * So the arrival is *announced* rather than focused: a polite live region beside the record says
    * what has appeared, and the record is one Tab away and one scroll down, which are both things
    * readers already know how to do. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  /**
   * The neighbours' events, taken from the same projection the cutaway draws rather than filtered
   * again here: the drawer's list and the section's event rail are then the same list, by
   * construction, and cannot drift apart.
   */
  const aligned = model.bores
    .flatMap((b) => b.events)
    .filter((e) => e.aligned)
  const offsets = nearby.data?.wells ?? []
  const lessons = offsets.filter((o) => o.lesson).slice(0, 4)

  return (
    <div className={s.detail} id="hero-well-detail" ref={rootRef} role="region" aria-label="Well detail">
      {/* The record arriving, said out loud rather than focused into. `polite` because the reader
          asked for this by pressing the machine, and because interrupting them to say so would be
          talking over their own action. It is visually hidden, so it costs the picture nothing. */}
      <p className="srOnly" role="status" aria-live="polite">
        {wellId ?? 'Well'} record open: {well.data?.currentFormation ?? 'current formation'} at{' '}
        {depth != null ? fmt(depth) : fmt(model.bitMd)} metres, {aligned.length} aligned events, {offsets.length} wells in range.
      </p>
      <div className={s.detailBar}>
        <h3 className={s.detailTitle} tabIndex={-1} ref={headingRef}>
          <span className={s.detailEyebrow}>
            {wellId ?? 'connecting'} · {well.data?.field ?? 'field'} · {well.data?.holeSection ?? 'section'}
          </span>
          <span className={s.detailHeadline}>
            {well.data?.currentFormation ?? '—'} at {depth != null ? fmt(depth) : fmt(model.bitMd)} m MD
            {rop != null && ` · ${rop} m/h`}
            {ecd != null && ` · ECD ${ecd.toFixed(3)}`}
          </span>
        </h3>
        <button type="button" className={s.detailClose} onClick={onClose} aria-label="Close well detail">
          Close
        </button>
      </div>

      <div className={s.detailGrid}>
        {/* --------------------------------------------------- the rock, in order -- */}
        <section className={s.detailCol} aria-labelledby="detail-rock">
          <h4 className={s.detailHead} id="detail-rock">
            The rock, in order
          </h4>
          <p className={s.detailNote}>
            {fmt(SECTION_TOP_MD)}–{fmt(SECTION_BOTTOM_MD)} m MD. Every band the API returns, plus the near-surface
            units it does not.
          </p>
          <ol className={s.detailStrata}>
            {model.layers.map((l) => (
              <li key={l.key} className={[s.detailBand, l.target && s['detailBand--target']].filter(Boolean).join(' ')}>
                <span className={s.detailBandTop}>
                  <i className={s.detailChip} style={{ background: l.fill }} aria-hidden />
                  {l.short}
                  {l.target && <span className={s.detailTargetTag}>target</span>}
                </span>
                <span className={s.detailBandMeta}>
                  {fmt(l.fromMd)}–{fmt(l.toMd)} m · {ROCK_TYPE[l.lithology]}
                </span>
                {l.interpreted && <span className={s.detailFlag}>interpreted</span>}
              </li>
            ))}
          </ol>
          <p className={s.detailNote}>
            9⅝-in shoe at {fmt(model.shoeMd)} m. Plan TD {fmt(model.planTdMd)} m
            {model.target ? `, inside the ${model.target.name.toLowerCase()}` : ''}.{' '}
            <button type="button" className={s.detailLink} onClick={() => goTo('corridor')}>
              Open the corridor
            </button>
          </p>
        </section>

        {/* ------------------------------------------- what the neighbours did -- */}
        <section className={s.detailCol} aria-labelledby="detail-neighbours">
          <h4 className={s.detailHead} id="detail-neighbours">
            What the neighbours did
          </h4>
          <p className={s.detailNote}>
            {aligned.length} {aligned.length === 1 ? 'event' : 'events'} from {new Set(aligned.map((e) => e.wellId)).size}{' '}
            wells, aligned onto this bore at true measured depth.
          </p>
          <ul className={s.detailEvents}>
            {aligned.slice(0, 5).map((e) => (
              <EventRow key={e.id} event={e} onOpen={() => openDocument(e.documentId, e.page ?? 1)} />
            ))}
            {aligned.length === 0 && <li className={s.detailEmpty}>No events in this depth window.</li>}
          </ul>

          {lessons.length > 0 && (
            <>
              <h4 className={s.detailHead}>Institutional memory</h4>
              <ul className={s.detailLessons}>
                {lessons.map((o) => (
                  <li key={o.id}>
                    <b>{o.id}</b> — {o.lesson}
                    {o.lessonSource && <span className={s.detailSrc}>{o.lessonSource}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* --------------------------------------------------- the open windows -- */}
        <section className={s.detailCol} aria-labelledby="detail-risk">
          <h4 className={s.detailHead} id="detail-risk">
            Open windows
          </h4>
          <p className={s.detailNote}>{risks.data?.nextZone.text ?? 'awaiting /risks'}</p>
          <ul className={s.detailRisks}>
            {(risks.data?.risks ?? []).map((r) => (
              <li key={r.id} className={s.detailRisk}>
                <span className={s.detailRiskTop}>
                  <b style={{ color: RISK_INK[r.level] ?? 'var(--nw-ink-2)' }}>{r.name}</b>
                  <span className="mono">{r.probability}%</span>
                </span>
                <span className={s.detailRiskMeta}>
                  {fmt(r.windowMdM[0])}–{fmt(r.windowMdM[1])} m MD · {r.status.replace('_', ' ').toLowerCase()} · confidence{' '}
                  {r.confidence}
                </span>
                {r.evidenceSummary && <span className={s.detailRiskBody}>{r.evidenceSummary}</span>}
                {r.reasons && r.reasons.length > 0 && (
                  <ul className={s.detailReasons}>
                    {r.reasons.slice(0, 3).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                {r.stats && r.stats.length > 0 && (
                  <span className={s.detailStats}>
                    {r.stats.map((st) => (
                      <span key={st.label}>
                        {st.value} <i>{st.label}</i>
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
            {(risks.data?.risks ?? []).length === 0 && <li className={s.detailEmpty}>No window in view.</li>}
          </ul>
          <div className={s.detailLinks}>
            <button type="button" className={s.detailLink} onClick={() => goTo('risk')}>
              All risks
            </button>
            <button type="button" className={s.detailLink} onClick={() => goTo('memory')}>
              Full memory
            </button>
            <button type="button" className={s.detailLink} onClick={() => goTo('live')}>
              Live well
            </button>
            <span className={s.detailLive}>
              {liveStatus === 'open' ? 'socket open' : 'socket connecting'} · {offsets.length} offsets indexed
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

function EventRow({ event, onOpen }: { event: SectionEvent; onOpen: () => void }) {
  return (
    <li className={s.detailEvent}>
      <span className={s.detailEventTop}>
        <b>{event.title}</b>
        <span className="mono">{fmt(event.mdM)} m</span>
      </span>
      <span className={s.detailEventMeta}>
        {event.wellId} · {eventLabel(event.type)} · {event.cause}
      </span>
      <span className={s.detailEventBody}>
        {event.action} · {event.nptHours} h NPT
        {event.aligned && ' · aligned onto this bore'}
      </span>
      <button type="button" className={s.detailLink} onClick={onOpen}>
        {event.documentId.toUpperCase()}
        {event.page ? ` p.${event.page}` : ''}
      </button>
    </li>
  )
}
