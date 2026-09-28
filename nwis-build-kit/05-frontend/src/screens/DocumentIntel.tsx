import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { api, qk } from '../api/client'
import type { ExtractionField } from '../api/types'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { useToasts } from '../components/ToastProvider'
import { Button, ErrorStrip, Panel, ProvenanceTag, Skel, StateStack } from '../components/kit'
import { Icon } from '../components/kit/icons'
import s from './DocumentIntel.module.css'

/* ============================================================================
   Document Intelligence — screen 11.

   A real PDF.js canvas of the real file, with the extracted fields pinned to
   the lines they came from. The highlight rectangles are derived from the API's
   `bbox.lineTops` in PDF user space, scaled by the page's rendered viewport, so
   clicking a field on the right highlights the line on the left and vice versa.
   Nothing is summarised here: the page text is the source, and the confidence
   per field is the caveat.
   ========================================================================== */

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

/** The demo file lives in the bundle's public folder; page 47 is the extraction fixture. */
const FILE_FOR = (documentId: string) => `/docs/${documentId}`

export function DocumentIntel() {
  const { documentId = 'W-067_WCR_2019.pdf', page: pageParam = '47' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToasts()
  const [page, setPage] = useState(Number(pageParam) || 47)
  const [width, setWidth] = useState(760)
  const [selField, setSelField] = useState<string | null>(null)
  const [edited, setEdited] = useState<Record<string, string>>({})
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [pageSize, setPageSize] = useState({ w: 595, h: 842 })

  const extraction = useQuery({
    queryKey: qk.extraction(documentId, page),
    queryFn: () => api.extraction(documentId, page),
    retry: false,
  })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(Math.max(360, el.clientWidth - 24))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setPage(Number(pageParam) || 47)
  }, [pageParam])

  const ex = extraction.data
  const fields = ex?.event.fields ?? []

  const rows = useMemo<(ExtractionField & { below: boolean })[]>(
    () =>
      fields.map((f) => {
        const override = edited[f.id]
        const value = override !== undefined ? override : f.value
        return { ...f, value, below: f.confidence < (ex?.reviewThreshold ?? 0.8) }
      }),
    [fields, edited, ex],
  )

  /**
   * `bbox.lineTops` are baselines in PDF user space, measured from the bottom of the page. The
   * rendered canvas is top-down, so each baseline becomes a 15pt-tall line box above it. The demo
   * pages are A4 (842pt tall); the scale is derived from the real viewport so other sizes still work.
   */
  const marks = useMemo(() => {
    const pdfH = 842
    const scale = pageSize.h / pdfH
    return rows.flatMap((f) =>
      f.bbox.lineTops.map((baseline) => ({
        fieldId: f.id,
        key: f.id,
        top: (pdfH - baseline - 3) * scale,
        height: 15 * scale,
        left: 42 * scale,
        right: 556 * scale,
        below: f.below,
      })),
    )
  }, [rows, pageSize])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.extraction(documentId, page) })
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

  const goPage = useCallback(
    (next: number) => {
      const n = Math.min(Math.max(1, next), ex?.pages ?? 112)
      setPage(n)
      setSelField(null)
      setEdited({})
      navigate(`/documents/${encodeURIComponent(documentId)}/${n}`, { replace: true })
    },
    [documentId, ex?.pages, navigate],
  )

  const pipelineStates = (ex?.pipeline ?? []).map((p) => ({ state: p.state, pct: p.state === 'DONE' ? 100 : p.state === 'CURRENT' ? 50 : 0, label: p.step, detail: p.detail }))
  const below = rows.filter((r) => r.below).length

  return (
    <Screen
      num="11"
      section="Knowledge"
      title="Document Intelligence"
      sub={
        ex ? (
          <>
            <span className="mono">{documentId}</span> · p.{ex.page} of {ex.pages} · OCR{' '}
            <span className="mono">{ex.ocrMeanConfidence.toFixed(2)}</span> mean confidence
          </>
        ) : (
          <span className="mono">{documentId}</span>
        )
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind="HISTORICAL" label="SOURCE PAGE" />
          <ProvenanceTag kind={below ? 'SYNTHETIC' : 'LIVE'} label={below ? `${below} BELOW THRESHOLD` : 'ALL FIELDS CONFIRMED'} />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <Panel
          title="Page"
          tone="black"
          flush
          className={s.viewerPanel}
          meta={
            <div className={s.pageNav}>
              <Button size="sm" variant="on" onClick={() => goPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
                <Icon name="arrowLeft" size={12} />
              </Button>
              <span className="mono">
                p.{page} / {ex?.pages ?? 112}
              </span>
              <Button size="sm" variant="on" onClick={() => goPage(page + 1)} disabled={Boolean(ex && page >= ex.pages)} aria-label="Next page">
                <Icon name="arrowRight" size={12} />
              </Button>
            </div>
          }
        >
          <div className={s.canvas} ref={wrapRef}>
            {extraction.isLoading ? (
              <Skel h={520} ink />
            ) : (
              <>
                <Document
                  file={FILE_FOR(documentId)}
                  loading={<Skel h={520} ink />}
                  onLoadSuccess={(pdf) => {
                    pdf.getPage(page).then((p) => {
                      const vp = p.getViewport({ scale: 1 })
                      setPageSize({ w: vp.width, h: vp.height })
                    })
                  }}
                  onLoadError={() => push({ level: 'ALARM', metric: 'PDF', text: `${documentId} could not be opened` })}
                >
                  <Page
                    pageNumber={page}
                    width={width}
                    renderTextLayer
                    onRenderSuccess={({ width: w, height: h }) => {
                      const s2 = h / 842
                      setPageSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
                      void s2
                    }}
                  />
                </Document>
                <div className={s.overlay} style={{ width, height: pageSize.h }}>
                  {marks.map((m, i) => (
                    <button
                      key={`${m.fieldId}-${i}`}
                      type="button"
                      className={[s.mark, m.below ? s['mark--below'] : '', selField === m.fieldId ? s['mark--on'] : ''].filter(Boolean).join(' ')}
                      style={{
                        top: m.top,
                        height: m.height,
                        left: m.left,
                        width: m.right - m.left,
                      }}
                      onClick={() => setSelField(m.fieldId === selField ? null : m.fieldId)}
                      title={`${m.fieldId} — click to select the field`}
                      aria-label={`Highlight for ${m.fieldId}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>

        <div className={s.sideCol}>
          <Panel
            title={ex ? `Event ${ex.event.eventId}` : 'Event'}
            tone="black"
            signal={below > 0 ? 'danger' : undefined}
            meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-ink-3)' }}>review ≥ {ex?.reviewThreshold ?? 0.8}</span>}
          >
            {extraction.isError ? (
              <ErrorStrip body="No extraction is stored for this page. Only the demo page with a fixture can be opened." action="Go to p.47" onAction={() => goPage(47)} />
            ) : ex ? (
              <>
                <StateStack states={pipelineStates} />
                <div className={s.fields}>
                  {rows.map((f) => (
                    <div
                      key={f.id}
                      className={[s.field, selField === f.id ? s['field--on'] : '', f.below ? s['field--below'] : ''].filter(Boolean).join(' ')}
                      onClick={() => setSelField(f.id === selField ? null : f.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelField(f.id)}
                    >
                      <div className={s.fieldTop}>
                        <span className={s.fieldLabel}>{f.label}</span>
                        <span className={[s.conf, f.below ? s['conf--below'] : ''].filter(Boolean).join(' ')}>{f.confidence.toFixed(2)}</span>
                      </div>
                      {edited[f.id] !== undefined ? (
                        <input
                          className={s.edit}
                          value={edited[f.id]}
                          autoFocus
                          onChange={(e) => setEdited((prev) => ({ ...prev, [f.id]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Correct ${f.label}`}
                        />
                      ) : (
                        <div className={s.fieldValue}>{f.value}</div>
                      )}
                      {f.below && <div className={s.fieldWhy}>{f.reviewReason ?? 'below the review threshold'}</div>}
                      <div className={s.fieldFoot}>
                        <span className="mono">{f.bbox.note ?? `p.${f.bbox.page} lines ${f.bbox.lineTops.join(', ')}`}</span>
                        <span className={s.fieldBtns} onClick={(e) => e.stopPropagation()}>
                          {edited[f.id] !== undefined ? (
                            <>
                              <Button size="sm" variant="primary" onClick={() => save.mutate(f)} disabled={save.isPending}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEdited((prev) => { const n = { ...prev }; delete n[f.id]; return n })}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setEdited((prev) => ({ ...prev, [f.id]: f.value }))}>
                                Correct
                              </Button>
                              <Button size="sm" variant="primary" onClick={() => confirm.mutate(f)} disabled={confirm.isPending}>
                                Confirm
                              </Button>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Skel h={200} ink />
            )}
          </Panel>

          <Panel title="Page text" tone="paper" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>OCR output</span>}>
            {ex ? (
              <ol className={s.text}>
                {ex.pageText.map((line, i) => {
                  const top = 122 + i * 21
                  const isMarked = marks.some((m) => m.below === false && Math.abs(m.top - top * (pageSize.h / 842)) < 1)
                  return (
                    <li
                      key={i}
                      className={isMarked ? s.lineMarked : undefined}
                      onClick={() => {
                        const hit = rows.find((f) => f.bbox.lineTops.includes(top))
                        if (hit) setSelField(hit.id)
                      }}
                    >
                      <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                      <span>{line}</span>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <Skel h={120} />
            )}
          </Panel>

          <Panel title="Where this goes" tone="paper">
            <div className={s.links}>
              <Link to="/#documents">Back to document intelligence</Link>
              <Link to="/graph">Open the event in the graph</Link>
              <Link to="/#risk">See the mud-loss risk it supports</Link>
            </div>
            <p className={s.note}>
              Confirming a field writes through to the API. The risk screen and the knowledge graph read the same stored value, so a
              correction here changes what they cite.
            </p>
          </Panel>
        </div>
      </div>
    </Screen>
  )
}
