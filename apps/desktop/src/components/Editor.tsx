import { useCallback, useEffect, useRef, useState } from "react";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";
import { ContextMenu } from "./ContextMenu";
import { MarkdownEditor } from "./MarkdownEditor";
import type { ContextMenuItem } from "./ContextMenu";
import type { OpenTab } from "./AppShell";

interface EditorProps {
  openTabs: OpenTab[];
  activeTabId: string | null;
  onCloseTab: (tabId: string) => void;
  onSetActiveTabId: (tabId: string) => void;
}

export function Editor({ openTabs, activeTabId, onCloseTab, onSetActiveTabId }: EditorProps) {
  const [fileContent, setFileContent] = useState<Record<string, string>>({});
  const [savedContent, setSavedContent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId) ?? null;

  const dirtyTabs = new Set(
    openTabs.filter((t) => (fileContent[t.id] ?? "") !== (savedContent[t.id] ?? "")).map((t) => t.id),
  );

  const loadedTabIds = useRef<Set<string>>(new Set());

  const loadFile = useCallback(async (tab: OpenTab) => {
    setError(null);
    if (loadedTabIds.current.has(tab.id)) return;
    setIsLoading(true);
    try {
      const text = await readTextFile(tab.filePath);
      setFileContent((prev) => ({ ...prev, [tab.id]: text }));
      setSavedContent((prev) => ({ ...prev, [tab.id]: text }));
      loadedTabIds.current.add(tab.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab) {
      void loadFile(activeTab);
    }
  }, [activeTab, loadFile]);

  const handleContentChange = useCallback(
    (tabId: string, content: string) => {
      setFileContent((prev) => ({ ...prev, [tabId]: content }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    const content = fileContent[activeTab.id] ?? "";
    setIsSaving(true);
    setError(null);
    try {
      await writeTextFile(activeTab.filePath, content);
      setSavedContent((prev) => ({ ...prev, [activeTab.id]: content }));
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save file");
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, fileContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const handleCloseTab = (tabId: string) => {
    if (dirtyTabs.has(tabId)) {
      setCloseTarget(tabId);
    } else {
      onCloseTab(tabId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: "Extract as Knowledge", disabled: true, disabledReason: "Coming in v0.12.0" },
        ],
      });
    }
  };

  const confirmClose = () => {
    if (closeTarget) {
      onCloseTab(closeTarget);
      setCloseTarget(null);
    }
  };

  if (openTabs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-stone-400">
        <div className="mb-4 rounded-full border-2 border-dashed border-stone-300 p-6">
          <Icon name="workspace" size={40} />
        </div>
        <p className="text-lg font-medium text-stone-500">Asteria / 星识</p>
        <p className="mt-1 text-sm">Open a file from the browser or start a chat to begin.</p>
        <div className="mt-6 flex gap-2 text-xs text-stone-400">
          <kbd className="rounded border border-stone-300 bg-white px-2 py-1 font-mono">Ctrl+P</kbd>
          <span className="py-1">Command Palette</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b border-stone-200 bg-white" style={{ height: 36 }}>
        <div className="flex min-w-0 flex-1">
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              className={[
                "group flex min-w-0 items-center gap-1 border-r border-stone-200 px-3 py-1 text-xs",
                tab.id === activeTabId
                  ? "bg-surface text-ink"
                  : "text-stone-500 hover:bg-stone-50",
              ].join(" ")}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                style={{ maxWidth: 160 }}
                onClick={() => onSetActiveTabId(tab.id)}
                title={tab.fileName}
              >
                {dirtyTabs.has(tab.id) ? "● " : ""}
                {tab.fileName}
              </button>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-stone-400 opacity-0 hover:bg-stone-200 hover:text-stone-600 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                aria-label={`Close ${tab.fileName}`}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 px-3">
          {saveMessage ? <span className="text-xs text-pine">{saveMessage}</span> : null}
          {error ? <span className="text-xs text-red-700">{error}</span> : null}
          {isSaving ? <span className="text-xs text-stone-400">Saving...</span> : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto" onContextMenu={handleContextMenu}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-stone-400">Loading...</div>
        ) : activeTab ? (
          <MarkdownEditor
            key={activeTab.id}
            content={fileContent[activeTab.id] ?? ""}
            onContentChange={(content) => handleContentChange(activeTab.id, content)}
          />
        ) : null}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmDialog
        open={closeTarget !== null}
        title="Close Without Saving"
        message="This tab has unsaved changes. Close anyway?"
        confirmLabel="Close"
        onConfirm={confirmClose}
        onCancel={() => setCloseTarget(null)}
      />
    </div>
  );
}
