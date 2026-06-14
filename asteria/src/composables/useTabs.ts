import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";

export interface Tab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

const tabs = ref<Tab[]>([]);
const activeTabPath = ref("");
const activeContentVersion = ref(0);

let _store: Store | null = null

async function getStore(): Promise<Store> {
  if (!_store) {
    _store = await Store.load("config.json")
  }
  return _store
}

async function saveTabsState() {
  const store = await getStore()
  await store.set("openTabPaths", tabs.value.map(t => t.path))
  await store.set("activeTabPath", activeTabPath.value)
  await store.save()
}

export function useTabs() {
  function openTab(path: string, name: string, content: string) {
    const existing = tabs.value.find((t) => t.path === path);
    if (existing) {
      existing.content = content;
      existing.isDirty = false;
      activeTabPath.value = path;
    } else {
      tabs.value.push({ path, name, content, isDirty: false });
      activeTabPath.value = path;
    }
    activeContentVersion.value++;
    saveTabsState()
  }

  function closeTab(path: string) {
    const idx = tabs.value.findIndex((t) => t.path === path);
    if (idx === -1) return;

    const tab = tabs.value[idx];
    if (tab.isDirty) {
      const confirmed = window.confirm(
        `"${tab.name}" has unsaved changes. Close anyway?`
      );
      if (!confirmed) return;
    }

    tabs.value.splice(idx, 1);
    if (activeTabPath.value === path) {
      if (tabs.value.length > 0) {
        const newIdx = Math.min(idx, tabs.value.length - 1);
        activeTabPath.value = tabs.value[newIdx].path;
      } else {
        activeTabPath.value = "";
      }
      activeContentVersion.value++;
    }
    saveTabsState()
  }

  function switchTab(path: string) {
    if (activeTabPath.value === path) return;
    activeTabPath.value = path;
    activeContentVersion.value++;
    saveTabsState()
  }

  const activeTab = computed(() =>
    tabs.value.find((t) => t.path === activeTabPath.value) || null
  );

  function updateContent(path: string, content: string) {
    const tab = tabs.value.find((t) => t.path === path);
    if (tab && tab.content !== content) {
      tab.content = content;
      tab.isDirty = true;
    }
  }

  function markClean(path: string) {
    const tab = tabs.value.find((t) => t.path === path);
    if (tab) tab.isDirty = false;
  }

  async function restoreTabs() {
    const store = await getStore()
    const savedPaths = await store.get<string[]>("openTabPaths")
    const savedActivePath = await store.get<string>("activeTabPath")
    if (!savedPaths || savedPaths.length === 0) return

    for (const filePath of savedPaths) {
      try {
        const content = await invoke<string>("read_file", { path: filePath })
        const name = filePath.includes("\\")
          ? filePath.slice(filePath.lastIndexOf("\\") + 1)
          : filePath.slice(filePath.lastIndexOf("/") + 1)
        tabs.value.push({ path: filePath, name, content, isDirty: false })
      } catch {
        // file no longer exists, skip
      }
    }

    if (savedActivePath && tabs.value.some(t => t.path === savedActivePath)) {
      activeTabPath.value = savedActivePath
      activeContentVersion.value++
    } else if (tabs.value.length > 0) {
      activeTabPath.value = tabs.value[0].path
      activeContentVersion.value++
    }
  }

  return {
    tabs,
    activeTabPath,
    activeContentVersion,
    activeTab,
    openTab,
    closeTab,
    switchTab,
    updateContent,
    markClean,
    restoreTabs,
  };
}
