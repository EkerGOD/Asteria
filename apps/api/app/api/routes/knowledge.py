from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.knowledge import (
    AttachTagRequest,
    KnowledgeUnitCreate,
    KnowledgeUnitResponse,
    KnowledgeUnitUpdate,
)
from app.services.knowledge import (
    KnowledgeNotFoundError,
    KnowledgeProjectNotFoundError,
    KnowledgeTagNotAttachedError,
    archive_knowledge,
    attach_tag,
    create_knowledge,
    detach_tag,
    get_knowledge,
    list_knowledge,
    update_knowledge,
)

router = APIRouter(prefix="/api/knowledge-units", tags=["knowledge"])


@router.post("", response_model=KnowledgeUnitResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge_endpoint(
    payload: KnowledgeUnitCreate,
    session: Session = Depends(get_db_session),
) -> KnowledgeUnitResponse:
    try:
        return KnowledgeUnitResponse.model_validate(
            create_knowledge(session, payload)
        )
    except KnowledgeProjectNotFoundError as exc:
        raise _knowledge_project_not_found() from exc


@router.get("", response_model=list[KnowledgeUnitResponse])
def list_knowledge_endpoint(
    project_id: UUID | None = Query(default=None),
    tag_slugs: list[str] = Query(default=[]),
    include_archived: bool = Query(default=False),
    session: Session = Depends(get_db_session),
) -> list[KnowledgeUnitResponse]:
    return [
        KnowledgeUnitResponse.model_validate(knowledge)
        for knowledge in list_knowledge(
            session,
            project_id=project_id,
            tag_slugs=tag_slugs or None,
            include_archived=include_archived,
        )
    ]


@router.get("/{knowledge_id}", response_model=KnowledgeUnitResponse)
def get_knowledge_endpoint(
    knowledge_id: UUID,
    session: Session = Depends(get_db_session),
) -> KnowledgeUnitResponse:
    try:
        return KnowledgeUnitResponse.model_validate(
            get_knowledge(session, knowledge_id)
        )
    except KnowledgeNotFoundError as exc:
        raise _knowledge_not_found() from exc


@router.put("/{knowledge_id}", response_model=KnowledgeUnitResponse)
def update_knowledge_endpoint(
    knowledge_id: UUID,
    payload: KnowledgeUnitUpdate,
    session: Session = Depends(get_db_session),
) -> KnowledgeUnitResponse:
    try:
        return KnowledgeUnitResponse.model_validate(
            update_knowledge(session, knowledge_id, payload)
        )
    except KnowledgeNotFoundError as exc:
        raise _knowledge_not_found() from exc
    except KnowledgeProjectNotFoundError as exc:
        raise _knowledge_project_not_found() from exc


@router.delete("/{knowledge_id}", response_model=KnowledgeUnitResponse)
def archive_knowledge_endpoint(
    knowledge_id: UUID,
    session: Session = Depends(get_db_session),
) -> KnowledgeUnitResponse:
    try:
        return KnowledgeUnitResponse.model_validate(
            archive_knowledge(session, knowledge_id)
        )
    except KnowledgeNotFoundError as exc:
        raise _knowledge_not_found() from exc


@router.post(
    "/{knowledge_id}/tags",
    response_model=KnowledgeUnitResponse,
)
def attach_tag_endpoint(
    knowledge_id: UUID,
    payload: AttachTagRequest,
    session: Session = Depends(get_db_session),
) -> KnowledgeUnitResponse:
    try:
        return KnowledgeUnitResponse.model_validate(
            attach_tag(session, knowledge_id, payload.tag_id)
        )
    except KnowledgeNotFoundError as exc:
        raise _knowledge_not_found() from exc


@router.delete(
    "/{knowledge_id}/tags/{tag_id}",
    response_model=KnowledgeUnitResponse,
)
def detach_tag_endpoint(
    knowledge_id: UUID,
    tag_id: UUID,
    session: Session = Depends(get_db_session),
) -> KnowledgeUnitResponse:
    try:
        return KnowledgeUnitResponse.model_validate(
            detach_tag(session, knowledge_id, tag_id)
        )
    except KnowledgeNotFoundError as exc:
        raise _knowledge_not_found() from exc
    except KnowledgeTagNotAttachedError as exc:
        raise _tag_not_attached() from exc


def _knowledge_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Knowledge unit not found.",
    )


def _knowledge_project_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Referenced project not found.",
    )


def _tag_not_attached() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Tag is not attached to this knowledge unit.",
    )
