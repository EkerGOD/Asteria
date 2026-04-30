export type HealthResponse = {
  status: "ok";
  service: string;
  version: string;
  environment: "development" | "test" | "production";
  database_configured: boolean;
};

export type ProviderModel = {
  id: string;
  provider_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Provider = {
  id: string;
  name: string;
  provider_type: string;
  base_url: string;
  chat_model: string;
  embedding_model: string;
  embedding_dimension: number;
  models: ProviderModel[];
  timeout_seconds: number;
  metadata: Record<string, unknown>;
  has_api_key: boolean;
  created_at: string;
  updated_at: string;
};

export type ProviderCreateRequest = {
  name: string;
  base_url: string;
  api_key?: string | null;
  models: string[];
  chat_model?: string | null;
  embedding_model?: string | null;
  timeout_seconds?: number;
  metadata?: Record<string, unknown>;
};

export type ProviderUpdateRequest = Partial<ProviderCreateRequest>;

export type ProviderHealthResponse = {
  provider_id: string;
  status: "ok" | "error" | string;
  message: string;
  latency_ms: number | null;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ProjectCreateRequest = {
  name: string;
  description?: string | null;
  color?: string | null;
  sort_order?: number;
};

export type ProjectUpdateRequest = Partial<ProjectCreateRequest>;

export type Repository = {
  id: string;
  name: string;
  root_path: string;
  status: "active" | "unlinked";
  created_at: string;
  updated_at: string;
  unlinked_at: string | null;
};

export type RepositoryCreateRequest = {
  name: string;
  root_path: string;
};

export type RepositoryUpdateRequest = Partial<RepositoryCreateRequest>;

export type Tag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  created_at: string;
};

export type TagCreateRequest = {
  name: string;
  color?: string | null;
};

export type KnowledgeUnit = {
  id: string;
  project_id: string | null;
  title: string;
  content: string;
  source_type: "manual" | "import" | "chat" | "excerpt" | string;
  source_uri: string | null;
  status: "active" | "archived" | string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  tags: Tag[];
};

export type KnowledgeUnitCreateRequest = {
  project_id?: string | null;
  title: string;
  content: string;
  source_type?: "manual" | "import" | "chat" | "excerpt";
  source_uri?: string | null;
  status?: "active" | "archived";
  metadata?: Record<string, unknown>;
};

export type KnowledgeUnitUpdateRequest = Partial<KnowledgeUnitCreateRequest>;

export type KnowledgeEmbeddingRefreshResponse = {
  knowledge_unit_id: string;
  provider_id: string;
  embedding_model: string;
  embedding_dimension: number;
  chunk_count: number;
  created_count: number;
  reused_count: number;
  deleted_count: number;
};

export type Conversation = {
  id: string;
  project_id: string | null;
  title: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ConversationCreateRequest = {
  project_id?: string | null;
  title: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type ConversationUpdateRequest = {
  title?: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type Message = {
  id: string;
  conversation_id: string;
  provider_id: string | null;
  role: "system" | "user" | "assistant" | "tool" | string;
  content: string;
  model: string | null;
  token_count: number | null;
  retrieval_metadata: Record<string, unknown>;
  created_at: string;
};

export type MessageCreateRequest = {
  role?: "user";
  content: string;
};

export type SemanticSearchSource = {
  id: string;
  project_id: string | null;
  title: string;
  source_type: string;
  source_uri: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  tags: Tag[];
};

export type SemanticSearchResult = {
  embedding_id: string;
  knowledge_unit_id: string;
  chunk_index: number;
  chunk_text: string;
  score: number;
  source: SemanticSearchSource;
};

export type RAGAnswerRequest = {
  conversation_id: string;
  content: string;
  project_id?: string | null;
  tag_slugs?: string[];
  top_k?: number;
  min_score?: number;
};

export type RAGAnswerResponse = {
  user_message: Message;
  assistant_message: Message;
  sources: SemanticSearchResult[];
  provider_id: string;
  chat_model: string;
  embedding_model: string;
  embedding_dimension: number;
};

export type TokenUsage = {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
};

export type ChatSendRequest = {
  conversation_id: string;
  content: string;
};

export type ChatSendResponse = {
  user_message: Message;
  assistant_message: Message;
  provider_id: string;
  chat_model: string;
  token_usage: TokenUsage | null;
  response_delay_ms: number | null;
};

export type ModelRole = {
  id: string;
  role_type: string;
  provider_id: string | null;
  model_name: string;
  embedding_dimension: number | null;
  created_at: string;
  updated_at: string;
};

export type ModelRoleUpsertRequest = {
  provider_id: string | null;
  model_name: string;
  embedding_dimension?: number | null;
};

export type LocalModelStatus =
  | "not_downloaded"
  | "downloading"
  | "downloaded"
  | "failed";

export type LocalModelItem = {
  name: string;
  dimension: number;
  description: string;
  status: LocalModelStatus;
  local_path: string | null;
  progress?: number | null;
  error_message?: string | null;
};

export type LocalModelsResponse = {
  models: LocalModelItem[];
};
