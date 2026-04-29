import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  answerRag,
  archiveConversation,
  createConversation,
  listConversations,
  listMessages,
  listProjects
} from "../api/client";
import type { Conversation, Message, Project, RAGAnswerResponse, SemanticSearchResult } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorBox, SelectField, TextField } from "../components/FormFields";
import { inputClassName } from "../lib/style";
import { Metric, Panel } from "../components/Panel";
import { isAbortError, toErrorMessage, type LoadStatus } from "../lib/errors";

type ConversationFormState = {
  title: string;
  project_id: string;
};

type SourceDisplay = {
  label: string;
  knowledge_unit_id: string;
  chunk_text: string;
  score: number;
  title: string;
};

function emptyConversationForm(): ConversationFormState {
  return {
    title: "",
    project_id: ""
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMessageSources(message: Message): SourceDisplay[] {
  const rawSources = message.retrieval_metadata.sources;
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources.flatMap((source, index) => {
    if (!isRecord(source) || !isRecord(source.source)) {
      return [];
    }

    const knowledgeUnitId = source.knowledge_unit_id;
    const chunkText = source.chunk_text;
    const score = source.score;
    const title = source.source.title;
    const label = source.label;

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
        title
      }
    ];
  });
}

function parseRagSources(sources: SemanticSearchResult[]): SourceDisplay[] {
  return sources.map((source, index) => ({
    label: `S${index + 1}`,
    knowledge_unit_id: source.knowledge_unit_id,
    chunk_text: source.chunk_text,
    score: source.score,
    title: source.source.title
  }));
}

function projectName(projects: Project[], projectId: string | null): string {
  if (!projectId) {
    return "No project";
  }

  return projects.find((project) => project.id === projectId)?.name ?? "Unknown project";
}

export function ChatPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [messageStatus, setMessageStatus] = useState<LoadStatus>("success");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationForm, setConversationForm] = useState<ConversationFormState>(() => emptyConversationForm());
  const [composer, setComposer] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [latestRag, setLatestRag] = useState<RAGAnswerResponse | null>(null);
  const [archivingConversation, setArchivingConversation] = useState(false);
  const [conversationToArchive, setConversationToArchive] = useState<Conversation | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const contextSources = useMemo<SourceDisplay[]>(() => {
    if (latestRag && latestRag.sources.length > 0) {
      return parseRagSources(latestRag.sources);
    }

    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!latestAssistant) {
      return [];
    }

    return parseMessageSources(latestAssistant);
  }, [messages, latestRag]);

  const contextMetadata = useMemo(() => {
    if (latestRag) {
      return {
        provider: latestRag.chat_model,
        embedding: latestRag.embedding_model,
        sources: latestRag.sources.length
      };
    }

    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!latestAssistant) {
      return {
        provider: "Unset",
        embedding: "Unset",
        sources: 0
      };
    }

    return {
      provider: latestAssistant.model ?? "Unknown",
      embedding:
        typeof latestAssistant.retrieval_metadata.embedding_model === "string"
          ? latestAssistant.retrieval_metadata.embedding_model
          : "Unknown",
      sources: parseMessageSources(latestAssistant).length
    };
  }, [messages, latestRag]);

  const loadMessageThread = useCallback(async (conversationId: string, signal?: AbortSignal) => {
    setMessageStatus("loading");
    setMessageError(null);

    try {
      const loadedMessages = await listMessages(conversationId, { signal });
      setMessages(loadedMessages);
      setLatestRag(null);
      setMessageStatus("success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setMessageStatus("error");
      setMessageError(toErrorMessage(error));
    }
  }, []);

  const loadConversationList = useCallback(
    async (preferredConversationId?: string | null, signal?: AbortSignal) => {
      setLoadStatus("loading");
      setLoadError(null);

      try {
        const [loadedProjects, loadedConversations] = await Promise.all([
          listProjects({ signal }),
          listConversations({}, { signal })
        ]);
        const nextConversationId =
          preferredConversationId && loadedConversations.some((conversation) => conversation.id === preferredConversationId)
            ? preferredConversationId
            : loadedConversations[0]?.id ?? null;

        setProjects(loadedProjects);
        setConversations(loadedConversations);
        setSelectedConversationId(nextConversationId);
        setLoadStatus("success");

        if (nextConversationId) {
          await loadMessageThread(nextConversationId, signal);
        } else {
          setMessages([]);
          setLatestRag(null);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        setLoadStatus("error");
        setLoadError(toErrorMessage(error));
      }
    },
    [loadMessageThread]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadConversationList(null, controller.signal);

    return () => controller.abort();
  }, [loadConversationList]);

  async function selectConversation(conversation: Conversation) {
    setSelectedConversationId(conversation.id);
    setActionError(null);
    setActionMessage(null);
    await loadMessageThread(conversation.id);
  }

  async function createNewConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = conversationForm.title.trim();
    if (!title) {
      setActionError("Conversation title is required.");
      return;
    }

    setCreatingConversation(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const conversation = await createConversation({
        title,
        project_id: conversationForm.project_id || null
      });
      setConversationForm(emptyConversationForm());
      setActionMessage("Conversation created.");
      await loadConversationList(conversation.id);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setCreatingConversation(false);
    }
  }

  async function sendQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation) {
      setActionError("Create or select a conversation first.");
      return;
    }

    const content = composer.trim();
    if (!content) {
      setActionError("Message content is required.");
      return;
    }

    setSending(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await answerRag({
        conversation_id: selectedConversation.id,
        content
      });
      setMessages((current) => [...current, response.user_message, response.assistant_message]);
      setLatestRag(response);
      setComposer("");
      setActionMessage("RAG answer generated.");
      void loadConversationList(selectedConversation.id);
    } catch (error) {
      setActionError(toErrorMessage(error));
      if (selectedConversationId) {
        void loadMessageThread(selectedConversationId);
      }
    } finally {
      setSending(false);
    }
  }

  async function archiveConversationAndReload() {
    if (!conversationToArchive) {
      return;
    }

    setArchivingConversation(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await archiveConversation(conversationToArchive.id);
      setActionMessage("Conversation archived.");
      await loadConversationList(null);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setArchivingConversation(false);
      setConversationToArchive(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <Panel title="Conversations">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void loadConversationList(selectedConversationId)}
              disabled={loadStatus === "loading"}
            >
              {loadStatus === "loading" ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadStatus === "error" && loadError ? <ErrorBox message={loadError} /> : null}

          {loadStatus === "success" && conversations.length === 0 ? (
            <EmptyState title="No conversations yet." detail="Create a conversation to start asking questions." />
          ) : null}

          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={[
                  "rounded-lg border bg-white transition",
                  conversation.id === selectedConversationId ? "border-pine shadow-sm" : "border-stone-200"
                ].join(" ")}
              >
                <button
                  type="button"
                  className="w-full p-3 text-left"
                  onClick={() => void selectConversation(conversation)}
                >
                  <p className="truncate text-sm font-semibold">{conversation.title}</p>
                  <p className="mt-1 text-xs text-stone-600">{projectName(projects, conversation.project_id)}</p>
                </button>
                <div className="border-t border-stone-100 px-3 py-1.5">
                  <button
                    type="button"
                    className="text-xs font-medium text-stone-400 transition hover:text-red-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConversationToArchive(conversation);
                    }}
                    disabled={archivingConversation}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="New Conversation">
          <form className="space-y-3" onSubmit={createNewConversation}>
            <TextField
              id="conversation-title"
              label="Title"
              value={conversationForm.title}
              required
              onChange={(value) =>
                setConversationForm((current) => ({
                  ...current,
                  title: value
                }))
              }
            />
            <SelectField
              id="conversation-project"
              label="Project"
              value={conversationForm.project_id}
              onChange={(value) =>
                setConversationForm((current) => ({
                  ...current,
                  project_id: value
                }))
              }
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </SelectField>
            <button
              type="submit"
              className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={creatingConversation}
            >
              {creatingConversation ? "Creating..." : "Create Conversation"}
            </button>
          </form>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Message Thread">
          {selectedConversation ? (
            <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-semibold">{selectedConversation.title}</p>
              <p className="mt-1 text-xs text-stone-600">{projectName(projects, selectedConversation.project_id)}</p>
            </div>
          ) : null}

          {messageStatus === "error" && messageError ? <ErrorBox message={messageError} /> : null}

          {messageStatus === "loading" ? (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-6 text-sm text-stone-600">
              Loading messages...
            </div>
          ) : null}

          {messageStatus === "success" && messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-600">
              {selectedConversation ? "No messages yet." : "Select or create a conversation."}
            </div>
          ) : null}

          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        </Panel>

        <Panel title="Composer">
          <form className="space-y-4" onSubmit={sendQuestion}>
            <textarea
              className={`${inputClassName()} min-h-28 resize-y`}
              value={composer}
              placeholder="Ask a question grounded in your knowledge base."
              onChange={(event) => setComposer(event.target.value)}
              disabled={!selectedConversation || sending}
            />
            {!selectedConversation ? (
              <p className="text-xs text-stone-500">Select or create a conversation to send a message.</p>
            ) : null}

            {actionError ? <ErrorBox message={actionError} /> : null}
            {actionMessage ? (
              <div className="rounded-lg border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
                {actionMessage}
              </div>
            ) : null}

            <button
              type="submit"
              className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedConversation || sending}
            >
              {sending ? "Sending..." : "Send RAG Question"}
            </button>
          </form>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Context">
          <div className="grid gap-3">
            <Metric label="Chat model" value={contextMetadata.provider} />
            <Metric label="Embedding model" value={contextMetadata.embedding} />
            <Metric label="Retrieved chunks" value={String(contextMetadata.sources)} />
          </div>
        </Panel>

        <Panel title="Source References">
          {contextSources.length > 0 ? (
            <div className="space-y-3">
              {contextSources.map((source, index) => (
                <SourceReferenceCard key={`${source.knowledge_unit_id}-${index}`} source={source} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={selectedConversation ? "No source references for the latest answer." : "Select a conversation to view sources."}
              detail="Source references will appear here when the assistant answer is grounded in your knowledge base."
            />
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={conversationToArchive !== null}
        title="Archive Conversation"
        message={`Archive "${conversationToArchive?.title ?? "this conversation"}"? It will be hidden from the active conversation list.`}
        confirmLabel="Archive Conversation"
        onConfirm={() => void archiveConversationAndReload()}
        onCancel={() => setConversationToArchive(null)}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const roleClass =
    message.role === "assistant"
      ? "border-pine/20 bg-pine/10"
      : message.role === "user"
        ? "border-denim/20 bg-denim/10"
        : "border-stone-200 bg-white";

  const sourceCount = parseMessageSources(message).length;

  return (
    <article className={`rounded-lg border p-4 ${roleClass}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase text-stone-600">{message.role}</p>
          {message.role === "assistant" && sourceCount > 0 ? (
            <span className="rounded-full bg-pine/15 px-2 py-0.5 text-xs font-semibold text-pine">
              {sourceCount} {sourceCount === 1 ? "source" : "sources"}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-stone-500">{new Date(message.created_at).toLocaleString()}</p>
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{message.content}</p>
    </article>
  );
}

function SourceReferenceCard({ source }: { source: SourceDisplay }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          [{source.label}] {source.title}
        </p>
        <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
          {source.score.toFixed(3)}
        </span>
      </div>
      <p className="mt-2 break-all text-xs text-stone-500">{source.knowledge_unit_id}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">{source.chunk_text}</p>
    </div>
  );
}

