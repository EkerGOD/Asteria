import re
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Tag
from app.schemas.tag import TagCreate


class TagNotFoundError(Exception):
    """Raised when a tag id does not exist."""


class TagNameConflictError(Exception):
    """Raised when a tag with the same name (case-insensitive) already exists."""


class TagSlugConflictError(Exception):
    """Raised when a tag with the same slug already exists."""


def _generate_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise ValueError("Tag name must contain alphanumeric characters.")
    return slug


def _ensure_tag_name_available(
    session: Session,
    name: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    statement = select(Tag.id).where(func.lower(Tag.name) == name.lower())
    if exclude_id is not None:
        statement = statement.where(Tag.id != exclude_id)

    if session.execute(statement).first() is not None:
        raise TagNameConflictError


def _ensure_slug_available(
    session: Session,
    slug: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    statement = select(Tag.id).where(Tag.slug == slug)
    if exclude_id is not None:
        statement = statement.where(Tag.id != exclude_id)

    if session.execute(statement).first() is not None:
        raise TagSlugConflictError


def _commit_tag(session: Session, tag: Tag) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise TagSlugConflictError from exc

    session.refresh(tag)


def create_tag(session: Session, payload: TagCreate) -> Tag:
    slug = _generate_slug(payload.name)

    _ensure_tag_name_available(session, payload.name)
    _ensure_slug_available(session, slug)

    tag = Tag(
        id=uuid4(),
        name=payload.name,
        slug=slug,
        color=payload.color,
    )
    session.add(tag)
    _commit_tag(session, tag)
    return tag


def list_tags(session: Session) -> list[Tag]:
    statement = select(Tag).order_by(func.lower(Tag.name).asc())
    return list(session.scalars(statement).all())


def get_tag(session: Session, tag_id: UUID) -> Tag:
    tag = session.get(Tag, tag_id)
    if tag is None:
        raise TagNotFoundError
    return tag


def get_tag_by_slug(session: Session, slug: str) -> Tag:
    statement = select(Tag).where(Tag.slug == slug)
    tag = session.execute(statement).scalar_one_or_none()
    if tag is None:
        raise TagNotFoundError
    return tag
