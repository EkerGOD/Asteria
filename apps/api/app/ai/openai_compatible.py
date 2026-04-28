from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import httpx

from app.ai.errors import (
    ProviderAuthError,
    ProviderConnectionError,
    ProviderHTTPStatusError,
    ProviderMalformedResponseError,
    ProviderTimeoutError,
)
from app.ai.types import (
    ChatCompletionRequest,
    ChatCompletionResult,
    EmbeddingRequest,
    EmbeddingResult,
    ProviderConfig,
    TokenUsage,
)
from app.models import AIProvider


class OpenAICompatibleProviderAdapter:
    def __init__(self, config: ProviderConfig) -> None:
        self.config = config

    @classmethod
    def from_provider(cls, provider: AIProvider) -> OpenAICompatibleProviderAdapter:
        return cls(
            ProviderConfig(
                base_url=provider.base_url,
                api_key=provider.api_key_ciphertext,
                chat_model=provider.chat_model,
                embedding_model=provider.embedding_model,
                embedding_dimension=provider.embedding_dimension,
                timeout_seconds=provider.timeout_seconds,
            )
        )

    def create_chat_completion(
        self,
        request: ChatCompletionRequest,
    ) -> ChatCompletionResult:
        payload = {
            "model": self.config.chat_model,
            "messages": [
                {"role": message.role, "content": message.content}
                for message in request.messages
            ],
        }
        data = self._post_json("chat/completions", payload)
        return self._parse_chat_completion(data)

    def create_embeddings(self, request: EmbeddingRequest) -> EmbeddingResult:
        expected_count = len(request.texts)
        payload = {
            "model": self.config.embedding_model,
            "input": list(request.texts),
        }
        data = self._post_json("embeddings", payload)
        return self._parse_embeddings(data, expected_count)

    def check_health(self) -> None:
        self._request("GET", "models")

    def _post_json(self, path: str, payload: Mapping[str, Any]) -> Mapping[str, Any]:
        response = self._request("POST", path, json=payload)
        try:
            data = response.json()
        except ValueError as exc:
            raise ProviderMalformedResponseError from exc
        if not isinstance(data, Mapping):
            raise ProviderMalformedResponseError
        return data

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        try:
            response = httpx.request(
                method,
                self._url(path),
                headers=self._headers(),
                timeout=self.config.timeout_seconds,
                **kwargs,
            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError from exc
        except httpx.RequestError as exc:
            raise ProviderConnectionError from exc

        if response.status_code in {401, 403}:
            raise ProviderAuthError(status_code=response.status_code)
        if response.is_error:
            raise ProviderHTTPStatusError(
                f"Provider returned HTTP {response.status_code}.",
                status_code=response.status_code,
            )
        return response

    def _url(self, path: str) -> str:
        return f"{self.config.base_url.rstrip('/')}/{path.lstrip('/')}"

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers

    def _parse_chat_completion(
        self,
        data: Mapping[str, Any],
    ) -> ChatCompletionResult:
        choices = data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ProviderMalformedResponseError

        first_choice = choices[0]
        if not isinstance(first_choice, Mapping):
            raise ProviderMalformedResponseError

        message = first_choice.get("message")
        if not isinstance(message, Mapping):
            raise ProviderMalformedResponseError

        content = message.get("content")
        if not isinstance(content, str) or not content:
            raise ProviderMalformedResponseError

        model = data.get("model")
        if not isinstance(model, str) or not model:
            model = self.config.chat_model

        return ChatCompletionResult(
            content=content,
            model=model,
            usage=self._parse_usage(data.get("usage")),
        )

    def _parse_embeddings(
        self,
        data: Mapping[str, Any],
        expected_count: int,
    ) -> EmbeddingResult:
        items = data.get("data")
        if not isinstance(items, list):
            raise ProviderMalformedResponseError
        if len(items) != expected_count:
            raise ProviderMalformedResponseError

        embeddings: list[list[float] | None] = [None] * expected_count
        seen_indexes: set[int] = set()
        for item in items:
            if not isinstance(item, Mapping):
                raise ProviderMalformedResponseError
            index = self._embedding_index(item)
            if index < 0 or index >= expected_count or index in seen_indexes:
                raise ProviderMalformedResponseError
            seen_indexes.add(index)

            raw_embedding = item.get("embedding")
            if not isinstance(raw_embedding, list):
                raise ProviderMalformedResponseError
            embedding = self._parse_embedding_vector(raw_embedding)
            if len(embedding) != self.config.embedding_dimension:
                raise ProviderMalformedResponseError(
                    "Provider embedding dimension did not match configuration."
                )
            embeddings[index] = embedding

        if len(seen_indexes) != expected_count or any(item is None for item in embeddings):
            raise ProviderMalformedResponseError

        model = data.get("model")
        if not isinstance(model, str) or not model:
            model = self.config.embedding_model

        return EmbeddingResult(
            embeddings=[embedding for embedding in embeddings if embedding is not None],
            model=model,
            usage=self._parse_usage(data.get("usage")),
        )

    def _embedding_index(self, item: object) -> int:
        if not isinstance(item, Mapping):
            raise ProviderMalformedResponseError
        index = item.get("index")
        if not isinstance(index, int):
            raise ProviderMalformedResponseError
        return index

    def _parse_embedding_vector(self, raw_embedding: list[object]) -> list[float]:
        try:
            return [float(value) for value in raw_embedding]
        except (TypeError, ValueError) as exc:
            raise ProviderMalformedResponseError from exc

    def _parse_usage(self, usage: object) -> TokenUsage:
        if not isinstance(usage, Mapping):
            return TokenUsage()

        return TokenUsage(
            prompt_tokens=self._optional_int(usage.get("prompt_tokens")),
            completion_tokens=self._optional_int(usage.get("completion_tokens")),
            total_tokens=self._optional_int(usage.get("total_tokens")),
        )

    def _optional_int(self, value: object) -> int | None:
        if isinstance(value, int):
            return value
        return None
