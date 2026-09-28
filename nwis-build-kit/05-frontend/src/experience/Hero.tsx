import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useNwis } from './useNwis'
import { GeologySection } from '../components/landing/GeologySection'
import { PumpjackStage } from '../components/landing/PumpjackStage'
import { WellDetail } from '../components/landing/WellDetail'
import { WellSystem } from '../components/landing/WellSystem'
import s from './experience.module.css'
import v from '../components/landing/landing.module.css'

/**
 * The opening view, and the one interaction the whole page is built around.
 *
 * Left: the claim, in one sentence, with the two things a reader can do next. Right: the well, as
 * one instrument — the rig on the surface, the rock beneath it, and the numbers coming back off the
 * bit. The three are the same object seen three ways, and the section is drawn so the machine, the
 * wellhead and the bit sit on one vertical line: the pumpjack is centred, the active bore is
 * centred, and the depth ruler is true.
 *
 * ## The hero has one piece of state in it
 *
 * Whether the section is lit. It arrives lit *enough*: the machine is standing on a cross-section,
 * not on a fence, so the bands, the contacts, the depth break, three names and the bore down to the
 * bit are on the page from the first paint. What is not on the page is the reading of that ground —
 * the casing, the depth axis, the neighbours, the events the engine aligned, the risk windows, and
 * the readouts and the drawer of history that go with them.
 *
 * The press is the machine, and the machine is the only control. It does not navigate and it does
 * not open a second screen; it lights the ground it is standing on, and the reading of that ground
 * arrives in the order a geologist would give it over about three quarters of a second, driven by
 * one number that every part of the cutaway reads. The rock, the casing, the reservoir, the names,
 * the neighbours' bores, the events and the risk windows all arrive in that order, and the readouts
 * and the drawer of history arrive with the last of them. Pressing the machine again runs the same
 * number backwards. All of it is in `openSequence.ts`, and nothing here schedules anything.
 *
 * The machine, the rock and the wellbore are hoverable and clickable without the flag; the click is
 * what the flag is for. And the flag is one of two booleans in this file, so the hero cannot be
 * half-lit.
 */
export function Hero() {
  const { well, wellId, goTo, liveStatus } = useNwis()
  const landing = useQuery({ queryKey: qk.landing, queryFn: api.landing, staleTime: Infinity })
  const [openWell, setOpenWell] = useState(false)
  const [rigHover, setRigHover] = useState(false)

  const open = useCallback(() => setOpenWell(true), [])
  const close = useCallback(() => setOpenWell(false), [])
  /** The machine is a toggle, not a door: the same press that lit the ground puts it back. */
  const toggle = useCallback(() => setOpenWell((on) => !on), [])

  /**
   * What the lit section has to show beyond the cutaway itself.
   *
   * The rock, the bore and the reservoir are the well. These are the *answer* to it — the bit
   * depth, the top risk, the offsets in range, the events the engine aligned, and the drawer's
   * record of what the neighbours did in the same rock. They are the last stage of the opening, so
   * they are not mounted until the sequence has actually put them there. A reader who never presses
   * the machine never loads the queries behind them, which is the point: the hero is the first thing
   * on the page and the cheapest thing on it.
   */
  const [intelligence, setIntelligence] = useState(false)

  const w = well.data
  const stats = landing.data?.stats ?? []

  return (
    <section className={s.hero} id="overview" aria-labelledby="overview-title">
      <div className={s.heroCopy}>
        <p className={[s.heroEyebrow, 'label'].join(' ')}>
          <span className={s.heroPulse} data-live={liveStatus === 'open' ? 'true' : 'false'} aria-hidden />
          {wellId ?? 'connecting'} · {w?.field ?? 'Dibarh field'} · {w?.holeSection ?? 'build section'}
        </p>

        <h1 className={[s.heroTitle, 'display'].join(' ')} id="overview-title">
          <span className={s.d1}>Nearby wells.</span>
          <span className={s.d2}>Institutional memory.</span>
          <span className={s.d3}>Real-time intelligence.</span>
        </h1>

        <p className={s.heroLede}>
          One continuous operational picture of a live well, stitched from 1,284 indexed well reports and every
          well within 10&nbsp;km. What the neighbours hit, how they handled it, and where that leaves the bit.
        </p>

        <div className={s.heroActions}>
          <button type="button" className={s.heroCta} onClick={() => goTo('live')}>
            Explore live well
            <span aria-hidden>→</span>
          </button>
          <button type="button" className={s.heroCtaAlt} onClick={() => goTo('wells')}>
            What the neighbours found
          </button>
        </div>

        <dl className={s.heroStats}>
          {stats.slice(0, 4).map((st) => (
            <div key={st.label}>
              <dt>{st.label}</dt>
              <dd className="mono">{st.value}</dd>
            </div>
          ))}
          {stats.length === 0 && (
            <div>
              <dt>wells indexed</dt>
              <dd className="mono">—</dd>
            </div>
          )}
        </dl>
      </div>

      <div className={[s.heroVisual, openWell && s.heroVisualOpen].filter(Boolean).join(' ')}>
        {/*
          The panel the whole sequence is written on.

          `--nw-open` lands here rather than on the section, because the transition reaches above
          the section: the machine leans in and the wellhead is lit before anything under it moves.
          One element owns the number for both halves of the cutaway, and it is marked so the
          verification harness can read the transition as a reader sees it rather than inferring it.
        */}
        <div className={[v.visual, openWell && v['visual--open']].filter(Boolean).join(' ')} data-open-panel="">
          <PumpjackStage
            open={openWell}
            onToggle={toggle}
            onHover={setRigHover}
          />
          <GeologySection
            open={openWell}
            detail={intelligence}
            rigHover={rigHover}
            onOpen={open}
            onClose={close}
            onSettled={setIntelligence}
          />
          {intelligence && <WellSystem />}
          {intelligence && <WellDetail open onClose={close} />}
        </div>
      </div>
    </section>
  )
}
