from collections.abc import Iterator
from contextlib import contextmanager
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.ai import ChatCompletionChunk, ChatCompletionRequest, ProviderConnectionError, TokenUsage
from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_session_factory, get_db_session
from app.main import create_app


@pytest.fixture
def chat_client(settings: Settings) -> Iterator[TestClient]:
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


class FakeStreamingAdapter:
    def __init__(
        self,
        chunks: list[ChatCompletionChunk],
        exc: Exception | None = None,
    ) -> None:
        self.chunks = chunks
        self.exc = exc
        self.chat_calls: list[ChatCompletionRequest] = []

    def create_chat_completion_stream(
        self,
        request: ChatCompletionRequest,
    ) -> Iterator[ChatCompletionChunk]:
        self.chat_calls.append(request)
        yield from self.chunks
        if self.exc is not None:
            raise self.exc


def test_chat_stream_persists_assistant_message(chat_client: TestClient):
    provider_id = _create_provider(chat_client)
    conversation_id = _create_conversation(chat_client)
    role_response = chat_client.put(
        "/api/model-roles/chat",
        json={"provider_id": provider_id, "model_name": "flash-model"},
    )
    assert role_response.status_code == 200
    fake_adapter = FakeStreamingAdapter(
        [
            ChatCompletionChunk(content_delta="Hel", model="stream-model"),
            ChatCompletionChunk(
                content_delta="lo",
                usage=TokenUsage(prompt_tokens=3, completion_tokens=2, total_tokens=5),
            ),
        ]
    )

    with _patched_streaming_adapter(fake_adapter):
        response = chat_client.post(
            "/api/chat/send/stream",
            json={"conversation_id": conversation_id, "content": "Say hello"},
        )

    assert response.status_code == 201
    events = _parse_sse(response.text)
    assert [event["event"] for event in events] == [
        "user_message",
        "token",
        "token",
        "assistant_message",
        "done",
    ]
    assert [event["data"].get("content") for event in events if event["event"] == "token"] == [
        "Hel",
        "lo",
    ]
    assistant_event = events[3]["data"]
    assert assistant_event["chat_model"] == "stream-model"
    assert assistant_event["token_usage"]["total_tokens"] == 5
    assert assistant_event["message"]["content"] == "Hello"
    assert assistant_event["message"]["model"] == "stream-model"

    messages = _get_messages(chat_client, conversation_id)
    assert [message["role"] for message in messages] == ["user", "assistant"]
    assert messages[1]["content"] == "Hello"
    assert messages[1]["token_count"] == 5
    assert list(fake_adapter.chat_calls[0].messages)[0].content == "Say hello"


def test_chat_stream_error_persists_partial_assistant_message(chat_client: TestClient):
    provider_id = _create_provider(chat_client)
    chat_client.put(
        "/api/model-roles/chat",
        json={"provider_id": provider_id, "model_name": "flash-model"},
    )
    conversation_id = _create_conversation(chat_client)
    fake_adapter = FakeStreamingAdapter(
        [ChatCompletionChunk(content_delta="partial answer")],
        exc=ProviderConnectionError(),
    )

    with _patched_streaming_adapter(fake_adapter):
        response = chat_client.post(
            "/api/chat/send/stream",
            json={"conversation_id": conversation_id, "content": "Keep partial"},
        )

    assert response.status_code == 201
    events = _parse_sse(response.text)
    assert [event["event"] for event in events] == [
        "user_message",
        "token",
        "assistant_message",
        "error",
    ]
    assert events[-1]["data"] == {
        "message": "Provider failed while streaming response.",
        "partial": True,
    }
    partial_message = events[2]["data"]["message"]
    assert partial_message["content"] == "partial answer"
    assert partial_message["retrieval_metadata"] == {"stream_interrupted": True}

    messages = _get_messages(chat_client, conversation_id)
    assert [message["role"] for message in messages] == ["user", "assistant"]
    assert messages[1]["content"] == "partial answer"


def test_chat_stream_without_provider_returns_400_and_preserves_user_message(
    chat_client: TestClient,
):
    conversation_id = _create_conversation(chat_client)

    response = chat_client.post(
        "/api/chat/send/stream",
        json={"conversation_id": conversation_id, "content": "No provider"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "No chat model configured. Configure a chat model in Settings > Model Roles.",
    }
    messages = _get_messages(chat_client, conversation_id)
    assert [message["role"] for message in messages] == ["user"]
    assert messages[0]["content"] == "No provider"


@contextmanager
def _patched_streaming_adapter(fake_adapter: FakeStreamingAdapter):
    with patch(
        "app.services.chat.OpenAICompatibleProviderAdapter.from_provider",
        return_value=fake_adapter,
    ):
        yield


def _create_provider(client: TestClient) -> str:
    response = client.post(
        "/api/providers",
        json={
            "name": "Streaming Provider",
            "base_url": "http://localhost:11434/v1",
            "models": ["chat-model", "flash-model"],
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_conversation(client: TestClient) -> str:
    response = client.post("/api/conversations", json={"title": "Streaming Chat"})
    assert response.status_code == 201
    return response.json()["id"]


def _get_messages(client: TestClient, conversation_id: str) -> list[dict[str, object]]:
    response = client.get(f"/api/conversations/{conversation_id}/messages")
    assert response.status_code == 200
    return response.json()


def _parse_sse(body: str) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    for raw_event in body.strip().split("\n\n"):
        event_name: str | None = None
        data_text: str | None = None
        for line in raw_event.splitlines():
            if line.startswith("event: "):
                event_name = line.removeprefix("event: ")
            if line.startswith("data: "):
                data_text = line.removeprefix("data: ")
        if event_name is None or data_text is None:
            continue
        events.append({"event": event_name, "data": json.loads(data_text)})
    return events
