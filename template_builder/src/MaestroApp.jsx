import React, { useEffect, useState } from 'react';
import { ReactFlowProvider, useNodesState, useEdgesState } from '@xyflow/react';
import MaestroCanvas from './components/MaestroCanvas.jsx';
import { tasksToNodes, tasksToEdges, taskToNode } from './utils/converters.js';

export default function MaestroApp({ settings }) {
  const tasks = settings.maestro || [];
  const [nodes, setNodes, onNodesChange] = useNodesState(tasksToNodes(tasks, settings));
  const [edges, setEdges, onEdgesChange] = useEdgesState(tasksToEdges(tasks));
  const [pendingConnection, setPendingConnection] = useState(null);

  useEffect(() => {
    const $ = window.jQuery;

    window.MaestroReact = {
      addTask(task) {
        setNodes(nds => [...nds, taskToNode(task, settings)]);
      },

      addNodeLocally(node) {
        setNodes(nds => [...nds, node]);
      },

      removeTask(taskId) {
        setNodes(nds => nds.filter(n => n.id !== taskId));
        setEdges(eds => eds.filter(e => e.source !== taskId && e.target !== taskId));
      },

      updateMetadata({ taskid, label, workflow_status_stage_number, workflow_status_stage_message }) {
        const shortLabel = label.length > 13 ? label.slice(0, 13) + '...' : label;
        setNodes(nds => nds.map(n =>
          n.id === taskid
            ? { ...n, data: { ...n.data, taskName: shortLabel, longTaskName: label, workflowStatusNumber: workflow_status_stage_number || '', workflowStatusMessage: workflow_status_stage_message || '' } }
            : n
        ));
      },

      removeLines(taskId) {
        setEdges(eds => eds.filter(e => e.source !== taskId && e.target !== taskId));
      },

      setPendingConnection(data) {
        setPendingConnection(data);
      },

      editTask(taskId) {
        $('[name="task_clicked"]').val(taskId);
        $('[maestro_capabilities_id="maestro_template_edit"]').trigger('mousedown');
      },

      triggerDrawLineTo(taskId) {
        $('[name="task_clicked"]').val(taskId);
        $('[maestro_capabilities_id="maestro_template_drawlineto"]').trigger('mousedown');
      },

      triggerDrawFalseLineTo(taskId) {
        $('[name="task_clicked"]').val(taskId);
        $('[maestro_capabilities_id="maestro_template_drawfalselineto"]').trigger('mousedown');
      },

      triggerRemoveLines(taskId) {
        $('[name="task_clicked"]').val(taskId);
        $('[maestro_capabilities_id="maestro_template_removelines"]').trigger('mousedown');
      },

      triggerRemoveTask(taskId) {
        if (!window.confirm('Remove this task?')) return;
        $('[name="task_clicked"]').val(taskId);
        $('#edit-remove-task-complete').trigger('mousedown');
      },

      completeConnection(fromId, toId, type) {
        const btn = type === 'false' ? '#edit-draw-false-line-complete' : '#edit-draw-line-complete';
        $('[name="task_line_from"]').val(fromId);
        $('[name="task_line_to"]').val(toId);
        $(btn).trigger('mousedown');
      },

      saveTaskPosition(taskId, top, left) {
        $('[name="task_clicked"]').val(taskId);
        $('[name="task_top"]').val(top);
        $('[name="task_left"]').val(left);
        $('#edit-move-task-complete').trigger('mousedown');
      },

      savePanZoom(panTop, panLeft, zoom) {
        $('[name="pan_top"]').val(panTop);
        $('[name="pan_left"]').val(panLeft);
        $('[name="zoom"]').val(zoom);
        $('#edit-pan-zoom-complete').trigger('mousedown');
      },

      saveNewTask(taskType, taskId, taskLabel, top, left) {
        $('[name="palette_task_type"]').val(taskType);
        $('[name="palette_task_id"]').val(taskId);
        $('[name="palette_task_label"]').val(taskLabel);
        $('[name="task_top"]').val(top);
        $('[name="task_left"]').val(left);
        $('#edit-create-new-task-from-palette-complete').trigger('mousedown');
        $('[name="palette_task_type"]').val('');
        $('[name="palette_task_id"]').val('');
        $('[name="palette_task_label"]').val('');
      },
    };

    return () => { window.MaestroReact = null; };
  }, [settings, setNodes, setEdges]);

  return (
    <ReactFlowProvider>
      <MaestroCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        pendingConnection={pendingConnection}
        setPendingConnection={setPendingConnection}
        settings={settings}
        setEdges={setEdges}
      />
    </ReactFlowProvider>
  );
}
