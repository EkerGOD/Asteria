from __future__ import annotations

import json
import time
from collections.abc import Iterator
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.ai import (
    ChatCompletionMessage,
    ChatCompletionRequest,
    OpenAICompatibleProviderAdapter,
    ProviderAdapterError,
    ProviderAuthError,
    ProviderConnectionError,
    ProviderHTTPStatusError,
    ProviderMalformedResponseError,
    ProviderTimeoutError,
)
from app.ai.types import TokenUsage
from app.core.config import Settings
from app.models import AIProvider, Message
from app.schemas.chat import ChatSendRequest
from app.schemas.message import MessageCreate, MessageResponse
from app.services.conversations import get_conversation
from app.services.embeddings import ActiveProviderNotConfiguredError
from app.services.messages import append_message
from app.services.model_roles import resolve_chat_model_role


@dataclass(frozen=True)
class ChatSendResult:
    user_message: Message
    assistant_message: Message
    provider_id: UUID
    chat_model: str
    token_usage: TokenUsage | None = None
    response_delay_ms: int | None = None


@dataclass(frozen=True)
class ChatStreamContext:
    user_message: Message
    provider: AIProvider
    chat_model: str
    content: str


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

    provider, chat_model = _resolve_chat_provider(session)

    adapter = OpenAICompatibleProviderAdapter.from_provider(
        provider,
        settings,
        chat_model=chat_model,
    )
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


def prepare_stream_message(
    session: Session,
    payload: ChatSendRequest,
) -> ChatStreamContext:
    conversation = get_conversation(session, payload.conversation_id)

    user_message = append_message(
        session,
        conversation.id,
        MessageCreate(content=payload.content),
    )
    provider, chat_model = _resolve_chat_provider(session)

    return ChatStreamContext(
        user_message=user_message,
        provider=provider,
        chat_model=chat_model,
        content=payload.content,
    )


def stream_message_events(
    session: Session,
    context: ChatStreamContext,
    settings: Settings,
) -> Iterator[str]:
    yield _sse_event(
        "user_message",
        {"message": MessageResponse.model_validate(context.user_message).model_dump(mode="json")},
    )

    content_parts: list[str] = []
    model_name = context.chat_model
    token_usage: TokenUsage | None = None
    start_time = time.monotonic()

    try:
        adapter = OpenAICompatibleProviderAdapter.from_provider(
            context.provider,
            settings,
            chat_model=context.chat_model,
        )
        for chunk in adapter.create_chat_completion_stream(
            ChatCompletionRequest(
                messages=[
                    ChatCompletionMessage(role="user", content=context.content),
                ]
            )
        ):
            if chunk.model:
                model_name = chunk.model
            if chunk.usage is not None:
                token_usage = chunk.usage
            if not chunk.content_delta:
                continue
            content_parts.append(chunk.content_delta)
            yield _sse_event("token", {"content": chunk.content_delta})

        assistant_content = "".join(content_parts).strip()
        if not assistant_content:
            raise ProviderMalformedResponseError

        assistant_message = _persist_streamed_assistant_message(
            session,
            conversation_id=context.user_message.conversation_id,
            provider_id=context.provider.id,
            content=assistant_content,
            model_name=model_name,
            token_usage=token_usage,
            stream_interrupted=False,
        )
        response_delay_ms = int((time.monotonic() - start_time) * 1000)
        yield _sse_event(
            "assistant_message",
            {
                "message": MessageResponse.model_validate(assistant_message).model_dump(mode="json"),
                "provider_id": str(context.provider.id),
                "chat_model": model_name,
                "token_usage": _token_usage_payload(token_usage),
                "response_delay_ms": response_delay_ms,
            },
        )
        yield _sse_event("done", {"ok": True})
    except ProviderAdapterError as exc:
        assistant_content = "".join(content_parts).strip()
        if assistant_content:
            assistant_message = _persist_streamed_assistant_message(
                session,
                conversation_id=context.user_message.conversation_id,
                provider_id=context.provider.id,
                content=assistant_content,
                model_name=model_name,
                token_usage=token_usage,
                stream_interrupted=True,
            )
            yield _sse_event(
                "assistant_message",
                {
                    "message": MessageResponse.model_validate(assistant_message).model_dump(mode="json"),
                    "provider_id": str(context.provider.id),
                    "chat_model": model_name,
                    "token_usage": _token_usage_payload(token_usage),
                    "response_delay_ms": int((time.monotonic() - start_time) * 1000),
                    "stream_interrupted": True,
                },
            )
        yield _sse_event(
            "error",
            {"message": _stream_error_message(exc), "partial": bool(assistant_content)},
        )


def _resolve_chat_provider(session: Session) -> tuple[AIProvider, str]:
    configured_chat_role = resolve_chat_model_role(session)
    if configured_chat_role is not None:
        return configured_chat_role

    raise ActiveProviderNotConfiguredError


def _persist_streamed_assistant_message(
    session: Session,
    *,
    conversation_id: UUID,
    provider_id: UUID,
    content: str,
    model_name: str,
    token_usage: TokenUsage | None,
    stream_interrupted: bool,
) -> Message:
    assistant_message = Message(
        id=uuid4(),
        conversation_id=conversation_id,
        provider_id=provider_id,
        role="assistant",
        content=content,
        model=model_name,
        token_count=token_usage.total_tokens if token_usage is not None else None,
        retrieval_metadata={"stream_interrupted": stream_interrupted}
        if stream_interrupted
        else {},
    )
    session.add(assistant_message)
    session.commit()
    session.refresh(assistant_message)
    return assistant_message


def _token_usage_payload(token_usage: TokenUsage | None) -> dict[str, int | None] | None:
    if token_usage is None:
        return None
    return {
        "prompt_tokens": token_usage.prompt_tokens,
        "completion_tokens": token_usage.completion_tokens,
        "total_tokens": token_usage.total_tokens,
    }


def _sse_event(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _stream_error_message(exc: ProviderAdapterError) -> str:
    if isinstance(exc, ProviderTimeoutError):
        return "Provider request timed out while streaming response."
    if isinstance(exc, ProviderConnectionError):
        return "Provider failed while streaming response."
    if isinstance(exc, ProviderAuthError):
        return "Provider authentication failed."
    if isinstance(exc, ProviderHTTPStatusError):
        if exc.status_code is not None:
            return f"Provider returned HTTP {exc.status_code}."
        return "Provider returned an error status."
    return "Provider response could not be streamed."
