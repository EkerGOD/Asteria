import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";

export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 500;
export const DEFAULT_SIDEBAR_WIDTH = 260;

const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH);
const theme = ref<"light" | "dark">("light");

document.documentElement.setAttribute("data-theme", theme.value);

export function useAppShell(): {
  sidebarWidth: Ref<number>;
  sidebarCollapsed: ComputedRef<boolean>;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  theme: Ref<"light" | "dark">;
  toggleTheme: () => void;
} {
  function toggleSidebar() {
    if (sidebarWidth.value > 0) {
      sidebarWidth.value = 0;
    } else {
      sidebarWidth.value = DEFAULT_SIDEBAR_WIDTH;
    }
  }

  function setSidebarWidth(w: number) {
    if (w < MIN_SIDEBAR_WIDTH) {
      sidebarWidth.value = 0;
    } else {
      sidebarWidth.value = Math.min(w, MAX_SIDEBAR_WIDTH);
    }
  }

  function toggleTheme() {
    const next = theme.value === "light" ? "dark" : "light";
    theme.value = next;
    document.documentElement.setAttribute("data-theme", next);
  }

  const sidebarCollapsed = computed(() => sidebarWidth.value === 0);

  return {
    sidebarWidth,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarWidth,
    theme,
    toggleTheme,
  };
}
