from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import normalize_optional_text


class TagCreate(BaseModel):
    name: str = Field(min_length=1)
    color: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Tag name cannot be blank.")
        return stripped

    @field_validator("color")
    @classmethod
    def normalize_optional_color(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    color: str | None
    created_at: datetime
