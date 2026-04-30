import type { RightPanelView } from "./AppShell";
import { ChatView } from "./ChatView";
import type { IconName } from "./Icon";
import { IconButton } from "./IconButton";
import { KnowledgeView } from "./KnowledgeView";

const views: { id: RightPanelView; icon: IconName; title: string }[] = [
  { id: "chat", icon: "chat", title: "Chat" },
  { id: "knowledge", icon: "knowledge", title: "Knowledge" },
  { id: "outline", icon: "outline", title: "Outline" },
  { id: "graph", icon: "graph", title: "Graph" }
];

export function RightPanel({
  collapsed,
  onToggleCollapse,
  activeView,
  onViewChange,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: RightPanelView;
  onViewChange: (view: RightPanelView) => void;
}) {
  return (
    <div className="flex h-full w-full flex-col border-l border-stone-300/80 bg-white/80">
      {/* View switcher icons */}
      <div
        className={[
          "flex items-center border-b border-stone-200 py-1.5",
          collapsed ? "justify-center px-1" : "gap-0.5 px-2",
        ].join(" ")}
      >
        {collapsed ? null : (
          <>
            {views.map((view) => (
              <IconButton
                key={view.id}
                icon={view.icon}
                label={view.title}
                active={view.id === activeView}
                onClick={() => onViewChange(view.id)}
                size="sm"
                iconSize={16}
              />
            ))}
            <div className="mx-1 h-5 w-px bg-stone-200" aria-hidden="true" />
          </>
        )}
        <IconButton
          icon={collapsed ? "chevronLeft" : "chevronRight"}
          label={collapsed ? "Expand right panel" : "Collapse right panel"}
          onClick={onToggleCollapse}
          size="sm"
          iconSize={16}
        />
      </div>

      {/* View content */}
      {collapsed ? null : (
        <div className="flex-1 overflow-hidden">
        {activeView === "chat" && <ChatView />}
        {activeView === "knowledge" && <KnowledgeView />}
        {activeView === "outline" && <OutlineView />}
        {activeView === "graph" && <GraphView />}
        </div>
      )}
    </div>
  );
}

function OutlineView() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center text-sm text-stone-400">
      <p className="font-medium">Outline</p>
      <p className="mt-1">Open a Markdown file to see its structure.</p>
    </div>
  );
}

function GraphView() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center text-sm text-stone-400">
      <p className="font-medium">Graph</p>
      <p className="mt-1">Knowledge relationship graph will appear here.</p>
    </div>
  );
}
