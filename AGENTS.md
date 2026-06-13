# AGENTS.md

## Project purpose

This is a **project-driven learning repository**. The user is learning Tauri desktop development by building the `asteria` app.

**CRITICAL: Do NOT write code for the user.** Unless explicitly asked to write code, only provide hints, explanations, and step-by-step guidance. Tell the user _what_ to do and _why_, not _how_ to type it.

## Repo layout

```
learn-anything/
  asteria/              # Tauri v2 + Vue 3 + TypeScript desktop app (THE project)
    src/                # Vue frontend (Vite, <script setup> SFCs)
    src-tauri/          # Rust backend (Tauri v2)
      src/lib.rs        # App entry: registers plugins + invoke_handler
      src/main.rs       # Thin wrapper calling asteria_lib::run()
      capabilities/     # Tauri permission configs
      Cargo.toml        # Rust deps: tauri, serde, tauri-plugin-{opener,fs,dialog}
    package.json        # Frontend deps: vue, @tauri-apps/api, vite
    vite.config.ts      # Dev server pinned to port 1420
  .learn/topics/        # Learning progress tracking (YAML state per topic)
  package.json          # Root deps: codemirror, @tauri-apps/plugin-{fs,dialog}
```

## Commands

All frontend/tauri commands run from `asteria/`:

| Task | Command |
|---|---|
| Dev (full app) | `bun run tauri dev` |
| Dev (frontend only) | `bun run dev` |
| Typecheck + build | `bun run build` (runs `vue-tsc --noEmit && vite build`) |
| Typecheck only | `bunx vue-tsc --noEmit` |
| Rust build | `cargo build` from `asteria/src-tauri/` |

Package manager: **bun** (see `bun.lock` files).

## Architecture notes

- **IPC pattern**: Vue calls `invoke("cmd_name", { args })` -> Rust `#[tauri::command] fn cmd_name()`. Register new commands in `lib.rs` via `invoke_handler(tauri::generate_handler![...])`.
- **Tauri plugins**: `fs`, `dialog`, `opener` are registered in `lib.rs` and permitted in `capabilities/default.json`. Adding a new plugin requires both.
- **Vite port is fixed at 1420** (strict mode). Tauri dev connects to `http://localhost:1420`.
- **TypeScript is strict**: `noUnusedLocals`, `noUnusedParameters`, `isolatedModules` are all on.

## Conventions

- Vue: `<script setup lang="ts">` SFC style, Composition API only.
- Rust: commands return types that implement `serde::Serialize`; args implement `serde::Deserialize`.
- No test framework is configured yet.
