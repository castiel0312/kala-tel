import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import { Bar, ColumnChart, DepthHistogram, MicroLabel, ProvenanceTag, ScoreGauge } from '../../components/kit'
import { Section, Source } from '../Section'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.analytics

/**
 * 11 · Historical analytics.
 *
 * Three charts and the scope that makes them honest. Every panel states the window it was
 * computed over — "24 wells within 10 km, 1998–2025" — because an aggregate without its
 * denominator is decoration.
 */
export function AnalyticsSection() {
  const { goTo, well } = useNwis()
  const wellBitMd = well.data?.bit.mdM
  const analytics = useQuery({ queryKey: qk.analytics, queryFn: api.analytics, staleTime: 300_000 })
  const a = analytics.data

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
      actions={
        a ? (
          <ProvenanceTag kind="HISTORICAL" label={a.scope.description.toUpperCase()} />
        ) : undefined
      }
    >
      {a ? (
        <>
          <div className={s.analyticsGrid}>
            <figure className={s.chartPanel}>
              <figcaption>
                <MicroLabel rule={false}>Barail events by metres below the formation top</MicroLabel>
                <span className={s.chartUnit}>events</span>
              </figcaption>
              <DepthHistogram
                bins={a.barailEventsByMetresBelowTop.map((b) => ({ label: b.bin, value: b.events, highlight: b.highlight }))}
                height={188}
                currentDepth={wellBitMd}
              />
              <p className={s.chartNote}>
                The band the bit is entering. Ten to twenty metres below the top holds the most events in 27 years.
              </p>
            </figure>

            <figure className={s.chartPanel}>
              <figcaption>
                <MicroLabel rule={false}>Mud loss by formation</MicroLabel>
                <span className={s.chartUnit}>events</span>
              </figcaption>
              <ColumnChart
                rows={a.mudLossByFormation.map((r) => ({ label: r.formation, value: r.events, highlight: r.highlight }))}
                unit=""
                height={188}
                labelWidth={78}
              />
              <p className={s.chartNote}>Barail dominates, and Barail is the section being drilled.</p>
            </figure>

            <figure className={s.chartPanel}>
              <figcaption>
                <MicroLabel rule={false}>Non-productive time by cause</MicroLabel>
                <span className={s.chartUnit}>hours</span>
              </figcaption>
              <ColumnChart
                rows={a.nptHoursByType.map((r) => ({ label: r.type, value: r.hours, highlight: r.highlight }))}
                unit=" h"
                height={188}
                labelWidth={96}
              />
              <p className={s.chartNote}>170 hours lost across 24 wells. Circulation is the largest share.</p>
            </figure>
          </div>

          <div className={s.analyticsFoot}>
            <div className={s.analyticsStat}>
              <MicroLabel>Similar offsets</MicroLabel>
              <ul className={s.simList}>
                {a.offsetSimilarity.map((o) => (
                  <li key={o.id}>
                    <span className="mono">{o.id}</span>
                    <Bar value={o.similarity} tone={o.similarity >= a.relevanceThreshold ? 'yellow' : 'black'} height={6} />
                    <b className="mono">{o.similarity}</b>
                    <span className="mono">{o.distanceKm.toFixed(1)} km</span>
                  </li>
                ))}
              </ul>
              <p className={s.chartNote}>Relevance threshold {a.relevanceThreshold} % — below the line, an offset is history.</p>
            </div>

            <div className={s.analyticsStat}>
              <MicroLabel>Risk by formation</MicroLabel>
              <table className={s.riskTable}>
                <thead>
                  <tr>
                    <th scope="col">Formation</th>
                    {a.riskByFormation.columns.map((c) => (
                      <th key={c} scope="col" className={s.num}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.riskByFormation.rows.map((r) => (
                    <tr key={r.formation}>
                      <th scope="row">{r.formation}</th>
                      {r.counts.map((c, i) => (
                        <td key={i} className={[s.num, c > 0 && s.hot].filter(Boolean).join(' ')}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={s.analyticsStat}>
              <MicroLabel>Mud loss per year</MicroLabel>
              <div className={s.yearRow}>
                {a.mudLossPerYear.map((y) => (
                  <div key={y.year} className={s.yearCell} data-high={y.highlight ? 'true' : undefined}>
                    <span
                      className={s.yearBar}
                      style={{ height: `${Math.max(4, (y.events / 3) * 100)}%` }}
                      title={`${y.events} events in ${y.year}`}
                    />
                    <em className="mono">{String(y.year).slice(2)}</em>
                  </div>
                ))}
              </div>
              <p className={s.chartNote}>No trend to fit. Four events in the last four years is four events.</p>
            </div>

            <div className={s.analyticsStat}>
              <MicroLabel>Field summary</MicroLabel>
              <div className={s.fieldSummary}>
                <ScoreGauge value={89} size={84} level="HIGH" label="relevance" />
                <dl className={s.kv}>
                  <div>
                    <dt>wells in scope</dt>
                    <dd className="mono">{a.scope.description.replace(/\D+/g, '') || '24'}</dd>
                  </div>
                  <div>
                    <dt>years</dt>
                    <dd className="mono">
                      {a.scope.years[0]}–{a.scope.years[1]}
                    </dd>
                  </div>
                  <div>
                    <dt>radius</dt>
                    <dd className="mono">{a.scope.radiusKm} km</dd>
                  </div>
                </dl>
              </div>
              <button type="button" className={s.analyticsLink} onClick={() => goTo('wells')}>
                See the offsets ranked <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className={s.skeletonBlock} aria-hidden />
      )}

      <Source kind="API">/analytics/summary · scope {a?.scope.description ?? 'loading'}</Source>
    </Section>
  )
}
