import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import type { AlignMode } from '../api/types'
import { useActiveWell } from '../hooks/useActiveWell'
import { useLive } from '../hooks/useLive'
import { Screen, SplitScreen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { LazyMapCanvas as MapCanvas } from '../components/map/LazyMapCanvas'
import type { MapReadout } from '../components/map/MapCanvas'
import { DepthCorridor, CorridorReadout } from '../components/map/DepthCorridor'
import { lookAheadLayer, structureLayer, barailField, trackFor, trackLayer, wellheadLayer, wellLabels, type WellTrack } from '../components/map/subsurface'
import {
  Bar,
  Button,
  CameraBar,
  Chip,
  DataTable,
  EmptyState,
  ErrorStrip,
  KeyValueList,
  Legend,
  LegendItem,
  MetricSkeleton,
  MetricStrip,
  Panel,
  ProvenanceTag,
  Segmented,
  Skel,
  StateStack,
  StatusChip,
  TrendChart,
  type Column,
  type MetricDatum,
} from '../components/kit'
import { Icon } from '../components/kit/icons'
import { fmtInt, fmtMRange, fmtValue } from '../lib/format'
import s from './ActiveWell.module.css'

/* ============================================================================
   Active Well — screen 03.

   One well, end to end: where the bit is, what formation it is in, what the
   parameters are doing, and what the nearest offsets did at the same depth. The
   corridor is the centre of this screen because depth alignment is the unit of
   thinking for a driller; the 3D view is a companion, not the main event.
   ========================================================================== */

const EXAGGERATION = 1
const ALIGNS: { value: AlignMode; label: string; title: string }[] = [
  { value: 'formation', label: 'On Barail top', title: 'Flatten every well on the top of Barail' },
  { value: 'tvdss', label: 'TVDSS', title: 'True vertical depth below sea level' },
  { value: 'md', label: 'MD', title: 'Measured depth along the hole' },
]

export function ActiveWell() {
  const { data: well, isError, refetch } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const live = useLive(well?.id, Boolean(well?.id))

  const [align, setAlign] = useState<AlignMode>((params.get('align') as AlignMode) ?? 'formation')
  const [event, setEvent] = useState<{ wellId: string; eventId: string; label: string; depth: number; inWindow: boolean } | null>(null)
  // 3D is the opening camera: the map is pitched, draped on Mapbox terrain and rotatable.
  const [camera, setCamera] = useState<'2d' | '3d'>('3d')
  const [readout, setReadout] = useState<MapReadout | null>(null)
  const [selectedOffset, setSelectedOffset] = useState<string | null>(null)

  const [dashQ, offsetsQ, corridorQ, compareQ] = useQueries({
    queries: [
      { queryKey: qk.dashboard(wellId), queryFn: () => api.dashboard(wellId), staleTime: 20_000 },
      { queryKey: qk.offsets(wellId, { radius_km: 5, sort: 'similarity' }), queryFn: () => api.offsets(wellId, { radius_km: 5, sort: 'similarity' }), staleTime: 60_000 },
      { queryKey: qk.corridor(wellId, { align }), queryFn: () => api.corridor(wellId, { align }), staleTime: 60_000 },
      {
        queryKey: qk.compare(wellId, selectedOffset ?? ''),
        queryFn: () => api.compare(wellId, selectedOffset ?? ''),
        enabled: Boolean(well?.id && selectedOffset),
        staleTime: 60_000,
      },
    ],
  })

  const dash = dashQ.data
  const offsets = offsetsQ.data?.wells ?? []
  const corridor = corridorQ.data
  const comparison = compareQ.data
  const liveFrame = live.lastFrame ?? dash?.live

  const tracks: WellTrack[] = useMemo(() => {
    if (!well) return []
    return [trackFor(well, true, well.lookAheadM), ...offsets.map((w) => trackFor(w))]
  }, [well, offsets])

  const field = useMemo(() => (dash ? barailField(dash.activeWell, dash.mapWells) : null), [dash])

  const layers = useMemo(() => {
    if (!well || !tracks.length) return []
    const active = tracks[0]!
    return [
      ...(field ? structureLayer(field, EXAGGERATION, 0.42) : []),
      ...lookAheadLayer(active, well.bit.mdM, well.lookAheadM, EXAGGERATION),
      trackLayer(tracks, EXAGGERATION, 'tracks', 1),
      wellheadLayer(tracks, selectedOffset),
      ...(camera === '3d' ? [wellLabels(tracks, EXAGGERATION)] : []),
    ]
  }, [well, tracks, field, camera, selectedOffset, offsets])

  const metrics: MetricDatum[] = useMemo(() => {
    if (!liveFrame) return []
    return [...liveFrame.primary, ...liveFrame.more].slice(0, 6).map((m) => ({
      key: m.key,
      label: m.label,
      value: fmtValue(m.value),
      unit: m.unit,
      note: m.note,
      tone: m.status === 'ALARM' ? 'danger' : m.status === 'WATCH' ? 'signal' : 'plain',
    }))
  }, [liveFrame])

  const wellCols: Column<(typeof offsets)[number]>[] = useMemo(
    () => [
      { key: 'id', header: 'Offset', id: true, width: 58, cell: (w) => <b>{w.id}</b> },
      { key: 'sim', header: 'Similarity', num: true, width: 74, sortValue: (w) => w.similarity, cell: (w) => `${w.similarity}%` },
      { key: 'dist', header: 'Dist', num: true, width: 62, sortValue: (w) => w.distanceAtBitKm, cell: (w) => `${w.distanceAtBitKm.toFixed(1)} km` },
      {
        key: 'barail',
        header: 'Barail top',
        num: true,
        width: 82,
        sortValue: (w) => w.barailTopTvdssM ?? 0,
        cell: (w) => (w.barailTopTvdssM === null ? '—' : `${fmtInt(w.barailTopTvdssM)} m`),
      },
      {
        key: 'rop',
        header: 'ROP at depth',
        num: true,
        width: 96,
        sortValue: (w) => w.paramsAtAlignedDepth?.rop ?? 0,
        cell: (w) => (w.paramsAtAlignedDepth ? `${w.paramsAtAlignedDepth.rop.toFixed(1)} m/h` : '—'),
      },
      {
        key: 'ecd',
        header: 'ECD at depth',
        num: true,
        width: 96,
        sortValue: (w) => w.paramsAtAlignedDepth?.ecd ?? 0,
        cell: (w) => (w.paramsAtAlignedDepth ? `${w.paramsAtAlignedDepth.ecd.toFixed(2)}` : '—'),
      },
    ],
    [],
  )

  const setAlignAndSync = (a: AlignMode) => {
    setAlign(a)
    const next = new URLSearchParams(params)
    next.set('align', a)
    setParams(next, { replace: true })
  }

  if (isError) {
    return (
      <Screen num="03" section="Operations" title="Active Well" sub="Depth corridor and drilling parameters.">
        <ErrorStrip body="The active well could not be loaded." action="Retry" onAction={() => void refetch()} />
      </Screen>
    )
  }

  return (
    <Screen
      num="03"
      section="Operations"
      title="Active Well"
      sub={
        well ? (
          <>
            <b className="mono">{well.id}</b> · {fmtInt(well.bit.mdM)} m MD · {fmtInt(well.bit.tvdssM)} m TVDSS · {well.currentFormation} · {well.holeSection}
          </>
        ) : (
          'Depth corridor and drilling parameters.'
        )
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind={live.lastFrame ? 'LIVE' : 'DEMO'} label={live.lastFrame ? 'LIVE eRTMAC' : 'DEMO'} />
          <StatusChip status={well?.status} />
          <Link className={s.headerLink} to="/compare">
            Compare <Icon name="arrowRight" size={12} />
          </Link>
        </HeaderTools>
      }
    >
      <div className={s.metrics}>{metrics.length ? <MetricStrip data={metrics} tone="black" columns={6} minHeight={60} /> : <MetricSkeleton n={6} height={60} />}</div>

      <SplitScreen
        sideWidth={344}
        main={
          <>
            <Panel
              title="Depth corridor"
              meta={corridor ? <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>{corridor.caption}</span> : null}
              flush
              className={s.corridorPanel}
              head={
                <>
                  <Segmented
                    value={align}
                    options={ALIGNS.map((a) => ({ value: a.value, label: a.label, title: a.title }))}
                    onChange={(v) => setAlignAndSync(v)}
                    ariaLabel="Depth alignment"
                  />
                </>
              }
            >
              {corridor ? (
                <>
                  <DepthCorridor
                    corridor={corridor}
                    height={432}
                    selectedWellId={selectedOffset ?? corridor.columns[0]?.wellId ?? null}
                    onSelectWell={(id) => setSelectedOffset(id === wellId ? null : id)}
                    onPickEvent={(wid, eid) => {
                      const col = corridor.columns.find((c) => c.wellId === wid)
                      const ev = col?.events.find((e) => e.eventId === eid)
                      if (ev) setEvent({ wellId: wid, eventId: eid, label: ev.label, depth: ev.depthM, inWindow: ev.inLookAhead })
                      if (wid !== wellId) setSelectedOffset(wid)
                    }}
                  />
                  <div className={s.corridorFoot}>
                    {event ? (
                      <CorridorReadout label={`${event.wellId} · ${event.label}`} depth={event.depth} inWindow={event.inWindow} />
                    ) : (
                      <div className={s.corridorHint}>
                        <Icon name="info" size={13} />
                        <span>
                          Bands are formations from <span className="mono">/corridor</span>; glyphs are extracted events. Alignment: <b>{corridor.axis.unit}</b>
                          {corridor.predictedTop ? ` · ${corridor.predictedTop.name} top predicted at ${fmtInt(corridor.predictedTop.depthM)} m ±${corridor.predictedTop.uncertaintyM} m` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className={s.corridorLoading}>
                  <Skel h={432} />
                </div>
              )}
            </Panel>

            <div className={s.duo}>
            <Panel title="Where it is going" flush fill className={s.mapPanel} grow>
              <div className={s.mapBox}>
                <MapCanvas
                  className={s.mapFill}
                  layers={layers}
                  mode={camera}
                  focus={well?.surfaceKm ?? null}
                  exaggeration={EXAGGERATION}
                  depthRange={[0, well?.bit.tvdssM ?? 3400]}
                  status={live.status === 'open' ? 'live' : live.status === 'connecting' ? 'warn' : 'off'}
                  label={well?.id}
                  onReadout={setReadout}
                  onPick={(info) => {
                    const id = (info.object as { well?: { id?: string } } | undefined)?.well?.id
                    if (id && id !== wellId) setSelectedOffset(id)
                  }}
                >
                  <div className={s.mapLegend}>
                    <Legend>
                      <LegendItem color="var(--nw-black)" label="Active well" shape="line" />
                      <LegendItem color="var(--nw-steel)" label="Offsets" shape="line" />
                      <LegendItem color="var(--nw-yellow)" label="Look-ahead" shape="box" />
                    </Legend>
                  </div>
                  <div className={s.mapReadout}>
                    <span>trajectory v{readout?.exaggeration ?? EXAGGERATION}×</span>
                    <span>{(readout?.pitch ?? 0).toFixed(0)}° pitch</span>
                    <span>{readout?.terrain ?? 'terrain flat'}</span>
                    <span>{readout?.engine ?? 'Mapbox GL JS'}</span>
                    <span>{readout?.basemap ?? ''}</span>
                  </div>
                </MapCanvas>
                <div className={s.camSlot}>
                  <CameraBar mode={camera} onChange={setCamera} />
                </div>
              </div>
            </Panel>

            <Panel
              title="Offsets at this depth"
              meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>{offsets.length} within 5 km</span>}
              flush
            >
              <DataTable
                rows={offsets}
                columns={wellCols}
                rowKey={(w) => w.id}
                selectedKey={selectedOffset}
                onSelect={(w) => setSelectedOffset(w.id)}
                onRowClick={(w) => navigate(`/compare/${w.id}`)}
                dense
                maxHeight={188}
                emptyTitle="No offsets in range"
                emptyBody="The API returned no offset wells within 5 km of the active well."
              />
            </Panel>
            </div>
          </>
        }
        side={
          <>
            {well && (
              <Panel title="Well state" tone="black" meta={<StatusChip status={well.status} />}>
                <StateStack states={well.rigStateLast2h} />
                <div className={s.facts}>
                  <KeyValueList
                    items={[
                      { k: 'Rig state', v: well.rigState },
                      { k: 'Hole section', v: well.holeSection },
                      { k: 'Field', v: well.field },
                      { k: 'Bit', v: `${fmtInt(well.bit.mdM)} m MD / ${fmtInt(well.bit.tvdssM)} m TVDSS` },
                      { k: 'KB elevation', v: `${well.kbElevationM} m` },
                      { k: '9⅝-in shoe', v: `${fmtInt(well.casing.shoe9_5_8inMdM)} m MD` },
                      { k: 'Shoe EMW', v: `${well.casing.fitEmwGcc.toFixed(2)} g/cc` },
                    ]}
                  />
                </div>
              </Panel>
            )}

            {well && (
              <Panel title="Next formation" signal="signal">
                <div className={s.nextTop}>
                  <div className={s.nextName}>{well.nextFormation.name}</div>
                  <div className={s.nextRange}>
                    {fmtMRange(well.nextFormation.topMdM, well.nextFormation.topMdM + well.nextFormation.uncertaintyM)} m MD
                  </div>
                  <div className={s.nextGrid}>
                    <div>
                      <span>Distance</span>
                      <b className="mono">{fmtInt(well.nextFormation.distanceM)} m</b>
                    </div>
                    <div>
                      <span>ETA</span>
                      <b className="mono">{well.nextFormation.etaHours} h</b>
                    </div>
                    <div>
                      <span>Uncertainty</span>
                      <b className="mono">±{well.nextFormation.uncertaintyM} m</b>
                    </div>
                  </div>
                  <div className={s.nextDepth}>
                    <div className={s.nextLabel}>
                      <span>Bit</span>
                      <b className="mono">{fmtInt(well.bit.mdM)} m</b>
                    </div>
                    <Bar value={well.bit.mdM} max={well.nextFormation.topMdM} tone="yellow" />
                    <div className={s.nextLabel}>
                      <span>Top</span>
                      <b className="mono">{fmtInt(well.nextFormation.topMdM)} m</b>
                    </div>
                  </div>
                  <div className={s.chips}>
                    <Chip tone="outline">design {well.design.mudSystem}</Chip>
                    <Chip tone="outline">bit {well.design.bit}</Chip>
                  </div>
                </div>
              </Panel>
            )}

            <Panel title="Parameters, last hour" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>live</span>}>
              {liveFrame ? (
                <div className={s.trends}>
                  {(['rop', 'torque', 'ecd'] as const).flatMap((k) => {
                    const m = [...(liveFrame.primary ?? []), ...(liveFrame.more ?? [])].find((x) => x.key === k)
                    const v = liveFrame.sparklines12pt?.[k]
                    if (!m || !Array.isArray(v) || v.length < 2) return []
                    return [
                      <div key={k} className={s.trend}>
                        <div className={s.trendHead}>
                          <span className={s.trendK}>{m.label}</span>
                          <span className="mono">
                            {fmtValue(m.value)} <span className={s.trendU}>{m.unit}</span>
                          </span>
                        </div>
                        <TrendChart
                          height={62}
                          series={[{ key: k, label: m.label, color: m.status === 'ALARM' ? 'var(--nw-red)' : m.status === 'WATCH' ? 'var(--nw-yellow-deep)' : 'var(--nw-text-2)', points: v, width: 1.5 }]}
                          limit={m.alertThreshold}
                          showLegend={false}
                          ariaLabel={`${m.label} trend`}
                        />
                      </div>,
                    ]
                  })}
                </div>
              ) : (
                <EmptyState title="Waiting for the live feed" body="Trends appear once the WebSocket delivers a frame." />
              )}
            </Panel>

            {comparison && (
              <Panel
                title={`${comparison.active} vs ${comparison.offset.id}`}
                meta={<Chip tone="yellow">{comparison.offset.similarity}% similar</Chip>}
                flush
              >
                <div className={s.cmp}>
                  {comparison.parameters.slice(0, 6).map((p) => (
                    <div className={s.cmpRow} key={p.key}>
                      <span className={s.cmpK}>{p.label}</span>
                      <span className={s.cmpA}>
                        {fmtValue(p.active)}
                        <span className={s.cmpU}> {p.unit}</span>
                      </span>
                      <span className={s.cmpB}>
                        {fmtValue(p.offset)}
                        <span className={s.cmpU}> {p.unit}</span>
                      </span>
                    </div>
                  ))}
                  <div className={s.cmpFoot}>
                    <Button size="sm" variant="primary" onClick={() => navigate(`/compare/${comparison.offset.id}`)}>
                      Full comparison <Icon name="arrowRight" size={12} />
                    </Button>
                  </div>
                </div>
              </Panel>
            )}

            {!comparison && (
              <Panel title="Compare at depth" tone="paper">
                <div className={s.cmpHint}>
                  <p>Select an offset in the table or the corridor to see its parameters at this depth.</p>
                  <Button size="sm" onClick={() => navigate('/compare')}>
                    Open comparison
                  </Button>
                </div>
              </Panel>
            )}
          </>
        }
      />
    </Screen>
  )
}
