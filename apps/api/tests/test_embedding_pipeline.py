from collections.abc import Iterator
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.ai import EmbeddingRequest, EmbeddingResult
from app.ai.errors import ProviderConnectionError, ProviderTimeoutError
from app.core.config import Settings
from app.db.base import Base
from app.db.session import SessionFactory, build_session_factory, get_db_session
from app.main import create_app
from app.models import KnowledgeEmbedding, KnowledgeUnit
from app.services.embeddings import chunk_knowledge_content, hash_embedding_content


@pytest.fixture
def embedding_client(settings: Settings) -> Iterator[tuple[TestClient, SessionFactory]]:
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


class FakeEmbeddingAdapter:
    def __init__(self, exc: Exception | None = None) -> None:
        self.exc = exc
        self.calls: list[list[str]] = []

    def create_embeddings(self, request: EmbeddingRequest) -> EmbeddingResult:
        texts = list(request.texts)
        self.calls.append(texts)
        if self.exc is not None:
            raise self.exc

        return EmbeddingResult(
            embeddings=[
                _embedding_vector(index + 1)
                for index, _text in enumerate(texts)
            ],
            model="provider-response-model",
        )


def test_chunking_normalizes_whitespace_and_overlaps():
    assert chunk_knowledge_content(
        " alpha\nbeta\t\tgamma   ",
        chunk_size=50,
        overlap=5,
    ) == ["alpha beta gamma"]

    chunks = chunk_knowledge_content(
        "abcdefghijklmnopqrstuvwxyz",
        chunk_size=10,
        overlap=3,
    )

    assert chunks == ["abcdefghij", "hijklmnopq", "opqrstuvwx", "vwxyz"]


def test_content_hash_is_stable_and_config_sensitive():
    provider_id = uuid4()
    other_provider_id = uuid4()

    base_hash = hash_embedding_content(
        "same content",
        provider_id,
        "embedding-model",
        1536,
    )

    assert base_hash == hash_embedding_content(
        "same content",
        provider_id,
        "embedding-model",
        1536,
    )
    assert len(
        {
            base_hash,
            hash_embedding_content("different content", provider_id, "embedding-model", 1536),
            hash_embedding_content("same content", other_provider_id, "embedding-model", 1536),
            hash_embedding_content("same content", provider_id, "other-model", 1536),
            hash_embedding_content("same content", provider_id, "embedding-model", 768),
        }
    ) == 5


def test_knowledge_crud_without_active_provider_keeps_working(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = embedding_client

    response = client.post(
        "/api/knowledge-units",
        json={"title": "No Provider", "content": "No provider content"},
    )

    assert response.status_code == 201
    knowledge_id = response.json()["id"]

    update_response = client.put(
        f"/api/knowledge-units/{knowledge_id}",
        json={"content": "Updated without provider"},
    )

    assert update_response.status_code == 200
    assert _embedding_count(session_factory, UUID(knowledge_id)) == 0

    refresh_response = client.post(
        f"/api/knowledge-units/{knowledge_id}/embeddings/refresh"
    )

    assert refresh_response.status_code == 409
    assert refresh_response.json() == {
        "detail": "Active provider is not configured."
    }


def test_refresh_missing_knowledge_returns_404(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, _session_factory = embedding_client

    response = client.post(f"/api/knowledge-units/{uuid4()}/embeddings/refresh")

    assert response.status_code == 404
    assert response.json() == {"detail": "Knowledge unit not found."}


def test_create_with_active_provider_generates_embeddings(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = embedding_client
    provider_id = _create_active_provider(client)
    fake_adapter = FakeEmbeddingAdapter()

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post(
            "/api/knowledge-units",
            json={
                "title": "Embedded",
                "content": "  Embed\nthis   content.  ",
            },
        )

    assert response.status_code == 201
    assert fake_adapter.calls == [["Embed this content."]]

    embeddings = _knowledge_embeddings(session_factory, UUID(response.json()["id"]))
    assert len(embeddings) == 1
    assert embeddings[0].provider_id == UUID(provider_id)
    assert embeddings[0].embedding_model == "embedding-model"
    assert embeddings[0].embedding_dimension == 1536
    assert embeddings[0].chunk_index == 0
    assert embeddings[0].chunk_text == "Embed this content."


def test_create_with_active_provider_failure_rolls_back_knowledge(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = embedding_client
    _create_active_provider(client)
    fake_adapter = FakeEmbeddingAdapter(exc=ProviderConnectionError())

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post(
            "/api/knowledge-units",
            json={
                "title": "Provider Failure",
                "content": "will not persist",
            },
        )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Provider failed while generating embeddings."
    }
    assert fake_adapter.calls == [["will not persist"]]
    assert _knowledge_count_by_title(session_factory, "Provider Failure") == 0
    assert _total_embedding_count(session_factory) == 0


def test_explicit_refresh_creates_and_reuses_embeddings(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = embedding_client
    knowledge_id = _create_knowledge(client, "Manual refresh content")
    provider_id = _create_active_provider(client)
    fake_adapter = FakeEmbeddingAdapter()

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        first_response = client.post(
            f"/api/knowledge-units/{knowledge_id}/embeddings/refresh"
        )
        second_response = client.post(
            f"/api/knowledge-units/{knowledge_id}/embeddings/refresh"
        )

    assert first_response.status_code == 200
    assert first_response.json() == {
        "knowledge_unit_id": knowledge_id,
        "provider_id": provider_id,
        "embedding_model": "embedding-model",
        "embedding_dimension": 1536,
        "chunk_count": 1,
        "created_count": 1,
        "reused_count": 0,
        "deleted_count": 0,
    }

    assert second_response.status_code == 200
    assert second_response.json()["created_count"] == 0
    assert second_response.json()["reused_count"] == 1
    assert second_response.json()["deleted_count"] == 0
    assert fake_adapter.calls == [["Manual refresh content"]]
    assert _embedding_count(session_factory, UUID(knowledge_id)) == 1


def test_content_update_refreshes_stale_embeddings(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = embedding_client
    _create_active_provider(client)
    fake_adapter = FakeEmbeddingAdapter()

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        create_response = client.post(
            "/api/knowledge-units",
            json={"title": "Refresh Me", "content": "old content"},
        )
        knowledge_id = UUID(create_response.json()["id"])
        old_embedding = _knowledge_embeddings(session_factory, knowledge_id)[0]

        update_response = client.put(
            f"/api/knowledge-units/{knowledge_id}",
            json={"content": "new\ncontent"},
        )

    assert update_response.status_code == 200
    assert fake_adapter.calls == [["old content"], ["new content"]]

    embeddings = _knowledge_embeddings(session_factory, knowledge_id)
    assert len(embeddings) == 1
    assert embeddings[0].chunk_text == "new content"
    assert embeddings[0].content_hash != old_embedding.content_hash


def test_content_update_with_provider_failure_rolls_back_knowledge_and_embeddings(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = embedding_client
    _create_active_provider(client)
    successful_adapter = FakeEmbeddingAdapter()

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=successful_adapter,
    ):
        create_response = client.post(
            "/api/knowledge-units",
            json={"title": "Keep Old", "content": "old content"},
        )

    knowledge_id = UUID(create_response.json()["id"])
    old_embedding = _knowledge_embeddings(session_factory, knowledge_id)[0]
    failing_adapter = FakeEmbeddingAdapter(exc=ProviderConnectionError())

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=failing_adapter,
    ):
        update_response = client.put(
            f"/api/knowledge-units/{knowledge_id}",
            json={"content": "new content"},
        )

    assert update_response.status_code == 502
    assert update_response.json() == {
        "detail": "Provider failed while generating embeddings."
    }
    assert failing_adapter.calls == [["new content"]]
    assert _knowledge_content(session_factory, knowledge_id) == "old content"

    embeddings = _knowledge_embeddings(session_factory, knowledge_id)
    assert len(embeddings) == 1
    assert embeddings[0].id == old_embedding.id
    assert embeddings[0].chunk_text == "old content"
    assert embeddings[0].content_hash == old_embedding.content_hash


def test_content_update_without_active_provider_deletes_stale_embeddings(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = embedding_client
    provider_id = _create_active_provider(client)
    fake_adapter = FakeEmbeddingAdapter()

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        create_response = client.post(
            "/api/knowledge-units",
            json={"title": "Will Lose Stale", "content": "old content"},
        )

    knowledge_id = UUID(create_response.json()["id"])
    assert _embedding_count(session_factory, knowledge_id) == 1

    deactivate_response = client.put(
        f"/api/providers/{provider_id}",
        json={"is_active": False},
    )
    assert deactivate_response.status_code == 200

    update_response = client.put(
        f"/api/knowledge-units/{knowledge_id}",
        json={"content": "new content without active provider"},
    )

    assert update_response.status_code == 200
    assert _embedding_count(session_factory, knowledge_id) == 0


def test_non_content_update_does_not_refresh_embeddings(
    embedding_client: tuple[TestClient, SessionFactory],
):
    client, _session_factory = embedding_client
    _create_active_provider(client)
    fake_adapter = FakeEmbeddingAdapter()

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        create_response = client.post(
            "/api/knowledge-units",
            json={"title": "Original", "content": "content"},
        )
        update_response = client.put(
            f"/api/knowledge-units/{create_response.json()['id']}",
            json={"title": "Renamed", "metadata": {"kind": "note"}},
        )

    assert update_response.status_code == 200
    assert fake_adapter.calls == [["content"]]


@pytest.mark.parametrize(
    ("provider_error", "expected_status", "expected_detail"),
    [
        (
            ProviderTimeoutError(),
            504,
            "Provider request timed out while generating embeddings.",
        ),
        (
            ProviderConnectionError(),
            502,
            "Provider failed while generating embeddings.",
        ),
    ],
)
def test_refresh_maps_provider_errors(
    embedding_client: tuple[TestClient, SessionFactory],
    provider_error: Exception,
    expected_status: int,
    expected_detail: str,
):
    client, session_factory = embedding_client
    knowledge_id = _create_knowledge(client, "Provider failure content")
    _create_active_provider(client)
    fake_adapter = FakeEmbeddingAdapter(exc=provider_error)

    with patch(
        "app.services.embeddings.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        response = client.post(
            f"/api/knowledge-units/{knowledge_id}/embeddings/refresh"
        )

    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    assert _embedding_count(session_factory, UUID(knowledge_id)) == 0


def _create_active_provider(client: TestClient) -> str:
    response = client.post(
        "/api/providers",
        json={
            "name": f"Provider {uuid4()}",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
            "is_active": True,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_knowledge(client: TestClient, content: str) -> str:
    response = client.post(
        "/api/knowledge-units",
        json={"title": f"Knowledge {uuid4()}", "content": content},
    )
    assert response.status_code == 201
    return response.json()["id"]


def _embedding_count(
    session_factory: SessionFactory,
    knowledge_id: UUID,
) -> int:
    with session_factory() as session:
        return session.scalar(
            select(func.count())
            .select_from(KnowledgeEmbedding)
            .where(KnowledgeEmbedding.knowledge_unit_id == knowledge_id)
        ) or 0


def _total_embedding_count(session_factory: SessionFactory) -> int:
    with session_factory() as session:
        return session.scalar(
            select(func.count()).select_from(KnowledgeEmbedding)
        ) or 0


def _knowledge_count_by_title(session_factory: SessionFactory, title: str) -> int:
    with session_factory() as session:
        return session.scalar(
            select(func.count())
            .select_from(KnowledgeUnit)
            .where(KnowledgeUnit.title == title)
        ) or 0


def _knowledge_content(session_factory: SessionFactory, knowledge_id: UUID) -> str:
    with session_factory() as session:
        return session.scalar(
            select(KnowledgeUnit.content).where(KnowledgeUnit.id == knowledge_id)
        ) or ""


def _knowledge_embeddings(
    session_factory: SessionFactory,
    knowledge_id: UUID,
) -> list[KnowledgeEmbedding]:
    with session_factory() as session:
        return list(
            session.scalars(
                select(KnowledgeEmbedding)
                .where(KnowledgeEmbedding.knowledge_unit_id == knowledge_id)
                .order_by(KnowledgeEmbedding.chunk_index)
            ).all()
        )


def _embedding_vector(seed: int) -> list[float]:
    return [float(seed)] * 1536
