from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from app.schemas.common import normalize_optional_text


def _normalize_model_names(values: list[str]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for value in values:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Model names cannot be blank.")
        key = stripped.lower()
        if key in seen:
            continue
        names.append(stripped)
        seen.add(key)
    return names


class ProviderCreate(BaseModel):
    name: str = Field(min_length=1)
    base_url: str = Field(min_length=1)
    api_key: str | None = None
    models: list[str] = Field(default_factory=list)
    chat_model: str | None = Field(default=None, min_length=1)
    embedding_model: str | None = Field(default=None, min_length=1)
    timeout_seconds: int = Field(default=60, ge=1, le=300)
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

    @field_validator("models")
    @classmethod
    def validate_models(cls, value: list[str]) -> list[str]:
        return _normalize_model_names(value)

    @model_validator(mode="after")
    def ensure_models(self) -> "ProviderCreate":
        if not self.models:
            if self.chat_model is None:
                raise ValueError("At least one model is required.")
            self.models = [self.chat_model]

        if self.chat_model is None:
            self.chat_model = self.models[0]
        if self.embedding_model is None:
            self.embedding_model = self.models[0]

        return self


class ProviderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    base_url: str | None = Field(default=None, min_length=1)
    api_key: str | None = None
    models: list[str] | None = None
    chat_model: str | None = Field(default=None, min_length=1)
    embedding_model: str | None = Field(default=None, min_length=1)
    timeout_seconds: int | None = Field(default=None, ge=1, le=300)
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

    @field_validator("models")
    @classmethod
    def validate_models(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        models = _normalize_model_names(value)
        if not models:
            raise ValueError("At least one model is required.")
        return models


class ProviderModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    name: str
    sort_order: int
    created_at: datetime
    updated_at: datetime


class ProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    provider_type: str
    base_url: str
    chat_model: str
    embedding_model: str
    embedding_dimension: int
    models: list[ProviderModelResponse] = Field(
        default_factory=list,
        validation_alias="model_entries",
    )
    timeout_seconds: int
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
