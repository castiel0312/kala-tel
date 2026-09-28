import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Map as MapboxMap, type MapRef, type ViewState } from 'react-map-gl/mapbox'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Layer, PickingInfo } from 'deck.gl'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { attributionFor, basemapChoice, basemapId, degradeBasemap, ensureBasemap, MAP_STYLE, TERRAIN_EXAGGERATION_DEFAULT, TERRAIN_EXAGGERATION_STEPS } from './basemap'
import { isAuthError, MAPBOX_TOKEN, TOKEN_CONFIGURED, TOKEN_REQUIRED } from './token'
import { classify, FAULTS, webglAvailable, type MapFault } from './faults'
import { ORIGIN, kmToLngLat, lngLatToKm, type Km } from '../../lib/geo'
import { HazardStripe, LiveIndicator } from '../kit'
import s from './map.module.css'

/* ============================================================================
   MapCanvas — the NWIS spatial surface, on Mapbox GL JS.

   The map is Mapbox's. `react-map-gl/mapbox` owns the camera and the WebGL context, the style
   carries a real `raster-dem` source and Mapbox GL's own terrain drapes the ground onto it, and
   every NWIS layer is drawn by a deck.gl `MapboxOverlay` mounted *interleaved* — inside the
   map's own layer stack and the map's own GL context. That last part is what makes the 3D
   honest: the trajectories, the curtains and the structure contours are positioned by the same
   transform that positions the terrain, so a wellbore descends through draped ground instead of
   floating over a flat picture of it.

   Two camera modes, and the difference is more than a pitch angle:

   - **3D** — terrain on, camera pitched and rotatable, drag-rotate on so the well field can be
     orbited, and the depth/trajectory layers read as depth.
   - **2D** — camera flattened to north-up, rotation and terrain off, drag-rotate off. Every
     well marker and every operational layer stays: only the relief goes.

   Both transitions are flown, not cut, and the first user gesture cancels the flight so the map
   never fights the hand on the mouse.
   ========================================================================== */

export type MapMode = '2d' | '3d'

/**
 * Imperative camera control, for sections that put the view controls in their own chrome
 * instead of the map's. The map keeps ownership of the view state, so these are flights
 * through the same eased path the built-in buttons use — a scripted move, not a cut.
 */
export interface MapCameraApi {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  locate: () => void
  flyTo: (view: Partial<ViewState>, ms?: number) => void
  getView: () => ViewState
  /** `map.fitBounds`, with the padding that keeps a well clear of the inspector panel. */
  fitBounds: (bounds: [[number, number], [number, number]], opts?: { padding?: PaddingOptions; ms?: number }) => void
  /* The two exaggeration controls, for sections that put them in their own chrome. The map keeps
   * the state; the chrome only asks for a value. */
  setExaggeration: (v: number) => void
  setTerrainExaggeration: (v: number) => void
  getExaggeration: () => number
  getTerrainExaggeration: () => number
}

/** The subset of Mapbox's fit options this component hands through. */
export interface PaddingOptions {
  top: number
  bottom: number
  left: number
  right: number
}

export interface MapReadout {
  /** metres of vertical exaggeration applied to the trajectories */
  exaggeration: number
  depthRange: [number, number]
  /** Kilometre offsets from the section-wide `ORIGIN`, which is what the readout is for. */
  centreKm: Km
  zoom: number
  bearing: number
  pitch: number
  engine: string
  basemap: string
  /** what Mapbox GL reports for `getTerrain()`, so the HUD quotes the map and not the intent */
  terrain: string
  /** and the same fact as numbers, for controls that have to show a selected step */
  terrainOn: boolean
  terrainExaggeration: number
  mode: MapMode
  tokenConfigured: boolean
}

interface MapCanvasProps {
  layers?: Layer[]
  /**
   * Layers the *page* contributes, drawn through this map's own interleaved overlay.
   *
   * They go in the same overlay rather than in a second one on purpose: a separate overlay canvas
   * sits above the map's depth buffer, so its models would float over hills instead of standing on
   * them. One overlay, one GL context, one depth test.
   */
  extraDeckLayers?: Layer[]
  /**
   * Layers that must ignore the depth buffer, drawn by a second interleaved overlay.
   *
   * Mixed depth policy inside one overlay pass is what breaks the shared context, so the x-ray
   * geometry is kept alone in an overlay of its own. See the wiring below for what that costs.
   */
  xrayDeckLayers?: Layer[]
  children?: ReactNode
  /** rendered above the canvas but under `childrenAfter` — legend, pick plate, readout */
  childrenAfter?: ReactNode
  /** initial camera, in km offsets from the local origin unless the keys are lng/lat */
  initialViewState?: Partial<ViewState>
  viewState?: Partial<ViewState>
  onViewStateChange?: (vs: ViewState) => void
  onReadout?: (r: MapReadout) => void
  onPick?: (info: PickingInfo) => void
  /**
   * The Mapbox map itself, on load and again after every `style.load`.
   *
   * The map handle a section needs to mount its own native layers on, and to re-mount them when a
   * basemap switch throws the style away. `DEV` also parks it on `window.__nwisMap`; this callback
   * is the supported path, because a production build has no window handle and the section must
   * still work there.
   */
  onMapReady?: (map: mapboxgl.Map, styleEpoch: number) => void
  mode?: MapMode
  exaggeration?: number
  /**
   * The terrain's vertical exaggeration, in multiples of truth.
   *
   * Optional, and defaulted to the shared setting, because the honest exaggeration is a property
   * of what the reader is being shown: the corridor and depth screens stretch the ground to make
   * a trajectory read as depth, and a wellfield read from above wants close to real relief so the
   * rigs sit on the land rather than on a diagram of it. `TERRAIN_EXAGGERATION_STEPS` is offered
   * as the control set either way — a reader is allowed to disagree — but the starting point is
   * the caller's.
   */
  terrainExaggeration?: number
  depthRange?: [number, number]
  interactive?: boolean
  cursor?: string
  className?: string
  status?: 'live' | 'warn' | 'off' | 'connecting'
  label?: string
  /** km offsets from the local origin; the recentre button flies here */
  focus?: Km | null
  /**
   * The Mapbox style to draw. Switchable, so a section can offer satellite ↔ streets.
   *
   * The Mapbox style to draw. Switchable, so a section can offer satellite ↔ streets.
   *
   * Mapbox GL takes either a style URL or a style object, and the tokenless basemap is the
   * second kind, so the prop is as wide as the engine's own signature.
   *
   * Everything the caller added — the DEM source, the terrain, the deck overlay — is re-applied
   * from `style.load`, because `setStyle` replaces the whole style object and takes all of it.
   */
  mapStyle?: string | object
  /**
   * Withholds the exaggeration and recentre controls, for a section that puts them in one stacked
   * panel of its own. The state stays here; only the two rows of buttons move. The compass is kept:
   * it is a camera instrument, not a layer control, and it belongs to the map.
   */
  hideChrome?: boolean
  /** Receives the camera controls. Optional, so existing callers are unaffected. */
  cameraApi?: React.MutableRefObject<MapCameraApi | null>
}

const DEFAULT_VIEW: ViewState = {
  longitude: ORIGIN.lng,
  latitude: ORIGIN.lat,
  zoom: 12.7,
  // The brief for this platform is a pitched view, not a plan sheet: a trajectory is a 3D line
  // and it only reads as one from above and behind.
  pitch: 50,
  bearing: -24,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
}

/** Milliseconds for a scripted camera move. Long enough to read as a move, short enough to obey. */
const FLY_MS = 900

/**
 * How many tile errors before the map says the imagery has stopped.
 *
 * Low. A satellite basemap over a field this size asks for a lot of tiles at once, and on a
 * congested connection a handful failing and then succeeding is the normal shape of the thing — but
 * a map that is showing *no* ground has usually failed well past this, and the reader is looking at
 * a black frame with nothing to explain it.
 */
const TILE_FAULT_THRESHOLD = 4

/** The camera keys a flight interpolates. Everything else (padding) is held. */
const CAMERA_KEYS = ['longitude', 'latitude', 'zoom', 'bearing', 'pitch'] as const

/**
 * Smooth camera transitions.
 *
 * react-map-gl v8 has no transition props: `viewState` is authoritative and the map follows it.
 * So the flight lives here — one rAF loop, an eased interpolation of the camera keys, and a
 * cancel path that any pointer gesture takes. This is also what makes the 2D/3D switch legible:
 * the camera travels between the two presets instead of cutting, so the operator keeps their
 * place in the field while the relief comes up or goes away.
 */
function interpolateView(from: ViewState, to: ViewState, t: number): ViewState {
  const out = { ...to }
  for (const key of CAMERA_KEYS) out[key] = from[key] + (to[key] - from[key]) * t
  return out
}

/** Symmetric ease, so a flight accelerates away and settles into the destination. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Mapbox GL reads its token from the module, and Mapbox GL JS is the engine — not something this
 * file falls back from. The token is also what makes the engine draw at all, so the
 * `TOKEN_CONFIGURED` guard below is not a graceful degradation: without it the map is empty, and
 * the component says so on screen rather than leaving a white rectangle.
 */
if (TOKEN_CONFIGURED) mapboxgl.accessToken = MAPBOX_TOKEN


export function MapCanvas({
  layers = [],
  extraDeckLayers,
  xrayDeckLayers,
  children,
  childrenAfter,
  initialViewState,
  viewState: controlled,
  onViewStateChange,
  onReadout,
  onPick,
  onMapReady,
  mode = '3d',
  exaggeration: exaggerationProp = 1,
  terrainExaggeration: terrainExaggerationProp,
  depthRange = [0, 3400],
  interactive = true,
  cursor,
  className,
  status = 'off',
  label,
  focus,
  mapStyle,
  hideChrome,
  cameraApi,
}: MapCanvasProps) {
  /**
   * Which cartography to draw, and `null` until that is known.
   *
   * The map is not built before the token question has an answer, and that ordering is the whole
   * fix: a style that 401s and is then replaced by `setStyle` while it is still in flight cannot be
   * diffed, so Mapbox drops both and never says either is loaded — no `load`, no `style.load`, no
   * `isStyleLoaded`, and a frame stuck on the first thing it managed to draw. One `fetch` against
   * the style that is about to be requested costs a few hundred milliseconds and removes the whole
   * class of failure. See `ensureBasemap`.
   *
   * One-way after that, deliberately: a second failure of the same kind is handled in the error
   * handler, where the map has settled and a `setStyle` is safe.
   */
  const [choice, setChoice] = useState(() => null as ReturnType<typeof basemapChoice> | null)
  const degraded = useRef(false)
  useEffect(() => {
    void ensureBasemap().then(setChoice)
  }, [])
  /**
   * The cartography to draw, and the style to hand the renderer.
   *
   * The two are separate on purpose. `choice` is `null` for the few hundred milliseconds the token
   * question is outstanding, and the map is not built during that window — `ready` below is false,
   * so no `<Map>` exists to hold a style it might have to replace. Everything that is only *config*
   * — the attribution, the terrain range, the compass, the fault wording — reads `cartography`,
   * which is the intended choice while the answer is pending. It is never used to build anything.
   */
  const cartography = choice ?? basemapChoice()
  const ready = choice !== null
  /**
   * The style the renderer gets.
   *
   * Read from the store rather than from the caller, so that a caller holding a pre-probe snapshot
   * cannot hand back the style that has just been rejected. The `mapStyle` prop still wins, because
   * a section that brings its own cartography is entitled to draw it — it just cannot bring a stale
   * one.
   */
  const cartographyStyle = cartography[basemapId()]
  const [internal, setInternal] = useState<ViewState>(() => ({ ...DEFAULT_VIEW, ...initialViewState }))
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [loaded, setLoaded] = useState(false)
  /** Bumped on every `style.load`, so effects that own style state re-apply after a basemap switch. */
  const [styleEpoch, setStyleEpoch] = useState(0)
  // A 3 km well in a 2.5 km view is already steep at true scale, so that is the default and
  // the stretch is a deliberate, visible choice rather than a hidden default.
  const [exaggeration, setExaggeration] = useState(exaggerationProp)
  const [terrainExaggeration, setTerrainExaggeration] = useState(
    terrainExaggerationProp ?? TERRAIN_EXAGGERATION_DEFAULT,
  )

  /**
   * A caller that arrives with a different exaggeration is taken at its word.
   *
   * Keyed on the prop alone rather than the whole state, so a re-render with a stable value does
   * not yank the reader's own choice back — the control and the prop are then free to disagree,
   * which is the point of having a control.
   */
  const firstExaggeration = useRef(true)
  useEffect(() => {
    if (firstExaggeration.current) {
      firstExaggeration.current = false
      return
    }
    if (typeof terrainExaggerationProp === 'number') setTerrainExaggeration(terrainExaggerationProp)
  }, [terrainExaggerationProp])
  const [terrainOn, setTerrainOn] = useState(mode === '3d')
  const [terrainLabel, setTerrainLabel] = useState('loading DEM')
  /**
   * The one way this map has of saying it has nothing to draw, rather than drawing nothing.
   *
   * A `MapFault` rather than a boolean, because "the map is empty" is never a useful thing to tell
   * a reader and "the token was rejected" is. Every route to an empty frame — no WebGL, no token,
   * a rejected token, an unresolvable style, tiles that stopped arriving — lands here, and the
   * first one to happen is the one that is shown.
   */
  const [fault, setFault] = useState<MapFault | null>(null)
  /**
   * Tile faults are counted rather than shown on the first one.
   *
   * A single missing tile is a normal, self-healing event on a satellite basemap and a page that
   * declares itself broken over one is worse than a page that quietly carries on. So tiles get a
   * threshold, and the other faults do not: a rejected token or a dead style does not recover.
   */
  const tileFaults = useRef(0)
  const wrap = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const overlay = useMemo(() => new MapboxOverlay({ interleaved: true, layers: [] }), [])
  const xrayOverlay = useMemo(() => new MapboxOverlay({ interleaved: true, layers: [] }), [])
  const firstMode = useRef(true)
  const flight = useRef<{ from: ViewState; to: ViewState; start: number; ms: number } | null>(null)
  const raf = useRef(0)
  const live = useRef<ViewState>(internal)

  const viewState = { ...internal, ...controlled } as ViewState
  live.current = viewState

  /* -------------------------------------------------------------- faults --- */

  /**
   * Ask whether there is a WebGL context at all, before asking Mapbox for one.
   *
   * Mapbox GL throws from its own constructor when it cannot get a context, and what it says is
   * about a GL detail rather than about the browser's acceleration settings — so the check happens
   * first and the map is never asked, rather than the section dying inside a vendor's stack with
   * a message about something else.
   */
  useEffect(() => {
    if (!webglAvailable()) setFault(FAULTS.webgl)
  }, [])

  /* ------------------------------------------------------------ camera --- */

  const cancelFlight = useCallback(() => {
    flight.current = null
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = 0
  }, [])

  /** Eases the camera to `next` over `ms`. A gesture anywhere on the map cuts it short. */
  const fly = useCallback(
    (next: Partial<ViewState>, ms = FLY_MS) => {
      cancelFlight()
      const from = live.current
      const to = { ...from, ...next }
      if (ms <= 0) {
        setInternal(to)
        return
      }
      flight.current = { from, to, start: performance.now(), ms }
      const step = (now: number) => {
        const f = flight.current
        if (!f) return
        const t = Math.min(1, (now - f.start) / f.ms)
        setInternal(interpolateView(f.from, f.to, easeInOutCubic(t)))
        if (t < 1) raf.current = requestAnimationFrame(step)
        else {
          flight.current = null
          raf.current = 0
        }
      }
      raf.current = requestAnimationFrame(step)
    },
    [cancelFlight],
  )

  useEffect(() => cancelFlight, [cancelFlight])

  const onMove = useCallback(
    (e: { viewState: ViewState; srcEvent?: unknown }) => {
      // A gesture outranks a flight in progress. react-map-gl tags real input with `srcEvent`,
      // so the map never fights the hand on the mouse.
      if (e.srcEvent) cancelFlight()
      if (!controlled) setInternal(e.viewState)
      onViewStateChange?.(e.viewState)
    },
    [controlled, onViewStateChange, cancelFlight],
  )

  /**
   * Terrain is the one piece of the map that the style cannot own, because the DEM source is
   * added after the style is parsed and the exaggeration then has to follow it. This is the
   * single place that touches it.
   */
  const applyTerrain = useCallback((on: boolean, ex: number) => {
    const map = mapRef.current?.getMap()
    /**
     * The style has to be *parsed* before anything can be added to it, and `getStyle()` throwing is
     * exactly that question. `isStyleLoaded()` is a different and much later one — it also waits for
     * tiles — and using it here meant the terrain was applied only if the basemap happened to be
     * fully cached, which is a property of the reader's network rather than of the code.
     */
    if (!map || !styleParsed(map)) return
    const { id, source, name } = cartography.dem
    if (!map.getSource(id)) map.addSource(id, source as never)
    map.setTerrain(on ? { source: id, exaggeration: ex } : null)
    setTerrainLabel(on ? `${name} ×${ex}` : 'flat')
  }, [choice])

  useEffect(() => {
    const preset = mode === '3d' ? VIEWS.threeD : VIEWS.plan
    setTerrainOn(mode === '3d')
    if (firstMode.current) {
      // The opening camera arrives with the map, so there is nothing to fly from.
      firstMode.current = false
      setInternal((v) => ({ ...v, ...preset }))
    } else {
      fly(preset, 1000)
    }
  }, [mode, fly])

  useEffect(() => {
    applyTerrain(terrainOn, terrainExaggeration)
  }, [terrainOn, terrainExaggeration, loaded, styleEpoch, applyTerrain])

  /**
   * The live terrain settings, readable from the long-lived `style.load` listener below.
   *
   * Re-attaching that listener on every exaggeration click would be simpler and would also mean a
   * re-mount window in which a `style.load` can be missed. A ref is the smaller surface: the
   * listener is attached once per map and reads the current values when it fires.
   */
  const terrainOnRef = useRef(terrainOn)
  terrainOnRef.current = terrainOn
  const terrainExaggerationRef = useRef(terrainExaggeration)
  terrainExaggerationRef.current = terrainExaggeration
  const applyTerrainRef = useRef(applyTerrain)
  applyTerrainRef.current = applyTerrain
  const onMapReadyRef = useRef(onMapReady)
  onMapReadyRef.current = onMapReady
  const styleEpochRef = useRef(0)
  styleEpochRef.current = styleEpoch

  /**
   * Everything that has to survive a style replacement, wired to the map *instance*.
   *
   * Deliberately not gated on the map's `load` event, because `load` is a promise Mapbox makes
   * about the *first* style and keeps forever: if that style 401s — which is what a rejected token
   * does, and the fallback `setStyle` that follows is a second style — `load` never fires at all.
   * Gating on it meant a map whose token was dead rendered imagery but never told anyone the style
   * was ready, so the caller's layers were never mounted and the terrain was never re-applied. The
   * symptom was a working basemap with an empty wellfield, which reads as "the wells are missing"
   * rather than as "the event never came".
   *
   * `style.load` fires for *every* style, so this is the right signal; the effect has no dependency
   * array and the `wired` ref makes it attach exactly once per map.
   */
  const wired = useRef<mapboxgl.Map | null>(null)
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || wired.current === map) return
    wired.current = map
    setLoaded(true)
    /**
     * A handle on the map itself, in development builds only.
     *
     * A Mapbox surface has no DOM of its own to inspect: the canvas is opaque, the layers live in
     * a style object, and the only way to ask the renderer what it is actually doing — where the
     * camera is, which layers survived the last `setStyle`, how high the ground is under a well —
     * is to hold the map. Every one of those questions has a way of looking like something else
     * from outside (a black frame is a token fault, a style fault, a height fault or a container
     * that collapsed to nothing), so the way to settle them is to stop guessing.
     *
     * Stripped from production by the `DEV` guard, so this is not a debug backdoor in a build. The
     * supported way for a *section* to reach the map is `onMapReady`.
     */
    if (import.meta.env.DEV) {
      ;(window as unknown as { __nwisMap?: mapboxgl.Map }).__nwisMap = map
    }
    /**
     * Has this *particular* style object been handed over yet?
     *
     * Identity, not `isStyleLoaded` and not `style.load`. Both of the usual signals are wrong here,
     * and wrong in the way that produces an empty map: `style.load` fires while the map is still being
     * constructed, before the ref is wired, so a listener attached afterwards never hears it; and
     * `isStyleLoaded()` stays false for as long as tiles are streaming, which is most of a slow
     * basemap's life, so waiting on it means waiting for the network rather than for the style.
     * `getStyle()` is the honest question — it throws until the style is parsed and returns the same
     * object until it is replaced — so comparing object identity gives exactly one notification per
     * style: one for the first, and one more for every basemap switch.
     */
    let notified: object | null = null
    const onStyleLoad = () => {
      let style: object
      try {
        style = map.getStyle()
      } catch {
        // Not parsed yet. The poll below will come back to it.
        return
      }
      if (style === notified) return
      notified = style
      styleEpochRef.current += 1
      setStyleEpoch(styleEpochRef.current)
      applyTerrainRef.current(terrainOnRef.current, terrainExaggerationRef.current)
      onMapReadyRef.current?.(map, styleEpochRef.current)
    }
    map.on('style.load', onStyleLoad)
    /**
     * Cover the window before the map exists: the style is parsed and set while the ref is still
     * being wired, so the event has already been and gone. Cheap, and it stops as soon as it lands.
     */
    const poll = setInterval(onStyleLoad, 150)
    const stopPolling = setInterval(() => {
      if (notified) {
        clearInterval(poll)
        clearInterval(stopPolling)
      }
    }, 150)
    onStyleLoad()
    return () => {
      clearInterval(poll)
      clearInterval(stopPolling)
      map.off('style.load', onStyleLoad)
    }
  })

  /* ------------------------------------------------------------- sizing --- */

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      /**
       * Tell Mapbox the canvas changed size, which is the half that was missing.
       *
       * Feeding the new size into React state re-renders this component, and that is not the same
       * thing: Mapbox sizes its own `canvas` element from the container's box at the moment `resize()`
       * is called, and it does not watch that box. A WebGL canvas that is still the old size inside a
       * new one is stretched, letterboxed, or blank depending on the GPU, and the map reports no error
       * and fires no event — there is nothing to catch, which is why the symptom reads as "the map is
       * broken" rather than "the map was not told". This fires on the first observation too, because
       * the map is created against a container that has not been laid out yet on the first frame.
       */
      mapRef.current?.getMap()?.resize()
      const { width, height } = entry.contentRect
      setSize((s0) => (s0.width === width && s0.height === height ? s0 : { width, height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ------------------------------------------------------------- deck.gl --- */

  /** One overlay, the map's own props first and the page's layers appended. */
  const allLayers = useMemo(() => (extraDeckLayers?.length ? [...layers, ...extraDeckLayers] : layers), [layers, extraDeckLayers])

  useEffect(() => {
    const q = import.meta.env.DEV ? new URLSearchParams(location.search) : null
    const f = q?.get('deckfilter')
    overlay.setProps({ layers: q?.has('nodecklayers') ? [] : f ? allLayers.filter((l) => String(l.id).includes(f)) : allLayers })
  }, [overlay, allLayers])

  /**
   * The x-ray pass, in an overlay of its own.
   *
   * One interleaved overlay holds one depth policy. A layer that turns the depth test off and a
   * layer that leaves it on cannot share a pass: the frame comes out blank, which is the worst
   * possible symptom because every style check still passes — the sources are loaded, the layers are
   * in the style, `queryRenderedFeatures` answers — and only the pixels are wrong. Two overlays, one
   * uniform policy each, and the map keeps drawing.
   */
  useEffect(() => {
    const q2 = import.meta.env.DEV ? new URLSearchParams(location.search) : null
    xrayOverlay.setProps({ layers: q2?.has('noxray') ? [] : (xrayDeckLayers ?? []) })
  }, [xrayOverlay, xrayDeckLayers])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!interactive || !map) {
      overlay.setProps({ onClick: undefined, onHover: undefined })
      return
    }
    overlay.setProps({
      onClick: (info) => onPick?.(info),
      onHover: (info) => onPick?.(info),
      getCursor: ({ isDragging, isHovering }: { isDragging: boolean; isHovering: boolean }) =>
        cursor ?? (isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'),
    })
  }, [overlay, onPick, cursor, interactive])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!loaded || !map) return
    const control = overlay as unknown as mapboxgl.IControl
    return () => {
      map.removeControl(control)
    }
  }, [overlay, loaded])

  /**
   * Mapbox logs its own errors, and the token failure is the one error the UI already explains.
   * It is caught here so it is not also reported as an unexplained renderer fault; anything else
   * is passed straight through — and, if it is one of the faults the map can name, also turned
   * into a notice, because the alternative is a black frame with a console message nobody reading
   * the page will ever see.
   */
  const onMapError = useCallback(
    (e: mapboxgl.ErrorEvent) => {
      const kind = classify(e.error)
      const map = mapRef.current?.getMap()
      /**
       * A 401 only matters if it stopped the map drawing.
       *
       * The SDK pings Mapbox's session endpoint with the same token whether or not it works, so a
       * rejected token produces a 401 *after* the fallback has already loaded imagery, terrain and
       * wells. Treating that as a fault hangs a "Mapbox access token required" notice over a
       * perfectly good map, and the notice then covers the controls. The question worth asking is
       * not "did something 401" but "is there a style on screen" — so that is what is asked.
       */
      const auth = isAuthError(e.error)
      /**
       * A 401 only matters if it stopped the map drawing.
       *
       * Stated as a property of the *cartography* rather than of the history: when the open basemap
       * is in use there is no Mapbox request left that can affect the frame, so a 401 from any of
       * them — the SDK pings its session endpoint with the same dead token, at times of its own
       * choosing, including mid-switch — is noise. Asking `isStyleLoaded()` instead made the answer
       * depend on whether the tiles happened to have finished, which during a basemap switch they
       * had not, so a telemetry ping could hang a "token required" notice over a working map and
       * cover the controls with it.
       */
      if (auth && (!cartography.token || degraded.current)) return
      if (auth && map && styleParsed(map)) return
      if (auth) {
        /**
         * A token that cannot read Mapbox's styles, retired on the engine's own evidence.
         *
         * Every Mapbox-hosted style load ends in a 401 here, and each one is a black frame: the
         * style never arrives, so there is no imagery, no terrain, and no deck.gl context to draw
         * the wells into. Falling back once — to ESRI imagery over open Terrain Tiles, which needs
         * no token at all — turns a dead credential into a working map. The guard is what makes
         * this safe: one attempt, ever, and only for a token that was configured in the first
         * place, so a `setStyle` that fails the same way cannot loop.
         */
        if (cartography.token && !degraded.current) {
          degraded.current = true
          setFault(null)
          setChoice(degradeBasemap())
          return
        }
        setFault(FAULTS.auth)
        return
      }
      if (kind === 'tiles') {
        tileFaults.current += 1
        if (tileFaults.current >= TILE_FAULT_THRESHOLD) setFault(FAULTS.tiles)
        return
      }
      if (kind === 'style') setFault(FAULTS.style)
      console.error('Mapbox GL:', e.error)
    },
    [cartography.token],
  )

  /**
   * The map's own `load`, kept only for the first paint.
   *
   * Everything a section needs is on `style.load` now, which fires for every style including the
   * one that replaced a failed first attempt — see the wiring effect above. This is here for the
   * terrain the very first style needs, and it is not the handshake.
   */
  const onLoad = useCallback(() => {
    setLoaded(true)
    applyTerrain(terrainOn, terrainExaggeration)
  }, [applyTerrain, terrainOn, terrainExaggeration])

  /* ------------------------------------------------------------ readout --- */

  // The readout is a camera status line, so it fires on camera moves and nothing else. Depending
  // on the `depthRange` array would re-run this on every parent render and loop.
  const [rangeFrom, rangeTo] = depthRange
  const readoutKey = [
    viewState.longitude.toFixed(5),
    viewState.latitude.toFixed(5),
    viewState.zoom.toFixed(3),
    viewState.bearing.toFixed(2),
    viewState.pitch.toFixed(2),
    exaggeration,
    terrainLabel,
    terrainOn,
    terrainExaggeration,
    mode,
    rangeFrom,
    rangeTo,
  ].join('|')
  const lastReadout = useRef('')

  useEffect(() => {
    if (lastReadout.current === readoutKey) return
    lastReadout.current = readoutKey
    onReadout?.({
      exaggeration,
      depthRange: [rangeFrom, rangeTo],
      centreKm: lngLatToKm([viewState.longitude, viewState.latitude]),
      zoom: viewState.zoom,
      bearing: viewState.bearing,
      pitch: viewState.pitch,
      engine: cartography.engine,
      basemap: cartography.source,
      terrain: terrainLabel,
      terrainOn,
      terrainExaggeration,
      mode,
      tokenConfigured: TOKEN_CONFIGURED,
    })
  }, [readoutKey, onReadout, exaggeration, rangeFrom, rangeTo, terrainLabel, terrainOn, terrainExaggeration, mode, viewState, choice])

  /* -------------------------------------------------------------- chrome --- */

  const recentre = useCallback(() => {
    const [lng, lat] = kmToLngLat(focus ?? [0, 0])
    fly({ longitude: lng, latitude: lat, ...(mode === '3d' ? VIEWS.threeD : VIEWS.plan) })
  }, [fly, focus, mode])

  const dueNorth = useCallback(() => {
    if (Math.abs(viewState.bearing) < 0.5) return
    fly({ bearing: 0 })
  }, [fly, viewState.bearing])

  useEffect(() => {
    if (!cameraApi) return
    const clamp = (z: number) => Math.max(1, Math.min(19, z))
    cameraApi.current = {
      zoomIn: () => fly({ zoom: clamp(live.current.zoom + 0.6) }, 320),
      zoomOut: () => fly({ zoom: clamp(live.current.zoom - 0.6) }, 320),
      reset: () => recentre(),
      locate: () => recentre(),
      flyTo: (v, ms) => fly(v, ms),
      getView: () => live.current,
      /**
       * Handed to Mapbox rather than computed here, because the padding is the whole point: a
       * 5 km ring that fills the frame is a circle behind the inspector, not a radius the reader
       * can see. Mapbox's move event then resyncs `live.current` through `onMove`, so the next
       * flight starts from where the fit actually put the camera.
       */
      fitBounds: (bounds, opts) => {
        const map = mapRef.current?.getMap()
        if (!map) return
        cancelFlight()
        map.fitBounds(mapboxgl.LngLatBounds.convert(bounds), {
          padding: opts?.padding ?? { top: 0, bottom: 0, left: 0, right: 0 },
          ...(opts?.ms ? { duration: opts.ms } : {}),
          maxZoom: 15.5,
          /**
           * A fit that forgets the angle turns the map into a plan sheet.
           *
           * `fitBounds` takes the camera's *current* pitch and bearing, and hands the result to
           * `onMove`, which writes it into the view state this component then controls the map
           * with — so one fit with no angle collapses a 3D read of the field into a top-down one,
           * and the next fit inherits the collapse. The angle is passed explicitly from the mode
           * rather than read back, so a radius change cannot change what kind of map this is.
           */
          pitch: mode === '3d' ? VIEWS.threeD.pitch : 0,
          bearing: mode === '3d' ? VIEWS.threeD.bearing : 0,
        })
      },
      setExaggeration: (v) => setExaggeration(v),
      setTerrainExaggeration: (v) => setTerrainExaggeration(v),
      getExaggeration: () => exaggeration,
      getTerrainExaggeration: () => terrainExaggeration,
    }
    return () => {
      cameraApi.current = null
    }
  }, [cameraApi, fly, recentre, cancelFlight, exaggeration, terrainExaggeration, mode])

  const threeD = mode === '3d'
  /**
   * A missing token is a fault, not a separate branch: it is the same empty frame with a different
   * cause, and `TOKEN_REQUIRED` is already the right shape. It is kept in place of the generic
   * wording because it names the exact variable to set, which is the one thing an operator needs.
   */
  const notice: MapFault | null = fault ?? (TOKEN_CONFIGURED ? null : TOKEN_REQUIRED)
  const blocked = notice !== null

  return (
    <div ref={wrap} className={[s.frame, className].filter(Boolean).join(' ')}>
      {ready && (
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={TOKEN_CONFIGURED ? MAPBOX_TOKEN : undefined}
        onError={onMapError}
        mapStyle={(mapStyle ?? cartographyStyle) as never}
        viewState={{ ...viewState, ...size }}
        onMove={onMove as never}
        onLoad={onLoad}
        attributionControl={false}
        // Rotation is the 3D mode's privilege. 2D is north-up and unrotatable, which is what
        // makes a plan sheet a plan sheet.
        dragRotate={interactive && threeD}
        pitchWithRotate={interactive && threeD}
        touchPitch={interactive && threeD}
        touchZoomRotate={interactive && threeD}
        dragPan={interactive}
        scrollZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        maxPitch={threeD ? 70 : 0}
        cursor={cursor}
        style={{ position: 'absolute', inset: 0 }}
        /**
         * Keep the drawing buffer, in development builds only.
         *
         * A WebGL canvas made without this is cleared as soon as the frame is composited, which
         * means the map can be *drawing correctly* and still be impossible to look at: a screenshot
         * of it, a `toDataURL`, a `drawImage` into a 2D context — all return black. That is the worst
         * possible failure to debug, because it is indistinguishable from a black map, and it is why
         * a check that samples the map's pixels is worth the memory in a build where somebody is
         * going to run one. Production pays nothing: the flag is compiled out with the rest of the
         * development-only code, and a reader's browser never holds the buffer.
         */
        preserveDrawingBuffer={import.meta.env.DEV}
      />
      )}

      {/* labels the map at all times, because a screenshot of this is worthless without it */}
      <div className={s.hud}>
        <span className={s.hudTag}>
          <LiveIndicator state={status} onBlack label={label ?? (status === 'live' ? 'live' : 'demo data')} />
        </span>
        <span className={s.hudTag}>{MAP_STYLE.engine}</span>
        <span className={s.hudTag}>z{viewState.zoom.toFixed(1)}</span>
        <span className={s.hudTag}>
          {viewState.pitch.toFixed(0)}° pitch · {bearingLabel(viewState.bearing)}
        </span>
        <span className={[s.hudTag, threeD ? s['hudTag--live'] : ''].filter(Boolean).join(' ')}>
          {threeD ? `terrain ${terrainLabel}` : 'terrain flat · 2D'}
        </span>
      </div>

      {!loaded && !blocked && (
        <div className={s.loading}>
          <HazardStripe size="thin" />
          <span>Loading {MAP_STYLE.label} basemap and terrain</span>
        </div>
      )}

      {/* Mapbox GL JS draws nothing without a valid token — not the basemap, not the terrain,
          and not the interleaved deck.gl layers either, since they share the same GL context. The
          same empty frame comes from a missing WebGL context, a rejected token, a style that will
          not resolve and tiles that stopped arriving, so all of them report here rather than
          leaving a black rectangle that reads as a rendering bug. */}
      {notice && (
        <div className={s.tokenNotice} role="status">
          <HazardStripe size="thin" />
          <strong>{notice.title}</strong>
          <span>{notice.body}</span>
          <code>{notice.hint}</code>
        </div>
      )}

      <div className={s.overlay}>{children}</div>
      {childrenAfter}

      {/* The 3D chrome only appears where it means something: in 2D there is no bearing to
          correct, no exaggeration to stretch and no terrain to lie about. The 2D/3D switch
          itself lives in the panel head, one per screen, so the map never carries a second one.
          It is also withheld while the token notice is up, so the map never offers controls that
          cannot reach a renderer. */}
      {threeD && !blocked && (
        <button type="button" className={s.compass} onClick={dueNorth} title="Bearing 0° — north up" aria-label="Reset bearing to north">
          <span className={s.compassRose} style={{ transform: `rotate(${-viewState.bearing}deg)` }}>
            <span className={s.compassN}>N</span>
          </span>
        </button>
      )}

      {/* The layer controls, on the other hand, are withheld whole: a section that has put them in
          its own panel must not have a second copy here, or the map carries two of every control
          and the reader cannot tell which one owns the state. */}
      {threeD && !blocked && !hideChrome && (
        <>
          <div className={s.terrain}>
            <span className={s.terrainK}>terrain</span>
            {TERRAIN_EXAGGERATION_STEPS.map((v) => (
              <button
                key={v}
                type="button"
                className={[s.terrainBtn, terrainExaggeration === v ? s['terrainBtn--on'] : ''].filter(Boolean).join(' ')}
                onClick={() => setTerrainExaggeration(v)}
                aria-pressed={terrainExaggeration === v}
                title={`Terrain vertical exaggeration ${v}×`}
              >
                {v}×
              </button>
            ))}
          </div>

          <div className={s.vertical}>
            <span className={s.verticalK}>trajectory</span>
            {[1, 2, 5, 10].map((v) => (
              <button
                key={v}
                type="button"
                className={[s.verticalBtn, exaggeration === v ? s['verticalBtn--on'] : ''].filter(Boolean).join(' ')}
                onClick={() => setExaggeration(v)}
                aria-pressed={exaggeration === v}
                title={`Trajectory vertical exaggeration ${v}×`}
              >
                {v}×
              </button>
            ))}
          </div>
        </>
      )}

      {!hideChrome && (
        <button
          type="button"
          className={s.recentre}
          onClick={recentre}
          title={focus ? 'Recentre on the wellfield' : 'Recentre on the local origin'}
          aria-label="Recentre the camera"
        >
          ⊙
        </button>
      )}

      <div className={s.attribution}>{attributionFor(cartography)}</div>
    </div>
  )
}

/**
 * Is there a parsed style to modify?
 *
 * `getStyle()` throws until the style is parsed, and succeeds the moment one is — which is the
 * question "can I add a source yet", asked of the only object that knows.
 */
function styleParsed(map: mapboxgl.Map): boolean {
  try {
    map.getStyle()
    return true
  } catch {
    return false
  }
}

export function effectLabel(ex: number): string {
  if (ex >= 1000) return `${Math.round(ex / 1000)}km`
  return `${ex}×`
}

/** The eight points of the compass, indexed by `Math.round(bearing / 45) % 8`. */
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/** Compass text for a bearing: the cardinals an operator would actually say out loud. */
export function bearingLabel(bearing: number): string {
  const norm = ((bearing % 360) + 360) % 360
  if (norm < 0.5 || norm > 359.5) return 'N'
  return `${CARDINALS[Math.round(norm / 45) % 8]} ${norm.toFixed(0)}°`
}

/** Standard camera presets, so every spatial screen opens from a recognisable angle. */
export const VIEWS = {
  /** 2D: north-up, no pitch, no rotation. A plan sheet. */
  plan: { pitch: 0, bearing: 0, zoom: 12.6 },
  /** 3D: pitched and rotated, so the field can be orbited and the trajectories read as depth. */
  threeD: { pitch: 50, bearing: -24, zoom: 12.7 },
  /** A section look, for the corridor screens: square-on to the azimuth, still pitched. */
  section: { pitch: 38, bearing: -90, zoom: 13.2 },
} satisfies Record<string, Partial<ViewState>>
