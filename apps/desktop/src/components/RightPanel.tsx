import type { RightPanelView } from "./AppShell";
import { ChatView } from "./ChatView";
import { KnowledgeView } from "./KnowledgeView";

const views: { id: RightPanelView; label: string; title: string }[] = [
  { id: "chat", label: "💬", title: "Chat" },
  { id: "knowledge", label: "🧠", title: "Knowledge" },
  { id: "outline", label: "📑", title: "Outline" },
  { id: "graph", label: "🔗", title: "Graph" }
];

export function RightPanel({
  activeView,
  onViewChange,
}: {
  activeView: RightPanelView;
  onViewChange: (view: RightPanelView) => void;
}) {
  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-stone-300/80 bg-white/80">
      {/* View switcher icons */}
      <div className="flex items-center gap-0.5 border-b border-stone-200 px-2 py-1.5">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            className={[
              "rounded-md px-2 py-1 text-sm transition",
              view.id === activeView
                ? "bg-pine/10 text-pine"
                : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            ].join(" ")}
            onClick={() => onViewChange(view.id)}
            aria-label={view.title}
            title={view.title}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {activeView === "chat" && <ChatView />}
        {activeView === "knowledge" && <KnowledgeView />}
        {activeView === "outline" && <OutlineView />}
        {activeView === "graph" && <GraphView />}
      </div>
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
