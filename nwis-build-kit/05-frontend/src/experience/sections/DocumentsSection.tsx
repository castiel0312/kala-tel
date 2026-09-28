import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import type { ExtractionField } from '../../api/types'
import { useToasts } from '../../components/ToastProvider'
import { Button, Chip, Drawer, Field, MicroLabel, ProvenanceTag, StateStack } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { Section, Source } from '../Section'
import { useNearViewport } from '../hooks'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.documents
const DEMO_PAGE = 47

/** PDF.js is the other heavy dependency; it loads when the reader reaches this section. */
const LazySourcePage = lazy(() => import('./SourcePage').then((m) => ({ default: m.SourcePage })))

/**
 * 10 · Document intelligence.
 *
 * The page on the left is the source of truth and the fields on the right are claims about
 * it, each with a confidence. Nothing is summarised on this page: the OCR text is shown, the
 * highlight rectangles come from the API's own bounding boxes, and any correction a human
 * makes is written back through the review endpoints.
 */
export function DocumentsSection() {
  const { doc, setDoc, goTo, wellId } = useNwis()
  const queryClient = useQueryClient()
  const { push } = useToasts()
  const { ref, near } = useNearViewport<HTMLDivElement>()
  const [selField, setSelField] = useState<string | null>(null)
  const [review, setReview] = useState(false)
  const [edited, setEdited] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const extraction = useQuery({
    queryKey: qk.extraction(doc.documentId, doc.page),
    queryFn: () => api.extraction(doc.documentId, doc.page),
    retry: false,
  })

  const documents = useQuery({ queryKey: qk.documents(undefined, undefined), queryFn: () => api.documents(), staleTime: 60_000 })
  const jobs = useQuery({ queryKey: qk.jobs, queryFn: api.jobs, refetchInterval: 4000 })

  const ex = extraction.data
  const fields = useMemo(() => ex?.event.fields ?? [], [ex])
  const threshold = ex?.reviewThreshold ?? 0.8
  const below = fields.filter((f) => f.confidence < threshold)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.extraction(doc.documentId, doc.page) })
    void queryClient.invalidateQueries({ queryKey: qk.documents(undefined, undefined) })
  }

  const confirm = useMutation({
    mutationFn: (f: ExtractionField) => api.confirmField(f.id, edited[f.id] ?? f.value),
    onSuccess: (r) => {
      push({ level: 'ACK', metric: r.field.key, text: `${r.field.label} confirmed` })
      invalidate()
    },
    onError: (e: Error) => push({ level: 'ALARM', metric: 'CONFIRM FAILED', text: e.message }),
  })

  const save = useMutation({
    mutationFn: (f: ExtractionField) => api.editField(f.id, edited[f.id] ?? f.value),
    onSuccess: (r) => {
      push({ level: 'DONE', metric: r.field.key, text: `${r.field.label} corrected` })
      invalidate()
    },
    onError: (e: Error) => push({ level: 'ALARM', metric: 'EDIT FAILED', text: e.message }),
  })

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file, wellId ?? 'OIL-WELL-104', 'WCR'),
    onSuccess: (job) => {
      push({ level: 'WATCH', metric: 'UPLOAD', text: `${job.documentId} queued` })
      void queryClient.invalidateQueries({ queryKey: qk.jobs })
    },
    onError: (e: Error) => push({ level: 'ALARM', metric: 'UPLOAD FAILED', text: e.message }),
  })

  const pipelineStates = (ex?.pipeline ?? []).map((p) => ({
    state: p.state,
    pct: p.state === 'DONE' ? 100 : p.state === 'CURRENT' ? 50 : 0,
    label: p.step,
    detail: p.detail,
  }))

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
          <ProvenanceTag kind="HISTORICAL" label="SOURCE PAGE" />
          <ProvenanceTag kind={below.length ? 'SYNTHETIC' : 'LIVE'} label={below.length ? `${below.length} BELOW THRESHOLD` : 'ALL FIELDS CONFIRMED'} />
        </>
      }
    >
      <ol className={s.pipeline} aria-label="Extraction pipeline">
        {(ex?.pipeline ?? []).map((p, i) => (
          <li key={p.step} data-state={p.state}>
            <span className={s.pipeIndex}>{String(i + 1).padStart(2, '0')}</span>
            <span className={s.pipeStep}>{p.step}</span>
            <span className={s.pipeDetail}>{p.detail}</span>
            <span className={s.pipeState}>{p.state === 'DONE' ? <Icon name="check" size={12} /> : p.state}</span>
          </li>
        ))}
      </ol>

      <div className={s.docGrid} ref={ref}>
        <div className={s.docViewer}>
          <div className={s.docViewerHead}>
            <div>
              <MicroLabel rule={false}>Source page</MicroLabel>
              <p className={s.docName}>
                <span className="mono">{doc.documentId}</span> · p.{doc.page} of {ex?.pages ?? 112}
              </p>
            </div>
            <div className={s.docPageNav}>
              <Button
                size="sm"
                onClick={() => setDoc({ documentId: doc.documentId, page: Math.max(1, doc.page - 1) })}
                disabled={doc.page <= 1}
                aria-label="Previous page"
              >
                <Icon name="chevronLeft" size={12} />
              </Button>
              <span className="mono">
                p.{doc.page} / {ex?.pages ?? 112}
              </span>
              <Button
                size="sm"
                onClick={() => setDoc({ documentId: doc.documentId, page: Math.min(ex?.pages ?? 112, doc.page + 1) })}
                disabled={Boolean(ex && doc.page >= ex.pages)}
                aria-label="Next page"
              >
                <Icon name="chevronRight" size={12} />
              </Button>
            </div>
          </div>

          {near ? (
            extraction.isLoading ? (
              <div className={s.pdfLoading}>loading the extraction…</div>
            ) : extraction.isError ? (
              <div className={s.docFallback}>
                <p>
                  No extraction is stored for <span className="mono">p.{doc.page}</span>. The demo fixture is page{' '}
                  {DEMO_PAGE} of <span className="mono">{doc.documentId}</span>.
                </p>
                <Button size="sm" onClick={() => setDoc({ documentId: doc.documentId, page: DEMO_PAGE })}>
                  Go to the fixture page
                </Button>
              </div>
            ) : (
              <Suspense fallback={<div className={s.pdfLoading}>loading the PDF engine…</div>}>
                <LazySourcePage
                  documentId={doc.documentId}
                  page={doc.page}
                  fields={fields}
                  threshold={threshold}
                  selectedFieldId={selField}
                  onSelectField={setSelField}
                  onError={(m) => push({ level: 'ALARM', metric: 'PDF', text: m })}
                />
              </Suspense>
            )
          ) : (
            <div className={s.pdfLoading}>the source page loads as you reach it</div>
          )}
        </div>

        <aside className={s.docAside}>
          <div className={s.docBlock}>
            <MicroLabel>Extracted event</MicroLabel>
            {ex ? (
              <>
                <div className={s.docEventId}>
                  <span className="mono">{ex.event.eventId}</span>
                  <Chip tone="outline">OCR {ex.ocrMeanConfidence.toFixed(2)}</Chip>
                </div>
                <ul className={s.docFields}>
                  {fields.map((f) => {
                    const on = selField === f.id
                    const low = f.confidence < threshold
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          className={[s.docField, on && s.docFieldOn, low && s.docFieldLow].filter(Boolean).join(' ')}
                          onClick={() => setSelField(on ? null : f.id)}
                          aria-pressed={on}
                        >
                          <span className={s.docFieldLabel}>{f.label}</span>
                          <span className={s.docFieldValue}>{edited[f.id] ?? f.value}</span>
                          <span className={[s.docFieldConf, low && s.docFieldConfLow].filter(Boolean).join(' ')}>
                            {f.confidence.toFixed(2)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div className={s.docActions}>
                  <Button size="sm" variant="primary" onClick={() => setReview(true)}>
                    Review &amp; confirm
                  </Button>
                  <Button size="sm" onClick={() => goTo('memory')}>
                    Search the memory
                  </Button>
                </div>
              </>
            ) : (
              <p className={s.docNote}>No extraction on this page.</p>
            )}
          </div>

          <div className={s.docBlock}>
            <MicroLabel>OCR text</MicroLabel>
            {ex ? (
              <ol className={s.docText}>
                {ex.pageText.map((line, i) => (
                  <li key={i}>
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={s.docNote}>—</p>
            )}
          </div>

          <div className={s.docBlock}>
            <MicroLabel>Drop drilling documents</MicroLabel>
            <button
              type="button"
              className={s.dropzone}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) upload.mutate(f)
              }}
            >
              <Icon name="upload" size={16} />
              <span>Drag a WCR or DDR here, or browse</span>
              <em>PDF or scan · OCR → NLP → entities → events → graph</em>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="srOnly"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload.mutate(f)
                e.target.value = ''
              }}
            />
            {jobs.data && jobs.data.length > 0 && (
              <ul className={s.jobList}>
                {jobs.data.slice(0, 3).map((j) => (
                  <li key={j.id}>
                    <span className="mono">{j.id}</span>
                    <span className={s.jobDoc}>{j.description}</span>
                    <span className={s.jobPct}>
                      {Math.round((j.stages.ocr + j.stages.nlp + j.stages.graph) / 3)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={s.docBlock}>
            <MicroLabel>Corpus</MicroLabel>
            <dl className={s.kv}>
              <div>
                <dt>documents</dt>
                <dd className="mono">{documents.data?.totals.documents.toLocaleString() ?? '—'}</dd>
              </div>
              <div>
                <dt>pages read</dt>
                <dd className="mono">{documents.data?.totals.pagesRead.toLocaleString() ?? '—'}</dd>
              </div>
              <div>
                <dt>events extracted</dt>
                <dd className="mono">{documents.data?.totals.eventsExtracted.toLocaleString() ?? '—'}</dd>
              </div>
              <div>
                <dt>need review</dt>
                <dd className="mono">{documents.data?.totals.needReview ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <Source kind="API">
        /documents/{doc.documentId}/pages/{doc.page}/extraction · bounding boxes come from the extractor, not the
        viewer
      </Source>

      <Drawer
        open={review}
        onClose={() => setReview(false)}
        eyebrow="REVIEW & CONFIRM"
        title={ex ? `Event ${ex.event.eventId}` : 'Extraction'}
        subtitle={
          ex ? (
            <span className="mono">
              {ex.documentId} · p.{ex.page} · review threshold {ex.reviewThreshold}
            </span>
          ) : undefined
        }
        wide
        signal={below.length ? 'red' : 'yellow'}
      >
        {ex && <StateStack states={pipelineStates} />}
        <ul className={s.reviewList}>
          {fields.map((f) => {
            const draft = edited[f.id]
            return (
            <li key={f.id}>
              <div className={s.reviewTop}>
                <span className={s.reviewLabel}>{f.label}</span>
                <span className={[s.docFieldConf, f.confidence < threshold && s.docFieldConfLow].filter(Boolean).join(' ')}>
                  {f.confidence.toFixed(2)}
                </span>
              </div>
              {draft !== undefined ? (
                <Field value={draft} onChange={(v) => setEdited((prev) => ({ ...prev, [f.id]: v }))} ariaLabel={`Correct ${f.label}`} />
              ) : (
                <p className={s.reviewValue}>{f.value}</p>
              )}
              <p className={s.reviewSrc}>
                <span className="mono">{f.bbox.note ?? `p.${f.bbox.page} · lines ${f.bbox.lineTops.join(', ')}`}</span>
              </p>
              <div className={s.reviewBtns}>
                {edited[f.id] !== undefined ? (
                  <>
                    <Button size="sm" variant="primary" onClick={() => save.mutate(f)} disabled={save.isPending}>
                      Save correction
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setEdited((prev) => {
                          const next = { ...prev }
                          delete next[f.id]
                          return next
                        })
                      }
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => setEdited((prev) => ({ ...prev, [f.id]: f.value }))}>
                      Correct
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => confirm.mutate(f)} disabled={confirm.isPending}>
                      Confirm
                    </Button>
                  </>
                )}
              </div>
            </li>
            )
          })}
        </ul>
      </Drawer>
    </Section>
  )
}
