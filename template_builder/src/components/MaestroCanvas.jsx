import React, { useCallback } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TaskNode from './nodes/TaskNode.jsx';
import MaestroEdge from './edges/MaestroEdge.jsx';
import MaestroPalette from './MaestroPalette.jsx';
import MaestroAlignmentToolbar from './MaestroAlignmentToolbar.jsx';

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

export default function MaestroCanvas({
  nodes, edges,
  onNodesChange, onEdgesChange,
  pendingConnection, setPendingConnection,
  settings, setEdges,
}) {
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback(e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault();
    const taskType = e.dataTransfer.getData('application/maestro-task-type');
    const label    = e.dataTransfer.getData('application/maestro-task-label');
    if (!taskType) return;

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const time = Date.now();
    const newId = `${taskType.toLowerCase()}${time}`;
    const shortLabel = label.length > 13 ? label.slice(0, 13) + '...' : label;
    const caps = Object.values(settings.taskCapabilities?.[taskType] || {});

    const newNode = {
      id: newId,
      type: 'maestroTask',
      position,
      data: {
        taskType,
        taskName: shortLabel,
        longTaskName: label,
        colour: settings.maestroTaskColours?.[taskType] || '#333',
        capabilities: caps,
        workflowStatusNumber: '',
        workflowStatusMessage: '',
        width: 100,
        height: 50,
      },
      width: 100,
      height: 50,
    };

    window.MaestroReact?.addNodeLocally(newNode);
    window.MaestroReact?.saveNewTask(taskType, newId, label, Math.round(position.y), Math.round(position.x));
  }, [screenToFlowPosition, settings]);

  const onNodeClick = useCallback((event, node) => {
    if (!pendingConnection) return;
    const { from, type } = pendingConnection;
    if (from === node.id) {
      setPendingConnection(null);
      return;
    }
    const newEdge = {
      id: `${type === 'false' ? 'false' : 'normal'}-${from}-${node.id}-${Date.now()}`,
      source: from,
      target: node.id,
      type: 'maestroEdge',
      data: { connectionType: type === 'false' ? 'MaestroFalse' : 'MaestroNormal' },
    };
    setEdges(eds => [...eds, newEdge]);
    window.MaestroReact?.completeConnection(from, node.id, type);
    setPendingConnection(null);
  }, [pendingConnection, setPendingConnection, setEdges]);

  const onNodeDragStop = useCallback((_event, node) => {
    window.MaestroReact?.saveTaskPosition(node.id, Math.round(node.position.y), Math.round(node.position.x));
  }, []);

  const onMoveEnd = useCallback((_event, viewport) => {
    window.MaestroReact?.savePanZoom(viewport.y, viewport.x, viewport.zoom);
  }, []);

  const onPaneClick = useCallback(() => {
    if (pendingConnection) setPendingConnection(null);
  }, [pendingConnection, setPendingConnection]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ArrowDefs />
      {pendingConnection && (
        <div className="maestro-template-message-area">
          {pendingConnection.type === 'false'
            ? 'Click the target task for the FALSE line, or click empty canvas to cancel.'
            : 'Click the target task to draw the line to, or click empty canvas to cancel.'}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultViewport={{ x: settings.pan_left || 0, y: settings.pan_top || 0, zoom: settings.zoom || 1 }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        onPaneClick={onPaneClick}
        proOptions={{ hideAttribution: true }}
        fitView={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        snapToGrid={true}
        snapGrid={[5, 5]}
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-center">
          <MaestroAlignmentToolbar />
        </Panel>
        <Panel position="left">
          <MaestroPalette settings={settings} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
