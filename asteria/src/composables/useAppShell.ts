import { ref } from "vue";
import type { Ref } from "vue";

const sidebarCollapsed = ref(false);
const theme = ref<"light" | "dark">("light");

document.documentElement.setAttribute("data-theme", theme.value);

export function useAppShell(): {
  sidebarCollapsed: Ref<boolean>;
  toggleSidebar: () => void;
  theme: Ref<"light" | "dark">;
  toggleTheme: () => void;
} {
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function toggleTheme() {
    const next = theme.value === "light" ? "dark" : "light";
    theme.value = next;
    document.documentElement.setAttribute("data-theme", next);
  }

  return {
    sidebarCollapsed,
    toggleSidebar,
    theme,
    toggleTheme,
  };
}
