import { OutputChunk, StatusLineInfo, DiagnosticItem } from '../workspace/types';
import CompilerWorker from '../compiler/compiler.worker?worker';
import RunnerWorker from './runner.worker?worker';

export interface RunCallbacks {
  onStateChange: (state: 'idle' | 'compiling' | 'running') => void;
  onOutputChunk: (chunk: OutputChunk) => void;
  onClearOutput: () => void;
  onStatusLine: (status: StatusLineInfo) => void;
  onOutputLimitExceeded: () => void;
  onDiagnostics: (tabId: string, diagnostics: DiagnosticItem[]) => void;
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export class RunController {
  private compilerWorker: Worker | null = null;
  private currentRunnerWorker: Worker | null = null;
  private runningTabId: string | null = null;
  private compileCache = new Map<string, Uint8Array>();
  private currentRunId = 0;

  getRunningTabId(): string | null {
    return this.runningTabId;
  }

  isBusy(): boolean {
    return this.runningTabId !== null;
  }

  private getCompiler(): Worker {
    if (!this.compilerWorker) {
      this.compilerWorker = new CompilerWorker();
    }
    return this.compilerWorker!;
  }

  async run(
    tabId: string,
    source: string,
    input: string,
    callbacks: RunCallbacks
  ): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    this.runningTabId = tabId;
    const runId = ++this.currentRunId;

    callbacks.onClearOutput();
    callbacks.onDiagnostics(tabId, []);

    try {
      const sourceHash = await sha256(source);
      let wasmBytes = this.compileCache.get(sourceHash);

      if (!wasmBytes) {
        callbacks.onStateChange('compiling');

        const compiler = this.getCompiler();
        const compilePromise = new Promise<{
          success: boolean;
          wasm?: Uint8Array;
          diagnostics: DiagnosticItem[];
          stderr: string;
        }>((resolve, reject) => {
          const cleanup = () => {
            compiler.removeEventListener('message', handler);
            compiler.removeEventListener('error', onWorkerError);
            compiler.removeEventListener('messageerror', onMessageError);
          };
          const handler = (e: MessageEvent) => {
            if (e.data.id === String(runId)) {
              cleanup();
              resolve(e.data);
            }
          };
          const onWorkerError = (event: ErrorEvent) => {
            cleanup();
            const detail = event.error instanceof Error
              ? `${event.error.name}: ${event.error.message}`
              : event.message;
            reject(new Error(detail || `Compiler worker failed to load (${event.filename}:${event.lineno}:${event.colno})`));
          };
          const onMessageError = () => {
            cleanup();
            reject(new Error('Compiler worker returned an unreadable response'));
          };
          compiler.addEventListener('message', handler);
          compiler.addEventListener('error', onWorkerError);
          compiler.addEventListener('messageerror', onMessageError);
          compiler.postMessage({
            type: 'compile',
            id: String(runId),
            source
          });
        });

        const compileResult = await compilePromise;

        // If stopped or superseded during compile
        if (this.currentRunId !== runId) return;

        if (!compileResult.success || !compileResult.wasm) {
          // Send diagnostics to output and editor
          callbacks.onDiagnostics(tabId, compileResult.diagnostics);
          if (compileResult.stderr) {
            callbacks.onOutputChunk({
              type: 'stderr',
              text: compileResult.stderr
            });
          }
          callbacks.onStatusLine({
            type: 'compilation_error',
            message: 'Compilation failed'
          });
          this.finishRun(callbacks);
          return;
        }

        wasmBytes = compileResult.wasm;
        this.compileCache.set(sourceHash, wasmBytes);

        // Report warnings if any
        if (compileResult.diagnostics.length > 0) {
          callbacks.onDiagnostics(tabId, compileResult.diagnostics);
        }
      }

      // Start execution
      if (this.currentRunId !== runId) return;
      callbacks.onStateChange('running');

      const startTime = performance.now();
      const runner = new RunnerWorker();
      this.currentRunnerWorker = runner;

      runner.onmessage = (event: MessageEvent) => {
        if (this.currentRunId !== runId) return;

        const data = event.data;
        if (data.type === 'output') {
          for (const chunk of data.chunks) {
            callbacks.onOutputChunk(chunk);
          }
        } else if (data.type === 'finished') {
          const duration = (performance.now() - startTime) / 1000;
          callbacks.onStatusLine({
            type: 'exit',
            code: data.code,
            durationSeconds: duration
          });
          this.terminateRunner();
          this.finishRun(callbacks);
        } else if (data.type === 'limit_exceeded') {
          callbacks.onOutputLimitExceeded();
          callbacks.onStatusLine({
            type: 'limit',
            message: 'Output limit exceeded'
          });
          this.terminateRunner();
          this.finishRun(callbacks);
        } else if (data.type === 'runtime_error') {
          callbacks.onStatusLine({
            type: 'runtime_error',
            message: data.message
          });
          this.terminateRunner();
          this.finishRun(callbacks);
        }
      };

      runner.onerror = (err: any) => {
        if (this.currentRunId !== runId) return;
        console.error('Runner worker error:', err);
        callbacks.onStatusLine({
          type: 'runtime_error',
          message: err.message || 'Worker runtime error'
        });
        this.terminateRunner();
        this.finishRun(callbacks);
      };

      // Pass wasm buffer copy so it can be transferred/compiled
      const wasmBuffer = wasmBytes.slice().buffer;
      runner.postMessage(
        {
          type: 'run',
          wasm: wasmBuffer,
          input
        },
        [wasmBuffer]
      );
    } catch (err: any) {
      console.error('Run execution error:', err);
      callbacks.onStatusLine({
        type: 'runtime_error',
        message: err?.message || 'Execution failed'
      });
      this.terminateRunner();
      this.finishRun(callbacks);
    }
  }

  stop(callbacks?: Pick<RunCallbacks, 'onStateChange' | 'onStatusLine'>): void {
    if (!this.runningTabId) return;

    this.currentRunId++; // invalidate ongoing run
    this.terminateRunner();

    if (callbacks) {
      callbacks.onStatusLine({
        type: 'stopped',
        message: 'Stopped by user'
      });
      callbacks.onStateChange('idle');
    }

    this.runningTabId = null;
  }

  private terminateRunner(): void {
    if (this.currentRunnerWorker) {
      this.currentRunnerWorker.terminate();
      this.currentRunnerWorker = null;
    }
  }

  private finishRun(callbacks: RunCallbacks): void {
    this.runningTabId = null;
    callbacks.onStateChange('idle');
  }
}

export const runController = new RunController();
