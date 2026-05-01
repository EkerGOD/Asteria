import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import {
  archiveConversation,
  archiveProject,
  createConversation,
  createProject,
  deleteConversation,
  listConversations,
  listMessages,
  listProjects,
  sendChatStream,
  updateConversation,
  updateProject,
} from "../api/client";
import type { Conversation, Message, Project, TokenUsage } from "../api/types";
import { readMessageDisplayConfig } from "../store/messageDisplay";
import { useModelRole } from "../contexts/ModelRoleContext";
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
  const [messagesRevealed, setMessagesRevealed] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [enableRag, setEnableRag] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [projectActionTarget, setProjectActionTarget] = useState<string | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameProjectValue, setRenameProjectValue] = useState("");
  const [archiveProjectTarget, setArchiveProjectTarget] = useState<Project | null>(null);
  const [projectConfigOpen, setProjectConfigOpen] = useState(false);
  const [configName, setConfigName] = useState("");
  const [configDescription, setConfigDescription] = useState("");
  const [configColor, setConfigColor] = useState("");
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
  const [messageMeta, setMessageMeta] = useState<Map<string, { token_usage?: TokenUsage; response_delay_ms?: number }>>(new Map());

  const { availableModels, chatModel: activeChatModel, setChatModel } = useModelRole();
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
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
    setMessagesRevealed(false);
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
      setMessagesRevealed(false);
      prevMessageCountRef.current = 0;
      void fetchMessages(activeConversationId);
    } else {
      setMessages([]);
      setMessagesRevealed(true);
      prevMessageCountRef.current = 0;
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

  // Close model dropdown on outside click
  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modelDropdownOpen]);

  // Close project menu on outside click
  useEffect(() => {
    if (!projectMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setProjectMenuOpen(false);
        setShowNewProjectInput(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [projectMenuOpen]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const result = await listProjects();
      setProjects(result);
    } catch {
      // Projects are non-critical; silently ignore errors.
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const projectMenuRef = useRef<HTMLDivElement>(null);

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    try {
      const created = await createProject({ name });
      setProjects((prev) => [...prev, created]);
      setActiveProjectId(created.id);
      setNewProjectName("");
      setShowNewProjectInput(false);
      setProjectMenuOpen(false);
    } catch {
      // Error silently; user can retry.
    }
  };

  const handleRenameProject = async (projectId: string) => {
    const name = renameProjectValue.trim();
    if (!name) {
      setRenamingProjectId(null);
      return;
    }
    try {
      const updated = await updateProject(projectId, { name });
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    } catch {
      // Error silently.
    }
    setRenamingProjectId(null);
    setRenameProjectValue("");
  };

  const handleArchiveProject = async () => {
    if (!archiveProjectTarget) return;
    try {
      await archiveProject(archiveProjectTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== archiveProjectTarget.id));
      if (activeProjectId === archiveProjectTarget.id) {
        setActiveProjectId(null);
      }
    } catch {
      // Error silently.
    }
    setArchiveProjectTarget(null);
    setProjectActionTarget(null);
  };

  const openProjectConfig = () => {
    if (!activeProject) return;
    setConfigName(activeProject.name);
    setConfigDescription(activeProject.description ?? "");
    setConfigColor(activeProject.color ?? "");
    setProjectConfigOpen(true);
  };

  const handleSaveProjectConfig = async () => {
    if (!activeProject) return;
    const name = configName.trim();
    if (!name) return;
    try {
      const updated = await updateProject(activeProject.id, {
        name,
        description: configDescription.trim() || null,
        color: configColor.trim() || null,
      });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setProjectConfigOpen(false);
    } catch {
      // Error silently.
    }
  };

  const handleModelSwitch = async (providerId: string, modelName: string) => {
    setModelDropdownOpen(false);
    await setChatModel(providerId, modelName);
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [chatInputValue]);

  // Reveal a freshly loaded thread only after its DOM exists and the bottom is in view.
  useLayoutEffect(() => {
    if (!activeConversationId || loadingMessages || messagesRevealed) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: "instant",
      block: "end",
    });
    prevMessageCountRef.current = messages.length;
    setMessagesRevealed(true);
  }, [activeConversationId, loadingMessages, messages.length, messagesRevealed]);

  // Auto-scroll smoothly only for new messages after the initial reveal.
  useEffect(() => {
    if (!messagesRevealed || loadingMessages) return;
    if (messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [loadingMessages, messages.length, messagesRevealed]);

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

    const optimisticUser: Message = {
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
    const streamingId = `streaming-${Date.now()}`;
    const streamingPlaceholder: Message = {
      id: streamingId,
      conversation_id: activeConversationId,
      provider_id: null,
      role: "assistant",
      content: "",
      model: null,
      token_count: null,
      retrieval_metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser, streamingPlaceholder]);

    try {
      const result = await sendChatStream(
        {
          conversation_id: activeConversationId,
          content: trimmed,
          enable_rag: enableRag,
          project_id: activeProjectId,
        },
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: m.content + token } : m,
            ),
          );
        },
      );

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== optimisticUser.id && m.id !== streamingId)
          .concat([result.user_message, result.assistant_message]),
      );
      setMessageMeta((prev) => {
        const next = new Map(prev);
        next.set(result.assistant_message.id, {
          token_usage: result.token_usage ?? undefined,
          response_delay_ms: result.response_delay_ms ?? undefined,
        });
        return next;
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, updated_at: result.assistant_message.created_at }
            : c,
        ),
      );
    } catch (err) {
      setMessages((prev) => {
        const streaming = prev.find((m) => m.id === streamingId);
        if (streaming && streaming.content) {
          return prev
            .filter((m) => m.id !== optimisticUser.id)
            .map((m) =>
              m.id === streamingId
                ? { ...m, retrieval_metadata: { stream_interrupted: true } }
                : m,
            );
        }
        return prev.filter((m) => m.id !== optimisticUser.id && m.id !== streamingId);
      });
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

        {/* Project info bar */}
        {activeProject && (
          <div className="border-b border-stone-200 px-3 py-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs hover:bg-stone-100"
              onClick={openProjectConfig}
              title="Click to configure project"
            >
              <span
                className="block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: activeProject.color || "#78716c" }}
              />
              <span className="font-medium text-stone-700">{activeProject.name}</span>
              <Icon name="chevronRight" size={10} />
            </button>
          </div>
        )}

        {/* Project config panel */}
        {projectConfigOpen && activeProject && (
          <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-medium uppercase text-stone-500">Name</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pine"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveProjectConfig();
                    if (e.key === "Escape") setProjectConfigOpen(false);
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase text-stone-500">Description</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pine"
                  value={configDescription}
                  onChange={(e) => setConfigDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setProjectConfigOpen(false);
                  }}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase text-stone-500">Color</label>
                <div className="mt-0.5 flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pine"
                    value={configColor}
                    onChange={(e) => setConfigColor(e.target.value)}
                    placeholder="#78716c"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setProjectConfigOpen(false);
                    }}
                  />
                  <span
                    className="block h-5 w-5 shrink-0 rounded-full border border-stone-300"
                    style={{ backgroundColor: configColor || "#78716c" }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setProjectConfigOpen(false);
                    setArchiveProjectTarget(activeProject);
                  }}
                >
                  Archive Project
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs text-stone-600 hover:bg-stone-200"
                    onClick={() => setProjectConfigOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded bg-pine px-3 py-1 text-xs font-medium text-white hover:bg-pine/90 disabled:opacity-50"
                    onClick={() => void handleSaveProjectConfig()}
                    disabled={!configName.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
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

              {loadingMessages && <MessageListSkeleton />}

              {!loadingMessages && messagesRevealed && messages.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-stone-400">
                  Send a message to start the conversation.
                </div>
              )}

              {!loadingMessages && (
                <div
                  className={[
                    "transition-opacity duration-150",
                    messagesRevealed ? "opacity-100" : "pointer-events-none opacity-0",
                  ].join(" ")}
                  aria-hidden={!messagesRevealed}
                >
                  {(() => {
                    const displayConfig = readMessageDisplayConfig();
                    return messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        meta={messageMeta.get(msg.id)}
                        displayConfig={displayConfig}
                        onCopy={(content) => void handleCopy(content)}
                        onEdit={(content) => handleEditMessage(content)}
                        onRetry={() => handleRetry()}
                      />
                    ));
                  })()}

                  {sending && (
                    <div className="mb-2 flex items-center gap-2 text-sm text-stone-400">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-pine/60" />
                      Generating...
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
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
        <div className="mt-1 flex min-w-0 items-center justify-between gap-2 pr-3">
          <div className="flex min-w-0 items-center gap-1 text-xs text-stone-400">
            {/* Project selector */}
            <div className="relative" ref={projectMenuRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-stone-100"
                onClick={() => setProjectMenuOpen((v) => !v)}
              >
                <Icon name={activeProject ? "project" : "folder"} size={12} />
                <span>{activeProject ? activeProject.name : "No Project"}</span>
                <Icon name="chevronDown" size={10} />
              </button>
              {projectMenuOpen && (
                <div className="absolute bottom-full left-0 mb-1 rounded-md border border-stone-300 bg-white shadow-lg z-30 py-1 min-w-[180px] max-h-[220px] overflow-auto">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs text-stone-700 hover:bg-stone-50"
                    onClick={() => { setActiveProjectId(null); setProjectMenuOpen(false); }}
                  >
                    <Icon name="folder" size={12} />
                    No Project
                  </button>
                  {projects.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 px-1">
                      {renamingProjectId === p.id ? (
                        <input
                          type="text"
                          className="flex-1 rounded border border-stone-300 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-pine"
                          value={renameProjectValue}
                          onChange={(e) => setRenameProjectValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleRenameProject(p.id);
                            if (e.key === "Escape") {
                              setRenamingProjectId(null);
                              setRenameProjectValue("");
                            }
                          }}
                          onBlur={() => {
                            setRenamingProjectId(null);
                            setRenameProjectValue("");
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className={[
                            "flex flex-1 items-center gap-2 px-2 py-1 text-left text-xs hover:bg-stone-50 rounded",
                            p.id === activeProjectId ? "text-pine font-medium" : "text-stone-700",
                          ].join(" ")}
                          onClick={() => { setActiveProjectId(p.id); setProjectMenuOpen(false); }}
                        >
                          <span
                            className="block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: p.color || "#78716c" }}
                          />
                          <span className="truncate">{p.name}</span>
                        </button>
                      )}
                      <div className="relative">
                        <button
                          type="button"
                          className="flex h-5 w-5 items-center justify-center rounded text-stone-400 hover:bg-stone-200 hover:text-stone-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectActionTarget(
                              projectActionTarget === p.id ? null : p.id,
                            );
                          }}
                        >
                          <Icon name="ellipsis" size={12} />
                        </button>
                        {projectActionTarget === p.id && (
                          <div className="absolute right-0 top-full z-40 mt-0.5 rounded border border-stone-200 bg-white py-0.5 shadow-lg min-w-[100px]">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-xs text-stone-700 hover:bg-stone-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingProjectId(p.id);
                                setRenameProjectValue(p.name);
                                setProjectActionTarget(null);
                              }}
                            >
                              <Icon name="edit" size={11} />
                              Rename
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-xs text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setArchiveProjectTarget(p);
                                setProjectActionTarget(null);
                              }}
                            >
                              <Icon name="archive" size={11} />
                              Archive
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {showNewProjectInput ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="text"
                        className="flex-1 rounded border border-stone-300 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-pine"
                        placeholder="Project name..."
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleCreateProject();
                          if (e.key === "Escape") {
                            setShowNewProjectInput(false);
                            setNewProjectName("");
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-xs text-pine hover:bg-stone-100"
                        onClick={() => void handleCreateProject()}
                        disabled={!newProjectName.trim()}
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs text-stone-500 hover:bg-stone-50"
                      onClick={() => setShowNewProjectInput(true)}
                    >
                      <Icon name="add" size={12} />
                      New Project
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* RAG toggle */}
            <button
              type="button"
              className={[
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                enableRag
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "text-stone-400 hover:bg-stone-100",
              ].join(" ")}
              onClick={() => setEnableRag((v) => !v)}
              title={enableRag ? "RAG enabled — click to disable" : "RAG disabled — click to enable"}
            >
              <Icon name="knowledge" size={11} />
              RAG
            </button>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Model switcher */}
            {availableModels.length > 0 && (
              <div className="relative shrink-0" ref={modelDropdownRef}>
                <button
                  type="button"
                  className="inline-flex max-w-[120px] items-center gap-1 rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                  onClick={() => setModelDropdownOpen((v) => !v)}
                  disabled={sending || !activeConversationId}
                  title={activeChatModel || "Select model"}
                >
                  <span className="truncate">{activeChatModel || "Model"}</span>
                  <Icon name="chevronDown" size={10} />
                </button>
                {modelDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-1 rounded-md border border-stone-200 bg-white shadow-lg z-30 py-1 min-w-[180px] max-h-[200px] overflow-auto">
                    {availableModels.map((m) => (
                      <button
                        key={`${m.provider_id}:${m.model_name}`}
                        type="button"
                        title={`${m.model_name} (${m.provider_name})`}
                        className={[
                          "block w-full text-left px-3 py-1.5 text-xs hover:bg-stone-100",
                          m.model_name === activeChatModel ? "text-pine font-medium" : "text-stone-700",
                        ].join(" ")}
                        onClick={() => handleModelSwitch(m.provider_id, m.model_name)}
                      >
                        <span className="block truncate">{m.model_name}</span>
                        <span className="block text-[10px] text-stone-400">{m.provider_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="shrink-0 rounded-md bg-pine px-3 py-1 text-xs font-medium text-white hover:bg-pine/90 disabled:opacity-50"
              onClick={() => void handleSend()}
              disabled={!chatInputValue.trim() || sending || !activeConversationId}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
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
                  "group flex min-h-7 cursor-pointer items-center justify-between rounded px-2 py-1 text-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-pine/50",
                  conv.id === activeConversationId
                    ? "bg-pine/10 text-pine"
                    : "text-stone-600 hover:bg-stone-100 focus-visible:bg-stone-100",
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
                    className="min-w-0 flex-1 rounded border border-pine bg-white px-1 py-0 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-pine"
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
                  <span className="min-w-0 flex-1 truncate">{conv.title}</span>
                )}
                <div className="relative ml-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  <button
                    type="button"
                    className={[
                      "inline-flex h-5 w-5 items-center justify-center rounded text-stone-400 opacity-0 transition-opacity hover:bg-stone-200 hover:text-stone-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine/50",
                      menuOpenId === conv.id
                        ? "opacity-100"
                        : "group-hover:opacity-100 group-focus-within:opacity-100",
                    ].join(" ")}
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

      {/* Archive project confirm dialog */}
      <ConfirmDialog
        open={archiveProjectTarget !== null}
        title="Archive Project"
        message={`Archive "${archiveProjectTarget?.name ?? "this project"}"? It will be hidden from the list. This cannot be undone.`}
        confirmLabel="Archive"
        onConfirm={() => void handleArchiveProject()}
        onCancel={() => setArchiveProjectTarget(null)}
      />
    </div>
  );
}

function MessageListSkeleton() {
  const rows = [
    { align: "start", width: "w-4/5", lines: ["w-3/4", "w-full", "w-2/3"] },
    { align: "end", width: "w-3/5", lines: ["w-full", "w-2/3"] },
    { align: "start", width: "w-5/6", lines: ["w-2/3", "w-full", "w-1/2"] },
  ] as const;

  return (
    <div className="space-y-3 py-2" aria-label="Loading messages">
      {rows.map((row, index) => (
        <div
          key={index}
          className={[
            "flex",
            row.align === "end" ? "justify-end" : "justify-start",
          ].join(" ")}
        >
          <div
            className={[
              "rounded-lg border border-stone-200 bg-white px-3 py-2",
              row.width,
            ].join(" ")}
          >
            <div className="space-y-2">
              {row.lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={[
                    "h-2 animate-pulse rounded bg-stone-200",
                    line,
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  meta,
  displayConfig,
  onCopy,
  onEdit,
  onRetry,
}: {
  message: Message;
  meta?: { token_usage?: TokenUsage; response_delay_ms?: number };
  displayConfig: ReturnType<typeof readMessageDisplayConfig>;
  onCopy?: (content: string) => void;
  onEdit?: (content: string) => void;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  const isOptimistic = message.id.startsWith("optimistic-");
  const [showSources, setShowSources] = useState(false);
  const sources = parseMessageSources(message);

  const metaItems: string[] = [];
  if (!isUser && !isOptimistic) {
    if (displayConfig.show_model_name && message.model) {
      metaItems.push(message.model);
    }
    if (displayConfig.show_timestamp) {
      metaItems.push(
        new Date(message.created_at).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }
    if (displayConfig.show_token_count && message.token_count != null) {
      metaItems.push(`${message.token_count} tokens`);
    }
    if (displayConfig.show_response_delay && meta?.response_delay_ms != null) {
      metaItems.push(`${(meta.response_delay_ms / 1000).toFixed(1)}s`);
    }
  }

  return (
    <div className={["mb-3 flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "group/message flex min-w-0 max-w-[85%] flex-col",
          isUser ? "items-end" : "items-start",
        ].join(" ")}
      >
        <div
          className={[
            "max-w-full rounded-lg px-3 py-2 text-sm",
            isUser
              ? "bg-pine text-white"
              : "border border-stone-200 bg-white text-stone-800",
            isOptimistic ? "opacity-70" : "",
          ].join(" ")}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="asteria-chat-markdown prose prose-sm max-w-none">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {message.content}
              </Markdown>
            </div>
          )}

          {metaItems.length > 0 && (
            <p className="mt-1 text-right text-xs opacity-60">{metaItems.join(" · ")}</p>
          )}
          {Boolean(message.retrieval_metadata?.stream_interrupted) && (
            <p className="mt-1 text-right text-xs font-medium text-amber-600">
              Response interrupted
            </p>
          )}
          {!isUser && sources.length > 0 && (
            <div className="mt-1.5 border-t border-stone-100 pt-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700"
                onClick={() => setShowSources((v) => !v)}
              >
                <Icon name={showSources ? "chevronDown" : "chevronRight"} size={10} />
                Sources ({sources.length})
              </button>
              {showSources && (
                <div className="mt-1 space-y-1">
                  {sources.map((source, idx) => (
                    <div
                      key={`${source.knowledge_unit_id}-${idx}`}
                      className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-stone-700">
                          [{source.label}] {source.title}
                        </span>
                        <span className="text-stone-400">
                          {(source.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-stone-500 line-clamp-2">
                        {source.chunk_text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={[
            "mt-1 flex h-6 items-center gap-1 transition-opacity",
            isUser
              ? "opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100"
              : "opacity-100",
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
      </div>
    </div>
  );
}

type SourceDisplay = {
  label: string;
  knowledge_unit_id: string;
  chunk_text: string;
  score: number;
  title: string;
};

function parseMessageSources(message: Message): SourceDisplay[] {
  const rawSources = message.retrieval_metadata?.sources;
  if (!Array.isArray(rawSources)) return [];

  return rawSources.flatMap((source: unknown, index: number) => {
    if (!source || typeof source !== "object") return [];
    const s = source as Record<string, unknown>;
    const src = (s.source as Record<string, unknown>) ?? {};
    const knowledgeUnitId = s.knowledge_unit_id;
    const chunkText = s.chunk_text;
    const score = s.score;
    const title = src.title;
    const label = s.label;

    if (
      typeof knowledgeUnitId !== "string" ||
      typeof chunkText !== "string" ||
      typeof score !== "number" ||
      typeof title !== "string"
    ) {
      return [];
    }

    return [
      {
        label: typeof label === "string" ? label : `S${index + 1}`,
        knowledge_unit_id: knowledgeUnitId,
        chunk_text: chunkText,
        score,
        title,
      },
    ];
  });
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
      className="inline-flex h-6 w-6 items-center justify-center rounded text-stone-500 opacity-75 transition-colors hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine/60"
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
