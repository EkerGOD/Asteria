from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.repository import RepositoryCreate, RepositoryResponse, RepositoryUpdate
from app.services.repositories import (
    RepositoryConflictError,
    RepositoryNameConflictError,
    RepositoryNotFoundError,
    RepositoryPathConflictError,
    RepositoryPathInvalidError,
    create_repository,
    get_current_repository,
    get_repository,
    list_repositories,
    select_current_repository,
    unlink_repository,
    update_repository,
)

router = APIRouter(prefix="/api/repositories", tags=["repositories"])


@router.post("", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
def create_repository_endpoint(
    payload: RepositoryCreate,
    session: Session = Depends(get_db_session),
) -> RepositoryResponse:
    try:
        return RepositoryResponse.model_validate(create_repository(session, payload))
    except RepositoryNameConflictError as exc:
        raise _repository_name_conflict() from exc
    except RepositoryPathConflictError as exc:
        raise _repository_path_conflict() from exc
    except RepositoryPathInvalidError as exc:
        raise _repository_path_invalid() from exc
    except RepositoryConflictError as exc:
        raise _repository_conflict() from exc


@router.get("", response_model=list[RepositoryResponse])
def list_repositories_endpoint(
    include_unlinked: bool = Query(default=False),
    session: Session = Depends(get_db_session),
) -> list[RepositoryResponse]:
    return [
        RepositoryResponse.model_validate(repository)
        for repository in list_repositories(session, include_unlinked=include_unlinked)
    ]


@router.get("/current", response_model=RepositoryResponse | None)
def get_current_repository_endpoint(
    session: Session = Depends(get_db_session),
) -> RepositoryResponse | None:
    repository = get_current_repository(session)
    if repository is None:
        return None
    return RepositoryResponse.model_validate(repository)


@router.get("/{repository_id}", response_model=RepositoryResponse)
def get_repository_endpoint(
    repository_id: UUID,
    session: Session = Depends(get_db_session),
) -> RepositoryResponse:
    try:
        return RepositoryResponse.model_validate(get_repository(session, repository_id))
    except RepositoryNotFoundError as exc:
        raise _repository_not_found() from exc


@router.put("/{repository_id}", response_model=RepositoryResponse)
def update_repository_endpoint(
    repository_id: UUID,
    payload: RepositoryUpdate,
    session: Session = Depends(get_db_session),
) -> RepositoryResponse:
    try:
        return RepositoryResponse.model_validate(update_repository(session, repository_id, payload))
    except RepositoryNotFoundError as exc:
        raise _repository_not_found() from exc
    except RepositoryNameConflictError as exc:
        raise _repository_name_conflict() from exc
    except RepositoryPathConflictError as exc:
        raise _repository_path_conflict() from exc
    except RepositoryPathInvalidError as exc:
        raise _repository_path_invalid() from exc
    except RepositoryConflictError as exc:
        raise _repository_conflict() from exc


@router.delete("/{repository_id}", response_model=RepositoryResponse)
def unlink_repository_endpoint(
    repository_id: UUID,
    session: Session = Depends(get_db_session),
) -> RepositoryResponse:
    try:
        return RepositoryResponse.model_validate(unlink_repository(session, repository_id))
    except RepositoryNotFoundError as exc:
        raise _repository_not_found() from exc


@router.post("/{repository_id}/select", response_model=RepositoryResponse)
def select_current_repository_endpoint(
    repository_id: UUID,
    session: Session = Depends(get_db_session),
) -> RepositoryResponse:
    try:
        return RepositoryResponse.model_validate(select_current_repository(session, repository_id))
    except RepositoryNotFoundError as exc:
        raise _repository_not_found() from exc


def _repository_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Repository not found.",
    )


def _repository_name_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="An active repository with this name already exists.",
    )


def _repository_path_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="An active repository with this root path already exists.",
    )


def _repository_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Repository name or root path conflicts with an active repository.",
    )


def _repository_path_invalid() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Repository root path must be a readable local directory.",
    )
