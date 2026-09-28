import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Layer } from '@deck.gl/core'
import type { Map as MapboxMap, MapMouseEvent as MapboxMapMouseEvent } from 'mapbox-gl'
import { api, qk } from '../../api/client'
import { LazyMapCanvas as MapCanvas } from '../../components/map/LazyMapCanvas'
import type { MapCameraApi, MapMode, MapReadout } from '../../components/map/MapCanvas'
import { TERRAIN_EXAGGERATION_STEPS } from '../../components/map/basemap'
import { useBasemapChoice, useBasemapId } from '../../components/map/useBasemap'
import { setBasemap as storeBasemap } from '../../components/map/basemap'
import { Button, CameraBar, Chip, Legend, LegendItem, RiskChip, Segmented, SimilarityBar } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { fmtInt, fmtKM } from '../../lib/format'
import { Section } from '../Section'
import { useNearViewport } from '../hooks'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import {
  BASE_RING_RADII_KM,
  circleBounds,
  DEMO_ANCHOR,
  DEFAULT_RADIUS_KM,
  loadWellfield,
  RADIUS_STEPS_KM,
  REFERENCE_ID,
  riskZoneFrom,
  buildWellLayerData,
  type WellLayerData,
} from '../../features/map3d/wellData'
import { ALL_VISIBLE, mountWellLayers, NWIS, setWellLabelFont, setWellLayerVisibility, setWellIconFadedModels, updateWellLayerData, type WellLayerVisibility } from '../../features/map3d/wellLayers'
import { buildRigScene, rigBoreholeLayer } from '../../features/map3d/rig3d'
import { releaseWellModels, retainWellModels, type WellModelUrls } from '../../features/map3d/wellModels'
import { formatM, isRelevant } from '../../features/map3d/types'
import s from '../sections.module.css'

const sec = SEC.map
const RADII = RADIUS_STEPS_KM.map(String)

/** The opening camera. A wellfield is read from above and behind, never from the side. */
const OPEN_VIEW = { zoom: 13.2, pitch: 50, bearing: -24 } as const

/** The map's own trajectory steps, quoted here so the panel and the map cannot offer different ones. */
const EXAGGERATION_STEPS = [1, 2, 5, 10] as const

/**
 * Fit padding. The right inset is the inspector: a radius fitted edge-to-edge is a circle with its
 * east side hidden behind a card, which is the exact thing the reader came here to see.
 */
const FIT_PADDING = { top: 80, bottom: 80, left: 80, right: 400 } as const

type BasemapKey = 'satellite' | 'streets'

/**
 * 03 · The wellfield map.
 *
 * The map is Mapbox GL's, and the flat map is Mapbox's too: the wells, the rings, the paths, the
 * risk zone, the haloes and the labels are all Mapbox style layers on their own GeoJSON sources.
 * That is not a stylistic preference. The previous build drew them as deck.gl layers interleaved
 * inside the same map, which means the map's terrain depth-tested them — flat geometry at `z = 0`
 * under 3× terrain is under the ground, so the whole wellfield was correctly rendered and
 * completely invisible. Native layers composite in screen space and cannot be buried by the
 * terrain that is drawn under them.
 *
 * The 3D rigs are the one thing that *should* be depth-tested, because they stand on the ground, so
 * they go through the interleaved overlay and query their own height from the map.
 *
 * Selection is shared: clicking a well here is the same selection the nearby-well section, the
 * corridor, the graph and the document section all read.
 */
export function MapSection() {
  const { wellId, filters, setFilter, resetFilters, selectedWellId, selectWell, goTo, openDocument } = useNwis()
  const { ref: stageRef, near } = useNearViewport<HTMLDivElement>()
  /**
   * The satellite ↔ streets pair comes from the resolved basemap, not from a constant.
   *
   * A literal style URL here would ask Mapbox for a style on a build whose token does not work,
   * which is how the streets button came to be the one control that produced an empty frame. The
   * hook also means the pair is Mapbox's own on a working token and keyless imagery without one,
   * so the toggle means the same thing in both configurations.
   */
  const choice = useBasemapChoice()

  const [camera, setCamera] = useState<MapMode>('3d')
  /** Written to the store, which owns it: see `basemapId` in `basemap.ts`. */
  const basemap = useBasemapId()
  const setBasemap = useCallback((id: BasemapKey) => storeBasemap(id), [])
  const [readout, setReadout] = useState<MapReadout | null>(null)
  const [showRings, setShowRings] = useState(true)
  const [showRisk, setShowRisk] = useState(true)
  const [showTrajectory, setShowTrajectory] = useState(true)
  const [map, setMap] = useState<MapboxMap | null>(null)
  /** Bumped by the map on every `style.load`, so a basemap switch re-runs the effects that own
   * style state — the map object itself is unchanged by a style replacement. */
  const [styleEpoch, setStyleEpoch] = useState(0)
  const [rigs, setRigs] = useState<Layer[]>([])
  const [rigError, setRigError] = useState<string | null>(null)
  const [terrainRev, setTerrainRev] = useState(0)
  const [zoom, setZoom] = useState<number>(OPEN_VIEW.zoom)
  const [models, setModels] = useState<WellModelUrls | null>(null)
  const [faded, setFaded] = useState<string[]>([])
  const cameraApi = useRef<MapCameraApi | null>(null)

  const radiusKm = Number(filters.radiusKm) || DEFAULT_RADIUS_KM

  /**
   * The map draws the demo wellfield file, not the API's offsets.
   *
   * `public/data/wellfield-demo.geojson` is the same ten wells with both absolute positions
   * already projected — the wellhead and the point its bore reaches at the reference bit depth.
   * The API carries kilometre offsets and no absolute position at all, so every position on this
   * map would have to be re-projected through `ORIGIN` to be drawn, which is where the previous
   * build put the field 72 km from where it belonged. The API still supplies everything the card
   * quotes: the similarity breakdown, the factors, the events and the lessons.
   */
  const wellfield = useQuery({ queryKey: ['wellfield', 'demo'], queryFn: () => loadWellfield(), staleTime: Infinity, gcTime: Infinity })

  const risks = useQuery({
    queryKey: qk.risks(wellId ?? ''),
    queryFn: () => api.risks(wellId as string),
    enabled: Boolean(wellId),
    staleTime: 60_000,
  })

  const wells = useMemo(() => wellfield.data ?? [], [wellfield.data])
  const riskZone = useMemo(() => riskZoneFrom(risks.data), [risks.data])
  /** The card is the reference well until an offset is picked, and `Esc` puts it back. */
  const selectedId = selectedWellId ?? REFERENCE_ID
  const selected = wells.find((w) => w.id === selectedId) ?? null
  const isReference = !selected || selected.role === 'reference'

  const layerData: WellLayerData | null = useMemo(
    () => (wells.length ? buildWellLayerData(wells, { radiusKm, selectedId, risk: riskZone }) : null),
    [wells, radiusKm, selectedId, riskZone],
  )

  const detail = useQuery({
    queryKey: qk.offset(wellId ?? '', selectedId),
    queryFn: () => api.offset(wellId as string, selectedId),
    /* The reference well is not an offset: the API has no `/offsets/OIL-WELL-104`, and asking for
     * one is a guaranteed 404 in the default state of the page. */
    enabled: Boolean(wellId) && !isReference,
  })
  const firstEvent = detail.data?.events[0]
  const factors = detail.data?.similarityFactors

  /* --------------------------------------------------------- map plumbing --- */

  /** The latest data, readable from a map callback that must not re-subscribe on every change. */
  const dataRef = useRef<WellLayerData | null>(null)
  dataRef.current = layerData
  const referenceRef = useRef(selected)
  referenceRef.current = selected?.role === 'reference' ? selected : null

  const visibility = useMemo(() => ({ ...ALL_VISIBLE, rings: showRings, risk: showRisk }), [showRings, showRisk])
  const visibilityRef = useRef<WellLayerVisibility>(visibility)
  visibilityRef.current = visibility
  const fadedRef = useRef<string[]>(faded)
  fadedRef.current = faded

  /**
   * The one place the style is touched.
   *
   * Called on the first load and again on every `style.load`, because a basemap switch replaces
   * the style object outright — sources, layers and all. `mount` is idempotent and the visibility
   * and glyph-fade are re-applied from refs rather than from the render's closure, so a switch
   * restores the reader's chosen state instead of quietly resetting it to the defaults.
   */
  /**
   * The map is ready; remember it, and which style it is ready with.
   *
   * Deliberately does *not* mount the layers. There are two facts to wait for — a map, and the
   * wellfield — and they arrive independently: `style.load` fires when the style is up, which on
   * this page is several hundred milliseconds before the GeoJSON has been fetched and validated.
   * Whichever arrived first used to have to notice the other, and neither did, so a `style.load` that
   * arrived first mounted nothing and a map whose style was replaced later lost the layers that were
   * never re-added. Mounting from the effect below needs both facts and can be re-run on either one
   * changing, which removes the race instead of timing it.
   *
   * The epoch is the same idea for the basemap control: a new style means every layer the map held
   * is gone, and the effect that puts them back has to know that a *new* style is up even though the
   * map object is unchanged.
   */
  const onMapReady = useCallback((m: MapboxMap, epoch: number) => {
    setMap(m)
    setStyleEpoch(epoch)
  }, [])

  /**
   * The style state the layers depend on, in the order it has to happen.
   *
   * The font is named before the layers are added, not after: a `text-font` the style cannot serve
   * 404s per label, and a label layer added with a font the style does not have comes up blank.
   */
  useEffect(() => {
    if (!map) return
    /* The font is the basemap's to name, and this is the only moment the basemap and the layers
     * meet. */
    setWellLabelFont(map, choice.fontBold)
    const data = dataRef.current
    if (data) {
      /* Idempotent: the sources and layers go on if they are not there, which is the first call
       * and every call after a basemap switch, and the data is refreshed either way. */
      mountWellLayers(map, data)
      updateWellLayerData(map, data)
    }
    setWellLayerVisibility(map, visibilityRef.current)
    setWellIconFadedModels(map, fadedRef.current)
  }, [map, layerData, styleEpoch, choice.fontBold])

  useEffect(() => {
    if (map) setWellLayerVisibility(map, visibility)
  }, [map, visibility])

  useEffect(() => () => setMap(null), [])

  /**
   * Rig heights and glyph sizes are read from the map, so they have to be re-read when the ground,
   * the exaggeration, the zoom or the style changes. `idle` is the one event that means all four
   * have settled, so one counter drives the whole scene rather than four listeners.
   */
  useEffect(() => {
    if (!map) return
    const bump = () => setTerrainRev((r) => r + 1)
    const onZoom = () => setZoom(map.getZoom())
    map.on('idle', bump)
    map.on('zoomend', onZoom)
    map.on('moveend', onZoom)
    return () => {
      map.off('idle', bump)
      map.off('zoomend', onZoom)
      map.off('moveend', onZoom)
    }
  }, [map])

  /**
   * Clicking a rig is the same act as clicking its glyph, so both go through the one selection.
   * Registered per layer id because `map.on('click', layerId, fn)` is the only form that reports
   * *which* symbol was hit, and a bare click handler would select whichever well happened to be
   * nearest the pointer.
   */
  useEffect(() => {
    if (!map) return
    const pick = (e: MapboxMapMouseEvent) => {
      /* `features` is whatever the style has at that point, so the id is read defensively: a
       * native layer that has not finished loading must not take the click handler down with it. */
      const id = e.features?.[0]?.properties?.id
      if (typeof id === 'string') selectWell(id)
    }
    const over = NWIS.layers.wells2d
    const label = NWIS.layers.labels
    map.on('click', over, pick)
    map.on('click', label, pick)
    const enter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const leave = () => {
      map.getCanvas().style.cursor = ''
    }
    map.on('mouseenter', over, enter)
    map.on('mouseleave', over, leave)
    return () => {
      map.off('click', over, pick)
      map.off('click', label, pick)
      map.off('mouseenter', over, enter)
      map.off('mouseleave', over, leave)
      leave()
    }
  }, [map, selectWell])

  /** `Esc` closes the card: the selection goes back to the reference well. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      selectWell(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectWell])

  /* ---------------------------------------------------------------- rigs --- */

  /**
   * The rigs are built once and held by reference count, and only in 3D: in plan view the glyphs
   * are the map, and ten GLBs nobody can see is ten GLBs of memory nobody asked for.
   */
  useEffect(() => {
    if (!near || camera !== '3d') return
    let alive = true
    void retainWellModels().then((m) => {
      if (alive) setModels(m)
    })
    return () => {
      alive = false
      releaseWellModels()
    }
  }, [near, camera])

  /**
   * The scene is rebuilt on every terrain, zoom or style revision and on every selection change.
   *
   * Rebuilding a deck layer object is free; re-uploading the models is not, and that only happens
   * when the `scenegraph` prop changes — which is a stable blob URL — so the GLBs are loaded once
   * and then diffed like any other deck prop.
   */
  useEffect(() => {
    if (!map || !models || camera !== '3d') {
      setRigs([])
      return
    }
    setRigs(
      buildRigScene({
        map,
        wells,
        models,
        radiusKm,
        selectedId,
        revision: terrainRev,
        zoom,
        onSelect: selectWell,
        onError: setRigError,
        onDrawn: (model) => {
          /* Each glyph fades only once its own model has drawn, so a slow GLB leaves a symbol
           * behind instead of a hole. */
          setFaded((prev) => (prev.includes(model) ? prev : [...prev, model]))
        },
      }),
    )
  }, [map, models, camera, wells, radiusKm, selectedId, terrainRev, zoom, selectWell])

  useEffect(() => {
    if (!map) return
    /* In plan view the glyphs are the only wells on the map, whatever 3D has drawn. */
    if (camera === '2d') setWellIconFadedModels(map, [])
    else setWellIconFadedModels(map, faded)
  }, [map, camera, faded])

  /**
   * The map owns both exaggerations — it owns the terrain — so the panel reads them back from the
   * readout the map already publishes rather than keeping a copy that could disagree with it.
   */
  const exaggeration = readout?.exaggeration ?? EXAGGERATION_STEPS[0]
  const terrainExaggeration = readout?.terrainExaggeration ?? TERRAIN_EXAGGERATION_STEPS[2]

  /**
   * The reference wellbore, as a section through the ground.
   *
   * Only in 3D: a plan sheet has no vertical axis, so the same line would be a dot on top of a
   * symbol. The exaggeration is the map's own — the map owns the control and reports the value,
   * so the line and the number in the panel cannot disagree.
   */
  const borehole = useMemo(() => {
    if (camera !== '3d' || !map || !showTrajectory) return null
    const layer = rigBoreholeLayer({ map, well: referenceRef.current, exaggeration, revision: terrainRev })
    return layer ? [layer] : []
  }, [camera, map, showTrajectory, exaggeration, terrainRev])

  const deckLayers = useMemo(() => (borehole ? [...rigs, ...borehole] : rigs), [rigs, borehole])

  /* -------------------------------------------------------------- camera --- */

  const fitRadius = useCallback((km: number) => {
    const ref = referenceRef.current
    if (!ref) return
    cameraApi.current?.fitBounds(circleBounds(ref.bit, km), { padding: { ...FIT_PADDING }, ms: 900 })
  }, [])

  /**
   * The opening camera is a cut, not a flight: there is nothing to fly from, and a reader who
   * arrives to watch the map cross 72 km of Assam is being shown the old bug rather than the field.
   */
  const opened = useRef(false)
  useEffect(() => {
    if (!map || !layerData || opened.current) return
    opened.current = true
    cameraApi.current?.flyTo({ longitude: layerData.reference.surface[0], latitude: layerData.reference.surface[1], ...OPEN_VIEW }, 0)
  }, [map, layerData])

  const flownTo = useRef<string | null>(null)
  useEffect(() => {
    if (!opened.current || !selected || flownTo.current === selectedId) return
    flownTo.current = selectedId
    cameraApi.current?.flyTo({ longitude: selected.surface[0], latitude: selected.surface[1] }, 700)
  }, [selectedId, selected])

  const lastRadius = useRef<number | null>(null)
  useEffect(() => {
    if (lastRadius.current === null) {
      lastRadius.current = radiusKm
      return
    }
    if (lastRadius.current === radiusKm) return
    lastRadius.current = radiusKm
    fitRadius(radiusKm)
  }, [radiusKm, fitRadius])

  const locate = useCallback(() => {
    selectWell(null)
    flownTo.current = REFERENCE_ID
    const ref = referenceRef.current
    if (!ref) return
    cameraApi.current?.flyTo({ longitude: ref.surface[0], latitude: ref.surface[1], ...OPEN_VIEW }, 900)
  }, [selectWell])

  const inRadiusCount = layerData?.inRadius.length ?? 0
  const ringsShown = ringLabel(visibility.rings)

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
      bleed
      actions={
        <>
          <Segmented value={String(radiusKm)} options={RADII.map((r) => ({ value: r, label: `${r} km` }))} onChange={(v) => setFilter('radiusKm', Number(v))} ariaLabel="Search radius" />
          <ProvenanceLive readout={readout} />
        </>
      }
    >
      <div className={s.mapStage} ref={stageRef}>
        {near ? (
          <MapCanvas
            className={s.mapFill}
            extraDeckLayers={deckLayers}
                    xrayDeckLayers={borehole ?? []}
            mode={camera}
            initialViewState={{ longitude: DEMO_ANCHOR[0], latitude: DEMO_ANCHOR[1], ...OPEN_VIEW }}
            hideChrome
            depthRange={[0, layerData?.reference.bitTvdssM ?? 3400]}
            cameraApi={cameraApi}
            onMapReady={onMapReady}
            onReadout={setReadout}
          >
            {/* The zoom and camera group, with the 2D/3D switch on it: a camera mode belongs with
                the other camera controls, not floating in the middle of the frame on top of the
                HUD. */}
            <div className={s.mapTools}>
              <div className={s.toolRow}>
                <button type="button" onClick={() => cameraApi.current?.zoomIn()} title="Zoom in" aria-label="Zoom in">
                  <Icon name="plus" size={12} />
                </button>
                <button type="button" onClick={() => cameraApi.current?.zoomOut()} title="Zoom out" aria-label="Zoom out">
                  <Icon name="minus" size={12} />
                </button>
                <button type="button" onClick={() => fitRadius(radiusKm)} title="Fit the selected radius">
                  <Icon name="reset" size={12} />
                </button>
                <button type="button" onClick={locate} title="Fly to OIL-WELL-104">
                  <Icon name="target" size={12} />
                  <span>Locate active well</span>
                </button>
              </div>
              <CameraBar mode={camera} onChange={setCamera} onBlack />
            </div>

            {/* One panel, one column, 8 px between rows. Every control for this map is in it, and
                nothing is stacked behind anything else. */}
            <div className={s.mapPanel}>
              <div className={s.mapPanelRow}>
                <span className={s.mapPanelKey}>basemap</span>
                <Segmented
                  value={basemap}
                  options={[
                    { value: 'satellite', label: 'Satellite' },
                    { value: 'streets', label: 'Streets' },
                  ]}
                  onChange={(v) => setBasemap(v)}
                  ariaLabel="Basemap"
                  onBlack
                />
              </div>
              <label className={s.mapCheck}>
                <input type="checkbox" checked={showRings} onChange={(e) => setShowRings(e.target.checked)} />
                <span>Distance rings</span>
              </label>
              <label className={s.mapCheck}>
                <input type="checkbox" checked={showRisk} onChange={(e) => setShowRisk(e.target.checked)} />
                <span>Risk zone</span>
              </label>
              <label className={s.mapCheck}>
                <input type="checkbox" checked={showTrajectory} onChange={(e) => setShowTrajectory(e.target.checked)} />
                <span>Reference wellbore</span>
              </label>
              <div className={s.mapPanelRow}>
                <span className={s.mapPanelKey}>trajectory</span>
                <Segmented
                  value={String(exaggeration)}
                  options={EXAGGERATION_STEPS.map((v) => ({ value: String(v), label: `${v}×` }))}
                  onChange={(v) => cameraApi.current?.setExaggeration(Number(v))}
                  ariaLabel="Reference wellbore vertical exaggeration"
                  onBlack
                />
              </div>
              <div className={s.mapPanelRow}>
                <span className={s.mapPanelKey}>terrain</span>
                <Segmented
                  value={String(terrainExaggeration)}
                  options={TERRAIN_EXAGGERATION_STEPS.map((v) => ({ value: String(v), label: `${v}×` }))}
                  onChange={(v) => {
                    cameraApi.current?.setTerrainExaggeration(Number(v))
                    /* The rigs stand on the terrain, so a stretched ground moves them. */
                    setTerrainRev((r) => r + 1)
                  }}
                  ariaLabel="Terrain vertical exaggeration"
                  onBlack
                />
              </div>
            </div>

            <div className={s.mapReadout}>
              <span>{camera === '3d' ? `pitch ${(readout?.pitch ?? 0).toFixed(0)}°` : 'plan view'}</span>
              <span>{readout?.terrain ?? 'terrain —'}</span>
              <span>
                {inRadiusCount} wells · {fmtKM(selected?.distanceAtBitKm ?? 0)} out
              </span>
              <span>{readout?.engine ?? 'Mapbox GL JS'}</span>
            </div>

            {rigError && <div className={s.mapFault} role="status">{rigError}</div>}

            {selected && (
              <div className={s.mapInspector}>
                <div className={s.inspectorHead}>
                  <b>{selected.id}</b>
                  {selected.role === 'reference' ? <Chip tone="yellow">reference well</Chip> : <SimilarityBar value={selected.similarity ?? 0} />}
                  <RiskChip level={selected.riskLevel} />
                  {selected.role === 'offset' && (
                    <button type="button" className={s.inspectorClose} onClick={() => selectWell(null)} title="Back to the reference well" aria-label="Back to the reference well">
                      ✕
                    </button>
                  )}
                </div>
                <p className={s.inspectorMeta}>
                  {isReference ? (
                    <>
                      Drilling · bit {fmtInt(selected.bitMdM ?? 0)} m MD / {formatM(selected.bitTvdssM) ?? '—'} · {selected.formation}
                      {selected.nextTop ? ` · ${selected.nextTop}` : ''}
                    </>
                  ) : (
                    <>
                      {fmtKM(selected.distanceAtBitKm)} at bit · TD {fmtInt(selected.tdMdM ?? 0)} m MD · spud {selected.spud} ·{' '}
                      {isRelevant(selected) ? 'a relevant neighbour' : 'not similar enough to count as a neighbour'}
                    </>
                  )}
                </p>
                <dl className={s.inspectorKv}>
                  <div>
                    <dt>Status</dt>
                    <dd className="mono">{selected.status}</dd>
                  </div>
                  <div>
                    <dt>{isReference ? 'Events' : 'Barail top'}</dt>
                    <dd className="mono">
                      {isReference ? (risks.data?.risks.length ?? '—') : selected.barailTopTvdssM == null ? '—' : `${fmtInt(selected.barailTopTvdssM)} m`}
                    </dd>
                  </div>
                </dl>
                {!isReference && detail.data && (
                  <>
                    <p className={s.inspectorFactors}>
                      {(['stratigraphy', 'trajectory', 'mudSystem', 'proximity'] as const).map((k) => (
                        <span key={k}>
                          {k === 'mudSystem' ? 'mud' : k} <b className="mono">{factors?.[k] ?? '—'}</b>
                        </span>
                      ))}
                    </p>
                    {detail.data.lesson && <p className={s.inspectorLesson}>“{detail.data.lesson}”</p>}
                  </>
                )}
                <div className={s.inspectorActions}>
                  {isReference ? (
                    <Button size="sm" variant="primary" onClick={() => goTo('risk')}>
                      Open the risk engine
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => goTo('wells')}>
                      View events
                    </Button>
                  )}
                  <Button size="sm" onClick={() => goTo('graph')}>
                    View history
                  </Button>
                  {firstEvent?.source.page && (
                    <Button size="sm" onClick={() => openDocument(firstEvent.source.documentId, firstEvent.source.page as number)}>
                      Open document
                    </Button>
                  )}
                </div>
              </div>
            )}
          </MapCanvas>
        ) : (
          <div className={s.mapPlaceholder} aria-hidden />
        )}
      </div>

      {/* The legend lives under the map rather than over it: Mapbox's logo is bottom-left, and a
          legend laid on top of it hides the one piece of the frame that is a licence obligation. */}
      <div className={s.mapFoot}>
        <div className={s.mapLegendBar}>
          <Legend onBlack>
            <span className={s.legendTitle}>Legend</span>
            <LegendItem color="var(--nw-yellow)" label="Reference well" shape="line" onBlack />
            <LegendItem color="#D6A900" label="≥ 75 % similar" shape="line" onBlack />
            <LegendItem color="#E8E9E5" label="Other offset" shape="line" onBlack />
            <LegendItem color="var(--nw-red)" label="Mud loss zone" shape="dot" onBlack />
            <LegendItem color="var(--nw-yellow)" label={ringsShown} shape="dot" onBlack />
          </Legend>
        </div>
        <div className={s.mapFootBlock}>
          <span className="label">Nearby wells</span>
          <p className="mono">
            {inRadiusCount} within {radiusKm} km · {layerData?.inRadius.filter(isRelevant).length ?? 0} above the relevance threshold
          </p>
        </div>
        <div className={s.mapFootBlock}>
          <span className="label">Selection</span>
          <p className="mono">
            {selectedId} {isReference ? '· the well being drilled' : `${selected?.similarity}% similar`}
          </p>
        </div>
        <div className={s.mapFootActions}>
          <Segmented
            value={String(filters.minSimilarity)}
            options={[
              { value: '40', label: 'All' },
              { value: '60', label: '≥ 60%' },
              { value: '75', label: '≥ 75%' },
            ]}
            onChange={(v) => setFilter('minSimilarity', Number(v))}
            ariaLabel="Similarity threshold"
            onBlack
          />
          <Button size="sm" onClick={resetFilters} onBlack>
            Reset
          </Button>
          <Button size="sm" variant="on" onClick={() => goTo('wells')}>
            Rank as a table
          </Button>
        </div>
      </div>
    </Section>
  )
}

/** The ring caption the legend quotes, so the legend cannot describe a set the map is not drawing. */
function ringLabel(rings: boolean): string {
  return rings ? `Rings · ${BASE_RING_RADII_KM.join(' / ')} km + selected` : 'Rings off'
}

function ProvenanceLive({ readout }: { readout: MapReadout | null }) {
  if (!readout?.tokenConfigured) return <Chip tone="outline">Mapbox token required</Chip>
  return (
    <Chip tone="outline" title={readout.basemap}>
      {readout.mode === '3d' ? '3D · terrain' : '2D · plan'} · {readout.basemap}
    </Chip>
  )
}
