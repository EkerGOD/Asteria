import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import {
  archiveConversation,
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  sendChat,
  updateConversation,
} from "../api/client";
import type { Conversation, Message } from "../api/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";

export function ChatView({
  activeConversationId,
  onConversationChange,
  chatInputValue,
  onChatInputChange,
}: {
  activeConversationId: string | null;
  onConversationChange: (id: string | null) => void;
  chatInputValue: string;
  onChatInputChange: (value: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);

  const MAX_TEXTAREA_HEIGHT = 200;

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

  // Close conversation menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [chatInputValue]);

  // Auto-scroll to bottom — instant for initial load, smooth for new messages.
  // Uses message count delta to detect initial load, avoiding StrictMode race conditions.
  useEffect(() => {
    if (messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }
    const isInitial = prevMessageCountRef.current === 0;
    messagesEndRef.current?.scrollIntoView({
      behavior: isInitial ? "instant" : "smooth",
    });
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  /* ---- actions ---- */

  const handleNewChat = async () => {
    setChatError(null);
    try {
      const conv = await createConversation({ title: "New conversation" });
      setConversations((prev) => [conv, ...prev]);
      onConversationChange(conv.id);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to create conversation");
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    onConversationChange(conversation.id);
    setChatError(null);
  };

  const handleSend = async () => {
    const trimmed = chatInputValue.trim();
    if (!trimmed || !activeConversationId) return;
    onChatInputChange("");
    setChatError(null);
    setSending(true);

    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: activeConversationId,
      provider_id: null,
      role: "user",
      content: trimmed,
      model: null,
      token_count: null,
      retrieval_metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const result = await sendChat({
        conversation_id: activeConversationId,
        content: trimmed,
      });
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== optimisticMessage.id)
          .concat([result.user_message, result.assistant_message]),
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, updated_at: result.assistant_message.created_at } : c,
        ),
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setChatError(msg);
      onChatInputChange(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  const handleEditMessage = (content: string) => {
    onChatInputChange(content);
  };

  const handleRetry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      onChatInputChange(lastUser.content);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveConversation(archiveTarget.id);
      setConversations((prev) => prev.filter((c) => c.id !== archiveTarget.id));
      if (activeConversationId === archiveTarget.id) onConversationChange(null);
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
      if (activeConversationId === deleteTarget.id) onConversationChange(null);
    } catch {
      // keep dialog open on error
    } finally {
      setDeleteTarget(null);
    }
  };

  const startRename = (conv: Conversation) => {
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const submitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !renamingId) {
      cancelRename();
      return;
    }
    const conv = conversations.find((c) => c.id === renamingId);
    if (conv && conv.title === trimmed) {
      cancelRename();
      return;
    }
    try {
      const updated = await updateConversation(renamingId, { title: trimmed });
      setConversations((prev) =>
        prev.map((c) => (c.id === renamingId ? updated : c)),
      );
    } catch {
      return;
    }
    cancelRename();
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
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCopy={(content) => void handleCopy(content)}
                  onEdit={(content) => handleEditMessage(content)}
                  onRetry={() => handleRetry()}
                />
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
          ref={textareaRef}
          className="w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine disabled:opacity-50 transition-[height] duration-100"
          rows={1}
          placeholder="Ask anything... @knowledge to reference"
          value={chatInputValue}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.ctrlKey || e.metaKey) {
                // Ctrl+Enter: insert newline (default behavior)
                return;
              }
              // Enter alone: send message
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
            disabled={!chatInputValue.trim() || sending || !activeConversationId}
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
                {renamingId === conv.id ? (
                  <input
                    type="text"
                    className="flex-1 rounded border border-pine bg-white px-1 py-0 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-pine"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        void submitRename();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelRename();
                      }
                    }}
                    onBlur={() => submitRename()}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="truncate flex-1">{conv.title}</span>
                )}
                <div className="relative ml-1">
                  <button
                    type="button"
                    className="hidden rounded p-0.5 text-stone-400 hover:text-stone-600 group-hover:inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === conv.id ? null : conv.id));
                    }}
                    aria-label={`Actions for ${conv.title}`}
                    title="Actions"
                  >
                    <Icon name="ellipsis" size={12} />
                  </button>
                  {menuOpenId === conv.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-full z-30 mt-0.5 min-w-[100px] rounded-md border border-stone-200 bg-white py-0.5 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2.5 py-1 text-left text-xs text-stone-700 hover:bg-stone-50"
                        onClick={() => { setMenuOpenId(null); startRename(conv); }}
                      >
                        <Icon name="edit" size={12} />
                        Rename
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2.5 py-1 text-left text-xs text-stone-700 hover:bg-stone-50"
                        onClick={() => { setMenuOpenId(null); setArchiveTarget(conv); }}
                      >
                        <Icon name="archive" size={12} />
                        Archive
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2.5 py-1 text-left text-xs text-red-600 hover:bg-red-50"
                        onClick={() => { setMenuOpenId(null); setDeleteTarget(conv); }}
                      >
                        <Icon name="close" size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
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

function MessageBubble({
  message,
  onCopy,
  onEdit,
  onRetry,
}: {
  message: Message;
  onCopy?: (content: string) => void;
  onEdit?: (content: string) => void;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  const isOptimistic = message.id.startsWith("optimistic-");

  return (
    <div className={["mb-2 flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] rounded-lg px-3 py-2 text-sm group/bubble",
          isUser
            ? "bg-pine text-white"
            : "border border-stone-200 bg-white text-stone-800",
          isOptimistic ? "opacity-70" : "",
        ].join(" ")}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-stone prose-headings:mb-1 prose-headings:mt-3 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:my-2 prose-code:bg-stone-100 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-pre:bg-stone-100 prose-pre:p-3">
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {message.content}
            </Markdown>
          </div>
        )}

        {/* Action buttons */}
        <div
          className={[
            "mt-1 flex items-center gap-0.5",
            isUser ? "justify-end opacity-0 group-hover/bubble:opacity-100 transition-opacity" : "justify-end",
          ].join(" ")}
        >
          {isUser ? (
            <>
              <ActionButton icon="copy" label="Copy" onClick={() => onCopy?.(message.content)} />
              <ActionButton icon="edit" label="Edit" onClick={() => onEdit?.(message.content)} />
            </>
          ) : (
            <>
              <ActionButton icon="copy" label="Copy" onClick={() => onCopy?.(message.content)} />
              <ActionButton icon="refresh" label="Retry" onClick={() => onRetry?.()} />
            </>
          )}
        </div>

        {message.model && !isUser && (
          <p className="mt-1 text-right text-xs opacity-60">{message.model}</p>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: import("./Icon").IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-white/15 transition-opacity"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={12} />
    </button>
  );
}
