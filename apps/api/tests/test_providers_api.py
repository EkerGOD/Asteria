from collections.abc import Iterator
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.ai import ProviderConnectionError, ProviderHTTPStatusError, ProviderTimeoutError
from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_session_factory, get_db_session
from app.main import create_app


@pytest.fixture
def provider_client(settings: Settings) -> Iterator[TestClient]:
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


def test_providers_can_be_created_and_listed(provider_client: TestClient):
    response = provider_client.post(
        "/api/providers",
        json={
            "name": "  Local LLM  ",
            "base_url": "  http://localhost:11434/v1  ",
            "api_key": "  sk-test-key  ",
            "chat_model": "  chat-model  ",
            "embedding_model": "  embedding-model  ",
            "timeout_seconds": 45,
            "is_active": True,
        },
    )

    assert response.status_code == 201
    created = response.json()
    assert created["id"]
    assert created["name"] == "Local LLM"
    assert created["base_url"] == "http://localhost:11434/v1"
    assert created["chat_model"] == "chat-model"
    assert created["embedding_model"] == "embedding-model"
    assert created["embedding_dimension"] == 1536
    assert created["timeout_seconds"] == 45
    assert created["is_active"] is True
    assert created["has_api_key"] is True
    assert "api_key" not in created
    assert "api_key_ciphertext" not in created

    response = provider_client.get("/api/providers")

    assert response.status_code == 200
    assert [p["name"] for p in response.json()] == ["Local LLM"]


def test_provider_fields_are_validated(provider_client: TestClient):
    response = provider_client.post(
        "/api/providers",
        json={"name": "   "},
    )

    assert response.status_code == 422

    response = provider_client.post(
        "/api/providers",
        json={
            "name": "Test",
            "base_url": "   ",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )

    assert response.status_code == 422

    response = provider_client.post(
        "/api/providers",
        json={
            "name": "Test",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
            "timeout_seconds": 0,
        },
    )

    assert response.status_code == 422


def test_provider_names_must_be_unique_case_insensitively(provider_client: TestClient):
    first = provider_client.post(
        "/api/providers",
        json={
            "name": "My Provider",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )
    assert first.status_code == 201

    duplicate = provider_client.post(
        "/api/providers",
        json={
            "name": "  my provider  ",
            "base_url": "http://localhost:11435/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )

    assert duplicate.status_code == 409
    assert duplicate.json() == {
        "detail": "A provider with this name already exists.",
    }


def test_provider_can_be_retrieved_and_updated(provider_client: TestClient):
    create_response = provider_client.post(
        "/api/providers",
        json={
            "name": "Original",
            "base_url": "http://localhost:11434/v1",
            "api_key": "original-key",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
            "timeout_seconds": 30,
            "is_active": False,
        },
    )
    provider_id = create_response.json()["id"]

    response = provider_client.get(f"/api/providers/{provider_id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Original"
    assert response.json()["has_api_key"] is True

    response = provider_client.put(
        f"/api/providers/{provider_id}",
        json={
            "name": "Updated",
            "base_url": "http://localhost:11435/v1",
            "timeout_seconds": 120,
            "is_active": True,
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == provider_id
    assert updated["name"] == "Updated"
    assert updated["base_url"] == "http://localhost:11435/v1"
    assert updated["timeout_seconds"] == 120
    assert updated["is_active"] is True
    assert updated["has_api_key"] is True

    response = provider_client.put(
        f"/api/providers/{provider_id}",
        json={"api_key": ""},
    )

    assert response.status_code == 200
    assert response.json()["has_api_key"] is False


def test_provider_can_be_deleted(provider_client: TestClient):
    create_response = provider_client.post(
        "/api/providers",
        json={
            "name": "Delete Me",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )
    provider_id = create_response.json()["id"]

    response = provider_client.delete(f"/api/providers/{provider_id}")

    assert response.status_code == 204
    assert response.content == b""

    response = provider_client.get(f"/api/providers/{provider_id}")

    assert response.status_code == 404


def test_only_one_provider_can_be_active(provider_client: TestClient):
    a = provider_client.post(
        "/api/providers",
        json={
            "name": "Provider A",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
            "is_active": True,
        },
    )
    assert a.status_code == 201

    b = provider_client.post(
        "/api/providers",
        json={
            "name": "Provider B",
            "base_url": "http://localhost:11435/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
            "is_active": True,
        },
    )
    assert b.status_code == 201

    providers = provider_client.get("/api/providers").json()
    active_providers = [p for p in providers if p["is_active"]]
    assert len(active_providers) == 1


def test_activate_provider_endpoint(provider_client: TestClient):
    a = provider_client.post(
        "/api/providers",
        json={
            "name": "Provider A",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
            "is_active": True,
        },
    )
    b = provider_client.post(
        "/api/providers",
        json={
            "name": "Provider B",
            "base_url": "http://localhost:11435/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
            "is_active": False,
        },
    )
    a_id = a.json()["id"]
    b_id = b.json()["id"]

    response = provider_client.post(f"/api/providers/{b_id}/activate")

    assert response.status_code == 200
    assert response.json()["is_active"] is True

    a_after = provider_client.get(f"/api/providers/{a_id}")
    assert a_after.json()["is_active"] is False


def test_activate_missing_provider_returns_404(provider_client: TestClient):
    response = provider_client.post(f"/api/providers/{uuid4()}/activate")

    assert response.status_code == 404


def test_health_check_returns_success_for_reachable_provider(provider_client: TestClient):
    create_response = provider_client.post(
        "/api/providers",
        json={
            "name": "Healthy",
            "base_url": "http://localhost:11434/v1",
            "api_key": "test-key",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )
    provider_id = create_response.json()["id"]

    with patch("app.services.providers.OpenAICompatibleProviderAdapter.check_health"):
        response = provider_client.post(f"/api/providers/{provider_id}/health-check")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["message"] == "Provider is reachable."
    assert response.json()["latency_ms"] is not None


def test_health_check_returns_error_for_unreachable_provider(provider_client: TestClient):
    create_response = provider_client.post(
        "/api/providers",
        json={
            "name": "Unreachable",
            "base_url": "http://localhost:9999/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )
    provider_id = create_response.json()["id"]

    with patch(
        "app.services.providers.OpenAICompatibleProviderAdapter.check_health",
        side_effect=ProviderConnectionError,
    ):
        response = provider_client.post(f"/api/providers/{provider_id}/health-check")

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["message"] == "Could not connect to provider."


def test_health_check_handles_timeout(provider_client: TestClient):
    create_response = provider_client.post(
        "/api/providers",
        json={
            "name": "Slow",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )
    provider_id = create_response.json()["id"]

    with patch(
        "app.services.providers.OpenAICompatibleProviderAdapter.check_health",
        side_effect=ProviderTimeoutError,
    ):
        response = provider_client.post(f"/api/providers/{provider_id}/health-check")

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["message"] == "Provider request timed out."


def test_health_check_handles_error_status(provider_client: TestClient):
    create_response = provider_client.post(
        "/api/providers",
        json={
            "name": "Error",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )
    provider_id = create_response.json()["id"]

    with patch(
        "app.services.providers.OpenAICompatibleProviderAdapter.check_health",
        side_effect=ProviderHTTPStatusError(status_code=500),
    ):
        response = provider_client.post(f"/api/providers/{provider_id}/health-check")

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert "500" in response.json()["message"]


def test_missing_provider_returns_404(provider_client: TestClient):
    missing_id = uuid4()

    response = provider_client.get(f"/api/providers/{missing_id}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Provider not found."}

    response = provider_client.put(
        f"/api/providers/{missing_id}",
        json={"name": "Nope"},
    )

    assert response.status_code == 404

    response = provider_client.delete(f"/api/providers/{missing_id}")

    assert response.status_code == 404


def test_default_values_are_applied(provider_client: TestClient):
    response = provider_client.post(
        "/api/providers",
        json={
            "name": "Defaults",
            "base_url": "http://localhost:11434/v1",
            "chat_model": "chat-model",
            "embedding_model": "embedding-model",
        },
    )

    assert response.status_code == 201
    created = response.json()
    assert created["timeout_seconds"] == 60
    assert created["is_active"] is False
    assert created["has_api_key"] is False
    assert created["provider_type"] == "openai_compatible"
    assert created["embedding_dimension"] == 1536
    assert created["metadata"] == {}
