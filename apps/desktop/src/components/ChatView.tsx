import { useCallback, useEffect, useRef, useState } from "react";
import {
  archiveConversation,
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  sendChat,
} from "../api/client";
import type { Conversation, Message } from "../api/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";

export function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Conversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [retryFlag, setRetryFlag] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  const [historyHeight, setHistoryHeight] = useState(160);
  const [dragging, setDragging] = useState(false);

  /* ---- data fetching ---- */

  const fetchConversations = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingConversations(true);
    setError(null);
    try {
      const result = await listConversations(
        { project_id: null, include_archived: false },
        { signal: controller.signal },
      );
      setConversations(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      if (!controller.signal.aborted) setLoadingConversations(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
    return () => abortRef.current?.abort();
  }, [fetchConversations, retryFlag]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    setChatError(null);
    try {
      const result = await listMessages(conversationId);
      setMessages(result);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      setMessages([]);
      void fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---- actions ---- */

  const handleNewChat = async () => {
    setChatError(null);
    try {
      const conv = await createConversation({ title: "New conversation" });
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to create conversation");
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setChatError(null);
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !activeConversationId) return;
    setInputValue("");
    setChatError(null);
    setSending(true);

    try {
      const result = await sendChat({
        conversation_id: activeConversationId,
        content: trimmed,
      });
      setMessages((prev) => [...prev, result.user_message, result.assistant_message]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, updated_at: result.assistant_message.created_at } : c,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setChatError(msg);
      setInputValue(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveConversation(archiveTarget.id);
      setConversations((prev) => prev.filter((c) => c.id !== archiveTarget.id));
      if (activeConversationId === archiveTarget.id) setActiveConversationId(null);
    } catch {
      // keep dialog open on error
    } finally {
      setArchiveTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteConversation(deleteTarget.id);
      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (activeConversationId === deleteTarget.id) setActiveConversationId(null);
    } catch {
      // keep dialog open on error
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ---- derived ---- */

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  /* ---- drag-resize ---- */

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

  /* ---- render ---- */

  return (
    <div className="flex h-full flex-col" ref={containerRef}>
      {/* Chat messages area */}
      <div className="flex-1 overflow-auto">
        {loadingConversations && (
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

        {!loadingConversations && !error && !activeConversation && (
          <EmptyState
            title="No conversation selected"
            detail="Select a conversation below or create a new one to start chatting."
          />
        )}

        {activeConversation && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto px-3 pb-3 pt-2">
              {chatError && (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
                  {chatError}
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => setChatError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {loadingMessages && (
                <div className="flex items-center justify-center py-8 text-sm text-stone-400">
                  Loading messages...
                </div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-stone-400">
                  Send a message to start the conversation.
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {sending && (
                <div className="mb-2 flex items-center gap-2 text-sm text-stone-400">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-pine/60" />
                  Waiting for response...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-stone-200 p-2">
        <textarea
          className="w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine disabled:opacity-50"
          rows={2}
          placeholder="Ask anything... @knowledge to reference"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void handleSend();
            }
          }}
          disabled={sending || !activeConversationId}
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
                    + New Project
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md bg-pine px-3 py-1 text-xs font-medium text-white hover:bg-pine/90 disabled:opacity-50"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || sending || !activeConversationId}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      {/* Drag handle */}
      <div
        className="shrink-0 cursor-row-resize border-t border-stone-300 bg-stone-50 transition-colors hover:bg-stone-200"
        style={{ height: 6 }}
        onMouseDown={handleDragStart}
      />

      {/* History / Project Manager */}
      <div className="shrink-0 border-t-0 bg-stone-50" style={{ height: historyHeight }}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-xs font-semibold uppercase text-stone-500">History</p>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-stone-200"
              onClick={() => void handleNewChat()}
            >
              + New Chat
            </button>
          </div>
          <div className="flex-1 overflow-auto px-1">
            {conversations.length === 0 && !loadingConversations && (
              <p className="px-2 text-xs text-stone-400">No conversations yet.</p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                className={[
                  "group flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer",
                  conv.id === activeConversationId
                    ? "bg-pine/10 text-pine"
                    : "text-stone-600 hover:bg-stone-100",
                ].join(" ")}
                onClick={() => handleSelectConversation(conv)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectConversation(conv);
                  }
                }}
              >
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  type="button"
                  className="ml-1 hidden rounded p-0.5 text-stone-400 hover:text-red-500 group-hover:inline"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv); }}
                  aria-label={`Delete ${conv.title}`}
                  title="Delete"
                >
                  <Icon name="close" size={12} />
                </button>
                <button
                  type="button"
                  className="ml-1 hidden rounded p-0.5 text-stone-400 hover:text-amber-600 group-hover:inline"
                  onClick={(e) => { e.stopPropagation(); setArchiveTarget(conv); }}
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
        open={archiveTarget !== null}
        title="Archive Conversation"
        message={`Archive "${archiveTarget?.title ?? "this conversation"}"? It will be hidden from the list. This cannot be undone.`}
        confirmLabel="Archive"
        onConfirm={() => void handleArchive()}
        onCancel={() => setArchiveTarget(null)}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Conversation"
        message={`Permanently delete "${deleteTarget?.title ?? "this conversation"}"? All messages will be removed. This cannot be undone.`}
        confirmLabel="Delete Conversation"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={["mb-2 flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-pine text-white"
            : "border border-stone-200 bg-white text-stone-800",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {message.model && !isUser && (
          <p className="mt-1 text-right text-xs opacity-60">{message.model}</p>
        )}
      </div>
    </div>
  );
}
