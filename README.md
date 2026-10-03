# Browser C++ Editor

**A lightweight C++ editor that compiles and runs programs in your browser.** It uses Monaco for editing and a WebAssembly build of Clang for compilation. Your source code and program input stay in the browser; the app does not send them to a compilation server.

**Live app:** https://kj71.github.io/browser-cpp-editor/  
**Source:** https://github.com/kj71/browser-cpp-editor

## Offline use

The editor works offline after its first setup:

1. Open the live app once while connected to the internet.
2. Let the compiler toolchain finish downloading. The compressed toolchain is about 26 MB; the exact size can change with compiler updates.
3. After the app shell and compiler are cached, disconnect and continue editing, compiling, and running programs offline.

The app stores its shell with a service worker and stores the versioned compiler files in browser Cache Storage. Clearing the site’s browser data removes these cached files, so the next visit needs an internet connection to download them again. Use a modern browser with WebAssembly, service workers, Cache Storage, and `DecompressionStream` support. GitHub Pages serves the app over HTTPS, which enables these browser features.

## Features

- C++20 compilation with YoWASP Clang 22 targeting WebAssembly/WASI.
- Browser-based program execution with standard input, standard output, and standard error.
- Monaco editor with syntax highlighting, diagnostics, completions, and C++ snippets.
- Up to five independent tabs, with editable names and automatic workspace persistence.
- Resizable editor and input/output panes.
- Run and stop controls, keyboard shortcuts, runtime status, and a 1 MiB output limit.
- Installable progressive web app with offline app-shell support.
- No compilation backend: compilation and execution happen locally in browser workers.

### Header compatibility

The compiler uses libc++, not GNU libstdc++. The downloaded toolchain includes a `<bits/stdc++.h>` convenience header and a limited GNU PBDS compatibility header for ordered sets. The PBDS layer supports the common `tree` ordered-set API, including `order_of_key` and `find_by_order`; it does not implement every GNU PBDS feature, such as mapped trees. GNU-specific headers outside the supplied compatibility layer may not be available.

## Use the editor

Open the [live app](https://kj71.github.io/browser-cpp-editor/), type a C++ program, then select **Run** or press `Ctrl+Enter` (`Cmd+Enter` on macOS). Enter program input in the **Input (stdin)** pane. The result and diagnostics appear below.

| Action | Shortcut |
| --- | --- |
| Run the active program | `Ctrl+Enter` / `Cmd+Enter` |
| Stop a running program | `Ctrl+.` / `Cmd+.` |
| Create a tab | `Alt+N` |
| Close the active tab | `Alt+W` |

Double-click a tab name to rename it. Tabs, source code, active tab, standard input, and pane sizes are saved in the current browser profile.

## Build and run locally

### Requirements

- Node.js 20 or newer
- npm 10 or newer
- A modern browser for running the app

```sh
git clone https://github.com/kj71/browser-cpp-editor.git
cd browser-cpp-editor
npm ci
npm run prepare-toolchain
npm run dev
```

Open http://localhost:3000. The first visit downloads and prepares the compiler assets for the browser.

### Production build

```sh
npm run build
npm run preview
```

The build prepares the downloadable toolchain, type-checks the TypeScript, and creates the static site in `dist/`.

### Tests

```sh
npm test
```

## Deployment

Push to `main` to start the GitHub Actions workflow in `.github/workflows/deploy.yml`. It installs dependencies, prepares the toolchain, runs unit tests, builds the static site, and deploys `dist/` to GitHub Pages. Enable GitHub Pages for the repository with **GitHub Actions** as the build and deployment source.

## How it works

```text
React UI + Monaco
  ├─ Workspace persistence → localStorage
  ├─ Toolchain manager → downloads and caches compiler assets
  ├─ Compiler worker → Clang/WASI → program WebAssembly
  ├─ Runner worker → browser_wasi_shim → stdout/stderr
  └─ Service worker → app shell for offline visits
```

Compiler assets are downloaded as compressed static files, decompressed in the browser, and stored in Cache Storage by toolchain version. The app shell and editor assets are cached separately by the service worker. No source code is uploaded for compilation.

For the original requirements, detailed architecture, and design decisions, see the [project specification](docs/PROJECT_SPEC.md).
