import type { MenuItem } from "../components/toolbar/MenuDropdown.vue";
import { useAppShell } from "./useAppShell";
import { useEditorActions } from "./useEditorActions";
import { useTabs } from "./useTabs";
import { useFileManager } from "./useFileManager";
import { open, save, message } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useMenuActions() {
  const { toggleSidebar, toggleTheme } = useAppShell();
  const { undo, redo, cut, copy, paste, selectAll } = useEditorActions();
  const { closeTab, activeTab } = useTabs();
  const { openFolder, saveFile, handleNewFile, handleNewFolder, currentFolder } =
    useFileManager();

  function onMenuSelect(item: MenuItem) {
    switch (item.id) {
      case "toggle-sidebar":
        toggleSidebar();
        break;
      case "toggle-theme":
        toggleTheme();
        break;

      case "undo":
        undo();
        break;
      case "redo":
        redo();
        break;
      case "cut":
        cut();
        break;
      case "copy":
        copy();
        break;
      case "paste":
        paste();
        break;
      case "select-all":
        selectAll();
        break;

      case "open-folder":
        openFolder();
        break;
      case "open-file":
        openFile();
        break;
      case "new-file":
        handleNewFile(currentFolder.value);
        break;
      case "new-folder":
        handleNewFolder(currentFolder.value);
        break;
      case "save":
        saveCurrentFile();
        break;
      case "save-as":
        saveAs();
        break;
      case "close-tab":
        closeCurrentTab();
        break;
      case "exit":
        exitApp();
        break;

      case "about":
        showAbout();
        break;
      case "welcome":
        showWelcome();
        break;
    }
  }

  function closeCurrentTab() {
    const tab = activeTab.value;
    if (tab?.path) {
      closeTab(tab.path);
    }
  }

  function saveCurrentFile() {
    const tab = activeTab.value;
    if (tab?.path) {
      saveFile(tab.path, tab.content);
    }
  }

  async function openFile() {
    const selected = await open({
      multiple: false,
      title: "Open File",
    });
    if (selected && typeof selected === "string") {
      const content = await invoke<string>("read_file", { path: selected });
      const name = selected.includes("\\")
        ? selected.slice(selected.lastIndexOf("\\") + 1)
        : selected.slice(selected.lastIndexOf("/") + 1);
      useTabs().openTab(selected, name, content);
    }
  }

  async function saveAs() {
    const tab = activeTab.value;
    if (!tab) return;
    const filePath = await save({
      title: "Save As",
      defaultPath: tab.name,
    });
    if (filePath) {
      await saveFile(filePath, tab.content);
    }
  }

  async function exitApp() {
    await getCurrentWindow().close();
  }

  async function showAbout() {
    await message(
      "Asteria - WYSIWYG Markdown Editor\n\nVersion 0.1.0\n\nBuilt with Tauri v2 + Vue 3 + CodeMirror 6\n\nhttps://github.com/your-org/asteria",
      { title: "About Asteria", kind: "info" }
    );
  }

  async function showWelcome() {
    await message(
      "Welcome to Asteria!\n\nA WYSIWYG Markdown editor built with Tauri + Vue + CodeMirror 6.\n\nGetting started:\n  • File → Open Folder to open a project\n  • File → Open File to edit a single file\n  • Ctrl+K Ctrl+O to quick-open a folder\n  • Ctrl+Shift+F to search across files\n\nYour edits are auto-saved after 1 second of inactivity.",
      { title: "Welcome to Asteria", kind: "info" }
    );
  }

  return {
    onMenuSelect,
  };
}
