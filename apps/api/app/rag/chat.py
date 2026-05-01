from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.ai import (
    ChatCompletionMessage,
    ChatCompletionRequest,
    ChatCompletionResult,
    OpenAICompatibleProviderAdapter,
)
from app.models import AIProvider, Message
from app.rag.retrieval import RetrievalResult, retrieve_relevant_chunks
from app.schemas.message import MessageCreate
from app.schemas.rag import RAGAnswerRequest
from app.schemas.search import SemanticSearchResultResponse
from app.services.embeddings import ActiveProviderNotConfiguredError
from app.services.conversations import get_conversation
from app.services.messages import append_message


SYSTEM_PROMPT = (
    "You are Asteria's grounded knowledge assistant. Answer only from the "
    "provided knowledge context. If the context is empty or insufficient, say "
    "the knowledge base does not contain enough information. Do not invent "
    "sources. Cite source labels like [S1] when using context."
)


@dataclass(frozen=True)
class RAGAnswerResult:
    user_message: Message
    assistant_message: Message
    sources: list[RetrievalResult]
    provider_id: UUID
    chat_model: str
    embedding_model: str
    embedding_dimension: int


def answer_rag_chat(
    session: Session,
    payload: RAGAnswerRequest,
) -> RAGAnswerResult:
    conversation = get_conversation(session, payload.conversation_id)
    project_id = _resolve_project_id(payload, conversation.project_id)

    user_message = append_message(
        session,
        conversation.id,
        MessageCreate(content=payload.content),
    )

    retrieval = retrieve_relevant_chunks(
        session,
        payload.content,
        project_id=project_id,
        tag_slugs=payload.tag_slugs,
        top_k=payload.top_k,
        min_score=payload.min_score,
    )
    provider = session.get(AIProvider, retrieval.provider_id)
    if provider is None:
        raise ActiveProviderNotConfiguredError

    chat_result = _create_grounded_answer(
        provider,
        question=payload.content,
        sources=retrieval.results,
    )
    assistant_message = _persist_assistant_message(
        session,
        conversation.id,
        provider_id=provider.id,
        chat_result=chat_result,
        retrieval_metadata=build_retrieval_metadata(
            payload.content,
            tag_slugs=payload.tag_slugs,
            top_k=payload.top_k,
            min_score=payload.min_score,
            project_id=project_id,
            provider_id=retrieval.provider_id,
            embedding_model=retrieval.embedding_model,
            embedding_dimension=retrieval.embedding_dimension,
            sources=retrieval.results,
        ),
    )

    return RAGAnswerResult(
        user_message=user_message,
        assistant_message=assistant_message,
        sources=retrieval.results,
        provider_id=provider.id,
        chat_model=chat_result.model,
        embedding_model=retrieval.embedding_model,
        embedding_dimension=retrieval.embedding_dimension,
    )


def _resolve_project_id(
    payload: RAGAnswerRequest,
    conversation_project_id: UUID | None,
) -> UUID | None:
    if "project_id" in payload.model_fields_set:
        return payload.project_id
    return conversation_project_id


def _create_grounded_answer(
    provider: AIProvider,
    *,
    question: str,
    sources: list[RetrievalResult],
) -> ChatCompletionResult:
    adapter = OpenAICompatibleProviderAdapter.from_provider(provider)
    return adapter.create_chat_completion(
        ChatCompletionRequest(
            messages=[
                ChatCompletionMessage(role="system", content=SYSTEM_PROMPT),
                ChatCompletionMessage(
                    role="user",
                    content=build_grounded_user_prompt(question, sources),
                ),
            ]
        )
    )


def build_grounded_user_prompt(
    question: str,
    sources: list[RetrievalResult],
) -> str:
    context = "\n\n".join(
        _format_source_context(index, source)
        for index, source in enumerate(sources, start=1)
    )
    if not context:
        context = "No knowledge context was retrieved."

    return (
        f"Question:\n{question}\n\n"
        f"Knowledge context:\n{context}\n\n"
        "Instructions:\n"
        "Answer using only the knowledge context above. Cite source labels "
        "like [S1] when the context supports a claim. If the context is "
        "insufficient, say the knowledge base does not contain enough "
        "information."
    )


def _format_source_context(index: int, source: RetrievalResult) -> str:
    return (
        f"[S{index}]\n"
        f"Title: {source.source.title}\n"
        f"Knowledge ID: {source.knowledge_unit_id}\n"
        f"Chunk Index: {source.chunk_index}\n"
        f"Score: {source.score:.4f}\n"
        f"Content:\n{source.chunk_text}"
    )


def _persist_assistant_message(
    session: Session,
    conversation_id: UUID,
    *,
    provider_id: UUID,
    chat_result: ChatCompletionResult,
    retrieval_metadata: dict[str, Any],
) -> Message:
    assistant_message = Message(
        id=uuid4(),
        conversation_id=conversation_id,
        provider_id=provider_id,
        role="assistant",
        content=chat_result.content.strip(),
        model=chat_result.model,
        token_count=chat_result.token_count,
        retrieval_metadata=retrieval_metadata,
    )
    session.add(assistant_message)
    session.commit()
    session.refresh(assistant_message)
    return assistant_message


def build_retrieval_metadata(
    content: str,
    *,
    tag_slugs: list[str],
    top_k: int,
    min_score: float,
    project_id: UUID | None,
    provider_id: UUID,
    embedding_model: str,
    embedding_dimension: int,
    sources: list[RetrievalResult],
) -> dict[str, Any]:
    return {
        "query": content,
        "project_id": str(project_id) if project_id is not None else None,
        "tag_slugs": tag_slugs,
        "top_k": top_k,
        "min_score": min_score,
        "retrieval_provider_id": str(provider_id),
        "embedding_model": embedding_model,
        "embedding_dimension": embedding_dimension,
        "sources": [
            {
                "label": f"S{index}",
                **SemanticSearchResultResponse.model_validate(source).model_dump(
                    mode="json"
                ),
            }
            for index, source in enumerate(sources, start=1)
        ],
    }
