import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk, type EventQuery } from '../../api/client'
import { Button, Chip, EmptyState, EventGlyph, MicroLabel, ProvenanceTag } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { fmtInt } from '../../lib/format'
import { Section, Source } from '../Section'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.memory
const PAGE = 6

/**
 * 08 · Knowledge repository.
 *
 * The whole point of indexing 12,000 pages is that a drilling engineer can ask a question in
 * their own words and get back the events the API extracted — each with the well, the depth,
 * the formation and the page it came from. Every result carries its source; that is the
 * difference between a memory and a rumour.
 */
export function MemorySection() {
  const { openDocument, selectedWellId, selectWell } = useNwis()
  const [q, setQ] = useState('')
  const [typed, setTyped] = useState('')
  const [preset, setPreset] = useState<string | undefined>()
  const [formation, setFormation] = useState<string | undefined>()
  const [type, setType] = useState<string | undefined>()
  const [limit, setLimit] = useState(PAGE)

  const query: EventQuery = useMemo(
    () => ({ q: q || undefined, preset, formation, type, well: selectedWellId ?? undefined }),
    [q, preset, formation, type, selectedWellId],
  )

  const events = useQuery({
    queryKey: qk.events(query),
    queryFn: () => api.events(query),
    staleTime: 30_000,
  })

  const results = events.data?.events ?? []
  const presets = events.data?.presets ?? []
  const shown = results.slice(0, limit)

  const search = (e: FormEvent) => {
    e.preventDefault()
    setQ(typed)
    setLimit(PAGE)
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
        selectedWellId ? (
          <Button size="sm" onClick={() => selectWell(null)}>
            Clear well filter
          </Button>
        ) : undefined
      }
    >
      <form className={s.searchBar} onSubmit={search} role="search">
        <div className={s.searchField}>
          <Icon name="search" size={15} />
          <input
            type="search"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Search 4,812 events: mud loss, stuck pipe, 40 ppb LCM, cement plug…"
            aria-label="Search the drilling memory"
            id="nwis-memory-search"
          />
          <button type="submit" className={s.searchGo}>
            Search
          </button>
        </div>
        <div className={s.searchFilters}>
          <div>
            <label htmlFor="nwis-memory-formation">Formation</label>
            <select
              id="nwis-memory-formation"
              value={formation ?? ''}
              onChange={(e) => {
                setFormation(e.target.value || undefined)
                setLimit(PAGE)
              }}
            >
              <option value="">Any</option>
              {['Girujan', 'Tipam', 'Barail', 'Dihing', 'Tura'].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nwis-memory-type">Event type</label>
            <select
              id="nwis-memory-type"
              value={type ?? ''}
              onChange={(e) => {
                setType(e.target.value || undefined)
                setLimit(PAGE)
              }}
            >
              <option value="">Any</option>
              {['LOSS', 'STUCK', 'KICK', 'CEMENT', 'TORQUE', 'OTHER'].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          {selectedWellId && (
            <div>
              <span>Well</span>
              <button type="button" className={s.filterPill} onClick={() => selectWell(null)}>
                <span className="mono">{selectedWellId}</span>
                <Icon name="close" size={11} />
              </button>
            </div>
          )}
        </div>
      </form>

      <div className={s.presetRow}>
        <MicroLabel rule={false}>Presets</MicroLabel>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={[s.preset, preset === p.id && s.presetOn].filter(Boolean).join(' ')}
            onClick={() => {
              setPreset(preset === p.id ? undefined : p.id)
              setLimit(PAGE)
            }}
            aria-pressed={preset === p.id}
          >
            {p.label}
            <span className="mono">{p.count}</span>
          </button>
        ))}
        {preset && (
          <Button size="sm" onClick={() => setPreset(undefined)}>
            Clear preset
          </Button>
        )}
      </div>

      <div className={s.memoryHead}>
        <p className="mono">
          {events.data?.count ?? 0} events
          {q ? ` matching “${q}”` : ''}
          {preset ? ` · preset ${preset}` : ''}
          {formation ? ` · ${formation}` : ''}
          {type ? ` · ${type}` : ''}
        </p>
        <ProvenanceTag kind="HISTORICAL" label="extracted from 12,907 pages" />
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="Nothing in the memory matches"
          body="Try a broader term, or clear the preset. Search covers every extracted event, not just this well’s."
          actions={
            <Button
              size="sm"
              onClick={() => {
                setQ('')
                setTyped('')
                setPreset(undefined)
                setFormation(undefined)
                setType(undefined)
              }}
            >
              Reset the search
            </Button>
          }
        />
      ) : (
        <ol className={s.snippets}>
          {shown.map((e) => (
            <li key={e.id} className={s.snippet}>
              <div className={s.snippetHead}>
                <EventGlyph type={e.type} severity={e.severity} />
                <h3 className={s.snippetTitle}>{e.title}</h3>
                <span className={s.snippetWell}>{e.wellId}</span>
                <Chip tone="outline">{e.formation}</Chip>
                <span className="mono s.snippetDepth">{fmtInt(e.mdM)} m MD</span>
                {e.alignedMdOnActiveM && <span className="s.snippetAlign">→ {fmtInt(e.alignedMdOnActiveM)} m here</span>}
              </div>
              <p className={s.snippetFlow}>
                {e.cause} <Icon name="arrowRight" size={11} /> {e.action} <Icon name="arrowRight" size={11} />{' '}
                <b>{e.outcome}</b>
              </p>
              <p className={s.snippetMeta}>
                <span className="mono">{e.date}</span>
                <span>NPT {e.nptHours} h</span>
                <span>extraction confidence {Math.round(e.extractionConfidence * 100)}%</span>
                {e.source.page ? (
                  <button type="button" className={s.snippetSrc} onClick={() => openDocument(e.source.documentId, e.source.page as number)}>
                    {e.source.label} · p.{e.source.page}
                    <Icon name="arrowRight" size={11} />
                  </button>
                ) : (
                  <span className={s.snippetSrcPlain}>{e.source.label}</span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}

      {results.length > shown.length && (
        <div className={s.wellsMore}>
          <Button size="sm" onClick={() => setLimit((l) => l + PAGE)}>
            Load {Math.min(PAGE, results.length - shown.length)} more
          </Button>
          <span className="mono">
            {shown.length} of {results.length}
          </span>
        </div>
      )}

      <Source kind="API">/events?q={q || ''} · every hit is an extracted event with its source page</Source>
    </Section>
  )
}
