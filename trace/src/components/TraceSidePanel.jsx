import React from 'react';
import { latestStepByTaskId, diffProcessVariables, diffEntityIdentifiers, TASK_STATUS_ACTIVE } from '../utils/traceConverters.js';

function DiffValue({ value }) {
  if (value === undefined || value === null || value === '') {
    return <span className="maestro-diff-empty">—</span>;
  }
  return String(value);
}

function ProcessVariablesDiff({ before, after }) {
  const rows = diffProcessVariables(before, after);
  if (rows.length === 0) {
    return <p data-testid="snapshot-diff-pv-empty">No process variables were set at this point.</p>;
  }
  return (
    <table data-testid="snapshot-diff-pv-table">
      <thead>
        <tr><th>Name</th><th>Before</th><th>After</th></tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.name} className={`maestro-diff-row maestro-diff-${row.status}`}>
            <td>{row.name}</td>
            <td><DiffValue value={row.before} /></td>
            <td><DiffValue value={row.after} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EntityIdentifiersDiff({ before, after }) {
  const rows = diffEntityIdentifiers(before, after);
  if (rows.length === 0) {
    return <p data-testid="snapshot-diff-ei-empty">No entity identifiers were set at this point.</p>;
  }
  return (
    <table data-testid="snapshot-diff-ei-table">
      <thead>
        <tr><th>Unique ID</th><th>Before (entity / revision)</th><th>After (entity / revision)</th></tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.unique_id} className={`maestro-diff-row maestro-diff-${row.status}`}>
            <td>{row.unique_id}</td>
            <td>{row.before ? `${row.before.entity_type}/${row.before.entity_id}${row.before.revision_id ? ` (rev ${row.before.revision_id})` : ''}` : <DiffValue value={null} />}</td>
            <td>{row.after ? `${row.after.entity_type}/${row.after.entity_id}${row.after.revision_id ? ` (rev ${row.after.revision_id})` : ''}` : <DiffValue value={null} />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TraceSidePanel({ steps, selectedTaskId, processVariables, entityIdentifiers, snapshots, traceArchiveEnabled }) {
  const selectedStep = latestStepByTaskId(steps)[selectedTaskId] || null;
  const snapshot = selectedStep ? (snapshots || {})[selectedStep.queue_id] : null;

  return (
    <div className="maestro-trace-side-panel">
      <div className="maestro-trace-step-detail">
        <h3>Step Detail</h3>
        {selectedStep ? (
          <table data-testid="step-detail-table">
            <tbody>
              <tr><th>Task</th><td>{selectedStep.task_label}</td></tr>
              <tr><th>Status</th><td>{selectedStep.status_label}</td></tr>
              <tr><th>Started</th><td>{selectedStep.started_date_formatted || 'Not started'}</td></tr>
              <tr><th>Completed</th><td>{selectedStep.completed_formatted}</td></tr>
              <tr><th>Completed By</th><td>{selectedStep.status === TASK_STATUS_ACTIVE ? 'Not yet completed' : selectedStep.owner}</td></tr>
            </tbody>
          </table>
        ) : selectedTaskId ? (
          <p data-testid="step-detail-not-executed">This task has not been executed.</p>
        ) : (
          <p data-testid="step-detail-empty">Click a task to see its details.</p>
        )}
      </div>

      {traceArchiveEnabled && selectedStep && (
        <div className="maestro-trace-snapshot-diff">
          <h3>Changes During This Step</h3>
          {snapshot ? (
            <>
              <h4>Process Variables</h4>
              <ProcessVariablesDiff before={snapshot.before?.process_variables} after={snapshot.after?.process_variables} />
              <h4>Entity Identifiers</h4>
              <EntityIdentifiersDiff before={snapshot.before?.entity_identifiers} after={snapshot.after?.entity_identifiers} />
              {!snapshot.after && (
                <p data-testid="snapshot-diff-no-after" className="maestro-diff-note">
                  No "after" snapshot yet — this task hasn't completed.
                </p>
              )}
            </>
          ) : selectedStep.status === TASK_STATUS_ACTIVE ? (
            <p data-testid="snapshot-diff-active">This task is still active — no snapshot yet.</p>
          ) : (
            <p data-testid="snapshot-diff-unavailable">No snapshot data was captured for this step.</p>
          )}
        </div>
      )}

      <div className="maestro-trace-process-variables">
        <h3>Process Variables</h3>
        <table data-testid="process-variables-table">
          <thead>
            <tr><th>Name</th><th>Value</th></tr>
          </thead>
          <tbody>
            {(processVariables || []).map(pv => (
              <tr key={pv.id}>
                <td>{pv.variable_name}</td>
                <td>{pv.variable_value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="maestro-trace-entity-identifiers">
        <h3>Entity Identifiers</h3>
        <table data-testid="entity-identifiers-table">
          <thead>
            <tr><th>Unique ID</th><th>Entity Type</th><th>Bundle</th><th>Entity ID</th></tr>
          </thead>
          <tbody>
            {(entityIdentifiers || []).map((ei, index) => (
              <tr key={index}>
                <td>{ei.unique_id}</td>
                <td>{ei.entity_type}</td>
                <td>{ei.bundle}</td>
                <td>{ei.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
