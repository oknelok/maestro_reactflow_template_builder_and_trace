import '@testing-library/jest-dom';

// jsdom has no ResizeObserver; @xyflow/react needs one to measure nodes.
global.ResizeObserver = global.ResizeObserver || class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
