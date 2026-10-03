import React from 'react';

interface InputPaneProps {
  value: string;
  onChange: (val: string) => void;
}

export const InputPane: React.FC<InputPaneProps> = ({ value, onChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        <span>Input (stdin)</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
          Batch input fed to program
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter standard input (stdin) here..."
        spellCheck={false}
        style={{
          flex: 1,
          width: '100%',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          resize: 'none',
          lineHeight: '1.45',
          overflowY: 'auto'
        }}
      />
    </div>
  );
};
