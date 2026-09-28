import { useMemo, useState } from 'react'
import { DepthCorridor } from '../../components/map/DepthCorridor'
import { Button, Chip, EventGlyph, MicroLabel, Segmented } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { fmtInt } from '../../lib/format'
import { Section, Source } from '../Section'
import { useNwis, useCorridor, useNearbyWells } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.corridor
const ALIGN_LABELS = {
  md: 'Measured depth',
  tvdss: 'True vertical depth',
  formation: 'Formation top',
} as const

/**
 * 05 · Depth corridor.
 *
 * The subsurface question, stated honestly: at what depth is the bit, and what did the
 * neighbours find at that depth? Measured depth alone scatters the same rock across the
 * offsets, so formation alignment is the default — the one that puts the events on the bit.
 * The alignment control is left in because seeing the scatter is the argument for it.
 */
export function CorridorSection() {
  const { filters, setFilter, selectedWellId, selectWell, well, goTo } = useNwis()
  const corridor = useCorridor()
  const offsets = useNearbyWells()
  const [focusEvent, setFocusEvent] = useState<string | null>(null)

  const data = corridor.data
  const wells = useMemo(() => offsets.data?.wells ?? [], [offsets.data])
  const next = well.data?.nextFormation
  const bit = data?.bit

  /** Events inside the look-ahead, nearest first — the ones that change a decision. */
  const ahead = useMemo(() => {
    if (!data) return []
    return data.columns
      .flatMap((col) => col.events.filter((e) => e.inLookAhead).map((e) => ({ ...e, wellId: col.wellId, distanceKm: col.distanceKm })))
      .sort((a, b) => a.depthM - b.depthM)
  }, [data])

  const allEvents = useMemo(() => {
    if (!data) return 0
    return data.columns.reduce((n, col) => n + col.events.length, 0)
  }, [data])

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
          value={filters.align}
          options={(['formation', 'md', 'tvdss'] as const).map((a) => ({ value: a, label: ALIGN_LABELS[a] }))}
          onChange={(v) => setFilter('align', v)}
          ariaLabel="Depth alignment"
        />
      }
    >
      <div className={s.corridorGrid}>
        <div className={s.corridorStage}>
          {data ? (
            <DepthCorridor
              corridor={data}
              height={520}
              selectedWellId={selectedWellId}
              onSelectWell={selectWell}
              onPickEvent={(wellId, eventId) => setFocusEvent(`${wellId}:${eventId}`)}
            />
          ) : (
            <div className={s.corridorSkeleton} aria-hidden />
          )}
        </div>

        <aside className={s.corridorAside}>
          <div className={s.corridorBlock}>
            <MicroLabel>Bit</MicroLabel>
            <p className={[s.corridorBig, 'display'].join(' ')}>
              {bit ? fmtInt(bit.depthM) : '—'}
              <span>m {data?.axis.unit.includes('TVDSS') ? 'TVDSS' : 'MD'}</span>
            </p>
            <p className={s.corridorCaption}>{data?.caption ?? 'Loading the corridor…'}</p>
          </div>

          <div className={s.corridorBlock}>
            <MicroLabel>In the look-ahead</MicroLabel>
            {ahead.length === 0 ? (
              <p className={s.corridorCaption}>
                No offset event falls inside the next {data?.bit.lookAheadM ?? 250} m.
              </p>
            ) : (
              <ul className={s.aheadList}>
                {ahead.map((e) => {
                  const key = `${e.wellId}:${e.eventId}`
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={[s.aheadItem, focusEvent === key && s.aheadItemOn].filter(Boolean).join(' ')}
                        onClick={() => {
                          setFocusEvent(key)
                          selectWell(e.wellId)
                        }}
                        aria-pressed={focusEvent === key}
                      >
                        <EventGlyph type={e.type} severity={e.severity} />
                        <span className={s.aheadBody}>
                          <b>{e.label}</b>
                          <em>
                            {e.wellId} · {fmtInt(e.depthM)} m · {e.distanceKm.toFixed(1)} km away
                          </em>
                        </span>
                        <Icon name="chevronRight" size={11} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className={s.corridorBlock}>
            <MicroLabel>Next formation</MicroLabel>
            <dl className={s.kv}>
              <div>
                <dt>formation</dt>
                <dd className="mono">{next?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>top MD</dt>
                <dd className="mono">{next ? `${fmtInt(next.topMdM)} m` : '—'}</dd>
              </div>
              <div>
                <dt>below bit</dt>
                <dd className="mono">{next ? `${next.distanceM} m` : '—'}</dd>
              </div>
              <div>
                <dt>uncertainty</dt>
                <dd className="mono">{next ? `± ${next.uncertaintyM} m` : '—'}</dd>
              </div>
            </dl>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Chip tone="outline">{data?.columns.length ?? 0} wells in section</Chip>
              <Chip tone="outline">{allEvents} events plotted</Chip>
            </div>
          </div>

          <div className={s.corridorBlock}>
            <MicroLabel>Where to next</MicroLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Button size="sm" onClick={() => goTo('risk')}>
                Risk engine <Icon name="arrowRight" size={12} />
              </Button>
              <Button size="sm" onClick={() => goTo('memory')}>
                Search the memory
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <Source kind="API">
        /wells/{well.data?.id}/corridor?align={filters.align} · {wells.length} offsets, formation tops from the
        well records
      </Source>
    </Section>
  )
}
