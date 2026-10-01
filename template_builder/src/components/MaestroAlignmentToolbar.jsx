import React from 'react';
import { useNodes, useReactFlow } from '@xyflow/react';

const GRID = 5;
const snap = v => Math.round(v / GRID) * GRID;

const BTN = {
  fontSize: 11, padding: '2px 7px', cursor: 'pointer',
  border: '1px solid #bbb', borderRadius: 3, background: '#f5f5f5',
  whiteSpace: 'nowrap', lineHeight: '18px',
};
const BTN_DISABLED = { ...BTN, opacity: 0.4, cursor: 'default' };
const SEP = { width: 1, background: '#ccc', margin: '0 4px', alignSelf: 'stretch' };

function computePositions(type, selected) {
  const nw = n => n.width  || 100;
  const nh = n => n.height ||  50;

  const minX = Math.min(...selected.map(n => n.position.x));
  const maxX = Math.max(...selected.map(n => n.position.x + nw(n)));
  const minY = Math.min(...selected.map(n => n.position.y));
  const maxY = Math.max(...selected.map(n => n.position.y + nh(n)));

  const out = {};

  if (type === 'left')
    selected.forEach(n => { out[n.id] = { x: snap(minX), y: n.position.y }; });

  else if (type === 'center-h') {
    const mid = (minX + maxX) / 2;
    selected.forEach(n => { out[n.id] = { x: snap(mid - nw(n) / 2), y: n.position.y }; });
  }

  else if (type === 'right')
    selected.forEach(n => { out[n.id] = { x: snap(maxX - nw(n)), y: n.position.y }; });

  else if (type === 'top')
    selected.forEach(n => { out[n.id] = { x: n.position.x, y: snap(minY) }; });

  else if (type === 'center-v') {
    const mid = (minY + maxY) / 2;
    selected.forEach(n => { out[n.id] = { x: n.position.x, y: snap(mid - nh(n) / 2) }; });
  }

  else if (type === 'bottom')
    selected.forEach(n => { out[n.id] = { x: n.position.x, y: snap(maxY - nh(n)) }; });

  else if (type === 'dist-h' && selected.length >= 3) {
    const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);
    const totalW = sorted.reduce((s, n) => s + nw(n), 0);
    const gap = (maxX - minX - totalW) / (sorted.length - 1);
    let x = sorted[0].position.x;
    sorted.forEach(n => { out[n.id] = { x: snap(x), y: n.position.y }; x += nw(n) + gap; });
  }

  else if (type === 'dist-v' && selected.length >= 3) {
    const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);
    const totalH = sorted.reduce((s, n) => s + nh(n), 0);
    const gap = (maxY - minY - totalH) / (sorted.length - 1);
    let y = sorted[0].position.y;
    sorted.forEach(n => { out[n.id] = { x: n.position.x, y: snap(y) }; y += nh(n) + gap; });
  }

  return out;
}

export default function MaestroAlignmentToolbar() {
  const nodes = useNodes();
  const { setNodes } = useReactFlow();
  const selected = nodes.filter(n => n.selected);

  if (selected.length < 2) return null;

  function align(type) {
    const updates = computePositions(type, selected);
    if (!Object.keys(updates).length) return;
    setNodes(nds => nds.map(n => updates[n.id] ? { ...n, position: updates[n.id] } : n));
    // Stagger saves Drupal aborts concurrent AJAX requests to the same form endpoint.
    let delay = 0;
    Object.entries(updates).forEach(([id, pos]) => {
      setTimeout(() => {
        window.MaestroReact?.saveTaskPosition(id, Math.round(pos.y), Math.round(pos.x));
      }, delay);
      delay += 400;
    });
  }

  const can3 = selected.length >= 3;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      background: '#fff', border: '1px solid #ccc', borderRadius: 4,
      padding: '4px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      fontSize: 11,
    }}>
      <span style={{ color: '#666', marginRight: 4 }}>Align:</span>
      <button type="button" style={BTN} onClick={() => align('left')}     title="Align left edges">Left</button>
      <button type="button" style={BTN} onClick={() => align('center-h')} title="Center horizontally">Center ↔</button>
      <button type="button" style={BTN} onClick={() => align('right')}    title="Align right edges">Right</button>
      <button type="button" style={BTN} onClick={() => align('top')}      title="Align top edges">Top</button>
      <button type="button" style={BTN} onClick={() => align('center-v')} title="Center vertically">Center ↕</button>
      <button type="button" style={BTN} onClick={() => align('bottom')}   title="Align bottom edges">Bottom</button>
      <div style={SEP} />
      <span style={{ color: '#666', marginRight: 4 }}>Distribute:</span>
      <button type="button" style={can3 ? BTN : BTN_DISABLED} onClick={() => can3 && align('dist-h')} title="Distribute horizontally">→ H</button>
      <button type="button" style={can3 ? BTN : BTN_DISABLED} onClick={() => can3 && align('dist-v')} title="Distribute vertically">↓ V</button>
    </div>
  );
}
