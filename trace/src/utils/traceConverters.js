export const TASK_STATUS_ACTIVE = 0;
export const TASK_STATUS_SUCCESS = 1;
export const TASK_STATUS_CANCEL = 2;
export const TASK_STATUS_HOLD = 3;
export const TASK_STATUS_ABORTED = 4;
export const TASK_STATUS_FALSE_BRANCH = 5;

export const NOT_REACHED_FILL = '#eee';
export const NOT_REACHED_LABEL = 'Not yet executed';

export const STATUS_FILL = {
  [TASK_STATUS_ACTIVE]: '#4a90e2',
  [TASK_STATUS_SUCCESS]: '#2ecc71',
  [TASK_STATUS_CANCEL]: '#e74c3c',
  [TASK_STATUS_HOLD]: '#f1c40f',
  [TASK_STATUS_ABORTED]: '#e74c3c',
  // FALSE_BRANCH is a successful completion -- MaestroIfTask.php sets it
  // alongside MAESTRO_TASK_COMPLETION_USE_FALSE_BRANCH when the condition
  // evaluates false and the task takes its false branch, not as an
  // error/skip. Colour it the same as SUCCESS; which branch actually fired
  // is visible via the highlighted edge and the tooltip's status label.
  [TASK_STATUS_FALSE_BRANCH]: '#2ecc71',
};

// Statuses where the engine still advances along the task's normal `to`
// edges (MaestroEngine::nextStep() gates advancement only on the
// false-branch completion flag -- cancel/abort do not block it).
const CARRY_ON_STATUSES = [TASK_STATUS_SUCCESS, TASK_STATUS_CANCEL, TASK_STATUS_ABORTED];

export function latestStepByTaskId(steps) {
  const map = {};
  (steps || []).forEach(step => {
    const existing = map[step.task_id];
    if (!existing || Number(step.queue_id) > Number(existing.queue_id)) {
      map[step.task_id] = step;
    }
  });
  return map;
}

export function statusFillForTask(taskId, stepsByTaskId) {
  const step = stepsByTaskId[taskId];
  if (!step) return NOT_REACHED_FILL;
  return STATUS_FILL[step.status] ?? NOT_REACHED_FILL;
}

export function statusLabelForTask(taskId, stepsByTaskId) {
  const step = stepsByTaskId[taskId];
  if (!step) return NOT_REACHED_LABEL; 
  return step.status_label || NOT_REACHED_LABEL;
}

// Edge id prefixes ('normal-', 'false-') must stay in sync with the parent
// module's tasksToEdges() (maestro_reactflow_template_builder/js/src/utils/converters.js).
export function traversedEdgeIds(tasks, stepsByTaskId) {
  const traversed = new Set();
  (tasks || []).forEach(task => {
    const step = stepsByTaskId[task.id];
    if (!step) return;
    if (step.status === TASK_STATUS_FALSE_BRANCH) {
      (task.falsebranch || []).forEach(targetId => {
        if (targetId) traversed.add(`false-${task.id}-${targetId}`);
      });
    }
    else if (CARRY_ON_STATUSES.includes(step.status)) {
      (task.to || []).forEach(targetId => {
        if (targetId) traversed.add(`normal-${task.id}-${targetId}`);
      });
    }
  });
  return traversed;
}

// Identifies the specific edge(s) whose completion caused the process to
// regenerate from the selected loop into the next one -- i.e. the edge
// whose target task is the first task (lowest queue_id) of the next loop.
// Returns an empty Set if there is no next loop yet (selectedLoop is the
// current/latest loop) or the next loop has no steps.
export function regenerationEdgeIds(tasks, loops, selectedLoop) {
  const regenerationIds = new Set();
  const nextLoopKey = String(Number(selectedLoop) + 1);
  const nextLoop = loops?.[nextLoopKey];
  if (!nextLoop || !(nextLoop.steps || []).length) {
    return regenerationIds;
  }

  const firstStepOfNextLoop = nextLoop.steps.reduce((earliest, step) => {
    if (!earliest || Number(step.queue_id) < Number(earliest.queue_id)) return step;
    return earliest;
  }, null);
  const regenerationTargetTaskId = firstStepOfNextLoop.task_id;

  const stepsByTaskId = latestStepByTaskId(loops?.[selectedLoop]?.steps);

  (tasks || []).forEach(task => {
    const step = stepsByTaskId[task.id];
    if (!step) return;
    if (step.status === TASK_STATUS_FALSE_BRANCH) {
      (task.falsebranch || []).forEach(targetId => {
        if (targetId === regenerationTargetTaskId) regenerationIds.add(`false-${task.id}-${targetId}`);
      });
    }
    else if (CARRY_ON_STATUSES.includes(step.status)) {
      (task.to || []).forEach(targetId => {
        if (targetId === regenerationTargetTaskId) regenerationIds.add(`normal-${task.id}-${targetId}`);
      });
    }
  });

  return regenerationIds;
}

export function applyTraceToNodes(nodes, stepsByTaskId) {
  return (nodes || []).map(node => ({
    ...node,
    data: {
      ...node.data,
      statusFill: statusFillForTask(node.id, stepsByTaskId),
      statusLabel: statusLabelForTask(node.id, stepsByTaskId),
    },
  }));
}

export function applyTraceToEdges(edges, traversedIds, regenerationIds) {
  return (edges || []).map(edge => ({
    ...edge,
    data: {
      ...edge.data,
      traversed: traversedIds.has(edge.id),
      regeneration: regenerationIds ? regenerationIds.has(edge.id) : false,
    },
  }));
}

// Diffs a task's before/after process-variable snapshot (each a
// name => value map, as produced by maestro_trace_archive) into a sorted
// array of { name, before, after, status }, status being one of
// 'added' | 'removed' | 'changed' | 'unchanged'.
export function diffProcessVariables(before, after) {
  const beforeMap = before || {};
  const afterMap = after || {};
  const names = new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]);

  return Array.from(names).sort().map(name => {
    const hasBefore = Object.prototype.hasOwnProperty.call(beforeMap, name);
    const hasAfter = Object.prototype.hasOwnProperty.call(afterMap, name);
    const beforeValue = beforeMap[name];
    const afterValue = afterMap[name];

    let status;
    if (hasAfter && !hasBefore) status = 'added';
    else if (hasBefore && !hasAfter) status = 'removed';
    else if (beforeValue !== afterValue) status = 'changed';
    else status = 'unchanged';

    return { name, before: beforeValue, after: afterValue, status };
  });
}

// Diffs a task's before/after entity-identifier snapshot (each an array of
// {unique_id, entity_type, bundle, entity_id, revision_id}, as produced by
// maestro_trace_archive) into a sorted array of
// { unique_id, before, after, status }, status being one of
// 'added' | 'removed' | 'updated' | 'unchanged'. 'updated' means the same
// unique_id now points at a different entity_id and/or revision_id (a new
// revision was saved during this task).
export function diffEntityIdentifiers(before, after) {
  const byUniqueId = new Map();
  (before || []).forEach(ei => byUniqueId.set(ei.unique_id, { before: ei, after: null }));
  (after || []).forEach(ei => {
    const existing = byUniqueId.get(ei.unique_id) || { before: null, after: null };
    byUniqueId.set(ei.unique_id, { ...existing, after: ei });
  });

  return Array.from(byUniqueId.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([uniqueId, { before: b, after: a }]) => {
      let status;
      if (a && !b) status = 'added';
      else if (b && !a) status = 'removed';
      else if (String(b.entity_id) !== String(a.entity_id) || String(b.revision_id) !== String(a.revision_id)) status = 'updated';
      else status = 'unchanged';

      return { unique_id: uniqueId, before: b, after: a, status };
    });
}
