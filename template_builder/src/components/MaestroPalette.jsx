import React from 'react';

function PaletteShape({ taskType, colour }) {
  const h = 28;
  const w = 36;
  if (taskType === 'MaestroStart' || taskType === 'MaestroEnd') {
    return (
      <svg width={h} height={h} style={{ display: 'block' }}>
        <circle cx={h / 2} cy={h / 2} r={h / 2 - 2} fill="#eee" stroke={colour} strokeWidth={2} />
      </svg>
    );
  }
  if (taskType === 'MaestroIf') {
    const cx = h / 2, cy = h / 2, s = h / 2 - 2;
    const pts = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
    return (
      <svg width={h} height={h} style={{ display: 'block' }}>
        <polygon points={pts} fill="#eee" stroke={colour} strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <rect width={w} height={h} fill="#eee" stroke={colour} strokeWidth={2} rx={4} ry={4} />
    </svg>
  );
}

export default function MaestroPalette({ settings }) {
  const { task_types = {}, maestroTaskColours = {} } = settings;

  function onDragStart(e, taskType, label) {
    e.dataTransfer.setData('application/maestro-task-type', taskType);
    e.dataTransfer.setData('application/maestro-task-label', label);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="maestro-palette">
      {Object.entries(task_types).map(([taskType, label]) => (
        <div
          key={taskType}
          className="maestro-palette-item"
          draggable
          onDragStart={e => onDragStart(e, taskType, label)}
          title={`Drag to create: ${label}`}
        >
          <PaletteShape taskType={taskType} colour={maestroTaskColours[taskType] || '#333'} />
          <span className="maestro-palette-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
