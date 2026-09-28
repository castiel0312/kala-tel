import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useActiveWell } from '../hooks/useActiveWell'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { useToasts } from '../components/ToastProvider'
import { Button, Chip, EmptyState, ErrorStrip, Panel, ProvenanceTag, Skel } from '../components/kit'
import { Icon } from '../components/kit/icons'
import { fmtInt } from '../lib/format'
import s from './DocumentLibrary.module.css'

/* ============================================================================
   Document Library — screen 10.

   The corpus index, and the only place in the platform where a file is
   uploaded. Every row states what has been read from the file — pages, events
   extracted, mean OCR confidence — so a document is never treated as evidence
   until its extraction state is visible. Uploading starts a job; the job is
   shown as a pipeline rather than a spinner.
   ========================================================================== */

const TYPES = ['All', 'WCR', 'DDR', 'GEO', 'LOG', 'CORE', 'SIDEWT', 'ANNUAL'] as const
const STATUS_TONE: Record<string, 'green' | 'yellow' | 'grey' | 'red'> = {
  VERIFIED: 'green',
  PROCESSING: 'yellow',
  INDEXED: 'grey',
  FAILED: 'red',
  NEEDS_REVIEW: 'yellow',
}

export function DocumentLibrary() {
  const { data: well } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'
  const [params, setParams] = useSearchParams()
  const type = params.get('type') ?? 'All'
  const q = params.get('q') ?? ''
  const [search, setSearch] = useState(q)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()
  const { push } = useToasts()

  const docs = useQuery({
    queryKey: qk.documents(type === 'All' ? undefined : type, q || undefined),
    queryFn: () => api.documents(type === 'All' ? undefined : type, q || undefined),
    staleTime: 60_000,
  })

  const jobs = useQuery({ queryKey: qk.jobs, queryFn: api.jobs, refetchInterval: 4_000 })

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file, wellId, 'WCR'),
    onSuccess: (job) => {
      push({ level: 'DONE', metric: job.id, text: `${job.documentId} queued for extraction` })
      void queryClient.invalidateQueries({ queryKey: qk.jobs })
      void queryClient.invalidateQueries({ queryKey: qk.documents(undefined, undefined) })
    },
    onError: (e: Error) => {
      push({ level: 'ALARM', metric: 'UPLOAD FAILED', text: e.message })
    },
  })

  const rows = docs.data?.documents ?? []
  const totals = docs.data?.totals
  const activeJobs = (jobs.data ?? []).filter((j) => j.state !== 'DONE' && j.state !== 'FAILED')

  const byType = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of rows) m.set(d.type, (m.get(d.type) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const setType = (t: string) => {
    const next = new URLSearchParams(params)
    if (t === 'All') next.delete('type')
    else next.set('type', t)
    setParams(next, { replace: true })
  }

  return (
    <Screen
      num="10"
      section="Knowledge"
      title="Document Library"
      sub={totals ? `${fmtInt(totals.documents)} documents · ${fmtInt(totals.pagesRead)} pages read · ${fmtInt(totals.eventsExtracted)} events extracted` : 'The indexed corpus.'}
      aside={
        <HeaderTools>
          <ProvenanceTag kind="HISTORICAL" label="SCANNED ARCHIVE" />
          <ProvenanceTag kind="SYNTHETIC" label={String(totals?.needReview ?? 0) + ' NEED REVIEW'} />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <div className={s.mainCol}>
          <div className={s.toolbar}>
            <div className={s.types}>
              {TYPES.map((t) => (
                <button key={t} type="button" className={[s.type, t === type ? s['type--on'] : ''].filter(Boolean).join(' ')} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
            <form
              className={s.search}
              onSubmit={(e) => {
                e.preventDefault()
                const next = new URLSearchParams(params)
                if (search) next.set('q', search)
                else next.delete('q')
                setParams(next, { replace: true })
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search well, type, or text in the corpus…"
                aria-label="Search documents"
                className={s.input}
              />
              <Button size="sm" type="submit" variant="primary">
                Search
              </Button>
            </form>
          </div>

          <Panel title="Indexed documents" flush className={s.tablePanel} meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>{rows.length} shown</span>}>
            {docs.isLoading ? (
              <div className={s.pad}>
                <Skel h={240} />
              </div>
            ) : docs.isError ? (
              <div className={s.pad}>
                <ErrorStrip body="The corpus index could not be loaded." action="Retry" onAction={() => void docs.refetch()} />
              </div>
            ) : rows.length ? (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th className={s.num}>Year</th>
                      <th>Type</th>
                      <th className={s.num}>Pages</th>
                      <th className={s.num}>Events</th>
                      <th className={s.num}>OCR</th>
                      <th>Status</th>
                      <th aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => {
                      const review = d.ocrQuality < 0.8
                      return (
                        <tr key={d.id}>
                          <td>
                            <span className={s.docId}>
                              <Icon name="doc" size={12} />
                              {d.wellId}
                            </span>
                            <span className={s.docName}>{d.id}</span>
                          </td>
                          <td className={s.num}>{d.year}</td>
                          <td>
                            <Chip tone="outline">{d.type}</Chip>
                          </td>
                          <td className={s.num}>{fmtInt(d.pages)}</td>
                          <td className={s.num}>{d.events}</td>
                          <td className={s.num}>
                            <span className={[s.ocr, review ? s['ocr--low'] : ''].filter(Boolean).join(' ')}>{d.ocrQuality.toFixed(2)}</span>
                          </td>
                          <td>
                            <Chip tone={STATUS_TONE[d.status] ?? 'grey'}>{d.status.replace('_', ' ')}</Chip>
                          </td>
                          <td className={s.openCell}>
                            <Link to={`/documents/${encodeURIComponent(d.id)}/1`}>Open</Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No documents match" body="Clear the search or pick another document type." actions={<Button size="sm" onClick={() => { setSearch(''); setParams(new URLSearchParams(), { replace: true }) }}>Reset</Button>} />
            )}
          </Panel>
        </div>

        <div className={s.sideCol}>
          <Panel title="Upload" tone="black" signal={activeJobs.length ? 'signal' : undefined} meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-ink-3)' }}>→ extraction job</span>}>
            <p className={s.uploadNote}>
              A file is queued, read page by page, and only becomes evidence once its events are extracted and confirmed.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className={s.file}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                upload.mutate(f)
                e.target.value = ''
              }}
            />
            <Button variant="on" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? 'Uploading…' : 'Choose a PDF'}
            </Button>

            {(jobs.data ?? []).length > 0 && (
              <div className={s.jobs}>
                <div className={s.jobsK}>Jobs</div>
                {(jobs.data ?? []).slice(0, 4).map((j) => (
                  <div className={s.job} key={j.id}>
                    <span className={[s.jobState, j.state === 'FAILED' ? s['jobState--bad'] : j.state === 'DONE' ? s['jobState--ok'] : ''].filter(Boolean).join(' ')}>{j.state}</span>
                    <span className={s.jobName}>{j.description}</span>
                    <span className="mono">{Math.round((j.stages.ocr + j.stages.nlp + j.stages.graph) / 3)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Corpus" tone="paper" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>in this view</span>}>
            <div className={s.totals}>
              <div>
                <b className="mono">{fmtInt(totals?.documents ?? 0)}</b>
                <span>documents</span>
              </div>
              <div>
                <b className="mono">{fmtInt(totals?.pagesRead ?? 0)}</b>
                <span>pages read</span>
              </div>
              <div>
                <b className="mono">{fmtInt(totals?.eventsExtracted ?? 0)}</b>
                <span>events</span>
              </div>
              <div>
                <b className="mono" style={{ color: (totals?.needReview ?? 0) > 0 ? 'var(--nw-yellow-deep)' : undefined }}>
                  {totals?.needReview ?? 0}
                </b>
                <span>need review</span>
              </div>
            </div>
            {byType.length > 0 && (
              <div className={s.byType}>
                {byType.map(([t, n]) => (
                  <button key={t} type="button" className={s.byTypeRow} onClick={() => setType(t)}>
                    <span>{t}</span>
                    <span className="mono">{n}</span>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Verification" tone="paper">
            <p className={s.verify}>
              Every event in the Risk Centre and every edge in the Knowledge Graph carries the document and page it came from. Opening a
              document shows the OCR confidence per field, so a weak extraction is visible before it becomes an explanation.
            </p>
            <Link className={s.verifyLink} to="/knowledge">
              See how events link into the graph <Icon name="arrowRight" size={12} />
            </Link>
          </Panel>
        </div>
      </div>
    </Screen>
  )
}
