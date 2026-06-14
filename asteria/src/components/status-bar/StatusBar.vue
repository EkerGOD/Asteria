<template>
  <div class="status-bar">
    <span v-if="statusText" :class="statusClass">
      <span v-if="statusSaving" class="status-spinner" />
      {{ statusText }}
    </span>
    <span class="status-spacer" />
    <span class="status-info">Words {{ wordCount }}</span>
    <span class="status-info">Ln {{ cursorLine }}, Col {{ cursorCol }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTabs } from "../../composables/useTabs";

const { activeTab, saveStatusMap, cursorLine, cursorCol } = useTabs();

const statusText = computed(() => {
  const tab = activeTab.value;
  if (!tab) return "";
  const status = saveStatusMap.value[tab.path];
  if (status === "saving") return "Saving...";
  if (status === "saved") return "Saved";
  if (status === "error") return "Save failed";
  return "";
});

const statusClass = computed(() => {
  const tab = activeTab.value;
  if (!tab) return "";
  const status = saveStatusMap.value[tab.path];
  if (status === "saving") return "status-saving";
  if (status === "saved") return "status-saved";
  if (status === "error") return "status-error";
  return "";
});

const statusSaving = computed(() => {
  const tab = activeTab.value;
  if (!tab) return false;
  return saveStatusMap.value[tab.path] === "saving";
});

const wordCount = computed(() => {
  const tab = activeTab.value;
  if (!tab || !tab.content) return 0;
  const text = tab.content.trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
});
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  background: var(--bg-tertiary, #f0f0f0);
  border-top: 1px solid var(--border-primary, #e0e0e0);
  font-size: 11px;
  color: var(--text-muted, #888);
  flex-shrink: 0;
  user-select: none;
  gap: 12px;
}

.status-spacer {
  flex: 1;
}

.status-saving {
  color: #ffa726;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-saved {
  color: #4caf50;
}

.status-error {
  color: #f44336;
}

.status-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid #ffa726;
  border-top-color: transparent;
  border-radius: 50%;
  animation: status-spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes status-spin {
  to { transform: rotate(360deg); }
}

.status-info {
  color: var(--text-muted, #888);
}
</style>