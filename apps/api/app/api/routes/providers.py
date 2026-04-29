from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.secrets import SecretConfigurationError
from app.db.session import get_db_session
from app.schemas.provider import (
    ProviderCreate,
    ProviderHealthResponse,
    ProviderResponse,
    ProviderUpdate,
)
from app.services.providers import (
    ProviderNameConflictError,
    ProviderNotFoundError,
    activate_provider,
    create_provider,
    delete_provider,
    get_provider,
    health_check_provider,
    list_providers,
    update_provider,
)

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.post("", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
def create_provider_endpoint(
    payload: ProviderCreate,
    request: Request,
    session: Session = Depends(get_db_session),
) -> ProviderResponse:
    settings: Settings = request.app.state.settings
    try:
        return ProviderResponse.model_validate(create_provider(session, payload, settings))
    except ProviderNameConflictError as exc:
        raise _provider_name_conflict() from exc
    except SecretConfigurationError as exc:
        raise _provider_secret_configuration_error(exc) from exc


@router.get("", response_model=list[ProviderResponse])
def list_providers_endpoint(
    session: Session = Depends(get_db_session),
) -> list[ProviderResponse]:
    return [
        ProviderResponse.model_validate(provider)
        for provider in list_providers(session)
    ]


@router.get("/{provider_id}", response_model=ProviderResponse)
def get_provider_endpoint(
    provider_id: UUID,
    session: Session = Depends(get_db_session),
) -> ProviderResponse:
    try:
        return ProviderResponse.model_validate(get_provider(session, provider_id))
    except ProviderNotFoundError as exc:
        raise _provider_not_found() from exc


@router.put("/{provider_id}", response_model=ProviderResponse)
def update_provider_endpoint(
    provider_id: UUID,
    payload: ProviderUpdate,
    request: Request,
    session: Session = Depends(get_db_session),
) -> ProviderResponse:
    settings: Settings = request.app.state.settings
    try:
        return ProviderResponse.model_validate(
            update_provider(session, provider_id, payload, settings)
        )
    except ProviderNotFoundError as exc:
        raise _provider_not_found() from exc
    except ProviderNameConflictError as exc:
        raise _provider_name_conflict() from exc
    except SecretConfigurationError as exc:
        raise _provider_secret_configuration_error(exc) from exc


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider_endpoint(
    provider_id: UUID,
    session: Session = Depends(get_db_session),
) -> None:
    try:
        delete_provider(session, provider_id)
    except ProviderNotFoundError as exc:
        raise _provider_not_found() from exc


@router.post(
    "/{provider_id}/activate",
    response_model=ProviderResponse,
)
def activate_provider_endpoint(
    provider_id: UUID,
    session: Session = Depends(get_db_session),
) -> ProviderResponse:
    try:
        return ProviderResponse.model_validate(
            activate_provider(session, provider_id)
        )
    except ProviderNotFoundError as exc:
        raise _provider_not_found() from exc


@router.post(
    "/{provider_id}/health-check",
    response_model=ProviderHealthResponse,
)
def health_check_provider_endpoint(
    provider_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> ProviderHealthResponse:
    settings: Settings = request.app.state.settings
    try:
        return health_check_provider(session, provider_id, settings)
    except ProviderNotFoundError as exc:
        raise _provider_not_found() from exc


def _provider_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Provider not found.",
    )


def _provider_name_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="A provider with this name already exists.",
    )


def _provider_secret_configuration_error(exc: SecretConfigurationError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=str(exc),
    )
