export interface Tab {
  id: string;
  name: string;
  code: string;
}

export type OutputType = 'stdout' | 'stderr' | 'system';

export interface OutputChunk {
  type: OutputType;
  text: string;
}

export interface StatusLineInfo {
  type: 'exit' | 'stopped' | 'limit' | 'compilation_error' | 'runtime_error';
  code?: number;
  durationSeconds?: number;
  message?: string;
}

export interface DiagnosticItem {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'note';
  message: string;
  raw: string;
}

export interface WorkspacePersistenceSchema {
  version: number;
  tabs: Array<{ id: string; name: string; code: string }>;
  activeTabId: string;
  input: string;
  splitHorizontal: number;
  splitVertical: number;
}

export type ToolchainState =
  | { status: 'idle' }
  | { status: 'downloading'; progress: number; loadedBytes: number; totalBytes: number }
  | { status: 'preparing' }
  | { status: 'ready' }
  | { status: 'failed'; error: string };

export type RunState = 'idle' | 'compiling' | 'running';

export const DEFAULT_HELLO_WORLD = `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`;
