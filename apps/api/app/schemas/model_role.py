from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModelRoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role_type: str
    provider_id: UUID | None
    model_name: str
    embedding_dimension: int | None
    created_at: datetime
    updated_at: datetime


class ModelRoleUpsertRequest(BaseModel):
    provider_id: UUID | None = None
    model_name: str = Field(min_length=1)
    embedding_dimension: int | None = Field(default=None, ge=1, le=8192)
