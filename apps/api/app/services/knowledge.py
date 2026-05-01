from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Select, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import KnowledgeUnit, KnowledgeUnitTag, Project, Tag
from app.schemas.knowledge import KnowledgeUnitCreate, KnowledgeUnitUpdate
from app.services.embeddings import (
    delete_knowledge_embeddings,
    refresh_knowledge_embeddings_if_configured,
)


class KnowledgeNotFoundError(Exception):
    """Raised when a knowledge unit id does not exist."""


class KnowledgeProjectNotFoundError(Exception):
    """Raised when the project_id in a knowledge unit payload does not exist."""


class KnowledgeTagNotAttachedError(Exception):
    """Raised when trying to detach a tag that is not attached."""


def _commit_knowledge(session: Session, knowledge: KnowledgeUnit) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise KnowledgeProjectNotFoundError from exc

    session.refresh(knowledge)


def create_knowledge(session: Session, payload: KnowledgeUnitCreate) -> KnowledgeUnit:
    if payload.project_id is not None:
        project = session.get(Project, payload.project_id)
        if project is None:
            raise KnowledgeProjectNotFoundError

    data = payload.model_dump()
    data["metadata_"] = data.pop("metadata")

    if data["status"] == "archived":
        data["archived_at"] = datetime.now(UTC)

    knowledge = KnowledgeUnit(id=uuid4(), **data)
    session.add(knowledge)
    try:
        refresh_knowledge_embeddings_if_configured(session, knowledge)
        _commit_knowledge(session, knowledge)
    except Exception:
        session.rollback()
        raise
    return knowledge


def list_knowledge(
    session: Session,
    *,
    project_id: UUID | None = None,
    tag_slugs: list[str] | None = None,
    query: str | None = None,
    include_archived: bool = False,
) -> list[KnowledgeUnit]:
    statement: Select[tuple[KnowledgeUnit]] = select(KnowledgeUnit).distinct()

    if not include_archived:
        statement = statement.where(KnowledgeUnit.status != "archived")

    if project_id is not None:
        statement = statement.where(KnowledgeUnit.project_id == project_id)

    if tag_slugs:
        statement = (
            statement.join(KnowledgeUnit.tag_links)
            .join(KnowledgeUnitTag.tag)
            .where(Tag.slug.in_(tag_slugs))
        )

    if query is not None:
        normalized_query = query.strip()
        if normalized_query:
            search_pattern = f"%{normalized_query}%"
            statement = statement.where(
                or_(
                    KnowledgeUnit.title.ilike(search_pattern),
                    KnowledgeUnit.content.ilike(search_pattern),
                    KnowledgeUnit.source_uri.ilike(search_pattern),
                )
            )

    statement = statement.order_by(KnowledgeUnit.updated_at.desc())
    return list(session.scalars(statement).all())


def get_knowledge(session: Session, knowledge_id: UUID) -> KnowledgeUnit:
    knowledge = session.get(KnowledgeUnit, knowledge_id)
    if knowledge is None:
        raise KnowledgeNotFoundError
    return knowledge


def update_knowledge(
    session: Session,
    knowledge_id: UUID,
    payload: KnowledgeUnitUpdate,
) -> KnowledgeUnit:
    knowledge = get_knowledge(session, knowledge_id)
    updates = payload.model_dump(exclude_unset=True)
    content_changed = (
        "content" in updates and updates["content"] != knowledge.content
    )

    if "project_id" in updates and updates["project_id"] is not None:
        project = session.get(Project, updates["project_id"])
        if project is None:
            raise KnowledgeProjectNotFoundError

    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")

    if "status" in updates:
        if updates["status"] == "archived" and knowledge.archived_at is None:
            updates["archived_at"] = datetime.now(UTC)
        elif updates["status"] == "active":
            updates["archived_at"] = None

    for field_name, value in updates.items():
        setattr(knowledge, field_name, value)

    try:
        if content_changed:
            if refresh_knowledge_embeddings_if_configured(session, knowledge) is None:
                delete_knowledge_embeddings(session, knowledge.id)
        _commit_knowledge(session, knowledge)
    except Exception:
        session.rollback()
        raise
    return knowledge


def archive_knowledge(session: Session, knowledge_id: UUID) -> KnowledgeUnit:
    knowledge = get_knowledge(session, knowledge_id)
    if knowledge.status != "archived":
        knowledge.status = "archived"
        knowledge.archived_at = datetime.now(UTC)
        _commit_knowledge(session, knowledge)
    return knowledge


def attach_tag(session: Session, knowledge_id: UUID, tag_id: UUID) -> KnowledgeUnit:
    knowledge = get_knowledge(session, knowledge_id)

    if session.get(Tag, tag_id) is None:
        raise KnowledgeNotFoundError

    existing = session.get(
        KnowledgeUnitTag,
        {"knowledge_unit_id": knowledge_id, "tag_id": tag_id},
    )
    if existing is not None:
        return knowledge

    link = KnowledgeUnitTag(knowledge_unit_id=knowledge_id, tag_id=tag_id)
    session.add(link)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()

    session.refresh(knowledge)
    return knowledge


def detach_tag(session: Session, knowledge_id: UUID, tag_id: UUID) -> KnowledgeUnit:
    knowledge = get_knowledge(session, knowledge_id)

    link = session.get(
        KnowledgeUnitTag,
        {"knowledge_unit_id": knowledge_id, "tag_id": tag_id},
    )
    if link is None:
        raise KnowledgeTagNotAttachedError

    session.delete(link)
    session.commit()
    session.refresh(knowledge)
    return knowledge
