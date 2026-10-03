import {
  Tab,
  OutputChunk,
  StatusLineInfo,
  DiagnosticItem,
  RunState,
  DEFAULT_HELLO_WORLD
} from './types';
import { loadWorkspace, saveWorkspace, debounce } from './persistence';
import { runController } from '../runner/runController';

export interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string;
  input: string;
  output: OutputChunk[];
  outputLimitExceeded: boolean;
  statusLine: StatusLineInfo | null;
  splitHorizontal: number;
  splitVertical: number;
  runState: RunState;
  runningTabId: string | null;
  diagnosticsMap: Record<string, DiagnosticItem[]>;
  tabToClosePending: Tab | null;
}

export type WorkspaceListener = (state: WorkspaceState) => void;

export class WorkspaceStore {
  private state: WorkspaceState;
  private listeners = new Set<WorkspaceListener>();
  private debouncedSave: () => void;

  constructor() {
    const persisted = loadWorkspace();
    this.state = {
      tabs: persisted.tabs,
      activeTabId: persisted.activeTabId,
      input: persisted.input,
      output: [],
      outputLimitExceeded: false,
      statusLine: null,
      splitHorizontal: persisted.splitHorizontal,
      splitVertical: persisted.splitVertical,
      runState: 'idle',
      runningTabId: null,
      diagnosticsMap: {},
      tabToClosePending: null
    };

    this.debouncedSave = debounce(() => {
      // Never persist an empty tabs array
      if (this.state.tabs.length === 0) return;
      saveWorkspace({
        version: 1,
        tabs: this.state.tabs.map(t => ({ id: t.id, name: t.name, code: t.code })),
        activeTabId: this.state.activeTabId,
        input: this.state.input,
        splitHorizontal: this.state.splitHorizontal,
        splitVertical: this.state.splitVertical
      });
    }, 400);
  }

  getState(): WorkspaceState {
    return this.state;
  }

  subscribe(listener: WorkspaceListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setActiveTab(id: string): void {
    if (this.state.tabs.some(t => t.id === id)) {
      this.state = { ...this.state, activeTabId: id };
      this.debouncedSave();
      this.notify();
    }
  }

  createTab(): boolean {
    if (this.state.tabs.length >= 5) {
      return false; // Max 5 tabs reached
    }

    // Determine next untitled number
    let nextNum = 1;
    const existingNums = this.state.tabs
      .map(t => {
        const m = t.name.match(/^untitled-(\d+)\.cpp$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);

    while (existingNums.includes(nextNum)) {
      nextNum++;
    }

    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `untitled-${nextNum}.cpp`,
      code: DEFAULT_HELLO_WORLD
    };

    const newTabs = [...this.state.tabs, newTab];
    this.state = {
      ...this.state,
      tabs: newTabs,
      activeTabId: newTab.id
    };

    this.debouncedSave();
    this.notify();
    return true;
  }

  renameTab(id: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;

    this.state = {
      ...this.state,
      tabs: this.state.tabs.map(t => (t.id === id ? { ...t, name: trimmed } : t))
    };
    this.debouncedSave();
    this.notify();
  }

  requestCloseTab(id: string): void {
    if (this.state.tabs.length <= 1) {
      // At least 1 Tab is always open — do nothing
      return;
    }

    const tab = this.state.tabs.find(t => t.id === id);
    if (!tab) return;

    const isRunning = this.state.runningTabId === id;
    const isNonEmpty = tab.code.trim() !== '' && tab.code.trim() !== DEFAULT_HELLO_WORLD.trim();

    if (isRunning || isNonEmpty) {
      // Need confirmation dialog
      this.state = { ...this.state, tabToClosePending: tab };
      this.notify();
    } else {
      // Safe to close immediately (empty or unmodified default hello-world)
      this.closeTab(id, true);
    }
  }

  cancelCloseTab(): void {
    this.state = { ...this.state, tabToClosePending: null };
    this.notify();
  }

  closeTab(id: string, _confirmed = false): boolean {
    // Always enforce minimum 1 tab
    if (this.state.tabs.length <= 1) {
      this.state = { ...this.state, tabToClosePending: null };
      this.notify();
      return false;
    }

    const tabIndex = this.state.tabs.findIndex(t => t.id === id);
    if (tabIndex === -1) {
      this.state = { ...this.state, tabToClosePending: null };
      this.notify();
      return false;
    }

    // If closing running tab, stop it
    if (this.state.runningTabId === id) {
      runController.stop({
        onStateChange: (state) => this.setRunState(state, null),
        onStatusLine: (status) => this.setStatusLine(status)
      });
    }

    // Remove only the selected entry. Persistence sanitizes duplicate IDs,
    // but removing by index also keeps the workspace non-empty if state was
    // modified or hydrated from an older/corrupt source.
    const newTabs = this.state.tabs.slice();
    newTabs.splice(tabIndex, 1);
    if (newTabs.length === 0) {
      // Keep the core workspace invariant even if a future caller bypasses
      // the minimum-tab guard above.
      return false;
    }
    let newActiveTabId = this.state.activeTabId;

    if (this.state.activeTabId === id) {
      const nextIndex = Math.min(tabIndex, newTabs.length - 1);
      newActiveTabId = newTabs[nextIndex].id;
    }

    // Clean up diagnostics
    const nextDiagnostics = { ...this.state.diagnosticsMap };
    delete nextDiagnostics[id];

    this.state = {
      ...this.state,
      tabs: newTabs,
      activeTabId: newActiveTabId,
      runningTabId: this.state.runningTabId === id ? null : this.state.runningTabId,
      runState: this.state.runningTabId === id ? 'idle' : this.state.runState,
      tabToClosePending: null,
      diagnosticsMap: nextDiagnostics
    };

    this.debouncedSave();
    this.notify();
    return true;
  }


  updateCode(id: string, newCode: string): void {
    this.state = {
      ...this.state,
      tabs: this.state.tabs.map(t => (t.id === id ? { ...t, code: newCode } : t))
    };
    this.debouncedSave();
    this.notify();
  }

  updateInput(newInput: string): void {
    this.state = {
      ...this.state,
      input: newInput
    };
    this.debouncedSave();
    this.notify();
  }

  setSplitHorizontal(ratio: number): void {
    this.state = { ...this.state, splitHorizontal: ratio };
    this.debouncedSave();
    this.notify();
  }

  setSplitVertical(ratio: number): void {
    this.state = { ...this.state, splitVertical: ratio };
    this.debouncedSave();
    this.notify();
  }

  clearOutput(): void {
    this.state = {
      ...this.state,
      output: [],
      outputLimitExceeded: false,
      statusLine: null
    };
    this.notify();
  }

  appendOutputChunk(chunk: OutputChunk): void {
    this.state = {
      ...this.state,
      output: [...this.state.output, chunk]
    };
    this.notify();
  }

  setOutputLimitExceeded(): void {
    this.state = {
      ...this.state,
      outputLimitExceeded: true
    };
    this.notify();
  }

  setStatusLine(status: StatusLineInfo | null): void {
    this.state = {
      ...this.state,
      statusLine: status
    };
    this.notify();
  }

  setRunState(runState: RunState, runningTabId: string | null = null): void {
    this.state = {
      ...this.state,
      runState,
      runningTabId: runState === 'idle' ? null : (runningTabId !== undefined ? runningTabId : this.state.runningTabId)
    };
    this.notify();
  }

  setDiagnostics(tabId: string, items: DiagnosticItem[]): void {
    this.state = {
      ...this.state,
      diagnosticsMap: {
        ...this.state.diagnosticsMap,
        [tabId]: items
      }
    };
    this.notify();
  }

  runActiveTab(): void {
    if (this.state.runState !== 'idle') return;

    const activeTab = this.state.tabs.find(t => t.id === this.state.activeTabId);
    if (!activeTab) return;

    this.setRunState('compiling', activeTab.id);

    runController.run(activeTab.id, activeTab.code, this.state.input, {
      onStateChange: (state) => {
        this.setRunState(state, state === 'idle' ? null : activeTab.id);
      },
      onClearOutput: () => this.clearOutput(),
      onOutputChunk: (chunk) => this.appendOutputChunk(chunk),
      onOutputLimitExceeded: () => this.setOutputLimitExceeded(),
      onStatusLine: (status) => this.setStatusLine(status),
      onDiagnostics: (tabId, diagnostics) => this.setDiagnostics(tabId, diagnostics)
    });
  }

  stopRun(): void {
    if (this.state.runState === 'idle') return;
    runController.stop({
      onStateChange: (state) => this.setRunState(state, null),
      onStatusLine: (status) => this.setStatusLine(status)
    });
  }
}

export const workspaceStore = new WorkspaceStore();
