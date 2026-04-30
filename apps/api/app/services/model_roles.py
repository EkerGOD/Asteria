from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import AIProvider, ModelRole
from app.schemas.model_role import ModelRoleUpsertRequest
from app.services.providers import provider_model_names


class ProviderNotFoundError(Exception):
    """Raised when a provider id does not exist."""


class ProviderModelNotFoundError(Exception):
    """Raised when a chat role references a model not configured on a provider."""


class InvalidModelRoleConfigurationError(Exception):
    """Raised when a model role violates provider/model ownership rules."""


def list_model_roles(session: Session) -> list[ModelRole]:
    return list(session.scalars(select(ModelRole).order_by(ModelRole.role_type.asc())).all())


def upsert_model_role(
    session: Session,
    role_type: str,
    payload: ModelRoleUpsertRequest,
) -> ModelRole:
    _validate_role_payload(session, role_type, payload)

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


def resolve_chat_model_role(session: Session) -> tuple[AIProvider, str] | None:
    role = session.scalars(
        select(ModelRole).where(ModelRole.role_type == "chat")
    ).first()
    if role is None or role.provider_id is None:
        return None

    provider = session.scalars(
        select(AIProvider)
        .options(selectinload(AIProvider.model_entries))
        .where(AIProvider.id == role.provider_id)
    ).first()
    if provider is None:
        return None
    if role.model_name not in provider_model_names(provider):
        return None
    return provider, role.model_name


def resolve_embedding_model_role(session: Session) -> ModelRole | None:
    role = session.scalars(
        select(ModelRole).where(ModelRole.role_type == "embedding")
    ).first()
    return role


def _validate_role_payload(
    session: Session,
    role_type: str,
    payload: ModelRoleUpsertRequest,
) -> AIProvider | None:
    if role_type == "embedding":
        if payload.provider_id is not None:
            raise InvalidModelRoleConfigurationError
        return None

    if role_type != "chat":
        return None

    if payload.provider_id is None:
        raise InvalidModelRoleConfigurationError

    provider = session.scalars(
        select(AIProvider)
        .options(selectinload(AIProvider.model_entries))
        .where(AIProvider.id == payload.provider_id)
    ).first()
    if provider is None:
        raise ProviderNotFoundError
    if payload.model_name not in provider_model_names(provider):
        raise ProviderModelNotFoundError
    return provider
