import { useCallback, useState } from "react";
import { readDir, mkdir, writeTextFile, remove } from "@tauri-apps/plugin-fs";
import { useVaults } from "../store/vaults";

export interface FileNode {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: FileNode[];
}

export interface FileTreeState {
  tree: FileNode[];
  isLoading: boolean;
  error: string | null;
  loadRoot: () => Promise<void>;
  loadDir: (dirPath: string) => Promise<FileNode[]>;
  createFolder: (parentPath: string, name: string) => Promise<void>;
  createFile: (parentPath: string, name: string) => Promise<void>;
  deleteItem: (itemPath: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DOTFILE_PREFIXES = ["."];

function isDotfile(name: string): boolean {
  return DOTFILE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function useFileTree(): FileTreeState {
  const { activeVault } = useVaults();
  const [tree, setTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listDir = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    const entries = await readDir(dirPath);
    const nodes: FileNode[] = [];
    for (const entry of entries) {
      if (isDotfile(entry.name)) continue;
      const isDir = entry.isDirectory ?? false;
      nodes.push({
        name: entry.name,
        path: `${dirPath.replace(/[/\\]$/, "")}/${entry.name}`,
        kind: isDir ? "directory" : "file",
        children: isDir ? undefined : undefined,
      });
    }
    return sortNodes(nodes);
  }, []);

  const loadRoot = useCallback(async () => {
    if (!activeVault) {
      setTree([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const nodes = await listDir(activeVault.path);
      setTree(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read directory");
      setTree([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeVault, listDir]);

  const loadDir = useCallback(
    async (dirPath: string): Promise<FileNode[]> => {
      try {
        return await listDir(dirPath);
      } catch {
        return [];
      }
    },
    [listDir],
  );

  const createFolder = useCallback(
    async (parentPath: string, name: string) => {
      const folderPath = `${parentPath.replace(/[/\\]$/, "")}/${name}`;
      await mkdir(folderPath);
      await loadRoot();
    },
    [loadRoot],
  );

  const createFile = useCallback(
    async (parentPath: string, name: string) => {
      const filePath = `${parentPath.replace(/[/\\]$/, "")}/${name}`;
      await writeTextFile(filePath, "");
      await loadRoot();
    },
    [loadRoot],
  );

  const deleteItem = useCallback(
    async (itemPath: string) => {
      await remove(itemPath, { recursive: true });
      await loadRoot();
    },
    [loadRoot],
  );

  const refresh = useCallback(async () => {
    await loadRoot();
  }, [loadRoot]);

  return { tree, isLoading, error, loadRoot, loadDir, createFolder, createFile, deleteItem, refresh };
}
