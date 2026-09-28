import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useActiveWell } from '../hooks/useActiveWell'
import { useLive } from '../hooks/useLive'
import { fmtInt, fmtMRange, fmtValue } from '../lib/format'
import { Screen, SplitScreen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { useToasts } from '../components/ToastProvider'
import { LazyMapCanvas as MapCanvas } from '../components/map/LazyMapCanvas'
import type { MapReadout } from '../components/map/MapCanvas'
import {
  barailField,
  bitLayer,
  distanceRings,
  lookAheadLayer,
  structureLayer,
  trackFor,
  trackLayer,
  wellLabels,
  wellheadLayer,
  type WellTrack,
} from '../components/map/subsurface'
import {
  Button,
  CameraBar,
  Chip,
  DataTable,
  EmptyState,
  ErrorStrip,
  Legend,
  LegendItem,
  MetricSkeleton,
  MetricStrip,
  Panel,
  ProvenanceTag,
  RiskChip,
  ScoreGauge,
  SimilarityBar,
  Skel,
  Sparkline,
  StateStack,
  StatusChip,
  TrendChart,
  type Column,
  type MetricDatum,
} from '../components/kit'
import { EventGlyph } from '../components/kit/events'
import { Icon } from '../components/kit/icons'
import s from './CommandCentre.module.css'

/* ============================================================================
   Command Centre — screen 01.

   The brief: an engineer opens this at 03:00 during a mud-loss watch and needs
   four answers without clicking: where is the bit, what is the drill doing now,
   what is the worst thing about to happen, and what did the nearest wells do
   here. Everything else on this screen is subordinate to those four.
   ========================================================================== */

const EXAGGERATION = 1

export function CommandCentre() {
  const { data: well, isError, refetch } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'
  const live = useLive(well?.id, Boolean(well?.id))
  const queryClient = useQueryClient()
  const { push } = useToasts()
  const navigate = useNavigate()
  // 3D is the opening camera: the map is pitched, draped on Mapbox terrain and rotatable.
  const [camera, setCamera] = useState<'2d' | '3d'>('3d')
  const [readout, setReadout] = useState<MapReadout | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  const queries = [
    { queryKey: qk.dashboard(wellId), queryFn: () => api.dashboard(wellId), staleTime: 20_000, refetchInterval: 20_000 },
    { queryKey: qk.risk(wellId, 'mud_loss'), queryFn: () => api.risk(wellId, 'mud_loss'), staleTime: 30_000 },
    { queryKey: qk.alerts(wellId, 'open'), queryFn: () => api.alerts(wellId, 'open'), staleTime: 10_000 },
  ] as const
  const [dashQ, riskQ, alertsQ] = useQueries({ queries })

  const ack = useMutation({
    mutationFn: (alertId: string) => api.ackAlert(alertId, 'Duty engineer'),
    onSuccess: (a: { id: string; title: string }) => {
      push({ level: 'ACK', metric: a.id, text: `${a.title} acknowledged by duty engineer` })
      void queryClient.invalidateQueries({ queryKey: qk.alerts(wellId, 'open') })
    },
    onError: (e: Error) => push({ level: 'ALARM', metric: 'ACKNOWLEDGE FAILED', text: e.message }),
  })

  const dash = dashQ.data
  const topRisk = dash?.topRisk
  const risk = riskQ.data
  const openAlerts = alertsQ.data?.alerts ?? []
  const liveFrame = live.lastFrame ?? dash?.live
  const socketState = live.status === 'open' ? 'live' : live.status === 'connecting' ? 'warn' : 'off'

  const tracks: WellTrack[] = useMemo(() => {
    if (!dash) return []
    return [
      trackFor(dash.activeWell, true, dash.activeWell.lookAheadM),
      ...dash.mapWells.map((w: (typeof dash.mapWells)[number]) => trackFor(w)),
    ]
  }, [dash])

  const field = useMemo(() => (dash ? barailField(dash.activeWell, dash.mapWells) : null), [dash])

  const layers = useMemo(() => {
    if (!well || !tracks.length) return []
    const active = tracks[0]!
    return [
      ...(field ? structureLayer(field, EXAGGERATION, 0.42) : []),
      distanceRings(well.surfaceKm, [1, 2, 5]),
      ...lookAheadLayer(active, well.bit.mdM, well.lookAheadM, EXAGGERATION),
      trackLayer(tracks, EXAGGERATION, 'tracks', 1),
      wellheadLayer(tracks, picked),
      bitLayer(tracks),
      ...(camera === '3d' ? [wellLabels(tracks, EXAGGERATION)] : []),
    ]
  }, [well, tracks, field, camera, picked])

  const metrics: MetricDatum[] = useMemo(() => {
    if (!liveFrame) return []
    return [...liveFrame.primary, ...liveFrame.more].map((m) => ({
      key: m.key,
      label: m.label,
      value: fmtValue(m.value),
      unit: m.unit,
      note: m.note,
      tone: m.status === 'ALARM' ? 'danger' : m.status === 'WATCH' ? 'signal' : 'plain',
    }))
  }, [liveFrame])

  const sparks = liveFrame?.sparklines12pt ?? {}
  const sparkKeys = ['rop', 'torque', 'ecd', 'flowOut', 'pitVolume', 'spp'] as const
  // `sparklines12pt` is a loose record — the API also puts a free-text `_note` in it — so each
  // entry is narrowed before it reaches a chart.
  const sparkSeries = sparkKeys.flatMap((k) => {
    const v = sparks[k]
    return Array.isArray(v) && v.length > 1 ? [{ key: k as string, points: v }] : []
  })

  const offsetRows = useMemo(
    () =>
      [...(dash?.mapWells ?? [])]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5),
    [dash?.mapWells],
  )

  const offsetCols: Column<(typeof offsetRows)[number]>[] = [
    { key: 'id', header: 'Offset', id: true, width: 62, cell: (r) => <b>{r.id}</b> },
    {
      key: 'similarity',
      header: 'Similarity',
      num: true,
      width: 108,
      sortValue: (r) => r.similarity,
      cell: (r) => <SimilarityBar value={r.similarity} />,
    },
    { key: 'dist', header: 'Dist', num: true, width: 58, sortValue: (r) => r.distanceAtBitKm, cell: (r) => `${r.distanceAtBitKm.toFixed(1)} km` },
    { key: 'barail', header: 'Barail TVDSS', num: true, width: 92, sortValue: (r) => r.barailTopTvdssM ?? 0, cell: (r) => (r.barailTopTvdssM ? `${fmtInt(r.barailTopTvdssM)} m` : '—') },
    { key: 'loss', header: 'Loss', width: 58, sortValue: (r) => (r.hasLossEvents ? 1 : 0), cell: (r) => (r.hasLossEvents ? <Chip tone="red">YES</Chip> : <Chip tone="grey">NO</Chip>) },
    { key: 'status', header: 'Status', width: 84, sortValue: (r) => r.status, cell: (r) => <StatusChip status={r.status} /> },
  ]

  const pickedTrack = tracks.find((t) => t.well.id === picked)

  if (isError) {
    return (
      <Screen num="01" section="Operations" title="Command Centre" sub="Live drilling state for the active well.">
        <ErrorStrip body="The NWIS API is not responding. The demo backend should be running on port 8000." action="Retry" onAction={() => void refetch()} />
      </Screen>
    )
  }

  return (
    <Screen
      num="01"
      section="Operations"
      title="Command Centre"
      signal
      sub={
        <>
          {well ? (
            <>
              <b className="mono">{well.id}</b> · {well.field} · {well.holeSection} · {well.currentFormation} · {well.rigState.toLowerCase()} state
            </>
          ) : (
            'Live drilling state for the active well.'
          )}
        </>
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind={live.lastFrame ? 'LIVE' : 'DEMO'} label={live.lastFrame ? 'LIVE eRTMAC' : 'DEMO'} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--nw-text-3)' }}>
            {liveFrame?.source ?? 'WITSML'} · {liveFrame?.latencySeconds ?? 2} s lag
          </span>
        </HeaderTools>
      }
    >
      <div className={s.metrics}>
        {metrics.length ? (
          <MetricStrip
            data={metrics.slice(0, 8)}
            tone="black"
            columns={4}
            minHeight={62}
          />
        ) : (
          <MetricSkeleton n={8} height={62} />
        )}
      </div>

      <SplitScreen
        sideWidth={352}
        main={
          <>
            <Panel
              className={s.mapPanel}
              flush
              fill
              grow
              head={
                <>
                  <span className={s.panelTitle}>Subsurface · active well and offsets</span>
                  <CameraBar mode={camera} onChange={setCamera} />
                </>
              }
            >
              <MapCanvas
                className={s.mapFill}
                layers={layers}
                mode={camera}
                focus={well?.surfaceKm ?? null}
                exaggeration={EXAGGERATION}
                depthRange={[0, well?.bit.tvdssM ?? 3400]}
                status={socketState}
                label={well?.id}
                onReadout={setReadout}
                onPick={(info) => {
                  const id = (info.object as { well?: { id?: string } } | undefined)?.well?.id
                  setPicked(id ?? null)
                }}
              >
                <div className={s.mapLegend}>
                  <Legend onBlack>
                    <span className={s.legendTitle}>Legend</span>
                    <LegendItem color="var(--nw-black)" label="Active well" onBlack shape="line" />
                    <LegendItem color="var(--nw-red)" label="Offset with loss history" onBlack shape="line" />
                    <LegendItem color="var(--nw-steel)" label="Offset, not relevant" onBlack shape="line" />
                    <LegendItem color="var(--nw-yellow)" label="Look-ahead window" onBlack shape="box" />
                  </Legend>
                </div>

                {pickedTrack && (
                  <div className={s.mapPlate}>
                    <div className={s.plateT}>{pickedTrack.active ? 'Active well' : 'Offset well'}</div>
                    <div className={s.plateB}>
                      {pickedTrack.well.id} · TD {fmtInt((pickedTrack.well as { tdMdM?: number }).tdMdM ?? well?.bit.mdM ?? 0)} m MD
                      <br />
                      {pickedTrack.risk === 'HIGH' ? 'High-risk history' : pickedTrack.risk === 'MEDIUM' ? 'Medium-risk history' : 'No recorded loss'}
                      {pickedTrack.relevant ? '' : ' · outside the relevance threshold'}
                    </div>
                    <div className={s.plateB}>
                      plan position {pickedTrack.well.surfaceKm[0].toFixed(2)} E, {pickedTrack.well.surfaceKm[1].toFixed(2)} N km
                    </div>
                  </div>
                )}

                <div className={s.mapReadout}>
                  <span>trajectory v{readout?.exaggeration ?? EXAGGERATION}×</span>
                  <span>{(readout?.pitch ?? 0).toFixed(0)}° pitch</span>
                  <span>{readout?.terrain ?? 'terrain flat'}</span>
                  <span>{readout?.engine ?? 'Mapbox GL JS'}</span>
                  <span>{readout?.basemap ?? ''}</span>
                </div>
              </MapCanvas>
            </Panel>

            <div className={s.lower}>
              <Panel
                title="What the offsets did here"
                meta={<Link className={s.link} to="/nearby">all {dash?.summary.offsetWells ?? 0} offsets →</Link>}
                flush
                className={s.grow}
              >
                <DataTable
                  rows={offsetRows}
                  columns={offsetCols}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => navigate(`/compare/${r.id}`)}
                  dense
                  maxHeight={252}
                  emptyTitle="No offsets in range"
                  emptyBody="The API returned no offset wells for this active well."
                />
                {offsetRows[0]?.lesson && (
                  <div className={s.lesson}>
                    <Icon name="quote" size={13} />
                    <div>
                      <div className={s.lessonK}>
                        {offsetRows[0].id} · the most similar offset · similarity {offsetRows[0].similarity}
                      </div>
                      <p className={s.lessonT}>{offsetRows[0].lesson}</p>
                      {offsetRows[0].lessonSource && <div className={s.lessonS}>{offsetRows[0].lessonSource}</div>}
                    </div>
                  </div>
                )}
              </Panel>

              <Panel
                title="Live parameters, last hour"
                meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>12 samples</span>}
                grow
                className={s.grow}
              >
                {sparkSeries.length ? (
                  <div className={s.sparks}>
                    {sparkSeries.map((sr) => {
                      const metric = [...(liveFrame?.primary ?? []), ...(liveFrame?.more ?? [])].find((m) => m.key === sr.key)
                      return (
                        <div className={s.sparkCell} key={sr.key}>
                          <div className={s.sparkHead}>
                            <span className="label">{metric?.label ?? sr.key}</span>
                            <span className="mono">
                              {metric ? fmtValue(metric.value) : ''}
                              <span style={{ color: 'var(--nw-text-4)' }}> {metric?.unit}</span>
                            </span>
                          </div>
                          <Sparkline
                            points={sr.points}
                            color={metric?.status === 'ALARM' ? 'var(--nw-red)' : metric?.status === 'WATCH' ? 'var(--nw-yellow-deep)' : 'var(--nw-text-2)'}
                            limit={metric?.alertThreshold}
                            width="100%"
                            height={34}
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState title="Waiting for the live feed" body="Sparklines appear once the WebSocket has delivered a frame." />
                )}
              </Panel>
            </div>
          </>
        }
        side={
          <>
            <Panel
              tone="black"
              signal="danger"
              title="Top risk ahead"
              meta={topRisk && <RiskChip level={topRisk.level} probability={topRisk.probability} />}
            >
              {topRisk ? (
                <div className={s.riskTop}>
                  <div className={s.riskTopHead}>
                    <ScoreGauge value={topRisk.probability} level={topRisk.level === 'HIGH' ? 'HIGH' : topRisk.level === 'MEDIUM' ? 'MEDIUM' : 'LOW'} label="% risk" />
                    <div style={{ minWidth: 0 }}>
                      <div className={s.riskName}>{topRisk.name}</div>
                      <div className={s.riskWindow}>{topRisk.windowText}</div>
                      <div className={s.riskWhy}>
                        {topRisk.historicalEvents} historical events on {topRisk.similarWells} similar wells
                      </div>
                    </div>
                  </div>

                  {risk && (
                    <>
                      <div className={s.riskTrust}>
                        <span className="label">Model confidence</span>
                        <b className="mono">{risk.confidence}%</b>
                        <span style={{ color: 'var(--nw-ink-3)' }}>{risk.confidenceBand}</span>
                      </div>
                      <p className={s.riskEvidence}>{risk.evidenceSummary}</p>
                      <ul className={s.riskList}>
                        {risk.evidence.slice(0, 2).map((e: (typeof risk.evidence)[number]) => (
                          <li key={e.id}>
                            <EventGlyph type={e.type} severity={e.severity} />
                            <span>
                              {e.wellId} · {fmtInt(e.mdM)} m · {e.formation}
                            </span>
                            {e.source.page && <span className="mono" style={{ color: 'var(--nw-ink-3)' }}>p.{e.source.page}</span>}
                          </li>
                        ))}
                      </ul>
                      {risk.mitigations[0] && (
                        <div className={s.riskMit}>
                          <span className="label">{risk.mitigations[0].worked ? 'Worked on the offsets' : 'Unproven'}</span>
                          <p>{risk.mitigations[0].text}</p>
                        </div>
                      )}
                    </>
                  )}
                  <Button variant="primary" block onClick={() => navigate(`/risk/${topRisk.riskId}`)}>
                    Open risk centre
                    <Icon name="arrowRight" size={13} />
                  </Button>
                </div>
              ) : (
                <Skel h={132} ink />
              )}
            </Panel>

            <Panel
              title="Open alerts"
              meta={
                <span className="mono" style={{ fontSize: 9.5, color: openAlerts.length ? 'var(--nw-red)' : 'var(--nw-text-3)' }}>
                  {openAlerts.length} open / {alertsQ.data?.counts.all ?? 0} today
                </span>
              }
              flush
            >
              {openAlerts.length ? (
                openAlerts.map((a: (typeof openAlerts)[number]) => (
                  <div className={s.alert} key={a.id}>
                    <div className={s.alertHead}>
                      <span className={s.alertSev} style={{ background: a.severity === 'HIGH' ? 'var(--nw-red)' : a.severity === 'WATCH' ? 'var(--nw-yellow-deep)' : 'var(--nw-text-3)' }}>
                        {a.severity}
                      </span>
                      <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>
                        {a.time}
                      </span>
                      <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)', marginLeft: 'auto' }}>
                        {a.id}
                      </span>
                    </div>
                    <div className={s.alertTitle}>{a.title}</div>
                    <div className={s.alertSub}>{a.subtitle}</div>
                    {a.triggers.length > 0 && (
                      <div className={s.alertTriggers}>
                        {a.triggers.map((t: (typeof a.triggers)[number]) => (
                          <span key={t.label}>
                            <b className="mono">{t.value}</b> {t.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={s.alertActions}>
                      <Button size="sm" variant="danger" onClick={() => ack.mutate(a.id)} disabled={ack.isPending}>
                        Acknowledge
                      </Button>
                      <Link className={s.linkBtn} to="/alerts">
                        Alerts centre <Icon name="arrowRight" size={12} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className={s.clear}>
                  <Icon name="check" size={15} />
                  <div>
                    <div className={s.clearT}>No open alerts</div>
                    <div className={s.clearS}>
                      {alertsQ.data?.counts.acknowledged ?? 0} acknowledged today. The live feed is still connected.
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Rig state" meta={<StatusChip status={well?.status} />}>
              {well ? (
                <div className={s.rig}>
                  <StateStack states={well.rigStateLast2h} />
                  <dl className={s.rigFacts}>
                    <div>
                      <dt>Bit</dt>
                      <dd className="mono">
                        {fmtInt(well.bit.mdM)} m MD
                        <span className={s.rigSub}> {fmtInt(well.bit.tvdssM)} m TVDSS</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Next top</dt>
                      <dd className="mono">
                        {well.nextFormation.name} {fmtMRange(well.nextFormation.topMdM, well.nextFormation.topMdM + well.nextFormation.uncertaintyM)}
                        <span className={s.rigSub}> ±{well.nextFormation.uncertaintyM} m</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Look-ahead</dt>
                      <dd className="mono">{fmtInt(well.lookAheadM)} m</dd>
                    </div>
                    <div>
                      <dt>ETA to top</dt>
                      <dd className="mono">{well.nextFormation.etaHours} h</dd>
                    </div>
                    <div>
                      <dt>9⅝-in shoe</dt>
                      <dd className="mono">{fmtInt(well.casing.shoe9_5_8inMdM)} m</dd>
                    </div>
                    <div>
                      <dt>KB elevation</dt>
                      <dd className="mono">{well.kbElevationM} m</dd>
                    </div>
                  </dl>
                  <Link className={s.linkBtn} to="/active">
                    Depth corridor and parameters <Icon name="arrowRight" size={12} />
                  </Link>
                </div>
              ) : (
                <Skel h={120} />
              )}
            </Panel>

            {openAlerts[0]?.chart && (
              <Panel title="Mud-loss probability" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>live model</span>}>
                <TrendChart
                  height={104}
                  series={[{ key: 'p', label: 'Probability', color: 'var(--nw-red)', points: openAlerts[0].chart.series, area: true, width: 2 }]}
                  limit={openAlerts[0].chart.limit ?? undefined}
                  limitLabel="trip margin"
                  unit="%"
                  showLegend={false}
                  yLabel="%"
                  ariaLabel="Mud-loss probability trend"
                />
              </Panel>
            )}
          </>
        }
      />
    </Screen>
  )
}
