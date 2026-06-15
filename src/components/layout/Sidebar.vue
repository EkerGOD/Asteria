<template>
  <aside
    class="sidebar"
    :style="{ width: sidebarWidth + 'px' }"
    :class="{ collapsed: sidebarCollapsed, resizing: isResizing }"
  >
    <div class="sidebar-inner">
      <div v-show="!sidebarCollapsed" class="sidebar-content">
        <slot />
      </div>
    </div>
    <div
      v-show="!sidebarCollapsed"
      class="resize-handle"
      @mousedown.prevent="startResize"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { useAppShell } from "../../composables/useAppShell";

const { sidebarWidth, sidebarCollapsed, setSidebarWidth } = useAppShell();

const isResizing = ref(false);
let startX = 0;
let startWidth = 0;

function onResize(e: MouseEvent) {
  const delta = e.clientX - startX;
  setSidebarWidth(startWidth + delta);
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener("mousemove", onResize);
  document.removeEventListener("mouseup", stopResize);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

function startResize(e: MouseEvent) {
  isResizing.value = true;
  startX = e.clientX;
  startWidth = sidebarWidth.value;

  document.addEventListener("mousemove", onResize);
  document.addEventListener("mouseup", stopResize);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
}

onUnmounted(() => {
  document.removeEventListener("mousemove", onResize);
  document.removeEventListener("mouseup", stopResize);
});
</script>

<style scoped>
.sidebar {
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  transition: width 0.15s ease;
}

.sidebar.resizing {
  transition: none;
}

.sidebar.collapsed {
  width: 0;
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.sidebar-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
}

.resize-handle:hover {
  background: var(--border-primary, #e0e0e0);
}
</style>
