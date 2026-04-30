import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { EmptyState } from "./EmptyState";
import { useVaults } from "../store/vaults";
import { useFileTree } from "../hooks/useFileTree";
import type { FileNode } from "../hooks/useFileTree";

export function FileBrowser({
  collapsed,
  onToggleCollapse,
  onOpenFile,
  onManageVaults,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenFile: (filePath: string) => void;
  onManageVaults: () => void;
}) {
  const { vaults, activeVault, setActiveVault } = useVaults();
  const { tree, isLoading, error, loadRoot, loadDir, createFolder, createFile } = useFileTree();
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dirContents, setDirContents] = useState<Record<string, FileNode[]>>({});
  const [creatingKind, setCreatingKind] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
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

  const toggleExpand = useCallback(
    async (node: FileNode) => {
      const next = new Set(expanded);
      if (next.has(node.path)) {
        next.delete(node.path);
        setExpanded(next);
        return;
      }
      next.add(node.path);
      setExpanded(next);
      if (!(node.path in dirContents)) {
        const children = await loadDir(node.path);
        setDirContents((prev) => ({ ...prev, [node.path]: children }));
      }
    },
    [expanded, dirContents, loadDir],
  );

  const handleCreate = useCallback(
    async (kind: "file" | "folder") => {
      if (!newName.trim()) return;
      setActionError(null);
      const parentPath = activeVault?.path ?? ".";
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
        setActionError(err instanceof Error ? err.message : "Could not create item");
      }
    },
    [newName, activeVault, createFolder, createFile],
  );

  const renderTree = (nodes: FileNode[], depth: number) => (
    <div>
      {nodes.map((node) => {
        const isExpanded = expanded.has(node.path);
        const children = dirContents[node.path];
        return (
          <div key={node.path}>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-sm text-stone-700 hover:bg-stone-100"
              style={{ paddingLeft: `${8 + depth * 16}px` }}
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
            {node.kind === "directory" && isExpanded && children
              ? renderTree(children, depth + 1)
              : null}
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
                  icon="fileAdd"
                  label="New file"
                  size="xs"
                  iconSize={14}
                  onClick={() => setCreatingKind("file")}
                />
                <IconButton
                  icon="folder"
                  label="New folder"
                  size="xs"
                  iconSize={14}
                  onClick={() => setCreatingKind("folder")}
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

            {actionError ? (
              <p className="mb-2 text-xs text-red-700">{actionError}</p>
            ) : null}

            {/* File tree */}
            {!activeVault ? (
              <EmptyState title="No vault selected." detail="Open a vault from Manage Vaults to see files." />
            ) : isLoading ? (
              <p className="py-4 text-center text-xs text-stone-400">Loading...</p>
            ) : error ? (
              <div className="py-4 text-center text-xs text-red-700">
                {error}
                <button type="button" className="ml-1 underline" onClick={() => void loadRoot()}>
                  Retry
                </button>
              </div>
            ) : tree.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-400">No files yet.</p>
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
                  {vaults.length === 0 ? (
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
                        setActiveVault(vault.id);
                        setVaultMenuOpen(false);
                      }}
                    >
                      {vault.id === activeVault?.id && (
                        <Icon name="check" size={12} />
                      )}
                      {vault.id !== activeVault?.id && <span className="w-3" />}
                      <Icon name="folder" size={14} />
                      <span className="truncate">{vault.name}</span>
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
