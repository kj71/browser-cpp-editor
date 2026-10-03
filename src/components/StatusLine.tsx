import React from 'react';
import { StatusLineInfo } from '../workspace/types';

interface StatusLineProps {
  status: StatusLineInfo | null;
}

export const StatusLine: React.FC<StatusLineProps> = ({ status }) => {
  if (!status) return null;

  let text = '';
  let color = 'var(--text-secondary)';

  switch (status.type) {
    case 'exit': {
      const codeStr = status.code !== undefined ? status.code : 0;
      const durationStr = status.durationSeconds !== undefined ? `${status.durationSeconds.toFixed(2)} s` : '0.00 s';
      text = `Exited with code ${codeStr} · ${durationStr}`;
      color = codeStr === 0 ? 'var(--color-success)' : 'var(--color-error)';
      break;
    }
    case 'stopped':
      text = 'Stopped by user';
      color = 'var(--color-warning)';
      break;
    case 'limit':
      text = 'Output limit exceeded';
      color = 'var(--color-error)';
      break;
    case 'compilation_error':
      text = 'Compilation failed';
      color = 'var(--color-error)';
      break;
    case 'runtime_error':
      text = `Runtime error: ${status.message || 'Trap occurred'}`;
      color = 'var(--color-error)';
      break;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        backgroundColor: 'var(--bg-surface-elevated)',
        borderTop: '1px solid var(--border-color)',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block'
        }}
      />
      <span>{text}</span>
    </div>
  );
};
