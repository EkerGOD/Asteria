import { useCallback, useEffect, useRef, useState } from "react";
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
  expanded: Set<string>;
  dirContents: Record<string, FileNode[]>;
  loadRoot: () => Promise<void>;
  loadDir: (dirPath: string) => Promise<FileNode[]>;
  toggleExpand: (node: FileNode) => Promise<void>;
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

function readExpanded(vaultId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`asteria_fs_expanded_${vaultId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeExpanded(vaultId: string, expanded: Set<string>): void {
  try {
    localStorage.setItem(
      `asteria_fs_expanded_${vaultId}`,
      JSON.stringify([...expanded]),
    );
  } catch {
    // localStorage may be full or unavailable
  }
}

function removeExpanded(vaultId: string): void {
  try {
    localStorage.removeItem(`asteria_fs_expanded_${vaultId}`);
  } catch {
    // localStorage may be unavailable
  }
}

export function useFileTree(): FileTreeState {
  const { activeVault } = useVaults();
  const [tree, setTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dirContents, setDirContents] = useState<Record<string, FileNode[]>>({});

  const vaultId = activeVault?.id;
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // Load persisted expanded dirs when active vault changes
  useEffect(() => {
    if (vaultId) {
      setExpanded(readExpanded(vaultId));
    } else {
      setExpanded(new Set());
    }
    setDirContents({});
  }, [vaultId]);

  // Persist expanded dirs on change
  useEffect(() => {
    if (!vaultId) return;
    if (expanded.size > 0) {
      writeExpanded(vaultId, expanded);
    } else {
      removeExpanded(vaultId);
    }
  }, [vaultId, expanded]);

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
        children: undefined,
      });
    }
    return sortNodes(nodes);
  }, []);

  const reloadExpandedDirs = useCallback(
    async (expandedPaths: Set<string>) => {
      if (expandedPaths.size === 0) {
        setDirContents({});
        return;
      }
      const results = await Promise.allSettled(
        [...expandedPaths].map(async (path) => {
          const children = await listDir(path);
          return { path, children };
        }),
      );
      const newContents: Record<string, FileNode[]> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          newContents[result.value.path] = result.value.children;
        }
      }
      setDirContents(newContents);
    },
    [listDir],
  );

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
      reloadExpandedDirs(expandedRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read directory");
      setTree([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeVault, listDir, reloadExpandedDirs]);

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

  const toggleExpand = useCallback(
    async (node: FileNode) => {
      const collapsing = expandedRef.current.has(node.path);

      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.path)) {
          next.delete(node.path);
          return next;
        }
        next.add(node.path);
        return next;
      });

      if (collapsing) {
        // Drop cached children so re-expand loads fresh data
        setDirContents((prev) => {
          if (!(node.path in prev)) return prev;
          const next = { ...prev };
          delete next[node.path];
          return next;
        });
      } else {
        setDirContents((prev) => {
          if (node.path in prev) return prev;
          loadDir(node.path).then((children) => {
            setDirContents((cur) =>
              cur[node.path] ? cur : { ...cur, [node.path]: children },
            );
          });
          return prev;
        });
      }
    },
    [loadDir],
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

  return {
    tree,
    isLoading,
    error,
    expanded,
    dirContents,
    loadRoot,
    loadDir,
    toggleExpand,
    createFolder,
    createFile,
    deleteItem,
    refresh,
  };
}
