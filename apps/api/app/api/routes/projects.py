from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.projects import (
    ProjectNameConflictError,
    ProjectNotFoundError,
    archive_project,
    create_project,
    get_project,
    list_projects,
    update_project,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project_endpoint(
    payload: ProjectCreate,
    session: Session = Depends(get_db_session),
) -> ProjectResponse:
    try:
        return ProjectResponse.model_validate(create_project(session, payload))
    except ProjectNameConflictError as exc:
        raise _project_name_conflict() from exc


@router.get("", response_model=list[ProjectResponse])
def list_projects_endpoint(
    include_archived: bool = Query(default=False),
    session: Session = Depends(get_db_session),
) -> list[ProjectResponse]:
    return [
        ProjectResponse.model_validate(project)
        for project in list_projects(session, include_archived=include_archived)
    ]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_endpoint(
    project_id: UUID,
    session: Session = Depends(get_db_session),
) -> ProjectResponse:
    try:
        return ProjectResponse.model_validate(get_project(session, project_id))
    except ProjectNotFoundError as exc:
        raise _project_not_found() from exc


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project_endpoint(
    project_id: UUID,
    payload: ProjectUpdate,
    session: Session = Depends(get_db_session),
) -> ProjectResponse:
    try:
        return ProjectResponse.model_validate(update_project(session, project_id, payload))
    except ProjectNotFoundError as exc:
        raise _project_not_found() from exc
    except ProjectNameConflictError as exc:
        raise _project_name_conflict() from exc


@router.delete("/{project_id}", response_model=ProjectResponse)
def archive_project_endpoint(
    project_id: UUID,
    session: Session = Depends(get_db_session),
) -> ProjectResponse:
    try:
        return ProjectResponse.model_validate(archive_project(session, project_id))
    except ProjectNotFoundError as exc:
        raise _project_not_found() from exc


def _project_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Project not found.",
    )


def _project_name_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="An active project with this name already exists.",
    )
