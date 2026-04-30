# API Contract

## Project API

POST /api/projects
GET /api/projects
GET /api/projects/{id}
PUT /api/projects/{id}
DELETE /api/projects/{id}

## Repository API

POST /api/repositories
GET /api/repositories
GET /api/repositories/current
GET /api/repositories/{id}
PUT /api/repositories/{id}
DELETE /api/repositories/{id}  (unlink registration only)
POST /api/repositories/{id}/select

Repository / Vault registration is owned by the local FastAPI backend and
persisted in PostgreSQL. The desktop UI may use Tauri native file dialog and
filesystem APIs to select or create local folders, but registration state and
the current repository selection must come from this API, not `localStorage`.

`POST /api/repositories` registers an existing readable local folder and sets it
as the current repository. The New Repository UI flow first creates the folder
under the selected parent directory through Tauri, then calls this endpoint with
the created folder path. The Open Local Repository flow calls the same endpoint
with the selected existing folder path.

```json
// POST /api/repositories
{
  "name": "Research",
  "root_path": "D:\\Documents\\Research"
}

// Response
{
  "id": "uuid",
  "name": "Research",
  "root_path": "D:\\Documents\\Research",
  "status": "active",
  "created_at": "2026-04-30T00:00:00Z",
  "updated_at": "2026-04-30T00:00:00Z",
  "unlinked_at": null
}
```

`GET /api/repositories` returns active repositories by default. Pass
`include_unlinked=true` to include unlinked registrations for diagnostics.

`GET /api/repositories/current` returns the selected active repository, or
`null` when none is selected.

`PUT /api/repositories/{id}` updates `name` and/or `root_path`. Updating
`root_path` requires the new path to be a readable local directory.

`DELETE /api/repositories/{id}` unlinks the registration only. It sets
`status = "unlinked"` and `unlinked_at`; it must not delete the folder or any
file on disk.

`POST /api/repositories/{id}/select` sets an active repository as the current
repository and returns it.

Errors:

- 400 if `root_path` is not a readable local directory.
- 404 if the repository does not exist or has already been unlinked for an
  active-only operation.
- 409 if an active repository already uses the same name or root path.

## Conversation API

POST /api/conversations
GET /api/conversations
GET /api/conversations/{id}
DELETE /api/conversations/{id}  (archive)
DELETE /api/conversations/{id}?permanent=true  (hard delete)
PATCH /api/conversations/{id}  (update title, summary, metadata)

Archive sets `archived_at` on the conversation. Hard delete permanently removes the conversation and all associated messages. PATCH supports partial updates — only provided fields are changed.

## Chat API

POST /api/chat/send
POST /api/chat/send/stream

Simple non-RAG chat: saves user message, resolves the configured chat model role,

calls the Provider abstraction,
saves assistant message, returns both.

```json
// Request
{
  "conversation_id": "uuid",
  "content": "Hello, what can you help me with?"
}

// Response
{
  "user_message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "provider_id": null,
    "role": "user",
    "content": "Hello, what can you help me with?",
    "model": null,
    "token_count": null,
    "retrieval_metadata": {},
    "created_at": "2026-04-30T00:00:00Z"
  },
  "assistant_message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "provider_id": "uuid",
    "role": "assistant",
    "content": "Hi! I'm here to help...",
    "model": "chat-model",
    "token_count": 42,
    "retrieval_metadata": {},
    "created_at": "2026-04-30T00:00:00Z"
  },
  "provider_id": "uuid",
  "chat_model": "chat-model",
  "token_usage": {
    "prompt_tokens": 12,
    "completion_tokens": 30,
    "total_tokens": 42
  },
  "response_delay_ms": 1234
}
```

`token_usage` and `response_delay_ms` are nullable — unavailable when the provider does not report usage or when an error occurs mid-response.
No embedding, retrieval, or source references are used.
Requires a configured chat model role. Returns 400 if no chat model is configured.
Returns 404 if conversation not found.

`POST /api/chat/send/stream` accepts the same request body and returns
`text/event-stream`. It emits:

```text
event: user_message
data: {"message": {...persisted user message...}}

event: token
data: {"content": "partial token text"}

event: assistant_message
data: {"message": {...persisted assistant message...}, "provider_id": "uuid", "chat_model": "chat-model", "token_usage": null, "response_delay_ms": 1234}

event: done
data: {"ok": true}
```

On provider interruption after partial output, the endpoint persists the partial
assistant message with `retrieval_metadata.stream_interrupted = true`, then
emits:

```text
event: error
data: {"message": "Provider failed while streaming response.", "partial": true}
```

If no token has been generated, no assistant message is saved and the `error`
event uses `"partial": false`.

## Model Roles API

GET /api/model-roles
PUT /api/model-roles/{role_type}

Model roles decouple task roles from Provider service configuration.
The `chat` role selects one model from the selected Provider's persisted model
list. The `embedding` role is a local model scheme entry and must not select a
remote Provider; actual local embedding execution is deferred.

```json
// PUT /api/model-roles/chat
{
  "provider_id": "uuid",
  "model_name": "gpt-4o"
}

// PUT /api/model-roles/embedding
{
  "provider_id": null,
  "model_name": "bge-m3",
  "embedding_dimension": 1024
}

// Response (GET or PUT)
{
  "id": "uuid",
  "role_type": "chat",
  "provider_id": "uuid or null",
  "model_name": "gpt-4o",
  "embedding_dimension": null,
  "created_at": "2026-04-30T00:00:00Z",
  "updated_at": "2026-04-30T00:00:00Z"
}
```

`role_type` must be `"chat"` or `"embedding"` (returns 400 otherwise).
Returns 404 if the specified provider_id does not exist.
Returns 400 if the chat role model is not listed in the selected Provider's
`models`, or if an embedding role attempts to select a remote Provider.

## Local Models API

GET /api/local-models/status
POST /api/local-models/{model_name}/download

Local models are embedding models hosted on the local filesystem rather than
served by a remote Provider. The model files reside under the configured
`ASTERIA_DATA_DIR/models/embedding/<model_name>/` path, set by the Tauri
sidecar when launching the FastAPI process.

```json
// GET /api/local-models/status → 200
{
  "models": [
    {
      "name": "bge-m3",
      "dimension": 1024,
      "description": "BAAI General Embedding (Multi-language, 1024-dim)",
      "status": "not_downloaded",
      "local_path": null
    }
  ]
}
```

Status values: `"not_downloaded"` | `"downloading"` | `"downloaded"` | `"failed"`.
While a download is active the response includes `progress` (0–100) and may
include `error_message` on failure.

```json
// POST /api/local-models/bge-m3/download → 202
{
  "name": "bge-m3",
  "dimension": 1024,
  "description": "BAAI General Embedding (Multi-language, 1024-dim)",
  "status": "downloading",
  "local_path": null,
  "progress": 0
}
```

The download endpoint returns 202 Accepted on success and starts a background
download from HuggingFace Hub. Returns 400 if `ASTERIA_DATA_DIR` /
`ASTERIA_MODELS_DIR` is not configured. Returns 404 for unknown model names.
The client should poll `GET /api/local-models/status` to track progress.

## Message API

POST /api/conversations/{id}/messages
GET /api/conversations/{id}/messages

## Knowledge API

POST /api/knowledge-units
GET /api/knowledge-units
GET /api/knowledge-units/{id}
PUT /api/knowledge-units/{id}
DELETE /api/knowledge-units/{id}
POST /api/knowledge-units/{id}/embeddings/refresh

Embedding refresh responses return a summary and never expose embedding vectors:

```json
{
  "knowledge_unit_id": "uuid",
  "provider_id": "uuid",
  "embedding_model": "text-embedding-model",
  "embedding_dimension": 1536,
  "chunk_count": 1,
  "created_count": 1,
  "reused_count": 0,
  "deleted_count": 0
}
```

## Provider API

POST /api/providers
GET /api/providers
GET /api/providers/{id}
PUT /api/providers/{id}
DELETE /api/providers/{id}
POST /api/providers/{id}/health-check

Provider responses expose `has_api_key` and must not expose raw `api_key` or `api_key_ciphertext`.

Create/update requests use `models` for Provider model names. Legacy
`chat_model` and `embedding_model` fields are accepted for compatibility but
should not be shown as task-role fields in the Provider UI.

```json
// POST /api/providers
{
  "name": "DeepSeek",
  "base_url": "https://api.deepseek.example/v1",
  "api_key": "sk-...",
  "models": ["deepseek-v4-pro", "deepseek-v4-flash"],
  "timeout_seconds": 60
}

// Response
{
  "id": "uuid",
  "name": "DeepSeek",
  "provider_type": "openai_compatible",
  "base_url": "https://api.deepseek.example/v1",
  "chat_model": "deepseek-v4-pro",
  "embedding_model": "deepseek-v4-pro",
  "embedding_dimension": 1536,
  "models": [
    {
      "id": "uuid",
      "provider_id": "uuid",
      "name": "deepseek-v4-pro",
      "sort_order": 0,
      "created_at": "2026-04-30T00:00:00Z",
      "updated_at": "2026-04-30T00:00:00Z"
    },
    {
      "id": "uuid",
      "provider_id": "uuid",
      "name": "deepseek-v4-flash",
      "sort_order": 1,
      "created_at": "2026-04-30T00:00:00Z",
      "updated_at": "2026-04-30T00:00:00Z"
    }
  ],
  "timeout_seconds": 60,
  "metadata": {},
  "has_api_key": true,
  "created_at": "2026-04-30T00:00:00Z",
  "updated_at": "2026-04-30T00:00:00Z"
}
```

Health check responses return:

```json
{
  "provider_id": "uuid",
  "status": "ok | error",
  "message": "Provider is reachable.",
  "latency_ms": 123
}
```

```

## Search API

POST /api/search/keyword
POST /api/search/semantic

Semantic search requests generate a query embedding through the first configured provider, apply optional filters, and return ranked chunks without exposing raw vectors:

```json
{
  "query": "What did I write about pgvector?",
  "project_id": null,
  "tag_slugs": ["database"],
  "top_k": 5,
  "min_score": 0.0
}
```

Semantic search responses return provider/model metadata and source references:

```json
{
  "provider_id": "uuid",
  "embedding_model": "text-embedding-model",
  "embedding_dimension": 1536,
  "results": [
    {
      "embedding_id": "uuid",
      "knowledge_unit_id": "uuid",
      "chunk_index": 0,
      "chunk_text": "Relevant chunk text.",
      "score": 0.87,
      "source": {
        "id": "uuid",
        "project_id": null,
        "title": "Knowledge title",
        "source_type": "manual",
        "source_uri": null,
        "status": "active",
        "metadata": {},
        "created_at": "2026-04-28T00:00:00Z",
        "updated_at": "2026-04-28T00:00:00Z",
        "archived_at": null,
        "tags": []
      }
    }
  ]
}
```

## RAG API

POST /api/rag/answer

RAG answer requests save the user message, retrieve relevant chunks through the
configured provider, and generate an assistant message. If `project_id` is omitted,
retrieval inherits the conversation project. If `project_id` is explicitly
`null`, retrieval searches across all projects.

```json
{
  "conversation_id": "uuid",
  "content": "What did I write about pgvector?",
  "project_id": null,
  "tag_slugs": ["database"],
  "top_k": 5,
  "min_score": 0.0
}
```

RAG answer responses return the persisted user and assistant messages plus the
source references used for grounding:

```json
{
  "user_message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "provider_id": null,
    "role": "user",
    "content": "What did I write about pgvector?",
    "model": null,
    "token_count": null,
    "retrieval_metadata": {},
    "created_at": "2026-04-28T00:00:00Z"
  },
  "assistant_message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "provider_id": "uuid",
    "role": "assistant",
    "content": "Grounded answer text.",
    "model": "chat-model",
    "token_count": 123,
    "retrieval_metadata": {
      "sources": []
    },
    "created_at": "2026-04-28T00:00:00Z"
  },
  "sources": [],
  "provider_id": "uuid",
  "chat_model": "chat-model",
  "embedding_model": "text-embedding-model",
  "embedding_dimension": 1536
}
```

Provider failures return standardized API errors and do not expose raw
Provider-specific payloads. The saved user message is preserved when retrieval
or answer generation fails; no assistant message is saved for failed attempts.
