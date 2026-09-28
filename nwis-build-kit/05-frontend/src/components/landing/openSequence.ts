import { useEffect, useRef, useState } from 'react'

/**
 * The one clock the hero's whole reveal runs on.
 *
 * The hero is a well, and it has two states. It is not a chart with the rock switched off and it
 * is not a chart at all: the ground is on the page from the first paint, because a pump jack with
 * nothing under it is a machine on a fence. What the reader has not asked for yet is the *reading*
 * of that ground — the bore, the contacts, the depth axis, the neighbours, the record of what was
 * logged in this rock by the wells around it.
 *
 * So this is a clock, not a boolean. It produces one number, `t`, between 0 and 1: 0 is the landing
 * page, where the machine stands on a lit cross-section with three names on it and a bore hair
 * running down the centre; 1 is everything the section knows, on screen. Every part of the hero —
 * the Three.js rock, the SVG overlay, the rig's own framing — reads that one number, so they cannot
 * be out of step with one another and the picture cannot be half-open.
 *
 * The press is the machine, and it is the only way in. It does not navigate and it does not open a
 * second screen: it lights the ground it is standing on, and the reading of that ground arrives in
 * the order a geologist would give it — the shallows, then the casing, then the interval the well
 * is being drilled for, and last of all the record of what the neighbours did in it.
 *
 * ## Why it is a custom property and not React state
 *
 * The rock is sixty bands of WebGL and the overlay is several hundred SVG nodes. Re-rendering
 * either of them on sixty frames a second is a layout pass nobody needs: the only thing that
 * changes per frame is a number, and CSS can stage everything off that number on the compositor.
 * So the loop writes exactly one property, `--nw-open`, on the visual panel, and the staged values
 * are derived from it in `landing.module.css` with `clamp()` — the casing's growth, the labels'
 * arrival, the ground's own light are all CSS reading one variable. React is told about the *phase*,
 * four times a session, which is the only granularity anything in the tree actually has to act on.
 *
 * ## The stages
 *
 * Eight steps over about three quarters of a second, and each one is a thing the eye can be asked
 * to follow. The numbers below are the boundaries the CSS uses and they are written out here so the
 * picture can be read as a timeline rather than as a pile of magic numbers.
 *
 * ```text
 *  0.00 ─ 0.08   the wellhead is picked out of the dusk
 *  0.04 ─ 0.26   the lit rock rises through the flat one
 *  0.06 ─ 0.44   and arrives, band by band, from the topsoil down
 *  0.10 ─ 0.58   the casing runs down through it, to the shoe, to the bit
 *  0.30 ─ 0.44   the three resting names step aside for the full column
 *  0.34 ─ 0.62   the break line, the depth ruler and the rest of the names come up
 *  0.50 ─ 0.74   the target reservoir and its bracket resolve
 *  0.62 ─ 0.86   the neighbours' bores fade in as ghosted lines
 *  0.78 ─ 1.00   the events, the risk leads and the names at surface
 * ```
 *
 * The camera leans in on the machine over the first sixth and comes back out by halfway, so the
 * rig grows and shrinks but its feet never leave the ground line. Closing runs the same number
 * backwards, so everything leaves in the reverse of the order it arrived — the record first, the
 * rock last — and the reader is returned to the landing page with nothing half-drawn behind it.
 */

/** Open, in ms. Long enough to read as a sequence, short enough not to be a wait. */
const OPEN_MS = 860
/** Close, in ms. Faster than opening, because a reader who has closed it has already read it. */
const CLOSE_MS = 520

/**
 * Where the lit rock starts being drawn and where it has finished.
 *
 * `geologyScene` reveals by a per-material `at` — how far down the cut a band begins — so this
 * only has to hand it a 0→1 ramp and the scene does the top-down ordering itself. It starts almost
 * immediately, because the flat section is already under it: what arrives is the *light*, not the
 * rock, and the two have to overlap rather than hand over or the cut would empty in between.
 */
export const ROCK_IN = 0.06
export const ROCK_FULL = 0.44

export type WellPhase = 'landing' | 'opening' | 'open' | 'closing'

export interface OpenSequence {
  /** where the sequence is, at the resolution the component tree cares about */
  phase: WellPhase
  /** the number itself, for anything that has to read it outside CSS */
  t: React.MutableRefObject<number>
  /**
   * Where `--nw-open` is written.
   *
   * A mutable ref rather than a state holder, because the panel's box does not move when the well
   * opens: the cut is cut in place under a fixed height, and everything about the transition is
   * opacity, position and a mask. Reflowing the section would mean remeasuring the projection sixty
   * times a second and rebuilding the whole scene for each one. Mutable because the section — which
   * owns the panel — attaches the node to it.
   */
  panelRef: React.MutableRefObject<HTMLElement | null>
  /** the panel's own node, for the imperative updates this hook makes */
  readPanel: () => HTMLDivElement | null
}

/**
 * A clock that runs from 0 to 1 and back, and tells its listeners where it is.
 *
 * 0 is not "nothing on the page" — it is the landing page, the one this file is named after. The
 * clock is asked to run only when the reader has pressed the machine.
 *
 * `onFrame` is held in a ref rather than being a dependency, so a caller that hands over a fresh
 * closure every render does not restart the sequence — which would be a very quiet way to make a
 * sub-second animation stutter forever.
 */
export function useOpenSequence(
  open: boolean,
  reduced: boolean,
  onFrame?: (t: number) => void,
  onSettled?: (open: boolean) => void,
): OpenSequence {
  const [phase, setPhase] = useState<WellPhase>('landing')
  const t = useRef(0)
  const frame = useRef(onFrame)
  frame.current = onFrame
  const settled = useRef(onSettled)
  settled.current = onSettled
  const panelRef = useRef<HTMLDivElement | null>(null)

  /** Smooth, and a touch heavier at the ends than a linear ramp: it settles rather than stops. */
  const ease = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

  useEffect(() => {
    const from = t.current
    const to = open ? 1 : 0
    const panel = panelRef.current

    /** No journey to make: the state is already what was asked for. */
    if (from === to) {
      setPhase(open ? 'open' : 'landing')
      settled.current?.(open)
      return
    }

    /**
     * A reader who has asked for less motion gets the destination, not the journey.
     *
     * Not an empty section and not a skipped step: the full cutaway, on the first frame, with the
     * same layout the animated path ends on. Reduced motion is a statement about transitions
     * between states, and this is one — so the state itself still has to be correct.
     */
    if (reduced) {
      t.current = to
      panel?.style.setProperty('--nw-open', String(to))
      frame.current?.(to)
      setPhase(open ? 'open' : 'landing')
      settled.current?.(open)
      return
    }

    setPhase(open ? 'opening' : 'closing')
    const dur = open ? OPEN_MS : CLOSE_MS
    const start = performance.now()
    let raf = 0

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const v = from + (to - from) * ease(p)
      t.current = v
      panel?.style.setProperty('--nw-open', v.toFixed(4))
      frame.current?.(v)
      if (p < 1) raf = requestAnimationFrame(step)
      else {
        setPhase(open ? 'open' : 'landing')
        settled.current?.(open)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [open, reduced])

  return { phase, t, panelRef, readPanel: () => panelRef.current }
}

/**
 * The staged values, in one place, for anything that has to have the number in JavaScript.
 *
 * The rock is the only thing that genuinely needs it: the scene is WebGL, it draws its own
 * materials, and it cannot be told to fade a band by a stylesheet. Everything else on the page
 * stages itself off `--nw-open` in CSS, which is why these two constants exist next to the clock
 * rather than scattered through the stylesheet.
 */
export const staged = {
  /**
   * How far the lit rock's own reveal has got.
   *
   * 1 at the end and 0 at the start, and the ramp is deliberately front-loaded: the flat section is
   * already on the page under the canvas, so the bands are arriving as *light* over a picture that
   * is already the right shape, not as a picture that was not there.
   */
  rock(v: number): number {
    return Math.max(0, Math.min(1, (v - ROCK_IN) / (ROCK_FULL - ROCK_IN)))
  },
}
