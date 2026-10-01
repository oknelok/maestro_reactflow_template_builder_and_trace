import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoopSwitcher from './LoopSwitcher.jsx';

const loops = {
  '0': { label: 'Loop 1', current: false, steps: [] },
  '1': { label: 'Loop 2', current: true, steps: [] },
};

describe('LoopSwitcher', () => {
  test('renders an option per loop, sorted numerically, current loop labelled', () => {
    render(<LoopSwitcher loops={loops} selectedLoop="1" onChange={() => {}} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Loop 1');
    expect(options[1]).toHaveTextContent('Loop 2 (current)');
  });

  test('calls onChange with the selected loop key', () => {
    const onChange = vi.fn();
    render(<LoopSwitcher loops={loops} selectedLoop="1" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('loop-switcher'), { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith('0');
  });

  test('renders nothing when there are no loops', () => {
    const { container } = render(<LoopSwitcher loops={{}} selectedLoop="0" onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
