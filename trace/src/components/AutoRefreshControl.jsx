import React from 'react';
import { REFRESH_INTERVALS } from '../hooks/useAutoRefresh.js';

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AutoRefreshControl({ enabled, interval, onToggle, onIntervalChange, status, processComplete }) {
  let message = '';
  if (processComplete) {
    message = 'Process complete';
  }
  else if (enabled && status.state === 'error') {
    message = `Refresh failed (${status.error}), retrying`;
  }
  else if (enabled && status.lastUpdated) {
    message = `Updated ${formatTime(status.lastUpdated)}`;
  }

  return (
    <div className="maestro-trace-autorefresh" data-testid="auto-refresh">
      <label className="maestro-trace-autorefresh-toggle">
        <input
          type="checkbox"
          data-testid="auto-refresh-toggle"
          checked={enabled}
          disabled={processComplete}
          onChange={e => onToggle(e.target.checked)}
        />
        Auto-refresh
      </label>
      <select
        data-testid="auto-refresh-interval"
        aria-label="Refresh every"
        value={interval}
        disabled={!enabled || processComplete}
        onChange={e => onIntervalChange(Number(e.target.value))}
      >
        {REFRESH_INTERVALS.map(seconds => (
          <option key={seconds} value={seconds}>every {seconds}s</option>
        ))}
      </select>
      {message && (
        <span
          className={`maestro-trace-autorefresh-status${status.state === 'error' && !processComplete ? ' is-error' : ''}`}
          data-testid="auto-refresh-status"
          role="status"
        >
          {message}
        </span>
      )}
    </div>
  );
}
