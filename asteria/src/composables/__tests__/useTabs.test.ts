import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: vi.fn(() =>
      Promise.resolve({
        get: vi.fn(() => Promise.resolve(null)),
        set: vi.fn(() => Promise.resolve()),
        save: vi.fn(() => Promise.resolve()),
      })
    ),
  },
}));

import { useTabs } from "../useTabs";

describe("useTabs", () => {
  let tabs: ReturnType<typeof useTabs>;

  beforeEach(() => {
    tabs = useTabs();
    tabs.tabs.value.splice(0, tabs.tabs.value.length);
    tabs.activeTabPath.value = "";
    tabs.activeContentVersion.value = 0;
    tabs.saveStatusMap.value = {};
    tabs.cursorLine.value = 1;
    tabs.cursorCol.value = 1;
  });

  describe("openTab", () => {
    it("adds a new tab", () => {
      tabs.openTab("/path/file.md", "file.md", "# content");
      expect(tabs.tabs.value).toHaveLength(1);
      expect(tabs.tabs.value[0].path).toBe("/path/file.md");
      expect(tabs.tabs.value[0].isDirty).toBe(false);
    });

    it("sets active tab when opening", () => {
      tabs.openTab("/path/file.md", "file.md", "content");
      expect(tabs.activeTabPath.value).toBe("/path/file.md");
    });

    it("reuses existing tab for same path", () => {
      tabs.openTab("/path/a.md", "a.md", "old");
      tabs.openTab("/path/b.md", "b.md", "b content");
      tabs.openTab("/path/a.md", "a.md", "new");
      expect(tabs.tabs.value).toHaveLength(2);
      expect(tabs.activeTabPath.value).toBe("/path/a.md");
      expect(tabs.tabs.value[0].content).toBe("new");
      expect(tabs.tabs.value[0].isDirty).toBe(false);
    });

    it("increments activeContentVersion", () => {
      const v1 = tabs.activeContentVersion.value;
      tabs.openTab("/path/file.md", "file.md", "content");
      expect(tabs.activeContentVersion.value).toBeGreaterThan(v1);
    });
  });

  describe("closeTab", () => {
    it("removes the tab", () => {
      tabs.openTab("/path/a.md", "a.md", "a");
      tabs.openTab("/path/b.md", "b.md", "b");
      tabs.closeTab("/path/a.md");
      expect(tabs.tabs.value).toHaveLength(1);
      expect(tabs.tabs.value[0].path).toBe("/path/b.md");
    });

    it("switches to next tab when closing active", () => {
      tabs.openTab("/path/a.md", "a.md", "a");
      tabs.openTab("/path/b.md", "b.md", "b");
      tabs.closeTab("/path/a.md");
      expect(tabs.activeTabPath.value).toBe("/path/b.md");
    });

    it("clears activeTabPath when closing last tab", () => {
      tabs.openTab("/path/a.md", "a.md", "a");
      tabs.closeTab("/path/a.md");
      expect(tabs.activeTabPath.value).toBe("");
    });

    it("handles close of non-existent tab", () => {
      expect(() => tabs.closeTab("/nonexistent")).not.toThrow();
    });
  });

  describe("switchTab", () => {
    it("switches to a different tab", () => {
      tabs.openTab("/path/a.md", "a.md", "a");
      tabs.openTab("/path/b.md", "b.md", "b");
      tabs.switchTab("/path/a.md");
      expect(tabs.activeTabPath.value).toBe("/path/a.md");
    });

    it("does nothing when switching to current tab", () => {
      tabs.openTab("/path/a.md", "a.md", "a");
      const v = tabs.activeContentVersion.value;
      tabs.switchTab("/path/a.md");
      expect(tabs.activeContentVersion.value).toBe(v);
    });
  });

  describe("activeTab", () => {
    it("returns the active tab", () => {
      tabs.openTab("/path/a.md", "a.md", "content a");
      tabs.openTab("/path/b.md", "b.md", "content b");
      tabs.switchTab("/path/a.md");
      expect(tabs.activeTab.value?.path).toBe("/path/a.md");
    });

    it("returns null when no tabs", () => {
      expect(tabs.activeTab.value).toBeNull();
    });
  });

  describe("updateContent / markClean", () => {
    it("marks tab as dirty when content changes", () => {
      tabs.openTab("/path/a.md", "a.md", "original");
      tabs.updateContent("/path/a.md", "modified");
      expect(tabs.tabs.value[0].isDirty).toBe(true);
    });

    it("does not mark dirty when content unchanged", () => {
      tabs.openTab("/path/a.md", "a.md", "same");
      tabs.updateContent("/path/a.md", "same");
      expect(tabs.tabs.value[0].isDirty).toBe(false);
    });

    it("markClean sets isDirty to false", () => {
      tabs.openTab("/path/a.md", "a.md", "original");
      tabs.updateContent("/path/a.md", "modified");
      tabs.markClean("/path/a.md");
      expect(tabs.tabs.value[0].isDirty).toBe(false);
    });
  });

  describe("saveStatus", () => {
    it("defaults to idle", () => {
      tabs.openTab("/path/a.md", "a.md", "content");
      expect(tabs.getSaveStatus("/path/a.md")).toBe("idle");
    });

    it("setSaveStatus updates the status", () => {
      tabs.openTab("/path/a.md", "a.md", "content");
      tabs.setSaveStatus("/path/a.md", "saving");
      expect(tabs.saveStatusMap.value["/path/a.md"]).toBe("saving");
    });

    it("getSaveStatus for unknown path returns idle", () => {
      expect(tabs.getSaveStatus("/unknown")).toBe("idle");
    });
  });

  describe("cursor tracking", () => {
    it("defaults cursor position to 1:1", () => {
      expect(tabs.cursorLine.value).toBe(1);
      expect(tabs.cursorCol.value).toBe(1);
    });

    it("setCursorPos updates cursor position", () => {
      tabs.setCursorPos(5, 10);
      expect(tabs.cursorLine.value).toBe(5);
      expect(tabs.cursorCol.value).toBe(10);
    });
  });
});
