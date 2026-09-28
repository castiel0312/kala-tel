import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import type { Answer } from '../api/types'
import { useActiveWell } from '../hooks/useActiveWell'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { Button, Chip, Panel, ProvenanceTag, Skel } from '../components/kit'
import { Icon } from '../components/kit/icons'
import { fmtInt } from '../lib/format'
import s from './AssistantPanel.module.css'

/* ============================================================================
   Assistant Panel — screen 12.

   The assistant is not allowed to be vague. Every answer carries its evidence
   lines, the document and page they came from, the wells it considers similar,
   its own confidence, and the latency and source count of the run. A refusal is
   rendered as a refusal, not dressed up as an answer.
   ========================================================================== */

export function AssistantPanel() {
  const { data: well } = useActiveWell()
  const [question, setQuestion] = useState('')
  const [thread, setThread] = useState<Answer[]>([])
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const suggestions = useQuery({ queryKey: qk.suggestions, queryFn: api.assistantSuggestions, staleTime: 300_000 })
  const ask = useMutation({
    mutationFn: (q: string) => api.ask(q),
    onMutate: () => setBusy(true),
    onSuccess: (a: Answer) => {
      setThread((t) => [...t, a])
      setQuestion('')
      setBusy(false)
    },
    onError: () => setBusy(false),
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [thread.length, busy])

  const submit = (q: string) => {
    const text = q.trim()
    if (!text || busy) return
    ask.mutate(text)
  }

  return (
    <Screen
      num="12"
      section="Assistant"
      title="Grounded Assistant"
      sub={
        suggestions.data ? (
          <>
            {suggestions.data.context.offsetsInScope} offsets in scope · {fmtInt(suggestions.data.context.eventsIndexed)} events indexed ·{' '}
            <span className="mono">on-prem</span>
          </>
        ) : (
          'Answers over the indexed corpus, with the page they came from.'
        )
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind="LIVE" label="eRTMAC" />
          <ProvenanceTag kind="DERIVED" label="RETRIEVAL + TEMPLATE" />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <Panel title="Thread" tone="paper" fill className={s.threadPanel} meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>{thread.length} answers</span>}>
          <div className={s.thread}>
            {!thread.length && !busy && (
              <div className={s.intro}>
                <p className={s.introText}>
                  Ask about the depth you are about to drill, a risk you do not trust, or what worked on an offset. Answers are assembled
                  from indexed documents, and every claim carries its page.
                </p>
                <div className={s.chips}>
                  {(suggestions.data?.chips ?? []).map((c) => (
                    <button key={c.id} type="button" className={s.chip} onClick={() => submit(c.question ?? c.label)}>
                      {c.label}
                    </button>
                  ))}
                </div>
                {suggestions.isLoading && <Skel h={60} />}
              </div>
            )}

            {thread.map((a) => (
              <div className={s.turn} key={a.id}>
                <div className={s.q}>
                  <span className={s.qK}>ASKED</span>
                  {a.question}
                </div>
                <div className={s.a}>
                  {a.refused ? (
                    <div className={s.refused}>
                      <Chip tone="red">REFUSED</Chip>
                      <p>{a.answer}</p>
                    </div>
                  ) : (
                    <>
                      <p className={s.answer}>{a.answer}</p>

                      {a.evidence.length > 0 && (
                        <div className={s.evidence}>
                          <div className={s.evidenceK}>Evidence</div>
                          {a.evidence.map((e, i) => (
                            <div className={s.ev} key={i}>
                              <span className={s.evText}>{e.text}</span>
                              <span className={s.evSrc}>{e.source}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={s.meta}>
                        <span className={s.conf}>
                          confidence <b className="mono">{a.confidence.score.toFixed(2)}</b> {a.confidence.band}
                        </span>
                        {a.meta && (
                          <span className="mono">
                            {a.meta.latencySeconds}s · {a.meta.sourceCount} sources · {a.meta.model}
                          </span>
                        )}
                        {a.similarWells.length > 0 && (
                          <span className={s.sim}>
                            similar
                            {a.similarWells.map((w) => (
                              <Link key={w.id} to={`/compare/${w.id}`}>
                                {w.id} {w.similarity}%
                              </Link>
                            ))}
                          </span>
                        )}
                      </div>

                      {a.cta && (
                        <Link className={s.cta} to={a.cta.route}>
                          {a.cta.label} <Icon name="arrowRight" size={12} />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className={s.turn}>
                <div className={s.q}>
                  <span className={s.qK}>ASKED</span>
                  {question}
                </div>
                <div className={s.a}>
                  <Skel h={70} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </Panel>

        <div className={s.sideCol}>
          <Panel title="Ask" tone="black" signal="ok">
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault()
                submit(question)
              }}
            >
              <textarea
                className={s.textarea}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What happened in the offsets 17 m below the Barail top?"
                rows={3}
                aria-label="Question"
              />
              <div className={s.formFoot}>
                <span className="mono" style={{ fontSize: 9, color: 'var(--nw-ink-3)' }}>
                  {well?.id ?? 'OIL-WELL-104'} · retrieval only, no web
                </span>
                <Button type="submit" variant="on" disabled={busy || !question.trim()}>
                  {busy ? 'Thinking…' : 'Ask'}
                </Button>
              </div>
            </form>
          </Panel>

          <Panel title="What it can see" tone="paper">
            <dl className={s.ctx}>
              <div>
                <dt>Formation</dt>
                <dd>{suggestions.data?.context.formation ?? '—'}</dd>
              </div>
              <div>
                <dt>Next top</dt>
                <dd>{suggestions.data?.context.nextTop ?? '—'}</dd>
              </div>
              <div>
                <dt>Offsets</dt>
                <dd className="mono">{suggestions.data?.context.offsetsInScope ?? '—'}</dd>
              </div>
              <div>
                <dt>Events indexed</dt>
                <dd className="mono">{fmtInt(suggestions.data?.context.eventsIndexed ?? 0)}</dd>
              </div>
              <div>
                <dt>Pages searchable</dt>
                <dd className="mono">{fmtInt(suggestions.data?.context.pagesSearchable ?? 0)}</dd>
              </div>
              <div>
                <dt>Live feed</dt>
                <dd className="mono">{suggestions.data?.context.liveFeed ?? '—'}</dd>
              </div>
            </dl>
            <p className={s.ctxNote}>
              The assistant answers from the same store as the Risk Centre. If retrieval finds nothing above the relevance threshold it
              refuses rather than guessing.
            </p>
          </Panel>

          <Panel title="Ask instead" tone="paper">
            <div className={s.alt}>
              <Link to="/risk">Read the risk evidence directly</Link>
              <Link to="/documents">Open the source pages</Link>
              <Link to="/graph">Trace the evidence path</Link>
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  )
}
