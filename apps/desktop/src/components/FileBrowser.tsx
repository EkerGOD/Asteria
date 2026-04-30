import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { EmptyState } from "./EmptyState";
import { useVaults } from "../store/vaults";
import { useFileTree } from "../hooks/useFileTree";
import type { FileNode } from "../hooks/useFileTree";
import { toErrorMessage, type FileSystemErrorInfo } from "../lib/errors";

export function FileBrowser({
  collapsed,
  onToggleCollapse,
  onOpenFile,
  onManageVaults,
  selectedFilePath,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenFile: (filePath: string) => void;
  onManageVaults: () => void;
  selectedFilePath?: string | null;
}) {
  const {
    vaults,
    activeVault,
    isLoading: repositoriesLoading,
    error: repositoriesError,
    refreshVaults,
    setActiveVault,
  } = useVaults();
  const {
    tree,
    isLoading: fileTreeLoading,
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
    refresh,
  } = useFileTree();
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false);
  const [creatingKind, setCreatingKind] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [switchingVaultId, setSwitchingVaultId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadRoot();
  }, [activeVault, loadRoot]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVaultMenuOpen(false);
      }
    }
    if (vaultMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [vaultMenuOpen]);

  const handleCreate = useCallback(
    async (kind: "file" | "folder") => {
      if (!newName.trim()) return;
      if (!activeVault) {
        setActionError("No vault selected.");
        return;
      }
      setActionError(null);
      const parentPath = activeVault.path;
      try {
        if (kind === "folder") {
          await createFolder(parentPath, newName.trim());
        } else {
          const name = newName.trim().endsWith(".md") ? newName.trim() : `${newName.trim()}.md`;
          await createFile(parentPath, name);
        }
        setNewName("");
        setCreatingKind(null);
      } catch (err) {
        setActionError(toErrorMessage(err));
      }
    },
    [newName, activeVault, createFolder, createFile],
  );

  const handleSelectVault = useCallback(
    async (vaultId: string) => {
      setActionError(null);
      setSwitchingVaultId(vaultId);
      try {
        await setActiveVault(vaultId);
        setVaultMenuOpen(false);
      } catch (err) {
        setActionError(toErrorMessage(err));
      } finally {
        setSwitchingVaultId(null);
      }
    },
    [setActiveVault],
  );

  const renderTree = (nodes: FileNode[], depth: number) => (
    <div>
      {nodes.map((node) => {
        const isExpanded = expanded.has(node.path);
        const children = dirContents[node.path];
        const nodeError = dirErrors[node.path];
        const nodeLoading = loadingDirs.has(node.path);
        const isSelected = node.kind === "file" && node.path === selectedFilePath;
        return (
          <div key={node.path}>
            <button
              type="button"
              className={[
                "flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-sm transition-colors",
                isSelected
                  ? "bg-pine/10 text-pine"
                  : "text-stone-700 hover:bg-stone-100",
              ].join(" ")}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
              aria-current={isSelected ? "page" : undefined}
              aria-expanded={node.kind === "directory" ? isExpanded : undefined}
              onClick={() => {
                if (node.kind === "directory") {
                  void toggleExpand(node);
                } else {
                  onOpenFile(node.path);
                }
              }}
            >
              <Icon
                name={node.kind === "directory" ? (isExpanded ? "folderOpened" : "folder") : "file"}
                size={14}
              />
              <span className="truncate">{node.name}</span>
            </button>
            {node.kind === "directory" && isExpanded ? (
              <>
                {nodeLoading ? <DirectoryStatus depth={depth + 1} message="Loading..." /> : null}
                {nodeError ? (
                  <DirectoryError
                    depth={depth + 1}
                    error={nodeError}
                    onRetry={() => void loadDir(node.path).catch(() => undefined)}
                  />
                ) : null}
                {children && children.length > 0 ? renderTree(children, depth + 1) : null}
                {children && children.length === 0 && !nodeLoading && !nodeError ? (
                  <DirectoryStatus depth={depth + 1} message="Empty folder" />
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col border-r border-stone-300/80 bg-white/80">
      {collapsed ? (
        <div className="flex h-10 shrink-0 items-center justify-center">
          <IconButton
            icon="chevronRight"
            label="Expand file browser"
            onClick={onToggleCollapse}
            size="sm"
            iconSize={16}
          />
        </div>
      ) : null}

      {collapsed ? null : (
        <>
          <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-stone-500">Files</p>
              <div className="flex items-center gap-1">
                <IconButton
                  icon="refresh"
                  label="Refresh files"
                  size="xs"
                  iconSize={14}
                  onClick={() => void refresh()}
                  disabled={!activeVault || fileTreeLoading || repositoriesLoading}
                />
                <IconButton
                  icon="fileAdd"
                  label="New file"
                  size="xs"
                  iconSize={14}
                  onClick={() => setCreatingKind("file")}
                  disabled={!activeVault}
                />
                <IconButton
                  icon="folder"
                  label="New folder"
                  size="xs"
                  iconSize={14}
                  onClick={() => setCreatingKind("folder")}
                  disabled={!activeVault}
                />
                <div className="mx-1 h-4 w-px bg-stone-200" aria-hidden="true" />
                <IconButton
                  icon="chevronLeft"
                  label="Collapse file browser"
                  onClick={onToggleCollapse}
                  size="xs"
                  iconSize={14}
                />
              </div>
            </div>

            {/* New item input */}
            {creatingKind ? (
              <div className="mb-2 flex items-center gap-1">
                <input
                  type="text"
                  className="min-w-0 flex-1 rounded border border-pine bg-white px-2 py-1 text-sm text-stone-800 focus:outline-none"
                  placeholder={creatingKind === "folder" ? "Folder name..." : "File name.md..."}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate(creatingKind);
                    if (e.key === "Escape") {
                      setCreatingKind(null);
                      setNewName("");
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-pine hover:bg-pine/10 disabled:opacity-50"
                  onClick={() => void handleCreate(creatingKind)}
                  disabled={!newName.trim()}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded px-1 py-1 text-xs text-stone-500 hover:bg-stone-100"
                  onClick={() => {
                    setCreatingKind(null);
                    setNewName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {actionError || repositoriesError ? (
              <p className="mb-2 text-xs text-red-700">{actionError ?? repositoriesError}</p>
            ) : null}

            {/* File tree */}
            {repositoriesLoading ? (
              <p className="py-4 text-center text-xs text-stone-400">Loading repositories...</p>
            ) : !activeVault ? (
              <EmptyState title="No vault selected." detail="Open a vault from Manage Vaults to see files." />
            ) : fileTreeLoading ? (
              <p className="py-4 text-center text-xs text-stone-400">Loading...</p>
            ) : error ? (
              <FileAccessError error={error} onRetry={() => void loadRoot()} />
            ) : tree.length === 0 ? (
              <EmptyState
                title="No files yet."
                detail="This vault is empty. Refresh if files were added outside Asteria."
                action={{ label: "Refresh", onClick: () => void refresh() }}
              />
            ) : (
              renderTree(tree, 0)
            )}
          </div>

          {/* Vault switcher */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              className="flex h-10 w-full items-center gap-1.5 px-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
              onClick={() => setVaultMenuOpen((v) => !v)}
            >
              <Icon name="folderOpened" size={14} />
              <span className="truncate">{activeVault?.name ?? "No vault"}</span>
              <span className="ml-auto text-stone-400">
                <Icon name="chevronDown" size={10} />
              </span>
            </button>

            {vaultMenuOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-1 rounded-md border border-stone-300 bg-white shadow-lg z-30">
                <div className="py-1">
                  {repositoriesLoading ? (
                    <p className="px-3 py-2 text-xs text-stone-400">Loading repositories...</p>
                  ) : repositoriesError ? (
                    <div className="px-3 py-2 text-xs text-red-700">
                      <p>{repositoriesError}</p>
                      <button
                        type="button"
                        className="mt-1 font-semibold underline"
                        onClick={() => void refreshVaults()}
                      >
                        Retry
                      </button>
                    </div>
                  ) : vaults.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-stone-400">No vaults yet.</p>
                  ) : null}
                  {vaults.map((vault) => (
                    <button
                      key={vault.id}
                      type="button"
                      className={[
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                        vault.id === activeVault?.id
                          ? "bg-pine/10 text-pine font-medium"
                          : "text-stone-700 hover:bg-stone-50",
                      ].join(" ")}
                      onClick={() => {
                        void handleSelectVault(vault.id);
                      }}
                      disabled={switchingVaultId !== null}
                    >
                      {vault.id === activeVault?.id && (
                        <Icon name="check" size={12} />
                      )}
                      {vault.id !== activeVault?.id && <span className="w-3" />}
                      <Icon name="folder" size={14} />
                      <span className="truncate">
                        {switchingVaultId === vault.id ? "Switching..." : vault.name}
                      </span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-stone-200" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-50"
                    onClick={() => {
                      setVaultMenuOpen(false);
                      onManageVaults();
                    }}
                  >
                    <span className="w-3" />
                    Manage Vaults…
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DirectoryStatus({ depth, message }: { depth: number; message: string }) {
  return (
    <p
      className="py-0.5 text-xs text-stone-400"
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      {message}
    </p>
  );
}

function DirectoryError({
  depth,
  error,
  onRetry,
}: {
  depth: number;
  error: FileSystemErrorInfo;
  onRetry: () => void;
}) {
  return (
    <div
      className="py-1 text-xs text-red-700"
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      <p className="font-medium">{error.message}</p>
      <p className="mt-0.5 break-all text-red-700/80">{error.path}</p>
      <p className="mt-0.5 text-red-700/80">{error.reason}</p>
      <button type="button" className="mt-1 font-semibold underline" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function FileAccessError({
  error,
  onRetry,
}: {
  error: FileSystemErrorInfo;
  onRetry: () => void;
}) {
  return (
    <div className="py-4 text-xs text-red-700">
      <p className="font-semibold">{error.message}</p>
      <p className="mt-1 break-all text-red-700/80">{error.path}</p>
      <p className="mt-1 text-red-700/80">{error.reason}</p>
      <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
