import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import type { Alert } from '../api/types'
import { useActiveWell } from '../hooks/useActiveWell'
import { useLive } from '../hooks/useLive'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { useToasts } from '../components/ToastProvider'
import {
  Button,
  Chip,
  EmptyState,
  ErrorStrip,
  LiveIndicator,
  Panel,
  ProvenanceTag,
  Segmented,
  Skel,
  TrendChart,
} from '../components/kit'
import { Icon } from '../components/kit/icons'
import s from './AlertsCentre.module.css'

/* ============================================================================
   Alerts Centre — screen 06.

   The alert feed is the platform's acknowledgement workflow, so this screen is
   a queue, not a log: an alert that has been seen is not the same as an alert
   that has been acknowledged, and the difference has to be visible. The
   WebSocket status is shown at all times so a silent feed is never mistaken for
   a quiet rig.
   ========================================================================== */

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'all', label: 'All' },
] as const

type Filter = (typeof FILTERS)[number]['value']

const SEV: Record<Alert['severity'], { bar: string; chip: 'red' | 'yellow' | 'grey'; label: string }> = {
  HIGH: { bar: 'var(--nw-red)', chip: 'red', label: 'High' },
  WATCH: { bar: 'var(--nw-yellow-deep)', chip: 'yellow', label: 'Watch' },
  MEDIUM: { bar: 'var(--nw-text-2)', chip: 'grey', label: 'Medium' },
  INFO: { bar: 'var(--nw-steel)', chip: 'grey', label: 'Info' },
}

export function AlertsCentre() {
  const { data: well, isError, refetch } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'
  const [filter, setFilter] = useState<Filter>('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { push } = useToasts()
  const live = useLive(well?.id, Boolean(well?.id))

  const alerts = useQuery({
    queryKey: qk.alerts(wellId, filter),
    queryFn: () => api.alerts(wellId, filter),
    enabled: Boolean(well?.id),
    // an open feed should refresh on its own even if the socket drops
    refetchInterval: live.status === 'open' ? false : 30_000,
    staleTime: 10_000,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.alerts(wellId, filter) })
    void queryClient.invalidateQueries({ queryKey: qk.alerts(wellId, 'all') })
  }

  const ack = useMutation({
    mutationFn: (id: string) => api.ackAlert(id, 'Duty engineer'),
    onSuccess: (a: { id: string; title: string }) => {
      push({ level: 'ACK', metric: a.id, text: `${a.title} acknowledged` })
      invalidate()
    },
    onError: (e: Error) => push({ level: 'ALARM', metric: 'ACKNOWLEDGE FAILED', text: e.message }),
  })

  const unack = useMutation({
    mutationFn: (id: string) => api.unackAlert(id),
    onSuccess: () => {
      push({ level: 'DONE', metric: wellId, text: 'Alert returned to the open queue' })
      invalidate()
    },
    onError: (e: Error) => push({ level: 'ALARM', metric: 'UNACKNOWLEDGE FAILED', text: e.message }),
  })

  const rows = alerts.data?.alerts ?? []
  const counts = alerts.data?.counts
  const socket = live.status === 'open' ? 'live' : live.status === 'connecting' ? 'warn' : 'off'
  const bySeverity = useMemo(() => {
    const open = (counts?.open ?? 0) as number
    const all = rows
    const high = all.filter((a) => a.severity === 'HIGH').length
    return { open, high, total: counts?.all ?? all.length }
  }, [counts, rows])

  if (isError) {
    return (
      <Screen num="06" section="Intelligence" title="Alerts" sub="The live alert queue and what has been acknowledged.">
        <ErrorStrip body="The alert feed could not be loaded." action="Retry" onAction={() => void refetch()} />
      </Screen>
    )
  }

  return (
    <Screen
      num="06"
      section="Intelligence"
      title="Alerts"
      signal={bySeverity.high > 0}
      sub={
        <>
          {counts ? `${counts.open} open · ${counts.acknowledged} acknowledged today` : 'Loading the queue'} · {wellId}
        </>
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind={live.status === 'open' ? 'LIVE' : 'DEMO'} label={live.status === 'open' ? 'LIVE eRTMAC' : 'POLLED'} />
          <LiveIndicator state={socket} label={live.status === 'open' ? 'socket open' : live.status === 'connecting' ? 'connecting' : 'polling'} />
          <Segmented value={filter} options={[...FILTERS]} onChange={setFilter} ariaLabel="Alert filter" />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <div className={s.feed} role="feed" aria-label="Alert feed">
          {alerts.isLoading ? (
            <Panel title="Loading">
              <Skel h={220} />
            </Panel>
          ) : rows.length ? (
            rows.map((a) => {
              const sev = SEV[a.severity]
              const isOpen = expanded === a.id
              return (
                <article className={[s.alert, isOpen ? s['alert--open'] : ''].filter(Boolean).join(' ')} key={a.id}>
                  <span className={s.sevBar} style={{ background: sev.bar }} aria-hidden />
                  <div className={s.alertBody}>
                    <div className={s.alertTop}>
                      <Chip tone={sev.chip}>{sev.label}</Chip>
                      <span className={s.alertTime}>{a.time}</span>
                      <span className={s.alertId}>{a.id}</span>
                      <span className={s.alertCat}>{a.category}</span>
                      {a.riskId && (
                        <Link className={s.alertRisk} to={`/risk/${a.riskId}`}>
                          {a.riskId}
                        </Link>
                      )}
                    </div>

                    <h3 className={s.alertTitle}>{a.title}</h3>
                    <p className={s.alertSub}>{a.subtitle}</p>

                    {a.triggers.length > 0 && (
                      <div className={s.triggers}>
                        {a.triggers.map((t) => (
                          <span className={s.trigger} key={t.label}>
                            <b className="mono">{t.value}</b> {t.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {isOpen && (
                      <div className={s.detail}>
                        {a.chart && (
                          <TrendChart
                            height={96}
                            series={[{ key: a.chart.label, label: a.chart.label, color: sev.bar, points: a.chart.series, width: 1.6, area: true }]}
                            limit={a.chart.limit ?? undefined}
                            limitLabel="trip margin"
                            unit="%"
                            showLegend={false}
                            ariaLabel={`${a.chart.label} trend`}
                          />
                        )}
                        {a.offsetsSay && (
                          <div className={s.offsets}>
                            <span className={s.offsetsK}>The offsets</span>
                            <p>{a.offsetsSay}</p>
                          </div>
                        )}
                        {a.action && (
                          <div className={s.action}>
                            <span className={s.actionK}>Standing action</span>
                            <p>{a.action}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={s.alertFoot}>
                      {a.acknowledged ? (
                        <>
                          <span className={s.ackBy}>
                            <Icon name="check" size={12} /> {a.acknowledged.by} · {a.acknowledged.at}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => unack.mutate(a.id)} disabled={unack.isPending}>
                            Return to queue
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="danger" onClick={() => ack.mutate(a.id)} disabled={ack.isPending}>
                            Acknowledge
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : a.id)} aria-expanded={isOpen}>
                            {isOpen ? 'Less' : 'Evidence'}
                          </Button>
                        </>
                      )}
                      {a.riskId && (
                        <Link className={s.footLink} to={`/risk/${a.riskId}`}>
                          Open risk <Icon name="arrowRight" size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <Panel title="Queue clear">
              <EmptyState
                title={filter === 'open' ? 'No open alerts' : 'Nothing in this view'}
                body={filter === 'open' ? `${counts?.acknowledged ?? 0} alerts acknowledged today. The feed is still ${live.status}.` : 'Try a different filter.'}
                actions={
                  filter !== 'open' ? (
                    <Button size="sm" onClick={() => setFilter('open')}>
                      Show open only
                    </Button>
                  ) : undefined
                }
              />
            </Panel>
          )}
        </div>

        <div className={s.sideCol}>
          <Panel title="Queue" tone="black" signal={bySeverity.high > 0 ? 'danger' : 'ok'}>
            <div className={s.queue}>
              <div className={s.queueBig}>
                <b className="mono">{bySeverity.open}</b>
                <span>open now</span>
              </div>
              <div className={s.queueGrid}>
                <div>
                  <b className="mono">{bySeverity.total}</b>
                  <span>today</span>
                </div>
                <div>
                  <b className="mono">{counts?.acknowledged ?? 0}</b>
                  <span>acknowledged</span>
                </div>
                <div>
                  <b className="mono" style={{ color: bySeverity.high ? 'var(--nw-red)' : undefined }}>
                    {bySeverity.high}
                  </b>
                  <span>high severity</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Connection" meta={<LiveIndicator state={socket} label={live.status} />}>
            <dl className={s.conn}>
              <div>
                <dt>Source</dt>
                <dd className="mono">{live.lastFrame?.source ?? 'WITSML / eRTMAC'}</dd>
              </div>
              <div>
                <dt>Latency</dt>
                <dd className="mono">{live.lastFrame?.latencySeconds ?? 2} s</dd>
              </div>
              <div>
                <dt>Feed</dt>
                <dd className="mono">{live.status === 'open' ? 'WebSocket' : 'HTTP poll'}</dd>
              </div>
              <div>
                <dt>Well</dt>
                <dd className="mono">{wellId}</dd>
              </div>
            </dl>
            <p className={s.note}>Acknowledgement is written through the API and appears in the Command Centre and the risk evidence immediately.</p>
          </Panel>

          <Panel title="Related" tone="paper">
            <div className={s.related}>
              <Link to="/command">
                <span>Command Centre</span>
                <Icon name="arrowRight" size={12} />
              </Link>
              <Link to="/risk">
                <span>Risk Centre</span>
                <Icon name="arrowRight" size={12} />
              </Link>
              <Link to="/analytics">
                <span>Loss frequency analytics</span>
                <Icon name="arrowRight" size={12} />
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  )
}
