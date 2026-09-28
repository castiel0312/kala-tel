import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import { useNearbyWells, useNwis } from '../../experience/useNwis'
import {
  buildSectionModel,
  eventLabel,
  offsetLabel,
  ROCK_TYPE,
  SECTION_BOTTOM_MD,
  SECTION_TOP_MD,
  type SectionBore,
  type SectionEvent,
  type SectionLayer,
  type SectionModel,
} from '../../lib/section'
import { createSectionView, type SectionView } from './sectionView'
import { publishGroundLine } from './groundLine'
import { useOpenSequence, staged } from './openSequence'
import { SectionFallback } from './SectionFallback'
import s from './landing.module.css'

/**
 * The cutaway, and the state it is in.
 *
 * ## Two states, and the ground between them
 *
 * The hero is a well, and the first thing it says about itself is that it is *lit*. The reader
 * arrives to a machine standing on a lit cross-section: bands, contacts, a depth break, three
 * names, and a bore running from the wellhead down to a bit three kilometres below. No chart, no
 * risk windows, no list of what the neighbours did last year — all of that is one press of the
 * machine away, and the press is the machine, because a machine with nothing under it is a machine
 * on a fence.
 *
 * So this component has two states and a transition, and the transition is the product. Pressing
 * the machine runs `openSequence` — eight stages, under a second — and every part of the cutaway
 * reads its own moment out of the one number that clock writes:
 *
 * ```text
 *   lit ground →  rock in full  →  casing  →  axis and names  →  reservoir  →  neighbours  →  the record
 * ```
 *
 * The stage boundaries live in `openSequence.ts` and in the `--nw-*` block on `.visual`; nothing in
 * this file invents its own timing.
 *
 * ## The rock and the annotation are two renderings of one projection
 *
 * The rock, its relief and the ground it stands on are a Three.js scene; the ruler, the contacts,
 * the wellbore, the names and every label are SVG on top of it. Both read one `SectionView`, and
 * that view is the contract — the camera is orthographic with no yaw, so a depth is a screen
 * coordinate and a label can be placed on the pixel the canvas drew. The overlay is not a picture
 * of the scene, it is in the scene's coordinates.
 *
 * ## The scene is not built until the machine is pressed
 *
 * The hero is the first thing on the page and it has to be cheap. The Three.js chunk, the
 * textures, the sixty band materials and the buffers behind them are all built on the press, not
 * on load, and are held afterwards: a reader who closes the well and opens it again should not pay
 * for the rock twice, and a reader who never presses should not pay for it at all. The flat section
 * is underneath it the whole time, so neither state is ever a black rectangle.
 *
 * ## Nothing here is invented
 *
 * Every interval, window, bore and glyph is an API value. The intervals `/corridor` does not break
 * out, and the whole near-surface skin, are marked interpreted and the section says so.
 */

const CORRIDOR_Q = { align: 'md', look_ahead_m: 250 } as const
const EVENT_Q = {} as const

type PickKind = 'bore' | 'event' | 'risk' | 'layer'
interface Pick {
  kind: PickKind
  id: string
}

interface Hover {
  key: string
  x: number
  y: number
}

/** Severity is a hue; the low band is ink, so a quiet window looks quiet on bright rock too. */
const RISK_INK: Record<string, string> = {
  HIGH: 'var(--nw-red)',
  MEDIUM: 'var(--nw-orange)',
  LOW: 'var(--nw-strata-ink)',
}
const SEVERITY_INK: Record<string, string> = {
  high: 'var(--nw-red)',
  med: 'var(--nw-orange)',
  low: 'var(--nw-strata-ink)',
}

const fmt = (md: number) => Math.round(md).toLocaleString('en-GB')

/** Shape carries the event type, colour the severity — two channels, so no legend is needed. */
function glyphPath(type: string, x: number, y: number): string {
  switch (type) {
    case 'LOSS':
      return `M${x} ${y - 5.2} L${x + 4.6} ${y + 4} L${x - 4.6} ${y + 4} Z`
    case 'STUCK':
      return `M${x} ${y - 5.4} L${x + 5.4} ${y} L${x} ${y + 5.4} L${x - 5.4} ${y} Z`
    case 'CEMENT':
      return `M${x - 4.2} ${y - 4.2} h8.4 v8.4 h-8.4 Z`
    case 'KICK':
      return `M${x - 4.4} ${y - 4.4} L${x + 4.4} ${y + 4.4} M${x + 4.4} ${y - 4.4} L${x - 4.4} ${y + 4.4}`
    default:
      return `M${x - 3.5} ${y - 3.5} a3.5 3.5 0 1 0 0.1 0 Z`
  }
}

/** Greedy downward spread, so a column of small rows can never land on itself. */
function spread(ys: number[], rowH: number, top: number, bottom: number): number[] {
  const out: number[] = []
  let floorY = top
  for (const y of ys) {
    const v = Math.max(y, floorY)
    out.push(v)
    floorY = v + rowH
  }
  const over = (out[out.length - 1] ?? top) - bottom
  return over > 0 ? out.map((v) => v - over) : out
}

/**
 * Row pitches, derived from the type rather than tuned beside it.
 *
 * §6 puts a floor of 11px under every label, and a spread computed for 8.6px type silently stops
 * separating rows once the type grows past it — the rows no longer collide because the type moved,
 * they collide because the pitch did not. So the two numbers that the layout has to know are written
 * here against the sizes the stylesheet actually uses: `FORM_ROW_H` is the name plus the depth
 * printed under it plus the gap, and `RISK_ROW_H` is one risk label plus its gap. Both are in CSS
 * pixels in the SVG's own coordinate space, which is the space `spread` is working in.
 */
const FORM_ROW_H = 30
const RISK_ROW_H = 30
/** One neighbour-well label plus its gap: an 11px line with room to breathe. */
const SURFACE_ROW_H = 15
/** How wide a risk label may be before it is wrapped, and the leading of its second line. */
const RISK_LABEL_CHARS = 19
/**
 * The event lane is narrower than the risk lane, because the bit's own readout sits between the
 * two: a 19-character event line is about 138px, and the stretch between the event rail and the
 * left edge of the bit's label is 130px at 1180. Fourteen characters fits, with room for the
 * bit's label to be its full two lines without either crossing the other.
 */
const EVENT_LABEL_CHARS = 17
const RISK_LINE_H = 12
/** A full event row: its glyph line, a name of up to two lines, and the depth under it. */
const EVENT_ROW_H = 44

/** A depth outside the axis has no place on it, so it is pinned to the end of the axis. */
function clampY(view: SectionView, md: number): number {
  return Math.max(view.breakY - 1, Math.min(view.height - 2, view.yForMd(md)))
}

export function GeologySection({
  open,
  detail,
  rigHover,
  onOpen,
  onClose,
  onSettled,
}: {
  /** the section is lit: the axis, the record and the readouts all belong on screen */
  open: boolean
  /** the section is fully open: the operational overlays, the readouts and the drawer come with it */
  detail: boolean
  /** the reader is on the machine, so the interval it is drilling toward is lit */
  rigHover: boolean
  onOpen: () => void
  onClose: () => void
  /**
   * The sequence has arrived, either way. This is how the readouts and the drawer of history learn
   * that there is something now to read: they are the last stage of the opening, so they mount from
   * here rather than from the press, and can never appear over a section that is not lit yet.
   */
  onSettled: (open: boolean) => void
}) {
  const { well, wellId, frame, reducedMotion, openDocument, selectWell, selectedWellId } = useNwis()
  const nearby = useNearbyWells()

  const corridor = useQuery({
    queryKey: qk.corridor(wellId ?? '', CORRIDOR_Q),
    queryFn: () => api.corridor(wellId as string, CORRIDOR_Q),
    enabled: Boolean(wellId),
    staleTime: 5 * 60_000,
  })
  const risks = useQuery({
    queryKey: qk.risks(wellId ?? ''),
    queryFn: () => api.risks(wellId as string),
    enabled: Boolean(wellId),
    staleTime: 60_000,
  })
  const events = useQuery({
    queryKey: qk.events(EVENT_Q),
    queryFn: () => api.events(EVENT_Q),
    staleTime: 5 * 60_000,
  })

  const model = useMemo(
    () =>
      buildSectionModel({
        well: well.data,
        corridor: corridor.data,
        risks: risks.data?.risks,
        offsets: nearby.data?.wells ?? [],
        events: events.data?.events ?? [],
      }),
    [well.data, corridor.data, risks.data, nearby.data, events.data],
  )

  /** The socket owns the bit depth; the survey keeps the risk windows the API computed. */
  const liveMd = frame?.primary.find((m) => m.key === 'depth')?.value
  const bitMd = liveMd ?? model.bitMd

  /* ------------------------------------------------------------------- frame -- */

  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [painted, setPainted] = useState(false)
  const [pick, setPick] = useState<Pick | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)

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

  const eastings = useMemo(() => model.bores.flatMap((b) => [b.surfaceEastKm, b.bottomEastKm]), [model.bores])
  /**
   * The view is built with the layer list, not just the box: the contact curves are a property of
   * the projection, and both renderers read the same ones. A unit's top contact and the unit
   * above's base contact are one polyline, so the rock cannot gap at a contact and the overlay's
   * outline cannot drift off it.
   */
  const view = useMemo(() => createSectionView(box.w, box.h, eastings, model.layers), [box, eastings, model.layers])

  const panel = hostRef.current?.parentElement

  /**
   * The height of the band between the top of the column and the ground line, published to the
   * stage above and to the wellhead. The stage needs it to stand the rig's feet on the ground
   * rather than on the edge of its own box, and it is a measured value rather than a fraction of
   * a guess because the ground the machine stands on recedes away from the cut and the two have to
   * be the same line.
   */
  useLayoutEffect(() => {
    if (!panel) return
    panel.style.setProperty('--nw-ground-band', `${view.groundY}px`)
    publishGroundLine(view.groundY)
    return () => {
      panel.style.removeProperty('--nw-ground-band')
    }
  }, [panel, view.groundY])

  /* ----------------------------------------------------------------- sequence -- */

  type Scene = {
    dispose: () => void
    reveal: (t: number) => void
    render: () => void
    tick: (now: number) => boolean
    setBit: (md: number) => void
    setHighlight: (key: string | null) => void
    setDetail: (on: boolean) => void
  }
  const sceneRef = useRef<Scene | null>(null)

  /**
   * One frame of the sequence, handed straight to the rock.
   *
   * The scene is the one thing on this panel with no DOM property to read the master number from:
   * its bands are WebGL materials, and `opacity` on a material is not a stylesheet. So it is given
   * its own staged ramp. Everything else — the cover, the contacts, the names, the neighbours, the
   * event rail, the casing's own growth — stages itself off `--nw-open` in the stylesheet, which is
   * why exactly one of the three renderings of the reveal has to be in JavaScript.
   */
  const onFrame = useCallback((t: number) => {
    sceneRef.current?.reveal(staged.rock(t))
  }, [])

  const { t: progress, phase, panelRef } = useOpenSequence(open, reducedMotion, onFrame, onSettled)

  /**
   * The clock writes `--nw-open` on the visual panel, not on the section.
   *
   * The machine is above the section and the sequence reaches it too — the camera leans in on it,
   * and the wellhead is lit before anything under it moves — so the number has to be somewhere both
   * of them inherit from. The panel is this element's parent, which is the one node above that is
   * the same on every breakpoint.
   *
   * It is attached through `panelRef` rather than looked up on every frame, and the current value is
   * re-stated whenever the phase settles, so a well that was opened before this node existed — a
   * deep link, a restored scroll, a test that sets the flag directly — is drawn open on the first
   * paint rather than one interaction late.
   */
  useLayoutEffect(() => {
    panelRef.current = panel ?? null
    if (panel) panel.style.setProperty('--nw-open', progress.current.toFixed(4))
    return () => {
      panelRef.current = null
    }
  }, [panel, panelRef, progress, phase])

  /* ------------------------------------------------------------------- scene -- */

  /**
   * The rock is built on the press, and only while the well is open.
   *
   * This is the hero, and it is the first thing on the page: the Three.js chunk, the lithology
   * textures, the band meshes and the buffers behind them are all deferred to the moment they are
   * actually wanted. The module import is what stays cached between opens, so closing the well
   * releases the GPU and the second press costs no network.
   *
   * `painted` is strictly "the scene has drawn a frame", and this effect must not clear it on the
   * way out. Clearing it would take the flat section down and put up a canvas nothing has drawn,
   * which is the one failure this arrangement cannot recover from. Instead the canvas stays where
   * it is with `opacity: 0` and the flat section — which opens in the same order, from the same
   * stylesheet — covers it until there is something to see.
   */
  const wantScene = open && box.w > 40 && !reducedMotion

  /**
   * The depth the rock is built at, and the detail state it is built with.
   *
   * Both are read through a ref at build time rather than watched as dependencies. The live feed
   * publishes depth continuously, and the sequence flips the detail state at the end of the opening
   * — neither is a reason to tear down and rebuild sixty band meshes, and both have a setter on
   * the scene that exists for exactly that.
   */
  const buildAt = useRef({ bitMd, detail })
  buildAt.current = { bitMd, detail }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !wantScene) return
    let dead = false
    let raf = 0
    let watch: IntersectionObserver | null = null
    let scene: Scene | null = null

    /**
     * The band's own clock, and only while the cutaway is actually on screen.
     *
     * A bit pulsing at the bottom of a section nobody is looking at is a fan nobody asked for.
     */
    const pump = () => {
      const loop = (n: number) => {
        if (dead) return
        if (scene?.tick(n)) scene.render()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    void import('./geologyScene')
      .then(({ createGeologyScene }) => {
        if (dead) return
        scene = createGeologyScene(canvas, {
          view,
          layers: model.layers,
          risks: model.risks,
          bitMd: buildAt.current.bitMd,
          bitEastKm: model.active?.surfaceEastKm ?? 0,
          target: model.target,
          planTdMd: model.planTdMd,
          reducedMotion: false,
        })
        sceneRef.current = scene
        scene.setDetail(buildAt.current.detail)
        /**
         * A backgrounded tab throttles rAF to nothing, so the sequence cannot be the only thing
         * that would ever show the rock. The cover lifts on schedule either way, so the rock has
         * to arrive at whatever the sequence has reached rather than starting its own reveal again.
         */
        scene.reveal(staged.rock(progress.current))
        setPainted(true)
        watch = new IntersectionObserver(([entry]) => {
          if (!entry) return
          if (entry.isIntersecting) pump()
          else raf = 0
        })
        watch.observe(canvas)
      })
      .catch(() => setPainted(false))

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      watch?.disconnect()
      scene?.dispose()
      sceneRef.current = null
    }
  }, [wantScene, view, model.layers, model.risks, model.target, model.planTdMd, model.active?.surfaceEastKm, progress])

  // The bit follows the socket without rebuilding a section for a metre of depth.
  useEffect(() => {
    sceneRef.current?.setBit(bitMd)
  }, [bitMd])

  // Opening the well brings the operational overlays up behind the rock.
  useEffect(() => {
    sceneRef.current?.setDetail(detail)
  }, [detail])

  /**
   * Nothing is picked in a closed well.
   *
   * The targets are made inert in the stylesheet, but a pick that outlived the press would be
   * shown over the cover, so the state is dropped the moment the sequence starts closing.
   */
  useEffect(() => {
    if (!open) {
      setPick(null)
      setHover(null)
    }
  }, [open])

  /* ----------------------------------------------------------------- picking -- */

  const onOver = useCallback((kind: PickKind, id: string) => () => setPick({ kind, id }), [])
  const onOut = useCallback(() => setPick(null), [])
  /** Leaving a name row is the same gesture as leaving a band, and it clears the same state. */
  const clearHover = useCallback(() => setHover(null), [])

  /**
   * What the rock is lit for: the band under the pointer, and — when the reader is on the machine
   * above rather than in the rock — the interval the machine is drilling toward. The stage's hover
   * therefore answers a question the reader has not asked yet, which is the one the hero exists for:
   * what is this rig for.
   */
  const litKey = rigHover ? (model.target?.key ?? null) : (hover?.key ?? null)
  useEffect(() => {
    sceneRef.current?.setHighlight(litKey)
  }, [litKey])

  const onBandEnter = useCallback((key: string) => (e: React.PointerEvent<SVGRectElement>) => {
    const host = hostRef.current
    if (!host) return
    const r = host.getBoundingClientRect()
    setHover({ key, x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  const w = view.width
  const h = view.height
  const a = model.active
  const layers = model.layers
  const target = model.target

  const labelRows = useMemo(() => formationLabels(view, layers, detail), [view, layers, detail])
  const restRows = useMemo(() => restingLabels(view, layers), [view, layers])
  const interpreted = layers.filter((l) => l.interpreted).length

  /**
   * Whether anything in this panel can be pointed at.
   *
   * `open`, not the phase, for the same reason the three landing-state names are the only ones
   * printed: the landing page is a picture of a well, and a picture of a well that opens a tooltip
   * the moment a pointer crosses it is a chart. The targets are there for the reader who has asked
   * for the reading.
   */
  const live = phase !== 'landing' && phase !== 'closing'

  return (
    <div className={s.section} ref={hostRef}>
      {/* The flat section is the same picture with the relief left off, and it is the landing
          page's picture. It is never taken down: it is what the reader arrives to, what covers the
          canvas in the moment before the scene's first frame, what the lit rock rises out of, and
          what a machine without WebGL is left with. */}
      <SectionFallback view={view} layers={layers} bores={model.bores} />

      <canvas
        ref={canvasRef}
        className={[s.canvas, painted && s['canvas--on']].filter(Boolean).join(' ')}
        width={w}
        height={h}
        style={{ width: w, height: h }}
        aria-hidden
      />

      <svg
        className={s.overlay}
        data-open={open ? 'true' : 'false'}
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        role="img"
        aria-label={`Geological section beneath ${a?.id ?? 'the active well'}. ${layers.length} bands from the surface to ${fmt(SECTION_BOTTOM_MD)} metres measured depth, with the surface sequence above the break line compressed. Bit at ${fmt(bitMd)} metres. Target reservoir at ${target ? `${fmt(target.fromMd)} metres` : 'not identified'}. ${model.risks.length} risk windows. ${a?.events.length ?? 0} neighbour events aligned onto this bore.`}
        onMouseLeave={() => {
          onOut()
          setHover(null)
        }}
      >
        {/* ------------------------------------------------ the paper either side */}
        <g className={s.gutters}>
          <rect x={0} y={view.groundY} width={view.rockLeft} height={h - view.groundY} />
          <rect x={view.rockRight} y={view.groundY} width={w - view.rockRight} height={h - view.groundY} />
        </g>

        {/* ------------------------------------------------------------ the ground ---
            Everything in this group is on the page before anything is pressed, because all of it
            is a description of the rock rather than of the well: the lit lip, which is the line
            that says the machine is standing on this and the bore starts here; the contacts and the
            break chevrons, which are the convention a section is drawn in; and the scale bar,
            which is a property of the drawing's own frame. */}
        <g className={s.stGround}>
          <defs>
            {/* the crust catching the last of the light, between the dusk and the topsoil */}
            <linearGradient id="nw-ground-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--nw-strata-surface)" stopOpacity="0" />
              <stop offset="1" stopColor="var(--nw-strata-surface)" stopOpacity="0.42" />
            </linearGradient>
          </defs>
          <path
            className={s.groundWash}
            d={`M0 ${view.groundY - view.groundWash} L${w} ${view.groundY - view.groundWash} L${w} ${view.groundY} L0 ${view.groundY} Z`}
          />
          <path className={s.groundLip} d={`M0 ${view.groundY} L${w} ${view.groundY} L${w} ${view.groundY + 3} L0 ${view.groundY + 3} Z`} />
          <line className={s.groundHair} x1={view.rockLeft} x2={view.rockRight} y1={view.groundY + 3} y2={view.groundY + 3} />

          <line className={s.cutEdge} x1={view.rockLeft} x2={view.rockRight} y1={view.groundY} y2={view.groundY} />
          {layers.filter((l) => l.role === 'strata').map((l) => {
            const y = view.yForMd(l.fromMd)
            return (
              <g key={l.key}>
                <line className={s.contactLit} x1={view.rockLeft} x2={view.rockRight} y1={y - 1.1} y2={y - 1.1} />
                <line className={s.contact} x1={view.rockLeft} x2={view.rockRight} y1={y} y2={y} />
              </g>
            )
          })}
          {layers.filter((l) => l.role === 'skin').map((l) => {
            const y = view.yForLayer(l) + view.layerH(l)
            return <line key={`${l.key}-base`} className={s.contact} x1={view.rockLeft} x2={view.rockRight} y1={y} y2={y} />
          })}

          {/* the break, where depth stops being true */}
          <path className={s.breakLine} d={breakPath(view)} />

          {/* the bore: the one thing in the picture that is not rock, and therefore the one thing
              drawn before anything is pressed. A hairline from the wellhead to the bit, with the
              depth printed on it — enough to say the machine above is attached to something three
              kilometres down. The casing grows down this same line and the hair gets out of its
              way, so the connection is never lost on the way to the full section. */}
          <BoreHair view={view} model={model} bitMd={bitMd} />

          {/* the three names the landing page is allowed, and only the three */}
          <g className={[s.formationLabels, s.stNames].filter(Boolean).join(' ')}>
            {restRows.map((r) => (
              <FormationRow key={r.layer.key} view={view} row={r} onEnter={onBandEnter} onLeave={clearHover} />
            ))}
          </g>
          {/* The horizontal scale bar used to be printed here, across the foot of the rock. It is
              gone, and that is the one drawing change this section is allowed: at 11px a "1 km E–W"
              caption is wide enough to run under the depth column, and the frame already states the
              scale at the top of the ruler. The vertical ruler still carries the true numbers, so
              the honest claim the brief wants is kept somewhere it can be read. */}
        </g>

        {/* ------------------------------------------- the bands, and what they say */}
        <g className={s.stRock}>
          {layers.map((l) => {
            const y0 = view.yForLayer(l)
            const bh = view.layerH(l)
            return (
              <g key={l.key}>
                <rect
                  className={[s.bandHit, hover?.key === l.key && s['bandHit--on']].filter(Boolean).join(' ')}
                  x={view.rockLeft}
                  y={y0}
                  width={view.rockRight - view.rockLeft}
                  height={Math.max(1, bh)}
                  onPointerEnter={onBandEnter(l.key)}
                  onFocus={() => setHover({ key: l.key, x: view.labelX - 200, y: y0 + bh / 2 })}
                  onBlur={() => setHover(null)}
                  tabIndex={-1}
                />
                {hover?.key === l.key && (
                  <>
                    <rect className={s.bandOutline} x={view.rockLeft} y={y0} width={view.rockRight - view.rockLeft} height={Math.max(1, bh)} />
                    <rect className={s.bandWash} x={view.rockLeft} y={y0} width={view.rockRight - view.rockLeft} height={Math.max(1, bh)} />
                  </>
                )}
                {/* the machine's hover, answered in the rock: the target interval is outlined while
                    the rig is under the pointer, and the wellbore's own mark brightens with it */}
                {rigHover && l.target && (
                  <rect className={s.bandTargetLit} x={view.rockLeft} y={y0} width={view.rockRight - view.rockLeft} height={Math.max(1, bh)} />
                )}
              </g>
            )
          })}
        </g>

        {/* ---------------------------------------------------- the neighbours, ghosted */}
        <g className={s.stNeighbours}>
          {model.bores
            .filter((b) => !b.active)
            .map((b) => (
              <Bore
                key={b.id}
                view={view}
                bore={b}
                height={h}
                selected={selectedWellId === b.id}
                onOver={onOver}
                onOut={onOut}
                onSelect={() => selectWell(b.active ? null : b.id)}
              />
            ))}
        </g>

        {/* ------------------------------------------ the reservoir, and the bore in it */}
        {target && (
          <g className={s.stTarget}>
            <TargetMark view={view} target={target} />
          </g>
        )}
        {a && (
          <Wellbore
            view={view}
            model={model}
            bitMd={bitMd}
            detail={detail}
            rigHover={rigHover}
            onOver={onOver}
            onOut={onOut}
            onSelect={onOpen}
          />
        )}

        {/* --------------------------------------- the names, with a leader to each band */}
        <g className={[s.formationLabels, s.stLabels].filter(Boolean).join(' ')}>
          {labelRows.map((r) => (
            <FormationRow key={r.layer.key} view={view} row={r} onEnter={onBandEnter} onLeave={clearHover} />
          ))}
        </g>

        {/* ---------------------------------------------------------------- the axis ---
            The depth ruler is the reading of the ground rather than the ground, so it comes with
            the rest of the reading — as does the caption saying the section above the break is
            compressed, which is the one place in this picture that is not to scale. */}
        <g className={s.stRock}>
          {!view.compact && (
            <text className={s.breakText} x={view.rockLeft + 7} y={view.breakY - 6}>
              ABOVE THIS LINE · DEPTH COMPRESSED
            </text>
          )}
        </g>

        {/* ------------------------------------------------------- the depth ruler */}
        <g className={[s.ruler, s.stRock].filter(Boolean).join(' ')}>
          <text className={s.rulerCap} x={view.rulerW - 10} y={view.breakY - 18} textAnchor="end">
            m MD
          </text>
          <line className={s.rulerRule} x1={view.rulerW - 6} x2={view.rulerW - 6} y1={view.breakY} y2={view.axisBottomY} />
          {ticks(view).map((t) => (
            <g key={t.md}>
              <line className={s.rulerTick} x1={view.rulerW - 6} x2={view.rulerW - 10} y1={t.y} y2={t.y} />
              {t.major && (
                <text className={s.rulerText} x={view.rulerW - 13} y={t.y + 3.2} textAnchor="end">
                  {fmt(t.md)}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* ---------------- the operational overlays, which arrive with the reader --- */}
        {detail && (
          <g className={s.stHistory}>
            <g>
              {riskRows(model, view).map((r) => (
                <g key={r.risk.riskId} onMouseEnter={onOver('risk', r.risk.riskId)}>
                  <line
                    className={s.riskLead}
                    x1={view.rockRight - 6}
                    x2={view.rockRight - 6 + (r.risk.level === 'HIGH' ? 15 : 8)}
                    y1={r.y - 3.4}
                    y2={r.y - 3.4}
                    style={{ stroke: RISK_INK[r.risk.level] }}
                  />
                  <text className={s.riskLabel} x={view.rockRight - 9} y={r.y} textAnchor="end" style={{ fill: RISK_INK[r.risk.level] }}>
                    {/* On a phone the rock is about 210 units wide and the bit's readout is at its
                        centre, so there is no stretch of it to the right on which a full risk name can
                        sit: even wrapped, "WELLBORE INSTABILITY 18%" is 122 units and would print
                        straight through it. So the compact column carries the number and the severity
                        colour, and the name is in the legend and in this label's own hover, which is
                        where a 15-character name belongs on a 320px screen. */}
                    {wrapLabel(
                      view.compact ? `${r.risk.probability}%` : `${r.risk.name.toUpperCase()} ${r.risk.probability}%`,
                      RISK_LABEL_CHARS,
                    ).map((line, i) => (
                      <tspan key={line} x={view.rockRight - 9} dy={i === 0 ? 0 : RISK_LINE_H}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              ))}
            </g>

            <SurfaceLabels view={view} model={model} onOver={onOver} onOut={onOut} />

            <EventRail
              view={view}
              active={a}
              pick={pick}
              onOver={onOver}
              onOut={onOut}
              onOpen={(e) => openDocument(e.documentId, e.page ?? 1)}
            />
          </g>
        )}

        {/* --------------------------------- the section's own caption, in the gutter */}
        <g className={[s.sectionHead, s.stRock].filter(Boolean).join(' ')}>
          <text x={view.labelX + 8} y={h - 6}>
            {layers.length} BANDS
          </text>
          {interpreted > 0 && (
            <text x={view.labelX + 8} y={h - 15}>
              {interpreted} INTERPRETED
            </text>
          )}
          {/* "TRUE SCALE BELOW BREAK" used to be printed in two short lines at the foot of the tick
              column. At 11px those two lines are about 74px wide and the column is 54, so they ran
              off the gutter and sat on top of the deepest tick numbers; §6 wants no overlaps, and a
              caption that is itself overprinted is the least useful thing on the drawing. The
              statement belongs with the frame's other caption, where there is a whole label column
              to print it in, so that is where it is now — and it is one line, because one line is
              what the space above it is sized for. */}
          {!view.compact && (
            <text x={view.labelX + 8} y={h - 24}>
              TRUE SCALE BELOW BREAK
            </text>
          )}
        </g>
      </svg>

      {/* -------------------------------------------------------- the way back --- */}
      <button
        type="button"
        className={s.sectionClose}
        data-on={detail ? 'true' : 'false'}
        onClick={onClose}
        aria-label="Close the well"
        tabIndex={detail ? 0 : -1}
      >
        CLOSE WELL
        <span className={s.sectionCloseMark} aria-hidden>
          ×
        </span>
      </button>

      {live && hover && (
        <BandTooltip
          layer={layers.find((l) => l.key === hover.key) ?? null}
          model={model}
          bitMd={bitMd}
          x={Math.max(8, Math.min(w - 232, hover.x + 18))}
          y={Math.max(6, Math.min(h - 118, hover.y - 54))}
        />
      )}

      {live && pick && pick.kind !== 'layer' && (
        <div className={s.inspector} role="status">
          {resolvePick(pick, model)}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* the bore, as a hairline and then as a tube                                   */
/* -------------------------------------------------------------------------- */

/**
 * The bore before it is a casing run.
 *
 * On the landing page this is the only representation of the well that is on screen, and it is the
 * whole connection between the machine above and the rock below: a hairline down the wellhead's own
 * line, from the ground to the bit, with the bit's depth printed beside it. It carries no casing,
 * no shoe and no plan, because none of those are things the API says exist yet — it is a well
 * going down, not a well built.
 *
 * Its opacity is staged in CSS, so it fades out as the casing arrives down the same line rather than
 * being unmounted. The two are the same vertical: the shaft that replaces it starts at the same
 * ground line and reaches the same depth, so the picture never loses the thing it was saying.
 */
function BoreHair({ view, model, bitMd }: { view: SectionView; model: SectionModel; bitMd: number }) {
  const bore = model.active
  if (!bore) return null
  const cx = view.xForKm(bore.surfaceEastKm)
  const bitY = clampY(view, bitMd)
  if (bitY <= view.groundY + 2) return null
  return (
    <g>
      <line className={s.boreHair} x1={cx} x2={cx} y1={view.groundY + 1} y2={bitY} />
      <line className={s.boreHairTick} x1={cx - 4} x2={cx + 4} y1={bitY} y2={bitY} />
      {/* The one depth the landing page prints, set to the *left* of the bore.
       *
       * Left rather than right because the right of the bore is where the name column is, and that
       * column is only 96px wide on a phone — narrower than "TARGET RESERVOIR" is long, so a label
       * hung off the bore's right shoulder prints straight through the names there. The left of the
       * bore is open rock at every width, between the bore and the ruler, and the number is short. */}
      <text className={s.boreDepth} x={cx - 9} y={bitY + 3} textAnchor="end">
        {fmt(bitMd)} m MD
      </text>
    </g>
  )
}

/**
 * One row of the name column: the swatch, the name, the depth range and the leader back to the
 * band it names.
 *
 * Drawn once and used by both name columns rather than twice, so the landing page's three names and
 * the open section's full column cannot drift apart on a detail of the type.
 */
function FormationRow({
  view,
  row,
  onEnter,
  onLeave,
}: {
  view: SectionView
  row: { layer: SectionLayer; y: number }
  /** both name columns hang off the same band-hover handler, so both take the same event shape */
  onEnter: (key: string) => (e: React.PointerEvent<SVGRectElement>) => void
  onLeave: () => void
}) {
  const { layer, y } = row
  return (
    <g
      className={[s.formRow, layer.target && s['formRow--target']].filter(Boolean).join(' ')}
      onPointerEnter={onEnter(layer.key)}
      onPointerLeave={onLeave}
    >
      <path className={s.formLeader} d={`M${view.rockRight - 7} ${y} L${view.labelX + 7} ${y}`} />
      <rect className={s.formSwatch} x={view.labelX + 3} y={y - 11} width={7} height={7} style={{ fill: layer.fill }} />
      <text className={s.formName} x={view.labelX + 15} y={y - 5}>
        {layer.short}
      </text>
      <text className={s.formDepth} x={view.labelX + 15} y={y + 4}>
        {layer.role === 'skin' ? `≈ ${fmt(layer.fromMd)}–${fmt(layer.toMd)} m` : `${fmt(layer.fromMd)}–${fmt(layer.toMd)} m MD`}
      </text>
    </g>
  )
}

/**
 * The wellbore, drawn as one object from the wellhead to the plan.
 *
 * Three thicknesses and one colour, in this order: the casing is a solid dark shaft from the
 * ground to the 9⅝-in shoe, the open hole narrows below the shoe to the bit, and the planned
 * path runs on from there as a dashed line to the target. The reason it is dark charcoal rather
 * than another colour is that the rock is now bright: a coloured bore would be a ninth formation,
 * and the one thing in the picture that is not rock has to be the thing that is not rock.
 *
 * The bore is drawn plumb. The active well does deviate — 0.6 km east at the bit — but at this
 * section's horizontal scale that lean is a third of the bore's own width of travel per hundred
 * metres, and a wellbore drawn at thirty degrees stops reading as a wellbore at all. So the
 * deviation is printed at the bit instead, and only once the well is open.
 */
function Wellbore({
  view,
  model,
  bitMd,
  detail,
  rigHover,
  onOver,
  onOut,
  onSelect,
}: {
  view: SectionView
  model: SectionModel
  bitMd: number
  detail: boolean
  rigHover: boolean
  onOver: (k: PickKind, id: string) => () => void
  onOut: () => void
  onSelect: () => void
}) {
  const bore = model.active
  if (!bore) return null
  const cx = view.xForKm(bore.surfaceEastKm)
  const groundY = view.groundY
  const shoeY = clampY(view, model.shoeMd)
  const bitY = clampY(view, bitMd)
  const planY = clampY(view, model.planTdMd)
  const target = model.target
  const perfTop = target ? clampY(view, target.fromMd) : null
  const perfBot = target ? clampY(view, target.toMd) : null

  /**
   * The casing grows as a transform about the ground line, so the shaft is one element scaled
   * rather than sixty redrawn lines. The origin is published to the stylesheet because
   * `transform-box: view-box` resolves `transform-origin` against the viewBox, and the ground line
   * is a measurement rather than a percentage.
   */
  const origin = { '--nw-casing-origin': `${groundY}px` } as CSSProperties

  return (
    <g
      className={s.wellbore}
      data-lit={rigHover ? 'true' : 'false'}
      onMouseEnter={onOver('bore', bore.id)}
      onMouseLeave={onOut}
      onClick={onSelect}
    >
      {/* the wellhead, at the ground line, where the machine's own tree arrives. It is outside the
          growing shaft on purpose: the tree does not travel down the hole. */}
      <rect className={s.treeBase} x={cx - 8} y={groundY - 5} width={16} height={7} rx={1} />
      <line className={s.treeStack} x1={cx - 4.5} x2={cx - 4.5} y1={groundY - 12} y2={groundY - 5} />
      <line className={s.treeStack} x1={cx + 4.5} x2={cx + 4.5} y1={groundY - 12} y2={groundY - 5} />

      <g className={s.stCasing} style={origin}>
        {/* the tube's own shadow, so a black shaft still reads as a round object on bright rock */}
        <line className={s.boreShadow} x1={cx + 2.5} x2={cx + 2.5} y1={groundY} y2={planY} />

        {/*
          The casing, then the open hole, then the plan.
          Body, shadow, highlight, lit face — in that order, so the lit face is never painted over
          by the body and the shadow never lands on the highlight. A cylinder is legible because of
          the order of its stripes, and this is the only cylinder in the picture.
        */}
        <line className={s.casing} x1={cx} x2={cx} y1={groundY} y2={shoeY} />
        <line className={s.casingShadow} x1={cx + 1.2} x2={cx + 1.2} y1={groundY} y2={shoeY} />
        <line className={s.casingSpec} x1={cx - 2.2} x2={cx - 2.2} y1={groundY} y2={shoeY} />
        <line className={s.casingLit} x1={cx - 0.4} x2={cx - 0.4} y1={groundY} y2={shoeY} />
        <line className={s.hole} x1={cx} x2={cx} y1={shoeY} y2={bitY} />
        <line className={s.planned} x1={cx} x2={cx} y1={bitY} y2={planY} />

        {/* the shoe, because a casing run that ends without a mark is a line that stops for no reason */}
        <g className={s.shoe}>
          <line x1={cx - 5.5} x2={cx + 5.5} y1={shoeY} y2={shoeY} />
        </g>

        {/* perforations across the target: the reason the plan is where it is */}
        {perfTop != null && perfBot != null && perfBot - perfTop > 8 && (
          <g className={s.perfs}>
            {Array.from({ length: 6 }, (_, i) => {
              const y = perfTop + 4 + ((perfBot - perfTop - 8) * i) / 5
              return <line key={i} x1={cx - 5} x2={cx + 5} y1={y} y2={y} />
            })}
          </g>
        )}

        {/* the plan's end, standing inside the interval it is aimed at */}
        {planY > bitY + 3 && (
          <g className={s.td}>
            <path d={`M${cx - 6} ${planY - 5} L${cx} ${planY} L${cx + 6} ${planY - 5} Z`} />
          </g>
        )}

        {/* the bit, and what the survey says about it */}
        {detail && (
          /* Printed to the left of the bore rather than the right. The risk windows are anchored to
             the right edge of the rock and grow leftwards, and at 11px they are up to 180px wide, so
             on a narrower frame the two lanes ran into each other across the middle of the drawing.
             The left of the bore is the one stretch of rock nothing else is printed on. */
          <g className={s.bitLabels}>
            <text className={s.bitDepth} x={cx - 12} y={bitY + 3} textAnchor="end">
              BIT {fmt(bitMd)} m MD
            </text>
            <text className={s.bitNext} x={cx - 12} y={bitY + 13} textAnchor="end">
              {(bore.bottomEastKm - bore.surfaceEastKm).toFixed(2)} km E AT BIT
            </text>
            <text className={s.bitNext} x={cx - 12} y={planY - 6} textAnchor="end">
              PLAN TD {fmt(model.planTdMd)} m
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* the target reservoir's own mark                                             */
/* -------------------------------------------------------------------------- */

/**
 * A bracket down the left edge of the target interval, and nothing else.
 *
 * The reservoir already glows, and it already has the only yellow mark in the picture standing
 * inside it. A third signal would be one too many, so this is a bracket and a dot: it says *this
 * interval, here* without adding a colour or a number the label column has not already got.
 */
function TargetMark({ view, target }: { view: SectionView; target: SectionLayer }) {
  const y0 = view.yForMd(target.fromMd)
  const y1 = Math.min(view.height, view.yForMd(target.toMd))
  const x = view.rockLeft + 5
  return (
    <g className={s.targetMark}>
      <path d={`M${x + 9} ${y0} L${x} ${y0} L${x} ${y1} L${x + 9} ${y1}`} />
      <circle cx={x} cy={(y0 + y1) / 2} r={2.2} />
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* one offset, as a ghost                                                      */
/* -------------------------------------------------------------------------- */

function Bore({
  view,
  bore,
  height,
  selected,
  onOver,
  onOut,
  onSelect,
}: {
  view: SectionView
  bore: SectionBore
  height: number
  selected: boolean
  onOver: (kind: PickKind, id: string) => () => void
  onOut: () => void
  onSelect: () => void
}) {
  const x0 = view.xForKm(bore.surfaceEastKm)
  const x1 = view.xForKm(bore.bottomEastKm)
  const tdY = Math.min(height, view.yForMd(bore.tdMd))
  return (
    <g
      className={[s.bore, selected && s['bore--sel']].filter(Boolean).join(' ')}
      onMouseEnter={onOver('bore', bore.id)}
      onMouseLeave={onOut}
      onClick={onSelect}
    >
      <line className={s.hole} x1={x0} x2={x1} y1={view.groundY} y2={tdY} />
      <circle className={s.hit} cx={x0} cy={view.groundY} r={2.4} />
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* the band tooltip                                                            */
/* -------------------------------------------------------------------------- */

/**
 * What a band is and what is known about it, on hover.
 *
 * Four lines, in the order a geologist asks them: what it is, how deep, what kind of rock, and
 * what the wellfile says about it. The last one is the only one that is ever a count, and it is
 * counted from the same model the picture is drawn from, so hovering a band cannot tell the
 * reader something the section does not already show.
 */
function BandTooltip({
  layer,
  model,
  bitMd,
  x,
  y,
}: {
  layer: SectionLayer | null
  model: SectionModel
  bitMd: number
  x: number
  y: number
}) {
  if (!layer) return null
  const thick = Math.round(layer.toMd - layer.fromMd)
  const reaching = model.bores.filter((b) => b.tdMd >= layer.fromMd).length
  const events = model.bores
    .flatMap((b) => b.events)
    .filter((e) => e.mdM >= layer.fromMd && e.mdM < layer.toMd)

  return (
    <div className={s.bandTip} style={{ left: x, top: y }} role="status">
      <b className={s.bandTipName} style={{ borderColor: layer.fill }}>
        {layer.short}
      </b>
      <span className={s.bandTipType}>{ROCK_TYPE[layer.lithology]}</span>
      <span className={s.bandTipDepth}>
        {layer.role === 'skin' ? (
          <>
            ≈ {fmt(layer.fromMd)}–{fmt(layer.toMd)} m below surface · drawn compressed
          </>
        ) : (
          <>
            {fmt(layer.fromMd)}–{fmt(layer.toMd)} m MD · {fmt(thick)} m thick
          </>
        )}
      </span>
      <span className={s.bandTipNote}>{layer.note}</span>
      <span className={s.bandTipWell}>
        {layer.role === 'skin' ? (
          'Above the cut — no bore in this frame reaches it.'
        ) : (
          <>
            {reaching} {reaching === 1 ? 'bore reaches' : 'bores reach'} this interval
            {events.length > 0 ? ` · ${events.length} logged ${events.length === 1 ? 'event' : 'events'} in it` : ' · no logged events in it'}
            {bitMd >= layer.fromMd && bitMd < layer.toMd
              ? ` · bit ${fmt(bitMd - layer.fromMd)} m in`
              : bitMd < layer.fromMd
                ? ` · ${fmt(layer.fromMd - bitMd)} m ahead of the bit`
                : ''}
          </>
        )}
      </span>
      {layer.interpreted && <span className={s.bandTipFlag}>INTERPRETED — not a band the API returns</span>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* the aligned event rail                                                      */
/* -------------------------------------------------------------------------- */

function EventRail({
  view,
  active,
  pick,
  onOver,
  onOut,
  onOpen,
}: {
  view: SectionView
  active: SectionBore | null
  pick: Pick | null
  onOver: (k: PickKind, id: string) => () => void
  onOut: () => void
  onOpen: (e: SectionEvent) => void
}) {
  /* Three families of annotation share the rock, and at 11px none of them fits in the space the
     8.6px type used to need, so they get a lane each instead of all growing rightwards from the
     bore: the risk windows are the widest and stay hard against the right edge, where their leader
     ticks already are; the event rail moves to the left of the rock, which is the only side with a
     clear run left on it; and the bit's own readout keeps the ground it had beside the bore, which
     is now clear of both. Each lane spreads its own rows by depth, so nothing within a lane can
     print on anything else in that lane, and the lanes do not overlap sideways, so nothing crosses. */
  const rail = view.rockLeft + 8
  const clusters = useMemo(() => {
    const out: { key: string; y: number; events: SectionEvent[] }[] = []
    for (const e of active?.events ?? []) {
      const y = view.yForMd(e.mdM)
      const last = out[out.length - 1]
      /* Events close enough together are one row on the diagram, printed once: the name, its depth,
         and the well it came from. The window has to be the height of that whole row, not the height
         of one line of it — a row is now a glyph line, a name that may be two lines, and a depth
         under that, about 44 units in all. Merging on a smaller window than that does not give more
         detail, it gives two rows' text overprinted on one another. */
      if (last && Math.abs(last.y - y) < EVENT_ROW_H) last.events.push(e)
      else out.push({ key: e.id, y, events: [e] })
    }
    return out
  }, [active?.events, view])

  if (clusters.length === 0) return null
  const first = clusters[0]?.y ?? 0
  const last = clusters[clusters.length - 1]?.y ?? 0

  return (
    <g>
      <line className={s.railLine} x1={rail - 9} x2={rail - 9} y1={first - 12} y2={last + 12} />
      {/* The caption only prints when there is clear sky above the topmost event for it. Moved to
          the left of the rock it is 300px wide, and the break line's own caption is directly above
          it in the same column, so "first - 19" is not always sky. Where it is not, the rail is
          still explained by the glyphs and by this label. */}
      {!view.compact && first - 19 > view.breakY + 12 && (
        <text className={s.railCap} x={rail - 9} y={first - 19}>
          NEIGHBOUR EVENTS ALIGNED ONTO THIS BORE
        </text>
      )}
      {clusters.map((c) => {
        const ink = SEVERITY_INK[c.events[0]?.severity ?? 'low'] ?? 'var(--nw-text-3)'
        const on = pick?.kind === 'event' && c.events.some((e) => e.id === pick.id)
        return (
          <g key={c.key} onMouseEnter={onOver('event', c.events[0]?.id ?? c.key)} onMouseLeave={onOut}>
            <line className={s.railLead} x1={view.xForKm(active?.surfaceEastKm ?? 0) + 5} x2={rail - 7} y1={c.y} y2={c.y} />
            {c.events.map((e, i) => (
              <path
                key={e.id}
                d={glyphPath(e.type, rail + i * 14, c.y)}
                className={[s.glyph, on && s['glyph--on']].filter(Boolean).join(' ')}
                style={{ stroke: ink, fill: e.severity === 'high' ? ink : 'none' }}
                onClick={() => onOpen(e)}
              >
                <title>{`${e.wellId} · ${e.title} · ${fmt(e.mdM)} m MD`}</title>
              </path>
            ))}
            {/* The label and its depth sit *under* the run of glyphs rather than beside them.
                Beside them, the text started at `rail + 5 * 14` and ran right; the bit's own readout
                is at the centre of the rock growing leftwards from it, and the two lanes are about
                86px apart at 1180, which is less than one 11px line of a combined cluster label.
                Under the glyphs the text starts at the left edge of the rock instead, where there is
                the whole width of the left half of the frame, and it reads as the caption to the row
                of glyphs above it, which is what it is. */}
            {!view.compact && (
              <>
                <text className={s.eventLabel} x={rail} y={c.y + 16} style={{ fill: ink }}>
                  {wrapLabel(clusterLabel(c.events), EVENT_LABEL_CHARS).map((line, i) => (
                    <tspan key={line} x={rail} dy={i === 0 ? 0 : RISK_LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
                <text className={s.eventDepth} x={rail} y={c.y + 16 + RISK_LINE_H * 2}>
                  {fmt(c.events[0]?.mdM ?? 0)} m MD · {c.events[0]?.wellId}
                </text>
              </>
            )}
          </g>
        )
      })}
    </g>
  )
}

/** What a cluster of glyphs is: the distinct operational names, and how many more there are. */
function clusterLabel(events: SectionEvent[]): string {
  const names = [...new Set(events.map((e) => eventLabel(e.type)))]
  const head = names.slice(0, 2).join(' · ')
  return names.length > 2 ? `${head} +${names.length - 2}` : head
}

/* -------------------------------------------------------------------------- */
/* the neighbours at surface                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every offset is named where it reaches the surface, once the well is open.
 *
 * At rest they are ghost lines in the rock and nothing else: a name against every neighbour in a
 * ten-kilometre radius is a wall of text, and the argument the section is making at rest is about
 * the rock, not the neighbourhood. The names come with the reader.
 *
 * The rows are a greedy test, and the test uses each name's own width rather than one average.
 * Every name is the same two-part monospace string — an id and a distance — so the width is its
 * character count, and reserving a single figure for all of them either overlaps the long ones or
 * wastes the gaps between the short ones. A name that still will not fit is left unnamed, and the
 * caption says so: the count of the offsets in the cut and the count of the names on it are two
 * different numbers, and the section states both rather than quietly showing the smaller one.
 */
function SurfaceLabels({
  view,
  model,
  onOver,
  onOut,
}: {
  view: SectionView
  model: SectionModel
  onOver: (k: PickKind, id: string) => () => void
  onOut: () => void
}) {
  const offsets = model.bores.filter((b) => !b.active)
  if (offsets.length === 0) return null

  const max = view.compact ? 4 : 12
  const near = [...offsets].sort((a, z) => (a.distanceKm ?? 99) - (z.distanceKm ?? 99)).slice(0, max)
  /* The width this label will actually occupy, used to decide which row it can go in. It was
     `length * 5.2`, which is the advance of 8.5px monospace — the type before §6. At the 11px floor
     the advance is about 6.6, so a label placed by the old estimate came out roughly a quarter
     wider than the row it was assigned and two neighbours printed on one another. The estimate is
     therefore stated against the type it has to predict, with the same caveat as FORM_ROW_H: it is
     an estimate, and `verify-labels.mjs` is what proves it was good enough. */
  const widthOf = (bore: SectionBore) => offsetLabel(bore).length * 6.6 + 10
  const ROWS = view.compact ? 2 : 3
  const rowEnd = new Array<number>(ROWS).fill(-Infinity)

  /* A label is placeable only if it fits *inside the rock*. Before §6 the name column was the only
     thing to its right and a 98px label could overhang it by a few pixels unnoticed; at 11px the
     outboard neighbour's label is wide enough to print straight through the formation names. So the
     outboard edge is now a hard edge, and a well whose label will not fit inside is counted with
     the ones already dropped for want of a row — the caption below reports both as unnamed for
     space, which is precisely what they are. */
  const placed = near.map((b) => {
    const x = view.xForKm(b.surfaceEastKm)
    const half = widthOf(b) / 2
    let row = -1
    const inside = x - half >= view.rockLeft && x + half <= view.rockRight
    if (inside) {
      for (let r = 0; r < ROWS; r++) {
        if (x - half > (rowEnd[r] ?? -Infinity)) {
          row = r
          rowEnd[r] = x + half
          break
        }
      }
    }
    return { bore: b, x, row, half }
  })

  const dropped = placed.filter((p) => p.row < 0).length

  return (
    <g>
      {/* The caption sits below the deepest row rather than at a fixed 44px: the rows are a row of
          11px type plus a gap, so a fixed offset that cleared the old 8px type is now exactly where
          the third row prints. */}
      {/* A short panel can run out of rock between the ground line and the break before the rows
          are done, so the caption is only printed when the rock is deep enough to hold it under the
          deepest row and still clear of the break line's own caption. */}
      {!view.compact && view.groundY + 20 + ROWS * SURFACE_ROW_H < view.breakY - 26 && (
        <text className={s.surfaceCap} x={view.rockLeft + 6} y={view.groundY + 20 + ROWS * SURFACE_ROW_H}>
          {offsets.length} NEARBY WELLS IN THE CUT
          {dropped > 0 ? ` · ${dropped} UNNAMED FOR SPACE` : ' · NAMED AT SURFACE'}
        </text>
      )}
      {placed.map(({ bore, x, row }) =>
        row < 0 ? null : (
          <g key={bore.id} onMouseEnter={onOver('bore', bore.id)} onMouseLeave={onOut}>
            <line className={s.surfaceLead} x1={x} x2={x} y1={view.groundY + 1} y2={view.groundY + 8 + row * SURFACE_ROW_H} />
            <text className={s.surfaceLabel} x={x} y={view.groundY + 15 + row * SURFACE_ROW_H} textAnchor="middle">
              {offsetLabel(bore)}
            </text>
          </g>
        ),
      )}
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* placement helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Break a label into lines no wider than `maxChars`.
 *
 * §6 sets a floor on the type, so a label that no longer fits cannot be made to fit by shrinking
 * it — it has to be made shorter in the other direction, and the honest way to do that is to put it
 * on two lines. The combined risk clusters are the reason this is needed: "POOR CEMENT · MUD LOSS +
 * 18%" is 27 characters of 11px display bold, which at the right edge of the rock reaches back
 * across the middle of the drawing and into the bit's own readout. Two lines halve that, and the
 * label still says all of it.
 *
 * The split is on a space. A last line is only pulled back up when it is a genuine stub — one short
 * token that would read as a label of its own — and only if the first line can take it. Merging
 * unconditionally is worse than not wrapping at all: "3,148 m MD · W-088" breaks as
 * "3,148 m MD ·" / "W-088", and joining the orphan back onto the head rebuilds the original
 * eighteen-character line, so the wrap silently did nothing to the one label that needed it.
 */
function wrapLabel(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  if (words.length < 2 || text.length <= maxChars) return [text]
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if (line && (line + ' ' + w).length > maxChars) {
      lines.push(line)
      line = w
    } else {
      line = line ? line + ' ' + w : w
    }
  }
  if (line) lines.push(line)
  const tail = lines[lines.length - 1] ?? ''
  if (lines.length > 1 && tail.length <= 4) {
    const head = lines[lines.length - 1 - 1] ?? ''
    if ((head + ' ' + tail).length <= maxChars + 4) {
      lines.pop()
      lines[lines.length - 1] = (head + ' ' + tail).trim()
    }
  }
  return lines.length ? lines : [text]
}

function ticks(view: SectionView) {
  const out: { md: number; y: number; major: boolean }[] = []
  for (let md = SECTION_TOP_MD; md <= view.floorMd; md += 100) out.push({ md, y: view.yForMd(md), major: true })
  return out
}

/** The chevrons a section convention uses for a depth discontinuity. */
function breakPath(view: SectionView): string {
  const n = Math.max(3, Math.round((view.rockRight - view.rockLeft) / 15))
  const step = (view.rockRight - view.rockLeft) / n
  const amp = 4.5
  let d = `M${view.rockLeft} ${view.breakY}`
  for (let i = 0; i < n; i++) {
    const x0 = view.rockLeft + i * step
    d += ` L${x0 + step / 2} ${view.breakY + (i % 2 === 0 ? amp : -amp)} L${x0 + step} ${view.breakY}`
  }
  return d
}

/**
 * One row per named band, at the depth of the band, spread so no two can land on each other.
 *
 * The row is the band's own mid-depth unless that is already taken, in which case it is pushed
 * down — the alternative, pushing some up, walks a label into the sky. A band that cannot be
 * placed in a narrow column is dropped rather than overprinted, because an unreadable name is
 * worse than no name: the tooltip still has it.
 */
function formationLabels(view: SectionView, layers: SectionLayer[], detail: boolean) {
  const compactCut = view.compact ? 4 : 7
  const named = layers.filter((l) => l.label)
  const shown = named
    .filter((l, i) => (view.compact ? !l.target && i >= 2 : true))
    .slice(0, detail ? 9 : compactCut + (layers.some((l) => l.target) ? 1 : 0))
  const ys = spread(
    shown.map((l) => view.yForLayer(l) + view.layerH(l) / 2),
    FORM_ROW_H,
    view.groundY + 8,
    view.height - 46,
  )
  return shown.map((layer, i) => ({ layer, y: ys[i] ?? 0 }))
}

/**
 * The three names the landing page is allowed, and how they are chosen.
 *
 * Picked rather than truncated, because the first seven bands are the compressed near-surface skin
 * and the first seven names of it would be seven readings of the same forty metres. The three
 * questions a reader has about a picture of a well are: what am I standing on, where is the water,
 * and what are they drilling for. So those are the three that get printed, and the full column
 * takes over when the reader asks for it.
 *
 * The same greedy spread as the full column, so neither set can print two names on one another —
 * and because the resting set leaves before the full one arrives, the two never share the column at
 * all. An absent band is not substituted for: the aquifer is named when the section has one, and the
 * landing page is two names rather than two-and-a-half.
 */
function restingLabels(view: SectionView, layers: SectionLayer[]) {
  const named = layers.filter((l) => l.label)
  const first = named[0]
  const water = named.find((l) => /aquifer|tipam/i.test(l.key) && !l.target)
  const target = named.find((l) => l.target)
  const picked = [first, water, target].filter((l): l is SectionLayer => Boolean(l))
  const ys = spread(
    picked.map((l) => view.yForLayer(l) + view.layerH(l) / 2),
    FORM_ROW_H,
    view.groundY + 8,
    view.height - 46,
  )
  return picked.map((layer, i) => ({ layer, y: ys[i] ?? 0 }))
}

function riskRows(model: SectionModel, view: SectionView) {
  const ys = spread(
    model.risks.map((r) => view.yForMd(r.fromMd) - 4),
    RISK_ROW_H,
    view.breakY + 6,
    view.axisBottomY - 2,
  )
  return model.risks.map((risk, i) => ({ risk, y: ys[i] ?? 0 }))
}

/* -------------------------------------------------------------------------- */
/* the inspector                                                               */
/* -------------------------------------------------------------------------- */

function resolvePick(pick: Pick | null, model: SectionModel): ReactNode {
  if (!pick) return null

  if (pick.kind === 'bore') {
    const b = model.bores.find((x) => x.id === pick.id)
    if (!b) return null
    return (
      <>
        <b className={s.inspectorTitle}>{b.id}</b>
        <span className={s.inspectorMeta}>
          {b.active
            ? `ACTIVE WELL · ${b.status}`
            : `OFFSET · ${b.distanceKm?.toFixed(1) ?? '—'} km · SIMILARITY ${b.similarity ?? '—'}`}
        </span>
        <span className={s.inspectorBody}>
          TD {fmt(b.tdMd)} m MD
          {b.hasLossEvents ? ' · LOSS HISTORY' : ''}
        </span>
        {b.lesson && <span className={s.inspectorBody}>{b.lesson}</span>}
      </>
    )
  }

  if (pick.kind === 'risk') {
    const r = model.risks.find((x) => x.riskId === pick.id)
    if (!r) return null
    return (
      <>
        <b className={s.inspectorTitle} style={{ color: RISK_INK[r.level] }}>
          {r.name} {r.probability}%
        </b>
        <span className={s.inspectorMeta}>
          {r.status} · {fmt(r.fromMd)}–{fmt(r.toMd)} m MD · {r.ahead >= 0 ? `${r.ahead} m AHEAD` : `${Math.abs(r.ahead)} m BEHIND`}
        </span>
        {r.evidenceSummary && <span className={s.inspectorBody}>{r.evidenceSummary}</span>}
      </>
    )
  }

  const e = model.bores.flatMap((b) => b.events).find((x) => x.id === pick.id)
  if (!e) return null
  return (
    <>
      <b className={s.inspectorTitle}>{e.title}</b>
      <span className={s.inspectorMeta}>
        {e.wellId} · {e.type} · {fmt(e.mdM)} m MD
        {e.aligned ? ' · ALIGNED ONTO THE ACTIVE BORE' : ' · IN ITS OWN BORE'}
      </span>
      <span className={s.inspectorBody}>{e.cause}</span>
      <span className={s.inspectorBody}>
        {e.action} · {e.nptHours} h NPT
      </span>
      <span className={s.inspectorMeta}>
        CONFIDENCE {e.confidence} · {e.documentId.toUpperCase()}
        {e.page ? ` P.${e.page}` : ''}
      </span>
    </>
  )
}
