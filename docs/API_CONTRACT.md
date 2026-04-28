# API Contract

## Project API

POST /api/projects
GET /api/projects
GET /api/projects/{id}
PUT /api/projects/{id}
DELETE /api/projects/{id}

## Conversation API

POST /api/conversations
GET /api/conversations
GET /api/conversations/{id}

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
POST /api/providers/{id}/activate
POST /api/providers/{id}/health-check

Provider responses expose `has_api_key` and must not expose raw `api_key` or `api_key_ciphertext`.

Health check responses return:

```json
{
  "provider_id": "uuid",
  "status": "ok | error",
  "message": "Provider is reachable.",
  "latency_ms": 123
}
```

Only one provider can be active at a time. Activating one provider deactivates any previously active provider.

## Search API

POST /api/search/keyword
POST /api/search/semantic

Semantic search requests generate a query embedding through the active provider, apply optional filters, and return ranked chunks without exposing raw vectors:

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
active provider, and generate an assistant message. If `project_id` is omitted,
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
