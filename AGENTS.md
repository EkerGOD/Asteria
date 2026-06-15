# AGENTS.md

## Project purpose

**Asteria** is a lightweight Markdown editor built with Tauri v2 + Vue 3 + TypeScript. It keeps the core minimal — file editing only — with extensibility planned via a plugin system (similar to Obsidian's approach).

Current status: **v1.0.0** stable release.

## Repo layout

```
learn-anything/
  src/                     # Vue frontend (Vite, <script setup> SFCs)
    components/            # UI components (FileTree, SearchPanel, TabBar, etc.)
      activity-bar/        # Activity bar sidebar switcher
      editor/              # Markdown editor (CodeMirror-based)
      file-tree/           # File tree with context menu & new item
      layout/              # Sidebar layout wrapper
      search/              # Search & replace panel
      status-bar/          # Bottom status bar
      tabs/                # Tab bar for multi-file editing
      toolbar/             # Top toolbar with menu dropdown
    composables/           # Vue composition functions (useTabs, useFileManager, etc.)
    editor/                # CodeMirror extensions (decorations, widgets, theme)
    parser/                # Markdown lexer & parser
    styles/                # Global CSS
    __tests__/             # App-level tests
  src-tauri/               # Rust backend
    src/lib.rs             # App entry: registers plugins + invoke_handler
    src/main.rs            # Thin wrapper calling asteria_lib::run()
    src/commands/          # Tauri IPC command modules
      file_ops.rs          # File CRUD, list, rename
      search.rs            # Search-in-dir & replace-in-file
    capabilities/          # Tauri permission configs
    Cargo.toml             # Rust deps
  package.json             # Frontend deps & scripts
  vite.config.ts           # Dev server pinned to port 1420
  LICENSE                  # MIT
  README.md                # Chinese (primary)
  README.en.md             # English
```

## Commands

All commands run from the project root:

| Task | Command |
|---|---|
| Dev (full app) | `bun run tauri dev` |
| Dev (frontend only) | `bun run dev` |
| Typecheck + build | `bun run build` (runs `vue-tsc --noEmit && vite build`) |
| Typecheck only | `bunx vue-tsc --noEmit` |
| Run tests | `bun run test` |
| Run tests (watch) | `bun run test:watch` |
| Rust build | `cargo build` from `src-tauri/` |
| Production build | `bun run tauri build` (requires proxy: `$env:HTTPS_PROXY="http://127.0.0.1:7897"`) |

Package manager: **bun** (see `bun.lock` files).

## Architecture notes

- **IPC pattern**: Vue calls `invoke("cmd_name", { args })` → Rust `#[tauri::command] fn cmd_name()`. Register new commands in `lib.rs` via `invoke_handler(tauri::generate_handler![...])`.
- **Tauri plugins**: `fs`, `dialog`, `opener`, `store`, `clipboard` are registered in `lib.rs` and permitted in `capabilities/default.json`. Adding a new plugin requires both.
- **Custom URI scheme**: `asteria://` protocol serves local files (images) for rendering in the editor.
- **Vite port is fixed at 1420** (strict mode). Tauri dev connects to `http://localhost:1420`.
- **TypeScript is strict**: `noUnusedLocals`, `noUnusedParameters`, `isolatedModules` are all on.
- **Testing**: Vitest is configured. Composables, components, and parser modules have tests. **Always write tests for new features and bug fixes.**

## Conventions

- Vue: `<script setup lang="ts">` SFC style, Composition API only.
- Rust: commands return types that implement `serde::Serialize`; args implement `serde::Deserialize`.
- State management: `tauri-plugin-store` for persistence, Vue `ref`/`reactive` for runtime state.
- Version bump: update `package.json`, `Cargo.toml`, and `tauri.conf.json` in sync.

## Roadmap

- Plugin system for extensibility (similar to Obsidian)