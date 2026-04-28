from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    color: str | None = None
    sort_order: int = Field(default=0, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Project name cannot be blank.")
        return stripped

    @field_validator("description", "color")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    sort_order: int | None = Field(default=None, ge=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Project name cannot be blank.")
        return stripped

    @field_validator("description", "color")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    color: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
