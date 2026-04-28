from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_session_factory, get_db_session
from app.main import create_app


@pytest.fixture
def conversation_client(settings: Settings) -> Iterator[TestClient]:
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
        yield client

    Base.metadata.drop_all(engine)
    engine.dispose()


def test_conversations_can_be_created_and_listed(conversation_client: TestClient):
    response = conversation_client.post(
        "/api/conversations",
        json={"title": "  My Chat  ", "summary": "  A test chat  "},
    )

    assert response.status_code == 201
    created = response.json()
    assert created["id"]
    assert created["title"] == "My Chat"
    assert created["summary"] == "A test chat"
    assert created["archived_at"] is None
    assert created["metadata"] == {}

    response = conversation_client.get("/api/conversations")

    assert response.status_code == 200
    conversations = response.json()
    assert len(conversations) == 1
    assert conversations[0]["title"] == "My Chat"


def test_conversation_title_is_validated(conversation_client: TestClient):
    response = conversation_client.post("/api/conversations", json={"title": "   "})

    assert response.status_code == 422


def test_conversations_can_be_filtered_by_project(conversation_client: TestClient):
    # Create a project first so the FK constraint is satisfied.
    project_response = conversation_client.post(
        "/api/projects", json={"name": "Test Project"}
    )
    project_id = project_response.json()["id"]

    conversation_client.post("/api/conversations", json={"title": "Chat A"})
    conversation_client.post(
        "/api/conversations",
        json={"title": "Chat B", "project_id": project_id},
    )
    conversation_client.post(
        "/api/conversations",
        json={"title": "Chat C", "project_id": project_id},
    )

    response = conversation_client.get(
        "/api/conversations",
        params={"project_id": project_id},
    )

    assert response.status_code == 200
    titles = [c["title"] for c in response.json()]
    assert set(titles) == {"Chat C", "Chat B"}


def test_archived_conversations_are_excluded_by_default(conversation_client: TestClient):
    create_active = conversation_client.post("/api/conversations", json={"title": "Active"})
    create_archived = conversation_client.post("/api/conversations", json={"title": "Archived"})
    archived_id = create_archived.json()["id"]
    active_id = create_active.json()["id"]

    archive_response = conversation_client.delete(f"/api/conversations/{archived_id}")
    assert archive_response.status_code == 200
    assert archive_response.json()["archived_at"] is not None

    response = conversation_client.get("/api/conversations")
    assert response.status_code == 200
    assert [c["id"] for c in response.json()] == [active_id]

    response = conversation_client.get(
        "/api/conversations", params={"include_archived": True}
    )
    assert response.status_code == 200
    assert {c["id"] for c in response.json()} == {archived_id, active_id}


def test_conversation_can_be_retrieved(conversation_client: TestClient):
    create_response = conversation_client.post(
        "/api/conversations", json={"title": "Deep Chat"}
    )
    conversation_id = create_response.json()["id"]

    response = conversation_client.get(f"/api/conversations/{conversation_id}")

    assert response.status_code == 200
    assert response.json()["title"] == "Deep Chat"
    assert response.json()["id"] == conversation_id


def test_missing_conversation_returns_404(conversation_client: TestClient):
    missing_id = uuid4()

    response = conversation_client.get(f"/api/conversations/{missing_id}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Conversation not found."}


def test_archive_conversation_is_idempotent(conversation_client: TestClient):
    create_response = conversation_client.post(
        "/api/conversations", json={"title": "To Archive"}
    )
    conversation_id = create_response.json()["id"]

    first = conversation_client.delete(f"/api/conversations/{conversation_id}")
    assert first.status_code == 200
    first_at = first.json()["archived_at"]
    assert first_at is not None

    second = conversation_client.delete(f"/api/conversations/{conversation_id}")
    assert second.status_code == 200
    assert second.json()["archived_at"] == first_at


def test_messages_can_be_appended_and_listed(conversation_client: TestClient):
    create_response = conversation_client.post(
        "/api/conversations", json={"title": "Chat"}
    )
    conversation_id = create_response.json()["id"]

    msg1 = conversation_client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"content": "Hello", "role": "user"},
    )
    assert msg1.status_code == 201
    assert msg1.json()["content"] == "Hello"
    assert msg1.json()["role"] == "user"
    assert msg1.json()["conversation_id"] == conversation_id

    msg2 = conversation_client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"content": "  How are you?  "},
    )
    assert msg2.status_code == 201
    assert msg2.json()["content"] == "How are you?"

    response = conversation_client.get(
        f"/api/conversations/{conversation_id}/messages"
    )
    assert response.status_code == 200
    messages = response.json()
    assert len(messages) == 2
    assert [m["content"] for m in messages] == ["Hello", "How are you?"]
    assert messages[0]["created_at"] <= messages[1]["created_at"]


def test_message_content_is_validated(conversation_client: TestClient):
    create_response = conversation_client.post(
        "/api/conversations", json={"title": "Chat"}
    )
    conversation_id = create_response.json()["id"]

    response = conversation_client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"content": "   "},
    )

    assert response.status_code == 422


def test_message_role_is_validated(conversation_client: TestClient):
    create_response = conversation_client.post(
        "/api/conversations", json={"title": "Chat"}
    )
    conversation_id = create_response.json()["id"]

    response = conversation_client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"content": "Hello", "role": "invalid_role"},
    )

    assert response.status_code == 422


def test_message_token_count_must_be_non_negative(conversation_client: TestClient):
    create_response = conversation_client.post(
        "/api/conversations", json={"title": "Chat"}
    )
    conversation_id = create_response.json()["id"]

    response = conversation_client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"content": "Hello", "token_count": -1},
    )

    assert response.status_code == 422


def test_append_message_to_missing_conversation_returns_404(
    conversation_client: TestClient,
):
    missing_id = uuid4()

    response = conversation_client.post(
        f"/api/conversations/{missing_id}/messages",
        json={"content": "Hello"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Conversation not found."}


def test_list_messages_from_missing_conversation_returns_404(
    conversation_client: TestClient,
):
    missing_id = uuid4()

    response = conversation_client.get(
        f"/api/conversations/{missing_id}/messages",
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Conversation not found."}


def test_conversation_can_have_metadata(conversation_client: TestClient):
    response = conversation_client.post(
        "/api/conversations",
        json={
            "title": "Meta Chat",
            "metadata": {"context": "debugging", "priority": 1},
        },
    )

    assert response.status_code == 201
    assert response.json()["metadata"] == {"context": "debugging", "priority": 1}
