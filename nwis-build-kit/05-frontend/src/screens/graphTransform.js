/**
 * Pure helpers that turn live stream messages into renderable graph data.
 *
 * Node and link objects are mutated in place and kept in stable Maps so that
 * the force simulation can retain the 3D position of every node across an
 * update - new data must never make the whole graph jump.
 */

export const EMPTY_GRAPH = { nodes: [], links: [] };

function linkKey(link) {
  const source = typeof link.source === 'object' ? link.source.id : link.source;
  const target = typeof link.target === 'object' ? link.target.id : link.target;
  return `${source}|${target}|${link.type || 'RELATED'}`;
}

export function createGraphStore() {
  return { nodes: new Map(), links: new Map() };
}

function upsertNode(store, incoming) {
  const existing = store.nodes.get(incoming.id);
  if (!existing) {
    const node = { ...incoming };
    store.nodes.set(node.id, node);
    return { node, isNew: true };
  }
  // Keep the layout coordinates the simulation owns; refresh everything else.
  for (const key of Object.keys(incoming)) {
    if (key !== 'x' && key !== 'y' && key !== 'z' && key !== 'vx' && key !== 'vy' && key !== 'vz') {
      existing[key] = incoming[key];
    }
  }
  return { node: existing, isNew: false };
}

function upsertLink(store, incoming, nodes) {
  const key = linkKey(incoming);
  const source = nodes.get(typeof incoming.source === 'object' ? incoming.source.id : incoming.source);
  const target = nodes.get(typeof incoming.target === 'object' ? incoming.target.id : incoming.target);
  if (!source || !target) return { isNew: false };

  const existing = store.links.get(key);
  const payload = { ...incoming, source, target };
  if (existing) {
    existing.source = source;
    existing.target = target;
    existing.type = payload.type;
    existing.props = payload.props;
    existing.backends = payload.backends;
    return { isNew: false };
  }
  store.links.set(key, payload);
  return { isNew: true };
}

/** Apply a `snapshot` message: replaces the graph wholesale. */
export function applySnapshot(store, message) {
  store.nodes = new Map();
  store.links = new Map();
  for (const node of message.nodes || []) upsertNode(store, node);
  for (const link of message.links || []) upsertLink(store, link, store.nodes);
  return summarizeChange(store, [], [], 0);
}

/** Apply a `delta` message: adds, refreshes and removes in place. */
export function applyDelta(store, message) {
  const addedNodes = [];
  const touchedNodes = [];
  for (const node of message.addedNodes || []) {
    const { node: live, isNew } = upsertNode(store, node);
    (isNew ? addedNodes : touchedNodes).push(live);
  }
  for (const node of message.updatedNodes || []) {
    const { node: live } = upsertNode(store, node);
    touchedNodes.push(live);
  }
  for (const id of message.removedNodes || []) store.nodes.delete(id);

  for (const link of message.addedLinks || []) upsertLink(store, link, store.nodes);
  for (const key of message.removedLinks || []) store.links.delete(key);

  // Drop links whose endpoints were removed.
  for (const [key, link] of store.links) {
    if (!store.nodes.has(link.source?.id) || !store.nodes.has(link.target?.id)) {
      store.links.delete(key);
    }
  }

  return summarizeChange(store, addedNodes, touchedNodes, (message.removedNodes || []).length);
}

function summarizeChange(store, addedNodes, updatedNodes, removedNodes) {
  const degrees = new Map();
  for (const link of store.links.values()) {
    const source = link.source?.id;
    const target = link.target?.id;
    degrees.set(source, (degrees.get(source) || 0) + 1);
    degrees.set(target, (degrees.get(target) || 0) + 1);
  }
  for (const node of store.nodes.values()) node.degree = degrees.get(node.id) || 0;

  const addedIds = new Set(addedNodes.map((n) => n.id));
  return {
    nodes: Array.from(store.nodes.values()),
    links: Array.from(store.links.values()),
    stats: {
      nodes: store.nodes.size,
      relationships: store.links.size,
      byLabel: countBy(store.nodes.values(), (n) => n.label || 'Unknown'),
      byRelationship: countBy(store.links.values(), (l) => l.type || 'RELATED'),
    },
    change: {
      addedNodes,
      addedCount: addedNodes.length,
      updatedCount: updatedNodes.length,
      removedCount: removedNodes,
      addedIds,
    },
  };
}

function countBy(items, keyOf) {
  const out = {};
  for (const item of items) {
    const key = keyOf(item) || 'Unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

export function degreesOf(nodes, links) {
  const degrees = new Map();
  for (const node of nodes) degrees.set(node.id, 0);
  for (const link of links) {
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;
    if (degrees.has(source)) degrees.set(source, degrees.get(source) + 1);
    if (degrees.has(target)) degrees.set(target, degrees.get(target) + 1);
  }
  return degrees;
}

/** Undirected adjacency map, used for hover/select neighbourhood highlighting. */
export function buildAdjacency(nodes, links) {
  const adjacency = new Map();
  for (const node of nodes) adjacency.set(node.id, new Set());
  for (const link of links) {
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;
    if (!adjacency.has(source) || !adjacency.has(target)) continue;
    adjacency.get(source).add(target);
    adjacency.get(target).add(source);
  }
  return adjacency;
}

/** Node ids within `depth` hops of `rootId` (root included). */
export function neighborhood(adjacency, rootId, depth = 1) {
  if (!rootId || !adjacency.has(rootId)) return new Set();
  const seen = new Set([rootId]);
  let frontier = [rootId];
  for (let hop = 0; hop < depth; hop += 1) {
    const next = [];
    for (const id of frontier) {
      for (const neighbour of adjacency.get(id) || []) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour);
          next.push(neighbour);
        }
      }
    }
    frontier = next;
    if (!next.length) break;
  }
  return seen;
}

export function matchesQuery(node, query) {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (String(node.id).toLowerCase().includes(needle)) return true;
  if (String(node.name || '').toLowerCase().includes(needle)) return true;
  if (String(node.label || '').toLowerCase().includes(needle)) return true;
  const props = node.props || {};
  for (const value of Object.values(props)) {
    if (typeof value === 'string' && value.toLowerCase().includes(needle)) return true;
  }
  return false;
}

function nodeMatches(node, { labels, relTypes, backends, query }) {
  if (labels && labels.size && !labels.has(node.label)) return false;
  if (backends && backends.size) {
    const list = node.backends || [node.backend].filter(Boolean);
    if (!list.some((b) => backends.has(b))) return false;
  }
  return matchesQuery(node, query);
}

function linkMatches(link, visibleIds) {
  const source = typeof link.source === 'object' ? link.source.id : link.source;
  const target = typeof link.target === 'object' ? link.target.id : link.target;
  if (!visibleIds.has(source) || !visibleIds.has(target)) return false;
  return true;
}

/**
 * Apply label / relationship / backend / search filters.
 * `hiddenRels` is a Set of relationship types to hide entirely.
 */
export function filterGraph(nodes, links, filters = {}) {
  const { labels, relTypes, backends, query, hiddenRels } = filters;
  const visibleNodes = nodes.filter((node) => nodeMatches(node, { labels, backends, query }));
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleLinks = links.filter((link) => {
    if (hiddenRels && hiddenRels.size && hiddenRels.has(link.type)) return false;
    if (relTypes && relTypes.size && !relTypes.has(link.type)) return false;
    return linkMatches(link, visibleIds);
  });
  return { nodes: visibleNodes, links: visibleLinks };
}

/** All relationship types present, with counts, busiest first. */
export function relationshipTypes(links) {
  return countBy(links, (l) => l.type || 'RELATED');
}

export function labelCounts(nodes) {
  return countBy(nodes, (n) => n.label || 'Unknown');
}
