import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import { api, qk } from '../api/client'
import type { GraphNode } from '../api/types'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { Button, Chip, ErrorStrip, Panel, ProvenanceTag, Segmented, Skel } from '../components/kit'
import { Icon } from '../components/kit/icons'
import s from './KnowledgeGraph.module.css'

/* ============================================================================
   Knowledge Graph — screen 09.

   The graph is a neighbourhood of the active well, not the whole store, so the
   header always states how many of how many nodes are on screen. Node colour is
   type; severity is a border, never a fill, so the eye can separate "what kind
   of thing" from "how bad". The evidence path returned by the API is drawn as a
   second, highlighted layer and is also spelled out in words, because a path
   that cannot be read aloud cannot be audited.
   ========================================================================== */

const TYPE_STYLE: Record<GraphNode['type'], { color: string; label: string }> = {
  active_well: { color: '#111111', label: 'Active well' },
  well: { color: '#4A5560', label: 'Offset well' },
  formation: { color: '#1D4E89', label: 'Formation' },
  event: { color: '#D64545', label: 'Event' },
  cause: { color: '#8A6A1F', label: 'Cause' },
  action: { color: '#2C6E49', label: 'Action' },
  outcome: { color: '#6B5CA5', label: 'Outcome' },
  document: { color: '#7A5C3E', label: 'Document' },
}

const HOPS = [
  { value: '1', label: '1 hop' },
  { value: '2', label: '2 hops' },
  { value: '3', label: '3 hops' },
]

export function KnowledgeGraph() {
  const [hops, setHops] = useState('2')
  const [sel, setSel] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)

  const graph = useQuery({
    queryKey: qk.graph(undefined, Number(hops)),
    queryFn: () => api.graph(undefined, Number(hops)),
    staleTime: 60_000,
  })

  const g = graph.data
  const pathIds = useMemo(() => new Set(g?.evidencePath ?? []), [g])

  const elements = useMemo<ElementDefinition[]>(() => {
    if (!g) return []
    return [
      ...g.nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          ref: n.ref ?? '',
          severity: n.severity ?? '',
          color: TYPE_STYLE[n.type].color,
          shape: n.type === 'formation' ? 'round-rectangle' : n.type === 'event' ? 'diamond' : n.type === 'document' ? 'hexagon' : 'ellipse',
          size: n.type === 'active_well' ? 46 : n.type === 'event' ? 30 : 24,
        },
      })),
      ...g.edges.map((e) => ({
        data: {
          id: e.id,
          source: e.from,
          target: e.to,
          relation: e.relation,
          label: e.label ?? '',
          onPath: pathIds.has(e.id) ? 1 : 0,
        },
      })),
    ]
  }, [g, pathIds])

  useEffect(() => {
    if (!wrapRef.current || !elements.length) return
    const cy = cytoscape({
      container: wrapRef.current,
      elements,
      minZoom: 0.4,
      maxZoom: 2.2,
      wheelSensitivity: 0.22,
      boxSelectionEnabled: false,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#0B0B0B',
            'font-size': 8,
            'font-family': 'IBM Plex Mono, monospace',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-outline-color': '#FFFFFF',
            'text-outline-width': 2,
            width: 'data(size)',
            height: 'data(size)',
            shape: 'ellipse',
            'border-width': 1,
            'border-color': '#FFFFFF',
            'overlay-opacity': 0,
            'min-zoomed-font-size': 7,
          },
        },
        {
          selector: 'node[shape = "round-rectangle"]',
          style: { shape: 'round-rectangle' },
        },
        {
          selector: 'node[shape = "diamond"]',
          style: { shape: 'diamond' },
        },
        {
          selector: 'node[shape = "hexagon"]',
          style: { shape: 'hexagon' },
        },
        {
          selector: 'node[type="active_well"]',
          style: { 'border-width': 3, 'border-color': '#F2C200', color: '#000000', 'font-size': 10 },
        },
        {
          selector: 'node[severity = "HIGH"]',
          style: { 'border-width': 3, 'border-color': '#D64545' },
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 3, 'border-color': '#0B0B0B', 'overlay-color': '#F2C200', 'overlay-opacity': 0.12 },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#C8C4BA',
            'curve-style': 'straight',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#C8C4BA',
            'arrow-scale': 0.7,
            label: 'data(label)',
            'font-size': 7,
            'font-family': 'IBM Plex Mono, monospace',
            color: '#8A857A',
            'text-rotation': 'autorotate',
            'text-margin-y': 2,
            'text-background-color': '#FFFFFF',
            'text-background-opacity': 0.85,
            'text-background-padding': '1px',
          },
        },
        {
          selector: 'edge[onPath = 1]',
          style: {
            width: 2.4,
            'line-color': '#F2C200',
            'target-arrow-color': '#F2C200',
            color: '#111111',
            'font-size': '7.5px',
            'font-weight': 600,
          },
        },
        {
          selector: '.faded',
          style: { opacity: 0.16 },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 34,
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 92,
        nodeOverlap: 14,
        gravity: 0.35,
        numIter: 900,
      },
    })

    cy.on('tap', 'node', (ev) => setSel(ev.target.id()))
    cy.on('tap', (ev) => {
      if (ev.target === cy) setSel(null)
    })

    const ro = new ResizeObserver(() => {
      cy.resize()
      cy.fit(undefined, 44)
    })
    ro.observe(wrapRef.current)
    cy.fit(undefined, 44)
    cyRef.current = cy
    return () => {
      ro.disconnect()
      cy.destroy()
      cyRef.current = null
    }
  }, [elements])

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

  const highlightNeighbourhood = () => {
    const cy = cyRef.current
    if (!cy || !sel) return
    cy.elements().removeClass('faded')
    cy.nodes().forEach((n) => {
      const linked = new Set<string>([sel, ...neighbours.map((nb) => nb.id)])
      if (!linked.has(n.id())) n.addClass('faded')
    })
  }
  const clearHighlight = () => cyRef.current?.elements().removeClass('faded')

  return (
    <Screen
      num="09"
      section="Knowledge"
      title="Knowledge Graph"
      sub={
        g ? (
          <>
            <b className="mono">{g.nodes.length}</b> of <span className="mono">{(g.totalNodesInStore ?? 0).toLocaleString()}</span> nodes ·{' '}
            {g.edges.length} edges · centred on <b className="mono">{g.center}</b>
          </>
        ) : (
          'The neighbourhood of the active well in the knowledge store.'
        )
      }
      aside={
        <HeaderTools>
          <ProvenanceTag kind="DERIVED" label="GRAPH QUERY" />
          <Segmented value={hops} options={HOPS} onChange={setHops} ariaLabel="Graph depth" />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <Panel
          title="Neighbourhood"
          tone="black"
          signal={g?.evidencePath.length ? 'signal' : undefined}
          flush
          className={s.canvas}
          meta={
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-ink-3)' }}>
              {g ? `hops ${g.hops}` : 'loading'}
            </span>
          }
        >
          {graph.isLoading ? (
            <div className={s.skel}>
              <Skel h={420} ink />
            </div>
          ) : graph.isError ? (
            <div className={s.skel}>
              <ErrorStrip body="The knowledge graph could not be queried." action="Retry" onAction={() => void graph.refetch()} />
            </div>
          ) : (
            <>
              <div ref={wrapRef} className={s.cy} />
              <div className={s.hud}>
                <div className={s.legend}>
                  {Object.entries(TYPE_STYLE).map(([k, v]) => (
                    <span className={s.legendItem} key={k}>
                      <i style={{ background: v.color }} />
                      {v.label}
                    </span>
                  ))}
                </div>
                <div className={s.hudBtns}>
                  <Button size="sm" variant="on" onClick={() => cyRef.current?.fit(undefined, 44)}>
                    Fit
                  </Button>
                  <Button size="sm" variant="on" onClick={highlightNeighbourhood} disabled={!sel}>
                    Focus
                  </Button>
                  <Button size="sm" variant="on" onClick={clearHighlight}>
                    All
                  </Button>
                </div>
              </div>
            </>
          )}
        </Panel>

        <div className={s.sideCol}>
          <Panel
            title={node ? node.label : 'Node'}
            tone={node?.type === 'active_well' ? 'black' : 'paper'}
            meta={node ? <Chip tone="outline">{TYPE_STYLE[node.type].label}</Chip> : undefined}
          >
            {node ? (
              <div className={s.node}>
                <div className={s.nodeHead}>
                  <span className={s.nodeId}>{node.id}</span>
                  {node.severity && <Chip tone="red">{node.severity}</Chip>}
                </div>
                {node.ref && (
                  <Link className={s.nodeRef} to={node.type === 'well' || node.type === 'active_well' ? `/compare/${node.ref}` : `/documents?q=${node.ref}`}>
                    {node.ref} <Icon name="arrowRight" size={12} />
                  </Link>
                )}
                <div className={s.nodeLinks}>
                  <div className={s.nodeLinkK}>Connected to</div>
                  {neighbours.map((nb) => (
                    <button
                      key={nb.id}
                      type="button"
                      className={s.nodeLink}
                      onClick={() => {
                        setSel(nb.id)
                        cyRef.current?.$id(nb.id).select()
                      }}
                    >
                      <i style={{ background: TYPE_STYLE[nb.type].color }} />
                      <span>{nb.label}</span>
                      <small>{TYPE_STYLE[nb.type].label}</small>
                    </button>
                  ))}
                  {!neighbours.length && <span className={s.dim}>No edges in this neighbourhood.</span>}
                </div>
              </div>
            ) : (
              <p className={s.hint}>
                Select a node to see what it is connected to. {g ? `${g.nodes.length} nodes are loaded` : ''} Node colour is type; a red
                border is a high-severity event.
              </p>
            )}
          </Panel>

          <Panel
            title="Evidence path"
            tone="black"
            signal={g?.evidencePath.length ? 'signal' : undefined}
            meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-ink-3)' }}>api evidencePath</span>}
          >
            {g?.evidencePathText ? (
              <>
                <p className={s.pathText}>{g.evidencePathText}</p>
                <div className={s.pathEdges}>
                  {g.evidencePath.map((e) => {
                    const edge = g.edges.find((x) => x.id === e)
                    if (!edge) return null
                    return (
                      <span className={s.pathEdge} key={e}>
                        {edge.label || edge.relation}
                      </span>
                    )
                  })}
                </div>
                <p className={s.pathNote}>
                  Drawn in yellow above. Every hop is a stored fact from an indexed document, not an inference made in this view.
                </p>
              </>
            ) : (
              <p className={s.hint}>No evidence path returned for this neighbourhood.</p>
            )}
          </Panel>

          <Panel title="Store" meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>index size</span>}>
            <div className={s.store}>
              <div>
                <b className="mono">{(g?.totalNodesInStore ?? 0).toLocaleString()}</b>
                <span>nodes in store</span>
              </div>
              <div>
                <b className="mono">{g?.nodes.length ?? 0}</b>
                <span>on screen</span>
              </div>
              <div>
                <b className="mono">{g?.edges.length ?? 0}</b>
                <span>edges</span>
              </div>
            </div>
            <div className={s.links}>
              <Link to="/#memory">Knowledge repository</Link>
              <Link to="/#documents">Document intelligence</Link>
            </div>
          </Panel>
        </div>
      </div>
    </Screen>
  )
}
