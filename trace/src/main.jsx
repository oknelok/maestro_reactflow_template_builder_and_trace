import React from 'react';
import { createRoot } from 'react-dom/client';
import TraceApp from './TraceApp.jsx';

window.MaestroTraceViewerApp = window.MaestroTraceViewerApp || {};

window.MaestroTraceViewerApp.mount = function (container, settings) {
  if (container._maestroTraceRoot) {
    return container._maestroTraceRoot;
  }
  const root = createRoot(container);
  root.render(<TraceApp settings={settings} />);
  container._maestroTraceRoot = root;
  return root;
};
