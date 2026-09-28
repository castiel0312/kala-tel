import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import type { RiskLevel, RiskSummary } from '../api/types'
import { useActiveWell } from '../hooks/useActiveWell'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import {
  Button,
  Chip,
  CompositionBars,
  EmptyState,
  ErrorStrip,
  KeyValueList,
  Panel,
  ProvenanceTag,
  RiskChip,
  ScoreGauge,
  Segmented,
  Skel,
  TrendChart,
  type Column,
} from '../components/kit'
import { EventGlyph } from '../components/kit/events'
import { Icon } from '../components/kit/icons'
import { fmtInt, fmtValue } from '../lib/format'
import s from './RiskCentre.module.css'

/* ============================================================================
   Risk Centre — screen 05.

   A risk here is a depth window with a probability, and the discipline of this
   screen is that a probability is never shown without the evidence that
   produced it and the confidence the model has in itself. Every row carries
   its window, its trend, and its band; the detail pane carries the historical
   events, what worked on the offsets, and what did not.
   ========================================================================== */

const LEVELS: { value: 'ALL' | RiskLevel; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const LEVEL_TONE: Record<RiskLevel, 'red' | 'yellow' | 'green'> = {
  HIGH: 'red',
  MEDIUM: 'yellow',
  LOW: 'green',
}

const STATUS_TAG: Record<RiskSummary['status'], { label: string; tone: 'ink' | 'yellow' | 'grey' }> = {
  ACT_NOW: { label: 'ACT NOW', tone: 'ink' },
  WATCH: { label: 'WATCH', tone: 'yellow' },
  MONITOR: { label: 'MONITOR', tone: 'grey' },
}

export function RiskCentre() {
  const { riskId: routeRisk } = useParams()
  const navigate = useNavigate()
  const { data: well, isError, refetch } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'

  const [level, setLevel] = useState<'ALL' | RiskLevel>('ALL')
  const [sel, setSel] = useState<string | null>(routeRisk ?? null)
  const [showModel, setShowModel] = useState(false)

  const risks = useQuery({
    queryKey: qk.risks(wellId),
    queryFn: () => api.risks(wellId),
    enabled: Boolean(well?.id),
    staleTime: 30_000,
  })

  const rows = useMemo(
    () => (risks.data?.risks ?? []).filter((r) => level === 'ALL' || r.level === level),
    [risks.data, level],
  )
  const selectedId = sel ?? risks.data?.risks[0]?.id ?? null

  const detail = useQuery({
    queryKey: qk.risk(wellId, selectedId ?? ''),
    queryFn: () => api.risk(wellId, selectedId ?? ''),
    enabled: Boolean(well?.id && selectedId),
  })

  const d = detail.data
  const counts = risks.data?.counts
  const bitMd = well?.bit.mdM ?? 3124
  const next = risks.data?.nextZone

  const cols: Column<RiskSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Risk',
        width: 'minmax(0,1fr)',
        cell: (r) => (
          <span className={s.nameCell}>
            <b>{r.name}</b>
            <span className={s.nameSum}>{r.evidenceSummary}</span>
          </span>
        ),
      },
      {
        key: 'level',
        header: 'Level',
        width: 76,
        sortValue: (r) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 })[r.level],
        cell: (r) => <RiskChip level={r.level} />,
      },
      {
        key: 'window',
        header: 'Window (m MD)',
        num: true,
        width: 122,
        sortValue: (r) => r.windowMdM[0],
        cell: (r) => `${fmtInt(r.windowMdM[0])}–${fmtInt(r.windowMdM[1])}`,
      },
      {
        key: 'ahead',
        header: 'Ahead of bit',
        num: true,
        width: 100,
        sortValue: (r) => r.windowMdM[0] - bitMd,
        cell: (r) => {
          const ahead = r.windowMdM[0] - bitMd
          return ahead > 0 ? `+${fmtInt(ahead)} m` : `${fmtInt(ahead)} m`
        },
      },
      {
        key: 'p',
        header: 'Probability',
        num: true,
        width: 118,
        sortValue: (r) => r.probability,
        cell: (r) => (
          <span className={s.probCell}>
            <span className={s.probBar}>
              <i
                className={LEVEL_TONE[r.level] === 'red' ? s.probRed : LEVEL_TONE[r.level] === 'yellow' ? s.probYellow : s.probGreen}
                style={{ width: `${r.probability}%` }}
              />
            </span>
            <b className="mono">{r.probability}%</b>
          </span>
        ),
      },
      {
        key: 'trend',
        header: 'Trend',
        num: true,
        width: 88,
        sortValue: (r) => r.trend?.from ?? 0,
        cell: (r) => (r.trend ? `${r.trend.from}% → ${r.probability}%` : '—'),
      },
      {
        key: 'conf',
        header: 'Confidence',
        num: true,
        width: 96,
        sortValue: (r) => r.confidence,
        cell: (r) => `${Math.round(r.confidence * 100)}% ${r.confidenceBand}`,
      },
      {
        key: 'status',
        header: 'Status',
        width: 92,
        sortValue: (r) => r.status,
        cell: (r) => <Chip tone={STATUS_TAG[r.status].tone}>{STATUS_TAG[r.status].label}</Chip>,
      },
    ],
    [bitMd],
  )

  const bars = useMemo(
    () =>
      (risks.data?.risks ?? []).map((r) => ({
        label: r.name,
        value: r.probability,
        color: r.level === 'HIGH' ? 'var(--nw-red)' : r.level === 'MEDIUM' ? 'var(--nw-yellow)' : 'var(--nw-green)',
        note: r.status === 'ACT_NOW' ? 'act now' : undefined,
      })),
    [risks.data],
  )

  if (isError) {
    return (
      <Screen num="05" section="Intelligence" title="Risk Centre" sub="Every risk ahead of the bit, with the evidence behind it.">
        <ErrorStrip body="The active well could not be loaded." action="Retry" onAction={() => void refetch()} />
      </Screen>
    )
  }

  return (
    <Screen
      num="05"
      section="Intelligence"
      title="Risk Centre"
      signal={Boolean(next && next.metresAhead < 100)}
      sub={
        next ? (
          <>
            Next zone <b className="mono">{next.text}</b> · {fmtInt(next.metresAhead)} m ahead of the bit
          </>
        ) : (
          'Every risk ahead of the bit, with the evidence behind it.'
        )
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind="SYNTHETIC" label="MODEL OUTPUT" />
          <Segmented value={level} options={LEVELS} onChange={setLevel} ariaLabel="Filter by level" />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <div className={s.mainCol}>
          <Panel
            title="Risks ahead of the bit"
            meta={
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>
                {counts ? `${counts.HIGH} high · ${counts.MEDIUM} medium · ${counts.LOW} low` : 'loading'}
              </span>
            }
            flush
            className={s.riskTable}
          >
            {risks.isLoading ? (
              <div className={s.skelPad}>
                <Skel h={200} />
              </div>
            ) : (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      {cols.map((c) => (
                        <th key={c.key} className={c.num ? s.num : undefined} style={{ width: c.width as number | undefined }}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className={[r.id === selectedId ? s['row--on'] : '', r.level === 'HIGH' ? s['row--high'] : ''].filter(Boolean).join(' ')}
                        onClick={() => {
                          setSel(r.id)
                          navigate(`/risk/${r.id}`, { replace: true })
                        }}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSel(r.id)
                          }
                        }}
                      >
                        {cols.map((c) => (
                          <td key={c.key} className={c.num ? s.num : undefined}>
                            {c.cell(r)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <div className={s.skelPad}>
                    <EmptyState title={`No ${level === 'ALL' ? '' : level.toLowerCase() + ' '}risks`} body="The model returned no risk zones in this band for the current well." />
                  </div>
                )}
              </div>
            )}
          </Panel>

          <div className={s.duo}>
            <Panel title="Probability by risk" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>model posterior</span>}>
              {bars.length ? (
                <CompositionBars rows={bars} unit="%" onSelect={(label) => {
                  const hit = risks.data?.risks.find((r) => r.name === label)
                  if (hit) {
                    setSel(hit.id)
                    navigate(`/risk/${hit.id}`, { replace: true })
                  }
                }} />
              ) : (
                <Skel h={90} />
              )}
            </Panel>

            <Panel title="Depth windows on the active well" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>m MD</span>}>
              <div className={s.windowScale}>
                <div className={s.windowTrack}>
                  {rows.map((r) => {
                    const lo = ((r.windowMdM[0] - WINDOW_LO) / WINDOW_SPAN) * 100
                    const width = ((r.windowMdM[1] - r.windowMdM[0]) / WINDOW_SPAN) * 100
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className={[s.window, r.id === selectedId ? s['window--on'] : ''].filter(Boolean).join(' ')}
                        style={{ left: `${lo}%`, width: `${Math.max(1.5, width)}%`, background: r.level === 'HIGH' ? 'var(--nw-red)' : r.level === 'MEDIUM' ? 'var(--nw-yellow)' : 'var(--nw-green)' }}
                        title={`${r.name} · ${fmtInt(r.windowMdM[0])}–${fmtInt(r.windowMdM[1])} m MD`}
                        onClick={() => {
                          setSel(r.id)
                          navigate(`/risk/${r.id}`, { replace: true })
                        }}
                        aria-label={`${r.name} window ${fmtInt(r.windowMdM[0])} to ${fmtInt(r.windowMdM[1])} metres`}
                      />
                    )
                  })}
                  <div className={s.windowBit} style={{ left: `${((bitMd - WINDOW_LO) / WINDOW_SPAN) * 100}%` }} title={`bit ${fmtInt(bitMd)} m`} />
                </div>
                <div className={s.windowAxis}>
                  {[WINDOW_LO, WINDOW_LO + WINDOW_SPAN / 2, WINDOW_LO + WINDOW_SPAN].map((v) => (
                    <span key={v} className="mono">
                      {fmtInt(v)}
                    </span>
                  ))}
                </div>
                <div className={s.windowFoot}>
                  <span className="mono">bit {fmtInt(bitMd)} m</span>
                  <span className="mono">look-ahead +{fmtInt(well?.lookAheadM ?? 150)} m</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <div className={s.sideCol}>
          {d ? (
            <>
              <Panel title={d.name} tone="black" signal={d.level === 'HIGH' ? 'danger' : 'signal'} meta={<RiskChip level={d.level} probability={d.probability} />}>
                <div className={s.head}>
                  <ScoreGauge value={d.probability} level={d.level === 'HIGH' ? 'HIGH' : d.level === 'MEDIUM' ? 'MEDIUM' : 'LOW'} label="% risk" />
                  <div className={s.headText}>
                    <div className={s.headWindow}>
                      {fmtInt(d.windowMdM[0])}–{fmtInt(d.windowMdM[1])} m MD
                    </div>
                    <div className={s.headStatus}>
                      <Chip tone={STATUS_TAG[d.status].tone}>{STATUS_TAG[d.status].label}</Chip>
                    </div>
                    {d.trend && (
                      <div className={s.headTrend} title={`${d.trend.from}% → ${d.probability}% over ${d.trend.minutes} min`}>
                        <TrendChart
                          height={54}
                          series={[{ key: 'p', label: 'Probability', color: 'var(--nw-yellow)', points: trendPoints(d.trend.from, d.probability), width: 1.5, area: true }]}
                          showLegend={false}
                          unit="%"
                          yLabel="%"
                          ariaLabel="Probability trend"
                        />
                      </div>
                    )}
                    <div className={s.headConf}>
                      <span>confidence</span>
                      <b className="mono">{Math.round(d.confidence * 100)}%</b>
                      <span>{d.confidenceBand}</span>
                    </div>
                  </div>
                </div>

                {d.stats?.length ? (
                  <div className={s.stats}>
                    {d.stats.map((st) => (
                      <div key={st.label}>
                        <b className="mono">{st.value}</b>
                        <span>{st.label}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className={s.summary}>{d.evidenceSummary}</p>

                {d.reasons?.length ? (
                  <ul className={s.reasons}>
                    {d.reasons.map((r, i) => (
                      <li key={i}>
                        <Icon name="dot" size={11} />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className={s.evidence}>
                  <div className={s.evidenceHead}>Historical events</div>
                  {d.evidence.map((e) => (
                    <div className={s.evRow} key={e.id}>
                      <EventGlyph type={e.type} severity={e.severity} />
                      <span className={s.evT}>{e.title}</span>
                      <span className={s.evW}>{e.wellId}</span>
                      <span className="mono">{fmtInt(e.mdM)} m</span>
                      {e.source.page ? (
                        <Link className={s.evSrc} to={`/documents/${e.source.documentId}/${e.source.page}`}>
                          p.{e.source.page}
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className={s.rec}>
                  <div className={s.recK}>Recommendation</div>
                  <p className={s.recT}>{d.recommendation}</p>
                </div>
              </Panel>

              <Panel
                title="Mitigations"
                meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>from the offsets</span>}
                flush
              >
                {d.mitigations.map((m, i) => (
                  <div className={[s.mit, m.worked ? s['mit--worked'] : s['mit--failed']].join(' ')} key={i}>
                    <span className={s.mitFlag}>{m.worked ? 'WORKED' : 'FAILED'}</span>
                    <span className={s.mitT}>{m.text}</span>
                  </div>
                ))}
              </Panel>

              <Panel
                title="Model"
                meta={
                  <Button size="sm" variant="ghost" onClick={() => setShowModel((v) => !v)} aria-expanded={showModel}>
                    {showModel ? 'Hide' : 'Show'}
                  </Button>
                }
              >
                {showModel ? (
                  <KeyValueList
                    items={Object.entries(d.model).map(([k, v]) => ({
                      k: k.replace(/([A-Z])/g, ' $1'),
                      v: <span className="mono">{typeof v === 'number' ? fmtValue(v) : String(v)}</span>,
                    }))}
                  />
                ) : (
                  <p className={s.modelNote}>
                    A probability is only useful next to its provenance. {d.evidence.length} events from {new Set(d.evidence.map((e) => e.wellId)).size} wells, model{' '}
                    <span className="mono">{String(d.model.version ?? 'n/a')}</span> calibrated on {String(d.model.calibrationSet ?? 'n/a')}.
                  </p>
                )}
              </Panel>
            </>
          ) : (
            <Panel title="Risk detail">
              <Skel h={220} ink />
            </Panel>
          )}
        </div>
      </div>
    </Screen>
  )
}

/**
 * The API sends a trend as from→now over a window in minutes. A linear ramp is drawn because
 * the intermediate values are not in the payload; the HUD labels the span so nobody reads the
 * curve as measured history.
 */
function trendPoints(from: number, to: number): number[] {
  const steps = 8
  return Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps)
}

/* Depth windows share one scale so rows are comparable. */
const WINDOW_LO = 3060
const WINDOW_SPAN = 520
