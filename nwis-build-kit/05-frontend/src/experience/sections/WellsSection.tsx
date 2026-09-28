import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import type { OffsetWell } from '../../api/types'
import {
  Bar,
  Button,
  Chip,
  DataTable,
  Drawer,
  EmptyState,
  EventGlyph,
  RiskChip,
  SimilarityBar,
  StatusChip,
  type Column,
} from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { fmtInt, fmtKM } from '../../lib/format'
import { Section, Source } from '../Section'
import { useNwis, useNearbyWells } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.wells
const SHOWN = 4

/**
 * 04 · Nearby well intelligence.
 *
 * The map proves the offsets are spatial; this section is the ranking. Similarity comes from
 * the API and is never recomputed here — an unexplained 87 % is not decision-grade, so the
 * four factors travel with every well, and the lesson that operator left behind is quoted
 * with its source rather than summarised.
 */
export function WellsSection() {
  const { wellId, selectedWellId, selectWell, openDocument, goTo } = useNwis()
  const offsets = useNearbyWells()
  const [allOpen, setAllOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const wells = useMemo(() => offsets.data?.wells ?? [], [offsets.data])
  const shown = expanded ? wells : wells.slice(0, SHOWN)
  const selectedId = selectedWellId ?? wells[0]?.id ?? null

  const detail = useQuery({
    queryKey: qk.offset(wellId ?? '', selectedId ?? ''),
    queryFn: () => api.offset(wellId as string, selectedId as string),
    enabled: Boolean(wellId && selectedId),
  })

  const columns: Column<OffsetWell>[] = useMemo(
    () => [
      { key: 'id', header: 'Well', id: true, width: 66, cell: (w) => <b>{w.id}</b> },
      {
        key: 'similarity',
        header: 'Similarity',
        num: true,
        width: 122,
        sortValue: (w) => w.similarity,
        cell: (w) => <SimilarityBar value={w.similarity} />,
      },
      { key: 'dist', header: 'Dist at bit', num: true, width: 82, sortValue: (w) => w.distanceAtBitKm, cell: (w) => fmtKM(w.distanceAtBitKm) },
      { key: 'td', header: 'TD (MD)', num: true, width: 88, sortValue: (w) => w.tdMdM, cell: (w) => `${fmtInt(w.tdMdM)} m` },
      {
        key: 'barail',
        header: 'Barail top',
        num: true,
        width: 96,
        sortValue: (w) => w.barailTopTvdssM ?? 0,
        cell: (w) => (w.barailTopTvdssM === null ? '—' : `${fmtInt(w.barailTopTvdssM)} m`),
      },
      { key: 'spud', header: 'Spud', num: true, width: 66, sortValue: (w) => w.spud, cell: (w) => w.spud },
      {
        key: 'loss',
        header: 'Loss',
        width: 66,
        sortValue: (w) => (w.hasLossEvents ? 1 : 0),
        cell: (w) => (w.hasLossEvents ? <Chip tone="red">YES</Chip> : <Chip tone="grey">NO</Chip>),
      },
      { key: 'risk', header: 'Risk', width: 78, sortValue: (w) => w.risk, cell: (w) => <RiskChip level={w.risk} /> },
      { key: 'status', header: 'Status', width: 96, sortValue: (w) => w.status, cell: (w) => <StatusChip status={w.status} /> },
    ],
    [],
  )

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
          <Button size="sm" onClick={() => goTo('map')}>
            <Icon name="cube3d" size={12} /> Back to the map
          </Button>
          <Button size="sm" variant="primary" onClick={() => setAllOpen(true)}>
            View all {offsets.data?.count ?? ''}
          </Button>
        </>
      }
    >
      <div className={s.wellCards}>
        {shown.map((w) => (
          <article
            key={w.id}
            className={[s.wellCard, w.id === selectedId && s.wellCardOn].filter(Boolean).join(' ')}
            onMouseEnter={() => selectWell(w.id)}
          >
            <header className={s.wellCardHead}>
              <h3 className={s.wellCardId}>{w.id}</h3>
              <SimilarityBar value={w.similarity} />
            </header>

            <p className={s.wellCardSim}>
              <b className="mono">{w.similarity}%</b> similar
            </p>
            <Bar value={w.similarity} tone={w.relevant ? 'yellow' : 'black'} height={4} ticks={5} />

            <dl className={s.wellCardKv}>
              <div>
                <dt>distance at bit</dt>
                <dd className="mono">{fmtKM(w.distanceAtBitKm)}</dd>
              </div>
              <div>
                <dt>total depth</dt>
                <dd className="mono">{fmtInt(w.tdMdM)} m MD</dd>
              </div>
              <div>
                <dt>Barail top</dt>
                <dd className="mono">{w.barailTopTvdssM === null ? '—' : `${fmtInt(w.barailTopTvdssM)} m`}</dd>
              </div>
              <div>
                <dt>spud</dt>
                <dd className="mono">{w.spud}</dd>
              </div>
            </dl>

            <div className={s.wellCardFactors}>
              {(['stratigraphy', 'trajectory', 'mudSystem', 'proximity'] as const).map((k) => (
                <span key={k}>
                  {k === 'mudSystem' ? 'mud' : k}
                  <b className="mono">{w.similarityFactors[k]}</b>
                </span>
              ))}
            </div>

            <div className={s.wellCardChips}>
              <RiskChip level={w.risk} />
              {w.hasLossEvents && <Chip tone="redGhost">loss history</Chip>}
              <StatusChip status={w.status} />
            </div>

            {w.id === selectedId && detail.data?.events.length ? (
              <ul className={s.wellCardEvents}>
                {detail.data.events.map((e) => (
                  <li key={e.id}>
                    <EventGlyph type={e.type} severity={e.severity} />
                    <span className={s.evtTitle}>{e.title}</span>
                    <span className="mono">{fmtInt(e.mdM)} m</span>
                    {e.alignedMdOnActiveM && <span className={s.evtAlign}>→ {fmtInt(e.alignedMdOnActiveM)} m here</span>}
                    {e.source.page && (
                      <button
                        type="button"
                        className={s.evtSrc}
                        onClick={() => openDocument(e.source.documentId, e.source.page as number)}
                      >
                        p.{e.source.page} <Icon name="arrowRight" size={10} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}

            {w.lesson && (
              <blockquote className={s.lesson}>
                <p>{w.lesson}</p>
                {w.lessonSource && <cite>{w.lessonSource}</cite>}
              </blockquote>
            )}

            <div className={s.wellCardActions}>
              <Button
                size="sm"
                variant={w.id === selectedId ? 'on' : 'default'}
                onClick={() => selectWell(w.id)}
                aria-pressed={w.id === selectedId}
              >
                {w.id === selectedId ? 'Selected' : 'Select'}
              </Button>
              <Button size="sm" onClick={() => goTo('graph')}>
                History
              </Button>
            </div>
          </article>
        ))}

        {wells.length === 0 && (
          <EmptyState
            title="No offsets match these filters"
            body="Widen the radius or lower the similarity threshold in the map section. Similarity is computed by the API, so an empty result is a real answer."
            actions={
              <Button size="sm" onClick={() => goTo('map')}>
                Adjust the filters
              </Button>
            }
          />
        )}
      </div>

      {wells.length > SHOWN && (
        <div className={s.wellsMore}>
          <Button size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? 'Show fewer' : `Show ${wells.length - SHOWN} more`}
          </Button>
          <span className="mono">
            {offsets.data?.count ?? 0} in radius · {offsets.data?.relevantCount ?? 0} relevant
          </span>
        </div>
      )}

      <Source kind="API">/wells/{wellId}/offsets · similarity and factors are the API’s, not the page’s</Source>

      <Drawer
        open={allOpen}
        onClose={() => setAllOpen(false)}
        eyebrow="NEARBY WELLS"
        title={`All offsets within the radius`}
        subtitle={
          <span className="mono">
            {offsets.data?.count ?? 0} wells · sorted by similarity
          </span>
        }
        wide
      >
        <DataTable
          rows={wells}
          columns={columns}
          rowKey={(w) => w.id}
          selectedKey={selectedId}
          onSelect={(w) => selectWell(w.id)}
          onRowClick={(w) => {
            selectWell(w.id)
            setAllOpen(false)
            goTo('graph')
          }}
          dense
          maxHeight={520}
          emptyTitle="Nothing in range"
          emptyBody="No offset matches the current filters."
        />
      </Drawer>
    </Section>
  )
}
