from __future__ import annotations

import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import AppSetting, Repository
from app.schemas.repository import RepositoryCreate, RepositoryUpdate


CURRENT_REPOSITORY_SETTING_KEY = "current_repository_id"
ACTIVE_REPOSITORY_STATUS = "active"
UNLINKED_REPOSITORY_STATUS = "unlinked"


class RepositoryNotFoundError(Exception):
    """Raised when an active repository id does not exist."""


class RepositoryNameConflictError(Exception):
    """Raised when an active repository name would no longer be unique."""


class RepositoryPathConflictError(Exception):
    """Raised when an active repository root path would no longer be unique."""


class RepositoryConflictError(Exception):
    """Raised when the database rejects a repository uniqueness constraint."""


class RepositoryPathInvalidError(Exception):
    """Raised when a repository root path is not a readable local directory."""


def create_repository(session: Session, payload: RepositoryCreate) -> Repository:
    root_path = normalize_root_path(payload.root_path)
    _ensure_readable_directory(root_path)
    _ensure_active_name_available(session, payload.name)
    _ensure_active_path_available(session, root_path)

    repository = Repository(
        id=uuid4(),
        name=payload.name,
        root_path=root_path,
        status=ACTIVE_REPOSITORY_STATUS,
    )
    session.add(repository)
    _set_current_repository_id(session, repository.id)
    _commit_repository(session, repository)
    return repository


def list_repositories(session: Session, *, include_unlinked: bool = False) -> list[Repository]:
    statement: Select[tuple[Repository]] = select(Repository)
    if not include_unlinked:
        statement = statement.where(Repository.status == ACTIVE_REPOSITORY_STATUS)

    statement = statement.order_by(func.lower(Repository.name).asc())
    return list(session.scalars(statement).all())


def get_repository(
    session: Session,
    repository_id: UUID,
    *,
    include_unlinked: bool = False,
) -> Repository:
    repository = session.get(Repository, repository_id)
    if repository is None:
        raise RepositoryNotFoundError
    if not include_unlinked and repository.status != ACTIVE_REPOSITORY_STATUS:
        raise RepositoryNotFoundError
    return repository


def get_current_repository(session: Session) -> Repository | None:
    repository_id = _get_current_repository_id(session)
    if repository_id is None:
        return None

    repository = session.get(Repository, repository_id)
    if repository is None or repository.status != ACTIVE_REPOSITORY_STATUS:
        return None
    return repository


def update_repository(
    session: Session,
    repository_id: UUID,
    payload: RepositoryUpdate,
) -> Repository:
    repository = get_repository(session, repository_id)
    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates:
        _ensure_active_name_available(session, updates["name"], exclude_id=repository.id)
        repository.name = updates["name"]

    if "root_path" in updates:
        root_path = normalize_root_path(updates["root_path"])
        _ensure_readable_directory(root_path)
        _ensure_active_path_available(session, root_path, exclude_id=repository.id)
        repository.root_path = root_path

    _commit_repository(session, repository)
    return repository


def unlink_repository(session: Session, repository_id: UUID) -> Repository:
    repository = get_repository(session, repository_id)
    repository.status = UNLINKED_REPOSITORY_STATUS
    repository.unlinked_at = datetime.now(UTC)

    if _get_current_repository_id(session) == repository.id:
        session.flush()
        fallback = _first_active_repository(session)
        _set_current_repository_id(session, fallback.id if fallback else None)

    _commit_repository(session, repository)
    return repository


def select_current_repository(session: Session, repository_id: UUID) -> Repository:
    repository = get_repository(session, repository_id)
    _set_current_repository_id(session, repository.id)
    _commit_repository(session, repository)
    return repository


def normalize_root_path(root_path: str) -> str:
    stripped = root_path.strip()
    if not stripped:
        raise RepositoryPathInvalidError

    try:
        return str(Path(stripped).expanduser().resolve(strict=False))
    except (OSError, RuntimeError, ValueError) as exc:
        raise RepositoryPathInvalidError from exc


def _ensure_readable_directory(root_path: str) -> None:
    path = Path(root_path)
    try:
        if not path.exists() or not path.is_dir():
            raise RepositoryPathInvalidError
        if not os.access(path, os.R_OK):
            raise RepositoryPathInvalidError
        with os.scandir(path):
            pass
    except RepositoryPathInvalidError:
        raise
    except OSError as exc:
        raise RepositoryPathInvalidError from exc


def _ensure_active_name_available(
    session: Session,
    name: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    statement = (
        select(Repository.id)
        .where(Repository.status == ACTIVE_REPOSITORY_STATUS)
        .where(func.lower(Repository.name) == name.lower())
    )
    if exclude_id is not None:
        statement = statement.where(Repository.id != exclude_id)

    if session.execute(statement).first() is not None:
        raise RepositoryNameConflictError


def _ensure_active_path_available(
    session: Session,
    root_path: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    statement = (
        select(Repository.id)
        .where(Repository.status == ACTIVE_REPOSITORY_STATUS)
        .where(func.lower(Repository.root_path) == root_path.lower())
    )
    if exclude_id is not None:
        statement = statement.where(Repository.id != exclude_id)

    if session.execute(statement).first() is not None:
        raise RepositoryPathConflictError


def _first_active_repository(session: Session) -> Repository | None:
    statement = (
        select(Repository)
        .where(Repository.status == ACTIVE_REPOSITORY_STATUS)
        .order_by(func.lower(Repository.name).asc())
        .limit(1)
    )
    return session.scalars(statement).first()


def _get_current_repository_id(session: Session) -> UUID | None:
    setting = session.get(AppSetting, CURRENT_REPOSITORY_SETTING_KEY)
    if setting is None or not isinstance(setting.value, str):
        return None

    try:
        return UUID(setting.value)
    except ValueError:
        return None


def _set_current_repository_id(session: Session, repository_id: UUID | None) -> None:
    setting = session.get(AppSetting, CURRENT_REPOSITORY_SETTING_KEY)
    if repository_id is None:
        if setting is not None:
            session.delete(setting)
        return

    value = str(repository_id)
    if setting is None:
        session.add(AppSetting(key=CURRENT_REPOSITORY_SETTING_KEY, value=value))
        return

    setting.value = value


def _commit_repository(session: Session, repository: Repository) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise RepositoryConflictError from exc

    session.refresh(repository)
