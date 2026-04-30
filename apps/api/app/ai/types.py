from __future__ import annotations

from collections.abc import Iterator, Sequence
from dataclasses import dataclass, field
from typing import Literal, Protocol


ProviderMessageRole = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class ProviderConfig:
    base_url: str
    api_key: str | None
    chat_model: str
    embedding_model: str
    embedding_dimension: int
    timeout_seconds: int


@dataclass(frozen=True)
class ChatCompletionMessage:
    role: ProviderMessageRole
    content: str


@dataclass(frozen=True)
class ChatCompletionRequest:
    messages: Sequence[ChatCompletionMessage]


@dataclass(frozen=True)
class EmbeddingRequest:
    texts: Sequence[str]


@dataclass(frozen=True)
class TokenUsage:
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


@dataclass(frozen=True)
class ChatCompletionResult:
    content: str
    model: str
    usage: TokenUsage = field(default_factory=TokenUsage)

    @property
    def token_count(self) -> int | None:
        return self.usage.total_tokens


@dataclass(frozen=True)
class ChatCompletionChunk:
    content_delta: str = ""
    model: str | None = None
    usage: TokenUsage | None = None


@dataclass(frozen=True)
class EmbeddingResult:
    embeddings: list[list[float]]
    model: str
    usage: TokenUsage = field(default_factory=TokenUsage)

    @property
    def token_count(self) -> int | None:
        return self.usage.total_tokens


class ProviderAdapter(Protocol):
    def create_chat_completion(
        self,
        request: ChatCompletionRequest,
    ) -> ChatCompletionResult:
        """Create a chat completion through the configured provider."""
        ...

    def create_chat_completion_stream(
        self,
        request: ChatCompletionRequest,
    ) -> Iterator[ChatCompletionChunk]:
        """Stream a chat completion through the configured provider."""
        ...

    def create_embeddings(self, request: EmbeddingRequest) -> EmbeddingResult:
        """Create embeddings through the configured provider."""
        ...

    def check_health(self) -> None:
        """Raise a normalized provider error when the provider is unreachable."""
        ...
