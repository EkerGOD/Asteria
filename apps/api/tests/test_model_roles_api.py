from collections.abc import Iterator
from contextlib import contextmanager
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
def model_roles_client(settings: Settings) -> Iterator[TestClient]:
    with _model_roles_test_client(settings) as client:
        yield client


@contextmanager
def _model_roles_test_client(settings: Settings) -> Iterator[TestClient]:
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


def test_chat_model_role_must_select_configured_provider_model(
    model_roles_client: TestClient,
):
    provider_id = _create_provider(
        model_roles_client,
        name="Role Provider",
        models=["deepseek-v4-pro", "deepseek-v4-flash"],
    )

    response = model_roles_client.put(
        "/api/model-roles/chat",
        json={
            "provider_id": provider_id,
            "model_name": "deepseek-v4-flash",
        },
    )

    assert response.status_code == 200
    assert response.json()["role_type"] == "chat"
    assert response.json()["provider_id"] == provider_id
    assert response.json()["model_name"] == "deepseek-v4-flash"
    assert response.json()["embedding_dimension"] is None


def test_chat_model_role_rejects_unconfigured_model(
    model_roles_client: TestClient,
):
    provider_id = _create_provider(
        model_roles_client,
        name="Limited Provider",
        models=["configured-model"],
    )

    response = model_roles_client.put(
        "/api/model-roles/chat",
        json={
            "provider_id": provider_id,
            "model_name": "not-configured",
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Model is not configured on the selected provider.",
    }


def test_chat_model_role_requires_provider(model_roles_client: TestClient):
    response = model_roles_client.put(
        "/api/model-roles/chat",
        json={
            "provider_id": None,
            "model_name": "chat-model",
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "Chat roles must select a provider model. "
            "Embedding roles must use a local model entry."
        ),
    }


def test_embedding_model_role_is_local_only(model_roles_client: TestClient):
    provider_id = _create_provider(
        model_roles_client,
        name="Embedding Provider",
        models=["remote-model"],
    )

    remote_response = model_roles_client.put(
        "/api/model-roles/embedding",
        json={
            "provider_id": provider_id,
            "model_name": "remote-model",
            "embedding_dimension": 1536,
        },
    )
    assert remote_response.status_code == 400

    local_response = model_roles_client.put(
        "/api/model-roles/embedding",
        json={
            "provider_id": None,
            "model_name": "bge-m3",
            "embedding_dimension": 1024,
        },
    )

    assert local_response.status_code == 200
    assert local_response.json()["role_type"] == "embedding"
    assert local_response.json()["provider_id"] is None
    assert local_response.json()["model_name"] == "bge-m3"
    assert local_response.json()["embedding_dimension"] == 1024


def test_missing_provider_returns_404(model_roles_client: TestClient):
    response = model_roles_client.put(
        "/api/model-roles/chat",
        json={
            "provider_id": str(uuid4()),
            "model_name": "chat-model",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Provider not found."}


def _create_provider(
    client: TestClient,
    *,
    name: str,
    models: list[str],
) -> str:
    response = client.post(
        "/api/providers",
        json={
            "name": name,
            "base_url": "http://localhost:11434/v1",
            "models": models,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]
