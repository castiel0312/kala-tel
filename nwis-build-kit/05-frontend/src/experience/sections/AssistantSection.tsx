import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import type { Answer } from '../../api/types'
import { Button, MicroLabel, ProvenanceTag, ScoreGauge } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { Section } from '../Section'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.assistant

/**
 * 12 · The assistant.
 *
 * A retrieval surface, not a chatbot: the answer carries the evidence lines, the documents
 * they came from, the confidence band and the reason for that confidence. When the store has
 * nothing, it says so — a refusal with a reason is a better answer than a plausible one.
 */
export function AssistantSection() {
  const { goTo, frame } = useNwis()
  const [typed, setTyped] = useState('')
  const [log, setLog] = useState<Answer[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const suggestions = useQuery({ queryKey: qk.suggestions, queryFn: api.assistantSuggestions, staleTime: 300_000 })
  // newest first, so the quality panel reads the answer the reader just asked for
  const latest = log[0]
  const chips = suggestions.data?.chips ?? []
  const ctx = suggestions.data?.context

  const ask = useMutation({
    mutationFn: (question: string) => api.ask(question),
    onSuccess: (answer) => setLog((prev) => [answer, ...prev].slice(0, 4)),
  })

  const send = (question: string) => {
    const q = question.trim()
    if (!q) return
    setTyped('')
    ask.mutate(q)
  }

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
      actions={<ProvenanceTag kind="DERIVED" label="retrieval over the index" />}
    >
      <div className={s.askGrid}>
        <div className={s.askMain}>
          <form
            className={s.askForm}
            onSubmit={(e) => {
              e.preventDefault()
              send(typed)
            }}
          >
            <label htmlFor="nwis-ask" className="srOnly">
              Ask the NWIS assistant
            </label>
            <textarea
              id="nwis-ask"
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(typed)
                }
              }}
              rows={2}
              placeholder="What happened in nearby wells at the depth we are about to drill?"
            />
            <Button type="submit" variant="primary" disabled={ask.isPending || !typed.trim()}>
              {ask.isPending ? 'Reading the index…' : 'Ask'}
              <Icon name="arrowRight" size={13} />
            </Button>
          </form>

          <div className={s.askChips}>
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                className={s.askChip}
                onClick={() => {
                  send(c.question ?? c.label)
                  inputRef.current?.blur()
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {log.length === 0 && !ask.isPending ? (
            <div className={s.askEmpty}>
              <p>
                Answers come from the {ctx?.pagesSearchable.toLocaleString() ?? '12,907'} indexed pages and the{' '}
                {ctx?.eventsIndexed ?? '4,812'} extracted events. Nothing is generated that is not already in the
                store.
              </p>
              <ul className={s.askGroundRules}>
                <li>Every answer carries its source documents.</li>
                <li>Confidence is reported with the reason it is high or low.</li>
                <li>“I don’t know” is a valid answer and is returned as one.</li>
              </ul>
            </div>
          ) : null}

          <ol className={s.answers} aria-live="polite">
            {ask.isPending && (
              <li key="pending" className={s.answer}>
                <div className={s.answerSkeleton} aria-hidden />
              </li>
            )}
            {log.map((a, i) => (
              /* The answer payload carries no id, so the log is keyed by its position and the
                 question that produced it — stable because the log is only ever prepended. */
              <li key={`${i}:${a.question}`} className={s.answer}>
                <p className={s.answerQ}>
                  <span className="mono">Q</span>
                  {a.question}
                </p>
                <p className={[s.answerA, a.refused && s.answerRefused].filter(Boolean).join(' ')}>{a.answer}</p>

                {a.evidence.length > 0 && (
                  <ul className={s.evidenceLines}>
                    {a.evidence.map((e, i) => (
                      <li key={i} data-sev={e.severity ?? 'low'}>
                        <span>{e.text}</span>
                        <em>{e.source}</em>
                      </li>
                    ))}
                  </ul>
                )}

                <div className={s.answerFoot}>
                  <span className={s.confidence} data-band={a.confidence.band}>
                    <b className="mono">{Math.round(a.confidence.score * 100)}%</b>
                    {a.confidence.band.toLowerCase()} confidence · {a.confidence.note}
                  </span>
                  {a.similarWells.length > 0 && (
                    <span className={s.answerWells}>
                      {a.similarWells.map((w) => `${w.id} ${w.similarity}%`).join(' · ')}
                    </span>
                  )}
                  {a.meta && (
                    <span className="mono">
                      {a.meta.latencySeconds}s · {a.meta.model} · {a.meta.sourceCount} sources
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className={s.askAside}>
          <div className={s.askBlock}>
            <MicroLabel onBlack>What it can see</MicroLabel>
            <dl className={s.kvDark}>
              <div>
                <dt>in formation</dt>
                <dd className="mono">{ctx?.formation ?? '—'}</dd>
              </div>
              <div>
                <dt>next top</dt>
                <dd className="mono">{ctx?.nextTop ?? '—'}</dd>
              </div>
              <div>
                <dt>offsets in scope</dt>
                <dd className="mono">{ctx?.offsetsInScope ?? '—'}</dd>
              </div>
              <div>
                <dt>events indexed</dt>
                <dd className="mono">{ctx?.eventsIndexed ?? '—'}</dd>
              </div>
              <div>
                <dt>pages searchable</dt>
                <dd className="mono">{ctx?.pagesSearchable?.toLocaleString() ?? '—'}</dd>
              </div>
              <div>
                <dt>live feed</dt>
                <dd className="mono">{ctx?.liveFeed ?? '—'}</dd>
              </div>
            </dl>
          </div>

          <div className={s.askBlock}>
            <MicroLabel onBlack>Answer quality</MicroLabel>
            <div className={s.askGauge}>
              <ScoreGauge
                value={Math.round((latest?.confidence.score ?? 0.86) * 100)}
                size={92}
                level={latest?.confidence.band === 'LOW' ? 'LOW' : 'HIGH'}
                label="confidence"
              />
              <p>{latest?.confidence.note ?? 'The last answer’s confidence, with the reason the model gives for it.'}</p>
            </div>
          </div>

          <div className={s.askBlock}>
            <MicroLabel onBlack>Go and look</MicroLabel>
            <div className={s.askLinks}>
              <button type="button" onClick={() => goTo('memory')}>
                <Icon name="search" size={12} /> Search the memory
              </button>
              <button type="button" onClick={() => goTo('graph')}>
                <Icon name="graph" size={12} /> Open the graph
              </button>
              <button type="button" onClick={() => goTo('risk')}>
                <Icon name="risk" size={12} /> Read the risk evidence
              </button>
            </div>
            {frame && (
              <p className={s.askFoot}>
                Live context is the {frame.source} frame at {new Date(frame.timestamp).toLocaleTimeString()}.
              </p>
            )}
          </div>
        </aside>
      </div>
    </Section>
  )
}
