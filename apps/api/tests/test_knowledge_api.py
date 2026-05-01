from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_session_factory, get_db_session
from app.main import create_app


@pytest.fixture
def knowledge_client(settings: Settings) -> Iterator[TestClient]:
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


def test_knowledge_units_can_be_created_and_listed(knowledge_client: TestClient):
    response = knowledge_client.post(
        "/api/knowledge-units",
        json={
            "title": "  My First Note  ",
            "content": "  Some content here.  ",
        },
    )

    assert response.status_code == 201
    created = response.json()
    assert created["id"]
    assert created["title"] == "My First Note"
    assert created["content"] == "Some content here."
    assert created["status"] == "active"
    assert created["archived_at"] is None
    assert created["metadata"] == {}
    assert created["tags"] == []

    response = knowledge_client.get("/api/knowledge-units")

    assert response.status_code == 200
    assert [unit["title"] for unit in response.json()] == ["My First Note"]


def test_knowledge_unit_fields_are_validated(knowledge_client: TestClient):
    response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "   ", "content": "Valid"},
    )
    assert response.status_code == 422

    response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Valid", "content": "   "},
    )
    assert response.status_code == 422

    response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "T", "content": "C", "source_type": "invalid"},
    )
    assert response.status_code == 422


def test_knowledge_units_can_be_retrieved_and_updated(knowledge_client: TestClient):
    create_response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Original", "content": "Original content"},
    )
    knowledge_id = create_response.json()["id"]

    response = knowledge_client.get(f"/api/knowledge-units/{knowledge_id}")

    assert response.status_code == 200
    assert response.json()["title"] == "Original"

    response = knowledge_client.put(
        f"/api/knowledge-units/{knowledge_id}",
        json={
            "title": "Updated Title",
            "content": "Updated content",
            "metadata": {"key": "value"},
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == knowledge_id
    assert updated["title"] == "Updated Title"
    assert updated["content"] == "Updated content"
    assert updated["metadata"] == {"key": "value"}

    response = knowledge_client.get(f"/api/knowledge-units/{knowledge_id}")

    assert response.json()["title"] == "Updated Title"


def test_knowledge_units_can_be_archived(knowledge_client: TestClient):
    response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Archive Me", "content": "Content"},
    )
    knowledge_id = response.json()["id"]

    archive_response = knowledge_client.delete(
        f"/api/knowledge-units/{knowledge_id}"
    )

    assert archive_response.status_code == 200
    assert archive_response.json()["archived_at"] is not None
    assert archive_response.json()["status"] == "archived"

    response = knowledge_client.get("/api/knowledge-units")

    assert response.status_code == 200
    assert [unit["id"] for unit in response.json()] == []

    response = knowledge_client.get(
        "/api/knowledge-units", params={"include_archived": True}
    )

    assert response.status_code == 200
    assert [unit["id"] for unit in response.json()] == [knowledge_id]


def test_project_filtering_on_knowledge_list(knowledge_client: TestClient):
    project_response = knowledge_client.post(
        "/api/projects", json={"name": "Research"}
    )
    project_id = project_response.json()["id"]

    knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "With Project", "content": "A", "project_id": project_id},
    )
    knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Without Project", "content": "B"},
    )

    response = knowledge_client.get(
        "/api/knowledge-units", params={"project_id": project_id}
    )

    assert response.status_code == 200
    titles = [unit["title"] for unit in response.json()]
    assert titles == ["With Project"]

    response = knowledge_client.get("/api/knowledge-units")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_tag_filtering_on_knowledge_list(knowledge_client: TestClient):
    tag_a_response = knowledge_client.post("/api/tags", json={"name": "python"})
    tag_b_response = knowledge_client.post("/api/tags", json={"name": "research"})
    tag_a_id = tag_a_response.json()["id"]
    tag_b_id = tag_b_response.json()["id"]
    tag_a_slug = tag_a_response.json()["slug"]
    tag_b_slug = tag_b_response.json()["slug"]

    unit_a_response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Python Guide", "content": "A"},
    )
    knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Research Notes", "content": "B"},
    )
    knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "No Tags", "content": "C"},
    )
    unit_a_id = unit_a_response.json()["id"]

    knowledge_client.post(
        f"/api/knowledge-units/{unit_a_id}/tags",
        json={"tag_id": tag_a_id},
    )

    response = knowledge_client.get(
        "/api/knowledge-units", params={"tag_slugs": [tag_a_slug]}
    )

    assert response.status_code == 200
    assert [unit["title"] for unit in response.json()] == ["Python Guide"]

    response = knowledge_client.get(
        "/api/knowledge-units", params={"tag_slugs": [tag_a_slug, tag_b_slug]}
    )

    assert len(response.json()) == 1


def test_keyword_search_on_knowledge_list(knowledge_client: TestClient):
    knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Vector Notes", "content": "pgvector and semantic search"},
    )
    knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Cooking", "content": "pasta and sauce"},
    )
    knowledge_client.post(
        "/api/knowledge-units",
        json={
            "title": "External Source",
            "content": "archival material",
            "source_uri": "notes://retrieval-lab",
        },
    )

    response = knowledge_client.get("/api/knowledge-units", params={"q": "VECTOR"})

    assert response.status_code == 200
    assert [unit["title"] for unit in response.json()] == ["Vector Notes"]

    response = knowledge_client.get("/api/knowledge-units", params={"q": "retrieval"})

    assert response.status_code == 200
    assert [unit["title"] for unit in response.json()] == ["External Source"]


def test_tags_can_be_attached_and_detached_via_knowledge_endpoints(
    knowledge_client: TestClient,
):
    knowledge_response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Tagged Note", "content": "Content"},
    )
    knowledge_id = knowledge_response.json()["id"]

    tag_response = knowledge_client.post(
        "/api/tags", json={"name": "Attachment Test"}
    )
    tag_id = tag_response.json()["id"]

    attach_response = knowledge_client.post(
        f"/api/knowledge-units/{knowledge_id}/tags",
        json={"tag_id": tag_id},
    )

    assert attach_response.status_code == 200
    assert len(attach_response.json()["tags"]) == 1
    assert attach_response.json()["tags"][0]["name"] == "Attachment Test"

    get_response = knowledge_client.get(
        f"/api/knowledge-units/{knowledge_id}"
    )
    assert len(get_response.json()["tags"]) == 1

    detach_response = knowledge_client.delete(
        f"/api/knowledge-units/{knowledge_id}/tags/{tag_id}"
    )

    assert detach_response.status_code == 200
    assert len(detach_response.json()["tags"]) == 0


def test_missing_knowledge_unit_returns_404(knowledge_client: TestClient):
    missing_id = uuid4()

    response = knowledge_client.get(f"/api/knowledge-units/{missing_id}")
    assert response.status_code == 404

    response = knowledge_client.put(
        f"/api/knowledge-units/{missing_id}",
        json={"title": "Nope"},
    )
    assert response.status_code == 404

    response = knowledge_client.delete(f"/api/knowledge-units/{missing_id}")
    assert response.status_code == 404

    response = knowledge_client.post(
        f"/api/knowledge-units/{missing_id}/tags",
        json={"tag_id": str(uuid4())},
    )
    assert response.status_code == 404

    tag_id = uuid4()
    knowledge_response = knowledge_client.post(
        "/api/knowledge-units",
        json={"title": "Exists", "content": "Content"},
    )
    real_id = knowledge_response.json()["id"]

    response = knowledge_client.delete(
        f"/api/knowledge-units/{real_id}/tags/{tag_id}"
    )
    assert response.status_code == 404
