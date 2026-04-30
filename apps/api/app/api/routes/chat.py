from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import get_db_session
from app.schemas.chat import ChatSendRequest, ChatSendResponse, TokenUsageSchema
from app.schemas.message import MessageResponse
from app.services.chat import send_message
from app.services.conversations import ConversationNotFoundError
from app.services.embeddings import ActiveProviderNotConfiguredError

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/send", response_model=ChatSendResponse, status_code=status.HTTP_201_CREATED)
def chat_send_endpoint(
    payload: ChatSendRequest,
    request: Request,
    session: Session = Depends(get_db_session),
) -> ChatSendResponse:
    settings: Settings = request.app.state.settings
    try:
        result = send_message(session, payload, settings)
    except ConversationNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    except ActiveProviderNotConfiguredError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active provider configured. Activate a provider in Settings.",
        )
    token_usage = (
        TokenUsageSchema(**vars(result.token_usage))
        if result.token_usage is not None
        else None
    )
    return ChatSendResponse(
        user_message=MessageResponse.model_validate(result.user_message),
        assistant_message=MessageResponse.model_validate(result.assistant_message),
        provider_id=result.provider_id,
        chat_model=result.chat_model,
        token_usage=token_usage,
        response_delay_ms=result.response_delay_ms,
    )
