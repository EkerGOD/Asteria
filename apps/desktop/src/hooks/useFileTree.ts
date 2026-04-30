import { useCallback, useEffect, useRef, useState } from "react";
import { readDir, mkdir, writeTextFile, remove } from "@tauri-apps/plugin-fs";
import { useVaults } from "../store/vaults";
import { toFileSystemErrorInfo, type FileSystemErrorInfo } from "../lib/errors";

export interface FileNode {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: FileNode[];
}

export interface FileTreeState {
  tree: FileNode[];
  isLoading: boolean;
  error: FileSystemErrorInfo | null;
  expanded: Set<string>;
  dirContents: Record<string, FileNode[]>;
  dirErrors: Record<string, FileSystemErrorInfo>;
  loadingDirs: Set<string>;
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

function joinPath(parentPath: string, childName: string): string {
  const separator = parentPath.includes("\\") ? "\\" : "/";
  return `${parentPath.replace(/[/\\]$/, "")}${separator}${childName}`;
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

function isPathNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("os error 3") ||
    msg.includes("os error 2") ||
    msg.includes("ENOENT") ||
    msg.includes("No such file")
  );
}

export function useFileTree(): FileTreeState {
  const { activeVault } = useVaults();
  const vaultId = activeVault?.id;
  const [tree, setTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FileSystemErrorInfo | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    vaultId ? readExpanded(vaultId) : new Set(),
  );
  const [dirContents, setDirContents] = useState<Record<string, FileNode[]>>({});
  const [dirErrors, setDirErrors] = useState<Record<string, FileSystemErrorInfo>>({});
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());

  const expandedRef = useRef(expanded);
  const dirContentsRef = useRef(dirContents);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);
  useEffect(() => {
    dirContentsRef.current = dirContents;
  }, [dirContents]);

  // Load persisted expanded dirs when active vault changes
  useEffect(() => {
    const nextExpanded = vaultId ? readExpanded(vaultId) : new Set<string>();
    expandedRef.current = nextExpanded;
    setExpanded(nextExpanded);
    setDirContents({});
    setDirErrors({});
    setLoadingDirs(new Set());
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
        path: joinPath(dirPath, entry.name),
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
        setDirErrors({});
        return;
      }
      const paths = [...expandedPaths];
      const results = await Promise.allSettled(
        paths.map(async (path) => {
          const children = await listDir(path);
          return { path, children };
        }),
      );
      const newContents: Record<string, FileNode[]> = {};
      const newErrors: Record<string, FileSystemErrorInfo> = {};
      const stalePaths: string[] = [];
      for (const [index, result] of results.entries()) {
        if (result.status === "fulfilled") {
          newContents[result.value.path] = result.value.children;
        } else if (isPathNotFoundError(result.reason)) {
          stalePaths.push(paths[index]);
        } else {
          newErrors[paths[index]] = toFileSystemErrorInfo(
            "read directory",
            paths[index],
            result.reason,
          );
        }
      }
      setDirContents(newContents);
      setDirErrors(newErrors);
      if (stalePaths.length > 0) {
        setExpanded((prev) => {
          const next = new Set(prev);
          for (const p of stalePaths) next.delete(p);
          return next;
        });
      }
    },
    [listDir],
  );

  const loadRoot = useCallback(async () => {
    if (!activeVault) {
      setTree([]);
      setError(null);
      setDirContents({});
      setDirErrors({});
      setLoadingDirs(new Set());
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const nodes = await listDir(activeVault.path);
      setTree(nodes);
      await reloadExpandedDirs(expandedRef.current);
    } catch (err) {
      setError(toFileSystemErrorInfo("read directory", activeVault.path, err));
      setTree([]);
      setDirContents({});
      setDirErrors({});
    } finally {
      setIsLoading(false);
    }
  }, [activeVault, listDir, reloadExpandedDirs]);

  const loadDir = useCallback(
    async (dirPath: string): Promise<FileNode[]> => {
      setLoadingDirs((prev) => new Set(prev).add(dirPath));
      setDirErrors((prev) => {
        if (!(dirPath in prev)) return prev;
        const next = { ...prev };
        delete next[dirPath];
        return next;
      });

      try {
        const children = await listDir(dirPath);
        setDirContents((prev) => ({ ...prev, [dirPath]: children }));
        return children;
      } catch (err) {
        if (isPathNotFoundError(err)) {
          // Auto-clean: directory was moved or deleted externally
          setExpanded((prev) => {
            const next = new Set(prev);
            next.delete(dirPath);
            return next;
          });
          setDirContents((prev) => {
            if (!(dirPath in prev)) return prev;
            const next = { ...prev };
            delete next[dirPath];
            return next;
          });
          setDirErrors((prev) => {
            if (!(dirPath in prev)) return prev;
            const next = { ...prev };
            delete next[dirPath];
            return next;
          });
        } else {
          const nextError = toFileSystemErrorInfo("read directory", dirPath, err);
          setDirErrors((prev) => ({ ...prev, [dirPath]: nextError }));
        }
        throw err;
      } finally {
        setLoadingDirs((prev) => {
          const next = new Set(prev);
          next.delete(dirPath);
          return next;
        });
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
        if (!(node.path in dirContentsRef.current)) {
          void loadDir(node.path).catch(() => {
            // Directory-specific errors are stored in state for inline retry UI.
          });
        }
      }
    },
    [loadDir],
  );

  const createFolder = useCallback(
    async (parentPath: string, name: string) => {
      const folderPath = joinPath(parentPath, name);
      await mkdir(folderPath);
      await loadRoot();
    },
    [loadRoot],
  );

  const createFile = useCallback(
    async (parentPath: string, name: string) => {
      const filePath = joinPath(parentPath, name);
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
    dirErrors,
    loadingDirs,
    loadRoot,
    loadDir,
    toggleExpand,
    createFolder,
    createFile,
    deleteItem,
    refresh,
  };
}
