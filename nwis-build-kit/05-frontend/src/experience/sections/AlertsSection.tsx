import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import { Button, Chip, Drawer, MicroLabel, TrendChart } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { Section, Source } from '../Section'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.alerts

const SEV_TONE: Record<string, string> = {
  HIGH: 'var(--nw-red)',
  WATCH: 'var(--nw-yellow-deep)',
  MEDIUM: 'var(--nw-yellow-deep)',
  INFO: 'var(--nw-text-3)',
}

/**
 * 07 · Alerts.
 *
 * Only the open alarms are on the page. The acknowledged history is a real thing an operator
 * needs and it is a drawer away — putting six resolved cards above one live one would bury
 * the only card that matters.
 */
export function AlertsSection() {
  const { wellId, frame, goTo, now } = useNwis()
  const queryClient = useQueryClient()
  const [history, setHistory] = useState(false)

  const alerts = useQuery({
    queryKey: qk.alerts(wellId ?? '', 'all'),
    queryFn: () => api.alerts(wellId as string, 'all'),
    enabled: Boolean(wellId),
    // The feed is live, so the alert list is refetched on a slow cadence; the WebSocket
    // drives the numbers, not this.
    refetchInterval: 30_000,
  })

  const ack = useMutation({
    mutationFn: (id: string) => api.ackAlert(id, 'Drilling engineer'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.alerts(wellId ?? '', 'all') }),
  })

  const list = alerts.data?.alerts ?? []
  const open = useMemo(() => list.filter((a) => !a.acknowledged), [list])
  const done = useMemo(() => list.filter((a) => a.acknowledged), [list])

  /** Metric states from the live frame, so the operator sees the instruments too. */
  const metrics = [...(frame?.primary ?? []), ...(frame?.more ?? [])]
  const flagged = metrics.filter((m) => m.status && m.status !== 'NORMAL')

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
      actions={
        <>
          <Chip tone={alerts.data?.counts.open ? 'red' : 'green'}>
            {alerts.data?.counts.open ?? 0} open
          </Chip>
          <Button size="sm" onClick={() => setHistory(true)}>
            {alerts.data?.counts.acknowledged ?? 0} acknowledged
          </Button>
        </>
      }
    >
      <div className={s.alertsGrid}>
        <div className={s.alertsMain}>
          {open.length === 0 ? (
            <p className={s.allClear}>
              <Icon name="check" size={16} />
              No open alarms. Every risk is inside its threshold.
            </p>
          ) : (
            open.map((a) => (
              <article key={a.id} className={s.alertCard} style={{ ['--sev' as string]: SEV_TONE[a.severity] }}>
                <div className={s.alertRail} aria-hidden />
                <div className={s.alertBody}>
                  <header className={s.alertHead}>
                    <div>
                      <p className={s.alertCat}>
                        <span className="mono">{a.id}</span>
                        <span className={s.dotSep} aria-hidden />
                        {a.category}
                        <span className={s.dotSep} aria-hidden />
                        {a.time}
                      </p>
                      <h3 className={s.alertTitle}>{a.title}</h3>
                      <p className={s.alertSub}>{a.subtitle}</p>
                    </div>
                    <Chip tone={a.severity === 'HIGH' ? 'red' : 'yellowGhost'}>{a.severity}</Chip>
                  </header>

                  <div className={s.alertTriggers}>
                    {a.triggers.map((t, i) => (
                      <div key={i}>
                        <b className="mono">{t.value}</b>
                        <span>{t.label}</span>
                      </div>
                    ))}
                  </div>

                  {a.chart && (
                    <div className={s.alertChart}>
                      <MicroLabel rule={false}>{a.chart.label}</MicroLabel>
                      <TrendChart
                        series={[
                          {
                            key: a.riskId ?? a.id,
                            label: a.chart.label,
                            color: SEV_TONE[a.severity] ?? 'var(--nw-text-2)',
                            points: a.chart.series,
                            width: 1.6,
                            area: true,
                          },
                        ]}
                        limit={a.chart.limit ?? undefined}
                        limitLabel="trip margin"
                        unit="%"
                        height={64}
                        showLegend={false}
                        ariaLabel={`${a.chart.label} trend`}
                      />
                    </div>
                  )}

                  {a.offsetsSay && <p className={s.alertQuote}>“{a.offsetsSay}”</p>}
                  {a.action && (
                    <p className={s.alertAction}>
                      <Icon name="target" size={13} />
                      {a.action}
                    </p>
                  )}

                  <div className={s.alertActions}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => ack.mutate(a.id)}
                      disabled={ack.isPending}
                    >
                      <Icon name="check" size={12} />
                      Acknowledge
                    </Button>
                    {a.riskId && (
                      <Button size="sm" onClick={() => goTo('risk')}>
                        View the evidence
                      </Button>
                    )}
                    <Button size="sm" onClick={() => goTo('documents')}>
                      Source documents
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className={s.alertsAside}>
          <div className={s.alertsBlock}>
            <MicroLabel>Instrument state</MicroLabel>
            {flagged.length === 0 ? (
              <p className={s.alertsCaption}>Every primary metric is inside its normal band.</p>
            ) : (
              <ul className={s.flagList}>
                {flagged.map((m) => (
                  <li key={m.key}>
                    <span className={s.flagDot} data-state={m.status} aria-hidden />
                    <b>{m.label}</b>
                    <span className="mono">
                      {m.value} {m.unit}
                    </span>
                    <em>{m.status}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={s.alertsBlock}>
            <MicroLabel>Queue</MicroLabel>
            <dl className={s.kv}>
              <div>
                <dt>open</dt>
                <dd className="mono">{alerts.data?.counts.open ?? 0}</dd>
              </div>
              <div>
                <dt>acknowledged</dt>
                <dd className="mono">{alerts.data?.counts.acknowledged ?? 0}</dd>
              </div>
              <div>
                <dt>total</dt>
                <dd className="mono">{alerts.data?.counts.all ?? 0}</dd>
              </div>
              <div>
                <dt>feed</dt>
                <dd className="mono">{frame ? `${now.getTime() - Date.parse(frame.timestamp) > 60_000 ? 'stale' : 'live'}` : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className={s.alertsBlock}>
            <MicroLabel>Escalation path</MicroLabel>
            <ol className={s.escalation}>
              <li>
                <b>Acknowledge</b>
                <span>Takes ownership and stamps the time.</span>
              </li>
              <li>
                <b>Pre-treat</b>
                <span>Apply the mitigation the offsets used.</span>
              </li>
              <li>
                <b>Log the outcome</b>
                <span>The next report closes the loop in the memory.</span>
              </li>
            </ol>
          </div>
        </aside>
      </div>

      <Source kind="API">/wells/{wellId}/alerts · acknowledgement posts to /alerts/{'{id}'}/ack</Source>

      <Drawer
        open={history}
        onClose={() => setHistory(false)}
        eyebrow="ALERT HISTORY"
        title="Acknowledged"
        subtitle={<span className="mono">{done.length} resolved</span>}
      >
        {done.length === 0 ? (
          <p className={s.alertsCaption}>Nothing acknowledged yet in this session.</p>
        ) : (
          <ul className={s.historyList}>
            {done.map((a) => (
              <li key={a.id}>
                <div className={s.alertHead}>
                  <div>
                    <p className={s.alertCat}>
                      <span className="mono">{a.id}</span>
                      <span className={s.dotSep} aria-hidden />
                      {a.category}
                    </p>
                    <h3 className={s.alertTitle}>{a.title}</h3>
                  </div>
                  <Chip tone="green">ACK</Chip>
                </div>
                {a.acknowledged && (
                  <p className={s.alertsCaption}>
                    by {a.acknowledged.by} at {a.acknowledged.at}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </Section>
  )
}
