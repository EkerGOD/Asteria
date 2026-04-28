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
def tags_client(settings: Settings) -> Iterator[TestClient]:
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


def test_tags_can_be_created_and_listed(tags_client: TestClient):
    response = tags_client.post("/api/tags", json={"name": "  Python  "})

    assert response.status_code == 201
    created = response.json()
    assert created["id"]
    assert created["name"] == "Python"
    assert created["slug"] == "python"
    assert created["color"] is None

    response = tags_client.post(
        "/api/tags",
        json={"name": "Research", "color": "  blue  "},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Research"
    assert response.json()["slug"] == "research"
    assert response.json()["color"] == "blue"

    response = tags_client.get("/api/tags")

    assert response.status_code == 200
    names = [tag["name"] for tag in response.json()]
    assert names == ["Python", "Research"]


def test_tag_slug_is_auto_generated(tags_client: TestClient):
    response = tags_client.post("/api/tags", json={"name": "My Cool Tag!"})

    assert response.status_code == 201
    assert response.json()["slug"] == "my-cool-tag"

    response = tags_client.post("/api/tags", json={"name": "  Hello   World  "})

    assert response.status_code == 201
    assert response.json()["slug"] == "hello-world"


def test_tag_slug_uniqueness_is_enforced(tags_client: TestClient):
    first = tags_client.post("/api/tags", json={"name": "Hello World"})
    assert first.status_code == 201

    second = tags_client.post("/api/tags", json={"name": "hello-world"})

    assert second.status_code == 409
    assert "slug" in second.json()["detail"].lower()


def test_tag_name_uniqueness_is_enforced_case_insensitively(tags_client: TestClient):
    first = tags_client.post("/api/tags", json={"name": "Python"})
    assert first.status_code == 201

    second = tags_client.post("/api/tags", json={"name": "  python  "})

    assert second.status_code == 409


def test_detaching_unattached_tag_returns_not_found(tags_client: TestClient):
    knowledge_response = tags_client.post(
        "/api/knowledge-units",
        json={"title": "Test", "content": "Content"},
    )
    knowledge_id = knowledge_response.json()["id"]

    tag_response = tags_client.post("/api/tags", json={"name": "Detach Test"})
    tag_id = tag_response.json()["id"]

    response = tags_client.delete(
        f"/api/knowledge-units/{knowledge_id}/tags/{tag_id}"
    )

    assert response.status_code == 404


def test_attaching_duplicate_tag_is_idempotent(tags_client: TestClient):
    knowledge_response = tags_client.post(
        "/api/knowledge-units",
        json={"title": "Idempotent", "content": "Test"},
    )
    knowledge_id = knowledge_response.json()["id"]

    tag_response = tags_client.post("/api/tags", json={"name": "Idempotent Tag"})
    tag_id = tag_response.json()["id"]

    attach1 = tags_client.post(
        f"/api/knowledge-units/{knowledge_id}/tags",
        json={"tag_id": tag_id},
    )
    assert attach1.status_code == 200
    assert len(attach1.json()["tags"]) == 1

    attach2 = tags_client.post(
        f"/api/knowledge-units/{knowledge_id}/tags",
        json={"tag_id": tag_id},
    )
    assert attach2.status_code == 200
    assert len(attach2.json()["tags"]) == 1
