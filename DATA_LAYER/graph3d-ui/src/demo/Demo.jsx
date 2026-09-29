import React, { useEffect, useRef, useState } from 'react';
import Graph3DView from '../index.js';
import './demo.css';

const SAMPLE = {
  nodes: [
    { id: 'a', label: 'Well', name: '25-A', degree: 3 },
    { id: 'b', label: 'Formation', name: 'X', degree: 2 },
    { id: 'c', label: 'OperationalEvent', name: 'Kick', degree: 1 },
    { id: 'd', label: 'Document', name: 'WCR', degree: 1 },
  ],
  links: [
    { source: 'a', target: 'b', type: 'DRILLED_THROUGH' },
    { source: 'a', target: 'c', type: 'EXPERIENCED' },
    { source: 'c', target: 'd', type: 'SUPPORTED_BY' },
  ],
};

export default function Demo() {
  const [offline, setOffline] = useState(false);
  const [light, setLight] = useState(false);
  const graphRef = useRef(null);

  // Dev-only debug handle: window.__g3d.getRenderStats() / .getGraph()
  useEffect(() => {
    if (import.meta.env.DEV) window.__g3d = graphRef;
  }, []);

  return (
    <div className="demo">
      <header className="demo-head">
        <div>
          <h1>3D knowledge graph</h1>
          <p>
            One component, live from Neo4j and the offline local graph. Nodes and relationships
            appear the moment ingestion writes them - no reload.
          </p>
        </div>
        <div className="demo-actions">
          <button type="button" onClick={() => setOffline((v) => !v)}>
            {offline ? 'use API' : 'offline sample'}
          </button>
          <button type="button" onClick={() => setLight((v) => !v)}>
            {light ? 'dark theme' : 'light theme'}
          </button>
        </div>
      </header>

      <Graph3DView
        ref={graphRef}
        apiUrl={import.meta.env.VITE_GRAPH_API_URL || ''}
        data={offline ? SAMPLE : null}
        live={!offline}
        theme={light ? 'light' : 'dark'}
        height="calc(100vh - 190px)"
        title="NWIS graph"
        interval={3000}
        limit={750}
        maxNodes={900}
        labelBudget={16}
        neighborhoodDepth={1}
        physics={{ linkDistance: 90, chargeStrength: -80, linkStrength: 0.9, centerStrength: 0.45 }}
        onNodeClick={(node) => console.log('node click', node.id, node.label)}
      />
    </div>
  );
}
