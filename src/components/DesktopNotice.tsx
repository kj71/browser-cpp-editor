import React, { useState, useEffect } from 'react';

export const DesktopNotice: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 800);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  if (!isNarrow || dismissed) return null;

  return (
    <div
      style={{
        backgroundColor: '#1f242c',
        borderBottom: '1px solid var(--border-color)',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        zIndex: 50
      }}
    >
      <span>
        💻 <strong>Notice:</strong> This C++ code editor is designed and best experienced on desktop browsers.
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          color: 'var(--text-muted)',
          fontSize: '11px',
          padding: '2px 6px',
          cursor: 'pointer'
        }}
        title="Dismiss notice"
      >
        Dismiss ✕
      </button>
    </div>
  );
};
