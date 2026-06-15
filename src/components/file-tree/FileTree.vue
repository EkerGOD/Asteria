<template>
  <div class="file-tree">
    <div class="file-tree-header">
      <span v-if="currentFolder" class="current-path" :title="currentFolder">{{ currentFolder }}</span>
    </div>
    <div class="file-tree-body" @contextmenu.prevent="handleBodyContextMenu">
      <template v-if="currentFolder">
        <FileTreeNode
          v-for="entry in fileTree"
          :key="entry.path"
          :entry="entry"
          :depth="0"
        />
        <NewItemRow v-if="creatingIn === currentFolder" :depth="0" />
        <div v-if="fileTree.length === 0 && creatingIn !== currentFolder" class="empty-dir">
          Empty folder
        </div>
      </template>
      <div v-else class="empty-state">
        Open a folder to get started
      </div>
    </div>
    <FileTreeContextMenu />
  </div>
</template>

<script setup lang="ts">
import { useFileManager } from "../../composables/useFileManager";
import FileTreeNode from "./FileTreeNode.vue";
import FileTreeContextMenu from "./FileTreeContextMenu.vue";
import NewItemRow from "./NewItemRow.vue";

const { currentFolder, fileTree, showContextMenu, creatingIn } = useFileManager();

function handleBodyContextMenu(e: MouseEvent) {
  showContextMenu(null, e.clientX, e.clientY);
}
</script>

<style scoped>
.file-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary, #fafafa);
  border-right: 1px solid var(--border-primary, #e0e0e0);
}

.file-tree-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--border-primary, #e0e0e0);
}

.current-path {
  font-size: 11px;
  color: var(--text-muted, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.empty-state,
.empty-dir {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted, #888);
}
</style>
