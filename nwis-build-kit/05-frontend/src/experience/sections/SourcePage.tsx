import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import type { ExtractionField } from '../../api/types'
import s from '../sections.module.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

/** The demo file lives in the bundle's public folder. */
const FILE_FOR = (documentId: string) => `/docs/${documentId}`

export interface SourcePageProps {
  documentId: string
  page: number
  fields: ExtractionField[]
  /** fields below this confidence get a red mark rather than a yellow one */
  threshold: number
  selectedFieldId: string | null
  onSelectField: (id: string | null) => void
  onError?: (message: string) => void
}

/**
 * The real page, from the real file, with the extracted fields pinned to the lines they came
 * from. The rectangles are derived from the API's `bbox.lineTops` — baselines in PDF user space
 * measured from the foot of the page — scaled by the rendered viewport, so a click on a field
 * finds its line on the page and the other way round.
 */
export function SourcePage({
  documentId,
  page,
  fields,
  threshold,
  selectedFieldId,
  onSelectField,
  onError,
}: SourcePageProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [pageSize, setPageSize] = useState({ w: 595, h: 842 })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(Math.max(320, el.clientWidth - 24))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const marks = useMemo(() => {
    const pdfH = 842
    const scale = pageSize.h / pdfH
    return fields.flatMap((f) =>
      f.bbox.lineTops.map((baseline) => ({
        fieldId: f.id,
        key: `${f.id}-${baseline}`,
        top: (pdfH - baseline - 3) * scale,
        height: 15 * scale,
        left: 42 * scale,
        width: (556 - 42) * scale,
        below: f.confidence < threshold,
      })),
    )
  }, [fields, pageSize, threshold])

  return (
    <div className={s.pdfCanvas} ref={wrapRef}>
      <Document
        file={FILE_FOR(documentId)}
        loading={<div className={s.pdfLoading}>opening the source page…</div>}
        onLoadError={() => onError?.(`${documentId} could not be opened`)}
      >
        <Page
          pageNumber={page}
          width={width}
          renderTextLayer
          onRenderSuccess={({ width: w, height: h }) => setPageSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))}
          loading={<div className={s.pdfLoading}>rendering…</div>}
        />
      </Document>
      <div className={s.pdfOverlay} style={{ width, height: pageSize.h }}>
        {marks.map((m) => (
          <button
            key={m.key}
            type="button"
            className={[s.pdfMark, m.below && s.pdfMarkBelow, selectedFieldId === m.fieldId && s.pdfMarkOn]
              .filter(Boolean)
              .join(' ')}
            style={{ top: m.top, height: m.height, left: m.left, width: m.width }}
            onClick={() => onSelectField(m.fieldId === selectedFieldId ? null : m.fieldId)}
            aria-label={`Source line for ${m.fieldId}`}
            aria-pressed={selectedFieldId === m.fieldId}
          />
        ))}
      </div>
    </div>
  )
}
