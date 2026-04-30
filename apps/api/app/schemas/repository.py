from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RepositoryCreate(BaseModel):
    name: str = Field(min_length=1)
    root_path: str = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Repository name cannot be blank.")
        return stripped

    @field_validator("root_path")
    @classmethod
    def validate_root_path(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Repository root path cannot be blank.")
        return stripped


class RepositoryUpdate(BaseModel):
    name: str | None = None
    root_path: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Repository name cannot be blank.")
        return stripped

    @field_validator("root_path")
    @classmethod
    def validate_root_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Repository root path cannot be blank.")
        return stripped


class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    root_path: str
    status: Literal["active", "unlinked"]
    created_at: datetime
    updated_at: datetime
    unlinked_at: datetime | None
