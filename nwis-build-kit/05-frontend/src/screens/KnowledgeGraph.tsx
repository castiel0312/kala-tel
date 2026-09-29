import React from 'react';
import Graph3DView from './Graph3DView';
const OFFLINE = require('../../../DATA_LAYER/data/graph/nwis_graph.json');
export default function KnowledgeGraph() {
  return (
    <div id="graph">
      {/* Tab 9 knowledge graph section replaced with 3D */}
      <Graph3DView
        data={OFFLINE}
        live={false}
        apiUrl=""
        theme="dark"
        height="100vh"
        title="NWIS 3D (Offline)"
        showNavInfo={true}
        nodeRelSize={8}
      />
    </div>
  );
}
