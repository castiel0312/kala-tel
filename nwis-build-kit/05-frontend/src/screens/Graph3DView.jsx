import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

import { injectGraph3dStyles } from './styles.js';
import { colorForLabel, getTheme, sizeForNode } from './theme.js';
import {
  buildAdjacency,
  filterGraph,
  labelCounts,
  neighborhood,
  relationshipTypes,
} from './graphTransform.js';
import { useGraphStream } from './useGraphStream.js';

const DEFAULT_API_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_GRAPH_API_URL) ||
  'http://localhost:8000';

const FLASH_MS = 2600;
const FOG_STRENGTH = 0.85;

// Links and arrowheads are sized in *on-screen pixels* and converted to world
// units per frame, so they stay visible at any camera distance.
const LINK_WIDTH_PX = 1.25;
const LINK_WIDTH_FOCUS_PX = 2.6;
const LINK_WIDTH_DIM_PX = 0.55;
const ARROW_LENGTH_PX = 2.2;

/* ------------------------------------------------------------------ */
/* three.js helpers                                                    */
/* ------------------------------------------------------------------ */

const LABEL_HEIGHT_PX = 12;

function makeLabelSprite(text, color, theme) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  // The sprite is drawn at a constant size on screen, so the texture only has
  // to be a crisp 2x version of the final pixel size.
  const font = `600 ${LABEL_HEIGHT_PX * 2}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  context.font = font;
  const textWidth = Math.ceil(context.measureText(text).width);
  const padX = 10;
  const height = LABEL_HEIGHT_PX * 2 + 6;
  canvas.width = Math.max(2, textWidth + padX * 2);
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // Dark halo keeps text readable over spheres and other labels.
  ctx.shadowColor = theme.background;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.fillText(text, padX, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: false,
    opacity: theme.labelOpacity,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((canvas.width / height) * LABEL_HEIGHT_PX, LABEL_HEIGHT_PX, 1);
  sprite.renderOrder = 3;
  sprite.userData.aspect = canvas.width / height;
  return sprite;
}

/**
 * Keep text at a fixed pixel height.
 *
 * With `sizeAttenuation: false` a sprite is sized in screen space and the parent
 * mesh scale multiplies that size - so divide it back out and the label is the
 * same size at every zoom level.
 */
function updateLabelScale(sprite, viewportHeight, parentScale) {
  if (!sprite || !viewportHeight) return;
  const ndcHeight = (LABEL_HEIGHT_PX * 2) / viewportHeight;
  const parent = parentScale || 1;
  sprite.scale.set(
    (sprite.userData.aspect || 4) * ndcHeight / parent,
    ndcHeight / parent,
    1,
  );
}

/**
 * Nudge labels apart in screen space.
 *
 * Text sitting on top of other text is the single biggest source of clutter in
 * a 3D graph: the 3D positions are fine, they just land on the same pixels.
 * Every label gets a free slot around its sphere where possible, highest
 * priority first, and the result is converted back into the sprite's local
 * offset so the text still tracks its node.
 */
function placeLabels(labelled, camera, viewportHeight, viewportWidth) {
  if (!labelled.length) return;
  const Vector3 = camera?.position?.constructor;
  if (!Vector3 || !camera || !viewportHeight || !viewportWidth) {
    for (const item of labelled) item.sprite.position.y = item.mesh.scale.x;
    return;
  }

  const scratch = new Vector3();
  const world = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  const half = LABEL_HEIGHT_PX / 2;
  const halfFovTangent = Math.tan(((camera.fov || 50) * Math.PI) / 360);
  camera.matrixWorld.extractBasis(right, up, new Vector3());
  const placed = [];
  // Highest priority first, so the nodes the user cares about keep their spot.
  labelled.sort((a, b) => b.priority - a.priority);

  for (const item of labelled) {
    const { mesh, sprite } = item;
    const width = (sprite.userData.aspect || 4) * LABEL_HEIGHT_PX;
    scratch.set(mesh.position.x, mesh.position.y, mesh.position.z);
    scratch.project(camera);
    const cx = (scratch.x * 0.5 + 0.5) * viewportWidth;
    const cy = (1 - (scratch.y * 0.5 + 0.5)) * viewportHeight;
    // Nothing to declutter for a node that is behind the camera or off screen.
    if (scratch.z >= 1
      || cx < -width || cx > viewportWidth + width
      || cy < -LABEL_HEIGHT_PX || cy > viewportHeight + LABEL_HEIGHT_PX) {
      sprite.visible = false;
      continue;
    }
    sprite.visible = true;
    const gap = item.radiusPx + 3;
    const step = gap + LABEL_HEIGHT_PX;
    const side = width / 2 + gap;

    // Preferred slot is above the sphere, then below, then either side, then
    // progressively further out for the crowded middle of the graph. `step`
    // sizes the vertical offsets past one full box height so no two labels
    // land edge-on-edge after projection rounding.
    const slots = [
      [0, -step],
      [0, step],
      [side, 0],
      [-side, 0],
      [side, -step * 0.9],
      [-side, -step * 0.9],
      [side, step],
      [-side, step],
      [0, -step * 1.9],
      [0, step * 1.9],
      [side * 1.5, -step * 1.2],
      [-side * 1.5, -step * 1.2],
      [side * 1.5, step * 1.2],
      [-side * 1.5, step * 1.2],
      [0, -step * 2.8],
      [0, step * 2.8],
    ];

    let chosen = slots[0];
    let chosenCost = Infinity;
    const margin = 1;
    for (const [dx, dy] of slots) {
      const x0 = cx + dx - width / 2;
      const x1 = cx + dx + width / 2;
      const y0 = cy + dy - half;
      const y1 = cy + dy + half;
      let cost = 0;
      for (const box of placed) {
        const ox = Math.min(x1, box.x1) - Math.max(x0, box.x0) - margin;
        const oy = Math.min(y1, box.y1) - Math.max(y0, box.y0) - margin;
        if (ox > 0 && oy > 0) cost += ox * oy;
      }
      if (cost === 0) { chosen = [dx, dy]; chosenCost = 0; break; }
      if (cost < chosenCost) { chosenCost = cost; chosen = [dx, dy]; }
    }
    // Crowded neighbourhoods can exhaust the ring above; fall back to wider
    // fan-outs so a clean slot is preferred over a cheap-but-overlapping one.
    if (chosenCost > 0) {
      for (const f of [2.2, 3.1, 4.2]) {
        const farSlots = [
          [0, -step * f],
          [0, step * f],
          [side * f, -step * f * 0.8],
          [-side * f, -step * f * 0.8],
          [side * f, step * f * 0.8],
          [-side * f, step * f * 0.8],
        ];
        for (const [dx, dy] of farSlots) {
          const x0 = cx + dx - width / 2;
          const x1 = cx + dx + width / 2;
          const y0 = cy + dy - half;
          const y1 = cy + dy + half;
          let cost = 0;
          for (const box of placed) {
            const ox = Math.min(x1, box.x1) - Math.max(x0, box.x0) - margin;
            const oy = Math.min(y1, box.y1) - Math.max(y0, box.y0) - margin;
            if (ox > 0 && oy > 0) cost += ox * oy;
          }
          if (cost === 0) { chosen = [dx, dy]; chosenCost = 0; break; }
        }
        if (chosenCost === 0) break;
      }
    }
    // Two nodes can sit on the same pixel (one directly behind the other), and
    // then no offset helps. A half-hidden label is worse than no label, so drop
    // it unless the user is pointing at that node.
    sprite.visible = item.priority >= 1e6
      ? chosenCost <= width * LABEL_HEIGHT_PX
      : chosenCost === 0;
    if (!sprite.visible) continue;    placed.push({
      x0: cx + chosen[0] - width / 2,
      x1: cx + chosen[0] + width / 2,
      y0: cy + chosen[1] - half,
      y1: cy + chosen[1] + half,
    });

    // Screen offset -> sprite offset. The node can sit anywhere in depth, so a
    // single distance would misplace labels that are not at the orbit target:
    // offset along the camera basis, then correct against the real projection.
    mesh.getWorldPosition(world);
    const nodeDistance = Math.max(1, camera.position.distanceTo(world));
    const worldPerPixel = (2 * nodeDistance * halfFovTangent) / viewportHeight;
    const scale = mesh.scale.x || 1;
    let alongRight = chosen[0] / scale;
    let alongUp = (mesh.scale.x + chosen[1] * worldPerPixel) / scale;
    for (let step = 0; step < 4; step += 1) {
      sprite.position.set(
        right.x * alongRight * scale + up.x * alongUp * scale,
        right.y * alongRight * scale + up.y * alongUp * scale,
        right.z * alongRight * scale + up.z * alongUp * scale,
      ).divideScalar(scale);
      sprite.getWorldPosition(world).project(camera);
      const errX = cx + chosen[0] - ((world.x * 0.5 + 0.5) * viewportWidth);
      const errY = cy + chosen[1] - ((1 - (world.y * 0.5 + 0.5)) * viewportHeight);
      if (Math.abs(errX) < 0.2 && Math.abs(errY) < 0.2) break;
      alongRight += (errX * worldPerPixel) / scale;
      alongUp += (errY * worldPerPixel) / scale;
    }
  }
}

/**
 * Frame the whole graph in the viewport.
 *
 * The bundled `zoomToFit` passes its arguments to `fitToBbox` one slot out, so
 * it drifts the camera to an arbitrary distance. Fitting the node bounding box
 * by hand is predictable: project the eight box corners onto the camera basis
 * and pull back just far enough for the widest of them to stay in frame.
 */
function fitCameraToGraph(fg, nodes, duration = 500, margin = 1.22) {
  const camera = fg?.camera?.();
  const controls = fg?.controls?.();
  if (!camera) return false;
  const box = new THREE.Box3();
  let placed = 0;
  for (const node of nodes) {
    if (typeof node.x !== 'number') continue;
    box.expandByPoint(new THREE.Vector3(node.x, node.y || 0, node.z || 0));
    placed += 1;
  }
  if (!placed) return false;
  if (box.isEmpty()) return false;

  const center = box.getCenter(new THREE.Vector3());
  const viewDir = controls
    ? camera.position.clone().sub(controls.target)
    : camera.position.clone();
  if (viewDir.lengthSq() < 1e-6) viewDir.set(0, 0, 1);
  viewDir.normalize();

  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, viewDir);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const top = new THREE.Vector3().crossVectors(viewDir, right).normalize();

  const aspect = camera.aspect || 1;
  const tanV = Math.tan(((camera.fov || 50) * Math.PI) / 360);
  const tanH = tanV * aspect;

  let distance = 0;
  const corner = new THREE.Vector3();
  for (let i = 0; i < 8; i += 1) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    ).sub(center);
    const along = corner.dot(viewDir);
    distance = Math.max(
      distance,
      along + Math.abs(corner.dot(right)) / tanH,
      along + Math.abs(corner.dot(top)) / tanV,
    );
  }
  distance = Math.max(30, distance * margin);

  const position = center.clone().add(viewDir.multiplyScalar(distance));
  if (fg.cameraPosition) {
    fg.cameraPosition(
      { x: position.x, y: position.y, z: position.z },
      { x: center.x, y: center.y, z: center.z },
      duration,
    );
  } else {
    camera.position.copy(position);
    camera.lookAt(center);
    controls?.update?.();
  }
  return true;
}

function labelTextOf(node) {
  return String(node.name || node.label || node.id).slice(0, 34);
}

/* ------------------------------------------------------------------ */
/* small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function StatusPill({ status, backends, lastUpdate, onRefresh }) {
  const tone =
    status === 'live' ? 'live'
      : status === 'polling' ? 'polling'
        : status === 'connecting' ? 'connecting'
          : status === 'error' || status === 'offline' ? 'offline'
            : 'static';
  const text =
    status === 'static' ? 'static data'
      : status === 'paused' ? 'live updates paused'
        : status;
  const names = Object.entries(backends || {});
  return (
    <>
      <span className="g3d-status" title={names.map(([k, v]) => `${k}: ${v}`).join('\n') || undefined}>
        <span className={`g3d-pulse g3d-pulse--${tone}`} />
        {text}
        {lastUpdate ? ` · ${new Date(lastUpdate).toLocaleTimeString()}` : ''}
      </span>
      {onRefresh ? (
        <button type="button" className="g3d-btn g3d-btn--icon" onClick={onRefresh} title="Force a fresh snapshot">
          ⟳
        </button>
      ) : null}
    </>
  );
}

function DetailsPanel({ node, links, onClose, onFocus, onIsolate, isolated, theme }) {
  if (!node) {
    return (
      <div className="g3d-panel">
        <div className="g3d-panel-head">
          <span className="g3d-panel-title">Inspector</span>
        </div>
        <div className="g3d-empty">
          Click a node to inspect it.
          <div className="g3d-section-title">shortcuts</div>
          <div className="g3d-hint">
            <kbd>F</kbd> fit · <kbd>R</kbd> reset view · <kbd>L</kbd> labels · <kbd>A</kbd> arrows ·{' '}
            <kbd>Esc</kbd> clear
          </div>
        </div>
      </div>
    );
  }

  const props = node.props || {};
  const backends = (node.backends || [node.backend]).filter(Boolean);
  const related = links
    .filter((link) => {
      const source = link.source?.id ?? link.source;
      const target = link.target?.id ?? link.target;
      return source === node.id || target === node.id;
    })
    .map((link) => ({
      type: link.type,
      direction: (link.source?.id ?? link.source) === node.id ? 'out' : 'in',
      other: (link.source?.id ?? link.source) === node.id ? link.target : link.source,
    }));

  const byType = new Map();
  for (const rel of related) {
    if (!byType.has(rel.type)) byType.set(rel.type, []);
    byType.get(rel.type).push(rel);
  }

  return (
    <div className="g3d-panel">
      <div className="g3d-panel-head">
        <span
          className="g3d-dot"
          style={{ background: colorForLabel(node.label) }}
          aria-hidden="true"
        />
        <span className="g3d-panel-title">{labelTextOf(node)}</span>
        <button type="button" className="g3d-btn g3d-btn--icon" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>
      <div className="g3d-panel-body">
        <dl className="g3d-kv">
          <dt>type</dt>
          <dd>{node.label || 'Unknown'}</dd>
          <dt>id</dt>
          <dd>{node.entityId || node.id}</dd>
          <dt>connections</dt>
          <dd>{node.degree ?? related.length}</dd>
          {backends.length ? (
            <>
              <dt>source</dt>
              <dd>{backends.join(' + ')}</dd>
            </>
          ) : null}
          {Object.entries(props).map(([key, value]) => (
            <React.Fragment key={key}>
              <dt>{key}</dt>
              <dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
            </React.Fragment>
          ))}
        </dl>

        {byType.size ? (
          <>
            <div className="g3d-section-title">relationships</div>
            {Array.from(byType.entries())
              .sort((a, b) => b[1].length - a[1].length)
              .map(([type, items]) => (
                <div className="g3d-rel" key={type} title={items.map((i) => i.other?.id).join('\n')}>
                  <span className="g3d-rel-name">
                    {items.filter((i) => i.direction === 'out').length ? '→ ' : ''}
                    {type}
                    {items.some((i) => i.direction === 'in') ? ' ←' : ''}
                  </span>
                  <span>{items.length}</span>
                </div>
              ))}
          </>
        ) : null}

        <div className="g3d-group" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" className="g3d-btn" onClick={onFocus} title="Fly the camera to this node">
            centre
          </button>
          <button
            type="button"
            className={`g3d-btn${isolated ? ' g3d-btn--on' : ''}`}
            onClick={onIsolate}
            title="Show only this node's neighbourhood"
          >
            isolate
          </button>
          <button type="button" className="g3d-btn" onClick={onClose}>
            clear
          </button>
        </div>
        <div style={{ marginTop: 8, color: theme.textMuted, fontSize: 10 }}>
          Shift-click a node in the graph to jump straight to it.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

const Graph3DView = forwardRef(function Graph3DView(props, ref) {
  injectGraph3dStyles();

  const {
    // data source
    apiUrl = DEFAULT_API_URL,
    data = null,
    endpoint = '/api/v1/graph/view',
    streamPath = '/api/v1/graph/stream',
    backends: backendsProp = ['local', 'neo4j'],
    merge = true,
    limit = 750,
    interval = 3000,
    live = true,
    focus = null,
    depth = null,
    // appearance
    theme: themeName = 'dark',
    palette = null,
    height = 560,
    className = '',
    style = {},
    nodeSize = 1,
    nodeResolution = 12,
    linkWidth = null,
    linkOpacity: linkOpacityProp = null,
    showLabels: showLabelsProp = null,
    showArrows: showArrowsProp = true,
    showParticles: showParticlesProp = null,
    labelBudget = 18,
    fog = true,
    // interaction
    showToolbar = true,
    showLegend = true,
    showDetails = true,
    enableShortcuts = true,
    neighborhoodDepth = 1,
    focusOnSelect = true,
    isolateOnSelect = false,
    maxNodes = 750,
    autoRotate = false,
    rotateSpeed = 0.6,
    fitOnLoad = true,
    physics = null,
    // content
    title = null,
    emptyMessage = 'Waiting for graph data…',
    // callbacks
    onNodeClick,
    onNodeSelect,
    onBackgroundClick,
    onError,
    onData,
  } = props;

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const colorOf = useCallback((label) => colorForLabel(label, palette), [palette]);

  const {
    nodes,
    links,
    stats,
    change,
    backends: backendStatus,
    status,
    error,
    lastUpdate,
    refresh,
  } = useGraphStream({
    apiUrl,
    data,
    endpoint,
    streamPath,
    backends: backendsProp,
    merge,
    limit,
    interval,
    live,
    focus,
    depth,
    onData,
    onError,
  });

  const fgRef = useRef(null);
  const wrapRef = useRef(null);
  const objectsRef = useRef(new Map()); // node id -> { mesh, sprite }
  const nodesRef = useRef([]);

  const [query, setQuery] = useState('');
  const [activeLabels, setActiveLabels] = useState(() => new Set());
  const [hiddenRels, setHiddenRels] = useState(() => new Set());
  const [activeBackends, setActiveBackends] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [isolated, setIsolated] = useState(false);
  const [showLabels, setShowLabels] = useState(showLabelsProp);
  const [showArrows, setShowArrows] = useState(showArrowsProp);
  const [showParticles, setShowParticles] = useState(showParticlesProp);
  const [autoRotateOn, setAutoRotateOn] = useState(autoRotate);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [flashIds, setFlashIds] = useState(() => new Set());
  const [flashLabels, setFlashLabels] = useState(null);
  const [toasts, setToasts] = useState([]);

  nodesRef.current = nodes;

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize((prev) => {
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        return prev.width === width && prev.height === height ? prev : { width, height };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Resolve `null` overrides from the theme once mounted.
  useEffect(() => {
    if (showLabelsProp == null) setShowLabels(theme.showLabelsByDefault);
  }, [showLabelsProp, theme.showLabelsByDefault]);
  useEffect(() => {
    if (showParticlesProp == null) setShowParticles(nodes.length <= 1200);
  }, [showParticlesProp, nodes.length]);

  /* -------------------------------------------------- live-change feedback */
  useEffect(() => {
    if (!change || (!change.addedCount && !change.updatedCount && !change.removedCount)) return undefined;
    const stamp = Date.now();
    const items = [];
    if (change.addedCount) items.push({ kind: 'add', text: `+${change.addedCount} node${change.addedCount > 1 ? 's' : ''}` });
    if (change.updatedCount) items.push({ kind: 'upd', text: `~${change.updatedCount} updated` });
    if (change.removedCount) items.push({ kind: 'upd', text: `-${change.removedCount} removed` });
    setToasts((prev) => [...items.map((i) => ({ ...i, id: `${stamp}-${i.text}` })), ...prev].slice(0, 3));
    setFlashIds(new Set(change.addedNodes.map((n) => n.id)));
    setFlashLabels(new Map(change.addedNodes.map((n) => [n.id, labelTextOf(n)])));
    const timer = setTimeout(() => {
      setFlashIds(new Set());
      setFlashLabels(null);
    }, FLASH_MS);
    const cleanup = setTimeout(() => setToasts([]), FLASH_MS + 1800);
    return () => {
      clearTimeout(timer);
      clearTimeout(cleanup);
    };
  }, [change]);

  /* -------------------------------------------------- derived graph views */
  const byLabel = useMemo(() => labelCounts(nodes), [nodes]);
  const byRel = useMemo(() => relationshipTypes(links), [links]);
  const availableBackends = useMemo(() => {
    const set = new Set();
    for (const node of nodes) {
      if (node.backend) set.add(node.backend);
      for (const backend of node.backends || []) set.add(backend);
    }
    return set;
  }, [nodes]);

  const filtered = useMemo(
    () =>
      filterGraph(nodes, links, {
        labels: activeLabels,
        relTypes: null,
        backends: activeBackends,
        query,
        hiddenRels,
      }),
    [nodes, links, activeLabels, activeBackends, query, hiddenRels],
  );

  const capped = useMemo(() => {
    if (filtered.nodes.length <= maxNodes) return filtered;
    const nodes = filtered.nodes.slice(0, maxNodes);
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      links: filtered.links.filter((link) => {
        const source = link.source?.id ?? link.source;
        const target = link.target?.id ?? link.target;
        return ids.has(source) && ids.has(target);
      }),
    };
  }, [filtered, maxNodes]);

  // Unconnected nodes have no spring to anchor them, so the charge force flings
  // them clear of the graph while the layout relaxes. Seed them near the
  // centroid of the connected nodes (with a little jitter) so they settle close
  // instead of orbiting far outside the graph.
  const layout = useMemo(() => {
    const deg = new Map();
    for (const n of capped.nodes) deg.set(n.id, 0);
    for (const l of capped.links) {
      const s = l.source?.id ?? l.source;
      const t = l.target?.id ?? l.target;
      if (!deg.has(s) || !deg.has(t)) continue;
      deg.set(s, deg.get(s) + 1);
      deg.set(t, deg.get(t) + 1);
    }
    let cx = 0; let cy = 0; let cz = 0; let count = 0;
    for (const n of capped.nodes) {
      if (!deg.get(n.id)) continue;
      cx += n.x ?? 0; cy += n.y ?? 0; cz += n.z ?? 0; count += 1;
    }
    if (count) { cx /= count; cy /= count; cz /= count; }
    let nodes = capped.nodes;
    const seed = () => {
      nodes = capped.nodes.map((n) => {
        if (!deg.get(n.id)) return n.x == null ? {
          ...n, x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 30, z: cz + (Math.random() - 0.5) * 30,
        } : n;
        return n;
      });
    };
    seed();
    return { nodes, links: capped.links };
  }, [capped]);

  const adjacency = useMemo(() => buildAdjacency(capped.nodes, capped.links), [capped]);

  const selectedNode = useMemo(
    () => capped.nodes.find((n) => n.id === selectedId) || null,
    [capped.nodes, selectedId],
  );

  const emphasis = useMemo(() => {
    if (selectedId) return neighborhood(adjacency, selectedId, neighborhoodDepth);
    if (hoveredId) return neighborhood(adjacency, hoveredId, 1);
    return null;
  }, [adjacency, selectedId, hoveredId, neighborhoodDepth]);

  const graphData = useMemo(() => {
    if (!isolated || !emphasis) return layout;
    const keep = new Set(emphasis);
    return {
      nodes: layout.nodes.filter((n) => keep.has(n.id)),
      links: layout.links.filter((link) => {
        const source = link.source?.id ?? link.source;
        const target = link.target?.id ?? link.target;
        return keep.has(source) && keep.has(target);
      }),
    };
  }, [layout, isolated, emphasis]);

  // Which nodes get a text label. Labelling everything is what makes a 3D graph
  // look like noise, so the default is a small, degree-ranked set plus whatever
  // the user is currently pointing at.
  const labelledIds = useMemo(() => {
    const keep = new Set();
    if (emphasis) for (const id of emphasis) keep.add(id);
    if (selectedId) keep.add(selectedId);
    if (hoveredId) keep.add(hoveredId);
    for (const id of flashIds) keep.add(id);
    const budget = Math.max(0, labelBudget);
    if (keep.size < budget) {
      const ranked = [...graphData.nodes]
        .filter((n) => !keep.has(n.id))
        .sort((a, b) => (b.degree || 0) - (a.degree || 0) || String(a.id).localeCompare(String(b.id)));
      for (const node of ranked) {
        if (keep.size >= budget) break;
        keep.add(node.id);
      }
    }
    return keep;
  }, [emphasis, selectedId, hoveredId, flashIds, labelBudget, graphData.nodes]);

  /* -------------------------------------------------- three.js plumbing */
  const emphasisRef = useRef(emphasis);
  const flashRef = useRef(flashIds);
  const flashLabelsRef = useRef(flashLabels);
  const themeRef = useRef(theme);
  const colorOfRef = useRef(colorOf);
  const sizeRef = useRef(nodeSize);
  const resolutionRef = useRef(nodeResolution);
  const showLabelsRef = useRef(showLabels);
  const labelledIdsRef = useRef(labelledIds);
  const graphDataRef = useRef(graphData);
  const selectedIdRef = useRef(selectedId);
  const hoveredIdRef = useRef(hoveredId);
  const viewportHeightRef = useRef(size.height);
  const sizeWidthRef = useRef(size.width);
  const settleTimerRef = useRef(null);
const engineHotRef = useRef(true);
const ppuRef = useRef(1);
const lastLinkWidthClassRef = useRef('');
const [bakeEpoch, setBakeEpoch] = useState(0);

  emphasisRef.current = emphasis;
  flashRef.current = flashIds;
  flashLabelsRef.current = flashLabels;
  themeRef.current = theme;
  colorOfRef.current = colorOf;
  sizeRef.current = nodeSize;
  resolutionRef.current = nodeResolution;
  showLabelsRef.current = showLabels;
  labelledIdsRef.current = labelledIds;
  graphDataRef.current = graphData;
  selectedIdRef.current = selectedId;
  hoveredIdRef.current = hoveredId;
  viewportHeightRef.current = size.height;
  sizeWidthRef.current = size.width;

  const shouldLabel = useCallback((node) => {
    if (!showLabelsRef.current) return false;
    return labelledIdsRef.current.has(node.id);
  }, []);

  const nodeThreeObject = useCallback((node) => {
    // Each node owns its geometry/material: force-graph disposes them when the
    // node leaves the graph, and shared instances would break the survivors.
    const geometry = new THREE.SphereGeometry(
      1,
      resolutionRef.current,
      Math.max(6, Math.round(resolutionRef.current * 0.75)),
    );
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorOfRef.current(node.label)),
      transparent: true,
      opacity: 1,
      emissive: new THREE.Color('#000000'),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(sizeForNode(node, { scale: sizeRef.current }));
    objectsRef.current.set(node.id, { mesh, sprite: null });
    return mesh;
  }, []);

  /**
   * Push selection / hover / flash / sizing state onto the existing three
   * objects. Never rebuilds the scene, so live updates stay cheap.
   *
   * Reads everything from refs so the same function can run from a React effect
   * (state changed) and from the animation loop (layout still moving).
   */
  const applyVisualState = useCallback(() => {
    const objects = objectsRef.current;
    const graph = graphDataRef.current;
    const current = emphasisRef.current;
    const selected = selectedIdRef.current;
    const hovered = hoveredIdRef.current;
    const palette = themeRef.current;
    const now = performance.now();
    const fg = fgRef.current;
    const camera = fg?.camera?.();
    const controls = fg?.controls?.();
    const viewport = viewportHeightRef.current;
    const viewWidth = sizeWidthRef.current;
    const distance = Math.max(1, camera
      ? (controls?.target
        ? camera.position.distanceTo(controls.target)
        : camera.position.length())
      : 1000);
    // Depth cue that survives any zoom: the far side of the graph is always
    // faded by the same amount, instead of everything turning into fog when
    // the camera pulls back.
    const fog = fg?.scene?.()?.fog;
    if (fog?.isFogExp2) fog.density = FOG_STRENGTH / distance;
    // How many world units make up one screen pixel at the current zoom.
    const pixelsPerUnit = Math.max(
      1e-4,
      (viewport || 600) / 2
        / (Math.tan(((camera?.fov || 50) * Math.PI) / 360) * distance),
    );
    ppuRef.current = pixelsPerUnit;
    // Link cylinders bake their radius into the geometry at creation, so
    // re-derive them (at a coarse world-width granularity) while the camera
    // is moving instead of every frame.
    const widthClass = [LINK_WIDTH_FOCUS_PX, LINK_WIDTH_PX, LINK_WIDTH_DIM_PX]
      .map((px) => Math.ceil((px / pixelsPerUnit) * 10))
      .join(',');
    if (widthClass !== lastLinkWidthClassRef.current) {
      lastLinkWidthClassRef.current = widthClass;
      setBakeEpoch((epoch) => epoch + 1);
    }
    const labelled = [];

    for (const node of graph.nodes) {
      const entry = objects.get(node.id);
      if (!entry) continue;
      const { mesh } = entry;
      let sprite = entry.sprite;
      const isSelected = node.id === selected;
      const isHovered = node.id === hovered;
      const inEmphasis = !current || current.has(node.id);
      const baseColor = new THREE.Color(colorOfRef.current(node.label));
      const fresh = flashRef.current.has(node.id);

      mesh.material.color.copy(
        isSelected ? new THREE.Color(palette.nodeSelected)
          : fresh ? new THREE.Color(palette.nodeNew)
            : isHovered ? new THREE.Color(palette.hover)
              : baseColor,
      );
      mesh.material.opacity = inEmphasis ? 1 : palette.dimOpacity;
      mesh.material.emissive.copy(
        new THREE.Color(isSelected || fresh || isHovered ? baseColor : '#000000').multiplyScalar(0.45),
      );

      // Degree drives the rank in a 3px..9px on-screen radius range.
      const rank = Math.min(1, Math.max(0, (sizeForNode(node) - 1.7) / 4.7));
      const radiusPx = (3.2 + 6.2 * rank) * sizeRef.current
        * (isSelected ? 1.4 : fresh ? 1.1 + Math.sin(now / 130) * 0.08 : 1);
      const wanted = radiusPx / pixelsPerUnit;
      // Snap while idle, ease only while something is animating.
      mesh.scale.setScalar(
        isSelected || fresh ? mesh.scale.x + (wanted - mesh.scale.x) * 0.25 : wanted,
      );

      const wantedLabel = shouldLabel(node);
      if (wantedLabel && !sprite) {
        sprite = makeLabelSprite(
          flashLabelsRef.current?.get(node.id) || labelTextOf(node),
          isSelected ? palette.nodeSelected : baseColor.getStyle(),
          palette,
        );
        mesh.add(sprite);
        objects.set(node.id, { mesh, sprite });
      } else if (!wantedLabel && sprite) {
        mesh.remove(sprite);
        sprite.material.map?.dispose();
        sprite.material.dispose();
        objects.set(node.id, { mesh, sprite: null });
        sprite = null;
      }
      if (sprite) {
        sprite.material.opacity = inEmphasis ? palette.labelOpacity : palette.dimOpacity * 2;
        updateLabelScale(sprite, viewport, mesh.scale.x);
        labelled.push({ mesh, sprite, radiusPx, priority: (isSelected || isHovered || fresh ? 1e6 : 0) + (node.degree || 0) });
      }
    }

    placeLabels(labelled, camera, viewport, viewWidth);
  }, [shouldLabel]);

  // One lightweight frame loop. Node radii and label sizes are pinned to screen
  // pixels, so anything that moves the camera or the layout needs a fresh
  // measurement; the early-out keeps it idle when nothing is happening.
  useEffect(() => {
    const last = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, sig: 0 };
    let seen = false;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const camera = fgRef.current?.camera?.();
      const target = fgRef.current?.controls?.()?.target;
      let moved = false;
      if (camera && target) {
        const p = camera.position;
        moved = !seen
          || Math.abs(p.x - last.x) > 1e-3
          || Math.abs(p.y - last.y) > 1e-3
          || Math.abs(p.z - last.z) > 1e-3
          || Math.abs(target.x - last.tx) > 1e-3
          || Math.abs(target.y - last.ty) > 1e-3
          || Math.abs(target.z - last.tz) > 1e-3;
        if (moved) {
          seen = true;
          last.x = p.x; last.y = p.y; last.z = p.z;
          last.tx = target.x; last.ty = target.y; last.tz = target.z;
        }
      }
      if (!moved && seen && objectsRef.current.size) {
        let sig = 0;
        for (const { mesh } of objectsRef.current.values()) {
          sig += mesh.position.x + mesh.position.y + mesh.position.z;
        }
        if (Math.abs(sig - last.sig) > 1e-4) {
          moved = true;
          last.sig = sig;
        }
      }
      if (moved
        || engineHotRef.current
        || flashRef.current.size > 0
        || selectedIdRef.current
        || hoveredIdRef.current) {
        applyVisualState();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyVisualState]);

  useEffect(() => {
    const live = new Set(graphData.nodes.map((n) => n.id));
    for (const id of [...objectsRef.current.keys()]) {
      if (!live.has(id)) objectsRef.current.delete(id);
    }
    applyVisualState();
  }, [applyVisualState, graphData, selectedId, hoveredId, emphasis, flashIds, flashLabels, showLabels, labelledIds, size.height]);

  // Screen-sized labels only need re-measuring when the viewport changes.
  useEffect(() => {
    for (const { mesh, sprite } of objectsRef.current.values()) {
      if (sprite) updateLabelScale(sprite, size.height, mesh.scale.x);
    }
  }, [size.height, labelledIds, selectedId]);

  // Release GPU resources for nodes that disappeared.
  useEffect(
    () => () => {
      for (const { mesh } of objectsRef.current.values()) {
        mesh.geometry?.dispose();
        mesh.material?.dispose();
      }
      objectsRef.current.clear();
    },
    [],
  );

  /* -------------------------------------------------- link colouring */
  const emphasisKey = `${selectedId || ''}|${isolated}|${[...hiddenRels].sort().join(',')}|${flashIds.size}`;
  const linkColor = useCallback(
    (link) => {
      const focusSet = emphasisRef.current;
      const source = link.source?.id ?? link.source;
      const target = link.target?.id ?? link.target;
      if (selectedId && focusSet && !(focusSet.has(source) || focusSet.has(target))) {
        return theme.linkDim;
      }
      return focusSet ? theme.linkHighlight : theme.link;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emphasisKey, theme.link, theme.linkDim, theme.linkHighlight, selectedId],
  );

  const linkWidthAccessor = useCallback(
    (link) => {
      const focusSet = emphasisRef.current;
      const source = link.source?.id ?? link.source;
      const target = link.target?.id ?? link.target;
      if (typeof linkWidth === 'number') {
        if (!focusSet) return linkWidth;
        const touches = focusSet.has(source) || focusSet.has(target);
        return touches ? linkWidth * 2.2 : linkWidth * 0.4;
      }
      const ppu = Math.max(1e-4, ppuRef.current);
      if (!focusSet) return LINK_WIDTH_PX / ppu;
      const touches = focusSet.has(source) || focusSet.has(target);
      return touches ? LINK_WIDTH_FOCUS_PX / ppu : LINK_WIDTH_DIM_PX / ppu;
    },
    [emphasisKey, linkWidth, bakeEpoch],
  );

  const linkDirectionalArrowLength = showArrows ? ARROW_LENGTH_PX / Math.max(1e-4, ppuRef.current) : 0;
  const linkDirectionalArrowRelPos = 0.94;

  const linkDirectionalParticles = useMemo(() => {
    if (!showParticles) return 0;
    if (graphData.links.length > 1500) return 0;
    const focusSet = emphasisRef.current;
    return focusSet ? 1 : 0.35;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emphasisKey, showParticles, graphData.links.length]);

  /* -------------------------------------------------- camera + physics */
  const zoomToFit = useCallback((duration = 500) => {
    fitCameraToGraph(fgRef.current, capped.nodes, duration);
  }, [capped.nodes]);

  const centerOn = useCallback((nodeOrId, duration = 700) => {
    const fg = fgRef.current;
    if (!fg) return;
    const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId?.id;
    const node = typeof nodeOrId === 'object' ? nodeOrId : capped.nodes.find((n) => n.id === id);
    if (!node || node.x == null) return;
    const focus = new THREE.Vector3(node.x, node.y || 0, node.z || 0);
    const camera = fg.camera?.();
    const controls = fg.controls?.();
    // Keep the current orbit direction and distance, only re-aim at the node.
    const offset = camera && controls
      ? camera.position.clone().sub(controls.target)
      : new THREE.Vector3(0, 0, 240);
    const next = focus.clone().add(offset);
    fg.cameraPosition?.(
      { x: next.x, y: next.y, z: next.z },
      { x: focus.x, y: focus.y, z: focus.z },
      duration,
    );
  }, [capped.nodes]);

  const resetCamera = useCallback((duration = 400) => {
    const fg = fgRef.current;
    if (!fg) return;
    const distance = Math.max(160, graphData.nodes.length * 12);
    fg.cameraPosition?.(
      { x: distance * 0.6, y: distance * 0.5, z: distance },
      { x: 0, y: 0, z: 0 },
      duration,
    );
  }, [graphData.nodes.length]);

  const getRenderStats = useCallback(() => {
    const scene = fgRef.current?.scene?.();
    if (!scene) return null;
    const objects = {};
    scene.traverse((object) => {
      objects[object.type] = (objects[object.type] || 0) + 1;
    });
    return {
      nodes: capped.nodes.length,
      links: capped.links.length,
      objects,
      camera: fgRef.current?.cameraPosition?.() || null,
    };
  }, [capped]);

  useImperativeHandle(ref, () => ({
    zoomToFit,
    centerOn,
    resetCamera,
    refresh,
    fit: zoomToFit,
    getGraph: () => ({ nodes: capped.nodes, links: capped.links }),
    getRenderStats,
    getState: () => ({
      status,
      selected: selectedId,
      hovered: hoveredId,
      isolated,
      query,
      emphasis: emphasis ? Array.from(emphasis) : null,
      stats: change?.stats || null,
    }),
    select: (id) => setSelectedId(id),
    clearSelection: () => setSelectedId(null),
    forceGraph: () => fgRef.current,
  }), [zoomToFit, centerOn, resetCamera, refresh, capped, getRenderStats, status, selectedId, hoveredId, isolated, query, emphasis, change]);

  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const apply = () => {
      const controls = fgRef.current?.controls?.();
      if (controls && 'autoRotate' in controls) {
        controls.autoRotate = autoRotateOn;
        controls.autoRotateSpeed = rotateSpeed;
        return;
      }
      if (tries < 90) {
        tries += 1;
        raf = requestAnimationFrame(apply);
      }
    };
    apply();
    return () => cancelAnimationFrame(raf);
  }, [autoRotateOn, rotateSpeed]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !physics) return;
    const { linkDistance, chargeStrength, linkStrength, centerStrength } = physics;
    if (linkDistance != null) fg.d3Force?.('link')?.distance(linkDistance);
    if (linkStrength != null) fg.d3Force?.('link')?.strength(linkStrength);
    if (chargeStrength != null) fg.d3Force?.('charge')?.strength(chargeStrength);
    if (centerStrength != null) fg.d3Force?.('center')?.strength(centerStrength);
    fg.d3ReheatSimulation?.();
  }, [physics, size.width]);

  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const apply = () => {
      const scene = fgRef.current?.scene?.();
      if (scene) {
        // Density is re-derived from the camera distance on every frame.
        scene.fog = fog ? new THREE.FogExp2(new THREE.Color(theme.background), FOG_STRENGTH / 1000) : null;
        return;
      }
      if (tries < 90) {
        tries += 1;
        raf = requestAnimationFrame(apply);
      }
    };
    apply();
    return () => cancelAnimationFrame(raf);
  }, [fog, theme.background]);

  // Frame the graph once, right after the opening layout settles: the scene is
  // readable on load without fighting the camera afterwards.
  const fittedRef = useRef(false);
  const handleEngineStop = useCallback(() => {
    engineHotRef.current = false;
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => applyVisualState(), 100);
    if (!fitOnLoad || fittedRef.current) return;
    if (!graphDataRef.current.nodes.length) return;
    fittedRef.current = true;
    requestAnimationFrame(() => {
      fitCameraToGraph(fgRef.current, graphDataRef.current.nodes, 700);
      setTimeout(() => applyVisualState(), 760);
    });
  }, [fitOnLoad, applyVisualState]);

  /* -------------------------------------------------- selection handlers */
  const handleNodeClick = useCallback(
    (node, event) => {
      const next = node.id === selectedId && !event?.shiftKey ? null : node.id;
      setSelectedId(next);
      if (next) {
        if (isolateOnSelect) setIsolated(true);
        if (focusOnSelect) requestAnimationFrame(() => centerOn(node));
      }
      onNodeClick?.(node, event);
      onNodeSelect?.(next ? node : null);
    },
    [selectedId, centerOn, focusOnSelect, isolateOnSelect, onNodeClick, onNodeSelect],
  );

  const handleNodeHover = useCallback((node) => {
    setHoveredId(node?.id || null);
  }, []);

  const handleBackgroundClick = useCallback((event) => {
    setSelectedId(null);
    if (isolated) setIsolated(false);
    onBackgroundClick?.(event);
  }, [isolated, onBackgroundClick]);

  /* -------------------------------------------------- keyboard */
  const onKeyDown = useCallback((event) => {
    if (!enableShortcuts) return;
    const target = event.target;
    const tag = target?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
    if (typing && event.key !== 'Escape') return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      setSelectedId(null);
      setIsolated(false);
      if (typing) target.blur();
    } else if (key === 'f') {
      zoomToFit();
    } else if (key === 'r') {
      resetCamera();
    } else if (key === 'l') {
      setShowLabels((value) => !value);
    } else if (key === 'a') {
      setShowArrows((value) => !value);
    } else if (key === '/') {
      event.preventDefault();
      wrapRef.current?.querySelector('.g3d-input')?.focus();
    }
  }, [zoomToFit, resetCamera, enableShortcuts]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  /* -------------------------------------------------- toolbar actions */
  const toggleLabel = useCallback((label) => {
    setActiveLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const toggleRel = useCallback((type) => {
    setHiddenRels((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const toggleBackend = useCallback((backend) => {
    setActiveBackends((prev) => {
      const next = new Set(prev);
      if (next.has(backend)) next.delete(backend);
      else next.add(backend);
      return next;
    });
  }, []);

  const searchHits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return capped.nodes.filter((node) => {
      const haystack = `${node.id} ${node.name || ''} ${node.label || ''}`.toLowerCase();
      return haystack.includes(needle);
    }).slice(0, 6);
  }, [query, capped.nodes]);

  const loading = (status === 'connecting' || status === 'polling') && !nodes.length;
  const backendList = Object.entries(backendStatus || {});

  const rootStyle = {
    ...themeCssVars(theme),
    height,
    ...style,
  };

  return (
    <div
      className={`g3d ${className}`.trim()}
      style={rootStyle}
      role="application"
      aria-label="3D knowledge graph"
    >
      {showToolbar ? (
        <div className="g3d-toolbar">
          {title ? <span className="g3d-label">{title}</span> : null}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              className="g3d-input"
              type="search"
              value={query}
              placeholder="Search nodes…  ( / )"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search nodes"
            />
            {searchHits.length ? (
              <div
                className="g3d-panel"
                style={{ position: 'absolute', top: 32, left: 0, right: 0, width: 'auto', maxHeight: 220 }}
              >
                <div className="g3d-panel-body" style={{ padding: 4 }}>
                  {searchHits.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      className="g3d-btn"
                      style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 2 }}
                      onClick={() => {
                        setQuery('');
                        setSelectedId(node.id);
                        centerOn(node);
                      }}
                    >
                      <span className="g3d-dot" style={{ background: colorOf(node.label) }} />
                      {labelTextOf(node)}
                      <span className="g3d-spacer" />
                      <span className="g3d-chip-count">{node.degree}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <span className="g3d-badge">{nodes.length} nodes</span>
          <span className="g3d-badge">{links.length} links</span>

          <span className="g3d-spacer" />

          <div className="g3d-group">
            <button
              type="button"
              className={`g3d-btn${showLabels ? ' g3d-btn--on' : ''}`}
              aria-pressed={showLabels}
              onClick={() => setShowLabels((v) => !v)}
              title="Toggle node labels (L)"
            >
              labels
            </button>
            <button
              type="button"
              className={`g3d-btn${showArrows ? ' g3d-btn--on' : ''}`}
              aria-pressed={showArrows}
              onClick={() => setShowArrows((v) => !v)}
              title="Show relationship direction"
            >
              arrows
            </button>
            <button
              type="button"
              className={`g3d-btn${autoRotateOn ? ' g3d-btn--on' : ''}`}
              aria-pressed={autoRotateOn}
              onClick={() => setAutoRotateOn((v) => !v)}
              title="Auto-rotate the camera"
            >
              spin
            </button>
            <button type="button" className="g3d-btn" onClick={() => zoomToFit()} title="Fit graph to view (F)">
              fit
            </button>
            <button type="button" className="g3d-btn" onClick={resetCamera} title="Reset camera (R)">
              reset
            </button>
            <StatusPill status={status} backends={backendStatus} lastUpdate={lastUpdate} onRefresh={refresh} />
          </div>
        </div>
      ) : null}

      {showToolbar && availableBackends.size > 1 ? (
        <div className="g3d-chip-scroll">
          <span className="g3d-label" style={{ alignSelf: 'center', marginRight: 2 }}>source</span>
          {Array.from(availableBackends).map((backend) => (
            <button
              key={backend}
              type="button"
              className="g3d-chip"
              aria-pressed={!activeBackends.size || activeBackends.has(backend)}
              onClick={() => toggleBackend(backend)}
              title={backendStatus?.[backend]}
            >
              <span
                className="g3d-dot"
                style={{ background: backend === 'neo4j' ? '#4f9dff' : '#5fd08a' }}
              />
              {backend}
            </button>
          ))}
          <span className="g3d-spacer" />
          <span className="g3d-label" style={{ alignSelf: 'center', marginRight: 2 }}>labels</span>
          {Object.entries(byLabel)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => (
              <button
                key={label}
                type="button"
                className="g3d-chip"
                aria-pressed={!activeLabels.size || activeLabels.has(label)}
                onClick={() => toggleLabel(label)}
              >
                <span className="g3d-dot" style={{ background: colorOf(label) }} />
                {label}
                <span className="g3d-chip-count">{count}</span>
              </button>
            ))}
        </div>
      ) : null}

      <div
        className="g3d-canvas"
        ref={wrapRef}
        tabIndex={0}
        aria-label="Graph canvas"
      >
        {size.width > 0 ? (
          <ForceGraph3D
            ref={fgRef}
            controlType="orbit"
            width={size.width}
            height={size.height}
            showNavInfo={false}
            graphData={graphData}
          backgroundColor={theme.background}
          nodeId="id"
          nodeThreeObject={nodeThreeObject}
          nodeLabel={(node) => tooltipHtml(node, theme)}
          linkLabel={(link) => {
            const source = link.source?.id ?? link.source;
            const target = link.target?.id ?? link.target;
            return `<b>${escapeHtml(link.type || 'RELATED')}</b><br/>${escapeHtml(String(source))} → ${escapeHtml(String(target))}`;
          }}
          linkColor={linkColor}
          linkWidth={linkWidthAccessor}
          linkOpacity={linkOpacityProp ?? theme.linkOpacity}
          linkResolution={2}
          linkDirectionalArrowLength={linkDirectionalArrowLength}
          linkDirectionalArrowRelPos={linkDirectionalArrowRelPos}
          linkDirectionalArrowColor={() => theme.link}
          linkDirectionalArrowResolution={4}
          linkDirectionalParticles={linkDirectionalParticles}
          linkDirectionalParticleWidth={1.6}
          linkDirectionalParticleSpeed={0.008}
          linkDirectionalParticleColor={() => theme.accent}
          nodeOpacity={1}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onBackgroundClick={handleBackgroundClick}
          onEngineStop={handleEngineStop}
          enableNodeDrag
          d3AlphaDecay={0.022}
          d3VelocityDecay={0.32}
          warmupTicks={40}
          cooldownTime={9000}
          enablePointerInteraction
          />
        ) : null}

        {showLegend && Object.keys(byRel).length ? (
          <div className="g3d-legend">
            <span className="g3d-label">relationships</span>
            {Object.entries(byRel)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 14)
              .map(([type, count]) => (
                <button
                  key={type}
                  type="button"
                  className="g3d-legend-item"
                  style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                  onClick={() => toggleRel(type)}
                  title={`Click to ${hiddenRels.has(type) ? 'show' : 'hide'} ${type}`}
                >
                  <span
                    className="g3d-dot"
                    style={{ background: hiddenRels.has(type) ? 'transparent' : theme.link, border: `1px solid ${theme.link}` }}
                  />
                  <span className={`g3d-legend-name${hiddenRels.has(type) ? '' : ' g3d-legend-name--on'}`} style={{ opacity: hiddenRels.has(type) ? 0.45 : 1 }}>
                    {type}
                  </span>
                  <span className="g3d-spacer" />
                  <span className="g3d-chip-count">{count}</span>
                </button>
              ))}
          </div>
        ) : null}

        {showDetails ? (
          <DetailsPanel
            node={selectedNode}
            links={capped.links}
            theme={theme}
            isolated={isolated}
            onClose={() => {
              setSelectedId(null);
              if (isolated) setIsolated(false);
            }}
            onIsolate={() => setIsolated((v) => !v)}
            onFocus={() => centerOn(selectedNode)}
          />
        ) : null}

        {toasts.length ? (
          <div className="g3d-activity">
            {toasts.map((toast) => (
              <span key={toast.id} className={`g3d-toast g3d-toast--${toast.kind}`}>
                {toast.text}
              </span>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="g3d-overlay">
            <div className="g3d-spinner" />
            <div className="g3d-overlay-title">Loading knowledge graph</div>
            <div className="g3d-overlay-text">{apiUrl}</div>
          </div>
        ) : null}

        {!loading && !graphData.nodes.length ? (
          <div className="g3d-overlay">
            <div className="g3d-overlay-title">{error ? 'Graph unavailable' : emptyMessage}</div>
            {error ? <div className="g3d-overlay-text">{error}</div> : null}
            {backendList.length ? (
              <div className="g3d-overlay-text">
                {backendList.map(([name, value]) => `${name}: ${value}`).join(' · ')}
              </div>
            ) : null}
            <button type="button" className="g3d-btn" onClick={refresh}>
              retry
            </button>
          </div>
        ) : null}

        {error && graphData.nodes.length ? (
          <div className="g3d-toast g3d-toast--err" style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' }}>
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function themeCssVars(theme) {
  return {
    '--g3d-bg': theme.background,
    '--g3d-panel': theme.panel,
    '--g3d-border': theme.panelBorder,
    '--g3d-text': theme.text,
    '--g3d-muted': theme.textMuted,
    '--g3d-accent': theme.accent,
    '--g3d-ok': theme.ok,
    '--g3d-warn': theme.warn,
    '--g3d-danger': theme.danger,
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tooltipHtml(node, theme) {
  const backends = (node.backends || [node.backend]).filter(Boolean).join(' + ');
  const summary = Object.entries(node.props || {})
    .slice(0, 4)
    .map(([key, value]) => `<div class="g3d-tooltip-row"><span>${escapeHtml(key)}</span><span>${escapeHtml(
      typeof value === 'object' ? JSON.stringify(value) : String(value).slice(0, 70),
    )}</span></div>`)
    .join('');
  return `<div class="g3d-tooltip-title">${escapeHtml(labelTextOf(node))}</div>`
    + `<div class="g3d-tooltip-meta">${escapeHtml(node.label || 'Unknown')} · ${node.degree ?? 0} links${backends ? ` · ${escapeHtml(backends)}` : ''}</div>`
    + summary;
}

export default Graph3DView;
export { Graph3DView };





