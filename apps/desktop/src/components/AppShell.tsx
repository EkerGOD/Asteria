import { useState, useCallback, type ReactNode } from "react";
import { VerticalToolbar } from "./VerticalToolbar";
import { FileBrowser } from "./FileBrowser";
import { Icon } from "./Icon";
import { RightPanel } from "./RightPanel";
import { StatusBar } from "./StatusBar";
import { SettingsOverlay } from "./SettingsOverlay";

export type RightPanelView = "chat" | "knowledge" | "outline" | "graph";

export interface OpenTab {
  id: string;
  filePath: string;
  fileName: string;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const toggleLeftPanel = useCallback(() => setLeftPanelOpen((v) => !v), []);
  const toggleRightPanel = useCallback(() => setRightPanelOpen((v) => !v), []);

  const openFile = useCallback((filePath: string) => {
    const fileName = filePath.split("/").pop() ?? filePath;
    const existing = openTabs.find((t) => t.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const tabId = crypto.randomUUID();
    setOpenTabs((prev) => [...prev, { id: tabId, filePath, fileName }]);
    setActiveTabId(tabId);
  }, [openTabs]);

  const closeTab = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (activeTabId !== tabId) return remaining;
        if (remaining.length === 0) {
          setActiveTabId(null);
          return remaining;
        }
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = remaining[Math.min(idx, remaining.length - 1)];
        setActiveTabId(next.id);
        return remaining;
      });
    },
    [activeTabId]
  );

  const hasTabs = openTabs.length > 0;

  return (
    <div className="flex h-screen flex-col bg-surface text-ink">
      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        {/* Vertical Toolbar */}
        <VerticalToolbar
          leftPanelOpen={leftPanelOpen}
          onToggleLeftPanel={toggleLeftPanel}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* File Browser (left panel, collapsible) */}
        {leftPanelOpen && (
          <FileBrowser
            onOpenFile={openFile}
            onManageVaults={() => setSettingsOpen(true)}
          />
        )}

        {/* Expand toggle for left panel when collapsed */}
        {!leftPanelOpen && (
          <div className="flex w-10 shrink-0 flex-col items-center border-r border-stone-300/80 bg-white/50 pt-2">
            <button
              type="button"
              className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              onClick={() => setLeftPanelOpen(true)}
              aria-label="Expand file browser"
              title="Expand file browser"
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        )}

        {/* Center Editor Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Tab Bar */}
          {hasTabs && (
            <div className="flex shrink-0 items-center border-b border-stone-300/80 bg-white/80 px-2" style={{ height: 36 }}>
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={[
                    "flex items-center gap-1.5 rounded-t-md px-3 py-1 text-sm",
                    tab.id === activeTabId
                      ? "bg-surface text-ink"
                      : "text-stone-500 hover:text-stone-700"
                  ].join(" ")}
                  style={{ height: 35, marginBottom: -1 }}
                >
                  <button
                    type="button"
                    className="max-w-[160px] truncate text-left"
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    {tab.fileName}
                  </button>
                  <button
                    type="button"
                    className="ml-1 rounded-sm text-stone-400 hover:text-stone-600"
                    onClick={() => closeTab(tab.id)}
                    aria-label={`Close ${tab.fileName}`}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {children}
        </div>

        {/* Right Panel (collapsible) */}
        {rightPanelOpen && (
          <RightPanel
            activeView={rightPanelView}
            onViewChange={setRightPanelView}
            onCollapse={toggleRightPanel}
          />
        )}

        {/* Expand toggle for right panel when collapsed */}
        {!rightPanelOpen && (
          <div className="flex w-10 shrink-0 flex-col items-center border-l border-stone-300/80 bg-white/50 pt-2">
            <button
              type="button"
              className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              onClick={() => setRightPanelOpen(true)}
              aria-label="Expand right panel"
              title="Expand right panel"
            >
              <Icon name="chevronLeft" size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Settings Overlay */}
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
