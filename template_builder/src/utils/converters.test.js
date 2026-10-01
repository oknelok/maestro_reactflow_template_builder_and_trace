import { describe, test, expect } from 'vitest';
import { taskToNode, tasksToNodes, tasksToEdges } from './converters.js';

const settings = {
  maestroTaskColours: { MaestroInteractive: '#0000ff', MaestroEnd: '#ff0000' },
};

describe('taskToNode', () => {
  test('maps id, type, and position', () => {
    const task = { id: 'task1', type: 'MaestroInteractive', taskname: 'Hello', left: '120', top: '80', capabilities: [], workflow_status_stage_number: '', workflow_status_stage_message: '' };
    const node = taskToNode(task, settings);
    expect(node.id).toBe('task1');
    expect(node.type).toBe('maestroTask');
    expect(node.position).toEqual({ x: 120, y: 80 });
    expect(node.data.taskType).toBe('MaestroInteractive');
    expect(node.data.colour).toBe('#0000ff');
  });

  test('truncates names longer than 13 chars', () => {
    const task = { id: 't', type: 'MaestroInteractive', taskname: 'A Very Long Task Name', left: '0', top: '0', capabilities: [], workflow_status_stage_number: '', workflow_status_stage_message: '' };
    const node = taskToNode(task, settings);
    expect(node.data.taskName).toBe('A Very Long T...');
    expect(node.data.longTaskName).toBe('A Very Long Task Name');
  });

  test('does not truncate names of 13 chars or fewer', () => {
    const task = { id: 't', type: 'MaestroInteractive', taskname: 'Exactly13chr', left: '0', top: '0', capabilities: [], workflow_status_stage_number: '', workflow_status_stage_message: '' };
    const node = taskToNode(task, settings);
    expect(node.data.taskName).toBe('Exactly13chr');
  });

  test('falls back to #333 when taskType not in colours', () => {
    const task = { id: 't', type: 'UnknownType', taskname: 'x', left: '0', top: '0', capabilities: [], workflow_status_stage_number: '', workflow_status_stage_message: '' };
    const node = taskToNode(task, settings);
    expect(node.data.colour).toBe('#333');
  });

  test('passes capabilities array through', () => {
    const caps = ['maestro_template_edit', 'maestro_template_drawlineto'];
    const task = { id: 't', type: 'MaestroInteractive', taskname: 'x', left: '0', top: '0', capabilities: caps, workflow_status_stage_number: '', workflow_status_stage_message: '' };
    const node = taskToNode(task, settings);
    expect(node.data.capabilities).toEqual(caps);
  });
});

describe('tasksToNodes', () => {
  test('maps an array of tasks to nodes', () => {
    const tasks = [
      { id: 'a', type: 'MaestroInteractive', taskname: 'Alpha', left: '10', top: '20', capabilities: [], workflow_status_stage_number: '', workflow_status_stage_message: '' },
      { id: 'b', type: 'MaestroEnd', taskname: 'End', left: '200', top: '50', capabilities: [], workflow_status_stage_number: '', workflow_status_stage_message: '' },
    ];
    const nodes = tasksToNodes(tasks, settings);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe('a');
    expect(nodes[1].id).toBe('b');
    expect(nodes[0].data.colour).toBe('#0000ff');
    expect(nodes[1].data.colour).toBe('#ff0000');
  });

  test('returns empty array for empty input', () => {
    expect(tasksToNodes([], settings)).toEqual([]);
  });

  test('returns empty array for null/undefined input', () => {
    expect(tasksToNodes(null, settings)).toEqual([]);
    expect(tasksToNodes(undefined, settings)).toEqual([]);
  });
});

describe('tasksToEdges', () => {
  test('creates normal edges from task.to', () => {
    const tasks = [
      { id: 'a', to: ['b'], falsebranch: [] },
      { id: 'b', to: [], falsebranch: [] },
    ];
    const edges = tasksToEdges(tasks);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'a', target: 'b', type: 'maestroEdge', data: { connectionType: 'MaestroNormal' } });
  });

  test('creates false edges from task.falsebranch', () => {
    const tasks = [
      { id: 'a', to: [], falsebranch: ['c'] },
      { id: 'c', to: [], falsebranch: [] },
    ];
    const edges = tasksToEdges(tasks);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'a', target: 'c', data: { connectionType: 'MaestroFalse' } });
  });

  test('skips empty string targets', () => {
    const tasks = [{ id: 'a', to: [''], falsebranch: [''] }];
    expect(tasksToEdges(tasks)).toHaveLength(0);
  });

  test('generates unique edge ids', () => {
    const tasks = [
      { id: 'a', to: ['b', 'c'], falsebranch: [] },
      { id: 'b', to: [], falsebranch: [] },
      { id: 'c', to: [], falsebranch: [] },
    ];
    const edges = tasksToEdges(tasks);
    const ids = edges.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
