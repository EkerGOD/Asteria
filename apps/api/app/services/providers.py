from __future__ import annotations

import time
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.ai import (
    OpenAICompatibleProviderAdapter,
    ProviderAdapterError,
    ProviderAuthError,
    ProviderConnectionError,
    ProviderHTTPStatusError,
    ProviderTimeoutError,
)
from app.core.config import Settings
from app.core.secrets import encrypt_provider_api_key
from app.models import AIProvider, ProviderModel
from app.schemas.provider import ProviderCreate, ProviderHealthResponse, ProviderUpdate

_UNSET = object()


class ProviderNotFoundError(Exception):
    """Raised when a provider id does not exist."""


class ProviderNameConflictError(Exception):
    """Raised when a provider name would no longer be unique."""


def create_provider(
    session: Session,
    payload: ProviderCreate,
    settings: Settings,
) -> AIProvider:
    _ensure_name_available(session, payload.name)

    data = payload.model_dump()
    api_key = data.pop("api_key", None)
    metadata = data.pop("metadata")
    model_names = data.pop("models")
    encrypted_api_key = encrypt_provider_api_key(api_key, settings)

    provider = AIProvider(
        id=uuid4(),
        api_key_ciphertext=encrypted_api_key,
        metadata_=metadata,
        **data,
    )
    _replace_provider_models(provider, model_names)
    if provider.is_active:
        _deactivate_all_providers(session)

    session.add(provider)
    _commit_provider(session, provider)
    return provider


def list_providers(session: Session) -> list[AIProvider]:
    statement = (
        select(AIProvider)
        .options(selectinload(AIProvider.model_entries))
        .order_by(func.lower(AIProvider.name).asc())
    )
    return list(session.scalars(statement).all())


def get_provider(session: Session, provider_id: UUID) -> AIProvider:
    provider = session.get(AIProvider, provider_id)
    if provider is None:
        raise ProviderNotFoundError
    return provider


def update_provider(
    session: Session,
    provider_id: UUID,
    payload: ProviderUpdate,
    settings: Settings,
) -> AIProvider:
    provider = get_provider(session, provider_id)
    updates = payload.model_dump(exclude_unset=True)
    api_key = updates.pop("api_key", _UNSET)
    model_names = updates.pop("models", _UNSET)
    metadata = updates.pop("metadata", _UNSET)
    encrypted_api_key = (
        encrypt_provider_api_key(api_key, settings)
        if api_key is not _UNSET
        else _UNSET
    )

    if "name" in updates:
        _ensure_name_available(session, updates["name"], exclude_id=provider.id)

    if updates.get("is_active"):
        _deactivate_all_providers(session)

    for field_name, value in updates.items():
        setattr(provider, field_name, value)

    if metadata is not _UNSET:
        provider.metadata_ = metadata

    if encrypted_api_key is not _UNSET:
        provider.api_key_ciphertext = encrypted_api_key

    if model_names is not _UNSET:
        _replace_provider_models(provider, model_names)
        if "chat_model" not in updates:
            provider.chat_model = model_names[0]
        if provider.embedding_model is None:
            provider.embedding_model = model_names[0]
    elif "chat_model" in updates:
        _ensure_provider_model_present(provider, updates["chat_model"])

    _commit_provider(session, provider)
    return provider


def delete_provider(session: Session, provider_id: UUID) -> None:
    provider = get_provider(session, provider_id)
    session.delete(provider)
    session.commit()


def activate_provider(session: Session, provider_id: UUID) -> AIProvider:
    provider = get_provider(session, provider_id)
    if not provider.is_active:
        _deactivate_all_providers(session)
        provider.is_active = True
        _commit_provider(session, provider)
    return provider


def health_check_provider(
    session: Session,
    provider_id: UUID,
    settings: Settings,
) -> ProviderHealthResponse:
    provider = get_provider(session, provider_id)

    start = time.monotonic()
    try:
        adapter = OpenAICompatibleProviderAdapter.from_provider(provider, settings)
        adapter.check_health()
        latency_ms = round((time.monotonic() - start) * 1000)
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="ok",
            message="Provider is reachable.",
            latency_ms=latency_ms,
        )
    except ProviderTimeoutError:
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message="Provider request timed out.",
        )
    except ProviderConnectionError:
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message="Could not connect to provider.",
        )
    except ProviderAuthError:
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message="Provider authentication failed.",
        )
    except ProviderHTTPStatusError as exc:
        status_code = exc.status_code
        message = (
            f"Provider returned HTTP {status_code}."
            if status_code is not None
            else "Provider returned an error status."
        )
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message=message,
        )
    except ProviderAdapterError:
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message="Provider health check failed.",
        )


def get_active_provider(session: Session) -> AIProvider | None:
    return session.scalars(
        select(AIProvider).where(AIProvider.is_active.is_(True))
    ).first()


def provider_model_names(provider: AIProvider) -> list[str]:
    names = [model.name for model in provider.model_entries]
    if names:
        return names
    if provider.chat_model:
        return [provider.chat_model]
    return []


def _ensure_name_available(
    session: Session,
    name: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    statement = select(AIProvider.id).where(
        func.lower(AIProvider.name) == name.lower()
    )
    if exclude_id is not None:
        statement = statement.where(AIProvider.id != exclude_id)

    if session.execute(statement).first() is not None:
        raise ProviderNameConflictError


def _deactivate_all_providers(session: Session) -> None:
    session.execute(
        update(AIProvider).values(is_active=False).where(AIProvider.is_active.is_(True))
    )


def _replace_provider_models(provider: AIProvider, model_names: list[str]) -> None:
    provider.model_entries = [
        ProviderModel(id=uuid4(), name=model_name, sort_order=index)
        for index, model_name in enumerate(model_names)
    ]


def _ensure_provider_model_present(provider: AIProvider, model_name: str) -> None:
    existing_names = {name.lower() for name in provider_model_names(provider)}
    if model_name.lower() in existing_names:
        return
    provider.model_entries.append(
        ProviderModel(
            id=uuid4(),
            name=model_name,
            sort_order=len(provider.model_entries),
        )
    )


def _commit_provider(session: Session, provider: AIProvider) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ProviderNameConflictError from exc

    session.refresh(provider)
