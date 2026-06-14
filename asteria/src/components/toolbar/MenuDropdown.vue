<template>
  <div
    v-if="visible"
    ref="dropdownRef"
    data-menu-dropdown
    class="menu-dropdown"
    @keydown="onKeydown"
  >
    <template v-for="item in items" :key="item.id">
      <div v-if="item.type === 'separator'" data-menu-separator class="menu-separator" />
      <button
        v-else
        :data-menu-item="item.id"
        class="menu-item"
        :class="{ disabled: item.disabled }"
        :disabled="item.disabled"
        @click="onItemClick(item)"
      >
        <span v-if="item.icon" class="codicon" :class="item.icon" />
        <span class="menu-label">{{ item.label }}</span>
        <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  type?: "normal" | "separator";
  disabled?: boolean;
}

defineProps<{
  items: MenuItem[];
  visible: boolean;
}>();

const emit = defineEmits<{
  select: [item: MenuItem];
  close: [];
}>();

const dropdownRef = ref<HTMLElement | null>(null);

function onItemClick(item: MenuItem) {
  if (item.type === "separator" || item.disabled) return;
  emit("select", item);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    emit("close");
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!dropdownRef.value) return;
  if (!dropdownRef.value.contains(e.target as Node)) {
    emit("close");
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside, true);
});
</script>

<style scoped>
.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  width: max-content;
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-primary, #e0e0e0);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  z-index: 1000;
}

.menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  text-align: left;
  gap: 8px;
  white-space: nowrap;
}

.menu-item:hover:not(.disabled) {
  background: var(--bg-hover, #e8e8e8);
}

.menu-item.disabled {
  opacity: 0.4;
  cursor: default;
}

.menu-label {
  flex: 1;
}

.menu-shortcut {
  color: var(--text-muted, #888);
  font-size: 12px;
  margin-left: 24px;
}

.menu-separator {
  height: 1px;
  margin: 4px 12px;
  background: var(--border-primary, #e0e0e0);
}

.codicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
