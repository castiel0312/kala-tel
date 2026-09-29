# @nwis/graph3d

Interactive, **live** 3D knowledge-graph component for React. One `<Graph3DView />`
renders the local NetworkX graph and Neo4j together, and keeps them up to date
while ingestion writes — no reload, no polling fight, no manual refresh.

```
npm install @nwis/graph3d three react react-dom
```

CSS is injected at runtime by the component, so there is nothing to import for
styling. If your bundler prefers a real stylesheet:

```js
import { GRAPH3D_CSS } from '@nwis/graph3d/styles'; // injects nothing on its own
// or pull the raw string out and add it to your own stylesheet
```

## Quick start

```jsx
import Graph3DView from '@nwis/graph3d';

export default function KnowledgeGraph() {
  return (
    <Graph3DView
      apiUrl="http://localhost:8000"   // FastAPI base URL (default)
      backends={['local', 'neo4j']}
      interval={3000}
      limit={750}
      height="70vh"
      onNodeClick={(node) => console.log(node.id, node.label)}
    />
  );
}
```

No API of your own? Pass static data and it renders offline:

```jsx
<Graph3DView data={{ nodes: [{ id: 'a', label: 'Well' }], links: [] }} live={false} />
```

## How live updates work

1. `GET {apiUrl}/api/v1/graph/view` for the first paint.
2. `WS {apiUrl}/api/v1/graph/stream?interval=3&backends=local,neo4j&limit=750` for
   every subsequent change: the server sends `snapshot` frames followed by
   `delta` frames (`addedNodes`, `updatedNodes`, `removedNodes`, `addedLinks`,
   `removedLinks`).
3. If the socket cannot be established the component falls back to HTTP polling
   on the same `interval` and shows `polling` in the status badge. It reconnects
   with exponential backoff and promotes itself back to `live`.

Node positions survive updates — nodes are matched by id and mutated in place, so
the layout never jumps. New nodes flash, and a toast reports what changed.

## CORS

The WebSocket and REST calls go straight to `apiUrl`, so that origin must be
allowed by the API. Either serve the UI same-origin (recommended) or add your UI
origin to the backend:

```bash
CORS_ORIGINS=["http://localhost:5173"]   # JSON list, FastAPI settings
```

The bundled Vite dev server proxies `/api`, `/health` and `/ready` (WebSocket
included), so with `apiUrl=""` the demo needs no CORS changes at all:

```bash
GRAPH_API_TARGET=http://127.0.0.1:8000 npm run dev
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `apiUrl` | `string` | `http://localhost:8000` | `''` = same origin |
| `data` | `{nodes, links}` | `null` | Static mode, skips the API |
| `live` | `boolean` | `true` | Stream updates |
| `backends` | `string[]` | `['local','neo4j']` | Any subset |
| `interval` | `number` | `3000` | Poll/stream period (ms, min 500) |
| `limit` | `number` | `750` | Server-side node cap (max 5000) |
| `merge` | `boolean` | `true` | Collapse the same `entityId` across backends |
| `focus` / `depth` | `string` / `number` | – | Server-side subgraph |
| `theme` | `'dark' \| 'light'` | `'dark'` | |
| `palette` | `Record<string,string>` | built-in | Label → colour |
| `height` | `number \| string` | `520` | `calc(100vh - 190px)` works |
| `maxNodes` | `number` | `750` | Hard client-side cap |
| `nodeSize` | `number` | `1` | Multiplies the on-screen node radius |
| `nodeResolution` | `number` | `12` | Sphere segments |
| `linkWidth`, `linkOpacity` | `number` / auto | `null` / theme | Link width in *screen px*: `1.25px`, `2.6px` when focused, `0.55px` when dimmed; a number keeps legacy world-unit sizing |
| `showLabels` | `boolean` | theme | `L` toggles |
| `showArrows`, `showParticles` | `boolean` | `true` / auto | |
| `labelBudget` | `number` | `18` | Max labels on screen |
| `fog` | `boolean` | `true` | Depth fade, scaled to camera distance |
| `fitOnLoad` | `boolean` | `true` | Frame the graph when the layout settles |
| `showToolbar`, `showLegend`, `showDetails`, `enableShortcuts` | `boolean` | `true` | |
| `neighborhoodDepth` | `number` | `1` | Hops highlighted on select |
| `focusOnSelect`, `isolateOnSelect` | `boolean` | `true` / `false` | |
| `autoRotate`, `rotateSpeed` | `boolean`/`number` | `false` / `0.6` | |
| `physics` | `object` | – | `{linkDistance, linkStrength, chargeStrength, centerStrength}` |
| `onNodeClick`, `onNodeSelect`, `onBackgroundClick`, `onData`, `onError` | `function` | – | |

## Readability

A 3D graph turns messy for predictable reasons, and the defaults here attack each
one:

- **Labels are screen-sized.** Sprites use `sizeAttenuation: false` plus a
  per-frame scale, so text is always ~12px tall and only shifts when the camera
  or layout moves. `labelBudget` caps how many are drawn; the highest-degree
  nodes win, and the selected/hovered neighbourhood is always labelled.
- **Labels are decluttered.** Every frame the labels are re-placed in screen
  space: each one tries a free slot around its sphere (above, below, left,
  right, then further out) and is hidden when every slot collides.
- **Links are screen-sized too.** `linkWidth` bakes the cylinder radius once per
  zoom bucket, so lines hold a steady ~1.25px on screen (2.6px under focus)
  instead of collapsing to sub-pixel at fit distance. Arrows and dimmed edges
  scale the same way.
- **Nodes are screen-sized too.** Radii stay in a 3px–9px on-screen range by
  degree, so zooming in does not turn spheres into blobs.
- **Even spacing.** The default simulation uses gentle `chargeStrength` /
  `linkStrength` and seeds degree-0 nodes near the graph centroid, so unconnected
  nodes neither orbit alone at the edges nor stretch the layout (edge-length
  coefficient of variation stays under ~0.06, nearest-neighbour spacing uniform).
- **Depth stays readable.** Fog density is derived from the camera distance, so
  the far side of the graph fades the same amount at any zoom level.
- **The camera frames the graph** once the first layout settles, and `F` re-frames
  it. The bundled `zoomToFit` is bypassed because it mis-frames in 3D.


## Imperative API

```jsx
const graph = useRef(null);
<Graph3DView ref={graph} />;

graph.current.zoomToFit(600);   // frames every node; also `fit()`
graph.current.centerOn('WELL-AA-01');
graph.current.resetCamera();
graph.current.select('WELL-AA-01');
graph.current.clearSelection();
graph.current.getGraph();       // { nodes, links } — the render graph
graph.current.getState();       // { status, selected, isolated, emphasis, ... }
graph.current.getRenderStats(); // { nodes, links, objects, camera } — three.js scene census
graph.current.forceGraph();     // the raw react-force-graph-3d instance
```

## Keyboard

`F` fit · `R` reset view · `L` labels · `A` arrows · `/` search · `Esc` clear.
Shortcuts are ignored while typing in a field; disable with `enableShortcuts={false}`.

## Demo

```bash
npm install
npm run dev            # http://localhost:5173, proxies the API
npm run build          # production bundle of the demo
```

`Graph3DView` needs a sized container — it measures itself with a
`ResizeObserver`, so `height` (and a non-zero width) must be set.

## Exports

`@nwis/graph3d` (default `Graph3DView`), `useGraphStream`, the pure graph
transforms in `graphTransform.js`, themes from `@nwis/graph3d/theme`, and
`GRAPH3D_CSS` for bundlers that cannot import CSS files.
