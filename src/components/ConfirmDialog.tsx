import React from 'react';
import { Tab } from '../workspace/types';

interface ConfirmDialogProps {
  tab: Tab | null;
  isRunning: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  tab,
  isRunning,
  onConfirm,
  onCancel
}) => {
  if (!tab) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
          Close tab "{tab.name}"?
        </h3>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          {isRunning
            ? 'This tab is currently running. Closing it will stop the program.'
            : 'You have unsaved changes in this tab. If you close it, your changes will be discarded.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-stop)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isRunning ? 'Stop & Close' : 'Close Tab'}
          </button>
        </div>
      </div>
    </div>
  );
};
