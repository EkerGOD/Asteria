from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.schemas.common import normalize_optional_text


class ProviderCreate(BaseModel):
    name: str = Field(min_length=1)
    base_url: str = Field(min_length=1)
    api_key: str | None = None
    chat_model: str = Field(min_length=1)
    embedding_model: str = Field(min_length=1)
    timeout_seconds: int = Field(default=60, ge=1, le=300)
    is_active: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name", "base_url", "chat_model", "embedding_model")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank.")
        return stripped

    @field_validator("api_key")
    @classmethod
    def normalize_api_key(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class ProviderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    base_url: str | None = Field(default=None, min_length=1)
    api_key: str | None = None
    chat_model: str | None = Field(default=None, min_length=1)
    embedding_model: str | None = Field(default=None, min_length=1)
    timeout_seconds: int | None = Field(default=None, ge=1, le=300)
    is_active: bool | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("name", "base_url", "chat_model", "embedding_model")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank.")
        return stripped

    @field_validator("api_key")
    @classmethod
    def normalize_api_key(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class ProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    provider_type: str
    base_url: str
    chat_model: str
    embedding_model: str
    embedding_dimension: int
    timeout_seconds: int
    is_active: bool
    metadata: dict[str, Any] = Field(validation_alias="metadata_")
    api_key_ciphertext: str | None = Field(default=None, exclude=True)
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def has_api_key(self) -> bool:
        return self.api_key_ciphertext is not None


class ProviderHealthResponse(BaseModel):
    provider_id: UUID
    status: str
    message: str
    latency_ms: int | None = None
