import React, { useState } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';

const MENU_ITEMS = [
  { key: 'maestro_template_edit',            label: 'Edit Task',          action: 'editTask' },
  { key: 'maestro_template_drawlineto',      label: 'Draw Line To',       action: 'triggerDrawLineTo' },
  { key: 'maestro_template_drawfalselineto', label: 'Draw False Line To', action: 'triggerDrawFalseLineTo' },
  { key: 'maestro_template_removelines',     label: 'Remove Lines',       action: 'triggerRemoveLines' },
  { key: 'maestro_template_remove',          label: 'Remove Task',        action: 'triggerRemoveTask' },
];

const HANDLE_STYLE = { background: 'transparent', border: 'none', width: 8, height: 8 };

export default function TaskNode({ id, data }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { taskType, taskName, longTaskName, colour, capabilities, workflowStatusNumber, workflowStatusMessage, statusFill, statusLabel, width = 100, height = 50 } = data;
  const stroke = colour || '#333';
  const fill = statusFill || '#eee';
  const taskId = id;

  function renderShape() {
    if (taskType === 'MaestroStart' || taskType === 'MaestroEnd') {
      return (
        <circle cx={width / 2} cy={height / 2} r={height / 2} fill={fill} stroke={stroke} strokeWidth={2} />
      );
    }
    if (taskType === 'MaestroIf') {
      const cx = width / 2, cy = height / 2, s = width / 2;
      const pts = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={2} />;
    }
    return <rect width={width} height={height} fill={fill} stroke={stroke} strokeWidth={2} rx={10} ry={10} />;
  }

  function handleMenuClick(action) {
    setMenuOpen(false);
    window.MaestroReact?.[action]?.(taskId);
  }

  const visibleItems = MENU_ITEMS.filter(item => (capabilities || []).includes(item.key));

  return (
    <>
      <NodeToolbar isVisible={hovered && !menuOpen} position={Position.Bottom} offset={6}>
        <div className="maestro-node-tooltip">
          <div className="maestro-node-tooltip-name">{longTaskName || taskName}</div>
          {statusLabel && (
            <div className="maestro-node-tooltip-meta">Status: {statusLabel}</div>
          )}
          <div className="maestro-node-tooltip-meta">ID: {id}</div>
          <div className="maestro-node-tooltip-meta">Type: {taskType?.replace('Maestro', '') || taskType}</div>
          {workflowStatusNumber && (
            <div className="maestro-node-tooltip-meta">Stage {workflowStatusNumber}{workflowStatusMessage ? `: ${workflowStatusMessage}` : ''}</div>
          )}
        </div>
      </NodeToolbar>

      <NodeToolbar isVisible={menuOpen} position={Position.Top}>
        <div className="maestro-node-menu">
          {visibleItems.map(item => (
            <button type="button" key={item.key} className="maestro-node-menu-btn" onClick={() => handleMenuClick(item.action)}>
              {item.label}
            </button>
          ))}
        </div>
      </NodeToolbar>

      <div
        style={{ position: 'relative', width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="maestro-hamburger"
          style={{ position: 'absolute', top: -10, left: 4, zIndex: 10, cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20">
            <rect width="20" height="20" fill="#fff" stroke="#333" rx="3" />
            {[0, 1, 2].map(i => (
              <rect key={i} x="4" y={4 + i * 5} width="12" height="2" fill="#555" />
            ))}
          </svg>
        </div>

        <svg width={width} height={height} overflow="visible">
          {renderShape()}
          <text
            x={width / 2} y={height / 2}
            textAnchor="middle" dominantBaseline="middle"
            fontFamily="Arial, sans-serif" fontSize="12" fill="#333"
            pointerEvents="none"
          >
            {taskName}
          </text>
          {workflowStatusNumber && (
            <>
              <rect
                x={width - 27} y={height - 14}
                width={26} height={14}
                fill="#909090" stroke="#ccc" strokeWidth={1} rx={6} ry={6}
              />
              <text
                x={width - 14} y={height - 7}
                textAnchor="middle" dominantBaseline="middle"
                fontFamily="Arial, sans-serif" fontSize="10" fill="#333"
              >
                <title>{workflowStatusMessage}</title>
                {workflowStatusNumber}
              </text>
            </>
          )}
        </svg>

        <Handle
          type="source"
          position={Position.Left}
          isConnectable={false}
          style={{ ...HANDLE_STYLE, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }}
        />
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          style={{ ...HANDLE_STYLE, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }}
        />
      </div>
    </>
  );
}
