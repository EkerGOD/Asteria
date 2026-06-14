<script setup lang="ts">
import { onMounted } from "vue";

import { testLexer } from './parser/lexer'
import { useFileManager } from "./composables/useFileManager";
import { useAppShell } from "./composables/useAppShell";
import { useTabs } from "./composables/useTabs";

import Toolbar from "./components/toolbar/Toolbar.vue";
import MarkdownEditor from "./components/editor/MarkdownEditor.vue";
import FileTree from "./components/file-tree/FileTree.vue";
import TabBar from "./components/tabs/TabBar.vue";
import Sidebar from "./components/layout/Sidebar.vue";

const { restoreLastFolder } = useFileManager();
const { restoreAppShell } = useAppShell();
const { restoreTabs } = useTabs();

onMounted(async () => {
  testLexer()
  await restoreAppShell()
  await restoreLastFolder()
  await restoreTabs()
})

</script>

<template>
  <div class="app-wrapper">
    <Toolbar />
    <main class="container">
      <Sidebar>
        <FileTree />
      </Sidebar>
      <div class="main-content">
        <TabBar />
        <div class="editor-wrapper">
          <MarkdownEditor />
        </div>
      </div>
    </main>
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
