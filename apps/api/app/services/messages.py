from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Message
from app.schemas.message import MessageCreate
from app.services.conversations import ConversationNotFoundError, get_conversation


class MessageNotFoundError(Exception):
    """Raised when a message id does not exist."""


def append_message(
    session: Session,
    conversation_id: UUID,
    payload: MessageCreate,
) -> Message:
    get_conversation(session, conversation_id)
    message = Message(id=uuid4(), conversation_id=conversation_id, **payload.model_dump())
    session.add(message)
    session.commit()
    session.refresh(message)
    return message


def list_messages(
    session: Session,
    conversation_id: UUID,
) -> list[Message]:
    get_conversation(session, conversation_id)
    statement = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list(session.scalars(statement).all())
