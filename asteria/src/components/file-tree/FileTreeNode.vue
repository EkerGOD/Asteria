<template>
  <div class="file-tree-node">
    <div
      class="node-row"
      :style="{ paddingLeft: depth * 16 + 'px' }"
      :class="{ selected: selectedFile === entry.path }"
      @click="handleClick"
      @contextmenu.prevent="handleContextMenu"
    >
      <span class="toggle-icon">
        <span v-if="entry.is_dir" class="codicon" :class="expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'" />
      </span>
      <span class="node-icon">
        <span class="codicon" :class="entry.is_dir ? (expanded ? 'codicon-folder-opened' : 'codicon-folder') : 'codicon-file'" />
      </span>
      <span class="node-name">{{ entry.name }}</span>
    </div>
    <div v-if="entry.is_dir && expanded && loaded">
      <FileTreeNode
        v-for="child in entry.children"
        :key="child.path"
        :entry="child"
        :depth="depth + 1"
      />
      <div v-if="!entry.children || entry.children.length === 0" class="empty-dir">
        Empty folder
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useFileManager, type FileEntry } from "../../composables/useFileManager";

const props = defineProps<{
  entry: FileEntry;
  depth: number;
}>();

const { selectedFile, selectFile, loadChildren, showContextMenu } = useFileManager();
const expanded = ref(false);
const loaded = ref(false);

async function handleClick() {
  if (props.entry.is_dir) {
    expanded.value = !expanded.value;
    if (expanded.value && !loaded.value) {
      await loadChildren(props.entry.path);
      loaded.value = true;
    }
  } else {
    await selectFile(props.entry.path);
  }
}

function handleContextMenu(e: MouseEvent) {
  e.stopPropagation();
  showContextMenu(props.entry, e.clientX, e.clientY);
}
</script>

<style scoped>
.file-tree-node {
  user-select: none;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #1a1a1a);
}

.node-row:hover {
  background: var(--bg-hover, #e8e8e8);
}

.node-row.selected {
  background: #d0e0ff;
  color: var(--text-primary, #1a1a1a);
}

.toggle-icon {
  width: 14px;
  font-size: 12px;
  flex-shrink: 0;
  text-align: center;
  color: var(--text-muted, #888);
}

.node-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-dir {
  padding: 2px 8px 2px 34px;
  font-size: 12px;
  color: var(--text-muted, #888);
  font-style: italic;
}
</style>
