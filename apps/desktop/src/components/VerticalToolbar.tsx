import { Icon } from "./Icon";

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
          <Icon name="fileBrowser" size={18} />
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
          <Icon name="command" size={18} />
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
          <Icon name="settings" size={18} />
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
