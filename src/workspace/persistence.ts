import { WorkspacePersistenceSchema, DEFAULT_HELLO_WORLD } from './types';

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'cpp_editor_workspace_state';

export function getDefaultWorkspace(): WorkspacePersistenceSchema {
  const initialId = 'tab-1';
  return {
    version: CURRENT_SCHEMA_VERSION,
    tabs: [
      {
        id: initialId,
        name: 'untitled-1.cpp',
        code: DEFAULT_HELLO_WORLD
      }
    ],
    activeTabId: initialId,
    input: '',
    splitHorizontal: 55,
    splitVertical: 35
  };
}

export function saveWorkspace(data: WorkspacePersistenceSchema): boolean {
  try {
    const payload = JSON.stringify({
      ...data,
      version: CURRENT_SCHEMA_VERSION
    });
    localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch (err) {
    console.warn('Failed to save workspace to localStorage:', err);
    return false;
  }
}

export function loadWorkspace(): WorkspacePersistenceSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultWorkspace();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return getDefaultWorkspace();
    }

    // Validate version and essential fields
    if (parsed.version !== CURRENT_SCHEMA_VERSION) {
      // Future migration logic can go here. For now return default or attempt migration
      if (typeof parsed.version !== 'number') {
        return getDefaultWorkspace();
      }
    }

    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
      return getDefaultWorkspace();
    }

    // Validate tabs
    const validTabs = parsed.tabs
      .slice(0, 5) // max 5 tabs
      .filter((t: any) => t && typeof t.id === 'string' && typeof t.name === 'string' && typeof t.code === 'string');

    // IDs are used as React keys and as the workspace's tab identity. A
    // duplicated ID makes closing one tab remove every tab with that ID.
    const uniqueTabs = validTabs.filter((tab: { id: string }, index: number, tabs: Array<{ id: string }>) =>
      tabs.findIndex(candidate => candidate.id === tab.id) === index
    );

    if (uniqueTabs.length === 0) {
      return getDefaultWorkspace();
    }

    let activeTabId = typeof parsed.activeTabId === 'string' ? parsed.activeTabId : uniqueTabs[0].id;
    if (!uniqueTabs.some((t: any) => t.id === activeTabId)) {
      activeTabId = uniqueTabs[0].id;
    }

    const input = typeof parsed.input === 'string' ? parsed.input : '';
    const splitHorizontal = typeof parsed.splitHorizontal === 'number' && parsed.splitHorizontal >= 10 && parsed.splitHorizontal <= 90
      ? parsed.splitHorizontal
      : 55;
    const splitVertical = typeof parsed.splitVertical === 'number' && parsed.splitVertical >= 10 && parsed.splitVertical <= 90
      ? parsed.splitVertical
      : 35;

    return {
      version: CURRENT_SCHEMA_VERSION,
      tabs: uniqueTabs,
      activeTabId,
      input,
      splitHorizontal,
      splitVertical
    };
  } catch (err) {
    console.warn('Corrupt workspace data in localStorage. Falling back to default:', err);
    return getDefaultWorkspace();
  }
}

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: any = null;
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}
