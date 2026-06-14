<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";

import { useFileManager } from "./composables/useFileManager";
import { useAppShell } from "./composables/useAppShell";
import { useTabs } from "./composables/useTabs";
import { useActivityBar } from "./composables/useActivityBar";

import Toolbar from "./components/toolbar/Toolbar.vue";
import MarkdownEditor from "./components/editor/MarkdownEditor.vue";
import FileTree from "./components/file-tree/FileTree.vue";
import TabBar from "./components/tabs/TabBar.vue";
import StatusBar from "./components/status-bar/StatusBar.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import ActivityBar from "./components/activity-bar/ActivityBar.vue";
import SearchPanel from "./components/search/SearchPanel.vue";

const { restoreLastFolder } = useFileManager();
const { restoreAppShell, toggleSidebar, sidebarCollapsed } = useAppShell();
const { tabs, restoreTabs } = useTabs();
const { activeActivity, setActivity } = useActivityBar();

const searchPanelRef = ref<InstanceType<typeof SearchPanel> | null>(null);

onMounted(async () => {
  await restoreAppShell()
  await restoreLastFolder()
  await restoreTabs()

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      e.preventDefault()
      setActivity("search")
      if (sidebarCollapsed.value) {
        toggleSidebar()
      }
      searchPanelRef.value?.focusInput()
    }
  })

  getCurrentWindow().onCloseRequested(async (event) => {
    await invoke("cancel_search")
    const dirtyTabs = tabs.value.filter(t => t.isDirty)
    if (dirtyTabs.length > 0) {
      const names = dirtyTabs.map(t => t.name).join(", ")
      const confirmed = await ask(
        `You have unsaved changes in:\n${names}\n\nClose anyway?`,
        { title: "Unsaved Changes", kind: "warning" }
      )
      if (!confirmed) {
        event.preventDefault()
      }
    }
  })
})

</script>

<template>
  <div class="app-wrapper">
    <Toolbar />
    <main class="container">
      <ActivityBar />
      <Sidebar>
        <FileTree v-show="activeActivity === 'files'" />
        <SearchPanel ref="searchPanelRef" v-show="activeActivity === 'search'" />
      </Sidebar>
      <div class="main-content">
        <TabBar />
        <div class="editor-wrapper">
          <MarkdownEditor />
        </div>
      </div>
    </main>
    <StatusBar />
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.container {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--bg-primary, #ffffff);
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.editor-wrapper {
  flex: 1;
  min-height: 0;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 48px 128px;
  box-sizing: border-box;
  overflow: auto;
}
</style>
