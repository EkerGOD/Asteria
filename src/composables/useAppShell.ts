import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import { Store } from "@tauri-apps/plugin-store";

export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 500;
export const DEFAULT_SIDEBAR_WIDTH = 260;

const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH);
const theme = ref<"light" | "dark">("light");

document.documentElement.setAttribute("data-theme", theme.value);

let _store: Store | null = null

async function getStore(): Promise<Store> {
  if (!_store) {
    _store = await Store.load("config.json")
  }
  return _store
}

let _sidebarSaveTimer: ReturnType<typeof setTimeout> | null = null

async function saveSidebarWidth() {
  const store = await getStore()
  await store.set("sidebarWidth", sidebarWidth.value)
  await store.save()
}

async function saveTheme() {
  const store = await getStore()
  await store.set("theme", theme.value)
  await store.save()
}

export function useAppShell(): {
  sidebarWidth: Ref<number>;
  sidebarCollapsed: ComputedRef<boolean>;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  theme: Ref<"light" | "dark">;
  toggleTheme: () => void;
  restoreAppShell: () => Promise<void>;
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
    if (_sidebarSaveTimer) clearTimeout(_sidebarSaveTimer)
    _sidebarSaveTimer = setTimeout(saveSidebarWidth, 300)
  }

  function toggleTheme() {
    const next = theme.value === "light" ? "dark" : "light";
    theme.value = next;
    document.documentElement.setAttribute("data-theme", next);
    saveTheme()
  }

  async function restoreAppShell() {
    const store = await getStore()
    const savedTheme = await store.get<"light" | "dark">("theme")
    if (savedTheme) {
      theme.value = savedTheme
      document.documentElement.setAttribute("data-theme", savedTheme)
    }
    const savedWidth = await store.get<number>("sidebarWidth")
    if (savedWidth !== null && savedWidth !== undefined) {
      sidebarWidth.value = savedWidth
    }
  }

  const sidebarCollapsed = computed(() => sidebarWidth.value === 0);

  return {
    sidebarWidth,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarWidth,
    theme,
    toggleTheme,
    restoreAppShell,
  };
}
