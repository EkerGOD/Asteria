import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ModelRoleProvider } from "../contexts/ModelRoleContext";
import { VerticalToolbar } from "./VerticalToolbar";
import { FileBrowser } from "./FileBrowser";
import { IconButton } from "./IconButton";
import { RightPanel } from "./RightPanel";
import { StatusBar } from "./StatusBar";
import { SettingsOverlay } from "./SettingsOverlay";
import { useThemePreference } from "../hooks/useThemePreference";

export type RightPanelView = "chat" | "knowledge" | "outline" | "graph";

export interface OpenTab {
  id: string;
  filePath: string;
  fileName: string;
}

type ResizingPanel = "left" | "right";

const TOOLBAR_WIDTH = 44;
const COLLAPSED_PANEL_WIDTH = 40;
const RESIZE_HANDLE_WIDTH = 6;
const MIN_EDITOR_WIDTH = 360;
const LEFT_PANEL_MIN_WIDTH = 200;
const LEFT_PANEL_MAX_WIDTH = 360;
const LEFT_PANEL_DEFAULT_WIDTH = 240;
const RIGHT_PANEL_MIN_WIDTH = 280;
const RIGHT_PANEL_MAX_WIDTH = 520;
const RIGHT_PANEL_DEFAULT_WIDTH = 320;
const KEYBOARD_RESIZE_STEP = 16;

export function AppShell({ children }: { children: ReactNode }) {
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const theme = useThemePreference();
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_DEFAULT_WIDTH);
  const [resizingPanel, setResizingPanel] = useState<ResizingPanel | null>(null);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>("chat");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatInputValue, setChatInputValue] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const toggleLeftPanel = useCallback(() => setLeftPanelOpen((v) => !v), []);
  const toggleRightPanel = useCallback(() => setRightPanelOpen((v) => !v), []);

  const getMainAreaWidth = useCallback(() => {
    return mainAreaRef.current?.getBoundingClientRect().width ?? window.innerWidth;
  }, []);

  const getLeftPanelMaxWidth = useCallback(() => {
    const rightSideWidth =
      rightPanelOpen
        ? rightPanelWidth + RESIZE_HANDLE_WIDTH
        : COLLAPSED_PANEL_WIDTH;
    const available =
      getMainAreaWidth() -
      TOOLBAR_WIDTH -
      RESIZE_HANDLE_WIDTH -
      rightSideWidth -
      MIN_EDITOR_WIDTH;

    return Math.max(
      LEFT_PANEL_MIN_WIDTH,
      Math.min(LEFT_PANEL_MAX_WIDTH, available)
    );
  }, [getMainAreaWidth, rightPanelOpen, rightPanelWidth]);

  const getRightPanelMaxWidth = useCallback(() => {
    const leftSideWidth =
      TOOLBAR_WIDTH +
      (leftPanelOpen
        ? leftPanelWidth + RESIZE_HANDLE_WIDTH
        : COLLAPSED_PANEL_WIDTH);
    const available =
      getMainAreaWidth() -
      leftSideWidth -
      RESIZE_HANDLE_WIDTH -
      MIN_EDITOR_WIDTH;

    return Math.max(
      RIGHT_PANEL_MIN_WIDTH,
      Math.min(RIGHT_PANEL_MAX_WIDTH, available)
    );
  }, [getMainAreaWidth, leftPanelOpen, leftPanelWidth]);

  const clampLeftPanelWidth = useCallback(
    (width: number) =>
      clamp(width, LEFT_PANEL_MIN_WIDTH, getLeftPanelMaxWidth()),
    [getLeftPanelMaxWidth]
  );

  const clampRightPanelWidth = useCallback(
    (width: number) =>
      clamp(width, RIGHT_PANEL_MIN_WIDTH, getRightPanelMaxWidth()),
    [getRightPanelMaxWidth]
  );

  const resizeLeftPanel = useCallback(
    (width: number) => setLeftPanelWidth(clampLeftPanelWidth(width)),
    [clampLeftPanelWidth]
  );

  const resizeRightPanel = useCallback(
    (width: number) => setRightPanelWidth(clampRightPanelWidth(width)),
    [clampRightPanelWidth]
  );

  useEffect(() => {
    if (!resizingPanel) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    function handleMouseMove(event: globalThis.MouseEvent) {
      const rect = mainAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (resizingPanel === "left") {
        resizeLeftPanel(
          event.clientX - rect.left - TOOLBAR_WIDTH
        );
        return;
      }

      resizeRightPanel(rect.right - event.clientX);
    }

    function handleMouseUp() {
      setResizingPanel(null);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeLeftPanel, resizeRightPanel, resizingPanel]);

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
  const panelTransitionClass = resizingPanel
    ? ""
    : "transition-[width] duration-150 ease-out";

  return (
    <ModelRoleProvider>
      <div className="flex h-screen flex-col bg-surface text-ink">
      {/* Main area */}
      <div ref={mainAreaRef} className="flex min-h-0 flex-1">
        {/* Vertical Toolbar */}
        <VerticalToolbar
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* File Browser (left panel, collapsible) */}
        <div
          className={[
            "min-h-0 shrink-0 overflow-hidden",
            panelTransitionClass,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: leftPanelOpen ? leftPanelWidth : COLLAPSED_PANEL_WIDTH }}
        >
          <FileBrowser
            collapsed={!leftPanelOpen}
            onToggleCollapse={toggleLeftPanel}
            onOpenFile={openFile}
            onManageVaults={() => setSettingsOpen(true)}
          />
        </div>

        {leftPanelOpen && (
          <PanelResizeHandle
            active={resizingPanel === "left"}
            label="Resize file browser panel"
            min={LEFT_PANEL_MIN_WIDTH}
            max={getLeftPanelMaxWidth()}
            value={leftPanelWidth}
            onMouseDown={(event) => {
              event.preventDefault();
              setResizingPanel("left");
            }}
            onStep={(delta) => resizeLeftPanel(leftPanelWidth + delta)}
          />
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
                  <IconButton
                    icon="close"
                    label={`Close ${tab.fileName}`}
                    className="ml-1"
                    onClick={() => closeTab(tab.id)}
                    size="xs"
                    iconSize={12}
                  />
                </div>
              ))}
            </div>
          )}
          {children}
        </div>

        {rightPanelOpen && (
          <PanelResizeHandle
            active={resizingPanel === "right"}
            label="Resize right panel"
            min={RIGHT_PANEL_MIN_WIDTH}
            max={getRightPanelMaxWidth()}
            value={rightPanelWidth}
            onMouseDown={(event) => {
              event.preventDefault();
              setResizingPanel("right");
            }}
            onStep={(delta) => resizeRightPanel(rightPanelWidth - delta)}
          />
        )}

        {/* Right Panel (collapsible) */}
        <div
          className={[
            "min-h-0 shrink-0 overflow-hidden",
            panelTransitionClass,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: rightPanelOpen ? rightPanelWidth : COLLAPSED_PANEL_WIDTH }}
        >
          <RightPanel
            collapsed={!rightPanelOpen}
            onToggleCollapse={toggleRightPanel}
            activeView={rightPanelView}
            onViewChange={setRightPanelView}
            activeConversationId={activeConversationId}
            onConversationChange={setActiveConversationId}
            chatInputValue={chatInputValue}
            onChatInputChange={setChatInputValue}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Settings Overlay */}
      {settingsOpen && (
        <SettingsOverlay
          themePreference={theme.preference}
          resolvedTheme={theme.resolvedTheme}
          onThemePreferenceChange={theme.setPreference}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      </div>
    </ModelRoleProvider>
  );
}

function PanelResizeHandle({
  active,
  label,
  min,
  max,
  value,
  onMouseDown,
  onStep,
}: {
  active: boolean;
  label: string;
  min: number;
  max: number;
  value: number;
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onStep: (delta: number) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onStep(-KEYBOARD_RESIZE_STEP);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      onStep(KEYBOARD_RESIZE_STEP);
    }
  }

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className={[
        "group flex w-1.5 shrink-0 cursor-col-resize items-stretch justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/35",
        active ? "bg-pine/5" : "bg-transparent hover:bg-stone-200/35"
      ].join(" ")}
      onMouseDown={onMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        className={[
          "w-px transition-colors",
          active
            ? "bg-pine/60"
            : "bg-stone-300/25 group-hover:bg-pine/45 group-focus-visible:bg-pine/45"
        ].join(" ")}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
