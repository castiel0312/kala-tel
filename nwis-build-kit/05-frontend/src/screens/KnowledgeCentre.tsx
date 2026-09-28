import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useActiveWell } from '../hooks/useActiveWell'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { Button, Chip, Panel, ProvenanceTag, Skel, ErrorStrip } from '../components/kit'
import { Icon } from '../components/kit/icons'
import { fmtInt } from '../lib/format'
import s from './KnowledgeCentre.module.css'

/* ============================================================================
   Knowledge Centre — screen 08.

   The front door to the knowledge side of the platform: what is in the store,
   what the active well currently touches, and one worked answer that can be
   traced end to end. The rule here is that nothing is claimed as "known" without
   a document and a page behind it, so the store tallies and the evidence path
   are the headline rather than a diagram.
   ========================================================================== */

const KIND_META = {
  LIVE: { label: 'Live eRTMAC', body: 'What the rig is doing right now, over the WITSML socket.' },
  HISTORICAL: { label: 'Indexed archive', body: 'Scanned reports, read page by page and extracted into events.' },
  DERIVED: { label: 'Derived relationships', body: 'Similarity, depth windows and the graph edges between the two.' },
} as const

export function KnowledgeCentre() {
  const { data: well } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'

  const [graph, docs, analytics, risks] = useQueries({
    queries: [
      { queryKey: qk.graph(undefined, 2), queryFn: () => api.graph(undefined, 2), staleTime: 60_000 },
      { queryKey: qk.documents(undefined, undefined), queryFn: () => api.documents(), staleTime: 120_000 },
      { queryKey: qk.analytics, queryFn: api.analytics, staleTime: 120_000 },
      { queryKey: qk.risks(wellId), queryFn: () => api.risks(wellId), staleTime: 30_000 },
    ],
  })

  const g = graph.data
  const d = docs.data
  const a = analytics.data
  const topRisk = (risks.data?.risks ?? []).find((r) => r.level === 'HIGH') ?? (risks.data?.risks ?? [])[0]
  const loading = graph.isLoading || docs.isLoading
  const failed = [graph, docs].find((q) => q.isError)

  return (
    <Screen
      num="08"
      section="Knowledge"
      title="Knowledge Centre"
      signal={Boolean(topRisk?.level === 'HIGH')}
      sub={wellId ? `What the store knows about ${wellId}, and what it does not.` : 'What the store knows.'}
      aside={
        <HeaderTools>
          <ProvenanceTag kind="HISTORICAL" label="ARCHIVE" />
          <ProvenanceTag kind="DERIVED" label="GRAPH" />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        {failed ? (
          <ErrorStrip body="The knowledge store could not be reached." action="Retry" onAction={() => void failed.refetch()} />
        ) : loading ? (
          <Panel title="Reading the store">
            <Skel h={220} />
          </Panel>
        ) : (
          <>
            <div className={s.stats}>
              <div className={s.stat}>
                <b className="mono">{(g?.totalNodesInStore ?? 0).toLocaleString()}</b>
                <span>nodes in the store</span>
                <small>the graph query returns {g?.nodes.length ?? 0} of them</small>
              </div>
              <div className={s.stat}>
                <b className="mono">{fmtInt(d?.totals.documents ?? 0)}</b>
                <span>documents indexed</span>
                <small>{fmtInt(d?.totals.pagesRead ?? 0)} pages read</small>
              </div>
              <div className={s.stat}>
                <b className="mono">{fmtInt(d?.totals.eventsExtracted ?? 0)}</b>
                <span>events extracted</span>
                <small>{d?.totals.needReview ?? 0} still need review</small>
              </div>
              <div className={s.stat}>
                <b className="mono">{a?.scope.radiusKm ?? 10} km</b>
                <span>analytics scope</span>
                <small>{a?.scope.description ?? ''}</small>
              </div>
            </div>

            <div className={s.duo}>
              <Panel
                title="Three kinds of knowledge"
                meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>and how they are labelled</span>}
              >
                <div className={s.kinds}>
                  {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).map((k) => (
                    <div className={s.kind} key={k}>
                      <ProvenanceTag kind={k} />
                      <div>
                        <b>{KIND_META[k].label}</b>
                        <p>{KIND_META[k].body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={s.duoLinks}>
                  <Link className={s.duoLink} to="/graph">
                    <span>Open the knowledge graph</span>
                    <Icon name="arrowRight" size={12} />
                  </Link>
                  <Link className={s.duoLink} to="/documents">
                    <span>Open the document library</span>
                    <Icon name="arrowRight" size={12} />
                  </Link>
                </div>
              </Panel>

              <Panel
                title="Worked answer"
                tone="black"
                signal={topRisk?.level === 'HIGH' ? 'danger' : 'signal'}
                meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-ink-3)' }}>traceable end to end</span>}
              >
                <p className={s.workedQ}>
                  {topRisk ? `Why is the ${topRisk.name.toLowerCase()} risk ${topRisk.probability} %?` : 'What does the store say about the next zone?'}
                </p>
                <ol className={s.chain}>
                  <li>
                    <span className={s.chainN}>1</span>
                    <span>
                      {a?.scope.description ?? 'The offset population'} — the analytics scope, not a guess.
                    </span>
                  </li>
                  <li>
                    <span className={s.chainN}>2</span>
                    <span>
                      {topRisk ? `${topRisk.evidenceSummary}` : 'Events below the target top on the closest offsets.'}
                    </span>
                  </li>
                  <li>
                    <span className={s.chainN}>3</span>
                    <span>{g?.evidencePathText ?? 'The graph path from the active well to the document that settled it.'}</span>
                  </li>
                </ol>
                <div className={s.workedFoot}>
                  <Chip tone="outline">{topRisk ? `p. of the source page` : 'source page'}</Chip>
                  <Link to="/assistant">Ask it yourself</Link>
                </div>
              </Panel>
            </div>

            <Panel
              title="Where the current well touches the store"
              tone="paper"
              meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>{g?.center ?? wellId}</span>}
              flush
            >
              <div className={s.touch}>
                {[
                  { k: 'Live', v: `${g?.edges.filter((e) => e.relation === 'DRILLING_IN').length ?? 0} drilling relations`, to: '/command' as const, note: 'current formation and rig state' },
                  { k: 'Offsets', v: `${a?.offsetSimilarity.filter((o) => o.similarity >= a.relevanceThreshold).length ?? 0} above the relevance threshold`, to: '/nearby' as const, note: 'similarity is derived, not measured' },
                  { k: 'Risks', v: `${risks.data?.counts.HIGH ?? 0} high, ${risks.data?.counts.MEDIUM ?? 0} medium`, to: '/risk' as const, note: 'model posterior with evidence' },
                  { k: 'Documents', v: `${d?.documents.length ?? 0} in this view, ${fmtInt(d?.totals.eventsExtracted ?? 0)} events`, to: '/documents' as const, note: 'every event carries a page' },
                ].map((r) => (
                  <Link className={s.touchRow} to={r.to} key={r.k}>
                    <span className={s.touchK}>{r.k}</span>
                    <span className={s.touchV}>{r.v}</span>
                    <span className={s.touchN}>{r.note}</span>
                    <Icon name="arrowRight" size={12} />
                  </Link>
                ))}
              </div>
            </Panel>

            <div className={s.ctaRow}>
              <Button variant="primary" onClick={() => window.location.assign('/graph')}>
                Explore the graph
              </Button>
              <Button onClick={() => window.location.assign('/documents')}>Read a source page</Button>
              <span className={s.ctaNote}>
                Nothing in this platform is presented as known without a document and a page behind it.
              </span>
            </div>
          </>
        )}
      </div>
    </Screen>
  )
}
