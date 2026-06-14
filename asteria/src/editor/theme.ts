import { EditorView } from "@codemirror/view";

/**
 * CM6 编辑器主题 — 通过 CSS 变量引用亮色/暗色主题值。
 * 搭配 `src/styles/variables.css` 中的 `:root` / `[data-theme="dark"]` 使用。
 */
export const editorTheme = EditorView.theme(
  {
    "&": {
      color: "var(--text-primary)",
      backgroundColor: "var(--bg-primary)",
    },
    ".cm-content": {
      caretColor: "var(--editor-caret)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--editor-caret)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#b3d4ff",
      },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-selectionMatch": {
      backgroundColor: "#c0d8f0",
    },
    ".cm-gutters": {
      backgroundColor: "var(--gutter-bg)",
      color: "var(--gutter-color)",
      border: "none",
      borderRight: "1px solid var(--gutter-border)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--gutter-bg)",
      color: "var(--gutter-active-color)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--bg-tertiary)",
      border: "1px solid var(--border-secondary)",
      color: "var(--text-secondary)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--bg-primary)",
      border: "1px solid var(--border-primary)",
      color: "var(--text-primary)",
    },
    ".cm-scroller": {
      paddingBottom: "50vh",
    },
  },
  { dark: false }
);
