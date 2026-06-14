import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useTabs } from "./useTabs";

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  entry: FileEntry | null;
}

const currentFolder = ref("");
const fileTree = ref<FileEntry[]>([]);
const selectedFile = ref("");
const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  entry: null,
});
const renamingPath = ref<string | null>(null);

function parentPath(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  const i = path.lastIndexOf(sep);
  return i > 0 ? path.slice(0, i) : path;
}

function joinPath(parent: string, name: string): string {
  const sep = parent.includes("\\") ? "\\" : "/";
  return parent + sep + name;
}

export function useFileManager() {
  async function openFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Folder",
    });
    if (selected && typeof selected === "string") {
      currentFolder.value = selected;
      await refreshTree();
    }
  }

  async function refreshTree() {
    if (!currentFolder.value) return;
    const entries = await invoke<FileEntry[]>("list_dir", {
      path: currentFolder.value,
    });
    fileTree.value = entries;
  }

  async function selectFile(filePath: string) {
    selectedFile.value = filePath;
    try {
      const content = await readFile(filePath);
      const name = filePath.includes("\\")
        ? filePath.slice(filePath.lastIndexOf("\\") + 1)
        : filePath.slice(filePath.lastIndexOf("/") + 1);
      const { openTab } = useTabs();
      openTab(filePath, name, content);
    } catch (e) {
      console.error("Failed to read file:", e);
    }
  }

  async function createFile(filePath: string) {
    await invoke("create_file", { path: filePath });
    await refreshTree();
  }

  async function createDir(dirPath: string) {
    await invoke("create_dir", { path: dirPath });
    await refreshTree();
  }

  async function deleteItem(itemPath: string) {
    await invoke("delete_path", { path: itemPath });
    await refreshTree();
  }

  async function renameItem(oldPath: string, newPath: string) {
    await invoke("rename_path", { oldPath, newPath });
    await refreshTree();
  }

  async function readFile(filePath: string): Promise<string> {
    return await invoke<string>("read_file", { path: filePath });
  }

  async function saveFile(filePath: string, content: string) {
    await invoke("write_file", { path: filePath, content });
  }

  function updateNodeChildren(
    nodes: FileEntry[],
    targetPath: string,
    children: FileEntry[]
  ): boolean {
    for (const node of nodes) {
      if (node.path === targetPath) {
        node.children = children;
        return true;
      }
      if (node.children && updateNodeChildren(node.children, targetPath, children)) {
        return true;
      }
    }
    return false;
  }

  async function loadChildren(dirPath: string) {
    const entries = await invoke<FileEntry[]>("list_dir", { path: dirPath });
    updateNodeChildren(fileTree.value, dirPath, entries);
  }

  function showContextMenu(entry: FileEntry | null, x: number, y: number) {
    contextMenu.value = { visible: true, x, y, entry };
  }

  function hideContextMenu() {
    contextMenu.value.visible = false;
  }

  function getTargetDir(entry: FileEntry | null): string {
    if (entry) {
      return entry.is_dir ? entry.path : parentPath(entry.path);
    }
    return currentFolder.value;
  }

  async function handleNewFile(parentDir: string) {
    const name = window.prompt("Enter file name:");
    if (!name) return;
    await createFile(joinPath(parentDir, name));
  }

  async function handleNewFolder(parentDir: string) {
    const name = window.prompt("Enter folder name:");
    if (!name) return;
    await createDir(joinPath(parentDir, name));
  }

  function handleRename(entry: FileEntry) {
    renamingPath.value = entry.path;
  }

  function cancelRename() {
    renamingPath.value = null;
  }

  async function confirmRename(entry: FileEntry, newName: string) {
    renamingPath.value = null;
    if (!newName || newName === entry.name) return;
    const newPath = joinPath(parentPath(entry.path), newName);
    await renameItem(entry.path, newPath);
  }

  async function handleDelete(entry: FileEntry) {
    const msg = entry.is_dir
      ? `Delete folder "${entry.name}" and all its contents?`
      : `Delete file "${entry.name}"?`;
    if (!window.confirm(msg)) return;
    await deleteItem(entry.path);
  }

  return {
    currentFolder,
    fileTree,
    selectedFile,
    contextMenu,
    renamingPath,
    openFolder,
    refreshTree,
    selectFile,
    loadChildren,
    showContextMenu,
    hideContextMenu,
    getTargetDir,
    handleNewFile,
    handleNewFolder,
    handleRename,
    cancelRename,
    confirmRename,
    handleDelete,
    createFile,
    createDir,
    deleteItem,
    renameItem,
    readFile,
    saveFile,
  };
}
