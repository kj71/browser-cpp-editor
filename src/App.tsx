import React, { useState, useEffect, useRef, useCallback } from 'react';
import { workspaceStore, WorkspaceState } from './workspace/workspaceStore';
import { toolchainManager } from './toolchain/toolchainManager';
import { ToolchainState } from './workspace/types';
import { TabBar } from './components/TabBar';
import { EditorPane } from './components/EditorPane';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { RunButton } from './components/RunButton';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DesktopNotice } from './components/DesktopNotice';

export const App: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceState>(workspaceStore.getState());
  const [toolchain, setToolchain] = useState<ToolchainState>(toolchainManager.getState());
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Subscribe to workspace store
  useEffect(() => {
    const unsub = workspaceStore.subscribe(setWorkspace);
    return unsub;
  }, []);

  // Initialize and subscribe to toolchain manager
  useEffect(() => {
    const unsub = toolchainManager.subscribe(setToolchain);
    toolchainManager.init();
    return unsub;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter -> Run
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        workspaceStore.runActiveTab();
      }
      // Cmd/Ctrl + . -> Stop
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        workspaceStore.stopRun();
      }
      // Alt + N -> New Tab
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        workspaceStore.createTab();
      }
      // Alt + W -> Close Tab
      if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        workspaceStore.requestCloseTab(workspace.activeTabId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspace.activeTabId]);

  // Horizontal splitter dragging (left vs right)
  const handleMouseDownH = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingH(true);
  }, []);

  // Vertical splitter dragging (input vs output)
  const handleMouseDownV = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingV(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingH && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const totalWidth = rect.width;
        let percentage = (offsetX / totalWidth) * 100;
        percentage = Math.max(20, Math.min(80, percentage));
        workspaceStore.setSplitHorizontal(percentage);
      }

      if (isDraggingV && rightPaneRef.current) {
        const rect = rightPaneRef.current.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const totalHeight = rect.height;
        let percentage = (offsetY / totalHeight) * 100;
        percentage = Math.max(15, Math.min(85, percentage));
        workspaceStore.setSplitVertical(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingH(false);
      setIsDraggingV(false);
    };

    if (isDraggingH || isDraggingV) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingH, isDraggingV]);

  const activeTab = workspace.tabs.find((t) => t.id === workspace.activeTabId) || workspace.tabs[0];
  const activeDiagnostics = workspace.diagnosticsMap[workspace.activeTabId] || [];
  const isCurrentTabRunning = workspace.runningTabId === activeTab?.id;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        userSelect: isDraggingH || isDraggingV ? 'none' : 'auto'
      }}
    >
      <DesktopNotice />

      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '46px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-blue)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              C++
            </span>
            <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>
              C++ Editor
            </span>
          </div>

          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              border: '1px solid var(--border-color)'
            }}
          >
            Clang 22 · C++20 · WebAssembly
          </span>
        </div>

        {/* Center: Run / Stop button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RunButton
            toolchainState={toolchain}
            runState={workspace.runState}
            isCurrentTabRunning={isCurrentTabRunning}
            onRun={() => workspaceStore.runActiveTab()}
            onStop={() => workspaceStore.stopRun()}
            onRetry={() => toolchainManager.retry()}
          />
        </div>

        {/* Right shortcuts / status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <a href="./about/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            About
          </a>
          <span title="Keyboard shortcut: Cmd/Ctrl+Enter">
            <kbd style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>
              Ctrl+Enter
            </kbd>{' '}
            Run
          </span>
          <span title="Keyboard shortcut: Alt+N">
            <kbd style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>
              Alt+N
            </kbd>{' '}
            New
          </span>
          <span title="Keyboard shortcut: Alt+W">
            <kbd style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>
              Alt+W
            </kbd>{' '}
            Close
          </span>
        </div>
      </header>

      {/* Main split workspace */}
      <main
        ref={containerRef}
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Left Pane: Tabs + Editor */}
        <div
          style={{
            width: `${workspace.splitHorizontal}%`,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <TabBar
            tabs={workspace.tabs}
            activeTabId={workspace.activeTabId}
            runningTabId={workspace.runningTabId}
            onSelectTab={(id) => workspaceStore.setActiveTab(id)}
            onNewTab={() => workspaceStore.createTab()}
            onCloseTab={(id) => workspaceStore.requestCloseTab(id)}
            onRenameTab={(id, name) => workspaceStore.renameTab(id, name)}
          />

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {activeTab && (
              <EditorPane
                key={activeTab.id}
                tabId={activeTab.id}
                code={activeTab.code}
                diagnostics={activeDiagnostics}
                onChange={(newCode) => workspaceStore.updateCode(activeTab.id, newCode)}
                onRunShortcut={() => workspaceStore.runActiveTab()}
                onStopShortcut={() => workspaceStore.stopRun()}
              />
            )}
          </div>
        </div>

        {/* Horizontal Splitter */}
        <div
          className={`splitter-h ${isDraggingH ? 'dragging' : ''}`}
          onMouseDown={handleMouseDownH}
        />

        {/* Right Pane: Input above Output */}
        <div
          ref={rightPaneRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Top: Input Pane */}
          <div
            style={{
              height: `${workspace.splitVertical}%`,
              overflow: 'hidden'
            }}
          >
            <InputPane
              value={workspace.input}
              onChange={(val) => workspaceStore.updateInput(val)}
            />
          </div>

          {/* Vertical Splitter */}
          <div
            className={`splitter-v ${isDraggingV ? 'dragging' : ''}`}
            onMouseDown={handleMouseDownV}
          />

          {/* Bottom: Output Pane */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden'
            }}
          >
            <OutputPane
              chunks={workspace.output}
              outputLimitExceeded={workspace.outputLimitExceeded}
              statusLine={workspace.statusLine}
              onClear={() => workspaceStore.clearOutput()}
            />
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        tab={workspace.tabToClosePending}
        isRunning={workspace.tabToClosePending ? workspace.runningTabId === workspace.tabToClosePending.id : false}
        onConfirm={() => {
          if (workspace.tabToClosePending) {
            workspaceStore.closeTab(workspace.tabToClosePending.id, true);
          }
        }}
        onCancel={() => workspaceStore.cancelCloseTab()}
      />
    </div>
  );
};
