from typing import get_args
from unittest.mock import patch

import httpx
import pytest

from app.ai import (
    ChatCompletionMessage,
    ChatCompletionRequest,
    EmbeddingRequest,
    OpenAICompatibleProviderAdapter,
    ProviderAuthError,
    ProviderConnectionError,
    ProviderHTTPStatusError,
    ProviderMalformedResponseError,
    ProviderTimeoutError,
)
from app.ai.types import ProviderConfig, ProviderMessageRole


def test_chat_completion_message_roles_are_mvp_only():
    assert get_args(ProviderMessageRole) == ("system", "user", "assistant")


def test_chat_completion_success_sends_openai_compatible_payload():
    adapter = _adapter()
    mock_response = httpx.Response(
        status_code=200,
        json={
            "model": "chat-response-model",
            "choices": [{"message": {"content": "Hello from the model."}}],
            "usage": {
                "prompt_tokens": 7,
                "completion_tokens": 5,
                "total_tokens": 12,
            },
        },
    )

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=mock_response,
    ) as request:
        result = adapter.create_chat_completion(
            ChatCompletionRequest(
                messages=[
                    ChatCompletionMessage(role="system", content="Be concise."),
                    ChatCompletionMessage(role="user", content="Say hello."),
                ]
            )
        )

    assert result.content == "Hello from the model."
    assert result.model == "chat-response-model"
    assert result.token_count == 12

    assert request.call_args.args == (
        "POST",
        "https://provider.example/v1/chat/completions",
    )
    assert request.call_args.kwargs["headers"] == {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-key",
    }
    assert request.call_args.kwargs["timeout"] == 15
    assert request.call_args.kwargs["json"] == {
        "model": "chat-model",
        "messages": [
            {"role": "system", "content": "Be concise."},
            {"role": "user", "content": "Say hello."},
        ],
    }


def test_embeddings_success_returns_vectors_in_input_order_without_auth_header():
    adapter = _adapter(api_key=None, embedding_dimension=3)
    mock_response = httpx.Response(
        status_code=200,
        json={
            "model": "embedding-response-model",
            "data": [
                {"index": 1, "embedding": [4, 5, 6]},
                {"index": 0, "embedding": [1, 2, 3]},
            ],
            "usage": {"prompt_tokens": 4, "total_tokens": 4},
        },
    )

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=mock_response,
    ) as request:
        result = adapter.create_embeddings(
            EmbeddingRequest(texts=["first text", "second text"])
        )

    assert result.embeddings == [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]
    assert result.model == "embedding-response-model"
    assert result.token_count == 4
    assert request.call_args.args == (
        "POST",
        "https://provider.example/v1/embeddings",
    )
    assert request.call_args.kwargs["headers"] == {"Content-Type": "application/json"}
    assert request.call_args.kwargs["json"] == {
        "model": "embedding-model",
        "input": ["first text", "second text"],
    }


def test_auth_failure_is_standardized():
    adapter = _adapter()

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(status_code=401, json={"error": "bad key"}),
    ):
        with pytest.raises(ProviderAuthError):
            adapter.create_chat_completion(
                ChatCompletionRequest(
                    messages=[ChatCompletionMessage(role="user", content="Hello")]
                )
            )


def test_timeout_is_standardized():
    adapter = _adapter()

    with patch(
        "app.ai.openai_compatible.httpx.request",
        side_effect=httpx.TimeoutException("too slow"),
    ):
        with pytest.raises(ProviderTimeoutError):
            adapter.create_embeddings(EmbeddingRequest(texts=["hello"]))


def test_request_failure_is_standardized():
    adapter = _adapter()

    with patch(
        "app.ai.openai_compatible.httpx.request",
        side_effect=httpx.ConnectError("connection refused"),
    ):
        with pytest.raises(ProviderConnectionError):
            adapter.check_health()


def test_malformed_chat_response_is_standardized():
    adapter = _adapter()

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(
            status_code=200,
            json={"choices": [{"message": {"content": None}}]},
        ),
    ):
        with pytest.raises(ProviderMalformedResponseError):
            adapter.create_chat_completion(
                ChatCompletionRequest(
                    messages=[ChatCompletionMessage(role="user", content="Hello")]
                )
            )


def test_malformed_embedding_response_is_standardized():
    adapter = _adapter(embedding_dimension=3)

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(
            status_code=200,
            json={"data": [{"index": 0, "embedding": [1, 2]}]},
        ),
    ):
        with pytest.raises(ProviderMalformedResponseError):
            adapter.create_embeddings(EmbeddingRequest(texts=["hello"]))


def test_embedding_response_rejects_missing_index():
    adapter = _adapter(embedding_dimension=3)

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(
            status_code=200,
            json={
                "data": [
                    {"index": 0, "embedding": [1, 2, 3]},
                ]
            },
        ),
    ):
        with pytest.raises(ProviderMalformedResponseError):
            adapter.create_embeddings(EmbeddingRequest(texts=["first", "second"]))


def test_embedding_response_rejects_duplicate_index():
    adapter = _adapter(embedding_dimension=3)

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(
            status_code=200,
            json={
                "data": [
                    {"index": 0, "embedding": [1, 2, 3]},
                    {"index": 0, "embedding": [4, 5, 6]},
                ]
            },
        ),
    ):
        with pytest.raises(ProviderMalformedResponseError):
            adapter.create_embeddings(EmbeddingRequest(texts=["first", "second"]))


def test_embedding_response_rejects_out_of_range_index():
    adapter = _adapter(embedding_dimension=3)

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(
            status_code=200,
            json={
                "data": [
                    {"index": 0, "embedding": [1, 2, 3]},
                    {"index": 2, "embedding": [4, 5, 6]},
                ]
            },
        ),
    ):
        with pytest.raises(ProviderMalformedResponseError):
            adapter.create_embeddings(EmbeddingRequest(texts=["first", "second"]))


def test_embedding_response_rejects_count_mismatch():
    adapter = _adapter(embedding_dimension=3)

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(
            status_code=200,
            json={
                "data": [
                    {"index": 0, "embedding": [1, 2, 3]},
                    {"index": 1, "embedding": [4, 5, 6]},
                ]
            },
        ),
    ):
        with pytest.raises(ProviderMalformedResponseError):
            adapter.create_embeddings(EmbeddingRequest(texts=["only text"]))


def test_non_auth_http_error_is_sanitized():
    adapter = _adapter()

    with patch(
        "app.ai.openai_compatible.httpx.request",
        return_value=httpx.Response(
            status_code=500,
            json={"error": "raw provider stack with sensitive details"},
        ),
    ):
        with pytest.raises(ProviderHTTPStatusError) as exc:
            adapter.create_embeddings(EmbeddingRequest(texts=["hello"]))

    assert exc.value.status_code == 500
    assert str(exc.value) == "Provider returned HTTP 500."
    assert "sensitive details" not in str(exc.value)


def _adapter(
    *,
    api_key: str | None = "test-key",
    embedding_dimension: int = 1536,
) -> OpenAICompatibleProviderAdapter:
    return OpenAICompatibleProviderAdapter(
        ProviderConfig(
            base_url="https://provider.example/v1/",
            api_key=api_key,
            chat_model="chat-model",
            embedding_model="embedding-model",
            embedding_dimension=embedding_dimension,
            timeout_seconds=15,
        )
    )
