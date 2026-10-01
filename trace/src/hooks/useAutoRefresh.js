import { useEffect, useRef, useState } from 'react';

// Seconds between refreshes offered in the toolbar.
export const REFRESH_INTERVALS = [5, 10, 30, 60];
export const DEFAULT_INTERVAL = 10;

// The on/off choice and interval are remembered per browser, for every trace.
const STORAGE_KEY = 'maestroTraceAutoRefresh';

export function loadAutoRefreshPreference() {
  const fallback = { enabled: false, interval: DEFAULT_INTERVAL };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') {
      return fallback;
    }
    return {
      enabled: saved.enabled === true,
      interval: REFRESH_INTERVALS.includes(saved.interval) ? saved.interval : DEFAULT_INTERVAL,
    };
  }
  catch (e) {
    // Storage can be unavailable (private windows, blocked site data).
    return fallback;
  }
}

export function saveAutoRefreshPreference(preference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  }
  catch (e) {
    // Not being able to remember the choice is harmless.
  }
}

/**
 * Re-fetches the trace data from `url` every `intervalSeconds` while enabled.
 *
 * Fetches once straight away when switched on, skips a round while the browser
 * tab is hidden, and does nothing once `stopped` (the process is complete).
 * Each successful response is passed to `onData`.
 *
 * @return {{state: string, lastUpdated: ?Date, error: ?string}}
 *   state is 'idle', 'ok' or 'error'.
 */
export default function useAutoRefresh({ url, enabled, intervalSeconds, stopped, onData }) {
  const [status, setStatus] = useState({ state: 'idle', lastUpdated: null, error: null });
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (!enabled || stopped || !url) {
      return undefined;
    }
    let cancelled = false;
    let timer = null;
    let controller = null;

    const schedule = () => {
      if (!cancelled) {
        timer = setTimeout(tick, intervalSeconds * 1000);
      }
    };

    async function tick() {
      if (document.visibilityState === 'hidden') {
        schedule();
        return;
      }
      controller = new AbortController();
      try {
        const response = await fetch(url, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (cancelled) {
          return;
        }
        onDataRef.current(data);
        setStatus({ state: 'ok', lastUpdated: new Date(), error: null });
      }
      catch (e) {
        if (cancelled || e.name === 'AbortError') {
          return;
        }
        setStatus(previous => ({ ...previous, state: 'error', error: e.message }));
      }
      schedule();
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [url, enabled, intervalSeconds, stopped]);

  return status;
}
