from __future__ import annotations

import time
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

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
from app.models import AIProvider
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
    encrypted_api_key = encrypt_provider_api_key(api_key, settings)

    provider = AIProvider(id=uuid4(), api_key_ciphertext=encrypted_api_key, **data)
    if provider.is_active:
        _deactivate_all_providers(session)

    session.add(provider)
    _commit_provider(session, provider)
    return provider


def list_providers(session: Session) -> list[AIProvider]:
    statement = select(AIProvider).order_by(func.lower(AIProvider.name).asc())
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

    if encrypted_api_key is not _UNSET:
        provider.api_key_ciphertext = encrypted_api_key

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


def _commit_provider(session: Session, provider: AIProvider) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ProviderNameConflictError from exc

    session.refresh(provider)
