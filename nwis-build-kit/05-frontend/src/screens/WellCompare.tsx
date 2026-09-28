import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import type { HistoricalEvent } from '../api/types'
import { useActiveWell } from '../hooks/useActiveWell'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import {
  Button,
  Chip,
  CompareRow,
  DataTable,
  EmptyState,
  ErrorStrip,
  HazardStripe,
  KeyValueList,
  Panel,
  ProvenanceTag,
  RiskChip,
  Segmented,
  SimilarityBar,
  Skel,
  StatusChip,
  type Column,
} from '../components/kit'
import { EventGlyph } from '../components/kit/events'
import { Icon } from '../components/kit/icons'
import { fmtInt, fmtKM, fmtValue } from '../lib/format'
import s from './WellCompare.module.css'

/* ============================================================================
   Well Compare — screen 04.

   One question: is the active well behaving like the wells that have drilled
   this section before, and where does it differ? The API returns the offset
   parameters already aligned to the same depth below the Barail top, so this
   screen only has to be honest about which rows differ and what the offset did
   about it.
   ========================================================================== */

const PARAM_GROUPS = [
  { value: 'drilling', label: 'Drilling' },
  { value: 'pressure', label: 'Pressure' },
] as const

type ParamGroup = (typeof PARAM_GROUPS)[number]['value']

const GROUP_OF: Record<string, ParamGroup> = {
  rop: 'drilling',
  wob: 'drilling',
  rpm: 'drilling',
  torque: 'drilling',
  ecd: 'pressure',
  spp: 'pressure',
  flowOut: 'pressure',
  pitVolume: 'pressure',
  mudWeight: 'pressure',
}

export function WellCompare() {
  const { offsetId: routeOffset } = useParams()
  const navigate = useNavigate()
  const { data: active, isError, refetch } = useActiveWell()
  const wellId = active?.id ?? 'OIL-WELL-104'
  const [offsetId, setOffsetId] = useState(routeOffset ?? 'W-067')
  const [group, setGroup] = useState<ParamGroup>('drilling')

  const offsets = useQuery({
    queryKey: qk.offsets(wellId, { radius_km: 10, sort: 'similarity' }),
    queryFn: () => api.offsets(wellId, { radius_km: 10, sort: 'similarity' }),
    enabled: Boolean(active?.id),
  })

  const compare = useQuery({
    queryKey: qk.compare(wellId, offsetId),
    queryFn: () => api.compare(wellId, offsetId),
    enabled: Boolean(active?.id && offsetId),
  })

  const pickers = useMemo(() => (offsets.data?.wells ?? []).slice(0, 5), [offsets.data])
  const c = compare.data
  const rows = (c?.parameters ?? []).filter((p) => (GROUP_OF[p.key] ?? 'drilling') === group)
  const flagged = c?.parameters.filter((p) => p.flagged).length ?? 0

  const choose = (id: string) => {
    setOffsetId(id)
    navigate(`/compare/${id}`, { replace: true })
  }

  const maxOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of c?.parameters ?? []) m.set(p.key, Math.max(Math.abs(p.active), Math.abs(p.offset)) * 1.15)
    return m
  }, [c])

  const eventCols: Column<HistoricalEvent>[] = useMemo(
    () => [
      { key: 'title', header: 'Event', width: 'minmax(0,1fr)', cell: (e) => e.title },
      { key: 'md', header: 'Depth', num: true, width: 72, sortValue: (e) => e.mdM, cell: (e) => `${fmtInt(e.mdM)} m` },
      { key: 'below', header: 'Below Barail', num: true, width: 92, sortValue: (e) => e.metresBelowBarailTop ?? 0, cell: (e) => (e.metresBelowBarailTop === null ? '—' : `${fmtInt(e.metresBelowBarailTop)} m`) },
      { key: 'npt', header: 'NPT', num: true, width: 64, sortValue: (e) => e.nptHours, cell: (e) => `${e.nptHours} h` },
      { key: 'outcome', header: 'Outcome', width: 'minmax(0,1fr)', cell: (e) => e.outcome },
    ],
    [],
  )

  if (isError) {
    return (
      <Screen num="04" section="Operations" title="Well Compare" sub="The active well against the offsets that most resemble it.">
        <ErrorStrip body="The active well could not be loaded." action="Retry" onAction={() => void refetch()} />
      </Screen>
    )
  }

  return (
    <Screen
      num="04"
      section="Operations"
      title="Well Compare"
      sub={
        c ? (
          <>
            {c.active} against <b className="mono">{c.offset.id}</b> · {c.offset.similarity}% similar · {fmtKM(c.offset.distanceAtBitKm)} at bit · {flagged} of {c.parameters.length} parameters differ
          </>
        ) : (
          'The active well against the offsets that most resemble it.'
        )
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind="DERIVED" label="ALIGNED BELOW BARAIL TOP" />
          <Segmented value={group} options={[...PARAM_GROUPS]} onChange={setGroup} ariaLabel="Parameter group" />
        </HeaderTools>
      }
    >
      <div className={s.duel}>
        <div className={s.side}>
          <div className={s.sideK}>Active well</div>
          <div className={s.sideId}>{active?.id ?? wellId}</div>
          <div className={s.sideMeta}>
            {active ? `${fmtInt(active.bit.mdM)} m MD · ${active.currentFormation} · ${active.holeSection}` : '—'}
          </div>
          <div className={s.sideChips}>
            <StatusChip status={active?.status} />
            <Chip tone="outline">live</Chip>
          </div>
        </div>

        <div className={s.picker}>
          <span className={s.pickerK}>Compare with</span>
          <div className={s.pickerRow} role="group" aria-label="Choose offset well">
            {pickers.length ? (
              pickers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={[s.pickBtn, w.id === offsetId ? s['pickBtn--on'] : ''].filter(Boolean).join(' ')}
                  aria-pressed={w.id === offsetId}
                  onClick={() => choose(w.id)}
                >
                  <b>{w.id}</b>
                  <span className="mono">{w.similarity}%</span>
                </button>
              ))
            ) : (
              <span className={s.pickerEmpty}>loading offsets…</span>
            )}
          </div>
        </div>

        <div className={s.side}>
          <div className={s.sideK}>Offset well</div>
          <div className={s.sideId}>{c?.offset.id ?? offsetId}</div>
          <div className={s.sideMeta}>
            {c ? `${fmtKM(c.offset.distanceAtBitKm)} at bit · spud ${c.offset.spud} · TD ${fmtInt(c.offset.tdMdM)} m MD` : '—'}
          </div>
          <div className={s.sideChips}>
            {c && <RiskChip level={c.offset.risk} />}
            {c && <StatusChip status={c.offset.status} />}
            {c && <SimilarityBar value={c.offset.similarity} />}
          </div>
        </div>
      </div>

      <div className={s.body}>
        <div className={s.mainCol}>
          <Panel
            title="Parameters at the same depth"
            meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>{rows.length} rows · {group}</span>}
            flush
          >
            {compare.isLoading ? (
              <div className={s.skelPad}>
                <Skel h={180} />
              </div>
            ) : rows.length ? (
              <div className={s.rows}>
                {rows.map((p) => (
                  <CompareRow
                    key={p.key}
                    label={p.label}
                    unit={p.unit}
                    active={p.active}
                    offset={p.offset}
                    max={maxOf.get(p.key) ?? 100}
                    diffPct={p.diffPct}
                    flagged={p.flagged}
                    higherIsWorse
                  />
                ))}
                <div className={s.legendRow}>
                  <span className={s.legendCell}>
                    <i className={s.swatchA} /> {c?.active}
                  </span>
                  <span className={s.legendCell}>
                    <i className={s.swatchB} /> {c?.offset.id}
                  </span>
                  <span className={s.legendCell}>
                    <i className={s.swatchF} /> flagged by the API
                  </span>
                </div>
              </div>
            ) : (
              <div className={s.skelPad}>
                <EmptyState title={`No ${group} parameters`} body="The API did not return parameters in this group for this well pair." />
              </div>
            )}
          </Panel>

          <Panel title="Design differences" flush>
            {c?.design.length ? (
              <div className={s.design}>
                {c.design.map((d) => (
                  <div className={[s.designRow, d.differs ? s['designRow--differs'] : ''].filter(Boolean).join(' ')} key={d.label}>
                    <span className={s.designK}>{d.label}</span>
                    <span className={s.designA}>{d.active}</span>
                    <span className={s.designB}>{d.offset}</span>
                    <span className={s.designFlag}>{d.differs ? <Icon name="alert" size={12} /> : <Icon name="check" size={12} />}</span>
                  </div>
                ))}
                <div className={s.legendRow}>
                  <span className={s.legendCell}>{c.active}</span>
                  <span className={s.legendCell}>{c.offset.id}</span>
                </div>
              </div>
            ) : (
              <EmptyState title="No design data" body="Neither well reports a design in the API." />
            )}
          </Panel>

          <Panel
            title="What the offset did here"
            meta={
              c ? (
                <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-3)' }}>
                  {c.events.length} events
                </span>
              ) : null
            }
            flush
          >
            <DataTable
              rows={c?.events ?? []}
              columns={eventCols}
              rowKey={(e) => e.id}
              dense
              maxHeight={200}
              emptyTitle="No events on this offset"
              emptyBody={`The API has no historical events for ${c?.offset.id ?? offsetId}.`}
            />
          </Panel>
        </div>

        <div className={s.sideCol}>
          {c && (
            <Panel title="Takeaway" tone="black" signal="signal">
              <HazardStripe size="thin" />
              <p className={s.takeaway}>{c.takeaway.text}</p>
              <div className={s.takeawaySrc}>{c.takeaway.source}</div>
              <div className={s.takeawayActions}>
                <Button variant="primary" block size="sm" onClick={() => navigate('/#risk')}>
                  Predictive risk <Icon name="arrowRight" size={12} />
                </Button>
                <Button block size="sm" onClick={() => navigate('/#memory')}>
                  Search events
                </Button>
              </div>
            </Panel>
          )}

          {c?.events.length ? (
            <Panel title="Events on the offset" flush>
              {c.events.map((e) => (
                <div className={s.event} key={e.id}>
                  <div className={s.eventHead}>
                    <EventGlyph type={e.type} severity={e.severity} />
                    <span className={s.eventT}>{e.title}</span>
                    <span className={s.eventMd}>{fmtInt(e.mdM)} m</span>
                  </div>
                  <div className={s.eventBody}>
                    {e.cause} → {e.action}
                  </div>
                  <div className={s.eventOutcome}>
                    <b>{e.outcome}</b> in {e.nptHours} h
                  </div>
                  {e.source.page && (
                    <Link className={s.eventSrc} to={`/documents/${e.source.documentId}/${e.source.page}`}>
                      {e.source.label} · p.{e.source.page}
                      <Icon name="arrowRight" size={11} />
                    </Link>
                  )}
                </div>
              ))}
            </Panel>
          ) : (
            <Panel title="Events on the offset">
              <EmptyState title="Nothing recorded" body="This offset has no extracted events, so there is nothing to copy from it." />
            </Panel>
          )}

          {c && (
            <Panel title="Offset record">
              <KeyValueList
                items={[
                  { k: 'Similarity', v: `${c.offset.similarity}%` },
                  { k: 'Distance at bit', v: fmtKM(c.offset.distanceAtBitKm) },
                  { k: 'Barail top', v: c.offset.barailTopTvdssM === null ? '—' : `${fmtInt(c.offset.barailTopTvdssM)} m TVDSS` },
                  { k: 'Tipam top', v: c.offset.tipamTopTvdssM === null ? '—' : `${fmtInt(c.offset.tipamTopTvdssM)} m TVDSS` },
                  { k: 'TD', v: `${fmtInt(c.offset.tdMdM)} m MD` },
                  { k: 'Spud', v: c.offset.spud },
                  { k: 'Status', v: c.offset.status },
                  { k: 'Mud system', v: c.offset.design?.mudSystem ?? '—' },
                ]}
              />
            </Panel>
          )}

          <Panel title="Similarity factors" tone="paper">
            {c ? (
              <KeyValueList
                items={[
                  { k: 'Stratigraphy', v: `${c.offset.similarityFactors.stratigraphy}%` },
                  { k: 'Trajectory', v: `${c.offset.similarityFactors.trajectory}%` },
                  { k: 'Mud system', v: `${c.offset.similarityFactors.mudSystem}%` },
                  { k: 'Proximity', v: `${c.offset.similarityFactors.proximity}%` },
                ]}
              />
            ) : (
              <Skel h={80} />
            )}
            <p className={s.factorsNote}>
              Scores come from <span className="mono">/compare</span>. Values are only comparable between the same pair of wells.
            </p>
          </Panel>

          <Panel title="Next" tone="paper">
            <div className={s.nextLinks}>
              <Link to="/#wells">Nearby wells <Icon name="arrowRight" size={12} /></Link>
              <Link to="/#corridor">Depth corridor <Icon name="arrowRight" size={12} /></Link>
              <Link to="/#analytics">Historical analytics <Icon name="arrowRight" size={12} /></Link>
            </div>
            <div className={s.nextNote}>
              {c ? `${fmtValue(c.offset.tdMdM)} m TD · ${c.events.length} events · ${c.takeaway.text.slice(0, 64)}…` : ''}
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  )
}
