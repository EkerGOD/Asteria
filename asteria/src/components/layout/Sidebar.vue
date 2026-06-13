<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-inner">
      <div v-show="!collapsed" class="sidebar-content">
        <slot />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false });
</script>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 0;
  flex-shrink: 0;
  transition: width 0.15s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 0;
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 260px;
}

.sidebar-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
