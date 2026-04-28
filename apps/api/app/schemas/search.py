from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.tag import TagResponse


class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    project_id: UUID | None = None
    tag_slugs: list[str] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.0, ge=-1.0, le=1.0)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Query cannot be blank.")
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


class SemanticSearchSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID | None
    title: str
    source_type: str
    source_uri: str | None
    status: str
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    tags: list[TagResponse]


class SemanticSearchResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    embedding_id: UUID
    knowledge_unit_id: UUID
    chunk_index: int
    chunk_text: str
    score: float
    source: SemanticSearchSourceResponse


class SemanticSearchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider_id: UUID
    embedding_model: str
    embedding_dimension: int
    results: list[SemanticSearchResultResponse]
