import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import {
  Button,
  CompositionBars,
  Drawer,
  EventGlyph,
  MicroLabel,
  ProvenanceTag,
  RiskChip,
  ScoreGauge,
  Segmented,
  StatusChip,
} from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { fmtInt } from '../../lib/format'
import { Section, Source } from '../Section'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.risk

/**
 * 06 · Predictive risk.
 *
 * One risk owns the section, because a list of six percentages is not a decision. The
 * dominant panel carries the posterior, the reasons it moved, the evidence events and the
 * model card — the four things that make a probability worth acting on. The other risks are
 * supporting bars; their full evidence is one click away.
 */
export function RiskSection() {
  const { wellId, openDocument, goTo } = useNwis()
  const [level, setLevel] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)

  const risks = useQuery({
    queryKey: qk.risks(wellId ?? '', level === 'ALL' ? undefined : level),
    queryFn: () => api.risks(wellId as string, level === 'ALL' ? undefined : level),
    enabled: Boolean(wellId),
    staleTime: 60_000,
  })

  const list = useMemo(() => risks.data?.risks ?? [], [risks.data])
  const dominant = list.find((r) => r.level === 'HIGH') ?? list[0]
  const rest = list.filter((r) => r.id !== dominant?.id)

  const detail = useQuery({
    queryKey: qk.risk(wellId ?? '', dominant?.id ?? ''),
    queryFn: () => api.risk(wellId as string, dominant?.id as string),
    enabled: Boolean(wellId && dominant),
    staleTime: 60_000,
  })

  const openRisk = useQuery({
    queryKey: qk.risk(wellId ?? '', openId ?? ''),
    queryFn: () => api.risk(wellId as string, openId as string),
    enabled: Boolean(wellId && openId),
  })

  if (!risks.data) {
    return (
      <Section id={sec.id} no={sec.no} eyebrow={sec.eyebrow} title={sec.title} lede={sec.lede} tone={sec.tone}>
        <div className={s.skeletonBlock} aria-hidden />
      </Section>
    )
  }

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
      actions={
        <Segmented
          value={level}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ]}
          onChange={setLevel}
          ariaLabel="Filter risks by level"
        />
      }
    >
      <div className={s.riskGrid}>
        {dominant && (
          <article className={s.riskDominant}>
            <header className={s.riskDomHead}>
              <div>
                <MicroLabel>Highest risk · {dominant.status.replace('_', ' ')}</MicroLabel>
                <h3 className={[s.riskName, 'display'].join(' ')}>{dominant.name}</h3>
                <p className={s.riskWindow}>
                  Window {fmtInt(dominant.windowMdM[0])}–{fmtInt(dominant.windowMdM[1])} m MD
                  {risks.data.nextZone && ` · ${risks.data.nextZone.metresAhead} m below the bit`}
                </p>
              </div>
              <ScoreGauge value={dominant.probability} level={dominant.level} size={118} />
            </header>

            <div className={s.riskStats}>
              {(detail.data?.stats ?? []).map((st) => (
                <div key={st.label}>
                  <span className="label">{st.label}</span>
                  <b className="mono">{st.value}</b>
                </div>
              ))}
              {detail.data?.trend && (
                <div>
                  <span className="label">Trend</span>
                  <b className="mono">
                    {detail.data.trend.from}% → {dominant.probability}% in {detail.data.trend.minutes} min
                  </b>
                </div>
              )}
            </div>

            <div className={s.riskReasons}>
              <MicroLabel>Why this risk</MicroLabel>
              <ol>
                {(detail.data?.reasons ?? []).map((r, i) => (
                  <li key={i}>
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>

            {detail.data?.mitigations && (
              <div className={s.riskMitigations}>
                <MicroLabel>What the offsets did</MicroLabel>
                <ul>
                  {detail.data.mitigations.map((m, i) => (
                    <li key={i}>
                      <Icon name={m.worked ? 'check' : 'close'} size={12} />
                      <span className={m.worked ? undefined : s.failed}>{m.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.data?.recommendation && (
              <p className={s.recommendation}>
                <Icon name="target" size={13} />
                {detail.data.recommendation}
              </p>
            )}

            {detail.data?.model && (
              <div className={s.modelCard}>
                <MicroLabel rule={false}>
                  Model {detail.data.model.version} · {detail.data.model.calibrationSet}
                </MicroLabel>
                <dl>
                  <div>
                    <dt>offset prior</dt>
                    <dd className="mono">{detail.data.model.offsetPrior.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>live likelihood ratio</dt>
                    <dd className="mono">×{detail.data.model.liveLikelihoodRatio}</dd>
                  </div>
                  <div>
                    <dt>posterior</dt>
                    <dd className="mono">{detail.data.model.posterior.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Brier score</dt>
                    <dd className="mono">{detail.data.model.brier}</dd>
                  </div>
                </dl>
              </div>
            )}
          </article>
        )}

        <aside className={s.riskAside}>
          <div className={s.riskBarsBlock}>
            <MicroLabel meta={`${list.length} models`}>All risks</MicroLabel>
            <CompositionBars
              rows={rest.map((r) => ({
                label: r.name,
                value: r.probability,
                color: r.level === 'HIGH' ? 'var(--nw-red)' : r.level === 'MEDIUM' ? 'var(--nw-yellow-deep)' : 'var(--nw-graphite)',
                note: r.evidenceSummary,
              }))}
              onSelect={(label) => {
                const hit = list.find((r) => r.name === label)
                if (hit) setOpenId(hit.id)
              }}
            />
          </div>

          <div className={s.riskCounts}>
            {(['HIGH', 'MEDIUM', 'LOW'] as const).map((lv) => (
              <div key={lv}>
                <span className="label">{lv}</span>
                <b className="mono">{risks.data.counts[lv]}</b>
              </div>
            ))}
          </div>

          <div className={s.riskAsideActions}>
            <Button size="sm" onClick={() => setOpenId(dominant?.id ?? null)}>
              Full evidence
            </Button>
            <Button size="sm" onClick={() => goTo('documents')}>
              Source documents
            </Button>
          </div>
        </aside>
      </div>

      <Source kind="API">
        /wells/{wellId}/risks · posterior from the offset prior and the live likelihood ratio ·{' '}
        <ProvenanceTag kind="DERIVED" label="calibrated on 212 Barail entries" />
      </Source>

      <Drawer
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        eyebrow="RISK EVIDENCE"
        title={openRisk.data?.name ?? 'Risk'}
        subtitle={
          openRisk.data ? (
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <RiskChip level={openRisk.data.level} probability={openRisk.data.probability} />
              <StatusChip status={openRisk.data.status} />
              <span className="mono">
                {fmtInt(openRisk.data.windowMdM[0])}–{fmtInt(openRisk.data.windowMdM[1])} m MD
              </span>
            </span>
          ) : undefined
        }
        wide
        signal={openRisk.data?.level === 'HIGH' ? 'red' : 'yellow'}
      >
        {openRisk.data ? (
          <>
            <MicroLabel>Evidence events</MicroLabel>
            <ul className={s.evidenceList}>
              {openRisk.data.evidence.map((e) => (
                <li key={e.id}>
                  <div className={s.evidenceHead}>
                    <EventGlyph type={e.type} severity={e.severity} />
                    <b>{e.title}</b>
                    <span className="mono">
                      {e.wellId} · {fmtInt(e.mdM)} m
                    </span>
                  </div>
                  <p className={s.evidenceFlow}>
                    {e.cause} → {e.action} → <b>{e.outcome}</b>
                  </p>
                  {e.alignedMdOnActiveM && (
                    <p className={s.evidenceAlign}>Aligned to {fmtInt(e.alignedMdOnActiveM)} m on the active well</p>
                  )}
                  {e.source.page ? (
                    <button
                      type="button"
                      className={s.evidenceSrc}
                      onClick={() => {
                        setOpenId(null)
                        openDocument(e.source.documentId, e.source.page as number)
                      }}
                    >
                      {e.source.label} · p.{e.source.page}
                      <Icon name="arrowRight" size={11} />
                    </button>
                  ) : (
                    <span className={s.evidenceSrcPlain}>{e.source.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Drawer>
    </Section>
  )
}
