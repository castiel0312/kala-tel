import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import { Button, Chip, Legend, LegendItem, MicroLabel, Segmented } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { Section, Source } from '../Section'
import { useNearViewport } from '../hooks'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'
import type { GraphCanvasProps } from './GraphCanvas'

const sec = SEC.graph
const HOPS = [
  { value: '1', label: '1 hop' },
  { value: '2', label: '2 hops' },
  { value: '3', label: '3 hops' },
]

/** Cytoscape is ~350 kB; it arrives when the reader gets within 600 px of this section. */
const LazyGraph = lazy(() => import('./GraphCanvas').then((m) => ({ default: m.GraphCanvas })))

/**
 * 09 · Knowledge graph.
 *
 * A neighbourhood, never the whole store — so the header always states how many of how many
 * nodes are on screen. The path the API returns is drawn in yellow *and* written out in
 * words, because a reasoning path that cannot be read aloud cannot be audited.
 */
export function GraphSection() {
  const { goTo } = useNwis()
  const [hops, setHops] = useState('2')
  const [sel, setSel] = useState<string | null>(null)
  const [canvas, setCanvas] = useState<{ fit: () => void; focus: () => void; clear: () => void } | null>(null)
  const { ref, near } = useNearViewport<HTMLDivElement>()

  const graph = useQuery({
    queryKey: qk.graph(undefined, Number(hops)),
    queryFn: () => api.graph(undefined, Number(hops)),
    staleTime: 60_000,
  })

  const g = graph.data
  const onReady = useCallback((api: Parameters<GraphCanvasProps['onReady']>[0]) => setCanvas(api), [])
  const onSelect = useCallback((id: string | null) => setSel(id), [])

  const node = g?.nodes.find((n) => n.id === sel) ?? null
  const neighbours = useMemo(() => {
    if (!g || !sel) return []
    const ids = new Set<string>()
    for (const e of g.edges) {
      if (e.from === sel) ids.add(e.to)
      if (e.to === sel) ids.add(e.from)
    }
    return g.nodes.filter((n) => ids.has(n.id))
  }, [g, sel])

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
          <Segmented
            value={hops}
            options={HOPS}
            onChange={(v) => {
              setHops(v)
              setSel(null)
            }}
            ariaLabel="Graph depth"
            onBlack
          />
          <Chip tone="outline" title="nodes loaded in this neighbourhood">
            {g ? `${g.nodes.length} of ${(g.totalNodesInStore ?? 0).toLocaleString()}` : 'loading'}
          </Chip>
        </>
      }
    >
      <div className={s.graphGrid}>
        <div className={s.graphStage} ref={ref}>
          {near && g ? (
            <Suspense fallback={<div className={s.graphSkeleton} aria-hidden />}>
              <LazyGraph graph={g} onSelect={onSelect} onReady={onReady} />
            </Suspense>
          ) : (
            <div className={s.graphSkeleton} aria-hidden />
          )}

          <div className={s.graphTools}>
            <Button size="sm" variant="on" onClick={() => canvas?.fit()}>
              Fit
            </Button>
            <Button size="sm" variant="on" onClick={() => canvas?.focus()} disabled={!sel}>
              Focus
            </Button>
            <Button size="sm" variant="on" onClick={() => canvas?.clear()}>
              All
            </Button>
          </div>

          <div className={s.graphLegend}>
            <Legend onBlack>
              <span className={s.legendTitle}>Node type</span>
              <LegendItem color="#F5C518" label="Active well" shape="dot" onBlack />
              <LegendItem color="#8A96A0" label="Offset well" shape="dot" onBlack />
              <LegendItem color="#4E86C6" label="Formation" shape="box" onBlack />
              <LegendItem color="#FF6A58" label="Event" shape="dot" onBlack />
              <LegendItem color="#C8A44A" label="Cause" shape="dot" onBlack />
              <LegendItem color="#45BD83" label="Action" shape="dot" onBlack />
              <LegendItem color="#B98A5E" label="Document" shape="box" onBlack />
            </Legend>
          </div>
        </div>

        <aside className={s.graphAside}>
          <div className={s.graphBlock}>
            <MicroLabel onBlack>{node ? node.label : 'Node'}</MicroLabel>
            {node ? (
              <>
                <div className={s.nodeHead}>
                  <span className="mono">{node.id}</span>
                  {node.severity && <Chip tone="red">{node.severity}</Chip>}
                </div>
                {node.ref && (
                  <p className={s.nodeRef}>
                    <span className="mono">{node.ref}</span>
                  </p>
                )}
                <ul className={s.nodeLinks}>
                  {neighbours.map((nb) => (
                    <li key={nb.id}>
                      <button type="button" onClick={() => setSel(nb.id)}>
                        <i style={{ background: nb.type === 'event' ? '#FF6A58' : '#8A96A0' }} aria-hidden />
                        <span>{nb.label}</span>
                      </button>
                    </li>
                  ))}
                  {neighbours.length === 0 && <li className={s.dim}>No edges in this neighbourhood.</li>}
                </ul>
              </>
            ) : (
              <p className={s.hint}>
                Select a node to see what it connects to. {g ? `${g.nodes.length} nodes are loaded` : ''} Colour is
                type; a red border is a high-severity event.
              </p>
            )}
          </div>

          <div className={s.graphBlock}>
            <MicroLabel onBlack>Evidence path</MicroLabel>
            {g?.evidencePathText ? (
              <>
                <p className={s.pathText}>{g.evidencePathText}</p>
                <div className={s.pathEdges}>
                  {g.evidencePath.map((e) => {
                    const edge = g.edges.find((x) => x.id === e)
                    if (!edge) return null
                    return <span key={e}>{edge.label || edge.relation}</span>
                  })}
                </div>
                <p className={s.pathNote}>
                  Drawn in yellow above. Every hop is a stored fact from an indexed document, not an inference made
                  in this view.
                </p>
                <Button size="sm" onClick={() => goTo('memory')}>
                  Open the source event
                </Button>
              </>
            ) : (
              <p className={s.hint}>No evidence path returned for this neighbourhood.</p>
            )}
          </div>

          <div className={s.graphBlock}>
            <MicroLabel onBlack>Store</MicroLabel>
            <dl className={s.kvDark}>
              <div>
                <dt>nodes in store</dt>
                <dd className="mono">{(g?.totalNodesInStore ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt>on screen</dt>
                <dd className="mono">{g?.nodes.length ?? 0}</dd>
              </div>
              <div>
                <dt>edges</dt>
                <dd className="mono">{g?.edges.length ?? 0}</dd>
              </div>
            </dl>
            {node?.type === 'document' && (
              <Button size="sm" onClick={() => goTo('documents')}>
                <Icon name="file" size={12} /> Go to the document
              </Button>
            )}
          </div>
        </aside>
      </div>

      <Source kind="API">/graph/neighbourhood?hops={hops} · centred on {g?.center ?? 'the active well'}</Source>
    </Section>
  )
}
