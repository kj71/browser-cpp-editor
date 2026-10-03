import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceStore } from '../../src/workspace/workspaceStore';
import { runController } from '../../src/runner/runController';

describe('WorkspaceStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should enforce max 5 tabs', () => {
    const store = new WorkspaceStore();
    expect(store.getState().tabs).toHaveLength(1);

    expect(store.createTab()).toBe(true); // 2
    expect(store.createTab()).toBe(true); // 3
    expect(store.createTab()).toBe(true); // 4
    expect(store.createTab()).toBe(true); // 5
    expect(store.getState().tabs).toHaveLength(5);

    // 6th tab creation must be rejected
    const sixth = store.createTab();
    expect(sixth).toBe(false);
    expect(store.getState().tabs).toHaveLength(5);
  });

  it('should never allow 0 tabs (minimum 1 tab always open)', () => {
    const store = new WorkspaceStore();
    expect(store.getState().tabs).toHaveLength(1);

    const singleTabId = store.getState().tabs[0].id;
    const closed = store.closeTab(singleTabId);
    expect(closed).toBe(false);
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().tabs[0].id).toBe(singleTabId);
  });

  it('should stop running program when the running tab is closed', () => {
    const store = new WorkspaceStore();
    store.createTab(); // now 2 tabs
    expect(store.getState().tabs).toHaveLength(2);

    const runningTab = store.getState().tabs[0];
    store.setRunState('running', runningTab.id);
    expect(store.getState().runningTabId).toBe(runningTab.id);

    const stopSpy = vi.spyOn(runController, 'stop');

    // Close the running tab
    const closed = store.closeTab(runningTab.id, true);
    expect(closed).toBe(true);
    expect(stopSpy).toHaveBeenCalled();
    expect(store.getState().runningTabId).toBeNull();
    expect(store.getState().tabs).toHaveLength(1);
  });

  it('should rename tab', () => {
    const store = new WorkspaceStore();
    const tabId = store.getState().tabs[0].id;
    store.renameTab(tabId, 'custom_name.cpp');
    expect(store.getState().tabs[0].name).toBe('custom_name.cpp');
  });

  it('should select adjacent tab when active tab is closed', () => {
    const store = new WorkspaceStore();
    store.createTab(); // tab-2
    store.createTab(); // tab-3
    expect(store.getState().tabs).toHaveLength(3);

    const tab2 = store.getState().tabs[1];
    store.setActiveTab(tab2.id);
    expect(store.getState().activeTabId).toBe(tab2.id);

    store.closeTab(tab2.id, true);
    expect(store.getState().tabs).toHaveLength(2);
    // Active tab should have moved to an existing tab
    expect(store.getState().tabs.some(t => t.id === store.getState().activeTabId)).toBe(true);
  });
});
