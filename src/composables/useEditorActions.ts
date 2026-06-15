import { undo, redo, selectAll } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";

let editor: EditorView | null = null;

export function useEditorActions(): {
  registerEditor: (view: EditorView) => void;
  undo: () => void;
  redo: () => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
  goToLine: (line: number, col?: number) => void;
} {
  function registerEditor(view: EditorView) {
    editor = view;
  }

  function undoAction() {
    if (!editor) return;
    undo(editor);
  }

  function redoAction() {
    if (!editor) return;
    redo(editor);
  }

  function selectAllAction() {
    if (!editor) return;
    selectAll(editor);
  }

  function cut() {
    if (!editor) return;
    const { from, to } = editor.state.selection.main;
    if (from === to) return;
    const text = editor.state.sliceDoc(from, to);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    editor.dispatch({ changes: { from, to } });
  }

  function copy() {
    if (!editor) return;
    const { from, to } = editor.state.selection.main;
    if (from === to) return;
    const text = editor.state.sliceDoc(from, to);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  }

  function paste() {
    if (!editor) return;
    if (!navigator.clipboard?.readText) return;
    navigator.clipboard.readText().then((text) => {
      if (editor && text) {
        const { from, to } = editor.state.selection.main;
        editor.dispatch({ changes: { from, to, insert: text } });
      }
    });
  }

  function goToLine(line: number, col?: number) {
    if (!editor) return;
    const doc = editor.state.doc;
    const targetLine = Math.max(1, Math.min(line, doc.lines));
    const lineObj = doc.line(targetLine);
    const pos = Math.min(lineObj.from + (col ?? 0), lineObj.to);
    editor.dispatch({
      selection: { anchor: pos, head: pos },
      scrollIntoView: true,
    });
  }

  return {
    registerEditor,
    undo: undoAction,
    redo: redoAction,
    cut,
    copy,
    paste,
    selectAll: selectAllAction,
    goToLine,
  };
}
