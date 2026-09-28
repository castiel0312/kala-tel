import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useActiveWell } from '../hooks/useActiveWell'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { ColumnChart, DepthHistogram, Panel, ProvenanceTag, Skel, ErrorStrip } from '../components/kit'
import { fmtInt } from '../lib/format'
import s from './AnalyticsHub.module.css'

/* ============================================================================
   Analytics Hub — screen 07.

   This is the evidence behind the Risk Centre's posterior. Nothing here is a live
   measurement: it is the offset population inside the scope radius, aggregated by
   formation, by year, and by metres below the target top. The Barail depth
   histogram is the important one, because the active well is currently drilling
   inside its highlighted bin.
   ========================================================================== */

export function AnalyticsHub() {
  const { data: well, isError, refetch } = useActiveWell()

  const analytics = useQuery({
    queryKey: qk.analytics,
    queryFn: api.analytics,
    staleTime: 120_000,
  })

  const a = analytics.data
  const activeBit = well?.bit.mdM ?? 3124

  const riskMatrix = useMemo(() => {
    const rows = a?.riskByFormation.rows ?? []
    const cols = a?.riskByFormation.columns ?? []
    const max = Math.max(1, ...rows.flatMap((r) => r.counts))
    return { rows, cols, max }
  }, [a])

  const totalLoss = useMemo(() => (a?.mudLossByFormation ?? []).reduce((t, f) => t + f.events, 0), [a])
  const nptTotal = useMemo(() => (a?.nptHoursByType ?? []).reduce((t, f) => t + f.hours, 0), [a])
  const bin = useMemo(
    () => (a?.barailEventsByMetresBelowTop ?? []).find((b) => b.highlight),
    [a],
  )

  if (isError) {
    return (
      <Screen num="07" section="Intelligence" title="Analytics" sub="Offset population evidence for the active well.">
        <ErrorStrip body="The active well could not be loaded." action="Retry" onAction={() => void refetch()} />
      </Screen>
    )
  }

  return (
    <Screen
      num="07"
      section="Intelligence"
      title="Analytics"
      sub={a ? a.scope.description : 'Offset population evidence for the active well.'}
      aside={
        <HeaderTools>
          <ProvenanceTag kind="DEMO" label={`${a?.scope.years[0] ?? 1998}–${a?.scope.years[1] ?? 2025}`} />
          <ProvenanceTag kind="DERIVED" label={`RADIUS ${a?.scope.radiusKm ?? 10} KM`} />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <Panel
          title="Barail events by metres below top"
          tone="black"
          signal={bin ? 'signal' : undefined}
          meta={
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-ink-3)' }}>
              the bin the bit is in
            </span>
          }
        >
          {a ? (
            <>
              <DepthHistogram
                bins={a.barailEventsByMetresBelowTop.map((b) => ({ label: b.bin, value: b.events, highlight: b.highlight }))}
                height={150}
              />
              <div className={s.binNote}>
                {bin?.activeMdRange ? (
                  <>
                    <span className={s.binTag}>ACTIVE BIN</span>
                    <span>
                      {bin.bin} m below the Barail top holds <b className="mono">{bin.events}</b> of the offset events
                      {bin.activeMdRange ? (
                        <>
                          , and the bit is at <b className="mono">{fmtInt(activeBit)} m</b> MD with{' '}
                          <b className="mono">{fmtInt(well?.lookAheadM ?? 150)} m</b> of look-ahead
                        </>
                      ) : null}
                      .
                    </span>
                  </>
                ) : (
                  <span className={s.dim}>No bin is marked for the active well.</span>
                )}
              </div>
            </>
          ) : (
            <Skel h={170} ink />
          )}
        </Panel>

        <div className={s.duo}>
          <Panel title="Mud loss by formation" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>{totalLoss} events</span>}>
            {a ? (
              <ColumnChart
                rows={a.mudLossByFormation.map((f) => ({ label: f.formation, value: f.events, highlight: f.highlight }))}
                height={104}
                unit="events"
              />
            ) : (
              <Skel h={104} />
            )}
          </Panel>

          <Panel title="Non-productive time by type" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>{nptTotal} h</span>}>
            {a ? (
              <ColumnChart
                rows={a.nptHoursByType.map((f) => ({ label: f.type, value: f.hours, highlight: f.highlight }))}
                height={104}
                labelWidth={124}
                unit="h"
              />
            ) : (
              <Skel h={104} />
            )}
          </Panel>
        </div>

        <div className={s.duoWide}>
          <Panel title="Mud loss per year" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>events</span>}>
            {a ? (
              <div className={s.yearBars}>
                {a.mudLossPerYear.map((y) => {
                  const max = Math.max(...a.mudLossPerYear.map((v) => v.events), 1)
                  return (
                    <div className={s.yearCol} key={y.year} title={`${y.year}: ${y.events} events`}>
                      <span className={s.yearVal}>{y.events || ''}</span>
                      <span className={s.yearBarTrack}>
                        <i
                          className={y.highlight ? s.yearBarHi : s.yearBar}
                          style={{ height: `${Math.max(2, (y.events / max) * 100)}%` }}
                        />
                      </span>
                      <span className={s.yearLabel}>{String(y.year).slice(2)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Skel h={96} />
            )}
          </Panel>

          <Panel
            title="Event count by formation and type"
            meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>offset population</span>}
          >
            {a ? (
              <div className={s.matrix} style={{ gridTemplateColumns: `84px repeat(${riskMatrix.cols.length}, minmax(0,1fr))` }}>
                <div className={s.mxCorner} />
                {riskMatrix.cols.map((c) => (
                  <div className={s.mxHead} key={c}>
                    {c}
                  </div>
                ))}
                {riskMatrix.rows.map((r) => (
                  <Fragment key={r.formation}>
                    <div className={s.mxRow}>
                      {r.formation}
                    </div>
                    {r.counts.map((n, i) => (
                      <div
                        className={s.mxCell}
                        key={`${r.formation}-${riskMatrix.cols[i]}`}
                        style={{ background: n ? `color-mix(in srgb, var(--nw-red) ${Math.round((n / riskMatrix.max) * 78)}%, transparent)` : undefined }}
                        title={`${r.formation} · ${riskMatrix.cols[i]}: ${n}`}
                      >
                        {n || '·'}
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            ) : (
              <Skel h={96} />
            )}
          </Panel>
        </div>

        <Panel
          title="Offset similarity to the active well"
          meta={
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>
              relevance ≥ {a?.relevanceThreshold ?? 75}%
            </span>
          }
          flush
        >
          <div className={s.simTable}>
            {(a?.offsetSimilarity ?? []).map((o) => {
              const relevant = o.similarity >= (a?.relevanceThreshold ?? 75)
              return (
                <Link className={[s.simRow, relevant ? s['simRow--in'] : ''].filter(Boolean).join(' ')} to={`/compare/${o.id}`} key={o.id}>
                  <span className={s.simId}>{o.id}</span>
                  <span className={s.simTrack}>
                    <i style={{ width: `${o.similarity}%` }} />
                  </span>
                  <span className={s.simVal}>{o.similarity}%</span>
                  <span className={s.simDist}>{o.distanceKm} km</span>
                  <span className={s.simVerdict}>{relevant ? 'IN SCOPE' : 'below threshold'}</span>
                </Link>
              )
            })}
          </div>
        </Panel>
      </div>
    </Screen>
  )
}
