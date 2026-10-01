import React from 'react';
import { createRoot } from 'react-dom/client';
import MaestroApp from './MaestroApp.jsx';

window.MaestroReactFlowApp = {
  mount(container, settings) {
    if (container._maestroRoot) {
      return container._maestroRoot;
    }
    const root = createRoot(container);
    root.render(React.createElement(MaestroApp, { settings }));
    container._maestroRoot = root;
    return root;
  },
};
