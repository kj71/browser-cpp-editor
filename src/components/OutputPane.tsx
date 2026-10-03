import React, { useRef, useEffect } from 'react';
import { OutputChunk, StatusLineInfo } from '../workspace/types';
import { StatusLine } from './StatusLine';

interface OutputPaneProps {
  chunks: OutputChunk[];
  outputLimitExceeded: boolean;
  statusLine: StatusLineInfo | null;
  onClear: () => void;
}

export const OutputPane: React.FC<OutputPaneProps> = ({
  chunks,
  outputLimitExceeded,
  statusLine,
  onClear
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom as output streams in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chunks, outputLimitExceeded]);

  const copyOutput = () => {
    const fullText = chunks.map(c => c.text).join('');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
    }
  };

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
      {/* Header bar */}
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
        <span>Output</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={copyOutput}
            style={{
              color: 'var(--text-secondary)',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: 'var(--bg-surface-elevated)'
            }}
            title="Copy output to clipboard"
          >
            Copy
          </button>
          <button
            onClick={onClear}
            style={{
              color: 'var(--text-secondary)',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: 'var(--bg-surface-elevated)'
            }}
            title="Clear output"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output Content */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '8px 12px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          lineHeight: '1.45'
        }}
      >
        {chunks.length === 0 && !outputLimitExceeded && !statusLine ? (
          <span style={{ color: 'var(--text-muted)' }}>Program output will appear here...</span>
        ) : (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>
            {chunks.map((chunk, index) => (
              <span
                key={index}
                style={{
                  color: chunk.type === 'stderr' ? 'var(--color-stderr)' : 'var(--color-stdout)'
                }}
              >
                {chunk.text}
              </span>
            ))}
          </pre>
        )}

        {/* Output Limit Banner */}
        {outputLimitExceeded && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              backgroundColor: 'rgba(218, 54, 51, 0.15)',
              border: '1px solid var(--color-error)',
              borderRadius: '4px',
              color: 'var(--color-error)',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            Output limit exceeded: program produced more than 1 MB of output. Output truncated.
          </div>
        )}
      </div>

      {/* Status Line */}
      <StatusLine status={statusLine} />
    </div>
  );
};
