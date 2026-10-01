import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileBottomSheet from './MobileBottomSheet.jsx';

// jsdom has no PointerEvent constructor, so @testing-library's fireEvent.pointer* helpers
// fall back to `new Event(...)`, which silently drops clientY. MouseEvent does support
// clientY natively and React matches listeners by the event's `type` string, so dispatching
// MouseEvents typed as pointer events exercises the same onPointerDown/Move/Up handlers.
function firePointerEvent(node, type, clientY) {
  fireEvent(node, new MouseEvent(type, { clientY, bubbles: true, cancelable: true }));
}

function dragHandle(handle, { from, to }) {
  firePointerEvent(handle, 'pointerdown', from);
  firePointerEvent(handle, 'pointermove', to);
  firePointerEvent(handle, 'pointerup', to);
}

describe('MobileBottomSheet', () => {
  test('renders nothing when closed', () => {
    render(
      <MobileBottomSheet isOpen={false} onClose={() => {}}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    expect(screen.queryByTestId('mobile-bottom-sheet')).not.toBeInTheDocument();
  });

  test('renders children when open, starting at half height', () => {
    render(
      <MobileBottomSheet isOpen onClose={() => {}}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    expect(screen.getByText('Panel content')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-snap', 'half');
  });

  test('close button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet isOpen onClose={onClose}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    fireEvent.click(screen.getByTestId('mobile-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('expand button toggles between half and full', () => {
    render(
      <MobileBottomSheet isOpen onClose={() => {}}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    const expandButton = screen.getByTestId('mobile-sheet-expand');
    const sheet = screen.getByTestId('mobile-bottom-sheet');

    fireEvent.click(expandButton);
    expect(sheet).toHaveAttribute('data-snap', 'full');

    fireEvent.click(expandButton);
    expect(sheet).toHaveAttribute('data-snap', 'half');
  });

  test('dragging the handle up snaps to full height', () => {
    render(
      <MobileBottomSheet isOpen onClose={() => {}}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    const handle = screen.getByTestId('mobile-sheet-handle');
    dragHandle(handle, { from: 500, to: 200 });
    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-snap', 'full');
  });

  test('dragging the handle down past the close threshold closes the sheet', () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet isOpen onClose={onClose}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    const handle = screen.getByTestId('mobile-sheet-handle');
    dragHandle(handle, { from: 300, to: 600 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('re-opening the sheet resets it to half height', () => {
    const { rerender } = render(
      <MobileBottomSheet isOpen onClose={() => {}}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    fireEvent.click(screen.getByTestId('mobile-sheet-expand'));
    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-snap', 'full');

    rerender(
      <MobileBottomSheet isOpen={false} onClose={() => {}}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    rerender(
      <MobileBottomSheet isOpen onClose={() => {}}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    expect(screen.getByTestId('mobile-bottom-sheet')).toHaveAttribute('data-snap', 'half');
  });

  test('Escape key closes the sheet', () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet isOpen onClose={onClose}>
        <div>Panel content</div>
      </MobileBottomSheet>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
