<template>
  <div class="toolbar">
    <div class="menu-bar">
      <div
        v-for="menu in menus"
        :key="menu.id"
        class="menu-button-wrapper"
      >
        <button
          :data-menu-button="menu.id"
          class="menu-button"
          :class="{ active: activeMenu === menu.id }"
          @click="toggleMenu(menu.id)"
        >
          {{ menu.label }}
        </button>
        <MenuDropdown
          v-if="activeMenu === menu.id"
          :items="menu.items"
          :visible="true"
          @select="onMenuItemSelect"
          @close="closeMenu"
        />
      </div>
    </div>
    <div class="toolbar-right">
      <button
        data-collapse-btn
        class="collapse-btn"
        @click="toggleSidebar"
        title="Toggle Sidebar"
      >
        <span class="codicon codicon-layout-sidebar-left" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import MenuDropdown from "./MenuDropdown.vue";
import type { MenuItem } from "./MenuDropdown.vue";
import { useAppShell } from "../../composables/useAppShell";
import { useMenuActions } from "../../composables/useMenuActions";

const { toggleSidebar } = useAppShell();
const { onMenuSelect } = useMenuActions();

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

const menus: MenuGroup[] = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "open-folder", label: "Open Folder", icon: "codicon-folder-opened", shortcut: "Ctrl+K Ctrl+O" },
      { id: "open-file", label: "Open File", icon: "codicon-file", shortcut: "Ctrl+O" },
      { id: "new-file", label: "New File", icon: "codicon-new-file", shortcut: "Ctrl+N" },
      { id: "new-folder", label: "New Folder", icon: "codicon-new-folder", shortcut: "" },
      { id: "save", label: "Save", icon: "codicon-save", shortcut: "Ctrl+S" },
      { id: "save-as", label: "Save As", icon: "codicon-save-as", shortcut: "Ctrl+Shift+S" },
      { id: "sep-1", label: "", type: "separator" },
      { id: "close-tab", label: "Close Tab", icon: "codicon-close", shortcut: "Ctrl+W" },
      { id: "exit", label: "Exit", icon: "codicon-close-all" },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    items: [
      { id: "undo", label: "Undo", icon: "codicon-discard", shortcut: "Ctrl+Z" },
      { id: "redo", label: "Redo", icon: "codicon-redo", shortcut: "Ctrl+Y" },
      { id: "sep-2", label: "", type: "separator" },
      { id: "cut", label: "Cut", icon: "codicon-cut", shortcut: "Ctrl+X" },
      { id: "copy", label: "Copy", icon: "codicon-copy", shortcut: "Ctrl+C" },
      { id: "paste", label: "Paste", icon: "codicon-paste", shortcut: "Ctrl+V" },
      { id: "select-all", label: "Select All", icon: "codicon-selection", shortcut: "Ctrl+A" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { id: "toggle-sidebar", label: "Toggle Sidebar", shortcut: "Ctrl+B" },
      { id: "toggle-theme", label: "Toggle Dark Mode", shortcut: "Ctrl+Shift+T" },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      { id: "welcome", label: "Welcome", icon: "codicon-home" },
      { id: "about", label: "About", icon: "codicon-info" },
    ],
  },
];

const activeMenu = ref<string | null>(null);

function toggleMenu(id: string) {
  activeMenu.value = activeMenu.value === id ? null : id;
}

function closeMenu() {
  activeMenu.value = null;
}

function onMenuItemSelect(item: MenuItem) {
  onMenuSelect(item);
  closeMenu();
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  height: 32px;
  background: var(--bg-tertiary, #f0f0f0);
  border-bottom: 1px solid var(--border-primary, #e0e0e0);
  flex-shrink: 0;
  user-select: none;
}

.menu-bar {
  display: flex;
  align-items: center;
  height: 100%;
}

.menu-button-wrapper {
  position: relative;
  height: 100%;
}

.menu-button {
  height: 100%;
  padding: 0 10px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
}

.menu-button:hover,
.menu-button.active {
  background: var(--bg-hover, #e8e8e8);
}

.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  height: 100%;
  padding-right: 4px;
}

.collapse-btn {
  height: 100%;
  width: 32px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #666);
}

.collapse-btn:hover {
  background: var(--bg-hover, #e8e8e8);
  color: var(--text-primary, #1a1a1a);
}
</style>
