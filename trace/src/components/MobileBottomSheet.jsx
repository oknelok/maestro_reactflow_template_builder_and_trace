import React, { useEffect, useRef, useState } from 'react';

const SNAP_HALF_VH = 50;
const SNAP_FULL_VH = 92;
const MIN_HEIGHT_VH = 15;
const CLOSE_THRESHOLD_VH = 25;

function ChevronIcon({ direction }) {
  const points = direction === 'up' ? '4,11 10,5 16,11' : '4,5 10,11 16,5';
  return (
    <svg width="16" height="16" viewBox="0 0 20 16" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MobileBottomSheet({ isOpen, onClose, children }) {
  const [snap, setSnap] = useState('half');
  const [dragHeightVh, setDragHeightVh] = useState(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSnap('half');
      setDragHeightVh(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const toVh = (px) => (px / window.innerHeight) * 100;

  const handlePointerDown = (event) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture isn't implemented in every test/runtime environment; dragging still
      // works without it as long as the pointer stays over the handle.
    }
    dragStateRef.current = {
      startY: event.clientY,
      startHeightVh: snap === 'full' ? SNAP_FULL_VH : SNAP_HALF_VH,
    };
  };

  const handlePointerMove = (event) => {
    if (!dragStateRef.current) {
      return;
    }
    const deltaVh = toVh(dragStateRef.current.startY - event.clientY);
    const nextVh = Math.min(
      SNAP_FULL_VH,
      Math.max(MIN_HEIGHT_VH, dragStateRef.current.startHeightVh + deltaVh)
    );
    setDragHeightVh(nextVh);
  };

  const endDrag = () => {
    if (!dragStateRef.current) {
      return;
    }
    const finalHeightVh = dragHeightVh ?? dragStateRef.current.startHeightVh;
    dragStateRef.current = null;
    setDragHeightVh(null);

    if (finalHeightVh < CLOSE_THRESHOLD_VH) {
      onClose();
      return;
    }
    const distanceToHalf = Math.abs(finalHeightVh - SNAP_HALF_VH);
    const distanceToFull = Math.abs(finalHeightVh - SNAP_FULL_VH);
    setSnap(distanceToFull < distanceToHalf ? 'full' : 'half');
  };

  const heightVh = dragHeightVh ?? (snap === 'full' ? SNAP_FULL_VH : SNAP_HALF_VH);
  const isDragging = dragHeightVh !== null;

  return (
    <div className="maestro-bottom-sheet-backdrop" data-testid="mobile-sheet-backdrop">
      <div
        className={`maestro-bottom-sheet maestro-bottom-sheet--${snap}`}
        role="dialog"
        aria-label="Step details"
        data-testid="mobile-bottom-sheet"
        data-snap={snap}
        style={{ height: `${heightVh}vh`, transition: isDragging ? 'none' : undefined }}
      >
        <div
          className="maestro-bottom-sheet-handle"
          data-testid="mobile-sheet-handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
        <div className="maestro-bottom-sheet-header">
          <button
            type="button"
            className="maestro-bottom-sheet-expand"
            aria-label={snap === 'full' ? 'Collapse' : 'Expand'}
            data-testid="mobile-sheet-expand"
            onClick={() => setSnap((current) => (current === 'full' ? 'half' : 'full'))}
          >
            <ChevronIcon direction={snap === 'full' ? 'down' : 'up'} />
          </button>
          <button
            type="button"
            className="maestro-bottom-sheet-close"
            aria-label="Close"
            data-testid="mobile-sheet-close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="maestro-bottom-sheet-body">{children}</div>
      </div>
    </div>
  );
}
