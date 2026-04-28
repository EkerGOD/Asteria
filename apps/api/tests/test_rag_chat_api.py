from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID, uuid4
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.ai import (
    ChatCompletionRequest,
    ChatCompletionResult,
    EmbeddingRequest,
    EmbeddingResult,
    ProviderConnectionError,
    ProviderTimeoutError,
    TokenUsage,
)
from app.core.config import Settings
from app.db.base import Base
from app.db.session import SessionFactory, build_session_factory, get_db_session
from app.main import create_app
from app.models import KnowledgeEmbedding, KnowledgeUnit, KnowledgeUnitTag, Project, Tag


@pytest.fixture
def rag_client(settings: Settings) -> Iterator[tuple[TestClient, SessionFactory]]:
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


class FakeRAGAdapter:
    def __init__(
        self,
        *,
        embedding: list[float] | None = None,
        answer: str = "Grounded answer [S1].",
        embedding_exc: Exception | None = None,
        chat_exc: Exception | None = None,
    ) -> None:
        self.embedding = embedding or _vector(1.0)
        self.answer = answer
        self.embedding_exc = embedding_exc
        self.chat_exc = chat_exc
        self.embedding_calls: list[list[str]] = []
        self.chat_calls: list[ChatCompletionRequest] = []

    def create_embeddings(self, request: EmbeddingRequest) -> EmbeddingResult:
        texts = list(request.texts)
        self.embedding_calls.append(texts)
        if self.embedding_exc is not None:
            raise self.embedding_exc
        return EmbeddingResult(
            embeddings=[self.embedding],
            model="embedding-response-model",
        )

    def create_chat_completion(
        self,
        request: ChatCompletionRequest,
    ) -> ChatCompletionResult:
        self.chat_calls.append(request)
        if self.chat_exc is not None:
            raise self.chat_exc
        return ChatCompletionResult(
            content=self.answer,
            model="chat-response-model",
            usage=TokenUsage(total_tokens=42),
        )


def test_rag_answer_generates_persists_and_returns_sources(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = rag_client
    provider_id = UUID(_create_active_provider(client))
    conversation_id = _create_conversation(client, title="RAG Chat")
    knowledge_id = _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Pgvector Note",
        chunk_text="pgvector supports cosine search",
        embedding=_vector(1.0, 0.0),
        metadata={"kind": "note"},
    )
    fake_adapter = FakeRAGAdapter(
        embedding=_vector(1.0, 0.0),
        answer="Use pgvector cosine search [S1].",
    )

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={
                "conversation_id": conversation_id,
                "content": "How should I search vectors?",
            },
        )

    assert response.status_code == 201
    body = response.json()
    assert body["provider_id"] == str(provider_id)
    assert body["chat_model"] == "chat-response-model"
    assert body["embedding_model"] == "embedding-model"
    assert body["embedding_dimension"] == 1536

    assert body["user_message"]["role"] == "user"
    assert body["user_message"]["content"] == "How should I search vectors?"
    assert body["assistant_message"]["role"] == "assistant"
    assert body["assistant_message"]["content"] == "Use pgvector cosine search [S1]."
    assert body["assistant_message"]["provider_id"] == str(provider_id)
    assert body["assistant_message"]["model"] == "chat-response-model"
    assert body["assistant_message"]["token_count"] == 42

    sources = body["sources"]
    assert len(sources) == 1
    assert "embedding" not in sources[0]
    assert sources[0]["knowledge_unit_id"] == str(knowledge_id)
    assert sources[0]["chunk_text"] == "pgvector supports cosine search"
    assert sources[0]["source"]["title"] == "Pgvector Note"
    assert sources[0]["source"]["metadata"] == {"kind": "note"}

    metadata = body["assistant_message"]["retrieval_metadata"]
    assert metadata["query"] == "How should I search vectors?"
    assert metadata["sources"][0]["label"] == "S1"
    assert metadata["sources"][0]["knowledge_unit_id"] == str(knowledge_id)
    assert metadata["sources"][0]["chunk_text"] == "pgvector supports cosine search"

    assert fake_adapter.embedding_calls == [["How should I search vectors?"]]
    assert len(fake_adapter.chat_calls) == 1
    chat_messages = list(fake_adapter.chat_calls[0].messages)
    assert chat_messages[0].role == "system"
    assert chat_messages[1].role == "user"
    assert "[S1]" in chat_messages[1].content
    assert "Pgvector Note" in chat_messages[1].content
    assert str(knowledge_id) in chat_messages[1].content
    assert "Chunk Index: 0" in chat_messages[1].content

    messages = _get_messages(client, conversation_id)
    assert [message["role"] for message in messages] == ["user", "assistant"]


def test_rag_answer_uses_empty_context_when_no_chunks(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, _session_factory = rag_client
    _create_active_provider(client)
    conversation_id = _create_conversation(client, title="Empty Context")
    fake_adapter = FakeRAGAdapter(answer="Not enough information.")

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={"conversation_id": conversation_id, "content": "What is missing?"},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["sources"] == []
    assert body["assistant_message"]["retrieval_metadata"]["sources"] == []
    assert "No knowledge context was retrieved." in list(
        fake_adapter.chat_calls[0].messages
    )[1].content


def test_rag_answer_inherits_conversation_project_when_project_is_omitted(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = rag_client
    provider_id = UUID(_create_active_provider(client))
    first_project_id = _insert_project(session_factory, "First Project")
    second_project_id = _insert_project(session_factory, "Second Project")
    conversation_id = _create_conversation(
        client,
        title="Project Chat",
        project_id=first_project_id,
    )
    first_knowledge_id = _insert_retrieval_item(
        session_factory,
        provider_id,
        title="First Project Note",
        chunk_text="first project chunk",
        embedding=_vector(1.0),
        project_id=first_project_id,
    )
    _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Second Project Note",
        chunk_text="second project chunk",
        embedding=_vector(1.0),
        project_id=second_project_id,
    )
    fake_adapter = FakeRAGAdapter()

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={"conversation_id": conversation_id, "content": "project scope"},
        )

    assert response.status_code == 201
    sources = response.json()["sources"]
    assert [source["knowledge_unit_id"] for source in sources] == [
        str(first_knowledge_id)
    ]
    assert response.json()["assistant_message"]["retrieval_metadata"]["project_id"] == str(
        first_project_id
    )


def test_rag_answer_explicit_null_project_searches_globally(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = rag_client
    provider_id = UUID(_create_active_provider(client))
    first_project_id = _insert_project(session_factory, "First Project")
    second_project_id = _insert_project(session_factory, "Second Project")
    conversation_id = _create_conversation(
        client,
        title="Global Chat",
        project_id=first_project_id,
    )
    first_knowledge_id = _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Alpha First Project",
        chunk_text="first project chunk",
        embedding=_vector(1.0),
        project_id=first_project_id,
    )
    second_knowledge_id = _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Beta Second Project",
        chunk_text="second project chunk",
        embedding=_vector(1.0),
        project_id=second_project_id,
    )
    fake_adapter = FakeRAGAdapter()

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={
                "conversation_id": conversation_id,
                "content": "global scope",
                "project_id": None,
            },
        )

    assert response.status_code == 201
    source_ids = {source["knowledge_unit_id"] for source in response.json()["sources"]}
    assert source_ids == {str(first_knowledge_id), str(second_knowledge_id)}
    assert response.json()["assistant_message"]["retrieval_metadata"]["project_id"] is None


def test_rag_answer_explicit_project_overrides_conversation_project(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = rag_client
    provider_id = UUID(_create_active_provider(client))
    first_project_id = _insert_project(session_factory, "First Project")
    second_project_id = _insert_project(session_factory, "Second Project")
    conversation_id = _create_conversation(
        client,
        title="Override Chat",
        project_id=first_project_id,
    )
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
    fake_adapter = FakeRAGAdapter()

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={
                "conversation_id": conversation_id,
                "content": "override scope",
                "project_id": str(second_project_id),
            },
        )

    assert response.status_code == 201
    sources = response.json()["sources"]
    assert [source["knowledge_unit_id"] for source in sources] == [
        str(second_knowledge_id)
    ]
    assert response.json()["assistant_message"]["retrieval_metadata"]["project_id"] == str(
        second_project_id
    )


def test_rag_answer_applies_tag_filters(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = rag_client
    provider_id = UUID(_create_active_provider(client))
    conversation_id = _create_conversation(client, title="Tagged Chat")
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
    fake_adapter = FakeRAGAdapter()

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={
                "conversation_id": conversation_id,
                "content": "tag scope",
                "tag_slugs": ["PYTHON", "python"],
            },
        )

    assert response.status_code == 201
    body = response.json()
    assert [source["knowledge_unit_id"] for source in body["sources"]] == [
        str(python_knowledge_id)
    ]
    assert body["sources"][0]["source"]["tags"][0]["slug"] == "python"
    assert body["assistant_message"]["retrieval_metadata"]["tag_slugs"] == ["python"]


def test_rag_answer_missing_conversation_returns_404(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, _session_factory = rag_client
    fake_adapter = FakeRAGAdapter()

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={"conversation_id": str(uuid4()), "content": "missing"},
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "Conversation not found."}
    assert fake_adapter.embedding_calls == []
    assert fake_adapter.chat_calls == []


def test_rag_answer_missing_active_provider_preserves_user_message(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, _session_factory = rag_client
    conversation_id = _create_conversation(client, title="No Provider")

    response = client.post(
        "/api/rag/answer",
        json={"conversation_id": conversation_id, "content": "save me"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Active provider is not configured."}
    messages = _get_messages(client, conversation_id)
    assert [message["role"] for message in messages] == ["user"]
    assert messages[0]["content"] == "save me"


@pytest.mark.parametrize(
    ("provider_error", "expected_status", "expected_detail"),
    [
        (
            ProviderTimeoutError(),
            504,
            "Provider request timed out while generating RAG answer.",
        ),
        (
            ProviderConnectionError(),
            502,
            "Provider failed while generating RAG answer.",
        ),
    ],
)
def test_rag_answer_embedding_failure_preserves_user_message(
    rag_client: tuple[TestClient, SessionFactory],
    provider_error: Exception,
    expected_status: int,
    expected_detail: str,
):
    client, _session_factory = rag_client
    _create_active_provider(client)
    conversation_id = _create_conversation(client, title="Embedding Failure")
    fake_adapter = FakeRAGAdapter(embedding_exc=provider_error)

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={"conversation_id": conversation_id, "content": "embed fail"},
        )

    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    messages = _get_messages(client, conversation_id)
    assert [message["role"] for message in messages] == ["user"]
    assert fake_adapter.chat_calls == []


def test_rag_answer_chat_failure_preserves_user_message_without_assistant(
    rag_client: tuple[TestClient, SessionFactory],
):
    client, session_factory = rag_client
    provider_id = UUID(_create_active_provider(client))
    conversation_id = _create_conversation(client, title="Chat Failure")
    _insert_retrieval_item(
        session_factory,
        provider_id,
        title="Context",
        chunk_text="usable context",
        embedding=_vector(1.0),
    )
    fake_adapter = FakeRAGAdapter(chat_exc=ProviderConnectionError())

    with _patched_rag_adapters(fake_adapter):
        response = client.post(
            "/api/rag/answer",
            json={"conversation_id": conversation_id, "content": "chat fail"},
        )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Provider failed while generating RAG answer."
    }
    messages = _get_messages(client, conversation_id)
    assert [message["role"] for message in messages] == ["user"]
    assert len(fake_adapter.chat_calls) == 1


def test_rag_answer_content_is_validated(rag_client: tuple[TestClient, SessionFactory]):
    client, _session_factory = rag_client

    response = client.post(
        "/api/rag/answer",
        json={"conversation_id": str(uuid4()), "content": "   "},
    )

    assert response.status_code == 422


@contextmanager
def _patched_rag_adapters(fake_adapter: FakeRAGAdapter):
    with patch(
        "app.rag.retrieval.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ), patch(
        "app.rag.chat.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        yield


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


def _create_conversation(
    client: TestClient,
    *,
    title: str,
    project_id: UUID | None = None,
) -> str:
    payload: dict[str, object] = {"title": title}
    if project_id is not None:
        payload["project_id"] = str(project_id)
    response = client.post("/api/conversations", json=payload)
    assert response.status_code == 201
    return response.json()["id"]


def _get_messages(client: TestClient, conversation_id: str) -> list[dict[str, object]]:
    response = client.get(f"/api/conversations/{conversation_id}/messages")
    assert response.status_code == 200
    return response.json()


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
