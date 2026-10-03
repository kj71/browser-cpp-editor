import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import zlib from 'node:zlib';
import { ToolchainManager } from '../../src/toolchain/toolchainManager';

describe('ToolchainManager', () => {
  let originalFetch: any;
  let originalCaches: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalCaches = (globalThis as any).caches;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).caches = originalCaches;
    vi.restoreAllMocks();
  });

  it('should transition directly to ready when files are already cached', async () => {
    const mockManifest = {
      version: '22.0.0-mock',
      totalRawSize: 200,
      totalGzipSize: 100,
      files: [
        {
          name: 'llvm.core.wasm',
          gzFileName: 'llvm.core.wasm.gz.bin',
          rawSize: 200,
          gzipSize: 100,
          sha256: 'abc'
        }
      ]
    };

    // Mock fetch for manifest
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('manifest.json') || url.includes('latest.json')) {
        return new Response(JSON.stringify(mockManifest), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    });

    // Mock Cache Storage with the file present
    const mockCache = {
      keys: vi.fn().mockResolvedValue([
        { url: 'https://localhost/toolchain/22.0.0-mock/llvm.core.wasm' }
      ]),
      match: vi.fn().mockResolvedValue(new Response('wasm bytes')),
      put: vi.fn().mockResolvedValue(undefined)
    };

    (globalThis as any).caches = {
      open: vi.fn().mockResolvedValue(mockCache),
      keys: vi.fn().mockResolvedValue(['cpp-toolchain-v22.0.0-mock']),
      delete: vi.fn().mockResolvedValue(true)
    };

    const manager = new ToolchainManager();
    const states: string[] = [];
    manager.subscribe((s) => states.push(s.status));

    await manager.init();

    expect(states).toContain('ready');
    expect(manager.getState().status).toBe('ready');
  });

  it('should transition through downloading and preparing to ready on cold load', async () => {
    const mockData = 'mock wasm binary content';
    const gzipped = zlib.gzipSync(Buffer.from(mockData));

    const mockManifest = {
      version: '22.0.0-mock',
      totalRawSize: mockData.length,
      totalGzipSize: gzipped.length,
      files: [
        {
          name: 'llvm.core.wasm',
          gzFileName: 'llvm.core.wasm.gz.bin',
          rawSize: mockData.length,
          gzipSize: gzipped.length,
          sha256: 'abc'
        }
      ]
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('manifest.json') || url.includes('latest.json')) {
        return new Response(JSON.stringify(mockManifest), { status: 200 });
      }
      if (url.includes('llvm.core.wasm.gz.bin')) {
        return new Response(gzipped, { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    });

    const storedKeys: Array<{ url: string }> = [];
    const mockCache = {
      keys: vi.fn().mockImplementation(async () => [...storedKeys]),
      match: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockImplementation(async (req, res) => {
        const urlStr = typeof req === 'string' ? req : req.url;
        storedKeys.push({ url: urlStr });
      })
    };

    (globalThis as any).caches = {
      open: vi.fn().mockResolvedValue(mockCache),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true)
    };

    const manager = new ToolchainManager();
    const states: string[] = [];
    manager.subscribe((s) => states.push(s.status));

    await manager.init();

    expect(states).toContain('downloading');
    expect(states).toContain('preparing');
    expect(states).toContain('ready');
    expect(manager.getState().status).toBe('ready');
    expect(mockCache.put).toHaveBeenCalled();
  });

  it('should transition to failed when download fails and allow retry', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    (globalThis as any).caches = {
      open: vi.fn(),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn()
    };

    const manager = new ToolchainManager();
    const states: string[] = [];
    manager.subscribe((s) => states.push(s.status));

    await manager.init();

    expect(manager.getState().status).toBe('failed');
    if (manager.getState().status === 'failed') {
      expect((manager.getState() as any).error).toContain('Network disconnected');
    }

    // Now mock recovery on retry
    const mockManifest = {
      version: '22.0.0-mock',
      totalRawSize: 10,
      totalGzipSize: 10,
      files: []
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockManifest), { status: 200 })
    );

    (globalThis as any).caches = {
      open: vi.fn().mockResolvedValue({
        keys: vi.fn().mockResolvedValue([]),
        put: vi.fn().mockResolvedValue(undefined)
      }),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true)
    };

    await manager.retry();
    expect(manager.getState().status).toBe('ready');
  });
});
