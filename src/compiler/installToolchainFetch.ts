// Install the cache-backed fetch before @yowasp/clang is evaluated. YoWASP
// captures globalThis.fetch during module initialization and immediately loads
// its WASM modules and sysroot, so this must run as an earlier module import.
const originalFetch = self.fetch.bind(self);

const isToolchainResource = (url: URL, filename: string): boolean => {
  if (url.pathname.endsWith(filename)) return true;

  // Vite adds a content hash to package assets in production builds.
  const extension = filename.slice(filename.lastIndexOf('.'));
  const stem = filename.slice(0, -extension.length);
  const basename = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);
  return basename.startsWith(`${stem}-`) && basename.endsWith(extension);
};

self.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const requestUrl = input instanceof Request ? input.url : String(input);
  const url = new URL(requestUrl, self.location.href);
  const toolchainFiles = [
    'llvm.core.wasm',
    'llvm.core2.wasm',
    'llvm.core3.wasm',
    'llvm.core4.wasm',
    'llvm-resources.tar'
  ];

  if (toolchainFiles.some(filename => isToolchainResource(url, filename)) && typeof caches !== 'undefined') {
    const cacheNames = await caches.keys();
    const toolchainCacheName = cacheNames.find(name => name.startsWith('cpp-toolchain-v'));
    if (toolchainCacheName) {
      const cache = await caches.open(toolchainCacheName);
      const filename = toolchainFiles.find(name => isToolchainResource(url, name))!;
      const keys = await cache.keys();
      const matchKey = keys.find(key => key.url.endsWith(filename));
      if (matchKey) {
        const cachedResponse = await cache.match(matchKey);
        if (cachedResponse) return cachedResponse.clone();
      }
    }
  }

  return originalFetch(input, init);
};
