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
def project_client(settings: Settings) -> Iterator[TestClient]:
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


def test_projects_can_be_created_and_listed(project_client: TestClient):
    response = project_client.post(
        "/api/projects",
        json={
            "name": "  Research  ",
            "description": "  Reading notes  ",
            "color": "  teal  ",
            "sort_order": 2,
        },
    )

    assert response.status_code == 201
    created = response.json()
    assert created["id"]
    assert created["name"] == "Research"
    assert created["description"] == "Reading notes"
    assert created["color"] == "teal"
    assert created["sort_order"] == 2
    assert created["archived_at"] is None

    response = project_client.get("/api/projects")

    assert response.status_code == 200
    assert [project["name"] for project in response.json()] == ["Research"]


def test_project_names_are_validated(project_client: TestClient):
    response = project_client.post(
        "/api/projects",
        json={"name": "   "},
    )

    assert response.status_code == 422

    response = project_client.post(
        "/api/projects",
        json={"name": "Research", "sort_order": -1},
    )

    assert response.status_code == 422


def test_active_project_names_must_be_unique_case_insensitively(project_client: TestClient):
    first_response = project_client.post("/api/projects", json={"name": "Research"})
    assert first_response.status_code == 201

    duplicate_response = project_client.post("/api/projects", json={"name": " research "})

    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {
        "detail": "An active project with this name already exists.",
    }


def test_projects_can_be_retrieved_and_updated(project_client: TestClient):
    create_response = project_client.post(
        "/api/projects",
        json={"name": "Research", "description": "Initial", "sort_order": 3},
    )
    project_id = create_response.json()["id"]

    response = project_client.get(f"/api/projects/{project_id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Research"

    response = project_client.put(
        f"/api/projects/{project_id}",
        json={"name": "Personal Research", "description": "", "sort_order": 1},
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == project_id
    assert updated["name"] == "Personal Research"
    assert updated["description"] is None
    assert updated["sort_order"] == 1


def test_archived_projects_are_excluded_from_list_by_default(project_client: TestClient):
    archived_response = project_client.post("/api/projects", json={"name": "Archive Me"})
    active_response = project_client.post("/api/projects", json={"name": "Keep Me"})
    archived_id = archived_response.json()["id"]
    active_id = active_response.json()["id"]

    archive_response = project_client.delete(f"/api/projects/{archived_id}")

    assert archive_response.status_code == 200
    assert archive_response.json()["archived_at"] is not None

    response = project_client.get("/api/projects")

    assert response.status_code == 200
    assert [project["id"] for project in response.json()] == [active_id]

    response = project_client.get("/api/projects", params={"include_archived": True})

    assert response.status_code == 200
    assert {project["id"] for project in response.json()} == {archived_id, active_id}


def test_missing_project_returns_404(project_client: TestClient):
    missing_project_id = uuid4()

    response = project_client.get(f"/api/projects/{missing_project_id}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found."}
