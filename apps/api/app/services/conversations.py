from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Conversation
from app.schemas.conversation import ConversationCreate, ConversationUpdate


class ConversationNotFoundError(Exception):
    """Raised when a conversation id does not exist."""


def create_conversation(session: Session, payload: ConversationCreate) -> Conversation:
    data = payload.model_dump()
    data["metadata_"] = data.pop("metadata")
    conversation = Conversation(id=uuid4(), **data)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


def list_conversations(
    session: Session,
    *,
    project_id: UUID | None = None,
    include_archived: bool = False,
) -> list[Conversation]:
    statement = select(Conversation)
    if not include_archived:
        statement = statement.where(Conversation.archived_at.is_(None))
    if project_id is not None:
        statement = statement.where(Conversation.project_id == project_id)
    statement = statement.order_by(Conversation.updated_at.desc())
    return list(session.scalars(statement).all())


def get_conversation(session: Session, conversation_id: UUID) -> Conversation:
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise ConversationNotFoundError
    return conversation


def archive_conversation(session: Session, conversation_id: UUID) -> Conversation:
    conversation = get_conversation(session, conversation_id)
    if conversation.archived_at is None:
        conversation.archived_at = datetime.now(UTC)
        session.commit()
        session.refresh(conversation)
    return conversation


def hard_delete_conversation(session: Session, conversation_id: UUID) -> None:
    conversation = get_conversation(session, conversation_id)
    session.delete(conversation)
    session.commit()


def update_conversation(
    session: Session, conversation_id: UUID, payload: ConversationUpdate
) -> Conversation:
    conversation = get_conversation(session, conversation_id)
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return conversation
    if "metadata" in update_data:
        update_data["metadata_"] = update_data.pop("metadata")
    for key, value in update_data.items():
        setattr(conversation, key, value)
    session.commit()
    session.refresh(conversation)
    return conversation
