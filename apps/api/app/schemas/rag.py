from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.message import MessageResponse
from app.schemas.search import SemanticSearchResultResponse


class RAGAnswerRequest(BaseModel):
    conversation_id: UUID
    content: str = Field(min_length=1)
    project_id: UUID | None = None
    tag_slugs: list[str] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.0, ge=-1.0, le=1.0)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message content cannot be blank.")
        return stripped

    @field_validator("tag_slugs")
    @classmethod
    def normalize_tag_slugs(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for slug in value:
            cleaned = slug.strip().lower()
            if not cleaned:
                raise ValueError("Tag slug cannot be blank.")
            if cleaned not in normalized:
                normalized.append(cleaned)
        return normalized


class RAGAnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_message: MessageResponse
    assistant_message: MessageResponse
    sources: list[SemanticSearchResultResponse]
    provider_id: UUID
    chat_model: str
    embedding_model: str
    embedding_dimension: int
