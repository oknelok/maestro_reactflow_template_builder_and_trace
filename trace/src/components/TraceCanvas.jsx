import React from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// Imported from the parent module; keep in sync with ../utils/traceConverters.js's expectations.
import TaskNode from '../../../../../js/src/components/nodes/TaskNode.jsx';
import MaestroEdge from '../../../../../js/src/components/edges/MaestroEdge.jsx';

const NODE_TYPES = { maestroTask: TaskNode };
const EDGE_TYPES = { maestroEdge: MaestroEdge };

function ArrowDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <marker id="maestro-arrow-black" viewBox="0 0 10 10" markerWidth="10" markerHeight="10"
          refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 10 5, 0 10" fill="#000" />
        </marker>
        <marker id="maestro-arrow-red" viewBox="0 0 10 10" markerWidth="10" markerHeight="10"
          refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 10 5, 0 10" fill="#f00" />
        </marker>
      </defs>
    </svg>
  );
}

export default function TraceCanvas({ nodes, edges, onNodeClick }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ArrowDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        fitView
        deleteKeyCode={null}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
