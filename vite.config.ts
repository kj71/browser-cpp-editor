import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  optimizeDeps: {
    // Keep YoWASP's worker-only package out of the browser dependency
    // optimizer. Vite's optimized module wrapper is not reliably loadable
    // from the compiler module worker in dev mode.
    exclude: ['@yowasp/clang']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MiB for bundled Monaco
        globIgnores: ['**/toolchain/**', '**/*.wasm', '**/*.wasm.gz', '**/*.tar.gz'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'C++ Code Editor',
        short_name: 'C++ Editor',
        description: 'In-browser C++ compiler and runner powered by WebAssembly',
        theme_color: '#0e1117',
        background_color: '#0e1117',
        display: 'standalone',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23388bfd"/><text x="50" y="68" font-family="monospace" font-weight="bold" font-size="50" fill="white" text-anchor="middle">C++</text></svg>',
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  worker: {
    format: 'es'
  },
  build: {
    chunkSizeWarningLimit: 10000
  },
  server: {
    port: 3000
  }
});
