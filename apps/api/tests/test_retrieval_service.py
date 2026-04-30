from collections.abc import Iterator
from uuid import UUID, uuid4
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.ai import EmbeddingRequest, EmbeddingResult
from app.ai.errors import ProviderConnectionError, ProviderTimeoutError
from app.core.config import Settings
from app.db.base import Base
from app.db.session import SessionFactory, build_session_factory, get_db_session
from app.main import create_app
from app.models import KnowledgeEmbedding, KnowledgeUnit, KnowledgeUnitTag, Project, Tag


@pytest.fixture
def retrieval_client(settings: Settings) -> Iterator[tuple[TestClient, SessionFactory]]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        future=True,
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, connection_record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_factory = build_session_factory(engine)
    app = create_app(settings)

    def override_db_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session

    with TestClient(app) as client:
        yield client, session_factory

    Base.metadata.drop_all(engine)
    engine.dispose()


class FakeRetrievalAdapter:
    def __init__(
        self,
        embedding: list[float] | None = None,
        exc: Exception | None = None,
    ) -> None:
        self.embedding = embedding or _vector(1.0)
        self.exc = exc
        self.calls: list[list[str]] = []

    def create_embeddings(self, request: EmbeddingRequest) -> EmbeddingResult:
        texts = list(request.texts)
        self.calls.append(texts)
        if self.exc is not None:
            raise self.exc
        return EmbeddingResult(
            embeddings=[self.embedding],
            model="provider-response-model",
        )


def test_semantic_search_empty_database_returns_no_results(
    retrieval_client: tuple[TestClient, SessionFactory],
):
    client, _session_factory = retrieval_client
    provider_id = _create_active_provider(client)
    fake_adapter = FakeRetrievalAdapter()

    with patch(
        "app.rag.retrieval.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post("/api/search/semantic", json={"query": "empty"})

    assert response.status_code == 200
    assert response.json() == {
        "provider_id": provider_id,
        "embedding_model": "embedding-model",
        "embedding_dimension": 1536,
        "results": [],
    }
    assert fake_adapter.calls == [["empty"]]


def test_semantic_search_requires_active_provider(
    retrieval_client: tuple[TestClient, SessionFactory],
):
    client, _session_factory = retrieval_client

    response = client.post("/api/search/semantic", json={"query": "missing provider"})

    assert response.status_code == 409
    assert response.json() == {"detail": "Active provider is not configured."}


def test_semantic_search_no_match_returns_empty_results(
    retrieval_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = retrieval_client
    provider_id = UUID(_create_active_provider(client))
    _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Orthogonal",
        chunk_text="unrelated chunk",
        embedding=_vector(0.0, 1.0),
    )
    fake_adapter = FakeRetrievalAdapter(embedding=_vector(1.0, 0.0))

    with patch(
        "app.rag.retrieval.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post(
            "/api/search/semantic",
            json={"query": "query", "min_score": 0.1},
        )

    assert response.status_code == 200
    assert response.json()["results"] == []


def test_semantic_search_returns_ranked_chunks_with_source_metadata(
    retrieval_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = retrieval_client
    provider_id = UUID(_create_active_provider(client))
    best_id = _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Best Match",
        chunk_text="best chunk",
        embedding=_vector(1.0, 0.0),
        metadata={"kind": "note"},
    )
    _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Second Match",
        chunk_text="second chunk",
        embedding=_vector(0.5, 0.5),
    )
    _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Below Threshold",
        chunk_text="ignored chunk",
        embedding=_vector(0.0, 1.0),
    )
    fake_adapter = FakeRetrievalAdapter(embedding=_vector(1.0, 0.0))

    with patch(
        "app.rag.retrieval.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post(
            "/api/search/semantic",
            json={"query": "rank me", "top_k": 2, "min_score": 0.1},
        )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [result["chunk_text"] for result in results] == [
        "best chunk",
        "second chunk",
    ]
    assert results[0]["knowledge_unit_id"] == str(best_id)
    assert results[0]["score"] == pytest.approx(1.0)
    assert results[1]["score"] == pytest.approx(0.70710678)
    assert "embedding" not in results[0]
    assert results[0]["source"]["title"] == "Best Match"
    assert results[0]["source"]["metadata"] == {"kind": "note"}
    assert results[0]["source"]["tags"] == []


def test_semantic_search_project_filter_limits_results(
    retrieval_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = retrieval_client
    provider_id = UUID(_create_active_provider(client))
    first_project_id = _insert_project(session_factory, "First Project")
    second_project_id = _insert_project(session_factory, "Second Project")
    _insert_retrieval_item(
        session_factory,
        provider_id,
        title="First Project Note",
        chunk_text="first project chunk",
        embedding=_vector(1.0),
        project_id=first_project_id,
    )
    second_knowledge_id = _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Second Project Note",
        chunk_text="second project chunk",
        embedding=_vector(1.0),
        project_id=second_project_id,
    )
    fake_adapter = FakeRetrievalAdapter(embedding=_vector(1.0))

    with patch(
        "app.rag.retrieval.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post(
            "/api/search/semantic",
            json={"query": "project", "project_id": str(second_project_id)},
        )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [result["knowledge_unit_id"] for result in results] == [
        str(second_knowledge_id)
    ]
    assert results[0]["source"]["project_id"] == str(second_project_id)


def test_semantic_search_tag_filter_limits_results(
    retrieval_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = retrieval_client
    provider_id = UUID(_create_active_provider(client))
    python_tag_id = _insert_tag(session_factory, name="Python", slug="python")
    research_tag_id = _insert_tag(session_factory, name="Research", slug="research")
    python_knowledge_id = _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Python Note",
        chunk_text="python chunk",
        embedding=_vector(1.0),
        tag_ids=[python_tag_id],
    )
    _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Research Note",
        chunk_text="research chunk",
        embedding=_vector(1.0),
        tag_ids=[research_tag_id],
    )
    fake_adapter = FakeRetrievalAdapter(embedding=_vector(1.0))

    with patch(
        "app.rag.retrieval.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post(
            "/api/search/semantic",
            json={"query": "tag", "tag_slugs": ["python"]},
        )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [result["knowledge_unit_id"] for result in results] == [
        str(python_knowledge_id)
    ]
    assert results[0]["source"]["tags"][0]["slug"] == "python"


@pytest.mark.parametrize(
    ("provider_error", "expected_status", "expected_detail"),
    [
        (
            ProviderTimeoutError(),
            504,
            "Provider request timed out while creating query embedding.",
        ),
        (
            ProviderConnectionError(),
            502,
            "Provider failed while creating query embedding.",
        ),
    ],
)
def test_semantic_search_maps_provider_errors(
    retrieval_client: tuple[TestClient, SessionFactory],
    provider_error: Exception,
    expected_status: int,
    expected_detail: str,
):
    client, _session_factory = retrieval_client
    _create_active_provider(client)
    fake_adapter = FakeRetrievalAdapter(exc=provider_error)

    with patch(
        "app.rag.retrieval.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post("/api/search/semantic", json={"query": "failure"})

    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}


def _create_active_provider(client: TestClient) -> str:
    response = client.post(
        "/api/providers",
        json={
            "name": f"Provider {uuid4()}",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def _insert_project(
    session_factory: SessionFactory,
    name: str,
) -> UUID:
    project_id = uuid4()
    with session_factory() as session:
        session.add(Project(id=project_id, name=name))
        session.commit()
    return project_id


def _insert_tag(
    session_factory: SessionFactory,
    *,
    name: str,
    slug: str,
) -> UUID:
    tag_id = uuid4()
    with session_factory() as session:
        session.add(Tag(id=tag_id, name=name, slug=slug))
        session.commit()
    return tag_id


def _insert_retrieval_item(
    session_factory: SessionFactory,
    provider_id: UUID,
    *,
    title: str,
    chunk_text: str,
    embedding: list[float],
    project_id: UUID | None = None,
    tag_ids: list[UUID] | None = None,
    metadata: dict[str, object] | None = None,
) -> UUID:
    knowledge_id = uuid4()
    with session_factory() as session:
        knowledge = KnowledgeUnit(
            id=knowledge_id,
            project_id=project_id,
            title=title,
            content=f"{chunk_text} full content",
            metadata_=metadata or {},
        )
        session.add(knowledge)
        for tag_id in tag_ids or []:
            session.add(
                KnowledgeUnitTag(
                    knowledge_unit_id=knowledge_id,
                    tag_id=tag_id,
                )
            )
        session.add(
            KnowledgeEmbedding(
                id=uuid4(),
                knowledge_unit_id=knowledge_id,
                provider_id=provider_id,
                embedding_model="embedding-model",
                embedding_dimension=1536,
                chunk_index=0,
                chunk_text=chunk_text,
                content_hash=f"hash-{uuid4()}",
                embedding=embedding,
            )
        )
        session.commit()
    return knowledge_id


def _vector(first: float, second: float = 0.0) -> list[float]:
    vector = [0.0] * 1536
    vector[0] = first
    vector[1] = second
    return vector
