import { useState } from "react";
import { Icon } from "./Icon";

type KnowledgeViewMode = "cards" | "graph";

export function KnowledgeView() {
  const [mode, setMode] = useState<KnowledgeViewMode>("cards");

  return (
    <div className="flex h-full flex-col">
      {/* Mode toggle + search */}
      <div className="flex items-center gap-2 border-b border-stone-200 px-3 py-2">
        <div className="flex rounded-md border border-stone-300 bg-white p-0.5">
          <button
            type="button"
            className={[
              "rounded px-2 py-0.5 text-xs font-medium transition",
              mode === "cards"
                ? "bg-pine text-white"
                : "text-stone-500 hover:text-stone-700"
            ].join(" ")}
            onClick={() => setMode("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={[
              "rounded px-2 py-0.5 text-xs font-medium transition",
              mode === "graph"
                ? "bg-pine text-white"
                : "text-stone-500 hover:text-stone-700"
            ].join(" ")}
            onClick={() => setMode("graph")}
          >
            Graph
          </button>
        </div>
        <div className="flex-1" />
        <input
          type="text"
          className="w-28 rounded-md border border-stone-300 px-2 py-1 text-xs placeholder:text-stone-400 focus:border-pine focus:outline-none"
          placeholder="Search..."
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {mode === "cards" && <KnowledgeCardList />}
        {mode === "graph" && <KnowledgeGraphPlaceholder />}
      </div>
    </div>
  );
}

function KnowledgeCardList() {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-stone-200 bg-white p-3">
        <p className="text-sm font-medium text-stone-700">Agent-driven Knowledge</p>
        <p className="mt-1 text-xs text-stone-400">
          Knowledge units are generated, updated, and pruned by agent conversations.
          Each unit is traceable to its source conversation.
        </p>
      </div>
      <div className="rounded-md border border-stone-200 bg-white p-3">
        <p className="text-sm font-medium text-stone-700">Semantic Memory Layer</p>
        <p className="mt-1 text-xs text-stone-400">
          Knowledge persists across conversations, forming a growing semantic memory
          that agents can reference via @knowledge or passive RAG retrieval.
        </p>
      </div>
      <div className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-300 bg-stone-50 p-3 text-center text-xs text-stone-400">
        <Icon name="add" size={12} />
        <span>New Knowledge Unit</span>
      </div>
    </div>
  );
}

function KnowledgeGraphPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-sm text-stone-400">
      <div className="mb-3 rounded-full border-2 border-dashed border-stone-300 p-4">
        <Icon name="graph" size={32} />
      </div>
      <p>Knowledge graph will render here.</p>
      <p className="mt-1 text-xs">Nodes = knowledge units, Edges = relationships</p>
    </div>
  );
}
