import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveWorkspace,
  loadWorkspace,
  getDefaultWorkspace,
  STORAGE_KEY,
  CURRENT_SCHEMA_VERSION
} from '../../src/workspace/persistence';

describe('Workspace Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default workspace when storage is empty', () => {
    const ws = loadWorkspace();
    expect(ws.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(ws.tabs).toHaveLength(1);
    expect(ws.tabs[0].name).toBe('untitled-1.cpp');
    expect(ws.input).toBe('');
  });

  it('should round-trip valid workspace data', () => {
    const testData = {
      version: CURRENT_SCHEMA_VERSION,
      tabs: [
        { id: 'tab-1', name: 'solution.cpp', code: 'int main(){ return 0; }' },
        { id: 'tab-2', name: 'tests.cpp', code: '// test code' }
      ],
      activeTabId: 'tab-2',
      input: '42 100',
      splitHorizontal: 60,
      splitVertical: 40
    };

    const saved = saveWorkspace(testData);
    expect(saved).toBe(true);

    const loaded = loadWorkspace();
    expect(loaded).toEqual(testData);
  });

  it('should gracefully handle corrupt JSON data and fall back to default', () => {
    localStorage.setItem(STORAGE_KEY, '{ invalid json: bad syntax ]]');
    const ws = loadWorkspace();
    expect(ws).toEqual(getDefaultWorkspace());
  });

  it('should handle corrupt tabs array and fall back to default', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_SCHEMA_VERSION,
        tabs: [], // empty tabs
        activeTabId: 'non-existent'
      })
    );
    const ws = loadWorkspace();
    expect(ws.tabs).toHaveLength(1);
    expect(ws.tabs[0].name).toBe('untitled-1.cpp');
  });

  it('should cap tabs at 5 when loaded from external storage', () => {
    const sixTabs = [1, 2, 3, 4, 5, 6].map(i => ({
      id: `tab-${i}`,
      name: `file${i}.cpp`,
      code: `// ${i}`
    }));

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_SCHEMA_VERSION,
        tabs: sixTabs,
        activeTabId: 'tab-1',
        input: ''
      })
    );

    const ws = loadWorkspace();
    expect(ws.tabs).toHaveLength(5);
  });

  it('should discard duplicate tab IDs so closing a tab cannot empty the workspace', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: CURRENT_SCHEMA_VERSION,
      tabs: [
        { id: 'same-id', name: 'first.cpp', code: 'int main(){}' },
        { id: 'same-id', name: 'second.cpp', code: 'int main(){}' }
      ],
      activeTabId: 'same-id',
      input: '',
      splitHorizontal: 55,
      splitVertical: 35
    }));

    const ws = loadWorkspace();
    expect(ws.tabs).toHaveLength(1);
    expect(ws.activeTabId).toBe(ws.tabs[0].id);
  });

  it('should handle missing activeTabId by selecting the first tab', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_SCHEMA_VERSION,
        tabs: [{ id: 'tab-A', name: 'main.cpp', code: 'int main(){}' }],
        activeTabId: 'tab-does-not-exist',
        input: ''
      })
    );

    const ws = loadWorkspace();
    expect(ws.activeTabId).toBe('tab-A');
  });
});
