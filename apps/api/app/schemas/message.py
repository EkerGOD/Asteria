from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import normalize_optional_text


class MessageCreate(BaseModel):
    role: Literal["user"] = "user"
    content: str = Field(min_length=1)
    provider_id: UUID | None = None
    model: str | None = None
    token_count: int | None = Field(default=None, ge=0)
    retrieval_metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message content cannot be blank.")
        return stripped

    @field_validator("model")
    @classmethod
    def normalize_model(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    provider_id: UUID | None
    role: str
    content: str
    model: str | None
    token_count: int | None
    retrieval_metadata: dict[str, Any]
    created_at: datetime
