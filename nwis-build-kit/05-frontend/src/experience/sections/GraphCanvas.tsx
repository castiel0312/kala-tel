import { useEffect, useMemo, useRef } from 'react'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import type { Graph, GraphNode } from '../../api/types'

/**
 * The graph surface, split out so cytoscape is only fetched when the reader is close to the
 * section. Styling is the dark variant: white type, a yellow evidence path, severity as a
 * border so type and severity never compete for the same channel.
 */
export const TYPE_STYLE: Record<GraphNode['type'], { color: string; label: string }> = {
  active_well: { color: '#F5C518', label: 'Active well' },
  well: { color: '#8A96A0', label: 'Offset well' },
  formation: { color: '#4E86C6', label: 'Formation' },
  event: { color: '#FF6A58', label: 'Event' },
  cause: { color: '#C8A44A', label: 'Cause' },
  action: { color: '#45BD83', label: 'Action' },
  outcome: { color: '#A692E0', label: 'Outcome' },
  document: { color: '#B98A5E', label: 'Document' },
}

export function buildElements(g: Graph | undefined): ElementDefinition[] {
  if (!g) return []
  const pathIds = new Set(g.evidencePath ?? [])
  return [
    ...g.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.type,
        severity: n.severity ?? '',
        color: TYPE_STYLE[n.type]?.color ?? '#8A96A0',
        shape:
          n.type === 'formation' ? 'round-rectangle' : n.type === 'event' ? 'diamond' : n.type === 'document' ? 'hexagon' : 'ellipse',
        size: n.type === 'active_well' ? 44 : n.type === 'event' ? 28 : 22,
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
}

const STYLE: cytoscape.StylesheetJson = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      label: 'data(label)',
      color: '#F1F1ED',
      'font-size': 8,
      'font-family': 'IBM Plex Mono, monospace',
      'font-weight': 600,
      'text-valign': 'bottom',
      'text-margin-y': 4,
      'text-outline-color': '#0A0B0B',
      'text-outline-width': 3,
      width: 'data(size)',
      height: 'data(size)',
      'border-width': 1,
      'border-color': '#3B3F3D',
      'overlay-opacity': 0,
      'min-zoomed-font-size': 7,
    },
  },
  { selector: 'node[shape = "round-rectangle"]', style: { shape: 'round-rectangle' } },
  { selector: 'node[shape = "diamond"]', style: { shape: 'diamond' } },
  { selector: 'node[shape = "hexagon"]', style: { shape: 'hexagon' } },
  {
    selector: 'node[type="active_well"]',
    style: { 'border-width': 3, 'border-color': '#F5C518', color: '#FFFFFF', 'font-size': 10 },
  },
  { selector: 'node[severity = "HIGH"]', style: { 'border-width': 3, 'border-color': '#FF6A58' } },
  {
    selector: 'node:selected',
    style: { 'border-width': 3, 'border-color': '#F5C518', 'overlay-color': '#F5C518', 'overlay-opacity': 0.14 },
  },
  {
    selector: 'edge',
    style: {
      width: 1,
      'line-color': '#3B3F3D',
      'curve-style': 'straight',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#3B3F3D',
      'arrow-scale': 0.7,
      label: 'data(label)',
      'font-size': 7,
      'font-family': 'IBM Plex Mono, monospace',
      color: '#8E928B',
      'text-rotation': 'autorotate',
      'text-margin-y': 2,
      'text-outline-color': '#0A0B0B',
      'text-outline-width': 2,
    },
  },
  {
    selector: 'edge[onPath = 1]',
    style: {
      width: 2.4,
      'line-color': '#F5C518',
      'target-arrow-color': '#F5C518',
      color: '#F5C518',
      'font-size': '7.5px',
      'font-weight': 600,
    },
  },
  { selector: '.faded', style: { opacity: 0.14 } },
]

export interface GraphCanvasProps {
  graph: Graph
  onSelect: (nodeId: string | null) => void
  onReady: (api: { fit: () => void; focus: () => void; clear: () => void }) => void
}

export function GraphCanvas({ graph, onSelect, onReady }: GraphCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)
  // Memoised on the graph alone: a fresh array every render would re-run the init effect,
  // which reports its handle back to the parent, which re-renders, which builds a new array.
  const elements = useMemo(() => buildElements(graph), [graph])
  // The instance is built once per graph, so the callbacks it closes over are read from refs
  // rather than kept in the dependency list.
  const handlers = useRef({ onSelect, onReady })
  handlers.current = { onSelect, onReady }

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !elements.length) return

    const cy = cytoscape({
      container: el,
      elements,
      minZoom: 0.4,
      maxZoom: 2.2,
      wheelSensitivity: 0.22,
      boxSelectionEnabled: false,
      style: STYLE,
      layout: {
        name: 'cose',
        animate: false,
        padding: 40,
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 96,
        nodeOverlap: 14,
        gravity: 0.35,
        numIter: 900,
      },
    })

    cy.on('tap', 'node', (ev) => handlers.current.onSelect(ev.target.id()))
    cy.on('tap', (ev) => {
      if (ev.target === cy) handlers.current.onSelect(null)
    })

    const ro = new ResizeObserver(() => {
      cy.resize()
      cy.fit(undefined, 48)
    })
    ro.observe(el)
    cy.fit(undefined, 48)
    cyRef.current = cy

    handlers.current.onReady({
      fit: () => cy.fit(undefined, 48),
      focus: () => {
        const sel = cy.$('node:selected')
        if (sel.length) sel.connectedEdges().addClass('faded')
        cy.elements().not('node:selected').removeClass('faded')
      },
      clear: () => cy.elements().removeClass('faded'),
    })

    return () => {
      ro.disconnect()
      cy.destroy()
      cyRef.current = null
    }
    // One graph, one graph instance. Changing the hops swaps `graph` and this rebuilds.
  }, [elements, graph])

  return <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }} />
}
