import { WASI, File, OpenFile } from '@bjorn3/browser_wasi_shim';
import { OutputLimiter } from './outputLimiter';

export interface RunWorkerMessage {
  type: 'run';
  wasm: ArrayBuffer;
  input: string;
}

export type RunnerToMainMessage =
  | { type: 'output'; chunks: Array<{ type: 'stdout' | 'stderr'; text: string }> }
  | { type: 'finished'; code: number }
  | { type: 'limit_exceeded' }
  | { type: 'runtime_error'; message: string };

class OutputLimitExceededError extends Error {
  constructor() {
    super('Output limit exceeded');
    this.name = 'OutputLimitExceededError';
  }
}

self.onmessage = async (event: MessageEvent<RunWorkerMessage>) => {
  const { type, wasm, input } = event.data;
  if (type !== 'run') return;

  const limiter = new OutputLimiter();
  const decoder = new TextDecoder('utf-8', { fatal: false });

  let pendingChunks: Array<{ type: 'stdout' | 'stderr'; text: string }> = [];
  let flushTimer: any = null;

  const flushOutput = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (pendingChunks.length > 0) {
      self.postMessage({
        type: 'output',
        chunks: pendingChunks
      });
      pendingChunks = [];
    }
  };

  const scheduleFlush = () => {
    if (!flushTimer) {
      flushTimer = setTimeout(flushOutput, 16);
    }
  };

  const handleWrite = (source: 'stdout' | 'stderr', data: Uint8Array) => {
    const result = limiter.push(data);
    if (result.accepted.byteLength > 0) {
      const text = decoder.decode(result.accepted, { stream: !result.overflow });
      pendingChunks.push({ type: source, text });
      scheduleFlush();
    }
    if (result.overflow) {
      flushOutput();
      throw new OutputLimitExceededError();
    }
  };

  class CustomOutputFd extends OpenFile {
    constructor(private source: 'stdout' | 'stderr') {
      super(new File(new Uint8Array(0)));
    }
    override fd_write(data: Uint8Array) {
      handleWrite(this.source, data);
      return { ret: 0, nwritten: data.byteLength };
    }
  }

  try {
    const inputBytes = new TextEncoder().encode(input);
    const stdinFd = new OpenFile(new File(inputBytes));
    const stdoutFd = new CustomOutputFd('stdout');
    const stderrFd = new CustomOutputFd('stderr');

    const wasi = new WASI([], [], [stdinFd, stdoutFd, stderrFd]);
    const module = await WebAssembly.compile(wasm);
    const instance = await WebAssembly.instantiate(module, {
      wasi_snapshot_preview1: wasi.wasiImport
    });

    const exitCode = wasi.start(instance as any);
    flushOutput();
    self.postMessage({ type: 'finished', code: exitCode ?? 0 });
  } catch (err: any) {
    flushOutput();

    if (err instanceof OutputLimitExceededError || err?.name === 'OutputLimitExceededError') {
      self.postMessage({ type: 'limit_exceeded' });
      return;
    }

    // Check if it's a WASI proc_exit call
    if (err && typeof err.code === 'number') {
      self.postMessage({ type: 'finished', code: err.code });
      return;
    }

    const msg = err?.message || String(err);
    if (msg.includes('proc_exit') || msg.includes('exit code')) {
      const match = msg.match(/\b(?:exit code|status|code)\s*[:=]?\s*(\d+)/i);
      if (match) {
        self.postMessage({ type: 'finished', code: parseInt(match[1], 10) });
        return;
      }
    }

    // WebAssembly trap / runtime error
    self.postMessage({
      type: 'runtime_error',
      message: msg || 'Runtime trap / segmentation fault'
    });
  }
};
