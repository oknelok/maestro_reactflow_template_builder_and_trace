const TASK_WIDTH = 100;
const TASK_HEIGHT = 50;

export function taskToNode(task, settings) {
  const colours = settings.maestroTaskColours || {};
  let label = task.taskname || '';
  const longTaskName = label;
  if (label.length > 13) {
    label = label.slice(0, 13) + '...';
  }
  return {
    id: task.id,
    type: 'maestroTask',
    position: { x: parseInt(task.left, 10) || 0, y: parseInt(task.top, 10) || 0 },
    data: {
      taskType: task.type,
      taskName: label,
      longTaskName,
      colour: colours[task.type] || '#333',
      capabilities: task.capabilities || [],
      workflowStatusNumber: task.workflow_status_stage_number || '',
      workflowStatusMessage: task.workflow_status_stage_message || '',
      width: TASK_WIDTH,
      height: TASK_HEIGHT,
    },
    width: TASK_WIDTH,
    height: TASK_HEIGHT,
  };
}

export function tasksToNodes(tasks, settings) {
  return (tasks || []).map(task => taskToNode(task, settings));
}

export function tasksToEdges(tasks) {
  const edges = [];
  (tasks || []).forEach(task => {
    (task.to || []).forEach(targetId => {
      if (targetId) {
        edges.push({
          id: `normal-${task.id}-${targetId}`,
          source: task.id,
          target: targetId,
          type: 'maestroEdge',
          data: { connectionType: 'MaestroNormal' },
        });
      }
    });
    (task.falsebranch || []).forEach(targetId => {
      if (targetId) {
        edges.push({
          id: `false-${task.id}-${targetId}`,
          source: task.id,
          target: targetId,
          type: 'maestroEdge',
          data: { connectionType: 'MaestroFalse' },
        });
      }
    });
  });
  return edges;
}
