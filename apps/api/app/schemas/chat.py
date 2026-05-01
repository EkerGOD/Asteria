from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.message import MessageResponse
from app.schemas.search import SemanticSearchResultResponse


class ChatSendRequest(BaseModel):
    conversation_id: UUID
    content: str = Field(min_length=1)
    enable_rag: bool = False
    project_id: UUID | None = None
    tag_slugs: list[str] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.0, ge=-1.0, le=1.0)


class TokenUsageSchema(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class ChatSendResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    provider_id: UUID
    chat_model: str
    token_usage: TokenUsageSchema | None = None
    response_delay_ms: int | None = None
    sources: list[SemanticSearchResultResponse] | None = None
    embedding_model: str | None = None
    embedding_dimension: int | None = None
