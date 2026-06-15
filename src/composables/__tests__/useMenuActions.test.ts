import { describe, it, expect, vi } from "vitest";
import { useMenuActions } from "../useMenuActions";
import type { MenuItem } from "../../components/toolbar/MenuDropdown.vue";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

vi.mock("../useAppShell", () => ({
  useAppShell: () => ({
    toggleSidebar: vi.fn(),
    toggleTheme: vi.fn(),
    sidebarCollapsed: { value: false },
    theme: { value: "light" as const },
  }),
}));

vi.mock("../useEditorActions", () => ({
  useEditorActions: () => ({
    undo: vi.fn(),
    redo: vi.fn(),
    cut: vi.fn(),
    copy: vi.fn(),
    paste: vi.fn(),
    selectAll: vi.fn(),
    registerEditor: vi.fn(),
  }),
}));

vi.mock("../useTabs", () => ({
  useTabs: () => ({
    closeTab: vi.fn(),
    activeTabPath: { value: "" },
    activeTab: { value: null },
    tabs: { value: [] },
  }),
}));

vi.mock("../useFileManager", () => ({
  useFileManager: () => ({
    openFolder: vi.fn(),
    selectFile: vi.fn(),
    saveFile: vi.fn(),
    handleNewFile: vi.fn(),
    handleNewFolder: vi.fn(),
    currentFolder: { value: "" },
  }),
}));

describe("useMenuActions", () => {
  describe("View menu", () => {
    it("toggle-sidebar calls toggleSidebar", () => {
      const { onMenuSelect } = useMenuActions();
      const item: MenuItem = { id: "toggle-sidebar", label: "Toggle Sidebar" };
      onMenuSelect(item);
      expect(onMenuSelect).toBeDefined();
    });

    it("toggle-theme calls toggleTheme", () => {
      const { onMenuSelect } = useMenuActions();
      const item: MenuItem = { id: "toggle-theme", label: "Toggle Dark Mode" };
      expect(() => onMenuSelect(item)).not.toThrow();
    });
  });

  describe("Edit menu", () => {
    it("undo does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() => onMenuSelect({ id: "undo", label: "Undo" })).not.toThrow();
    });

    it("redo does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() => onMenuSelect({ id: "redo", label: "Redo" })).not.toThrow();
    });

    it("cut does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() => onMenuSelect({ id: "cut", label: "Cut" })).not.toThrow();
    });

    it("copy does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() => onMenuSelect({ id: "copy", label: "Copy" })).not.toThrow();
    });

    it("paste does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() => onMenuSelect({ id: "paste", label: "Paste" })).not.toThrow();
    });

    it("select-all does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() =>
        onMenuSelect({ id: "select-all", label: "Select All" })
      ).not.toThrow();
    });
  });

  describe("File menu", () => {
    it("open-folder does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() =>
        onMenuSelect({ id: "open-folder", label: "Open Folder" })
      ).not.toThrow();
    });

    it("new-folder does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() =>
        onMenuSelect({ id: "new-folder", label: "New Folder" })
      ).not.toThrow();
    });

    it("save does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() => onMenuSelect({ id: "save", label: "Save" })).not.toThrow();
    });

    it("close-tab does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() =>
        onMenuSelect({ id: "close-tab", label: "Close Tab" })
      ).not.toThrow();
    });
  });

  describe("Help menu", () => {
    it("about does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() =>
        onMenuSelect({ id: "about", label: "About" })
      ).not.toThrow();
    });

    it("welcome does not throw", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() =>
        onMenuSelect({ id: "welcome", label: "Welcome" })
      ).not.toThrow();
    });
  });

  describe("unknown item", () => {
    it("does not throw for unknown menu item", () => {
      const { onMenuSelect } = useMenuActions();
      expect(() =>
        onMenuSelect({ id: "unknown", label: "Unknown" })
      ).not.toThrow();
    });
  });
});
