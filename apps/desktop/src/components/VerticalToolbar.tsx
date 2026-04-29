export function VerticalToolbar({
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
  onOpenSettings,
}: {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center border-r border-stone-300/80 bg-white/90 py-3">
      {/* Top: panel toggles */}
      <div className="flex flex-col items-center gap-1">
        <ToolbarButton
          active={leftPanelOpen}
          onClick={onToggleLeftPanel}
          ariaLabel={leftPanelOpen ? "Collapse file browser" : "Expand file browser"}
          title="File Browser"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2 6H16" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          active={rightPanelOpen}
          onClick={onToggleRightPanel}
          ariaLabel={rightPanelOpen ? "Collapse right panel" : "Expand right panel"}
          title="Right Panel"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="2" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M11 2V16" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </ToolbarButton>

        <div className="my-2 h-px w-6 bg-stone-200" />
      </div>

      {/* Middle: quick actions (placeholder, expand later) */}
      <div className="flex flex-1 flex-col items-center gap-1 pt-1">
        <ToolbarButton
          onClick={() => {}}
          ariaLabel="Command palette"
          title="Command Palette"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 10L8 12L12 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Bottom: settings */}
      <div className="flex flex-col items-center">
        <div className="my-2 h-px w-6 bg-stone-200" />
        <ToolbarButton
          onClick={onOpenSettings}
          ariaLabel="Settings"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9 1.5V4M9 14V16.5M16.5 9H14M4 9H1.5M14.3 3.7L12.5 5.5M5.5 12.5L3.7 14.3M14.3 14.3L12.5 12.5M5.5 5.5L3.7 3.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  ariaLabel,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded-md p-1.5 transition",
        active
          ? "bg-pine/10 text-pine"
          : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
      ].join(" ")}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}
