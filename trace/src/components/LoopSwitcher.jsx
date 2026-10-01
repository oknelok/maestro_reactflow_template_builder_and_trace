import React from 'react';

export default function LoopSwitcher({ loops, selectedLoop, onChange }) {
  const keys = Object.keys(loops || {}).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) {
    return null;
  }
  return (
    <select
      data-testid="loop-switcher"
      value={selectedLoop}
      onChange={e => onChange(e.target.value)}
    >
      {keys.map(key => (
        <option key={key} value={key}>
          {loops[key].label}{loops[key].current ? ' (current)' : ''}
        </option>
      ))}
    </select>
  );
}
