import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TraceApp from './TraceApp.jsx';
import { MOBILE_BREAKPOINT } from './hooks/useIsMobile.js';

const settings = {
  tasks: [
    { id: 'start', type: 'MaestroStart', taskname: 'Start', left: '0', top: '0', to: ['end'], falsebranch: [''] },
    { id: 'end', type: 'MaestroEnd', taskname: 'End', left: '200', top: '0', to: [''], falsebranch: [''] },
  ],
  maestroTaskColours: { MaestroStart: '#00ff00', MaestroEnd: '#ff0000' },
  loops: { '0': { label: 'Loop 1', current: true, steps: [] } },
  defaultLoop: '0',
  processVariables: [],
  entityIdentifiers: [],
};

function setViewportWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

describe('TraceApp smoke test', () => {
  afterEach(() => {
    setViewportWidth(1024);
  });

  test('renders a task node without throwing the zustand-provider error', () => {
    expect(() => render(<TraceApp settings={settings} />)).not.toThrow();
  });

  test('desktop width renders the static side panel, not the mobile sheet', () => {
    setViewportWidth(MOBILE_BREAKPOINT + 1);
    render(<TraceApp settings={settings} />);
    expect(screen.getByTestId('step-detail-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-details-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-bottom-sheet')).not.toBeInTheDocument();
  });

  test('mobile width: tapping a node opens the bottom sheet with that step selected', () => {
    setViewportWidth(MOBILE_BREAKPOINT);
    const { container } = render(<TraceApp settings={settings} />);

    expect(screen.queryByTestId('mobile-bottom-sheet')).not.toBeInTheDocument();

    const endNode = container.querySelector('.react-flow__node[data-id="end"]');
    fireEvent.click(endNode);

    expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('step-detail-not-executed')).toBeInTheDocument();
  });

  test('mobile width: the Details button opens the sheet without a task selected', () => {
    setViewportWidth(MOBILE_BREAKPOINT);
    render(<TraceApp settings={settings} />);

    fireEvent.click(screen.getByTestId('mobile-details-button'));

    expect(screen.getByTestId('mobile-bottom-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('step-detail-empty')).toBeInTheDocument();
  });
});
