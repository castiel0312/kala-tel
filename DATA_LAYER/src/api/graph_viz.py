"""Normalised graph snapshots for the interactive 3D viewer.

Both knowledge-graph backends (the offline NetworkX store and Neo4j) are read
here and reduced to one payload shape, so the browser only ever deals with a
single graph model:

    {
      "backends": {"local": "connected (42 nodes, 61 rels)", "neo4j": "..."},
      "nodes":   [{"id", "entityId", "label", "backends", "props", "hash", "degree"}],
      "links":   [{"source", "target", "type", "backends", "props", "key"}],
      "stats":   {...},
      "ts":      1730000000.0
    }

``diff_snapshots`` compares two of those payloads and returns only what changed
(added / updated / removed nodes and links) which is what the WebSocket stream
pushes to the client on every tick.

Entity ids are namespaced per backend so a node present in both stores stays
distinguishable; when ``merge_backends`` is on they collapse into a single node
that lists every backend it came from.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

logger = logging.getLogger(__name__)

BACKENDS = ("local", "neo4j")

# Neo4j internal bookkeeping labels are noise in a visualisation.
INTERNAL_LABELS = ("__node__", "__relationship__", "__entity__")

# Property values are clipped so one huge text blob cannot bloat every tick.
MAX_VALUE_CHARS = 240
MAX_PROPS_PER_NODE = 40

DEFAULT_LIMIT = 750
MAX_LIMIT = 5000
MIN_INTERVAL = 0.5
MAX_INTERVAL = 60.0


# ----------------------------------------------------------------------------
# value / identity helpers
# ----------------------------------------------------------------------------
def _clip(value: Any) -> Any:
    """Make a value JSON-safe and small enough to ship on every tick."""
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value if len(value) <= MAX_VALUE_CHARS else value[:MAX_VALUE_CHARS] + "…"
    if isinstance(value, (list, tuple)):
        return [_clip(item) for item in list(value)[:10]]
    if isinstance(value, dict):
        return {str(k): _clip(v) for k, v in list(value.items())[:10]}
    if isinstance(value, (bytes, bytearray, memoryview)):
        return f"<{len(bytes(value))} bytes>"
    return str(value)[:MAX_VALUE_CHARS]


def _props(raw: Dict[str, Any], drop: Sequence[str] = ()) -> Dict[str, Any]:
    return {
        str(key): _clip(value)
        for key, value in list(raw.items())[:MAX_PROPS_PER_NODE]
        if key not in drop
    }


def _primary_label(labels: Iterable[str]) -> str:
    names = [str(name) for name in labels if str(name) not in INTERNAL_LABELS]
    if not names:
        return "Unknown"
    # Prefer the first label; multi-label nodes (e.g. MudLoss + OperationalEvent)
    # read better under their most specific name.
    return names[0]


def _digest(payload: Any) -> str:
    return hashlib.sha1(
        json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()[:12]


def _display_name(label: str, props: Dict[str, Any], entity_id: str) -> str:
    """Best human label for a node, matched to how each backend names things."""
    for key in (
        "well_code", "formation_code", "event_code", "lesson", "title", "name",
        "well_name", "formation_name", "event_type", "description",
    ):
        value = props.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()[:60]
    return entity_id


# ----------------------------------------------------------------------------
# per-backend reads
# ----------------------------------------------------------------------------
def _local_nodes(store, limit: int, focus: Optional[str], depth: Optional[int]) -> List[Dict[str, Any]]:
    if focus and depth and hasattr(store.graph, "ego_graph"):
        try:
            subgraph = store.graph.ego_graph(focus, radius=int(depth))
            node_ids = list(subgraph.nodes)
        except Exception:  # unknown focus id -> fall back to the whole graph
            node_ids = list(store.graph.nodes)
    else:
        node_ids = list(store.graph.nodes)

    if focus and not depth:
        node_ids = [focus] if store.graph.has_node(focus) else node_ids

    out: List[Dict[str, Any]] = []
    for entity_id in node_ids[:limit]:
        data = store.graph.nodes[entity_id]
        props = _props(data, drop=("label", "entity_id", "id"))
        label = str(data.get("label") or _primary_label(props.keys()))
        out.append({
            "id": f"local:{entity_id}",
            "entityId": str(entity_id),
            "backend": "local",
            "label": label,
            "name": _display_name(label, props, str(entity_id)),
            "props": props,
        })
    return out


def _local_links(store, node_ids: Set[str]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for source, target, key, data in store.graph.edges(keys=True, data=True):
        if source not in node_ids or target not in node_ids:
            continue
        out.append({
            "source": f"local:{source}",
            "target": f"local:{target}",
            "type": str(data.get("type") or data.get("rel_type") or "RELATED"),
            "backends": ["local"],
            "backend": "local",
            "key": str(key),
            "props": _props(data, drop=("type", "rel_type")),
        })
    return out


def _neo4j_nodes(client, limit: int, focus: Optional[str], depth: Optional[int]) -> List[Dict[str, Any]]:
    if focus and depth:
        query = """
        MATCH path = (seed {entity_id: $focus})-[*1..%d]-(other)
        WITH nodes(path) AS collected
        UNWIND collected AS n
        RETURN DISTINCT elementId(n) AS eid, n.entity_id AS entity_id,
               labels(n) AS labels, properties(n) AS props
        LIMIT $limit
        """ % max(1, min(int(depth), 6))
    elif focus:
        query = """
        MATCH (n) WHERE n.entity_id = $focus
        RETURN elementId(n) AS eid, n.entity_id AS entity_id,
               labels(n) AS labels, properties(n) AS props
        LIMIT $limit
        """
    else:
        query = """
        MATCH (n)
        RETURN elementId(n) AS eid, n.entity_id AS entity_id,
               labels(n) AS labels, properties(n) AS props
        LIMIT $limit
        """

    rows = client.execute_query(query, {"focus": focus, "limit": int(limit)})
    out: List[Dict[str, Any]] = []
    for row in rows:
        entity_id = row.get("entity_id") or row.get("eid")
        if not entity_id:
            continue
        props = _props(row.get("props") or {}, drop=("entity_id",))
        label = _primary_label(row.get("labels") or [])
        out.append({
            "id": f"neo4j:{entity_id}",
            "entityId": str(entity_id),
            "backend": "neo4j",
            "label": label,
            "name": _display_name(label, props, str(entity_id)),
            "props": props,
        })
    return out


def _neo4j_links(client, node_ids: Set[str]) -> List[Dict[str, Any]]:
    rows = client.execute_query("""
        MATCH (a)-[r]->(b)
        RETURN a.entity_id AS source, b.entity_id AS target,
               type(r) AS type, elementId(r) AS key, properties(r) AS props
        LIMIT 20000
    """)
    out: List[Dict[str, Any]] = []
    for row in rows:
        source, target = row.get("source"), row.get("target")
        if not source or not target:
            continue
        src_id, tgt_id = f"neo4j:{source}", f"neo4j:{target}"
        if src_id not in node_ids or tgt_id not in node_ids:
            continue
        out.append({
            "source": src_id,
            "target": tgt_id,
            "type": str(row.get("type") or "RELATED"),
            "backends": ["neo4j"],
            "backend": "neo4j",
            "key": str(row.get("key") or ""),
            "props": _props(row.get("props") or {}),
        })
    return out


# ----------------------------------------------------------------------------
# assembly
# ----------------------------------------------------------------------------
def _merge_by_entity(
    nodes: List[Dict[str, Any]],
    links: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Collapse the same entity across backends into one node/edge pair."""
    merged_nodes: Dict[str, Dict[str, Any]] = {}
    remap: Dict[str, str] = {}
    for node in nodes:
        key = node["entityId"]
        remap[node["id"]] = key
        existing = merged_nodes.get(key)
        if existing is None:
            # The entity id becomes the canonical node id so that links from
            # either backend can be remapped onto it.
            node["id"] = key
            node["backends"] = [node["backend"]]
            merged_nodes[key] = node
            continue
        if node["backend"] not in existing["backends"]:
            existing["backends"].append(node["backend"])
        # Prefer the richer property set between the two copies.
        if len(node["props"]) > len(existing["props"]):
            node["id"] = key
            node["backends"] = existing["backends"]
            merged_nodes[key] = node

    merged_links: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    for link in links:
        source = remap.get(link["source"], link["source"])
        target = remap.get(link["target"], link["target"])
        rel = (source, target, link["type"])
        existing = merged_links.get(rel)
        if existing is None:
            link = {**link, "source": source, "target": target}
            link["backends"] = list(link.get("backends") or [link.get("backend", "local")])
            merged_links[rel] = link
        else:
            for backend in link.get("backends") or []:
                if backend not in existing["backends"]:
                    existing["backends"].append(backend)

    return list(merged_nodes.values()), list(merged_links.values())


def _annotate(nodes: List[Dict[str, Any]], links: List[Dict[str, Any]]) -> None:
    """Attach degree + a content hash used for change detection."""
    degree: Dict[str, int] = {}
    for link in links:
        degree[link["source"]] = degree.get(link["source"], 0) + 1
        degree[link["target"]] = degree.get(link["target"], 0) + 1
    for node in nodes:
        node["degree"] = degree.get(node["id"], 0)
        node["hash"] = _digest([node.get("label"), node.get("name"), node.get("props")])


def _stats(backends: Dict[str, str], nodes, links) -> Dict[str, Any]:
    by_label: Dict[str, int] = {}
    for node in nodes:
        label = node.get("label") or "Unknown"
        by_label[label] = by_label.get(label, 0) + 1
    by_type: Dict[str, int] = {}
    for link in links:
        by_type[link.get("type", "RELATED")] = by_type.get(link.get("type", "RELATED"), 0) + 1
    return {
        "nodes": len(nodes),
        "relationships": len(links),
        "by_label": by_label,
        "by_relationship": by_type,
        "backends": backends,
    }


def fetch_snapshot(
    backends: Optional[Sequence[str]] = None,
    limit: int = DEFAULT_LIMIT,
    merge_backends: bool = True,
    focus: Optional[str] = None,
    depth: Optional[int] = None,
) -> Dict[str, Any]:
    """Read every requested backend and return one merged, viewer-ready graph."""
    wanted = [b for b in (backends or BACKENDS) if b in BACKENDS] or list(BACKENDS)
    limit = max(1, min(int(limit or DEFAULT_LIMIT), MAX_LIMIT))
    depth = max(1, min(int(depth), 6)) if depth else None

    status: Dict[str, str] = {}
    all_nodes: List[Dict[str, Any]] = []
    all_links: List[Dict[str, Any]] = []

    if "local" in wanted:
        try:
            from src.models.local_graph import get_local_graph
            store = get_local_graph()
            local_nodes = _local_nodes(store, limit, focus, depth)
            all_nodes.extend(local_nodes)
            all_links.extend(_local_links(store, {n["id"] for n in local_nodes}))
            status["local"] = f"connected ({len(local_nodes)} nodes)"
        except Exception as error:
            logger.warning("local graph unavailable: %s", error)
            status["local"] = f"unavailable: {type(error).__name__}"

    if "neo4j" in wanted:
        try:
            from src.models.graphify_ontology import get_graphify_client
            client = get_graphify_client()
            client.execute_query("RETURN 1")
            neo_nodes = _neo4j_nodes(client, limit, focus, depth)
            all_nodes.extend(neo_nodes)
            all_links.extend(_neo4j_links(client, {n["id"] for n in neo_nodes}))
            status["neo4j"] = f"connected ({len(neo_nodes)} nodes)"
        except Exception as error:
            logger.info("neo4j unavailable: %s", error)
            status["neo4j"] = f"unavailable: {type(error).__name__}"

    if not status:
        status = {name: "unavailable: not requested" for name in BACKENDS}

    if merge_backends:
        nodes, links = _merge_by_entity(all_nodes, all_links)
    else:
        nodes = [{**n, "backends": [n["backend"]]} for n in all_nodes]
        links = [{**l, "backends": list(l.get("backends") or [l["backend"]])} for l in all_links]

    _annotate(nodes, links)
    return {
        "backends": status,
        "nodes": nodes,
        "links": links,
        "stats": _stats(status, nodes, links),
        "mergeBackends": merge_backends,
        "ts": time.time(),
    }


# ----------------------------------------------------------------------------
# diffing
# ----------------------------------------------------------------------------
def _link_key(link: Dict[str, Any]) -> str:
    return f"{link.get('source')}|{link.get('target')}|{link.get('type')}"


def diff_snapshots(previous: Optional[Dict[str, Any]], current: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return an incremental message, or ``None`` when nothing changed.

    The very first snapshot is always sent whole; afterwards only the difference
    travels, so an idle graph costs almost nothing on the wire.
    """
    if not previous:
        return {"type": "snapshot", **current}

    prev_nodes: Dict[str, Dict[str, Any]] = {n["id"]: n for n in previous.get("nodes", [])}
    curr_nodes: Dict[str, Dict[str, Any]] = {n["id"]: n for n in current.get("nodes", [])}
    prev_links: Dict[str, Dict[str, Any]] = {_link_key(l): l for l in previous.get("links", [])}
    curr_links: Dict[str, Dict[str, Any]] = {_link_key(l): l for l in current.get("links", [])}

    added_nodes = [n for key, n in curr_nodes.items() if key not in prev_nodes]
    removed_nodes = list(key for key in prev_nodes if key not in curr_nodes)
    updated_nodes = [
        n for key, n in curr_nodes.items()
        if key in prev_nodes and prev_nodes[key].get("hash") != n.get("hash")
    ]
    added_links = [l for key, l in curr_links.items() if key not in prev_links]
    removed_links = list(key for key in prev_links if key not in curr_links)

    backends_changed = previous.get("backends") != current.get("backends")
    stats_changed = previous.get("stats") != current.get("stats")

    if not (added_nodes or removed_nodes or updated_nodes or added_links
            or removed_links or backends_changed or stats_changed):
        return None

    return {
        "type": "delta",
        "backends": current.get("backends", {}),
        "stats": current.get("stats", {}),
        "mergeBackends": current.get("mergeBackends", True),
        "ts": current.get("ts", time.time()),
        "addedNodes": added_nodes,
        "updatedNodes": updated_nodes,
        "removedNodes": removed_nodes,
        "addedLinks": added_links,
        "removedLinks": removed_links,
    }


def merge_message_into(previous: Dict[str, Any], message: Dict[str, Any]) -> Dict[str, Any]:
    """Client-side mirror of :func:`diff_snapshots` (kept here for parity/tests)."""
    if message.get("type") == "snapshot":
        return {
            "backends": message.get("backends", {}),
            "nodes": list(message.get("nodes", [])),
            "links": list(message.get("links", [])),
            "stats": message.get("stats", {}),
            "mergeBackends": message.get("mergeBackends", True),
            "ts": message.get("ts", time.time()),
        }

    nodes = {n["id"]: n for n in previous.get("nodes", [])}
    for node in message.get("addedNodes", []) + message.get("updatedNodes", []):
        nodes[node["id"]] = node
    for node_id in message.get("removedNodes", []):
        nodes.pop(node_id, None)

    links = {_link_key(l): l for l in previous.get("links", [])}
    for link in message.get("addedLinks", []):
        links[_link_key(link)] = link
    for key in message.get("removedLinks", []):
        links.pop(key, None)

    return {
        "backends": message.get("backends", previous.get("backends", {})),
        "nodes": list(nodes.values()),
        "links": list(links.values()),
        "stats": message.get("stats", previous.get("stats", {})),
        "mergeBackends": message.get("mergeBackends", previous.get("mergeBackends", True)),
        "ts": message.get("ts", time.time()),
    }
