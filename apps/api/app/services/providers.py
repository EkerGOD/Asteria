from __future__ import annotations

import time
from uuid import UUID, uuid4

import httpx
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import AIProvider
from app.schemas.provider import ProviderCreate, ProviderHealthResponse, ProviderUpdate

_UNSET = object()


class ProviderNotFoundError(Exception):
    """Raised when a provider id does not exist."""


class ProviderNameConflictError(Exception):
    """Raised when a provider name would no longer be unique."""


def create_provider(session: Session, payload: ProviderCreate) -> AIProvider:
    _ensure_name_available(session, payload.name)

    data = payload.model_dump()
    api_key = data.pop("api_key", None)

    provider = AIProvider(id=uuid4(), api_key_ciphertext=api_key, **data)
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
) -> AIProvider:
    provider = get_provider(session, provider_id)
    updates = payload.model_dump(exclude_unset=True)
    api_key = updates.pop("api_key", _UNSET)

    if "name" in updates:
        _ensure_name_available(session, updates["name"], exclude_id=provider.id)

    if updates.get("is_active"):
        _deactivate_all_providers(session)

    for field_name, value in updates.items():
        setattr(provider, field_name, value)

    if api_key is not _UNSET:
        provider.api_key_ciphertext = api_key

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
) -> ProviderHealthResponse:
    provider = get_provider(session, provider_id)

    headers: dict[str, str] = {}
    if provider.api_key_ciphertext:
        headers["Authorization"] = f"Bearer {provider.api_key_ciphertext}"

    start = time.monotonic()
    try:
        response = httpx.get(
            f"{provider.base_url.rstrip('/')}/models",
            headers=headers,
            timeout=min(provider.timeout_seconds, 30),
        )
        latency_ms = round((time.monotonic() - start) * 1000)
        if response.is_success:
            return ProviderHealthResponse(
                provider_id=provider.id,
                status="ok",
                message="Provider is reachable.",
                latency_ms=latency_ms,
            )
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message=f"Provider returned HTTP {response.status_code}.",
            latency_ms=latency_ms,
        )
    except httpx.TimeoutException:
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message="Provider request timed out.",
        )
    except httpx.ConnectError:
        return ProviderHealthResponse(
            provider_id=provider.id,
            status="error",
            message="Could not connect to provider.",
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
