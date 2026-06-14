<template>
  <div class="node-row" :style="{ paddingLeft: (depth + 1) * 16 + 'px' }">
    <span class="toggle-icon" />
    <span class="node-icon">
      <span class="codicon" :class="creatingIsDir ? 'codicon-folder' : 'codicon-file'" />
    </span>
    <input
      ref="newItemInput"
      v-model="newItemName"
      class="rename-input"
      placeholder="Type name..."
      @keydown.enter.prevent="onConfirm"
      @keydown.escape.prevent="cancelCreate"
      @blur="cancelCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useFileManager } from "../../composables/useFileManager";

defineProps<{
  depth: number;
}>();

const { creatingIn, creatingIsDir, cancelCreate, confirmCreate } = useFileManager();
const newItemName = ref("");
const newItemInput = ref<HTMLInputElement | null>(null);

watch(
  () => creatingIn.value,
  async (val) => {
    if (val !== null) {
      newItemName.value = "";
      await nextTick();
      newItemInput.value?.focus();
    }
  },
  { immediate: true }
);

function onConfirm() {
  confirmCreate(newItemName.value);
}
</script>

<style scoped>
.node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
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

.rename-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--text-primary, #1a1a1a);
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 2px;
  padding: 0 4px;
  outline: none;
}

.rename-input:focus {
  border-color: var(--link-color, #0066cc);
}
</style>
