from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectNotFoundError(Exception):
    """Raised when a project id does not exist."""


class ProjectNameConflictError(Exception):
    """Raised when an active project name would no longer be unique."""


def create_project(session: Session, payload: ProjectCreate) -> Project:
    _ensure_active_name_available(session, payload.name)

    project = Project(id=uuid4(), **payload.model_dump())
    session.add(project)
    _commit_project(session, project)
    return project


def list_projects(session: Session, *, include_archived: bool = False) -> list[Project]:
    statement: Select[tuple[Project]] = select(Project)
    if not include_archived:
        statement = statement.where(Project.archived_at.is_(None))

    statement = statement.order_by(Project.sort_order.asc(), func.lower(Project.name).asc())
    return list(session.scalars(statement).all())


def get_project(session: Session, project_id: UUID) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise ProjectNotFoundError
    return project


def update_project(session: Session, project_id: UUID, payload: ProjectUpdate) -> Project:
    project = get_project(session, project_id)
    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates and project.archived_at is None:
        _ensure_active_name_available(session, updates["name"], exclude_id=project.id)

    for field_name, value in updates.items():
        setattr(project, field_name, value)

    _commit_project(session, project)
    return project


def archive_project(session: Session, project_id: UUID) -> Project:
    project = get_project(session, project_id)
    if project.archived_at is None:
        project.archived_at = datetime.now(UTC)
        _commit_project(session, project)
    return project


def _ensure_active_name_available(
    session: Session,
    name: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    statement = (
        select(Project.id)
        .where(Project.archived_at.is_(None))
        .where(func.lower(Project.name) == name.lower())
    )
    if exclude_id is not None:
        statement = statement.where(Project.id != exclude_id)

    if session.execute(statement).first() is not None:
        raise ProjectNameConflictError


def _commit_project(session: Session, project: Project) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ProjectNameConflictError from exc

    session.refresh(project)
