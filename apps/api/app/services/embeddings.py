from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.ai import (
    EmbeddingRequest,
    OpenAICompatibleProviderAdapter,
    ProviderMalformedResponseError,
)
from app.models import AIProvider, KnowledgeEmbedding, KnowledgeUnit
from app.services.model_roles import resolve_embedding_model_role


DEFAULT_CHUNK_SIZE = 1200
DEFAULT_CHUNK_OVERLAP = 120


class ActiveProviderNotConfiguredError(Exception):
    """Raised when embedding refresh requires an active provider."""


@dataclass(frozen=True)
class KnowledgeEmbeddingRefreshSummary:
    knowledge_unit_id: UUID
    provider_id: UUID
    embedding_model: str
    embedding_dimension: int
    chunk_count: int
    created_count: int
    reused_count: int
    deleted_count: int


@dataclass(frozen=True)
class _EmbeddingChunk:
    index: int
    text: str
    content_hash: str


def chunk_knowledge_content(
    content: str,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive.")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and smaller than chunk_size.")

    normalized = normalize_embedding_text(content)
    if not normalized:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(normalized):
            break
        start = end - overlap
    return chunks


def normalize_embedding_text(content: str) -> str:
    return " ".join(content.split())


def hash_embedding_content(
    normalized_chunk: str,
    provider_id: UUID,
    embedding_model: str,
    embedding_dimension: int,
) -> str:
    hash_input = "\0".join(
        [
            normalized_chunk,
            str(provider_id),
            embedding_model,
            str(embedding_dimension),
        ]
    )
    return sha256(hash_input.encode("utf-8")).hexdigest()


def get_embedding_provider(session: Session) -> AIProvider | None:
    role = resolve_embedding_model_role(session)
    if role is not None and role.embedding_dimension is not None:
        pass
    statement = select(AIProvider).order_by(AIProvider.created_at.asc()).limit(1)
    return session.scalar(statement)


def resolve_embedding_model_info(
    session: Session,
) -> tuple[str, int]:
    """Resolve embedding model name and dimension from model_role or provider fallback."""
    role = resolve_embedding_model_role(session)
    if role is not None and role.embedding_dimension is not None:
        return role.model_name, role.embedding_dimension
    provider = get_embedding_provider(session)
    if provider is not None:
        return provider.embedding_model, provider.embedding_dimension
    raise ActiveProviderNotConfiguredError


def refresh_knowledge_embeddings(
    session: Session,
    knowledge: KnowledgeUnit,
) -> KnowledgeEmbeddingRefreshSummary:
    provider = get_embedding_provider(session)
    if provider is None:
        raise ActiveProviderNotConfiguredError
    model_name, dimension = resolve_embedding_model_info(session)
    try:
        summary = _refresh_knowledge_embeddings_with_config(
            session, knowledge, provider, model_name, dimension
        )
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(knowledge)
    return summary


def refresh_knowledge_embeddings_if_configured(
    session: Session,
    knowledge: KnowledgeUnit,
) -> KnowledgeEmbeddingRefreshSummary | None:
    provider = get_embedding_provider(session)
    if provider is None:
        return None
    model_name, dimension = resolve_embedding_model_info(session)
    return _refresh_knowledge_embeddings_with_config(
        session, knowledge, provider, model_name, dimension
    )


def delete_knowledge_embeddings(session: Session, knowledge_unit_id: UUID) -> int:
    result = session.execute(
        delete(KnowledgeEmbedding).where(
            KnowledgeEmbedding.knowledge_unit_id == knowledge_unit_id
        )
    )
    return result.rowcount or 0


def _refresh_knowledge_embeddings_with_config(
    session: Session,
    knowledge: KnowledgeUnit,
    provider: AIProvider,
    embedding_model: str,
    embedding_dimension: int,
) -> KnowledgeEmbeddingRefreshSummary:
    chunks = _build_embedding_chunks(
        knowledge.content, provider.id, embedding_model, embedding_dimension
    )
    existing_embeddings = _list_existing_embeddings(session, knowledge.id)
    reusable_embeddings = _reusable_embeddings(
        existing_embeddings, chunks, provider.id, embedding_model, embedding_dimension
    )
    reusable_ids = {embedding.id for embedding in reusable_embeddings.values()}
    stale_embeddings = [
        embedding
        for embedding in existing_embeddings
        if embedding.id not in reusable_ids
    ]

    missing_chunks = [
        chunk
        for chunk in chunks
        if (chunk.index, chunk.content_hash) not in reusable_embeddings
    ]
    vectors = _create_missing_embeddings(provider, missing_chunks, embedding_dimension)

    for chunk, vector in zip(missing_chunks, vectors, strict=True):
        session.add(
            KnowledgeEmbedding(
                id=uuid4(),
                knowledge_unit_id=knowledge.id,
                provider_id=provider.id,
                embedding_model=embedding_model,
                embedding_dimension=embedding_dimension,
                chunk_index=chunk.index,
                chunk_text=chunk.text,
                content_hash=chunk.content_hash,
                embedding=vector,
            )
        )

    for embedding in stale_embeddings:
        session.delete(embedding)

    return KnowledgeEmbeddingRefreshSummary(
        knowledge_unit_id=knowledge.id,
        provider_id=provider.id,
        embedding_model=embedding_model,
        embedding_dimension=embedding_dimension,
        chunk_count=len(chunks),
        created_count=len(missing_chunks),
        reused_count=len(reusable_embeddings),
        deleted_count=len(stale_embeddings),
    )


def _build_embedding_chunks(
    content: str,
    provider_id: UUID,
    embedding_model: str,
    embedding_dimension: int,
) -> list[_EmbeddingChunk]:
    chunks = chunk_knowledge_content(content)
    return [
        _EmbeddingChunk(
            index=index,
            text=chunk_text,
            content_hash=hash_embedding_content(
                chunk_text,
                provider_id,
                embedding_model,
                embedding_dimension,
            ),
        )
        for index, chunk_text in enumerate(chunks)
    ]


def _list_existing_embeddings(
    session: Session,
    knowledge_unit_id: UUID,
) -> list[KnowledgeEmbedding]:
    statement = select(KnowledgeEmbedding).where(
        KnowledgeEmbedding.knowledge_unit_id == knowledge_unit_id
    )
    return list(session.scalars(statement).all())


def _reusable_embeddings(
    embeddings: list[KnowledgeEmbedding],
    chunks: list[_EmbeddingChunk],
    provider_id: UUID,
    embedding_model: str,
    embedding_dimension: int,
) -> dict[tuple[int, str], KnowledgeEmbedding]:
    expected_keys = {(chunk.index, chunk.content_hash) for chunk in chunks}
    reusable: dict[tuple[int, str], KnowledgeEmbedding] = {}

    for embedding in embeddings:
        key = (embedding.chunk_index, embedding.content_hash)
        if key not in expected_keys:
            continue
        if embedding.provider_id != provider_id:
            continue
        if embedding.embedding_model != embedding_model:
            continue
        if embedding.embedding_dimension != embedding_dimension:
            continue
        reusable[key] = embedding

    return reusable


def _create_missing_embeddings(
    provider: AIProvider,
    chunks: list[_EmbeddingChunk],
    embedding_dimension: int,
) -> list[list[float]]:
    if not chunks:
        return []

    adapter = OpenAICompatibleProviderAdapter.from_provider(provider)
    result = adapter.create_embeddings(
        EmbeddingRequest(texts=[chunk.text for chunk in chunks])
    )
    _validate_embedding_vectors(
        result.embeddings,
        expected_count=len(chunks),
        expected_dimension=embedding_dimension,
    )
    return result.embeddings


def _validate_embedding_vectors(
    embeddings: list[list[float]],
    *,
    expected_count: int,
    expected_dimension: int,
) -> None:
    if len(embeddings) != expected_count:
        raise ProviderMalformedResponseError(
            "Provider embedding count did not match request."
        )

    for embedding in embeddings:
        if len(embedding) != expected_dimension:
            raise ProviderMalformedResponseError(
                "Provider embedding dimension did not match configuration."
            )
