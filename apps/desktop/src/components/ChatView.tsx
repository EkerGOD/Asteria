import { useState, useRef, useEffect, useCallback } from "react";
import { listConversations, archiveConversation } from "../api/client";
import type { Conversation } from "../api/types";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";

export function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [retryFlag, setRetryFlag] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  const [historyHeight, setHistoryHeight] = useState(160);
  const [dragging, setDragging] = useState(false);

  const fetchConversations = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await listConversations(
        { project_id: null, include_archived: false },
        { signal: controller.signal }
      );
      setConversations(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    return () => abortRef.current?.abort();
  }, [fetchConversations, retryFlag]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Drag-resize history panel
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStartRef.current = { y: e.clientY, height: historyHeight };
    },
    [historyHeight],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      const delta = dragStartRef.current.y - e.clientY;
      const maxHeight = Math.floor(containerRef.current.clientHeight * 0.6);
      setHistoryHeight(
        Math.min(Math.max(dragStartRef.current.height + delta, 80), maxHeight),
      );
    };

    const handleMouseUp = () => {
      setDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue("");
    // Placeholder: would call API to send message
  };

  const handleArchive = async () => {
    if (!archiveTargetId) return;
    try {
      await archiveConversation(archiveTargetId);
      setConversations((prev) => prev.filter((c) => c.id !== archiveTargetId));
      if (activeConversationId === archiveTargetId) setActiveConversationId(null);
    } catch {
      // keep dialog open on error
    } finally {
      setArchiveTargetId(null);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-full flex-col" ref={containerRef}>
      {/* Chat messages area */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center p-6 text-sm text-stone-500">
            Loading conversations...
          </div>
        )}
        {error && (
          <div className="m-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setRetryFlag((c) => c + 1)}
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && !activeConversation && (
          <EmptyState
            title="No conversation selected"
            detail="Select a conversation below or create a new one to start chatting."
          />
        )}
        {activeConversation && (
          <div className="p-3">
            <div className="rounded-md bg-pine/5 px-3 py-2 text-sm text-pine">
              <p className="font-medium">{activeConversation.title}</p>
            </div>
            <div className="mt-2 space-y-2 text-sm text-stone-500 px-1">
              <p>Messages will appear here.</p>
              <p className="text-xs">Tip: Use <code className="rounded bg-stone-100 px-1">@knowledge</code> to reference knowledge units.</p>
            </div>
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-stone-200 p-2">
        <textarea
          className="w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
          rows={2}
          placeholder="Ask anything... @knowledge to reference"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-stone-400">
            {/* Project selector */}
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-stone-100"
                onClick={() => setProjectMenuOpen((v) => !v)}
              >
                <Icon name={activeProjectId ? "project" : "folder"} size={12} />
                <span>{activeProjectId ? "Project" : "No Project"}</span>
              </button>
              {projectMenuOpen && (
                <div className="absolute bottom-full left-0 mb-1 rounded-md border border-stone-300 bg-white shadow-lg z-30 py-1 min-w-[140px]">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs text-stone-700 hover:bg-stone-50"
                    onClick={() => { setActiveProjectId(null); setProjectMenuOpen(false); }}
                  >
                    No Project
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs text-stone-700 hover:bg-stone-50"
                    onClick={() => { setProjectMenuOpen(false); }}
                  >
                    <Icon name="add" size={12} />
                    <span>New Project</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md bg-pine px-3 py-1 text-xs font-medium text-white hover:bg-pine/90 disabled:opacity-50"
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {/* Drag handle */}
      <div
        className="shrink-0 cursor-row-resize border-t border-stone-300 bg-stone-50 transition-colors hover:bg-stone-200"
        style={{ height: 6 }}
        onMouseDown={handleDragStart}
      />

      {/* History / Project Manager (bottom section) */}
      <div className="shrink-0 border-t-0 bg-stone-50" style={{ height: historyHeight }}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-xs font-semibold uppercase text-stone-500">History</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-stone-200"
              onClick={() => setActiveConversationId(null)}
            >
              <Icon name="add" size={12} />
              <span>New Chat</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto px-1">
            {conversations.length === 0 && !loading && (
              <p className="px-2 text-xs text-stone-400">No conversations yet.</p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                className={[
                  "group flex h-7 cursor-pointer items-center justify-between rounded px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/35",
                  conv.id === activeConversationId
                    ? "bg-pine/10 text-pine"
                    : "text-stone-600 hover:bg-stone-100 focus-visible:bg-stone-100"
                ].join(" ")}
                onClick={() => setActiveConversationId(conv.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveConversationId(conv.id);
                  }
                }}
              >
                <span className="min-w-0 flex-1 truncate">{conv.title}</span>
                <button
                  type="button"
                  className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-stone-400 opacity-0 transition-colors hover:text-red-500 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/35 group-focus-within:opacity-100 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); setArchiveTargetId(conv.id); }}
                  aria-label={`Archive ${conv.title}`}
                  title="Archive"
                >
                  <Icon name="archive" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Archive confirm dialog */}
      <ConfirmDialog
        open={archiveTargetId !== null}
        title="Archive Conversation"
        message="Archive this conversation? It will be hidden from the list. This cannot be undone."
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTargetId(null)}
      />
    </div>
  );
}
