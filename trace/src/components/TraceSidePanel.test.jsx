import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TraceSidePanel from './TraceSidePanel.jsx';
import { TASK_STATUS_ACTIVE, TASK_STATUS_SUCCESS } from '../utils/traceConverters.js';

const steps = [
  {
    task_id: 'task1', queue_id: 55, status: TASK_STATUS_SUCCESS, task_label: 'First Task', status_label: 'Successfully Completed',
    started_date_formatted: '2026-07-20 10:00:00', completed_formatted: '2026-07-20 10:05:00',
    owner: 'Maestro',
  },
  {
    task_id: 'task2', queue_id: 56, status: TASK_STATUS_ACTIVE, task_label: 'Second Task', status_label: 'Active',
    started_date_formatted: '2026-07-20 10:10:00', completed_formatted: 'Active',
    owner: 'Anonymous',
  },
];
const processVariables = [{ id: '1', variable_name: 'foo', variable_value: 'bar' }];
const entityIdentifiers = [{ unique_id: 'node1', entity_type: 'node', bundle: 'article', entity_id: '42' }];

describe('TraceSidePanel', () => {
  test('shows empty state when no task is selected', () => {
    render(<TraceSidePanel steps={steps} selectedTaskId={null} processVariables={[]} entityIdentifiers={[]} />);
    expect(screen.getByTestId('step-detail-empty')).toBeInTheDocument();
  });

  test('shows step detail for the selected task', () => {
    render(<TraceSidePanel steps={steps} selectedTaskId="task1" processVariables={[]} entityIdentifiers={[]} />);
    const table = screen.getByTestId('step-detail-table');
    expect(table).toHaveTextContent('First Task');
    expect(table).toHaveTextContent('Successfully Completed');
    expect(table).toHaveTextContent('2026-07-20 10:05:00');
  });

  test('shows the real owner in "Completed By" for a completed task', () => {
    render(<TraceSidePanel steps={steps} selectedTaskId="task1" processVariables={[]} entityIdentifiers={[]} />);
    expect(screen.getByTestId('step-detail-table')).toHaveTextContent('Completed ByMaestro');
  });

  test('shows "Not yet completed" instead of the placeholder owner for a still-active task', () => {
    render(<TraceSidePanel steps={steps} selectedTaskId="task2" processVariables={[]} entityIdentifiers={[]} />);
    const table = screen.getByTestId('step-detail-table');
    expect(table).toHaveTextContent('Completed ByNot yet completed');
    expect(table).not.toHaveTextContent('Anonymous');
  });

  test('shows a not-executed-yet message when the selected task has no step in this loop', () => {
    render(<TraceSidePanel steps={steps} selectedTaskId="never-reached-task" processVariables={[]} entityIdentifiers={[]} />);
    expect(screen.getByTestId('step-detail-not-executed')).toHaveTextContent('This task has not been executed yet.');
    expect(screen.queryByTestId('step-detail-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-detail-table')).not.toBeInTheDocument();
  });

  test('renders process variables', () => {
    render(<TraceSidePanel steps={[]} selectedTaskId={null} processVariables={processVariables} entityIdentifiers={[]} />);
    expect(screen.getByTestId('process-variables-table')).toHaveTextContent('foo');
    expect(screen.getByTestId('process-variables-table')).toHaveTextContent('bar');
  });

  test('renders entity identifiers', () => {
    render(<TraceSidePanel steps={[]} selectedTaskId={null} processVariables={[]} entityIdentifiers={entityIdentifiers} />);
    expect(screen.getByTestId('entity-identifiers-table')).toHaveTextContent('node1');
    expect(screen.getByTestId('entity-identifiers-table')).toHaveTextContent('article');
  });

  test('omits the snapshot-diff section entirely when the trace archive module is not enabled', () => {
    const snapshots = { 55: { before: { process_variables: { foo: 'bar' }, entity_identifiers: [] } } };
    render(<TraceSidePanel steps={steps} selectedTaskId="task1" processVariables={[]} entityIdentifiers={[]} snapshots={snapshots} traceArchiveEnabled={false} />);
    expect(screen.queryByText('Changes During This Step')).not.toBeInTheDocument();
    expect(screen.queryByTestId('snapshot-diff-unavailable')).not.toBeInTheDocument();
  });

  test('shows "no snapshot data" when the archive is enabled but this step has no captured snapshot', () => {
    render(<TraceSidePanel steps={steps} selectedTaskId="task1" processVariables={[]} entityIdentifiers={[]} snapshots={{}} traceArchiveEnabled={true} />);
    expect(screen.getByTestId('snapshot-diff-unavailable')).toBeInTheDocument();
  });

  test('shows an "still active" message instead of the generic one when the task is still active', () => {
    render(<TraceSidePanel steps={steps} selectedTaskId="task2" processVariables={[]} entityIdentifiers={[]} snapshots={{}} traceArchiveEnabled={true} />);
    expect(screen.getByTestId('snapshot-diff-active')).toHaveTextContent('This task is still active — no snapshot yet.');
    expect(screen.queryByTestId('snapshot-diff-unavailable')).not.toBeInTheDocument();
  });

  test('renders the before/after process-variable diff for the selected step', () => {
    const snapshots = {
      55: {
        before: { process_variables: { status: 'pending' }, entity_identifiers: [] },
        after: { process_variables: { status: 'approved' }, entity_identifiers: [] },
      },
    };
    render(<TraceSidePanel steps={steps} selectedTaskId="task1" processVariables={[]} entityIdentifiers={[]} snapshots={snapshots} traceArchiveEnabled={true} />);
    const table = screen.getByTestId('snapshot-diff-pv-table');
    expect(table).toHaveTextContent('status');
    expect(table).toHaveTextContent('pending');
    expect(table).toHaveTextContent('approved');
  });

  test('renders the before/after entity-identifier diff, flagging a revision change as updated', () => {
    const snapshots = {
      55: {
        before: { process_variables: {}, entity_identifiers: [{ unique_id: 'receipt', entity_type: 'node', bundle: 'article', entity_id: '42', revision_id: '100' }] },
        after: { process_variables: {}, entity_identifiers: [{ unique_id: 'receipt', entity_type: 'node', bundle: 'article', entity_id: '42', revision_id: '101' }] },
      },
    };
    render(<TraceSidePanel steps={steps} selectedTaskId="task1" processVariables={[]} entityIdentifiers={[]} snapshots={snapshots} traceArchiveEnabled={true} />);
    const table = screen.getByTestId('snapshot-diff-ei-table');
    expect(table).toHaveTextContent('receipt');
    expect(table).toHaveTextContent('rev 100');
    expect(table).toHaveTextContent('rev 101');
    expect(table.querySelector('.maestro-diff-updated')).not.toBeNull();
  });

  test('shows a note when only a "before" snapshot exists (task not yet completed)', () => {
    const snapshots = {
      55: {
        before: { process_variables: { foo: 'bar' }, entity_identifiers: [] },
      },
    };
    render(<TraceSidePanel steps={steps} selectedTaskId="task1" processVariables={[]} entityIdentifiers={[]} snapshots={snapshots} traceArchiveEnabled={true} />);
    expect(screen.getByTestId('snapshot-diff-no-after')).toBeInTheDocument();
  });
});
