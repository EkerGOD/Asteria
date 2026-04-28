from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing_extensions import Literal

from app.schemas.common import normalize_optional_text
from app.schemas.tag import TagResponse


class KnowledgeUnitCreate(BaseModel):
    project_id: UUID | None = None
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    source_type: Literal["manual", "import", "chat", "excerpt"] = "manual"
    source_uri: str | None = None
    status: Literal["active", "archived"] = "active"
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("title", "content")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank.")
        return stripped

    @field_validator("source_uri")
    @classmethod
    def normalize_optional_uri(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class KnowledgeUnitUpdate(BaseModel):
    project_id: UUID | None = None
    title: str | None = Field(default=None, min_length=1)
    content: str | None = Field(default=None, min_length=1)
    source_type: Literal["manual", "import", "chat", "excerpt"] | None = None
    source_uri: str | None = None
    status: Literal["active", "archived"] | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("title", "content")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank.")
        return stripped

    @field_validator("source_uri")
    @classmethod
    def normalize_optional_uri(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class AttachTagRequest(BaseModel):
    tag_id: UUID


class KnowledgeUnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID | None
    title: str
    content: str
    source_type: str
    source_uri: str | None
    status: str
    metadata: dict[str, Any] = Field(validation_alias="metadata_")
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    tags: list[TagResponse] = []
