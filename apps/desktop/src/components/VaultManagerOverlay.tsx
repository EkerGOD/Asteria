import { useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir } from "@tauri-apps/plugin-fs";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { ErrorBox, FieldError } from "./FormFields";
import { Icon } from "./Icon";
import { toErrorMessage } from "../lib/errors";
import { useVaults } from "../store/vaults";

type PendingRepositoryFlow =
  | { type: "create"; parentPath: string }
  | { type: "open"; folderPath: string }
  | null;

export function VaultManagerOverlay({ onClose }: { onClose: () => void }) {
  const {
    vaults,
    activeVault,
    isLoading,
    error,
    refreshVaults,
    addVault,
    removeVault,
    setActiveVault,
    clearError,
  } = useVaults();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);
  const [pendingFlow, setPendingFlow] = useState<PendingRepositoryFlow>(null);
  const [pendingName, setPendingName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const pendingPathLabel = useMemo(() => {
    if (!pendingFlow) return null;
    return pendingFlow.type === "create" ? pendingFlow.parentPath : pendingFlow.folderPath;
  }, [pendingFlow]);

  const selectedUnlinkVault = vaults.find((vault) => vault.id === unlinkTarget) ?? null;

  const resetFeedback = () => {
    setActionError(null);
    setSuccessMessage(null);
    clearError();
  };

  const handleChooseParent = async () => {
    resetFeedback();
    try {
      const selected = await open({ directory: true, multiple: false, title: "Choose Parent Folder" });
      const parentPath = typeof selected === "string" ? selected : null;
      if (!parentPath) return;
      setPendingFlow({ type: "create", parentPath });
      setPendingName("");
    } catch (err) {
      setActionError(toErrorMessage(err));
    }
  };

  const handleOpenFolder = async () => {
    resetFeedback();
    try {
      const selected = await open({ directory: true, multiple: false, title: "Select Repository Folder" });
      const folderPath = typeof selected === "string" ? selected : null;
      if (!folderPath) return;
      setPendingFlow({ type: "open", folderPath });
      setPendingName(folderPath.split(/[/\\]/).filter(Boolean).pop() ?? folderPath);
    } catch (err) {
      setActionError(toErrorMessage(err));
    }
  };

  const handleConfirmRepository = async () => {
    const name = pendingName.trim();
    if (!name || !pendingFlow) return;
    if (pendingFlow.type === "create" && isInvalidRepositoryFolderName(name)) {
      setActionError("Repository folder name cannot be '.', '..', or contain slashes.");
      return;
    }

    resetFeedback();
    setRegistering(true);
    try {
      const rootPath =
        pendingFlow.type === "create"
          ? joinPath(pendingFlow.parentPath, name)
          : pendingFlow.folderPath;

      if (pendingFlow.type === "create") {
        await mkdir(rootPath);
      }

      await addVault(name, rootPath);
      setPendingFlow(null);
      setPendingName("");
      setSuccessMessage(
        pendingFlow.type === "create"
          ? "Repository created and registered."
          : "Repository registered.",
      );
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const handleSwitch = async (id: string) => {
    resetFeedback();
    setSwitchingId(id);
    try {
      await setActiveVault(id);
      setSuccessMessage("Current repository updated.");
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setSwitchingId(null);
    }
  };

  const handleUnlink = async (id: string) => {
    resetFeedback();
    setUnlinkingId(id);
    try {
      await removeVault(id);
      setUnlinkTarget(null);
      setSuccessMessage("Repository unlinked. Files were left on disk.");
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setUnlinkingId(null);
    }
  };

  const displayedError = actionError ?? error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Repositories"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex h-[min(640px,90vh)] w-full max-w-2xl flex-col rounded-xl border border-stone-300 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-stone-200 px-6 py-4">
          <h3 className="flex-1 text-base font-semibold">Manage Repositories</h3>
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
          {displayedError ? <ErrorBox message={displayedError} /> : null}
          {successMessage ? (
            <p className="mb-4 rounded-lg border border-pine/20 bg-pine/5 px-4 py-2 text-sm font-medium text-pine">
              {successMessage}
            </p>
          ) : null}

          {activeVault ? (
            <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-medium text-stone-500">Current Repository</p>
              <p className="mt-1 text-sm font-semibold">{activeVault.name}</p>
              <p className="mt-0.5 break-all text-xs text-stone-500">{activeVault.path}</p>
            </div>
          ) : null}

          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Available Repositories</h4>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void refreshVaults()}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
              Loading repositories...
            </p>
          ) : vaults.length === 0 ? (
            <EmptyState
              title="No repositories yet."
              detail="Create a new repository or open an existing local folder."
            />
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
                    className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleSwitch(vault.id)}
                    disabled={switchingId !== null || unlinkingId !== null}
                  >
                    {switchingId === vault.id ? "Switching..." : "Switch"}
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-pine/10 px-2 py-1 text-xs font-semibold text-pine">
                    Active
                  </span>
                )}
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setUnlinkTarget(vault.id)}
                  disabled={unlinkingId !== null}
                  aria-label={`Unlink ${vault.name}`}
                  title="Unlink repository"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-stone-200 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleChooseParent()}
                disabled={registering}
              >
                <Icon name="add" size={14} />
                New Repository...
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleOpenFolder()}
                disabled={registering}
              >
                <Icon name="folderOpened" size={14} />
                Open Local Repository...
              </button>
            </div>

            {pendingFlow ? (
              <div className="mt-3 rounded-lg border border-pine bg-pine/5 p-3">
                <p className="text-xs font-medium text-stone-500">
                  {pendingFlow.type === "create" ? "Parent folder" : "Selected folder"}
                </p>
                <p className="mt-0.5 break-all text-xs text-stone-600">{pendingPathLabel}</p>
                <div className="mt-2 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm placeholder:text-stone-400 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
                      placeholder={
                        pendingFlow.type === "create"
                          ? "Repository folder name..."
                          : "Repository name..."
                      }
                      value={pendingName}
                      onChange={(e) => setPendingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleConfirmRepository();
                        if (e.key === "Escape") {
                          setPendingFlow(null);
                          setPendingName("");
                        }
                      }}
                      autoFocus
                    />
                    {pendingFlow.type === "create" && isInvalidRepositoryFolderName(pendingName.trim()) ? (
                      <FieldError error="Use a folder name that is not '.', '..', and has no slashes." />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-pine px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleConfirmRepository()}
                    disabled={!pendingName.trim() || registering}
                  >
                    {registering
                      ? "Saving..."
                      : pendingFlow.type === "create"
                        ? "Create"
                        : "Register"}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                    onClick={() => {
                      setPendingFlow(null);
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
        open={selectedUnlinkVault !== null}
        title="Unlink Repository"
        message={
          selectedUnlinkVault
            ? `Unlink ${selectedUnlinkVault.name} from Asteria? The folder and all files on disk will remain untouched.`
            : "Unlink this repository from Asteria? The folder and all files on disk will remain untouched."
        }
        confirmLabel={unlinkingId === selectedUnlinkVault?.id ? "Unlinking..." : "Unlink"}
        confirmDisabled={unlinkingId !== null}
        onConfirm={() => selectedUnlinkVault && void handleUnlink(selectedUnlinkVault.id)}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  );
}

function joinPath(parentPath: string, childName: string): string {
  const separator = parentPath.includes("\\") ? "\\" : "/";
  return `${parentPath.replace(/[/\\]$/, "")}${separator}${childName}`;
}

function isInvalidRepositoryFolderName(name: string): boolean {
  return name === "." || name === ".." || /[/\\]/.test(name);
}
