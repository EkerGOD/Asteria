# Asteria

[中文](./README.md)

A lightweight Markdown editor built with Tauri v2 + Vue 3 + TypeScript. Minimal core, extensible via a plugin system (planned).

## Features

- File tree: create, rename, and delete files/folders
- Tabbed multi-file editing
- Markdown editor with syntax highlighting and live preview
- Full-text search and replace across directories
- Custom `asteria://` protocol for local image rendering
- Persistent window state and open tabs across sessions

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + CodeMirror 6
- **Backend**: Tauri v2 (Rust)
- **Build**: Vite + Bun

## Getting Started

```bash
# Install dependencies
bun install

# Run in development mode
bun run tauri dev

# Build for production
bun run tauri build
```

## Project Structure

```
asteria/
  src/                  # Vue frontend
    components/         # UI components
    composables/        # Vue composition functions
    editor/             # CodeMirror extensions
    parser/             # Markdown lexer & parser
  src-tauri/            # Rust backend
    src/commands/       # Tauri IPC commands
    capabilities/       # Permission configs
```

## Roadmap

- Plugin system for extensibility (similar to Obsidian)

## License

MIT