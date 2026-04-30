import { API_BASE_URL } from "./config";
import type {
  ChatSendRequest,
  ChatSendResponse,
  Conversation,
  TokenUsage,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  HealthResponse,
  KnowledgeEmbeddingRefreshResponse,
  KnowledgeUnit,
  KnowledgeUnitCreateRequest,
  KnowledgeUnitUpdateRequest,
  Message,
  MessageCreateRequest,
  ModelRole,
  ModelRoleUpsertRequest,
  Provider,
  ProviderCreateRequest,
  ProviderHealthResponse,
  ProviderUpdateRequest,
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  RAGAnswerRequest,
  RAGAnswerResponse,
  Tag,
  TagCreateRequest,
} from "./types";

export class ApiClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function buildQueryString(params: Record<string, string | number | boolean | string[] | null | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          searchParams.append(key, item);
        }
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function readErrorDetail(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "object" && item !== null && "msg" in item) {
            const message = (item as { msg: unknown }).msg;
            return typeof message === "string" ? message : null;
          }

          return null;
        })
        .filter((message): message is string => Boolean(message))
        .join(" ");
    }
  }

  return null;
}

function requestJsonBody<TResponse>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  init?: RequestInit
): Promise<TResponse> {
  const nextInit: RequestInit = {
    ...init,
    method,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  };

  if (body !== undefined) {
    nextInit.body = JSON.stringify(body);
  }

  return requestJson<TResponse>(path, {
    ...nextInit
  });
}

async function requestJson<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers
      }
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiClientError(`Unable to reach local API at ${API_BASE_URL}.`);
  }

  if (!response.ok) {
    let detail: string | null = null;

    try {
      detail = readErrorDetail(await response.json());
    } catch {
      detail = null;
    }

    const statusText = response.statusText || "error";
    const message = `Local API returned ${response.status} ${statusText}.`;
    throw new ApiClientError(detail ? `${message} ${detail}` : message, response.status);
  }

  try {
    return (await response.json()) as TResponse;
  } catch {
    throw new ApiClientError("Local API returned an invalid JSON response.");
  }
}

export function getHealth(init?: RequestInit): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health", init);
}

export function listProviders(init?: RequestInit): Promise<Provider[]> {
  return requestJson<Provider[]>("/api/providers", init);
}

export function createProvider(payload: ProviderCreateRequest, init?: RequestInit): Promise<Provider> {
  return requestJsonBody<Provider>("/api/providers", "POST", payload, init);
}

export function updateProvider(
  providerId: string,
  payload: ProviderUpdateRequest,
  init?: RequestInit
): Promise<Provider> {
  return requestJsonBody<Provider>(`/api/providers/${providerId}`, "PUT", payload, init);
}

export function deleteProvider(providerId: string, init?: RequestInit): Promise<Provider> {
  return requestJsonBody<Provider>(`/api/providers/${providerId}`, "DELETE", undefined, init);
}

export function checkProviderHealth(providerId: string, init?: RequestInit): Promise<ProviderHealthResponse> {
  return requestJsonBody<ProviderHealthResponse>(
    `/api/providers/${providerId}/health-check`,
    "POST",
    undefined,
    init
  );
}

export function listProjects(init?: RequestInit): Promise<Project[]> {
  return requestJson<Project[]>("/api/projects", init);
}

export function createProject(payload: ProjectCreateRequest, init?: RequestInit): Promise<Project> {
  return requestJsonBody<Project>("/api/projects", "POST", payload, init);
}

export function updateProject(
  projectId: string,
  payload: ProjectUpdateRequest,
  init?: RequestInit
): Promise<Project> {
  return requestJsonBody<Project>(`/api/projects/${projectId}`, "PUT", payload, init);
}

export function archiveProject(projectId: string, init?: RequestInit): Promise<Project> {
  return requestJsonBody<Project>(`/api/projects/${projectId}`, "DELETE", undefined, init);
}

export function listTags(init?: RequestInit): Promise<Tag[]> {
  return requestJson<Tag[]>("/api/tags", init);
}

export function createTag(payload: TagCreateRequest, init?: RequestInit): Promise<Tag> {
  return requestJsonBody<Tag>("/api/tags", "POST", payload, init);
}

export function listKnowledgeUnits(
  params: {
    project_id?: string | null;
    tag_slugs?: string[];
    include_archived?: boolean;
  } = {},
  init?: RequestInit
): Promise<KnowledgeUnit[]> {
  return requestJson<KnowledgeUnit[]>(
    `/api/knowledge-units${buildQueryString({
      project_id: params.project_id,
      tag_slugs: params.tag_slugs,
      include_archived: params.include_archived
    })}`,
    init
  );
}

export function createKnowledgeUnit(
  payload: KnowledgeUnitCreateRequest,
  init?: RequestInit
): Promise<KnowledgeUnit> {
  return requestJsonBody<KnowledgeUnit>("/api/knowledge-units", "POST", payload, init);
}

export function updateKnowledgeUnit(
  knowledgeId: string,
  payload: KnowledgeUnitUpdateRequest,
  init?: RequestInit
): Promise<KnowledgeUnit> {
  return requestJsonBody<KnowledgeUnit>(`/api/knowledge-units/${knowledgeId}`, "PUT", payload, init);
}

export function archiveKnowledgeUnit(knowledgeId: string, init?: RequestInit): Promise<KnowledgeUnit> {
  return requestJsonBody<KnowledgeUnit>(`/api/knowledge-units/${knowledgeId}`, "DELETE", undefined, init);
}

export function refreshKnowledgeEmbeddings(
  knowledgeId: string,
  init?: RequestInit
): Promise<KnowledgeEmbeddingRefreshResponse> {
  return requestJsonBody<KnowledgeEmbeddingRefreshResponse>(
    `/api/knowledge-units/${knowledgeId}/embeddings/refresh`,
    "POST",
    undefined,
    init
  );
}

export function attachKnowledgeTag(
  knowledgeId: string,
  tagId: string,
  init?: RequestInit
): Promise<KnowledgeUnit> {
  return requestJsonBody<KnowledgeUnit>(`/api/knowledge-units/${knowledgeId}/tags`, "POST", { tag_id: tagId }, init);
}

export function detachKnowledgeTag(
  knowledgeId: string,
  tagId: string,
  init?: RequestInit
): Promise<KnowledgeUnit> {
  return requestJsonBody<KnowledgeUnit>(`/api/knowledge-units/${knowledgeId}/tags/${tagId}`, "DELETE", undefined, init);
}

export function listConversations(
  params: {
    project_id?: string | null;
    include_archived?: boolean;
  } = {},
  init?: RequestInit
): Promise<Conversation[]> {
  return requestJson<Conversation[]>(
    `/api/conversations${buildQueryString({
      project_id: params.project_id,
      include_archived: params.include_archived
    })}`,
    init
  );
}

export function createConversation(
  payload: ConversationCreateRequest,
  init?: RequestInit
): Promise<Conversation> {
  return requestJsonBody<Conversation>("/api/conversations", "POST", payload, init);
}

export function updateConversation(
  conversationId: string,
  payload: ConversationUpdateRequest,
  init?: RequestInit
): Promise<Conversation> {
  return requestJsonBody<Conversation>(`/api/conversations/${conversationId}`, "PATCH", payload, init);
}

export function getConversation(conversationId: string, init?: RequestInit): Promise<Conversation> {
  return requestJson<Conversation>(`/api/conversations/${conversationId}`, init);
}

export function archiveConversation(conversationId: string, init?: RequestInit): Promise<Conversation> {
  return requestJsonBody<Conversation>(`/api/conversations/${conversationId}`, "DELETE", undefined, init);
}

export async function deleteConversation(conversationId: string, init?: RequestInit): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/conversations/${conversationId}?permanent=true`), {
    method: "DELETE",
    headers: { Accept: "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    let detail: string | null = null;
    try { detail = readErrorDetail(await response.json()); } catch { /* no-op */ }
    const message = `Local API returned ${response.status} ${response.statusText || "error"}.`;
    throw new ApiClientError(detail ? `${message} ${detail}` : message, response.status);
  }
}

export function listMessages(conversationId: string, init?: RequestInit): Promise<Message[]> {
  return requestJson<Message[]>(`/api/conversations/${conversationId}/messages`, init);
}

export function appendMessage(
  conversationId: string,
  payload: MessageCreateRequest,
  init?: RequestInit
): Promise<Message> {
  return requestJsonBody<Message>(`/api/conversations/${conversationId}/messages`, "POST", payload, init);
}

export function answerRag(payload: RAGAnswerRequest, init?: RequestInit): Promise<RAGAnswerResponse> {
  return requestJsonBody<RAGAnswerResponse>("/api/rag/answer", "POST", payload, init);
}

export function sendChat(payload: ChatSendRequest, init?: RequestInit): Promise<ChatSendResponse> {
  return requestJsonBody<ChatSendResponse>("/api/chat/send", "POST", payload, init);
}

export async function sendChatStream(
  payload: ChatSendRequest,
  onToken: (content: string) => void,
  init?: RequestInit,
): Promise<ChatSendResponse> {
  const response = await fetch(buildApiUrl("/api/chat/send/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...init?.headers,
    },
    body: JSON.stringify(payload),
    signal: init?.signal,
  });

  if (!response.ok) {
    let detail: string | null = null;
    try {
      detail = readErrorDetail(await response.json());
    } catch {
      detail = null;
    }
    const statusText = response.statusText || "error";
    const message = `Local API returned ${response.status} ${statusText}.`;
    throw new ApiClientError(detail ? `${message} ${detail}` : message, response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ApiClientError("Streaming is not supported by the browser.");
  }

  const signal = init?.signal;
  if (signal?.aborted) {
    reader.cancel();
    throw new DOMException("Aborted", "AbortError");
  }

  const onAbort = () => {
    reader.cancel();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  const decoder = new TextDecoder();
  let buffer = "";
  let eventType = "";
  let dataBuffer = "";

  let userMessage: Message | null = null;
  let assistantMessage: Message | null = null;
  let providerId = "";
  let chatModel = "";
  let tokenUsage: TokenUsage | null = null;
  let responseDelayMs: number | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (line.startsWith("event: ")) {
          eventType = line.slice("event: ".length);
          continue;
        }

        if (line.startsWith("data: ")) {
          dataBuffer = line.slice("data: ".length);
          continue;
        }

        if (line === "" && dataBuffer) {
          try {
            const parsed = JSON.parse(dataBuffer) as Record<string, unknown>;

            switch (eventType) {
              case "user_message":
                userMessage = parsed.message as Message;
                break;
              case "token":
                onToken(String(parsed.content ?? ""));
                break;
              case "assistant_message":
                assistantMessage = parsed.message as Message;
                providerId = String(parsed.provider_id ?? "");
                chatModel = String(parsed.chat_model ?? "");
                tokenUsage = (parsed.token_usage as TokenUsage) ?? null;
                responseDelayMs = (parsed.response_delay_ms as number) ?? null;
                break;
              case "error":
                if (assistantMessage) {
                  // Partial content was saved; return it despite the error.
                  return {
                    user_message: userMessage!,
                    assistant_message: assistantMessage,
                    provider_id: providerId,
                    chat_model: chatModel,
                    token_usage: tokenUsage,
                    response_delay_ms: responseDelayMs,
                  };
                }
                throw new ApiClientError(String(parsed.message ?? "Stream error"));
              default:
                break;
            }
          } catch (error) {
            if (error instanceof ApiClientError) throw error;
            // Malformed SSE frame; skip it.
          }

          eventType = "";
          dataBuffer = "";
        }
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }

  if (!userMessage || !assistantMessage) {
    throw new ApiClientError("Stream ended without a complete response.");
  }

  return {
    user_message: userMessage,
    assistant_message: assistantMessage,
    provider_id: providerId,
    chat_model: chatModel,
    token_usage: tokenUsage,
    response_delay_ms: responseDelayMs,
  };
}

export function listModelRoles(init?: RequestInit): Promise<ModelRole[]> {
  return requestJson<ModelRole[]>("/api/model-roles", init);
}

export function upsertModelRole(
  roleType: string,
  payload: ModelRoleUpsertRequest,
  init?: RequestInit,
): Promise<ModelRole> {
  return requestJsonBody<ModelRole>(`/api/model-roles/${roleType}`, "PUT", payload, init);
}
