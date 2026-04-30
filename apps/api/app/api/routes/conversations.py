from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.schemas.message import MessageCreate, MessageResponse
from app.services.conversations import (
    ConversationNotFoundError,
    archive_conversation,
    create_conversation,
    get_conversation,
    hard_delete_conversation,
    list_conversations,
)
from app.services.messages import append_message, list_messages

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation_endpoint(
    payload: ConversationCreate,
    session: Session = Depends(get_db_session),
) -> ConversationResponse:
    return ConversationResponse.model_validate(create_conversation(session, payload))


@router.get("", response_model=list[ConversationResponse])
def list_conversations_endpoint(
    project_id: UUID | None = Query(default=None),
    include_archived: bool = Query(default=False),
    session: Session = Depends(get_db_session),
) -> list[ConversationResponse]:
    return [
        ConversationResponse.model_validate(conv)
        for conv in list_conversations(
            session,
            project_id=project_id,
            include_archived=include_archived,
        )
    ]


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation_endpoint(
    conversation_id: UUID,
    session: Session = Depends(get_db_session),
) -> ConversationResponse:
    try:
        return ConversationResponse.model_validate(get_conversation(session, conversation_id))
    except ConversationNotFoundError as exc:
        raise _conversation_not_found() from exc


@router.delete("/{conversation_id}")
def delete_conversation_endpoint(
    conversation_id: UUID,
    permanent: bool = Query(default=False),
    session: Session = Depends(get_db_session),
):
    try:
        if permanent:
            hard_delete_conversation(session, conversation_id)
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        return ConversationResponse.model_validate(archive_conversation(session, conversation_id))
    except ConversationNotFoundError as exc:
        raise _conversation_not_found() from exc


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def append_message_endpoint(
    conversation_id: UUID,
    payload: MessageCreate,
    session: Session = Depends(get_db_session),
) -> MessageResponse:
    try:
        return MessageResponse.model_validate(
            append_message(session, conversation_id, payload)
        )
    except ConversationNotFoundError as exc:
        raise _conversation_not_found() from exc


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages_endpoint(
    conversation_id: UUID,
    session: Session = Depends(get_db_session),
) -> list[MessageResponse]:
    try:
        return [
            MessageResponse.model_validate(msg)
            for msg in list_messages(session, conversation_id)
        ]
    except ConversationNotFoundError as exc:
        raise _conversation_not_found() from exc


def _conversation_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Conversation not found.",
    )
