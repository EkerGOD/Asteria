import { ref, computed } from "vue";

export interface Tab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

const tabs = ref<Tab[]>([]);
const activeTabPath = ref("");
const activeContentVersion = ref(0);

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
  }

  function switchTab(path: string) {
    if (activeTabPath.value === path) return;
    activeTabPath.value = path;
    activeContentVersion.value++;
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
  };
}
