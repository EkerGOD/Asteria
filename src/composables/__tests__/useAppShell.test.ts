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

import { useAppShell } from "../useAppShell";

describe("useAppShell", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  describe("sidebarCollapsed", () => {
    it("defaults to false", () => {
      const { sidebarCollapsed } = useAppShell();
      expect(sidebarCollapsed.value).toBe(false);
    });

    it("toggleSidebar flips the value", () => {
      const { sidebarCollapsed, toggleSidebar } = useAppShell();
      expect(sidebarCollapsed.value).toBe(false);

      toggleSidebar();
      expect(sidebarCollapsed.value).toBe(true);

      toggleSidebar();
      expect(sidebarCollapsed.value).toBe(false);
    });
  });

  describe("theme", () => {
    it("defaults to light", () => {
      const { theme } = useAppShell();
      expect(theme.value).toBe("light");
    });

    it("toggleTheme switches between light and dark", () => {
      const { theme, toggleTheme } = useAppShell();
      expect(theme.value).toBe("light");

      toggleTheme();
      expect(theme.value).toBe("dark");

      toggleTheme();
      expect(theme.value).toBe("light");
    });

    it("toggleTheme sets data-theme attribute on document element", () => {
      const { toggleTheme } = useAppShell();

      toggleTheme();
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

      toggleTheme();
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });
});
