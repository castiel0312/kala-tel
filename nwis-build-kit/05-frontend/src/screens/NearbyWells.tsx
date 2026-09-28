import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, qk, type OffsetQuery } from '../api/client'
import type { OffsetWell } from '../api/types'
import { useActiveWell } from '../hooks/useActiveWell'
import { Screen, SplitScreen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { LazyMapCanvas as MapCanvas } from '../components/map/LazyMapCanvas'
import type { MapReadout } from '../components/map/MapCanvas'
import {
  distanceRings,
  eventLayer,
  eventPoints,
  lookAheadLayer,
  trackFor,
  trackLayer,
  wellLabels,
  wellheadLayer,
  type WellTrack,
} from '../components/map/subsurface'
import {
  Bar,
  Button,
  CameraBar,
  Chip,
  DataTable,
  EmptyState,
  ErrorStrip,
  Legend,
  LegendItem,
  MetricStrip,
  Panel,
  ProvenanceTag,
  RiskChip,
  Segmented,
  SimilarityBar,
  Skel,
  StatusChip,
  Toggle,
  type Column,
  type MetricDatum,
} from '../components/kit'
import { EventGlyph } from '../components/kit/events'
import { Icon } from '../components/kit/icons'
import { fmtInt, fmtKM } from '../lib/format'
import s from './NearbyWells.module.css'

/* ============================================================================
   Nearby Wells — screen 02.

   The question this screen answers is "who else has drilled through the section
   we are about to enter". So the map is the primary surface — the offsets are
   spatial, not tabular — and the table underneath exists to rank and filter
   them. The right column is the profile of whichever offset is selected, with
   the historical events that make it relevant.

   Similarity comes from the API, never from this screen. The factors behind it
   are shown as bars because an unexplained 87% is not decision-grade.
   ========================================================================== */

const EXAGGERATION = 1
const RADII = [1, 3, 5, 10] as const
const RING_KM = [0.5, 1, 2, 5, 10]

export function NearbyWells() {
  const { data: active, isError, refetch } = useActiveWell()
  const wellId = active?.id ?? 'OIL-WELL-104'
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [radius, setRadius] = useState<number>(5)
  const [onlyRelevant, setOnlyRelevant] = useState(false)
  const [onlyLoss, setOnlyLoss] = useState(false)
  // 3D is the opening camera: the map is pitched, draped on Mapbox terrain and rotatable.
  const [camera, setCamera] = useState<'2d' | '3d'>('3d')
  const [readout, setReadout] = useState<MapReadout | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | undefined>(params.get('well') ?? undefined)

  const query: OffsetQuery = {
    radius_km: radius,
    min_similarity: onlyRelevant ? 75 : undefined,
    has_loss_events: onlyLoss ? true : undefined,
    sort: 'similarity',
  }

  const offsets = useQuery({
    queryKey: qk.offsets(wellId, query),
    queryFn: () => api.offsets(wellId, query),
    enabled: Boolean(active?.id),
  })

  const wells = offsets.data?.wells ?? []
  // Default to the most relevant offset, not the first row: the whole screen is
  // more useful when the right column opens on the well worth reading.
  const selectedId = selected ?? wells.find((w) => w.relevant)?.id ?? wells[0]?.id
  const current = wells.find((w) => w.id === selectedId)

  const detail = useQuery({
    queryKey: qk.offset(wellId, selectedId ?? ''),
    queryFn: () => api.offset(wellId, selectedId ?? ''),
    enabled: Boolean(active?.id && selectedId),
  })

  const select = (id: string) => {
    setSelected(id)
    const next = new URLSearchParams(params)
    next.set('well', id)
    setParams(next, { replace: true })
  }

  const tracks: WellTrack[] = useMemo(() => {
    if (!active) return []
    const list: WellTrack[] = [trackFor(active, true, active.lookAheadM)]
    for (const w of wells) {
      if (w.id === active.id) continue
      list.push(trackFor(w))
    }
    return list
  }, [active, wells])

  const activeTrack = tracks[0]
  const selectedTrack = tracks.find((t) => t.well.id === selectedId)
  const offsetEvents = useMemo(
    () => (selectedTrack ? eventPoints(selectedTrack, detail.data?.events ?? [], EXAGGERATION) : []),
    [selectedTrack, detail.data],
  )
  const eventsLayer = useMemo(
    () => (selectedTrack && offsetEvents.length ? eventLayer(selectedTrack, detail.data?.events ?? [], EXAGGERATION) : null),
    [selectedTrack, offsetEvents, detail.data],
  )

  const layers = useMemo(() => {
    if (!active || !activeTrack) return []
    return [
      distanceRings(active.surfaceKm, RING_KM),
      ...lookAheadLayer(activeTrack, active.bit.mdM, active.lookAheadM, EXAGGERATION),
      trackLayer(tracks, EXAGGERATION, 'tracks', 1),
      wellheadLayer(tracks, selectedId ?? null),
      ...(camera === '3d' ? [wellLabels(tracks, EXAGGERATION)] : []),
      ...(eventsLayer ? [eventsLayer] : []),
    ]
  }, [active, activeTrack, tracks, selectedId, camera, eventsLayer])

  const metrics: MetricDatum[] = useMemo(() => {
    if (!current) return []
    return [
      { key: 'sim', label: 'Similarity', value: current.similarity, unit: '%', tone: current.relevant ? 'signal' : 'plain' },
      { key: 'dist', label: 'Distance at bit', value: current.distanceAtBitKm.toFixed(1), unit: 'km' },
      { key: 'td', label: 'Total depth', value: fmtInt(current.tdMdM), unit: 'm MD' },
      {
        key: 'barail',
        label: 'Barail top',
        value: current.barailTopTvdssM === null ? '—' : fmtInt(current.barailTopTvdssM),
        unit: 'm TVDSS',
      },
    ]
  }, [current])

  const columns: Column<OffsetWell>[] = useMemo(
    () => [
      { key: 'id', header: 'Well', id: true, width: 62, cell: (w) => <b>{w.id}</b> },
      {
        key: 'similarity',
        header: 'Similarity',
        num: true,
        width: 118,
        sortValue: (w) => w.similarity,
        title: 'Similarity score returned by the API',
        cell: (w) => <SimilarityBar value={w.similarity} />,
      },
      { key: 'dist', header: 'Dist at bit', num: true, width: 78, sortValue: (w) => w.distanceAtBitKm, cell: (w) => fmtKM(w.distanceAtBitKm) },
      { key: 'td', header: 'TD (MD)', num: true, width: 84, sortValue: (w) => w.tdMdM, cell: (w) => `${fmtInt(w.tdMdM)} m` },
      {
        key: 'barail',
        header: 'Barail top',
        num: true,
        width: 90,
        sortValue: (w) => w.barailTopTvdssM ?? 0,
        cell: (w) => (w.barailTopTvdssM === null ? '—' : `${fmtInt(w.barailTopTvdssM)} m`),
      },
      { key: 'shoe', header: '9⅝-in shoe', num: true, width: 92, sortValue: (w) => w.design ? 1 : 0, cell: (w) => (w.design ? '9⅝-in' : '—') },
      {
        key: 'loss',
        header: 'Loss',
        width: 62,
        sortValue: (w) => (w.hasLossEvents ? 1 : 0),
        cell: (w) => (w.hasLossEvents ? <Chip tone="red">YES</Chip> : <Chip tone="grey">NO</Chip>),
      },
      { key: 'risk', header: 'Risk', width: 74, sortValue: (w) => w.risk, cell: (w) => <RiskChip level={w.risk} /> },
      { key: 'status', header: 'Status', width: 92, sortValue: (w) => w.status, cell: (w) => <StatusChip status={w.status} /> },
    ],
    [],
  )

  const factors = useMemo(() => {
    if (!current) return []
    const f = current.similarityFactors
    return [
      { label: 'Stratigraphy', value: f.stratigraphy },
      { label: 'Trajectory', value: f.trajectory },
      { label: 'Mud system', value: f.mudSystem },
      { label: 'Proximity', value: f.proximity },
    ]
  }, [current])

  if (isError) {
    return (
      <Screen num="02" section="Operations" title="Nearby Wells" sub="Offset wells around the active well.">
        <ErrorStrip body="Offsets could not be loaded from the NWIS API." action="Retry" onAction={() => void refetch()} />
      </Screen>
    )
  }

  return (
    <Screen
      num="02"
      section="Operations"
      title="Nearby Wells"
      sub={
        active ? (
          <>
            Offsets within <b className="mono">{radius} km</b> of <b className="mono">{active.id}</b>, ranked by how closely they resemble it
          </>
        ) : (
          'Offset wells around the active well, ranked by how much they resemble it.'
        )
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind="DERIVED" label="SIMILARITY FROM API" />
          <Segmented
            value={String(radius)}
            options={RADII.map((r) => ({ value: String(r), label: `${r} km` }))}
            onChange={(v) => setRadius(Number(v))}
            ariaLabel="Search radius"
          />
          <Toggle checked={onlyRelevant} onChange={setOnlyRelevant} title="Only offsets the API marks as relevant">
            ≥ 75% similar
          </Toggle>
          <Toggle checked={onlyLoss} onChange={setOnlyLoss} title="Only offsets with a recorded loss event">
            Loss events
          </Toggle>
        </HeaderTools>
      }
    >
      <SplitScreen
        sideWidth={348}
        main={
          <>
            <Panel
              flush
              fill
              grow
              className={s.mapPanel}
              head={
                <>
                  <span className={s.headTitle}>Offset field · plan position</span>
                  <CameraBar mode={camera} onChange={setCamera} />
                </>
              }
            >
              <MapCanvas
                className={s.mapFill}
                layers={layers}
                mode={camera}
                focus={active?.surfaceKm ?? null}
                exaggeration={EXAGGERATION}
                depthRange={[0, active?.bit.tvdssM ?? 3400]}
                onReadout={setReadout}
                onPick={(info) => {
                  const id = (info.object as { well?: { id?: string } } | undefined)?.well?.id
                  if (id && id !== active?.id) {
                    setPicked(id)
                    select(id)
                  }
                }}
              >
                <div className={s.legend}>
                  <Legend>
                    <span className={s.legendTitle}>Legend</span>
                    <LegendItem color="var(--nw-black)" label="Active well" shape="line" />
                    <LegendItem color="var(--nw-red)" label="Offset, loss history" shape="line" />
                    <LegendItem color="var(--nw-steel)" label="Offset, no loss" shape="line" />
                    <LegendItem color="var(--nw-yellow)" label={`Rings · ${RING_KM.join(' / ')} km`} shape="dot" />
                  </Legend>
                </div>

                {current && (
                  <div className={s.plate}>
                    <div className={s.plateHead}>
                      <b>{current.id}</b>
                      <SimilarityBar value={current.similarity} />
                    </div>
                    <div className={s.plateRow}>
                      {fmtKM(current.distanceAtBitKm)} at bit · TD {fmtInt(current.tdMdM)} m MD
                    </div>
                    <div className={s.plateRow}>
                      {current.barailTopTvdssM === null ? 'Barail top not recorded' : `Barail top ${fmtInt(current.barailTopTvdssM)} m TVDSS`}
                    </div>
                    <div className={s.plateRow}>
                      plan position {current.surfaceKm[0].toFixed(2)} E, {current.surfaceKm[1].toFixed(2)} N km
                    </div>
                  </div>
                )}

                <div className={s.readout}>
                  <span>trajectory v{readout?.exaggeration ?? EXAGGERATION}×</span>
                  <span>{(readout?.pitch ?? 0).toFixed(0)}° pitch</span>
                  <span>{readout?.terrain ?? 'terrain flat'}</span>
                  <span>{readout?.engine ?? 'Mapbox GL JS'}</span>
                  <span>{readout?.basemap ?? ''}</span>
                </div>
              </MapCanvas>
            </Panel>

            <Panel
              title="Offset wells"
              meta={
                <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>
                  {offsets.data?.count ?? 0} in radius · {offsets.data?.relevantCount ?? 0} relevant
                </span>
              }
              flush
              className={s.tablePanel}
            >
              <DataTable
                rows={wells}
                columns={columns}
                rowKey={(w) => w.id}
                selectedKey={selectedId ?? null}
                onSelect={(w) => select(w.id)}
                onRowClick={(w) => navigate(`/compare/${w.id}`)}
                dense
                maxHeight={210}
                emptyTitle="No offsets match these filters"
                emptyBody="Widen the radius or clear a filter. Similarity comes from the API, so an empty result is a real answer."
                emptyActions={
                  <Button
                    size="sm"
                    onClick={() => {
                      setOnlyLoss(false)
                      setOnlyRelevant(false)
                      setRadius(10)
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </Panel>
          </>
        }
        side={
          <>
            {current ? (
              <Panel
                title={current.id}
                meta={
                  <span style={{ display: 'flex', gap: 4 }}>
                    <RiskChip level={current.risk} />
                    <StatusChip status={current.status} />
                  </span>
                }
                flush
              >
                <div className={s.simHead}>
                  <div className={s.simValue}>{current.similarity}%</div>
                  <div className={s.simLabel}>
                    <b>similar</b>
                    {current.relevant ? ' · relevant to the active well' : ' · below the relevance threshold'}
                  </div>
                  <div className={s.simChips}>
                    <Chip tone="outline">spud {current.spud}</Chip>
                    {current.mdMinusTvdssM !== null && <Chip tone="outline">incl {Math.round(current.mdMinusTvdssM)}°</Chip>}
                  </div>
                </div>
                <div className={s.simBody}>
                  <MetricStrip data={metrics} columns={2} flush minHeight={50} />
                </div>
              </Panel>
            ) : (
              <Panel title="Offset well">
                <EmptyState title="Select an offset" body="Pick a well on the map or in the table to see its history." />
              </Panel>
            )}

            {current && (
              <Panel title="Why it is similar" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>API factors</span>}>
                <div className={s.factors}>
                  {factors.map((f) => (
                    <div className={s.factor} key={f.label}>
                      <span className={s.factorK}>{f.label}</span>
                      <Bar value={f.value} tone={f.value >= 75 ? 'yellow' : 'black'} />
                      <span className={s.factorV}>{f.value}</span>
                    </div>
                  ))}
                </div>
                {current.lesson && (
                  <div className={s.lesson}>
                    <Icon name="quote" size={13} />
                    <div>
                      <p className={s.lessonT}>{current.lesson}</p>
                      {current.lessonSource && <div className={s.lessonS}>{current.lessonSource}</div>}
                    </div>
                  </div>
                )}
                <div className={s.actions}>
                  <Button variant="primary" size="sm" onClick={() => navigate(`/compare/${current.id}`)}>
                    Compare with {active?.id?.replace('OIL-WELL-', '') ?? 'active'}
                    <Icon name="arrowRight" size={13} />
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/knowledge?well=${current.id}`)}>
                    Events
                  </Button>
                  <Button size="sm" onClick={() => navigate('/documents')}>
                    Documents
                  </Button>
                </div>
              </Panel>
            )}

            {current && (
              <Panel
                title="Key events"
                meta={
                  <Link className={s.link} to={`/knowledge?well=${current.id}`}>
                    search all →
                  </Link>
                }
                flush
                className={s.events}
              >
                {detail.isLoading ? (
                  <div className={s.skelPad}>
                    <Skel h={92} />
                  </div>
                ) : detail.data?.events.length ? (
                  detail.data.events.map((e) => (
                    <div className={s.event} key={e.id}>
                      <div className={s.eventHead}>
                        <EventGlyph type={e.type} severity={e.severity} />
                        <span className={s.eventT}>{e.title}</span>
                        <span className={s.eventMd}>{fmtInt(e.mdM)} m</span>
                      </div>
                      <div className={s.eventMeta}>
                        {e.formation} · {e.date} · NPT {e.nptHours} h
                      </div>
                      <div className={s.eventBody}>
                        {e.cause} → {e.action} → <b>{e.outcome}</b>
                      </div>
                      {e.alignedMdOnActiveM && (
                        <div className={s.eventAlign}>
                          aligned to {fmtInt(e.alignedMdOnActiveM)} m on {active?.id}
                        </div>
                      )}
                      {e.source.page && (
                        <Link className={s.eventSrc} to={`/documents/${e.source.documentId}/${e.source.page}`}>
                          {e.source.label} · p.{e.source.page}
                          <Icon name="arrowRight" size={11} />
                        </Link>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={s.skelPad}>
                    <EmptyState title="No events extracted" body={`The API has no historical events for ${current.id}.`} />
                  </div>
                )}
              </Panel>
            )}

            {picked && picked !== selectedId && (
              <Panel tone="paper" title="Map selection">
                <span className="mono">{picked}</span> is highlighted on the map.
              </Panel>
            )}
          </>
        }
      />
    </Screen>
  )
}
