import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TraceApp from './TraceApp.jsx';

const tasks = [
  { id: 'start', type: 'MaestroStart', taskname: 'Start', left: '0', top: '0', to: ['end'], falsebranch: [''] },
  { id: 'end', type: 'MaestroEnd', taskname: 'End', left: '200', top: '0', to: [''], falsebranch: [''] },
];

function traceData(overrides = {}) {
  return {
    processName: 'Test process',
    processComplete: false,
    tasks,
    maestroTaskColours: { MaestroStart: '#00ff00', MaestroEnd: '#ff0000' },
    loops: { '0': { label: 'Loop 1', current: true, steps: [] } },
    defaultLoop: '0',
    processVariables: [],
    entityIdentifiers: [],
    ...overrides,
  };
}

const settings = { ...traceData(), refreshUrl: '/maestro/trace/7/visual/data' };

function mockFetchOnce(body, ok = true, status = 200) {
  global.fetch.mockResolvedValueOnce({ ok, status, json: async () => body });
}

// Lets the fetch promise and the React state update settle.
async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('Auto-refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
    window.localStorage.clear();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete global.fetch;
  });

  test('is not shown when the page gives no refresh URL', () => {
    const { refreshUrl, ...withoutUrl } = settings;
    render(<TraceApp settings={withoutUrl} />);
    expect(screen.queryByTestId('auto-refresh')).not.toBeInTheDocument();
  });

  test('is off by default and fetches nothing', async () => {
    render(<TraceApp settings={settings} />);
    expect(screen.getByTestId('auto-refresh-toggle')).not.toBeChecked();
    expect(screen.getByTestId('auto-refresh-interval')).toBeDisabled();
    await flush(60000);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('switching it on fetches straight away, then every interval, until switched off', async () => {
    mockFetchOnce(traceData());
    mockFetchOnce(traceData());
    render(<TraceApp settings={settings} />);

    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/maestro/trace/7/visual/data', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }));
    expect(screen.getByTestId('auto-refresh-status')).toHaveTextContent(/^Updated /);

    // Default interval is 10 seconds.
    await flush(9000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await flush(1000);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    await flush(60000);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('uses the chosen interval', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => traceData() });
    render(<TraceApp settings={settings} />);
    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    fireEvent.change(screen.getByTestId('auto-refresh-interval'), { target: { value: '30' } });
    await flush();
    const callsAfterChange = global.fetch.mock.calls.length;
    await flush(29000);
    expect(global.fetch).toHaveBeenCalledTimes(callsAfterChange);
    await flush(1000);
    expect(global.fetch).toHaveBeenCalledTimes(callsAfterChange + 1);
  });

  test('remembers the choice for the next visit', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => traceData() });
    const first = render(<TraceApp settings={settings} />);
    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    fireEvent.change(screen.getByTestId('auto-refresh-interval'), { target: { value: '5' } });
    first.unmount();

    render(<TraceApp settings={settings} />);
    expect(screen.getByTestId('auto-refresh-toggle')).toBeChecked();
    expect(screen.getByTestId('auto-refresh-interval')).toHaveValue('5');
  });

  test('shows a failed refresh and keeps trying', async () => {
    mockFetchOnce({}, false, 403);
    mockFetchOnce(traceData());
    render(<TraceApp settings={settings} />);
    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    await flush();
    expect(screen.getByTestId('auto-refresh-status')).toHaveTextContent('Refresh failed (HTTP 403), retrying');
    await flush(10000);
    expect(screen.getByTestId('auto-refresh-status')).toHaveTextContent(/^Updated /);
  });

  test('stops once the process is complete', async () => {
    mockFetchOnce(traceData({ processComplete: true }));
    render(<TraceApp settings={settings} />);
    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    await flush();
    expect(screen.getByTestId('auto-refresh-status')).toHaveTextContent('Process complete');
    expect(screen.getByTestId('auto-refresh-toggle')).toBeDisabled();
    await flush(60000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('does not start at all for a process that is already complete', async () => {
    window.localStorage.setItem('maestroTraceAutoRefresh', JSON.stringify({ enabled: true, interval: 5 }));
    render(<TraceApp settings={{ ...settings, processComplete: true }} />);
    await flush(60000);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('auto-refresh-status')).toHaveTextContent('Process complete');
  });

  test('follows a new current loop, but keeps a loop the user picked', async () => {
    const twoLoops = {
      '0': { label: 'Loop 1', current: false, steps: [] },
      '1': { label: 'Loop 2', current: true, steps: [] },
    };
    const threeLoops = { ...twoLoops, '1': { ...twoLoops['1'], current: false }, '2': { label: 'Loop 3', current: true, steps: [] } };

    // Watching the current loop: follows it to the new one.
    mockFetchOnce(traceData({ loops: threeLoops, defaultLoop: '2' }));
    const first = render(<TraceApp settings={{ ...settings, loops: twoLoops, defaultLoop: '1' }} />);
    expect(screen.getByTestId('loop-switcher')).toHaveValue('1');
    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    await flush();
    expect(screen.getByTestId('loop-switcher')).toHaveValue('2');
    first.unmount();

    // Looking at an older loop on purpose: stays there.
    window.localStorage.clear();
    mockFetchOnce(traceData({ loops: threeLoops, defaultLoop: '2' }));
    render(<TraceApp settings={{ ...settings, loops: twoLoops, defaultLoop: '1' }} />);
    fireEvent.change(screen.getByTestId('loop-switcher'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    await flush();
    expect(screen.getByTestId('loop-switcher')).toHaveValue('0');
  });

  test('skips refreshing while the browser tab is hidden', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    render(<TraceApp settings={settings} />);
    fireEvent.click(screen.getByTestId('auto-refresh-toggle'));
    await flush(60000);
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => traceData() });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await flush(10000);
    expect(global.fetch).toHaveBeenCalled();
  });
});
