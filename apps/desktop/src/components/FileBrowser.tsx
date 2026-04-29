import { useState, useRef, useEffect } from "react";

interface Vault {
  id: string;
  name: string;
  path: string;
}

export function FileBrowser({
  onOpenFile,
  onManageVaults,
}: {
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
    <div className="flex w-60 shrink-0 flex-col border-r border-stone-300/80 bg-white/80">
      {/* File tree area */}
      <div className="flex-1 overflow-auto px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase text-stone-500">Files</p>
          <button
            type="button"
            className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="New file"
            title="New file"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Placeholder file tree */}
        <div className="space-y-0.5 text-sm">
          <div className="rounded px-2 py-0.5 text-stone-500 hover:bg-stone-100 cursor-pointer">
            📁 notes
          </div>
          <div className="rounded pl-6 pr-2 py-0.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
               onClick={() => onOpenFile(`${activeVault?.path ?? ""}/notes/readme.md`)}>
            readme.md
          </div>
          <div className="rounded pl-6 pr-2 py-0.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
               onClick={() => onOpenFile(`${activeVault?.path ?? ""}/notes/ideas.md`)}>
            ideas.md
          </div>
          <div className="rounded px-2 py-0.5 text-stone-500 hover:bg-stone-100 cursor-pointer">
            📁 journal
          </div>
          <div className="rounded pl-6 pr-2 py-0.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
               onClick={() => onOpenFile(`${activeVault?.path ?? ""}/journal/2026-04-29.md`)}>
            2026-04-29.md
          </div>
        </div>
      </div>

      {/* Vault switcher */}
      <div className="relative shrink-0 border-t border-stone-200" ref={menuRef}>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
          onClick={() => setVaultMenuOpen((v) => !v)}
        >
          <span>📁</span>
          <span>{activeVault?.name ?? "No vault"}</span>
          <span className="ml-auto text-stone-400">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {vault.id !== activeVaultId && <span className="w-3" />}
                  📁 {vault.name}
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
    </div>
  );
}
