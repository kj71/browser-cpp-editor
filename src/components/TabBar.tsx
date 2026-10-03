import React, { useState } from 'react';
import { Tab } from '../workspace/types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  runningTabId: string | null;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, newName: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  runningTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onRenameTab
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const isMaxReached = tabs.length >= 5;

  const startRename = (tab: Tab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const finishRename = (id: string) => {
    if (editingName.trim()) {
      onRenameTab(id, editingName.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 8px',
        height: '38px',
        userSelect: 'none',
        overflowX: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isRunning = tab.id === runningTabId;
          const isEditing = tab.id === editingTabId;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={(e) => startRename(tab, e)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px 6px 0 0',
                backgroundColor: isActive ? 'var(--tab-active-bg)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--border-focus)' : '2px solid transparent',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.15s ease, color 0.15s ease'
              }}
              title="Double-click to rename"
            >
              {/* Running dot indicator */}
              {isRunning && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-stop-hover)',
                    boxShadow: '0 0 6px var(--accent-stop-hover)',
                    flexShrink: 0
                  }}
                  title="Program running"
                />
              )}

              {/* Tab name or inline input */}
              {isEditing ? (
                <input
                  type="text"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => finishRename(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishRename(tab.id);
                    if (e.key === 'Escape') setEditingTabId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-focus)',
                    borderRadius: '3px',
                    padding: '2px 4px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '11px',
                    width: '110px'
                  }}
                />
              ) : (
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                  {tab.name}
                </span>
              )}

              {/* Close Tab button (disabled when only 1 tab) */}
              <button
                disabled={tabs.length <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  opacity: tabs.length <= 1 ? 0.3 : 0.6,
                  cursor: tabs.length <= 1 ? 'not-allowed' : 'pointer',
                  color: 'inherit',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  if (tabs.length > 1) (e.currentTarget.style.opacity = '1');
                }}
                onMouseLeave={(e) => {
                  if (tabs.length > 1) (e.currentTarget.style.opacity = '0.6');
                }}
                title={tabs.length <= 1 ? 'At least 1 tab is always open' : 'Close tab (Alt+W)'}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* New Tab (+) Button */}
        <button
          onClick={onNewTab}
          disabled={isMaxReached}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: '4px',
            color: isMaxReached ? 'var(--text-muted)' : 'var(--text-secondary)',
            cursor: isMaxReached ? 'not-allowed' : 'pointer',
            backgroundColor: 'transparent',
            marginLeft: '4px'
          }}
          title={isMaxReached ? 'Maximum 5 tabs reached' : 'New Tab (Alt+N)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
