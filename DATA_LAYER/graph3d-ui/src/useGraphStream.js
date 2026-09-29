import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyDelta, applySnapshot, createGraphStore } from './graphTransform.js';

/**
 * Live graph data source.
 *
 * Prefers the server's WebSocket (`/api/v1/graph/stream`), which pushes a
 * snapshot and then deltas as Neo4j or the local graph changes. If the socket
 * cannot be established it degrades to HTTP polling of `/api/v1/graph/view`,
 * and reconnects with exponential backoff.
 *
 * Pass `data` to bypass the network entirely and render a graph you already
 * have in memory.
 */
export function useGraphStream({
  apiUrl = defaultApiUrl(),
  data = null,
  endpoint = '/api/v1/graph/view',
  streamPath = '/api/v1/graph/stream',
  backends = ['local', 'neo4j'],
  merge = true,
  limit = 750,
  interval = 3000,
  live = true,
  focus = null,
  depth = null,
  enabled = true,
  onData,
  onError,
} = {}) {
  const [graph, setGraph] = useState(() => ({ nodes: [], links: [], stats: {}, change: null }));
  const [backendsState, setBackendsState] = useState({});
  const [status, setStatus] = useState(data ? 'static' : 'idle');
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(0);

  const storeRef = useRef(createGraphStore());
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const retryRef = useRef(0);
  const aliveRef = useRef(true);
  const modeRef = useRef('ws');
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);

  onDataRef.current = onData;
  onErrorRef.current = onError;

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      backends: (backends || []).join(','),
      limit: String(limit),
      merge: merge ? 'true' : 'false',
    });
    if (focus) {
      params.set('focus', focus);
      if (depth) params.set('depth', String(depth));
    }
    return params.toString();
  }, [backends, limit, merge, focus, depth, backends.length]);

  const commit = useCallback((message) => {
    const next = message.type === 'delta'
      ? applyDelta(storeRef.current, message)
      : applySnapshot(storeRef.current, message);
    setBackendsState(message.backends || {});
    setLastUpdate(Date.now());
    setGraph(next);
    onDataRef.current?.(next);
    return next;
  }, []);

  // In-memory graph supplied by the caller: no network, no stream.
  useEffect(() => {
    if (!data) return undefined;
    storeRef.current = createGraphStore();
    const next = applySnapshot(storeRef.current, {
      nodes: data.nodes || [],
      links: data.links || [],
    });
    setGraph(next);
    setStatus('static');
    onDataRef.current?.(next);
    return undefined;
  }, [data]);

  const poll = useCallback(async () => {
    if (!aliveRef.current) return;
    try {
      const response = await fetch(`${apiUrl}${endpoint}?${queryString}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      commit({ type: 'snapshot', ...(await response.json()) });
      setError(null);
      setStatus((prev) => (prev === 'live' ? prev : 'polling'));
    } catch (err) {
      setError(err.message || String(err));
      setStatus('offline');
      onErrorRef.current?.(err);
    }
  }, [apiUrl, endpoint, queryString, commit]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    poll();
    pollRef.current = setInterval(poll, Math.max(1000, interval));
  }, [poll, interval]);

  const connect = useCallback(() => {
    if (!aliveRef.current || data || !live || !enabled) return;
    if (typeof WebSocket === 'undefined') {
      modeRef.current = 'poll';
      startPolling();
      return;
    }

    setStatus((prev) => (prev === 'live' ? prev : 'connecting'));
    let socket;
    try {
      socket = new WebSocket(`${toWebSocketUrl(apiUrl)}${streamPath}?${queryString}&interval=${Math.max(1, Math.round(interval / 1000))}`);
    } catch (err) {
      setError(err.message || String(err));
      startPolling();
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => {
      if (!aliveRef.current) return;
      retryRef.current = 0;
      modeRef.current = 'ws';
      setStatus('live');
      setError(null);
      stopPolling();
    };

    socket.onmessage = (event) => {
      if (!aliveRef.current) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === 'error') {
        setError(message.message || 'stream error');
        return;
      }
      commit(message);
    };

    socket.onerror = () => {
      if (aliveRef.current) setStatus('polling');
    };

    socket.onclose = () => {
      if (!aliveRef.current) return;
      socketRef.current = null;
      // Fall back to polling immediately so the view keeps updating, then keep
      // trying to get the socket back.
      modeRef.current = 'poll';
      startPolling();
      const delay = Math.min(15000, 500 * 2 ** retryRef.current);
      retryRef.current += 1;
      retryRef.current = Math.min(retryRef.current, 6);
      setTimeout(connect, delay);
    };
  }, [apiUrl, streamPath, queryString, interval, data, live, enabled, commit, startPolling, stopPolling]);

  useEffect(() => {
    aliveRef.current = true;
    if (data) {
      stopPolling();
      return () => {
        aliveRef.current = false;
      };
    }
    if (!enabled || !live) {
      setStatus('paused');
      return () => {
        aliveRef.current = false;
        stopPolling();
      };
    }
    connect();
    return () => {
      aliveRef.current = false;
      stopPolling();
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect, stopPolling, data, enabled, live]);

  /** Ask the server to resend a full snapshot right now. */
  const refresh = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify({ type: 'refresh' }));
      return;
    }
    poll();
  }, [poll]);

  /** Change what the live stream reads, without remounting the socket. */
  const configure = useCallback((overrides = {}) => {
    if (socketRef.current && socketRef.current.readyState === 1) {
      socketRef.current.send(JSON.stringify({ type: 'configure', ...overrides }));
      return;
    }
    poll();
  }, [poll]);

  const reset = useCallback(() => {
    storeRef.current = createGraphStore();
    setGraph({ nodes: [], links: [], stats: {}, change: null });
    setLastUpdate(0);
  }, []);

  return {
    ...graph,
    backends: backendsState,
    status,
    transport: modeRef.current,
    error,
    lastUpdate,
    refresh,
    configure,
    reset,
  };
}

function defaultApiUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GRAPH_API_URL) {
    return import.meta.env.VITE_GRAPH_API_URL;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_GRAPH_API_URL) {
    return process.env.VITE_GRAPH_API_URL;
  }
  return 'http://localhost:8000';
}

export function toWebSocketUrl(apiUrl) {
  return String(apiUrl || '').replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}
