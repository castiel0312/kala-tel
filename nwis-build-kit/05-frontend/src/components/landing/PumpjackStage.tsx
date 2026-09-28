import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useStill } from '../../experience/hooks'
import { useNwis } from '../../experience/useNwis'
import { useGroundLine } from './groundLine'
import s from './landing.module.css'

/**
 * The machine on the surface, and the only control in the hero.
 *
 * The pump jack is the one thing here that is not NWIS data, and it used to be a third-party
 * document: a Sketchfab embed of a published model, credited, framed to a camera its author had
 * stored, sitting inside somebody else's studio on a black rectangle. So the machine was never
 * quite *in* the scene — it was a card in it — and a good deal of CSS existed only to grade and
 * mask away the viewer around the model.
 *
 * There are now three rungs, ordered by how much of the machine is under our own control:
 *
 * 1. **A model of our own**, at `VITE_NWIS_PUMPJACK_GLB`, if one has been licensed. Rendered by
 *    us, placed by its bounding box, and nothing else in the stage changes.
 * 2. **The machine, built here** — `rigUnit.ts` and `rigUnitMount.ts`. No studio, no stored
 *    camera, nothing to grade and nothing to mask: a walking-beam pumping unit with its four-bar
 *    linkage solved in closed form, standing on the same ground line in the same dusk light as the
 *    sky and the pad, with the polished rod running up out of our own christmas tree.
 * 3. **The Sketchfab embed**, at `VITE_NWIS_PUMPJACK_EMBED`, if the published model is wanted
 *    back. The old path, and the only one that still needs a frame measured off a rendered frame
 *    and a studio graded out of it.
 *
 * The site, the wellhead and the section below do not know which rung is in the frame: all three
 * take the same rectangle and the same ground line, and the wellhead's own drawn stand-in is lifted
 * only once the machine is actually on screen rather than merely loaded.
 *
 * ## The machine is the interaction
 *
 * There is no second way in. The rig is a real `<button>` on the machine's own box, in both states,
 * and pressing it toggles the section underneath — so the landing page has nothing on it but a
 * machine standing on a lit cross-section, and the reader is never asked to find a control labelled
 * with a verb before they are shown the rock. It is a button rather than a label drawn over the
 * model for the same reason it always was: somebody who cannot see the ring can still put a pointer
 * on the rig, and somebody who is not using a pointer at all can tab to it and press Enter.
 */

interface RigModel {
  uid: string
  author: string
  /** the embed's own aspect, which is what the stored camera's framing is relative to */
  aspect: number
  /** where the silhouette sits in the frame, as fractions of the frame's own width and height */
  top: number
  feet: number
  left: number
  right: number
}

/**
 * Measured, not guessed: `node pumpjack-profile.mjs` renders the embed at this aspect and reads
 * the silhouette's top row, feet row and horizontal extent off the pixels. The feet row is the one
 * number the ground line depends on, so it is the one the profile re-checks. The built rig has no
 * equivalent, because it measures its own box.
 */
const RIG: RigModel = {
  uid: 'b5d3e545213a47c49c4ae299cb0159a5',
  author: 'aanimators',
  aspect: 900 / 640,
  top: 0.086,
  feet: 0.858,
  left: 0.236,
  right: 0.73,
}

const MODEL_URL = `https://sketchfab.com/3d-models/${RIG.uid}`
const EMBED = `https://sketchfab.com/models/${RIG.uid}/embed?ui_watermark_link=0&ui_watermark=0&ui_infos=0&ui_hint=0&ui_controls=0&ui_settings=0&ui_share=0&ui_vr=0&ui_fullscreen=1&ui_annotations=0&ui_help=0&ui_inspector=0&dpr=1`

/** An authorised model of our own, if one has been provided. */
const GLB = (import.meta.env.VITE_NWIS_PUMPJACK_GLB as string | undefined)?.trim() || undefined
/** …and the published embed, which is only reached for if it is asked for by name. */
const EMBEDDED = !GLB && /^(1|true|yes)$/i.test(((import.meta.env.VITE_NWIS_PUMPJACK_EMBED as string | undefined) ?? '').trim())

/** Which of the three rungs is in the frame. */
const MODE = GLB ? 'model' : EMBEDDED ? 'embed' : 'built'

/** The rig's height as a share of the stage plus the ground band — the brief's 50–60% surface. */
const HEIGHT_SHARE = 0.92
/** …and its width as a share of the stage, so the frame never has to be cropped to fit. */
const WIDTH_SHARE = 0.6

interface RigRect {
  frameW: number
  frameH: number
  left: number
  top: number
  /** the mask's horizontal feather, in px — the embed's studio only */
  featherX: number
  /** the mask's vertical feather, in px — the embed's studio only */
  featherTop: number
  /** the height the machine is given, in px, and the share of the surface band it came from */
  rigH: number
}

/**
 * Where the embed's frame goes, in the stage's own pixels.
 *
 * The frame is as tall as the rig's share of the surface band asks for, and as wide as that
 * height makes it at the embed's aspect, capped by the width the stage can spare. It is then
 * positioned from the measurement rather than centred blindly: the feet row is put on the ground
 * line, which hangs `band` px below the stage's own box, and the silhouette's centre — not the
 * frame's — is put over the stage's middle, so the wellhead stands under the machine.
 */
function rigRect(boxW: number, boxH: number, band: number): RigRect {
  const surface = Math.max(1, boxH + band)
  const rigShareH = RIG.feet - RIG.top
  const rigShareW = RIG.right - RIG.left
  const frameH = Math.min((HEIGHT_SHARE * surface) / rigShareH, (WIDTH_SHARE * boxW) / (rigShareW * RIG.aspect))
  const frameW = frameH * RIG.aspect
  return {
    frameW,
    frameH,
    left: boxW / 2 - ((RIG.left + RIG.right) / 2) * frameW,
    top: surface - RIG.feet * frameH,
    /** the horizontal feathers have to clear the rig itself, or they fade its own edges */
    featherX: Math.min(frameW * 0.12, RIG.left * frameW * 0.75),
    /** the vertical one has to clear the headroom above the machine */
    featherTop: Math.min(frameH * 0.11, RIG.top * frameH * 0.8),
    rigH: rigShareH * frameH,
  }
}

/**
 * Where the machine we render goes, which is the whole surface band.
 *
 * No frame to measure, because nothing is arriving inside one: the canvas is the stage plus the
 * ground band, and the machine is put on the ground line and over the wellhead from inside it. So
 * the rectangle is a plain box and `groundY` is simply the canvas's own height — the machine's
 * feet land on the last row of pixels, which is where the ground line is.
 *
 * The height allowance is the same share of the surface band the embed's rig gets. The width is
 * left to the machine's own mount, which caps itself against the canvas rather than being told a
 * width here — the same place a licensed model is fitted, and the reason a narrow stage loses the
 * machine's height rather than its ends.
 */
function builtRect(boxW: number, boxH: number, band: number): RigRect {
  const surface = Math.max(1, boxH + band)
  return {
    frameW: boxW,
    frameH: surface,
    left: 0,
    top: 0,
    featherX: 0,
    featherTop: 0,
    rigH: HEIGHT_SHARE * surface,
  }
}

/** The rectangle the frame is drawn at, plus the mask's feathers and cut, as the CSS wants them. */
function frameStyle(rect: RigRect | null): CSSProperties {
  if (!rect) return { display: 'none' }
  return {
    left: rect.left,
    top: rect.top,
    width: rect.frameW,
    height: rect.frameH,
    '--nw-feather-x': `${rect.featherX}px`,
    '--nw-feather-top': `${rect.featherTop}px`,
    '--nw-feet': `${RIG.feet * 100}%`,
  } as CSSProperties
}

/**
 * The machine's own box, which is also the control's hit area.
 *
 * The brief for this stage is that the pump jack *is* the interaction, so the button is the machine:
 * its feet on the ground line, its head at the height the stage gave it, and enough width for the
 * walking beam and the horsehead. The alternative — a ring on the wellhead — is a 30px target on a
 * silhouette two hundred pixels tall, and asking a reader to find it is asking them to guess.
 *
 * Not the stage's whole box, though. A full-width control would swallow the ridges, the tanks and
 * every future control in the site, and it would reach over the datum into the section below, which
 * is a different element with a different picture. So the box is the machine's own proportions,
 * floored to a comfortable minimum so a short stage still has a target a finger can hit, and it
 * stops at the ground line.
 */
function hotspotStyle(rect: RigRect, band: number): CSSProperties {
  const cx = rect.left + rect.frameW / 2
  const groundY = rect.top + rect.frameH - band
  const height = Math.max(132, rect.rigH)
  const width = Math.min(rect.frameW, Math.max(180, height * 1.32))
  return {
    left: cx - width / 2,
    top: groundY - height,
    width,
    height,
  }
}

/**
 * What a mounted machine hands back, so the stage can put it on the ground line again whenever the
 * stage is re-measured. Both rungs satisfy it, which is the point: the stage holds one ref and does
 * not ask which machine it is holding.
 */
export interface RigHandle {
  /**
   * Puts the base of the machine on the ground line, `groundY` px down the canvas, and gives it
   * `height` px to stand in.
   */
  place(groundY: number, height: number): void
  dispose(): void
}

export function PumpjackStage({
  open,
  onToggle,
  onHover,
}: {
  /** whether the section underneath is lit, which is what the control toggles */
  open: boolean
  /** light the ground, or put it back the way it was */
  onToggle: () => void
  onHover: (on: boolean) => void
}) {
  const band = useGroundLine()
  const still = useStill()
  const { wellId } = useNwis()
  const hostRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  /**
   * One hover, two things lit.
   *
   * The reader arriving at the machine should be answered in the same gesture: the rig lifts its own
   * lights, and the reservoir it is drilling toward lights up in the section underneath. The
   * hover is therefore reported upwards once, rather than wired twice, so the two cannot fall out
   * of step — a machine that lights without a target reads as a broken link, which is exactly what
   * it would be.
   */
  const setHover = useCallback(
    (on: boolean) => {
      onHover(on)
    },
    [onHover],
  )

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const read = () => {
      const r = el.getBoundingClientRect()
      setBox((prev) => (Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5 ? prev : { w: r.width, h: r.height }))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rect = useMemo(() => {
    if (box.w <= 40) return null
    return MODE === 'embed' ? rigRect(box.w, box.h, band) : builtRect(box.w, box.h, band)
  }, [box.w, box.h, band])

  return (
    <div className={s.stage} ref={hostRef}>
      {/* the sky, the ground it stands on, and the site between them */}
      <div className={s.stageSky} aria-hidden />

      <div className={s.stageSite}>
        <Site />
      </div>

      {/* the wellhead is lit before anything under it moves: the reader is told what they just
          opened before they are sent down to look at it */}
      <div className={s.whLead} aria-hidden />

      {/*
        The machine is the way into the well and the way back out of it, so it is a button, and it
        is drawn *before* the machine and the halo in the source: both are selected on the sibling
        combinator from its hover and focus, and stacking is carried by `z-index` rather than by
        document order. The box is the machine's own, so a reader who never notices the ring can
        still put a pointer on the rig and press it — and a reader on a keyboard can tab to it,
        which is the only route to the section for somebody who never moves a pointer at all.
      */}
      {rect && (
        <button
          type="button"
          className={s.stageHotspot}
          style={hotspotStyle(rect, band)}
          data-open={open ? 'true' : 'false'}
          aria-expanded={open}
          aria-controls="hero-well-detail"
          aria-label={
            open
              ? `Close the well view beneath ${wellId ?? 'the well'}`
              : `Inspect ${wellId ?? 'the well'}: open the geological section beneath the pump jack`
          }
          onClick={onToggle}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
        >
          <span className={s.hotspotRing} aria-hidden />
          {/*
            The prompt is only ever the way back out.
            It used to also say "Click to inspect well" (and "Tap to inspect well" on a finger) before
            the section was open, which told a reader who had already found the rig how to use it, and
            on touch it appeared only *after* a tap, so it described the gesture that had just
            happened. What the machine needs to say is what it will do next, so the label exists only
            once there is something open to close. Before that the ring and the button's own name carry
            it, and `aria-label` names the control either way.
          */}
          {open && (
            <span className={s.hotspotLabel} aria-hidden>
              Close well view
            </span>
          )}
        </button>
      )}

      {rect && <div className={s.rigGlow} style={hotspotStyle(rect, band)} aria-hidden />}

      {MODE === 'model' && <GlbRig rect={rect} surface={box.h + band} onState={setState} />}
      {MODE === 'built' && <BuiltRig rect={rect} still={still} onState={setState} />}
      {MODE === 'embed' &&
        rect && (
          <div className={`${s.stageRig} ${s.stageRigEmbed}`} style={frameStyle(rect)}>
            <iframe
              className={s.stageFrame}
              src={EMBED}
              title="Walking-beam pumping unit on the wellhead — published Sketchfab model"
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setState('ready')}
              onError={() => setState('failed')}
            />
          </div>
        )}

      {/* the drawn wellhead stands in until the machine's own tree is on screen over it */}
      {MODE !== 'built' || state !== 'ready' ? <Wellhead /> : null}

      {state !== 'ready' && (
        <div className={s.stageStatus} role="status">
          {state === 'failed' ? 'surface rig unavailable' : 'loading surface rig'}
        </div>
      )}

      <p className={s.stageCredit}>
        {MODE === 'built' ? (
          <>Surface rig: walking-beam pumping unit, built to this well's proportions.</>
        ) : MODE === 'model' ? (
          <>Surface rig: our own model, lit and placed on this ground line.</>
        ) : (
          <>
            Surface rig: walking-beam pumping unit,{' '}
            <a href={MODEL_URL} target="_blank" rel="noreferrer noopener">
              Sketchfab — {RIG.author}
            </a>
          </>
        )}
      </p>
    </div>
  )
}


/* -------------------------------------------------------------------------- */
/* the site                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The pad, the tanks and the ridge between the sky and the ground line.
 *
 * All of it is ours and all of it is drawn against the same baseline the section measures, so
 * the machine stands on a lease rather than in mid-air, and the ground it stands on meets the
 * ground the section cuts without a seam to explain. The horizon is deliberately the brightest
 * thing in the frame: it is dusk, the pad is lit, and a silhouette is worth more against a low
 * sky than against a high one.
 */
function Site() {
  return (
    <svg className={s.siteSvg} viewBox="0 0 1000 160" preserveAspectRatio="xMidYMax meet" aria-hidden focusable="false">
      <defs>
        <linearGradient id="nw-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--nw-site-haze)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--nw-site-haze)" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="nw-lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--nw-yellow)" stopOpacity="0.34" />
          <stop offset="1" stopColor="var(--nw-yellow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/*
        Two ridges, the far one paler, because air between them is what makes depth.

        They stop at the ground line — `y=150` of this viewBox, not `160`. The stage's box ends
        above the ground line and the section's box starts below it, so the band between them is
        the *crust*, and this art is drawn over it. Filling it down to 160 painted a near-black
        foreground straight across the top 19px of the section, which is not a dark ground so much
        as the ground missing: the cut face, the surface crust and the top of the topsoil were all
        behind it, and the site read as a black bar sitting on the rock. The section draws the
        ground surface itself, lit, receding, and it should be the thing that meets the sky.
      */}
      <path className={s.siteRidgeFar} d="M0 118 L84 104 L150 112 L236 92 L318 106 L402 88 L470 100 L560 84 L648 98 L742 90 L836 106 L918 96 L1000 110 L1000 160 L0 160 Z" />
      <path className={s.siteRidge} d="M0 132 L96 124 L188 132 L286 118 L372 128 L470 120 L560 130 L668 120 L764 130 L860 122 L948 132 L1000 126 L1000 160 L0 160 Z" />
      <rect x="0" y="112" width="1000" height="40" fill="url(#nw-haze)" />

      {/*
        The far lease: tanks and their platform, standing on the horizon. There is deliberately no
        pad and no approach road here any more.

        Both used to be drawn at the bottom of this element, which is the ground line — inside the
        section's box — and both were solid fills. So they covered the crust: the ground surface
        the machine stands on, the surface crust and the top of the topsoil were all behind a
        near-black rectangle, and the section's ground never got seen. The near ground is the
        section's to draw, because only the section knows where the ground line is and can light it
        as a surface receding from the cut. What is left here is only what is genuinely far away
        and genuinely a silhouette: the tanks, and their lamps.
      */}
      <g className={s.siteTank}>
        <rect x="742" y="112" width="34" height="26" rx="2" />
        <ellipse cx="759" cy="112" rx="17" ry="4" />
        <rect x="792" y="116" width="26" height="22" rx="2" />
        <ellipse cx="805" cy="116" rx="13" ry="3.4" />
      </g>

      {/*
        Lamps along the tank platform, high enough to be over the stage's own box. The pad's own
        lights are the section's: they have to sit on the ground surface it draws, and lighting a
        pad that is not there would be lighting nothing.
      */}
      <g>
        {[
          [742, 138, 1],
          [805, 138, 0.8],
        ].map(([x, y, k]) => (
          <g key={`${x}`}>
            <circle cx={x as number} cy={y as number} r="26" fill="url(#nw-lamp)" opacity={k as number} />
            <circle className={s.siteLamp} cx={x as number} cy={y as number} r="1.4" />
          </g>
        ))}
      </g>
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* the wellhead                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The wellhead: casing head, hangers, the tree, and the polished rod running up into the beam.
 *
 * Drawn here rather than in the section because it belongs to the surface, and because it has to
 * be standing from the first paint — it is the part of the well a reader would miss if the model
 * never arrived. It is hung from the ground line the section published, so the line is one
 * measurement rather than two, and it is drawn in front of the frame: the rod is what ties the
 * machine to the bore, and it has to read as one piece.
 */
function Wellhead() {
  return (
    <svg
      className={s.wellheadSvg}
      viewBox="0 0 120 150"
      style={{ bottom: 'calc(-1 * var(--nw-ground-band, 0px))' }}
      aria-hidden
      focusable="false"
    >
      {/* the pad the tree is set on, which is the ground line itself */}
      <line className={s.whGround} x1="10" y1="149" x2="110" y2="149" />
      {/* casing head, then the tubing head and the hanger it hangs off */}
      <rect className={s.whStack} x="42" y="126" width="36" height="16" />
      <rect className={s.whStack} x="48" y="112" width="24" height="14" />
      <rect className={s.whStack} x="51" y="96" width="18" height="16" />
      {/* flanges */}
      <line className={s.whFlange} x1="39" y1="126" x2="81" y2="126" />
      <line className={s.whFlange} x1="45" y1="112" x2="75" y2="112" />
      <line className={s.whFlange} x1="48" y1="96" x2="72" y2="96" />
      {/* the tree: master valve, wing valve, and the swab tee the rod comes out of */}
      <line className={s.whValveArm} x1="60" y1="86" x2="60" y2="96" />
      <line className={s.whValveArm} x1="44" y1="91" x2="76" y2="91" />
      <circle className={s.whValve} cx="60" cy="86" r="4" />
      <circle className={s.whValve} cx="42" cy="91" r="3" />
      <circle className={s.whValve} cx="78" cy="91" r="3" />
      <rect className={s.whBox} x="55" y="62" width="10" height="24" />
      {/* the rod, going up into the machine */}
      <line className={s.whRod} x1="60" y1="0" x2="60" y2="88" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* the machine, built here                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The default rung: our own pumping unit, turning, on the ground line.
 *
 * It takes the same rectangle contract as a licensed model — a canvas, a `place` on the ground
 * line, a height to stand in — and gives back the same handle, so this component and `GlbRig` are
 * interchangeable from the stage's point of view and the stage holds one ref for both.
 *
 * Three things are worth noting about what it is *not* doing. There is no mask on the wrapper,
 * because there is no studio behind the machine to cut away; there is no grade on the canvas,
 * because the machine is lit by the same dusk as the sky; and the wellhead drawn in SVG is lifted
 * once it is ready, because the machine brings its own christmas tree and two wellheads stacked
 * on one another is the one artefact this change could have introduced.
 *
 * The scene is imported on demand like the section's, so the three.js in the hero is only ever
 * loaded by a reader who scrolls to it.
 */
function BuiltRig({
  rect,
  still,
  onState,
}: {
  rect: RigRect | null
  still: boolean
  onState: (state: 'loading' | 'ready' | 'failed') => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rigRef = useRef<RigHandle | null>(null)
  /** the placement the stage last asked for, so a machine that arrives late is still given one */
  const want = useRef({ groundY: 0, height: 0 })

  useLayoutEffect(() => {
    if (!rect) return
    want.current = { groundY: rect.frameH, height: rect.rigH }
    rigRef.current?.place(want.current.groundY, want.current.height)
  }, [rect])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let dead = false
    void import('./rigUnitMount')
      .then(({ mountRig }) => {
        if (dead) return
        rigRef.current = mountRig(canvas, { still, onState })
        const w = want.current
        if (w.height > 0) rigRef.current.place(w.groundY, w.height)
      })
      .catch(() => onState('failed'))
    return () => {
      dead = true
      rigRef.current?.dispose()
      rigRef.current = null
    }
  }, [onState, still])

  return (
    <div className={s.stageRig} style={frameStyle(rect)}>
      <canvas className={s.stageGlb} ref={canvasRef} aria-hidden />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* the optional model of our own                                               */
/* -------------------------------------------------------------------------- */

/**
 * A licensed model of the same machine, in place of the one we build.
 *
 * Enabled only by `VITE_NWIS_PUMPJACK_GLB`. It takes the identical frame rectangle, so the rig
 * lands on the same ground line and the same share of the stage, and it is placed by its own
 * bounding box rather than by a stored camera: the base of the box is the ground line and its
 * centre is the stage's middle. No studio behind it, so the mask on the wrapper is a no-op and
 * there is nothing to grade.
 */
function GlbRig({
  rect,
  surface,
  onState,
}: {
  rect: RigRect | null
  surface: number
  onState: (state: 'loading' | 'ready' | 'failed') => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rigRef = useRef<RigHandle | null>(null)
  /** the placement the stage last asked for, so a model that arrives late is still given one */
  const want = useRef({ groundY: 0, height: 0 })

  /** the ground line, in the canvas's own pixels: the surface band, less the frame's overhang */
  useLayoutEffect(() => {
    if (!rect) return
    const groundY = surface - rect.top
    want.current = { groundY, height: rect.rigH }
    rigRef.current?.place(groundY, rect.rigH)
  }, [surface, rect])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !GLB) return
    let dead = false
    void import('./pumpjackGlb')
      .then(({ mountGlbRig }) => {
        if (dead) return
        rigRef.current = mountGlbRig(canvas, GLB, onState)
        const w = want.current
        if (w.height > 0) rigRef.current.place(w.groundY, w.height)
      })
      .catch(() => onState('failed'))
    return () => {
      dead = true
      rigRef.current?.dispose()
      rigRef.current = null
    }
  }, [onState])

  return (
    <div className={s.stageRig} style={frameStyle(rect)}>
      <canvas className={s.stageGlb} ref={canvasRef} aria-hidden />
    </div>
  )
}

