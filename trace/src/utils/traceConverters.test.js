import { describe, test, expect } from 'vitest';
import {
  TASK_STATUS_ACTIVE, TASK_STATUS_SUCCESS, TASK_STATUS_CANCEL, TASK_STATUS_HOLD,
  TASK_STATUS_ABORTED, TASK_STATUS_FALSE_BRANCH, NOT_REACHED_FILL, NOT_REACHED_LABEL, STATUS_FILL,
  latestStepByTaskId, statusFillForTask, statusLabelForTask, traversedEdgeIds, regenerationEdgeIds,
  applyTraceToNodes, applyTraceToEdges, diffProcessVariables, diffEntityIdentifiers,
} from './traceConverters.js';

describe('latestStepByTaskId', () => {
  test('picks the highest queue_id when a task has multiple rows in the loop', () => {
    const steps = [
      { task_id: 'a', queue_id: 5, status: TASK_STATUS_ACTIVE },
      { task_id: 'a', queue_id: 9, status: TASK_STATUS_SUCCESS },
    ];
    const result = latestStepByTaskId(steps);
    expect(result.a.queue_id).toBe(9);
  });

  test('returns an empty object for empty/undefined input', () => {
    expect(latestStepByTaskId([])).toEqual({});
    expect(latestStepByTaskId(undefined)).toEqual({});
  });
});

describe('statusFillForTask', () => {
  test('returns NOT_REACHED_FILL when the task has no step in this loop', () => {
    expect(statusFillForTask('missing', {})).toBe(NOT_REACHED_FILL);
  });

  test.each([
    [TASK_STATUS_ACTIVE, STATUS_FILL[TASK_STATUS_ACTIVE]],
    [TASK_STATUS_SUCCESS, STATUS_FILL[TASK_STATUS_SUCCESS]],
    [TASK_STATUS_CANCEL, STATUS_FILL[TASK_STATUS_CANCEL]],
    [TASK_STATUS_HOLD, STATUS_FILL[TASK_STATUS_HOLD]],
    [TASK_STATUS_ABORTED, STATUS_FILL[TASK_STATUS_ABORTED]],
    [TASK_STATUS_FALSE_BRANCH, STATUS_FILL[TASK_STATUS_FALSE_BRANCH]],
  ])('maps status %i to its configured fill color', (status, expectedFill) => {
    const stepsByTaskId = { a: { task_id: 'a', queue_id: 1, status } };
    expect(statusFillForTask('a', stepsByTaskId)).toBe(expectedFill);
  });

  test('colours FALSE_BRANCH the same as SUCCESS (both are successful completions, not skips)', () => {
    const successSteps = { a: { task_id: 'a', queue_id: 1, status: TASK_STATUS_SUCCESS } };
    const falseBranchSteps = { a: { task_id: 'a', queue_id: 1, status: TASK_STATUS_FALSE_BRANCH } };
    expect(statusFillForTask('a', falseBranchSteps)).toBe(statusFillForTask('a', successSteps));
  });
});

describe('statusLabelForTask', () => {
  test('returns NOT_REACHED_LABEL when the task has no step in this loop', () => {
    expect(statusLabelForTask('missing', {})).toBe(NOT_REACHED_LABEL);
  });

  test("returns the step's own status_label when present", () => {
    const stepsByTaskId = { a: { task_id: 'a', queue_id: 1, status: TASK_STATUS_SUCCESS, status_label: 'Successfully Completed' } };
    expect(statusLabelForTask('a', stepsByTaskId)).toBe('Successfully Completed');
  });

  test('falls back to NOT_REACHED_LABEL if a step exists but has no status_label', () => {
    const stepsByTaskId = { a: { task_id: 'a', queue_id: 1, status: TASK_STATUS_SUCCESS } };
    expect(statusLabelForTask('a', stepsByTaskId)).toBe(NOT_REACHED_LABEL);
  });
});

describe('traversedEdgeIds', () => {
  const tasks = [
    { id: 'if1', to: ['true1'], falsebranch: ['false1'] },
    { id: 'true1', to: [], falsebranch: [] },
    { id: 'false1', to: [], falsebranch: [] },
    { id: 'tool1', to: ['next1'], falsebranch: [] },
    { id: 'next1', to: [], falsebranch: [] },
  ];

  test('a false-branch status highlights only the falsebranch edge', () => {
    const stepsByTaskId = { if1: { task_id: 'if1', queue_id: 1, status: TASK_STATUS_FALSE_BRANCH } };
    const result = traversedEdgeIds(tasks, stepsByTaskId);
    expect(result.has('false-if1-false1')).toBe(true);
    expect(result.has('normal-if1-true1')).toBe(false);
  });

  test('a success status highlights the to edge', () => {
    const stepsByTaskId = { if1: { task_id: 'if1', queue_id: 1, status: TASK_STATUS_SUCCESS } };
    const result = traversedEdgeIds(tasks, stepsByTaskId);
    expect(result.has('normal-if1-true1')).toBe(true);
  });

  test('cancel and aborted statuses still highlight the to edge (the process carries on)', () => {
    expect(traversedEdgeIds(tasks, { tool1: { task_id: 'tool1', queue_id: 1, status: TASK_STATUS_CANCEL } }).has('normal-tool1-next1')).toBe(true);
    expect(traversedEdgeIds(tasks, { tool1: { task_id: 'tool1', queue_id: 1, status: TASK_STATUS_ABORTED } }).has('normal-tool1-next1')).toBe(true);
  });

  test('active and hold statuses highlight nothing yet', () => {
    expect(traversedEdgeIds(tasks, { tool1: { task_id: 'tool1', queue_id: 1, status: TASK_STATUS_ACTIVE } }).size).toBe(0);
    expect(traversedEdgeIds(tasks, { tool1: { task_id: 'tool1', queue_id: 1, status: TASK_STATUS_HOLD } }).size).toBe(0);
  });

  test('a task with no step in this loop contributes no traversed edges', () => {
    expect(traversedEdgeIds(tasks, {}).size).toBe(0);
  });
});

describe('regenerationEdgeIds', () => {
  // A simple loop: if1 evaluates false to loop back to loopstart, or
  // success to move on to next1.
  const tasks = [
    { id: 'loopstart', to: ['if1'], falsebranch: [] },
    { id: 'if1', to: ['next1'], falsebranch: ['loopstart'] },
    { id: 'next1', to: [], falsebranch: [] },
  ];

  test('returns an empty set when there is no next loop (selected loop is current)', () => {
    const loops = {
      '0': { label: 'Loop 1', current: true, steps: [
        { task_id: 'loopstart', queue_id: 1, status: TASK_STATUS_SUCCESS },
        { task_id: 'if1', queue_id: 2, status: TASK_STATUS_FALSE_BRANCH },
      ] },
    };
    expect(regenerationEdgeIds(tasks, loops, '0').size).toBe(0);
  });

  test('returns an empty set when the next loop exists but has no steps', () => {
    const loops = {
      '0': { label: 'Loop 1', current: false, steps: [
        { task_id: 'if1', queue_id: 2, status: TASK_STATUS_FALSE_BRANCH },
      ] },
      '1': { label: 'Loop 2', current: true, steps: [] },
    };
    expect(regenerationEdgeIds(tasks, loops, '0').size).toBe(0);
  });

  test('identifies the false-branch edge whose target starts the next loop', () => {
    const loops = {
      '0': { label: 'Loop 1', current: false, steps: [
        { task_id: 'loopstart', queue_id: 1, status: TASK_STATUS_SUCCESS },
        { task_id: 'if1', queue_id: 2, status: TASK_STATUS_FALSE_BRANCH },
      ] },
      '1': { label: 'Loop 2', current: true, steps: [
        { task_id: 'loopstart', queue_id: 3, status: TASK_STATUS_SUCCESS },
      ] },
    };
    const result = regenerationEdgeIds(tasks, loops, '0');
    expect(result.has('false-if1-loopstart')).toBe(true);
    expect(result.size).toBe(1);
  });

  test('identifies a normal (to) edge whose target starts the next loop', () => {
    const loops = {
      '0': { label: 'Loop 1', current: false, steps: [
        { task_id: 'loopstart', queue_id: 1, status: TASK_STATUS_SUCCESS },
      ] },
      '1': { label: 'Loop 2', current: true, steps: [
        { task_id: 'if1', queue_id: 2, status: TASK_STATUS_ACTIVE },
      ] },
    };
    const result = regenerationEdgeIds(tasks, loops, '0');
    expect(result.has('normal-loopstart-if1')).toBe(true);
  });

  test('picks the lowest-queue_id step of the next loop as the regeneration target', () => {
    const loops = {
      '0': { label: 'Loop 1', current: false, steps: [
        { task_id: 'loopstart', queue_id: 1, status: TASK_STATUS_SUCCESS },
        { task_id: 'if1', queue_id: 2, status: TASK_STATUS_FALSE_BRANCH },
      ] },
      '1': { label: 'Loop 2', current: true, steps: [
        // Deliberately out of order -- lowest queue_id should still win.
        { task_id: 'next1', queue_id: 10, status: TASK_STATUS_ACTIVE },
        { task_id: 'loopstart', queue_id: 3, status: TASK_STATUS_SUCCESS },
      ] },
    };
    const result = regenerationEdgeIds(tasks, loops, '0');
    expect(result.has('false-if1-loopstart')).toBe(true);
    expect(result.size).toBe(1);
  });
});

describe('applyTraceToNodes', () => {
  test('sets data.statusFill and data.statusLabel per node without mutating the input array', () => {
    const nodes = [{ id: 'a', data: { taskType: 'MaestroTool' } }];
    const stepsByTaskId = { a: { task_id: 'a', queue_id: 1, status: TASK_STATUS_SUCCESS, status_label: 'Successfully Completed' } };
    const result = applyTraceToNodes(nodes, stepsByTaskId);
    expect(result[0].data.statusFill).toBe(STATUS_FILL[TASK_STATUS_SUCCESS]);
    expect(result[0].data.statusLabel).toBe('Successfully Completed');
    expect(nodes[0].data.statusFill).toBeUndefined();
    expect(nodes[0].data.statusLabel).toBeUndefined();
  });

  test('sets NOT_REACHED_LABEL for a node with no step in this loop', () => {
    const nodes = [{ id: 'never-reached', data: {} }];
    const result = applyTraceToNodes(nodes, {});
    expect(result[0].data.statusLabel).toBe(NOT_REACHED_LABEL);
  });
});

describe('applyTraceToEdges', () => {
  test('sets data.traversed per edge without mutating the input array', () => {
    const edges = [{ id: 'normal-a-b', data: { connectionType: 'MaestroNormal' } }];
    const traversed = new Set(['normal-a-b']);
    const result = applyTraceToEdges(edges, traversed);
    expect(result[0].data.traversed).toBe(true);
    expect(edges[0].data.traversed).toBeUndefined();
  });

  test('marks edges not in the traversed set as false', () => {
    const edges = [{ id: 'normal-a-b', data: {} }];
    const result = applyTraceToEdges(edges, new Set());
    expect(result[0].data.traversed).toBe(false);
  });

  test('sets data.regeneration when the edge id is in the regeneration set', () => {
    const edges = [{ id: 'false-if1-loopstart', data: {} }];
    const result = applyTraceToEdges(edges, new Set(['false-if1-loopstart']), new Set(['false-if1-loopstart']));
    expect(result[0].data.regeneration).toBe(true);
  });

  test('data.regeneration defaults to false when no regeneration set is passed', () => {
    const edges = [{ id: 'normal-a-b', data: {} }];
    const result = applyTraceToEdges(edges, new Set(['normal-a-b']));
    expect(result[0].data.regeneration).toBe(false);
  });
});

describe('diffProcessVariables', () => {
  test('flags a variable present only after as added', () => {
    const result = diffProcessVariables({}, { amount: '250' });
    expect(result).toEqual([{ name: 'amount', before: undefined, after: '250', status: 'added' }]);
  });

  test('flags a variable present only before as removed', () => {
    const result = diffProcessVariables({ amount: '250' }, {});
    expect(result).toEqual([{ name: 'amount', before: '250', after: undefined, status: 'removed' }]);
  });

  test('flags a variable whose value changed as changed', () => {
    const result = diffProcessVariables({ status: 'pending' }, { status: 'approved' });
    expect(result).toEqual([{ name: 'status', before: 'pending', after: 'approved', status: 'changed' }]);
  });

  test('flags a variable with the same value as unchanged', () => {
    const result = diffProcessVariables({ initiator: 'admin' }, { initiator: 'admin' });
    expect(result).toEqual([{ name: 'initiator', before: 'admin', after: 'admin', status: 'unchanged' }]);
  });

  test('sorts by variable name and handles missing before/after maps', () => {
    const result = diffProcessVariables(null, { zeta: '1', alpha: '2' });
    expect(result.map(r => r.name)).toEqual(['alpha', 'zeta']);
  });
});

describe('diffEntityIdentifiers', () => {
  const receiptV1 = { unique_id: 'receipt', entity_type: 'node', bundle: 'article', entity_id: '42', revision_id: '100' };
  const receiptV2 = { unique_id: 'receipt', entity_type: 'node', bundle: 'article', entity_id: '42', revision_id: '101' };

  test('flags an identifier present only after as added', () => {
    const result = diffEntityIdentifiers([], [receiptV1]);
    expect(result).toEqual([{ unique_id: 'receipt', before: null, after: receiptV1, status: 'added' }]);
  });

  test('flags an identifier present only before as removed', () => {
    const result = diffEntityIdentifiers([receiptV1], []);
    expect(result).toEqual([{ unique_id: 'receipt', before: receiptV1, after: null, status: 'removed' }]);
  });

  test('flags a changed revision_id as updated', () => {
    const result = diffEntityIdentifiers([receiptV1], [receiptV2]);
    expect(result[0].status).toBe('updated');
  });

  test('flags a changed entity_id as updated', () => {
    const repointed = { ...receiptV1, entity_id: '99' };
    const result = diffEntityIdentifiers([receiptV1], [repointed]);
    expect(result[0].status).toBe('updated');
  });

  test('flags an identical identifier as unchanged', () => {
    const result = diffEntityIdentifiers([receiptV1], [{ ...receiptV1 }]);
    expect(result[0].status).toBe('unchanged');
  });

  test('sorts by unique_id and handles missing before/after arrays', () => {
    const result = diffEntityIdentifiers(null, [{ ...receiptV1, unique_id: 'zeta' }, { ...receiptV1, unique_id: 'alpha' }]);
    expect(result.map(r => r.unique_id)).toEqual(['alpha', 'zeta']);
  });
});
