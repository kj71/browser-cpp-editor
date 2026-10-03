import './installToolchainFetch';
import { parseDiagnostics, DiagnosticItem } from './diagnostics';
import { commands } from '@yowasp/clang';

const compilerHeaderPaths = [
  'extras/bits/stdc++.h',
  'extras/ext/pb_ds/assoc_container.hpp',
  'extras/ext/pb_ds/tree_policy.hpp'
];

async function loadCompilerHeaders(baseUrl: string): Promise<Record<string, string>> {
  const latestUrl = new URL('toolchain/latest.json', baseUrl);
  const latestResponse = await fetch(latestUrl);
  if (!latestResponse.ok) {
    throw new Error(`Failed to locate the cached compiler headers (${latestResponse.status})`);
  }

  const latest = await latestResponse.json() as { version?: string };
  if (!latest.version) throw new Error('Compiler toolchain version is missing');

  const cache = await caches.open(`cpp-toolchain-v${latest.version}`);
  const headers: Record<string, string> = {};
  for (const headerPath of compilerHeaderPaths) {
    const url = new URL(`toolchain/${latest.version}/${headerPath}`, baseUrl);
    const response = await cache.match(url.href);
    if (!response) throw new Error(`Compiler header is not installed: ${headerPath}`);

    headers[headerPath.replace(/^extras\//, '')] = await response.text();
  }
  return headers;
}

function toVirtualFileTree(files: Record<string, string>): Record<string, any> {
  const root: Record<string, any> = {};
  for (const [filePath, contents] of Object.entries(files)) {
    const segments = filePath.split('/');
    let directory = root;
    for (const segment of segments.slice(0, -1)) {
      directory[segment] ??= {};
      directory = directory[segment];
    }
    directory[segments[segments.length - 1]] = contents;
  }
  return root;
}

export interface CompileRequest {
  type: 'compile';
  id: string;
  source: string;
  toolchainBaseUrl: string;
}

export interface CompileResponse {
  type: 'compile_result';
  id: string;
  success: boolean;
  wasm?: Uint8Array;
  diagnostics: DiagnosticItem[];
  stderr: string;
  error?: string;
}

self.onmessage = async (event: MessageEvent<CompileRequest>) => {
  const { type, id, source, toolchainBaseUrl } = event.data;
  if (type !== 'compile') return;

  let capturedStderr = '';
  let capturedStdout = '';

  try {
    const decoder = new TextDecoder();
    const virtualHeaders = toVirtualFileTree(await loadCompilerHeaders(toolchainBaseUrl));

    const files = await commands['clang++'](
      [
        '-std=c++20',
        '-O2',
        '-Wall',
        '-fno-exceptions',
        '-I.',
        'main.cpp',
        '-o',
        'main.wasm'
      ],
      {
        'main.cpp': source,
        ...virtualHeaders
      },
      {
        stderr: (bytes: Uint8Array | null) => {
          if (bytes) capturedStderr += decoder.decode(bytes);
        },
        stdout: (bytes: Uint8Array | null) => {
          if (bytes) capturedStdout += decoder.decode(bytes);
        }
      }
    );

    const wasm = files ? (files['main.wasm'] as Uint8Array | undefined) : undefined;
    const diagnostics = parseDiagnostics(capturedStderr);

    if (wasm && wasm instanceof Uint8Array) {
      const response: CompileResponse = {
        type: 'compile_result',
        id,
        success: true,
        wasm,
        diagnostics,
        stderr: capturedStderr
      };
      self.postMessage(response, [wasm.buffer]);
    } else {
      const response: CompileResponse = {
        type: 'compile_result',
        id,
        success: false,
        diagnostics,
        stderr: capturedStderr,
        error: 'Compiler produced no output binary'
      };
      self.postMessage(response);
    }
  } catch (err: any) {
    const diagnostics = parseDiagnostics(capturedStderr);
    const response: CompileResponse = {
      type: 'compile_result',
      id,
      success: false,
      diagnostics,
      stderr: capturedStderr || err?.message || 'Compilation failed',
      error: err?.message || 'Compilation error'
    };
    self.postMessage(response);
  }
};
