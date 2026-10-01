import React, { useState } from 'react';
import { EdgeLabelRenderer, BaseEdge, useInternalNode, getBezierPath, Position } from '@xyflow/react';

const TRAVERSED_COLOR = '#0074d9';
const REGENERATION_COLOR = '#d4e72a96';

function getNodeBorderPoint(node, toX, toY) {
  const { positionAbsolute } = node.internals;
  const w = node.measured?.width || 100;
  const h = node.measured?.height || 50;
  const cx = positionAbsolute.x + w / 2;
  const cy = positionAbsolute.y + h / 2;
  const dx = toX - cx;
  const dy = toY - cy;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };

  const taskType = node.data?.taskType;

  if (taskType === 'MaestroStart' || taskType === 'MaestroEnd') {
    // Circle rendered as cx=w/2, cy=h/2, r=h/2
    const r = h / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return { x: cx + (dx / dist) * r, y: cy + (dy / dist) * r };
  }

  if (taskType === 'MaestroIf') {
    // Diamond with vertices at (cx±s, cy) and (cx, cy±s) where s = w/2
    // Boundary: |dx| + |dy| = s  (since a = b = s for our square diamond)
    const s = w / 2;
    const sum = Math.abs(dx) + Math.abs(dy);
    const t = s / sum;
    return { x: cx + dx * t, y: cy + dy * t };
  }

  // Default: rectangle
  const hw = w / 2;
  const hh = h / 2;
  const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

function getBorderSide(node, borderX, borderY) {
  const { positionAbsolute } = node.internals;
  const w = node.measured?.width || 100;
  const h = node.measured?.height || 50;
  const cx = positionAbsolute.x + w / 2;
  const cy = positionAbsolute.y + h / 2;
  const dx = borderX - cx;
  const dy = borderY - cy;

  const taskType = node.data?.taskType;

  if (taskType === 'MaestroIf') {
    // Square diamond: |dx| vs |dy| determines side
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? Position.Right : Position.Left;
    return dy >= 0 ? Position.Bottom : Position.Top;
  }

  // Rectangle and circle: use bounding-box aspect ratio
  const hw = w / 2 || 1;
  const hh = h / 2 || 1;
  if (Math.abs(dx) / hw >= Math.abs(dy) / hh) return dx >= 0 ? Position.Right : Position.Left;
  return dy >= 0 ? Position.Bottom : Position.Top;
}

export default function MaestroEdge({ id, source, target, data }) {
  const [hovered, setHovered] = useState(false);
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const { positionAbsolute: sp } = sourceNode.internals;
  const sw = sourceNode.measured?.width || 100;
  const sh = sourceNode.measured?.height || 50;
  const { positionAbsolute: tp } = targetNode.internals;
  const tw = targetNode.measured?.width || 100;
  const th = targetNode.measured?.height || 50;

  const sourceCX = sp.x + sw / 2;
  const sourceCY = sp.y + sh / 2;
  const targetCX = tp.x + tw / 2;
  const targetCY = tp.y + th / 2;

  const start = getNodeBorderPoint(sourceNode, targetCX, targetCY);
  const end   = getNodeBorderPoint(targetNode, sourceCX, sourceCY);

  const sourcePosition = getBorderSide(sourceNode, start.x, start.y);
  const targetPosition = getBorderSide(targetNode, end.x, end.y);

  const isFalse     = data?.connectionType === 'MaestroFalse';
  const traversed   = data?.traversed;
  const regeneration = !!data?.regeneration;

  let stroke = isFalse ? '#f00' : '#000';
  let strokeWidth = 2;
  let opacity = 1;
  let strokeDasharray;
  if (traversed === true) {
    stroke = isFalse ? '#f00' : TRAVERSED_COLOR;
    strokeWidth = 4;
  } else if (traversed === false) {
    stroke = '#999';
    strokeDasharray = '6 4';
  }
  if (regeneration) {
    // Overrides the normal traversed colour -- this is the specific edge
    // whose completion caused the process to loop back into the next loop.
    stroke = REGENERATION_COLOR;
  }

  const markerId = isFalse ? 'maestro-arrow-red' : 'maestro-arrow-black';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: start.x, sourceY: start.y, sourcePosition,
    targetX: end.x,   targetY: end.y,   targetPosition,
  });

  // Only the trace viewer ever sets data.traversed to an explicit boolean;
  // the template editor leaves it undefined, so this hover affordance never
  // appears there.
  const hasTraceState = traversed === true || traversed === false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke, strokeWidth, opacity, strokeDasharray }}
        markerEnd={`url(#${markerId})`}
      />
      {hasTraceState && (
        // BaseEdge's own built-in interaction path doesn't receive event
        // handlers passed as props (they only land on the thin visible
        // path), so a wide invisible hit-area path is added here to make
        // hovering the line reliable.
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          style={{ pointerEvents: 'stroke' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      )}
      {isFalse && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 10,
              fontWeight: 'bold',
              color: '#f00',
              background: '#fff',
              borderRadius: 3,
              padding: '1px 3px',
              pointerEvents: 'none',
            }}
          >
            F
          </div>
        </EdgeLabelRenderer>
      )}
      {hasTraceState && hovered && (
        <EdgeLabelRenderer>
          <div
            className="maestro-node-tooltip maestro-edge-tooltip"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 22}px)`,
              pointerEvents: 'none',
            }}
          >
            {regeneration
              ? 'Regeneration — this step led to the next loop.'
              : traversed
                ? 'This route was taken.'
                : 'This route has not been taken (yet).'}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
