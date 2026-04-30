from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AIProvider, ModelRole
from app.schemas.model_role import ModelRoleUpsertRequest


class ProviderNotFoundError(Exception):
    """Raised when a provider id does not exist."""


def list_model_roles(session: Session) -> list[ModelRole]:
    return list(session.scalars(select(ModelRole).order_by(ModelRole.role_type.asc())).all())


def upsert_model_role(
    session: Session,
    role_type: str,
    payload: ModelRoleUpsertRequest,
) -> ModelRole:
    if payload.provider_id and session.get(AIProvider, payload.provider_id) is None:
        raise ProviderNotFoundError

    existing = session.scalars(
        select(ModelRole).where(ModelRole.role_type == role_type)
    ).first()

    if existing is not None:
        existing.provider_id = payload.provider_id
        existing.model_name = payload.model_name
        existing.embedding_dimension = payload.embedding_dimension
        session.commit()
        session.refresh(existing)
        return existing

    model_role = ModelRole(
        id=uuid4(),
        role_type=role_type,
        provider_id=payload.provider_id,
        model_name=payload.model_name,
        embedding_dimension=payload.embedding_dimension,
    )
    session.add(model_role)
    session.commit()
    session.refresh(model_role)
    return model_role
