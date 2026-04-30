import { IconButton } from "./IconButton";

export function VerticalToolbar({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center border-r border-stone-300/80 bg-white/90">
      {/* Middle: quick actions (placeholder, expand later) */}
      <div className="flex flex-1 flex-col items-center gap-1 pt-3">
        <IconButton
          icon="command"
          onClick={() => {}}
          label="Command palette"
          title="Command Palette"
          iconSize={18}
          size="md"
        />
      </div>

      {/* Bottom: settings */}
      <div className="flex h-10 w-full shrink-0 items-center justify-center">
        <IconButton
          icon="settings"
          onClick={onOpenSettings}
          label="Settings"
          title="Settings"
          iconSize={18}
          size="md"
        />
      </div>
    </div>
  );
}
