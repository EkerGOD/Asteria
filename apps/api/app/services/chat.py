from __future__ import annotations

import time
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.ai import ChatCompletionMessage, ChatCompletionRequest, OpenAICompatibleProviderAdapter
from app.ai.types import TokenUsage
from app.core.config import Settings
from app.models import Message
from app.schemas.message import MessageCreate
from app.schemas.chat import ChatSendRequest
from app.services.conversations import get_conversation
from app.services.embeddings import ActiveProviderNotConfiguredError
from app.services.messages import append_message
from app.services.providers import get_active_provider


@dataclass(frozen=True)
class ChatSendResult:
    user_message: Message
    assistant_message: Message
    provider_id: UUID
    chat_model: str
    token_usage: TokenUsage | None = None
    response_delay_ms: int | None = None


def send_message(
    session: Session,
    payload: ChatSendRequest,
    settings: Settings,
) -> ChatSendResult:
    conversation = get_conversation(session, payload.conversation_id)

    user_message = append_message(
        session,
        conversation.id,
        MessageCreate(content=payload.content),
    )

    provider = get_active_provider(session)
    if provider is None:
        raise ActiveProviderNotConfiguredError

    adapter = OpenAICompatibleProviderAdapter.from_provider(provider, settings)
    start_time = time.monotonic()
    chat_result = adapter.create_chat_completion(
        ChatCompletionRequest(
            messages=[
                ChatCompletionMessage(role="user", content=payload.content),
            ]
        )
    )
    response_delay_ms = int((time.monotonic() - start_time) * 1000)

    assistant_message = Message(
        id=uuid4(),
        conversation_id=conversation.id,
        provider_id=provider.id,
        role="assistant",
        content=chat_result.content.strip(),
        model=chat_result.model,
        token_count=chat_result.token_count,
    )
    session.add(assistant_message)
    session.commit()
    session.refresh(assistant_message)

    return ChatSendResult(
        user_message=user_message,
        assistant_message=assistant_message,
        provider_id=provider.id,
        chat_model=chat_result.model,
        token_usage=chat_result.usage,
        response_delay_ms=response_delay_ms,
    )
