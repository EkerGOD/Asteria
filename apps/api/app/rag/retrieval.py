from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import sqrt
from typing import Any
from uuid import UUID

from sqlalchemy import exists, literal, select
from sqlalchemy.orm import Session, selectinload

from app.ai import (
    EmbeddingRequest,
    OpenAICompatibleProviderAdapter,
    ProviderMalformedResponseError,
)
from app.db.types import Vector
from app.models import (
    AIProvider,
    KnowledgeEmbedding,
    KnowledgeUnit,
    KnowledgeUnitTag,
    Tag,
)
from app.schemas.tag import TagResponse
from app.services.embeddings import (
    ActiveProviderNotConfiguredError,
    get_active_embedding_provider,
)


@dataclass(frozen=True)
class RetrievalKnowledgeSource:
    id: UUID
    project_id: UUID | None
    title: str
    source_type: str
    source_uri: str | None
    status: str
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    tags: list[TagResponse]


@dataclass(frozen=True)
class RetrievalResult:
    embedding_id: UUID
    knowledge_unit_id: UUID
    chunk_index: int
    chunk_text: str
    score: float
    source: RetrievalKnowledgeSource


@dataclass(frozen=True)
class RetrievalSearchResponse:
    provider_id: UUID
    embedding_model: str
    embedding_dimension: int
    results: list[RetrievalResult]


def retrieve_relevant_chunks(
    session: Session,
    query: str,
    *,
    project_id: UUID | None = None,
    tag_slugs: list[str] | None = None,
    top_k: int = 5,
    min_score: float = 0.0,
) -> RetrievalSearchResponse:
    provider = get_active_embedding_provider(session)
    if provider is None:
        raise ActiveProviderNotConfiguredError

    query_embedding = _create_query_embedding(provider, query)
    results = _search_embeddings(
        session,
        provider,
        query_embedding,
        project_id=project_id,
        tag_slugs=tag_slugs or None,
        top_k=top_k,
        min_score=min_score,
    )

    return RetrievalSearchResponse(
        provider_id=provider.id,
        embedding_model=provider.embedding_model,
        embedding_dimension=provider.embedding_dimension,
        results=results,
    )


def _create_query_embedding(provider: AIProvider, query: str) -> list[float]:
    adapter = OpenAICompatibleProviderAdapter.from_provider(provider)
    result = adapter.create_embeddings(EmbeddingRequest(texts=[query]))

    if len(result.embeddings) != 1:
        raise ProviderMalformedResponseError(
            "Provider embedding count did not match request."
        )

    embedding = result.embeddings[0]
    if len(embedding) != provider.embedding_dimension:
        raise ProviderMalformedResponseError(
            "Provider embedding dimension did not match configuration."
        )

    return embedding


def _search_embeddings(
    session: Session,
    provider: AIProvider,
    query_embedding: list[float],
    *,
    project_id: UUID | None,
    tag_slugs: list[str] | None,
    top_k: int,
    min_score: float,
) -> list[RetrievalResult]:
    if session.get_bind().dialect.name == "postgresql":
        return _search_embeddings_postgresql(
            session,
            provider,
            query_embedding,
            project_id=project_id,
            tag_slugs=tag_slugs,
            top_k=top_k,
            min_score=min_score,
        )

    return _search_embeddings_in_memory(
        session,
        provider,
        query_embedding,
        project_id=project_id,
        tag_slugs=tag_slugs,
        top_k=top_k,
        min_score=min_score,
    )


def _base_embedding_statement(provider: AIProvider):
    statement = (
        select(KnowledgeEmbedding)
        .join(KnowledgeEmbedding.knowledge_unit)
        .options(
            selectinload(KnowledgeEmbedding.knowledge_unit).selectinload(
                KnowledgeUnit.tags
            )
        )
        .where(
            KnowledgeEmbedding.provider_id == provider.id,
            KnowledgeEmbedding.embedding_model == provider.embedding_model,
            KnowledgeEmbedding.embedding_dimension == provider.embedding_dimension,
            KnowledgeUnit.status != "archived",
        )
    )
    return statement


def _apply_filters(
    statement,
    *,
    project_id: UUID | None,
    tag_slugs: list[str] | None,
):
    if project_id is not None:
        statement = statement.where(KnowledgeUnit.project_id == project_id)

    if tag_slugs:
        tag_match = (
            select(KnowledgeUnitTag.knowledge_unit_id)
            .join(Tag, KnowledgeUnitTag.tag_id == Tag.id)
            .where(
                KnowledgeUnitTag.knowledge_unit_id == KnowledgeUnit.id,
                Tag.slug.in_(tag_slugs),
            )
        )
        statement = statement.where(exists(tag_match))

    return statement


def _search_embeddings_postgresql(
    session: Session,
    provider: AIProvider,
    query_embedding: list[float],
    *,
    project_id: UUID | None,
    tag_slugs: list[str] | None,
    top_k: int,
    min_score: float,
) -> list[RetrievalResult]:
    query_vector = literal(query_embedding, type_=Vector(provider.embedding_dimension))
    distance = KnowledgeEmbedding.embedding.op("<=>")(query_vector)
    score = (1.0 - distance).label("score")

    statement = _apply_filters(
        _base_embedding_statement(provider),
        project_id=project_id,
        tag_slugs=tag_slugs,
    )
    statement = (
        statement.add_columns(score)
        .where(distance <= 1.0 - min_score)
        .order_by(distance.asc(), KnowledgeEmbedding.chunk_index.asc())
        .limit(top_k)
    )

    rows = session.execute(statement).all()
    return [_to_result(embedding, float(row_score)) for embedding, row_score in rows]


def _search_embeddings_in_memory(
    session: Session,
    provider: AIProvider,
    query_embedding: list[float],
    *,
    project_id: UUID | None,
    tag_slugs: list[str] | None,
    top_k: int,
    min_score: float,
) -> list[RetrievalResult]:
    statement = _apply_filters(
        _base_embedding_statement(provider),
        project_id=project_id,
        tag_slugs=tag_slugs,
    )
    embeddings = list(session.scalars(statement).all())

    results = [
        _to_result(embedding, _cosine_similarity(query_embedding, embedding.embedding))
        for embedding in embeddings
    ]
    results = [result for result in results if result.score >= min_score]
    results.sort(
        key=lambda result: (
            -result.score,
            result.source.title.lower(),
            result.chunk_index,
        )
    )
    return results[:top_k]


def _cosine_similarity(
    left: list[float],
    right_value: list[float] | str,
) -> float:
    right = _parse_vector_value(right_value)
    if len(left) != len(right):
        raise ProviderMalformedResponseError(
            "Stored embedding dimension did not match query embedding."
        )

    left_norm = sqrt(sum(value * value for value in left))
    right_norm = sqrt(sum(value * value for value in right))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0

    dot_product = sum(
        left_value * right_value
        for left_value, right_value in zip(left, right, strict=True)
    )
    return dot_product / (left_norm * right_norm)


def _parse_vector_value(value: list[float] | str) -> list[float]:
    if isinstance(value, list):
        return [float(item) for item in value]
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            inner = stripped[1:-1].strip()
            if not inner:
                return []
            return [float(item) for item in inner.split(",")]
    raise ProviderMalformedResponseError("Stored embedding was malformed.")


def _to_result(embedding: KnowledgeEmbedding, score: float) -> RetrievalResult:
    knowledge = embedding.knowledge_unit
    return RetrievalResult(
        embedding_id=embedding.id,
        knowledge_unit_id=knowledge.id,
        chunk_index=embedding.chunk_index,
        chunk_text=embedding.chunk_text,
        score=score,
        source=RetrievalKnowledgeSource(
            id=knowledge.id,
            project_id=knowledge.project_id,
            title=knowledge.title,
            source_type=knowledge.source_type,
            source_uri=knowledge.source_uri,
            status=knowledge.status,
            metadata=knowledge.metadata_,
            created_at=knowledge.created_at,
            updated_at=knowledge.updated_at,
            archived_at=knowledge.archived_at,
            tags=[TagResponse.model_validate(tag) for tag in knowledge.tags],
        ),
    )
