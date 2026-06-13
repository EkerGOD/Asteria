<template>
  <div
    v-if="contextMenu.visible"
    class="context-menu"
    :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    @click.stop
  >
    <div class="menu-item" @click="onNewFile">New File</div>
    <div class="menu-item" @click="onNewFolder">New Folder</div>
    <template v-if="contextMenu.entry">
      <div class="menu-divider"></div>
      <div class="menu-item" @click="onRename">Rename</div>
      <div class="menu-item menu-item-danger" @click="onDelete">Delete</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useFileManager } from "../../composables/useFileManager";

const {
  contextMenu,
  hideContextMenu,
  getTargetDir,
  handleNewFile,
  handleNewFolder,
  handleRename,
  handleDelete,
} = useFileManager();

function onNewFile() {
  const dir = getTargetDir(contextMenu.value.entry);
  hideContextMenu();
  handleNewFile(dir);
}

function onNewFolder() {
  const dir = getTargetDir(contextMenu.value.entry);
  hideContextMenu();
  handleNewFolder(dir);
}

function onRename() {
  const entry = contextMenu.value.entry;
  if (!entry) return;
  hideContextMenu();
  handleRename(entry);
}

function onDelete() {
  const entry = contextMenu.value.entry;
  if (!entry) return;
  hideContextMenu();
  handleDelete(entry);
}

function onDocumentClick() {
  hideContextMenu();
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 160px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  font-size: 13px;
}

.menu-item {
  padding: 6px 16px;
  cursor: pointer;
  color: #333;
  white-space: nowrap;
}

.menu-item:hover {
  background: #e8e8e8;
}

.menu-item-danger {
  color: #d32f2f;
}

.menu-item-danger:hover {
  background: #ffebee;
}

.menu-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}
</style>
