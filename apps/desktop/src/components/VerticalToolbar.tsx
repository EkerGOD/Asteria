export function VerticalToolbar({
  leftPanelOpen,
  onToggleLeftPanel,
  onOpenSettings,
}: {
  leftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
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
            <path d="M6 2V16" stroke="currentColor" strokeWidth="1.2" />
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
            <path d="M9 1.5L9.5 3.2L11.3 3.5L12 5L13.5 5.8L13.8 7.6L14.8 9L13.8 10.4L13.5 12.2L12 13L11.3 14.5L9.5 14.8L9 16.5L8.5 14.8L6.7 14.5L6 13L4.5 12.2L4.2 10.4L3.2 9L4.2 7.6L4.5 5.8L6 5L6.7 3.5L8.5 3.2L9 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="9" cy="9" r="1.8" stroke="currentColor" strokeWidth="1" />
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
