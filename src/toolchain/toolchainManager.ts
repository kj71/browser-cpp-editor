import { ToolchainState } from '../workspace/types';

export interface ToolchainManifestFile {
  name: string;
  gzFileName: string;
  rawSize: number;
  gzipSize: number;
  sha256: string;
}

export interface ToolchainManifest {
  version: string;
  totalRawSize: number;
  totalGzipSize: number;
  files: ToolchainManifestFile[];
}

export type StateChangeListener = (state: ToolchainState) => void;

export class ToolchainManager {
  private state: ToolchainState = { status: 'idle' };
  private listeners = new Set<StateChangeListener>();
  private manifest: ToolchainManifest | null = null;
  private abortController: AbortController | null = null;

  constructor(private basePath: string = '') {
    if (this.basePath && !this.basePath.endsWith('/')) {
      this.basePath += '/';
    }
  }

  getState(): ToolchainState {
    return this.state;
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(newState: ToolchainState): void {
    this.state = newState;
    for (const listener of this.listeners) {
      listener(newState);
    }
  }

  getCacheName(version: string): string {
    return `cpp-toolchain-v${version}`;
  }

  async init(): Promise<void> {
    // Request persistent storage if supported
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        await navigator.storage.persist();
      } catch (err) {
        console.warn('Persistent storage request failed:', err);
      }
    }

    await this.startDownloadAndSetup();
  }

  async retry(): Promise<void> {
    await this.startDownloadAndSetup();
  }

  private async fetchManifest(): Promise<ToolchainManifest> {
    // Try latest.json first or fallback directly to known manifest
    const latestUrl = `${this.basePath}toolchain/latest.json`;
    let manifestUrl = '';

    try {
      const resp = await fetch(latestUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data.manifestPath) {
          manifestUrl = `${this.basePath}${data.manifestPath}`;
        } else if (Array.isArray(data.files)) {
          return data as ToolchainManifest;
        }
      }
    } catch {
      // Fallback
    }

    if (!manifestUrl) {
      manifestUrl = `${this.basePath}toolchain/22.0.0-git20542-10/manifest.json`;
    }

    const resp = await fetch(manifestUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch toolchain manifest from ${manifestUrl} (${resp.status} ${resp.statusText})`);
    }

    return await resp.json();
  }

  private async isCacheComplete(cache: Cache, manifest: ToolchainManifest): Promise<boolean> {
    const keys = await cache.keys();
    for (const file of manifest.files) {
      const exists = keys.some(k => k.url.endsWith(file.name));
      if (!exists) {
        return false;
      }
    }
    return true;
  }

  private async startDownloadAndSetup(): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      this.manifest = await this.fetchManifest();
      const manifest = this.manifest;
      const cacheName = this.getCacheName(manifest.version);

      if (typeof caches === 'undefined') {
        throw new Error('CacheStorage API is not supported in this environment.');
      }

      const cache = await caches.open(cacheName);
      const isAlreadyCached = await this.isCacheComplete(cache, manifest);

      if (isAlreadyCached) {
        this.setState({ status: 'ready' });
        this.cleanupOldCaches(manifest.version);
        return;
      }

      // Start downloading
      this.setState({
        status: 'downloading',
        progress: 0,
        loadedBytes: 0,
        totalBytes: manifest.totalGzipSize
      });

      let totalLoadedGzipBytes = 0;
      const fileProgress = new Map<string, number>();

      for (const file of manifest.files) {
        fileProgress.set(file.name, 0);
      }

      const updateOverallProgress = () => {
        let sum = 0;
        for (const bytes of fileProgress.values()) {
          sum += bytes;
        }
        totalLoadedGzipBytes = sum;
        const progress = Math.min(99, Math.round((totalLoadedGzipBytes / manifest.totalGzipSize) * 100));
        this.setState({
          status: 'downloading',
          progress,
          loadedBytes: totalLoadedGzipBytes,
          totalBytes: manifest.totalGzipSize
        });
      };

      // Download and decompress each file
      for (const file of manifest.files) {
        if (signal.aborted) return;

        const fileGzUrl = `${this.basePath}toolchain/${manifest.version}/${file.gzFileName}`;
        const response = await fetch(fileGzUrl, { signal });
        if (!response.ok || !response.body) {
          throw new Error(`Failed to download ${file.name} (${response.status})`);
        }

        // Setup streamed progress reader
        const reader = response.body.getReader();
        let loadedForThisFile = 0;

        const progressStream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  controller.close();
                  break;
                }
                if (value) {
                  loadedForThisFile += value.byteLength;
                  fileProgress.set(file.name, loadedForThisFile);
                  updateOverallProgress();
                  controller.enqueue(value);
                }
              }
            } catch (err) {
              controller.error(err);
            }
          }
        });

        // Decompress via DecompressionStream
        const decompressedStream = progressStream.pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(decompressedStream).blob();

        const mime = file.name.endsWith('.wasm')
          ? 'application/wasm'
          : file.name.endsWith('.hpp') || file.name.endsWith('.h')
            ? 'text/plain'
            : 'application/x-tar';
        const locationHref = typeof window !== 'undefined' ? window.location.href : (typeof location !== 'undefined' ? location.href : 'https://localhost/');
        const fileKey = new URL(`toolchain/${manifest.version}/${file.name}`, locationHref).href;

        await cache.put(
          fileKey,
          new Response(decompressedBlob, {
            headers: {
              'Content-Type': mime,
              'Content-Length': String(decompressedBlob.size)
            }
          })
        );
      }

      // All downloaded and decompressed
      this.setState({ status: 'preparing' });

      // Clean up old caches from previous versions
      await this.cleanupOldCaches(manifest.version);

      this.setState({ status: 'ready' });
    } catch (err: any) {
      if (signal.aborted) return;
      console.error('Toolchain download/setup failed:', err);
      this.setState({
        status: 'failed',
        error: err?.message || 'Failed to download toolchain'
      });
    }
  }

  private async cleanupOldCaches(currentVersion: string): Promise<void> {
    try {
      if (typeof caches === 'undefined') return;
      const currentCache = this.getCacheName(currentVersion);
      const keys = await caches.keys();
      for (const k of keys) {
        if (k.startsWith('cpp-toolchain-v') && k !== currentCache) {
          await caches.delete(k);
        }
      }
    } catch (err) {
      console.warn('Failed to cleanup old caches:', err);
    }
  }
}

export const toolchainManager = new ToolchainManager(
  typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL ? (import.meta as any).env.BASE_URL : ''
);
