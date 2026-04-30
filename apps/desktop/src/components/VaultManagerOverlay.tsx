import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir } from "@tauri-apps/plugin-fs";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { ErrorBox } from "./FormFields";
import { Icon } from "./Icon";
import { useVaults } from "../store/vaults";

export function VaultManagerOverlay({ onClose }: { onClose: () => void }) {
  const { vaults, activeVault, addVault, removeVault, setActiveVault } = useVaults();
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [registering, setRegistering] = useState(false);

  const handleOpenFolder = async () => {
    setActionError(null);
    try {
      const selected = await open({ directory: true, multiple: false, title: "Select Vault Folder" });
      if (!selected) return;
      const folderPath = typeof selected === "string" ? selected : null;
      if (!folderPath) return;
      const name = folderPath.split(/[/\\]/).pop() ?? folderPath;
      setPendingPath(folderPath);
      setPendingName(name);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not open folder");
    }
  };

  const handleConfirmVault = async () => {
    const name = pendingName.trim();
    if (!name || !pendingPath) return;
    setActionError(null);
    setRegistering(true);
    try {
      await ensureVaultMarker(pendingPath);
      const vault = addVault(name, pendingPath);
      setActiveVault(vault.id);
      setPendingPath(null);
      setPendingName("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not register vault");
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = (id: string) => {
    removeVault(id);
    setDeleteTarget(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Vaults"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex h-[min(600px,90vh)] w-full max-w-2xl flex-col rounded-xl border border-stone-300 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-stone-200 px-6 py-4">
          <h3 className="flex-1 text-base font-semibold">Manage Vaults</h3>
          <button
            type="button"
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {actionError ? <ErrorBox message={actionError} /> : null}

          {/* Current Vault */}
          {activeVault ? (
            <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-medium text-stone-500">Current Vault</p>
              <p className="mt-1 text-sm font-semibold">{activeVault.name}</p>
              <p className="mt-0.5 break-all text-xs text-stone-500">{activeVault.path}</p>
            </div>
          ) : null}

          {/* Available Vaults */}
          <h4 className="mb-2 text-sm font-semibold">Available Vaults</h4>
          {vaults.length === 0 ? (
            <EmptyState title="No vaults yet." detail="Open an existing folder to register it as a vault." />
          ) : null}
          <div className="space-y-2">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                className={[
                  "flex items-center gap-3 rounded-lg border px-4 py-3",
                  vault.id === activeVault?.id
                    ? "border-pine bg-pine/5"
                    : "border-stone-200 bg-white",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{vault.name}</p>
                  <p className="mt-0.5 truncate text-xs text-stone-500">{vault.path}</p>
                </div>
                {vault.id !== activeVault?.id ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-pine hover:text-pine"
                    onClick={() => setActiveVault(vault.id)}
                  >
                    Switch
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-pine/10 px-2 py-1 text-xs font-semibold text-pine">
                    Active
                  </span>
                )}
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setDeleteTarget(vault.id)}
                  aria-label={`Remove ${vault.name}`}
                  title="Remove vault"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Open Folder — primary vault registration */}
          <div className="mt-6 border-t border-stone-200 pt-4">
            <button
              type="button"
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine"
              onClick={() => void handleOpenFolder()}
            >
              Open Folder...
            </button>

            {/* Pending folder confirmation */}
            {pendingPath ? (
              <div className="mt-3 rounded-lg border border-pine bg-pine/5 p-3">
                <p className="text-xs text-stone-500">Selected folder</p>
                <p className="mt-0.5 truncate text-xs text-stone-600">{pendingPath}</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm placeholder:text-stone-400 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
                    placeholder="Vault name..."
                    value={pendingName}
                    onChange={(e) => setPendingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleConfirmVault();
                      if (e.key === "Escape") {
                        setPendingPath(null);
                        setPendingName("");
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-pine px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleConfirmVault()}
                    disabled={!pendingName.trim() || registering}
                  >
                    {registering ? "Registering..." : "Register"}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                    onClick={() => {
                      setPendingPath(null);
                      setPendingName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove Vault"
        message="Remove this vault from Asteria? The folder and all its contents (including the .asteria config directory) will remain on disk."
        confirmLabel="Remove"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

async function ensureVaultMarker(vaultPath: string): Promise<void> {
  const markerPath = `${vaultPath.replace(/[/\\]$/, "")}/.asteria`;
  await mkdir(markerPath, { recursive: true });
}
