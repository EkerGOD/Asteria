from __future__ import annotations

import json
import time
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any
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
from app.rag.chat import SYSTEM_PROMPT, build_grounded_user_prompt, build_retrieval_metadata
from app.rag.retrieval import (
    RetrievalSearchResponse,
    retrieve_relevant_chunks,
)
from app.schemas.chat import ChatSendRequest
from app.schemas.message import MessageCreate, MessageResponse
from app.schemas.search import SemanticSearchResultResponse
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
    sources: list[SemanticSearchResultResponse] | None = None
    embedding_model: str | None = None
    embedding_dimension: int | None = None


@dataclass(frozen=True)
class ChatStreamContext:
    user_message: Message
    provider: AIProvider
    chat_model: str
    content: str
    retrieval: RetrievalSearchResponse | None = None


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

    retrieval, retrieval_metadata = _maybe_retrieve(
        session,
        payload=payload,
        fallback_project_id=conversation.project_id,
    )

    provider, chat_model = _resolve_chat_provider(session)

    messages: list[ChatCompletionMessage]
    if retrieval is not None:
        messages = [
            ChatCompletionMessage(role="system", content=SYSTEM_PROMPT),
            ChatCompletionMessage(
                role="user",
                content=build_grounded_user_prompt(payload.content, retrieval.results),
            ),
        ]
    else:
        messages = [
            ChatCompletionMessage(role="user", content=payload.content),
        ]

    adapter = OpenAICompatibleProviderAdapter.from_provider(
        provider,
        settings,
        chat_model=chat_model,
    )
    start_time = time.monotonic()
    chat_result = adapter.create_chat_completion(
        ChatCompletionRequest(messages=messages)
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
        retrieval_metadata=retrieval_metadata,
    )
    session.add(assistant_message)
    session.commit()
    session.refresh(assistant_message)

    sources: list[SemanticSearchResultResponse] | None = None
    embedding_model: str | None = None
    embedding_dimension: int | None = None
    if retrieval is not None:
        sources = [
            SemanticSearchResultResponse.model_validate(r) for r in retrieval.results
        ]
        embedding_model = retrieval.embedding_model
        embedding_dimension = retrieval.embedding_dimension

    return ChatSendResult(
        user_message=user_message,
        assistant_message=assistant_message,
        provider_id=provider.id,
        chat_model=chat_result.model,
        token_usage=chat_result.usage,
        response_delay_ms=response_delay_ms,
        sources=sources,
        embedding_model=embedding_model,
        embedding_dimension=embedding_dimension,
    )


def _maybe_retrieve(
    session: Session,
    *,
    payload: ChatSendRequest,
    fallback_project_id: UUID | None,
) -> tuple[RetrievalSearchResponse | None, dict[str, Any]]:
    if not payload.enable_rag:
        return None, {}

    project_id = (
        payload.project_id
        if payload.project_id is not None
        else fallback_project_id
    )

    retrieval = retrieve_relevant_chunks(
        session,
        payload.content,
        project_id=project_id,
        tag_slugs=payload.tag_slugs,
        top_k=payload.top_k,
        min_score=payload.min_score,
    )

    retrieval_metadata = build_retrieval_metadata(
        payload.content,
        tag_slugs=payload.tag_slugs,
        top_k=payload.top_k,
        min_score=payload.min_score,
        project_id=project_id,
        provider_id=retrieval.provider_id,
        embedding_model=retrieval.embedding_model,
        embedding_dimension=retrieval.embedding_dimension,
        sources=retrieval.results,
    )

    return retrieval, retrieval_metadata


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

    retrieval, _ = _maybe_retrieve(
        session,
        payload=payload,
        fallback_project_id=conversation.project_id,
    )

    return ChatStreamContext(
        user_message=user_message,
        provider=provider,
        chat_model=chat_model,
        content=payload.content,
        retrieval=retrieval,
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

    stream_messages: list[ChatCompletionMessage]
    retrieval_metadata: dict[str, Any]
    if context.retrieval is not None:
        stream_messages = [
            ChatCompletionMessage(role="system", content=SYSTEM_PROMPT),
            ChatCompletionMessage(
                role="user",
                content=build_grounded_user_prompt(
                    context.content, context.retrieval.results
                ),
            ),
        ]
        retrieval_metadata = build_retrieval_metadata(
            context.content,
            tag_slugs=[],
            top_k=5,
            min_score=0.0,
            project_id=None,
            provider_id=context.retrieval.provider_id,
            embedding_model=context.retrieval.embedding_model,
            embedding_dimension=context.retrieval.embedding_dimension,
            sources=context.retrieval.results,
        )
    else:
        stream_messages = [
            ChatCompletionMessage(role="user", content=context.content),
        ]
        retrieval_metadata = {}

    try:
        adapter = OpenAICompatibleProviderAdapter.from_provider(
            context.provider,
            settings,
            chat_model=context.chat_model,
        )
        for chunk in adapter.create_chat_completion_stream(
            ChatCompletionRequest(messages=stream_messages)
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
            retrieval_metadata=retrieval_metadata,
        )
        response_delay_ms = int((time.monotonic() - start_time) * 1000)
        done_data: dict[str, object] = {
            "ok": True,
        }
        if context.retrieval is not None:
            done_data["sources"] = [
                SemanticSearchResultResponse.model_validate(r).model_dump(mode="json")
                for r in context.retrieval.results
            ]
            done_data["embedding_model"] = context.retrieval.embedding_model
            done_data["embedding_dimension"] = context.retrieval.embedding_dimension
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
        yield _sse_event("done", done_data)
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
                retrieval_metadata=retrieval_metadata,
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
    retrieval_metadata: dict[str, Any] | None = None,
) -> Message:
    metadata: dict[str, Any] = dict(retrieval_metadata) if retrieval_metadata else {}
    if stream_interrupted:
        metadata["stream_interrupted"] = True
    assistant_message = Message(
        id=uuid4(),
        conversation_id=conversation_id,
        provider_id=provider_id,
        role="assistant",
        content=content,
        model=model_name,
        token_count=token_usage.total_tokens if token_usage is not None else None,
        retrieval_metadata=metadata,
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
