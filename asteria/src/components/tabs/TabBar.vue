<template>
  <div v-if="tabs.length > 0" class="tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.path"
      class="tab-item"
      :class="{ active: tab.path === activeTabPath }"
      @click="switchTab(tab.path)"
      @click.middle.prevent="closeTab(tab.path)"
    >
      <span class="tab-name">{{ tab.name }}</span>
      <span v-if="tab.isDirty" class="tab-dirty codicon codicon-circle-filled" title="Unsaved changes" />
      <button class="tab-close" @click.stop="closeTab(tab.path)" title="Close">
        <span class="codicon codicon-close" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTabs } from "../../composables/useTabs";

const { tabs, activeTabPath, switchTab, closeTab } = useTabs();
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  background: var(--bg-tertiary, #f0f0f0);
  border-bottom: 1px solid var(--border-secondary, #d0d0d0);
  padding: 4px 4px 0;
  overflow-x: auto;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px 5px 12px;
  background: var(--bg-hover, #e0e0e0);
  border: 1px solid var(--border-secondary, #d0d0d0);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  max-width: 180px;
}

.tab-item:hover {
  background: var(--bg-hover, #e8e8e8);
}

.tab-item.active {
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #1a1a1a);
  border-color: var(--border-secondary, #d0d0d0);
}

.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.tab-dirty {
  color: #2196f3;
  font-size: 8px;
  line-height: 1;
  flex-shrink: 0;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted, #888);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.tab-close:hover {
  background: var(--bg-hover, #e8e8e8);
  color: var(--text-primary, #1a1a1a);
}
</style>
