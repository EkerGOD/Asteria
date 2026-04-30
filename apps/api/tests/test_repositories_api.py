from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_session_factory, get_db_session
from app.main import create_app


@contextmanager
def _repository_test_client(settings: Settings) -> Iterator[TestClient]:
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


def test_repositories_can_be_registered_listed_and_restored_current(
    settings: Settings,
    tmp_path: Path,
):
    with _repository_test_client(settings) as client:
        first_path = tmp_path / "alpha"
        second_path = tmp_path / "beta"
        first_path.mkdir()
        second_path.mkdir()

        first_response = client.post(
            "/api/repositories",
            json={"name": "  Alpha  ", "root_path": f"  {first_path}  "},
        )
        second_response = client.post(
            "/api/repositories",
            json={"name": "Beta", "root_path": str(second_path)},
        )

        assert first_response.status_code == 201
        assert second_response.status_code == 201
        first = first_response.json()
        second = second_response.json()
        assert first["name"] == "Alpha"
        assert first["root_path"] == str(first_path.resolve())
        assert first["status"] == "active"

        response = client.get("/api/repositories")

        assert response.status_code == 200
        assert [repository["name"] for repository in response.json()] == ["Alpha", "Beta"]

        response = client.get("/api/repositories/current")

        assert response.status_code == 200
        assert response.json()["id"] == second["id"]

        response = client.post(f"/api/repositories/{first['id']}/select")

        assert response.status_code == 200
        assert response.json()["id"] == first["id"]

        response = client.get("/api/repositories/current")

        assert response.status_code == 200
        assert response.json()["id"] == first["id"]


def test_repository_name_and_path_conflicts_are_reported(
    settings: Settings,
    tmp_path: Path,
):
    with _repository_test_client(settings) as client:
        first_path = tmp_path / "alpha"
        second_path = tmp_path / "beta"
        first_path.mkdir()
        second_path.mkdir()

        response = client.post(
            "/api/repositories",
            json={"name": "Research", "root_path": str(first_path)},
        )
        assert response.status_code == 201

        duplicate_name_response = client.post(
            "/api/repositories",
            json={"name": " research ", "root_path": str(second_path)},
        )

        assert duplicate_name_response.status_code == 409
        assert duplicate_name_response.json() == {
            "detail": "An active repository with this name already exists.",
        }

        duplicate_path_response = client.post(
            "/api/repositories",
            json={"name": "Second", "root_path": str(first_path)},
        )

        assert duplicate_path_response.status_code == 409
        assert duplicate_path_response.json() == {
            "detail": "An active repository with this root path already exists.",
        }


def test_repository_path_must_be_readable_directory(
    settings: Settings,
    tmp_path: Path,
):
    with _repository_test_client(settings) as client:
        missing_path = tmp_path / "missing"

        response = client.post(
            "/api/repositories",
            json={"name": "Missing", "root_path": str(missing_path)},
        )

        assert response.status_code == 400
        assert response.json() == {
            "detail": "Repository root path must be a readable local directory.",
        }


def test_repository_can_be_updated(settings: Settings, tmp_path: Path):
    with _repository_test_client(settings) as client:
        first_path = tmp_path / "alpha"
        second_path = tmp_path / "beta"
        first_path.mkdir()
        second_path.mkdir()
        create_response = client.post(
            "/api/repositories",
            json={"name": "Alpha", "root_path": str(first_path)},
        )
        repository_id = create_response.json()["id"]

        response = client.put(
            f"/api/repositories/{repository_id}",
            json={"name": "  Renamed  ", "root_path": str(second_path)},
        )

        assert response.status_code == 200
        updated = response.json()
        assert updated["id"] == repository_id
        assert updated["name"] == "Renamed"
        assert updated["root_path"] == str(second_path.resolve())


def test_unlink_repository_removes_registration_without_deleting_disk_folder(
    settings: Settings,
    tmp_path: Path,
):
    with _repository_test_client(settings) as client:
        alpha_path = tmp_path / "alpha"
        beta_path = tmp_path / "beta"
        alpha_path.mkdir()
        beta_path.mkdir()
        alpha_id = client.post(
            "/api/repositories",
            json={"name": "Alpha", "root_path": str(alpha_path)},
        ).json()["id"]
        beta_id = client.post(
            "/api/repositories",
            json={"name": "Beta", "root_path": str(beta_path)},
        ).json()["id"]

        response = client.delete(f"/api/repositories/{beta_id}")

        assert response.status_code == 200
        unlinked = response.json()
        assert unlinked["id"] == beta_id
        assert unlinked["status"] == "unlinked"
        assert unlinked["unlinked_at"] is not None
        assert beta_path.exists()

        response = client.get("/api/repositories")

        assert response.status_code == 200
        assert [repository["id"] for repository in response.json()] == [alpha_id]

        response = client.get("/api/repositories", params={"include_unlinked": True})

        assert response.status_code == 200
        assert {repository["id"] for repository in response.json()} == {alpha_id, beta_id}

        response = client.get("/api/repositories/current")

        assert response.status_code == 200
        assert response.json()["id"] == alpha_id

        recreate_response = client.post(
            "/api/repositories",
            json={"name": "Beta", "root_path": str(beta_path)},
        )

        assert recreate_response.status_code == 201
        assert recreate_response.json()["status"] == "active"


def test_missing_or_unlinked_repository_cannot_be_selected(
    settings: Settings,
    tmp_path: Path,
):
    with _repository_test_client(settings) as client:
        repository_path = tmp_path / "alpha"
        repository_path.mkdir()
        repository_id = client.post(
            "/api/repositories",
            json={"name": "Alpha", "root_path": str(repository_path)},
        ).json()["id"]

        missing_response = client.post(f"/api/repositories/{uuid4()}/select")

        assert missing_response.status_code == 404
        assert missing_response.json() == {"detail": "Repository not found."}

        unlink_response = client.delete(f"/api/repositories/{repository_id}")
        assert unlink_response.status_code == 200

        select_response = client.post(f"/api/repositories/{repository_id}/select")

        assert select_response.status_code == 404
        assert select_response.json() == {"detail": "Repository not found."}
