import { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

interface Vault {
  id: string;
  name: string;
  path: string;
}

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
  const [activeVaultId, setActiveVaultId] = useState("1");
  const vaults: Vault[] = [
    { id: "1", name: "MyVault", path: "/Users/me/MyVault" }
  ];
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeVault = vaults.find((v) => v.id === activeVaultId) ?? vaults[0];

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
      {/* File tree area */}
      <div className="flex-1 overflow-auto px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase text-stone-500">Files</p>
          <div className="flex items-center gap-1">
            <IconButton icon="fileAdd" label="New file" size="xs" iconSize={14} />
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

        {/* Placeholder file tree */}
        <div className="space-y-0.5 text-sm">
          <div className="flex items-center gap-1.5 rounded px-2 py-0.5 text-stone-500 hover:bg-stone-100 cursor-pointer">
            <Icon name="folder" size={14} />
            <span>notes</span>
          </div>
          <div className="rounded pl-6 pr-2 py-0.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
               onClick={() => onOpenFile(`${activeVault?.path ?? ""}/notes/readme.md`)}>
            readme.md
          </div>
          <div className="rounded pl-6 pr-2 py-0.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
               onClick={() => onOpenFile(`${activeVault?.path ?? ""}/notes/ideas.md`)}>
            ideas.md
          </div>
          <div className="flex items-center gap-1.5 rounded px-2 py-0.5 text-stone-500 hover:bg-stone-100 cursor-pointer">
            <Icon name="folder" size={14} />
            <span>journal</span>
          </div>
          <div className="rounded pl-6 pr-2 py-0.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
               onClick={() => onOpenFile(`${activeVault?.path ?? ""}/journal/2026-04-29.md`)}>
            2026-04-29.md
          </div>
        </div>
      </div>

      {/* Vault switcher */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-1.5 px-3 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          onClick={() => setVaultMenuOpen((v) => !v)}
        >
          <Icon name="folderOpened" size={14} />
          <span>{activeVault?.name ?? "No vault"}</span>
          <span className="ml-auto text-stone-400">
            <Icon name="chevronDown" size={10} />
          </span>
        </button>

        {vaultMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 rounded-md border border-stone-300 bg-white shadow-lg z-30">
            <div className="py-1">
              {vaults.map((vault) => (
                <button
                  key={vault.id}
                  type="button"
                  className={[
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                    vault.id === activeVaultId
                      ? "bg-pine/10 text-pine font-medium"
                      : "text-stone-700 hover:bg-stone-50"
                  ].join(" ")}
                  onClick={() => {
                    setActiveVaultId(vault.id);
                    setVaultMenuOpen(false);
                  }}
                >
                  {vault.id === activeVaultId && (
                    <Icon name="check" size={12} className="w-3 shrink-0" />
                  )}
                  {vault.id !== activeVaultId && <span className="w-3" />}
                  <Icon name="folder" size={14} />
                  <span>{vault.name}</span>
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
