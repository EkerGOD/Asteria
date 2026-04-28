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

## Search API

POST /api/search/keyword
POST /api/search/semantic

## RAG API

POST /api/rag/answer
