import React from 'react';
import { ToolchainState, RunState } from '../workspace/types';

interface RunButtonProps {
  toolchainState: ToolchainState;
  runState: RunState;
  isCurrentTabRunning: boolean;
  onRun: () => void;
  onStop: () => void;
  onRetry: () => void;
}

export const RunButton: React.FC<RunButtonProps> = ({
  toolchainState,
  runState,
  isCurrentTabRunning,
  onRun,
  onStop,
  onRetry
}) => {
  // 1. Toolchain downloading
  if (toolchainState.status === 'downloading') {
    return (
      <button
        disabled
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '6px',
          backgroundColor: '#21262d',
          color: '#8b949e',
          cursor: 'not-allowed',
          fontSize: '12px',
          fontWeight: 500,
          border: '1px solid #30363d'
        }}
        title={`Downloading C++ toolchain: ${toolchainState.progress}%`}
      >
        <span
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: '2px solid #58a6ff',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }}
        />
        Downloading compiler… {toolchainState.progress}%
      </button>
    );
  }

  // 2. Toolchain preparing
  if (toolchainState.status === 'preparing') {
    return (
      <button
        disabled
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '6px',
          backgroundColor: '#21262d',
          color: '#8b949e',
          cursor: 'not-allowed',
          fontSize: '12px',
          fontWeight: 500,
          border: '1px solid #30363d'
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: '2px solid #58a6ff',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }}
        />
        Preparing compiler…
      </button>
    );
  }

  // 3. Toolchain failed
  if (toolchainState.status === 'failed') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--color-error)', fontSize: '12px' }} title={toolchainState.error}>
          Compiler download failed
        </span>
        <button
          onClick={onRetry}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: '#21262d',
            color: 'var(--text-primary)',
            fontSize: '12px',
            border: '1px solid var(--border-color)',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // 4. Currently running / compiling
  if (runState !== 'idle') {
    return (
      <button
        onClick={onStop}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '6px',
          backgroundColor: isCurrentTabRunning ? 'var(--accent-stop)' : 'var(--accent-stop)',
          opacity: isCurrentTabRunning ? 1 : 0.85,
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '12px',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          transition: 'background-color 0.15s ease'
        }}
        title="Stop running program (Ctrl+. or Cmd+.)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
        Stop
      </button>
    );
  }

  // 5. Toolchain Ready & Idle -> Run button
  const isReady = toolchainState.status === 'ready';

  return (
    <button
      onClick={onRun}
      disabled={!isReady}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '6px',
        backgroundColor: isReady ? 'var(--accent-primary)' : '#21262d',
        color: isReady ? '#ffffff' : '#8b949e',
        fontWeight: 600,
        fontSize: '12px',
        cursor: isReady ? 'pointer' : 'not-allowed',
        boxShadow: isReady ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
        transition: 'background-color 0.15s ease'
      }}
      title="Run active C++ program (Ctrl+Enter or Cmd+Enter)"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      Run
    </button>
  );
};
