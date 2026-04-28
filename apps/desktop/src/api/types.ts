export type HealthResponse = {
  status: "ok";
  service: string;
  version: string;
  environment: "development" | "test" | "production";
  database_configured: boolean;
};

export type Provider = {
  id: string;
  name: string;
  provider_type: string;
  base_url: string;
  chat_model: string;
  embedding_model: string;
  embedding_dimension: number;
  timeout_seconds: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  has_api_key: boolean;
  created_at: string;
  updated_at: string;
};

export type ProviderCreateRequest = {
  name: string;
  base_url: string;
  api_key?: string | null;
  chat_model: string;
  embedding_model: string;
  timeout_seconds?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

export type ProviderUpdateRequest = Partial<ProviderCreateRequest>;

export type ProviderHealthResponse = {
  provider_id: string;
  status: "ok" | "error" | string;
  message: string;
  latency_ms: number | null;
};
