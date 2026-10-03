# Browser C++ Editor — Product Specification and Design Record

## Context
A static website where users write C++ in up to 5 tabs and Run one program at a time against a shared Input box, with results in a shared Output box. The C++ toolchain (Clang → WebAssembly) is downloaded once into the browser, cached, and used offline thereafter — there is no compile server. Greenfield project: no existing codebase. Dark mode only, desktop-first, deployed to GitHub Pages.

---

## Glossary (CONTEXT.md content)
- **Toolchain** — the C++ compiler, linker, and standard library, downloaded into and cached by the browser.
- **Toolchain readiness** — `Downloading (progress %)` → `Preparing` → `Ready`, or `Failed` (retryable). Run is only possible when Ready.
- **Workspace** — the set of Tabs (1–5), the active Tab, the shared Input, and the latest Output.
- **Tab** — one independent C++ program: a name plus single-file source with its own `main()`. Does not own Input or Output.
- **Run** — compile the active Tab's source (snapshot taken at click time) and execute it once with the Input as stdin.
- **Stop** — user-initiated termination of the running program; the only way a non-terminating program ends.
- **Input** — text fed in full to the program's stdin before it starts; EOF follows.
- **Output** — program stdout + stderr from the latest Run, or compiler diagnostics when compilation fails, plus a status line.
- **Output Limit** — 1,048,576 bytes of program stdout + stderr. Exceeding it kills the program.

## Decision records (ADRs)
**ADR-1: Browser-only toolchain on YoWASP clang 22, no compile server.**
The requirement is that compilation works offline and nowhere but the browser. YoWASP is the only current LLVM 22 build with full libc++ that needs no cross-origin isolation (~20 MB Brotli / ~105 MB raw). Rejected: LuvHakii/llvm-wasm (no license, 2 months old, needs COOP/COEP), Wasmer (stale since 2024, needs SharedArrayBuffer), binji (LLVM 8), emception (2022, ~150 MB). Consequences: big first load; no `std::thread`; try/catch depends on the Phase-1 spike; YoWASP's npm releases are frozen since Mar 2026 → pin the version and self-host.

**ADR-2: No clangd; Monaco-native autosuggest; no COOP/COEP.**
clangd-in-browser adds ~26 MB and forces cross-origin isolation for the whole site, which GitHub Pages can't serve without workarounds. v1 uses Monaco completion providers. Revisit if semantic completion becomes a requirement.

---

## Settled decisions
| # | Decision |
|---|---|
| Tabs | Each Tab is an independent program. New Tab = `untitled-N.cpp` with a hello-world template. Double-click to rename. Confirm before closing a non-empty Tab. At least 1 Tab is always open. **Max 5** (+ disabled with tooltip at 5). |
| Single run | While running, Run is disabled everywhere. The running Tab's button becomes **Stop** and the running Tab shows a dot. Closing the running Tab stops it (the confirm dialog says so). Editing during a run is allowed. |
| Runaway programs | Manual Stop only. No time limit. |
| Input | Batch stdin, shared across Tabs. No interactive input. |
| Output | Shared across Tabs. Not attributed to a Tab, and switching Tabs leaves it as is. stderr in muted red-orange. A status line on every run: `Exited with code N · 0.42 s` / `Stopped by user` / `Output limit exceeded` / `Compilation failed` / `Runtime error: <trap message>`. |
| Output Limit | stdout + stderr combined; compiler diagnostics excluded. Kill immediately, show the first 1 MiB exactly, then a red banner: *"Output limit exceeded: program produced more than 1 MB of output. Output truncated."* |
| Loader | Non-blocking. The editor works during download. The Run button shows `Downloading compiler… 42%` → `Preparing compiler…` → `Run`. On failure: inline error + Retry; the editor stays usable. |
| Persistence | Tabs (name and code), active Tab, Input, and splitter sizes are autosaved to localStorage (debounced). Output is not persisted. |
| Offline | Installable PWA. App shell and Toolchain are cached; full offline use after the first load. Ask for `navigator.storage.persist()`. |
| Compile errors | Shown in Output and as red squiggles on the Tab that was compiled. |
| Binary reuse | Skip recompiling when a Tab's source hash is unchanged since its last successful compile. |
| Layout | Left: tab bar and editor. Right: Input above Output. Draggable splitters. |
| Shortcuts | `Cmd/Ctrl+Enter` Run · `Cmd/Ctrl+.` Stop · `Alt+N` new Tab · `Alt+W` close Tab. |
| Flags | Fixed: `-std=c++20 -O2 -Wall`, plus a bundled `<bits/stdc++.h>` shim. |
| Toolchain upgrade | The new version downloads in the background while the old one stays in use; switch when ready, then delete the old cache. |
| Devices | Desktop browsers. Narrow viewports get a dismissible "Best on desktop" notice. |
| Hosting | GitHub Pages, deployed from GitHub Actions. |
| Out of scope (v1) | Multi-file projects, interactive stdin, time limit, clangd, share links, `.cpp` import/export, debugger, standard selector, light theme, mobile layout, accounts/sync. |

---

## Architecture
```
Main thread (React UI)
 ├─ WorkspaceStore ── localStorage (debounced)
 ├─ ToolchainManager ── downloads .gz → DecompressionStream → Cache Storage (versioned)
 ├─ RunController (enforces one run at a time; owns Stop)
 │    ├─ compiler.worker  (long-lived; loads YoWASP clang from Cache Storage; source → .wasm + diagnostics)
 │    └─ runner.worker    (disposable, one per Run; browser_wasi_shim; stdin/out/err; Output Limit)
 └─ Service worker (vite-plugin-pwa: precaches app shell + Monaco)
```
- **Why two workers:** the compiler is costly to warm up, so it stays alive. The program runner is killed with `worker.terminate()` on Stop or Output Limit, which never touches the warm compiler.
- **Run flow:**
  1. Snapshot the source and Input.
  2. Hash cache hit? Reuse the `.wasm`. Otherwise `compile` → either `{wasm}` or `{diagnostics}`.
  3. Diagnostics → Output plus Monaco markers on that Tab; stop.
  4. Spawn the runner with the `.wasm` and Input. The runner streams batched output chunks (~every 16 ms).
  5. On exit, trap, limit, or Stop → status line; terminate the runner.

## Project layout and key modules
```
cpp-editor/
  package.json  vite.config.ts  tsconfig.json  index.html
  scripts/prepare-toolchain.mjs      # copy pinned @yowasp/clang resources → public/toolchain/<ver>/, gzip each, write manifest.json (files, sizes, sha256)
  toolchain-extras/bits/stdc++.h     # shim: includes all libc++ headers
  .github/workflows/deploy.yml       # install → prepare-toolchain → test → build → actions/deploy-pages
  src/
    main.tsx  App.tsx  theme.css     # dark tokens, color-scheme: dark
    workspace/workspaceStore.ts      # Tabs (≤5), activeTabId, input, output, runState; reducer + actions
    workspace/persistence.ts         # load/save versioned JSON schema to localStorage
    toolchain/toolchainManager.ts    # readiness state machine, streamed progress (sum of bytes vs manifest), Cache Storage, persist(), background upgrade
    compiler/compiler.worker.ts      # override fetch for toolchain URLs → Cache Storage; runClang(["clang++", flags…, "main.cpp", "-o", "main.wasm"]); returns bytes/stderr
    compiler/diagnostics.ts          # parse `main.cpp:L:C: error|warning|note: msg` → {line, col, severity, message}
    runner/runner.worker.ts          # browser_wasi_shim WASI: fd0 OpenFile(input), fd1/fd2 LimitedOutputFd; proc_exit → code; trap → runtime error
    runner/outputLimiter.ts          # pure: tracks bytes; returns accepted slice + overflow flag at exactly 1,048,576
    runner/runController.ts          # single-run guard, compile cache Map<hash, wasm>, Stop, timing, status
    editor/cppCompletions.ts         # Monaco CompletionItemProvider for 'cpp'
    editor/stlCatalog.ts             # curated: headers, std:: types/functions/algorithms, common members
    components/  TabBar.tsx  EditorPane.tsx  InputPane.tsx  OutputPane.tsx  StatusLine.tsx  RunButton.tsx  ConfirmDialog.tsx  DesktopNotice.tsx
  tests/unit/…  tests/e2e/…
```

### Notable details
- **Monaco must be bundled locally** (`monaco-editor` + Vite worker imports). Don't use `@monaco-editor/react`'s default CDN loader, or offline use breaks. Theme: `vs-dark`, customised to match the app tokens.
- **Autosuggest (`cppCompletions.ts`):**
  - Keywords.
  - Snippets: `main`, `for`, `fori`, `while`, `if`, `class`, `struct`, `cout`, `cin`, `fastio`, `#include`.
  - Header names after `#include <`.
  - `std::` members after `std::`.
  - A curated list of common container methods after `.`. This is a heuristic, not type-aware.
  - Monaco's built-in word-based suggestions supply identifiers from the file.
  - Trigger characters: `:` `<` `.` `#`.
- **GitHub Pages constraints:**
  - 100 MB per-file limit; the 75.5 MB `llvm.core.wasm` fits.
  - 1 GB site limit.
  - Compression of `.wasm` is not guaranteed and headers can't be set, so ship **pre-gzipped** toolchain files and decompress in the browser with `DecompressionStream('gzip')`.
  - Versioned paths (`/toolchain/<ver>/`) avoid stale-cache issues despite fixed cache headers.
  - Use a relative Vite base (`./`) so the static app and toolchain resolve under a GitHub Pages repository path.
  - The toolchain is copied at build time from npm, never committed.
- **Output rendering:** append chunks to a text buffer flushed per animation frame. At most 1 MiB, so a plain `<pre>` is acceptable. stdout and stderr go in separate spans.
- **Persistence schema** carries a `version` field for future migrations. If storage is corrupt or missing, fall back to one hello-world Tab.

---

## Implementation phases
1. **Scaffold:** Vite + React + TS, dark theme, split layout, local Monaco editor.
2. **Toolchain spike (de-risk first):**
   - Compile and run hello world with YoWASP in a worker.
   - Confirm how YoWASP resolves its resource URLs, so the fetch override and Cache Storage approach works.
   - Add the `<bits/stdc++.h>` shim.
   - **Exceptions experiment:** swap in the wasi-sdk 34 exception-enabled libc++/libunwind sysroot with `-fwasm-exceptions -mllvm -wasm-use-legacy-eh=false -lunwind`. If try/catch works, keep it. Otherwise compile with `-fno-exceptions` and map the resulting "exceptions disabled" diagnostic to a clear message.
   - Measure the gzip sizes and warm compile time.
3. **ToolchainManager:** manifest, gzip download with progress, decompress, Cache Storage, `persist()`, readiness states, Retry, background upgrade.
4. **Runner + RunController:** WASI runner, batch stdin, streaming output, Output Limit, Stop, status line, runtime-error mapping, compile cache.
5. **Workspace:** tabs (create, rename, close, max 5, at least 1), single-run guard across tabs, persistence, keyboard shortcuts.
6. **Editor intelligence:** completion provider and STL catalog; diagnostics → Monaco markers.
7. **PWA + deploy:** vite-plugin-pwa app-shell precache, install manifest, desktop notice, GitHub Actions → Pages.
8. **Tests:** see Verification.

## Verification
**Unit tests (Vitest):**
- `outputLimiter`: exact cut at 1,048,576 bytes, including multi-byte UTF-8 at the boundary and stdout/stderr interleaving.
- `diagnostics`: errors, warnings, notes and multi-line messages.
- `persistence`: round-trip, corrupt data, schema version.
- `workspaceStore`: max 5 tabs, never 0 tabs, closing the running tab stops it.
- `toolchainManager`: state transitions with a mocked fetch and caches.

**End-to-end test (Playwright, against `vite preview` with the real toolchain):**
1. A cold load shows download progress, and Run is enabled once Ready.
2. Hello world gives `Exited with code 0`.
3. `cin` with Input `3 4` printing the sum gives `7`.
4. A syntax error gives `Compilation failed`, the error in Output, and a squiggle on the right line.
5. `while(true) cout << 'x';` gives exactly 1 MiB of output, the limit banner, and Run re-enabled.
6. `while(true){}` followed by Stop gives `Stopped by user` within about 1 s.
7. `int *p=nullptr; *p=1;` or `abort()` gives `Runtime error`.
8. A 6th tab can't be created, and the last tab can't be closed.
9. Reload restores the tabs, code and Input.
10. With network offline (`context.setOffline(true)`), reload; the page loads and compiles.
11. If the spike succeeded, try/catch works. If not, the clear message appears.

**Manual checks:**
- First load on throttled "Fast 4G": loader text and progress are accurate.
- Install as a PWA, quit, disconnect the network, and relaunch.
- Chrome, Firefox and Safari desktop.
- Deployed GitHub Pages URL: the toolchain loads from the `/<repo>/` base path.
