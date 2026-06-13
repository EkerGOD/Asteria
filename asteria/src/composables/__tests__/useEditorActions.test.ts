import { describe, it, expect } from "vitest";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { history } from "@codemirror/commands";
import { useEditorActions } from "../useEditorActions";

function createEditor(doc: string): EditorView {
  const container = document.createElement("div");
  const state = EditorState.create({
    doc,
    extensions: [history(), keymap.of([])],
  });
  return new EditorView({ state, parent: container });
}

describe("useEditorActions", () => {
  describe("before registration", () => {
    it("undo does not throw", () => {
      const { undo: undoAction } = useEditorActions();
      expect(() => undoAction()).not.toThrow();
    });

    it("redo does not throw", () => {
      const { redo: redoAction } = useEditorActions();
      expect(() => redoAction()).not.toThrow();
    });

    it("cut does not throw", () => {
      const { cut } = useEditorActions();
      expect(() => cut()).not.toThrow();
    });

    it("copy does not throw", () => {
      const { copy } = useEditorActions();
      expect(() => copy()).not.toThrow();
    });

    it("paste does not throw", () => {
      const { paste } = useEditorActions();
      expect(() => paste()).not.toThrow();
    });

    it("selectAll does not throw", () => {
      const { selectAll: selectAllAction } = useEditorActions();
      expect(() => selectAllAction()).not.toThrow();
    });
  });

  describe("after registration", () => {
    it("undo reverts the last change", () => {
      const { registerEditor, undo: undoAction } = useEditorActions();
      const view = createEditor("hello world");
      registerEditor(view);

      view.dispatch({ changes: { from: 5, to: 5, insert: " beautiful" } });
      expect(view.state.doc.toString()).toBe("hello beautiful world");

      undoAction();
      expect(view.state.doc.toString()).toBe("hello world");

      view.destroy();
    });

    it("redo restores an undone change", () => {
      const { registerEditor, undo: undoAction, redo: redoAction } =
        useEditorActions();
      const view = createEditor("hello world");
      registerEditor(view);

      view.dispatch({ changes: { from: 5, to: 5, insert: " beautiful" } });
      undoAction();
      expect(view.state.doc.toString()).toBe("hello world");

      redoAction();
      expect(view.state.doc.toString()).toBe("hello beautiful world");

      view.destroy();
    });

    it("selectAll selects the entire document", () => {
      const { registerEditor, selectAll: selectAllAction } =
        useEditorActions();
      const view = createEditor("hello\nworld");
      registerEditor(view);

      selectAllAction();
      const sel = view.state.selection.main;
      expect(sel.from).toBe(0);
      expect(sel.to).toBe(view.state.doc.length);

      view.destroy();
    });

    it("cut removes selected text", () => {
      const { registerEditor, selectAll: selectAllAction, cut } =
        useEditorActions();
      const view = createEditor("hello world");
      registerEditor(view);

      selectAllAction();
      cut();
      expect(view.state.doc.toString()).toBe("");

      view.destroy();
    });

    it("copy does not change the document", () => {
      const { registerEditor, selectAll: selectAllAction, copy } =
        useEditorActions();
      const view = createEditor("hello world");
      registerEditor(view);

      selectAllAction();
      copy();
      expect(view.state.doc.toString()).toBe("hello world");

      view.destroy();
    });

    it("paste is callable after registration", () => {
      const { registerEditor, paste } = useEditorActions();
      const view = createEditor("hello world");
      registerEditor(view);

      expect(() => paste()).not.toThrow();

      view.destroy();
    });
  });
});
