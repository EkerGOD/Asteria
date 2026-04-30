"""Development smoke test helpers for Asteria / Xing Shi.

This script intentionally uses only Python's standard library so it can run
from a clean checkout once Python is available.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


DEFAULT_API_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_PROVIDER_BASE_URL = "http://127.0.0.1:18080/v1"
DEFAULT_PROVIDER_HOST = "127.0.0.1"
DEFAULT_PROVIDER_PORT = 18080
SMOKE_CHAT_MODEL = "asteria-smoke-chat"
SMOKE_EMBEDDING_MODEL = "asteria-smoke-embedding"
EMBEDDING_DIMENSION = 1536


class SmokeError(Exception):
    """Raised when a smoke assertion fails."""


class ApiClient:
    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def get(self, path: str) -> Any:
        return self.request("GET", path)

    def post(self, path: str, payload: dict[str, Any] | None = None) -> Any:
        return self.request("POST", path, payload)

    def delete(self, path: str) -> Any:
        return self.request("DELETE", path)

    def request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        data = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = Request(
            f"{self.base_url}{_normalize_path(path)}",
            data=data,
            headers=headers,
            method=method,
        )

        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return _decode_response(response.read())
        except HTTPError as exc:
            detail = _decode_response(exc.read())
            raise SmokeError(
                f"{method} {path} returned HTTP {exc.code}: {detail!r}"
            ) from exc
        except URLError as exc:
            raise SmokeError(
                f"Could not reach Asteria API at {self.base_url}: {exc.reason}"
            ) from exc


class SmokeProviderHandler(BaseHTTPRequestHandler):
    server_version = "AsteriaSmokeProvider/0.1"

    def do_GET(self) -> None:
        if self._path() == "/v1/models":
            self._send_json(
                {
                    "object": "list",
                    "data": [
                        {"id": SMOKE_CHAT_MODEL, "object": "model"},
                        {"id": SMOKE_EMBEDDING_MODEL, "object": "model"},
                    ],
                }
            )
            return

        self._send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        path = self._path()
        if path == "/v1/embeddings":
            self._handle_embeddings()
            return
        if path == "/v1/chat/completions":
            self._handle_chat_completion()
            return

        self._send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)

    def log_message(self, format: str, *args: object) -> None:
        sys.stderr.write(
            "%s - - [%s] %s\n"
            % (self.address_string(), self.log_date_time_string(), format % args)
        )

    def _handle_embeddings(self) -> None:
        body = self._read_json()
        raw_input = body.get("input", [])
        if isinstance(raw_input, str):
            inputs = [raw_input]
        elif isinstance(raw_input, list) and all(isinstance(item, str) for item in raw_input):
            inputs = raw_input
        else:
            self._send_json(
                {"error": "input must be a string or list of strings"},
                HTTPStatus.BAD_REQUEST,
            )
            return

        model = body.get("model")
        if not isinstance(model, str) or not model:
            model = SMOKE_EMBEDDING_MODEL

        self._send_json(
            {
                "object": "list",
                "data": [
                    {
                        "object": "embedding",
                        "index": index,
                        "embedding": _fake_embedding_vector(),
                    }
                    for index, _text in enumerate(inputs)
                ],
                "model": model,
                "usage": {
                    "prompt_tokens": len(inputs),
                    "total_tokens": len(inputs),
                },
            }
        )

    def _handle_chat_completion(self) -> None:
        body = self._read_json()
        model = body.get("model")
        if not isinstance(model, str) or not model:
            model = SMOKE_CHAT_MODEL

        self._send_json(
            {
                "id": f"chatcmpl-smoke-{uuid.uuid4().hex}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": model,
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": (
                                "Smoke provider answer based on retrieved "
                                "Asteria context [S1]."
                            ),
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 12,
                    "completion_tokens": 8,
                    "total_tokens": 20,
                },
            }
        )

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            return {}
        if isinstance(data, dict):
            return data
        return {}

    def _send_json(
        self,
        payload: dict[str, Any],
        status: HTTPStatus = HTTPStatus.OK,
    ) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _path(self) -> str:
        return urlparse(self.path).path.rstrip("/") or "/"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run Asteria development smoke test helpers."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    provider_parser = subparsers.add_parser(
        "serve-provider",
        help="Run a local fake OpenAI-compatible provider.",
    )
    provider_parser.add_argument("--host", default=DEFAULT_PROVIDER_HOST)
    provider_parser.add_argument("--port", type=int, default=DEFAULT_PROVIDER_PORT)
    provider_parser.set_defaults(func=serve_provider)

    run_parser = subparsers.add_parser(
        "run",
        help="Run API smoke checks against a running Asteria API.",
    )
    run_parser.add_argument(
        "--api-base-url",
        default=os.environ.get("ASTERIA_API_BASE_URL", DEFAULT_API_BASE_URL),
    )
    run_parser.add_argument(
        "--provider-base-url",
        default=os.environ.get(
            "ASTERIA_SMOKE_PROVIDER_BASE_URL",
            DEFAULT_PROVIDER_BASE_URL,
        ),
    )
    run_parser.add_argument("--timeout-seconds", type=float, default=15.0)
    run_parser.add_argument(
        "--cleanup",
        action="store_true",
        help=(
            "Archive created project, knowledge unit, and conversation; delete "
            "the smoke provider; and restore the previous active provider when possible."
        ),
    )
    run_parser.set_defaults(func=run_smoke_test)

    args = parser.parse_args()

    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    except SmokeError as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        return 1

    return 0


def serve_provider(args: argparse.Namespace) -> None:
    address = (args.host, args.port)
    server = ThreadingHTTPServer(address, SmokeProviderHandler)
    print(
        "Serving fake OpenAI-compatible provider at "
        f"http://{args.host}:{args.port}/v1"
    )
    print("Press Ctrl+C to stop.")
    server.serve_forever()


def run_smoke_test(args: argparse.Namespace) -> None:
    client = ApiClient(args.api_base_url, args.timeout_seconds)
    created: dict[str, str] = {}
    previous_first_provider_id: str | None = None
    suffix = _smoke_suffix()

    try:
        step("Checking API health")
        health = client.get("/health")
        require(health.get("status") == "ok", "API health status was not ok.")
        require(
            health.get("database_configured") is True,
            "API did not report a configured database URL.",
        )

        step("Listing providers to verify database-backed API access")
        providers = client.get("/api/providers")
        require(isinstance(providers, list), "Provider list response was not a list.")
        previous_first_provider_id = _first_provider_id(providers)

        step("Creating smoke project")
        project = client.post(
            "/api/projects",
            {
                "name": f"Smoke Project {suffix}",
                "description": "Created by scripts/dev-smoke-test.py.",
            },
        )
        created["project_id"] = require_id(project, "project")

        step("Creating and activating smoke provider")
        provider = client.post(
            "/api/providers",
            {
                "name": f"Smoke Provider {suffix}",
                "base_url": args.provider_base_url.rstrip("/"),
                "api_key": "smoke-test-key",
                "chat_model": SMOKE_CHAT_MODEL,
                "embedding_model": SMOKE_EMBEDDING_MODEL,
                "timeout_seconds": 15,
                "metadata": {"smoke_test": True},
            },
        )
        created["provider_id"] = require_id(provider, "provider")
        require(provider.get("has_api_key") is True, "Smoke provider did not store an API key.")

        step("Checking provider health through the API")
        provider_health = client.post(
            f"/api/providers/{created['provider_id']}/health-check"
        )
        require(
            provider_health.get("status") == "ok",
            f"Provider health check failed: {provider_health!r}",
        )

        step("Creating knowledge unit and exercising embedding generation")
        knowledge = client.post(
            "/api/knowledge-units",
            {
                "project_id": created["project_id"],
                "title": f"Smoke Knowledge {suffix}",
                "content": (
                    "Asteria smoke test knowledge confirms that the local "
                    "database, API, provider adapter, embeddings, retrieval, "
                    "and RAG answer path are wired together."
                ),
                "metadata": {"smoke_test": True},
            },
        )
        created["knowledge_id"] = require_id(knowledge, "knowledge unit")

        step("Refreshing embeddings explicitly")
        refresh = client.post(
            f"/api/knowledge-units/{created['knowledge_id']}/embeddings/refresh"
        )
        require(refresh.get("chunk_count", 0) >= 1, "Embedding refresh created no chunks.")
        require(
            refresh.get("created_count", 0) + refresh.get("reused_count", 0) >= 1,
            "Embedding refresh did not create or reuse any embeddings.",
        )

        step("Running semantic retrieval")
        search = client.post(
            "/api/search/semantic",
            {
                "query": "What does the Asteria smoke test verify?",
                "project_id": created["project_id"],
                "top_k": 5,
                "min_score": 0.0,
            },
        )
        results = search.get("results", [])
        require(isinstance(results, list) and results, "Semantic search returned no results.")
        require(
            any(result.get("knowledge_unit_id") == created["knowledge_id"] for result in results),
            "Semantic search did not return the smoke knowledge unit.",
        )

        step("Creating smoke conversation")
        conversation = client.post(
            "/api/conversations",
            {
                "project_id": created["project_id"],
                "title": f"Smoke Conversation {suffix}",
                "metadata": {"smoke_test": True},
            },
        )
        created["conversation_id"] = require_id(conversation, "conversation")

        step("Generating RAG answer")
        rag = client.post(
            "/api/rag/answer",
            {
                "conversation_id": created["conversation_id"],
                "content": "What does the Asteria smoke test verify?",
                "project_id": created["project_id"],
                "top_k": 5,
                "min_score": 0.0,
            },
        )
        assistant_message = rag.get("assistant_message", {})
        sources = rag.get("sources", [])
        require(
            assistant_message.get("role") == "assistant",
            "RAG response did not include an assistant message.",
        )
        require(
            "Smoke provider answer" in assistant_message.get("content", ""),
            "RAG assistant content did not come from the smoke provider.",
        )
        require(
            any(source.get("knowledge_unit_id") == created["knowledge_id"] for source in sources),
            "RAG response did not include the smoke knowledge source.",
        )

        print("\nDevelopment smoke test passed.")
        if not args.cleanup:
            print("Created resources were left in place:")
            for key, value in created.items():
                print(f"  {key}: {value}")
            print(
                "Clean these resources manually, or use --cleanup on future "
                "runs when you do not need to inspect them."
            )
    finally:
        if args.cleanup:
            cleanup_smoke_resources(client, created, previous_first_provider_id)


def cleanup_smoke_resources(
    client: ApiClient,
    created: dict[str, str],
    previous_first_provider_id: str | None,
) -> None:
    step("Cleaning up smoke resources")

    _ignore_cleanup_error(
        "archive conversation",
        lambda: client.delete(f"/api/conversations/{created['conversation_id']}"),
        created,
        "conversation_id",
    )
    _ignore_cleanup_error(
        "archive knowledge unit",
        lambda: client.delete(f"/api/knowledge-units/{created['knowledge_id']}"),
        created,
        "knowledge_id",
    )
    _ignore_cleanup_error(
        "archive project",
        lambda: client.delete(f"/api/projects/{created['project_id']}"),
        created,
        "project_id",
    )
    _ignore_cleanup_error(
        "delete smoke provider",
        lambda: client.delete(f"/api/providers/{created['provider_id']}"),
        created,
        "provider_id",
    )

    if previous_first_provider_id and previous_first_provider_id != created.get("provider_id"):
        try:
            client.post(f"/api/providers/{previous_first_provider_id}/activate")
            print(f"Restored previous active provider: {previous_first_provider_id}")
        except SmokeError as exc:
            print(
                "Warning: could not restore previous active provider "
                f"{previous_first_provider_id}: {exc}",
                file=sys.stderr,
            )


def _ignore_cleanup_error(
    label: str,
    action: Any,
    created: dict[str, str],
    key: str,
) -> None:
    if key not in created:
        return
    try:
        action()
    except SmokeError as exc:
        print(f"Warning: cleanup failed during {label}: {exc}", file=sys.stderr)


def step(message: str) -> None:
    print(f"\n==> {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeError(message)


def require_id(payload: Any, label: str) -> str:
    require(isinstance(payload, dict), f"{label} response was not an object.")
    value = payload.get("id")
    require(isinstance(value, str) and bool(value), f"{label} response did not include an id.")
    return value


def _first_provider_id(providers: Any) -> str | None:
    if not isinstance(providers, list) or len(providers) == 0:
        return None
    provider = providers[0]
    if isinstance(provider, dict):
        provider_id = provider.get("id")
        if isinstance(provider_id, str):
            return provider_id
    return None


def _fake_embedding_vector() -> list[float]:
    return [1.0] + [0.0] * (EMBEDDING_DIMENSION - 1)


def _decode_response(data: bytes) -> Any:
    if not data:
        return None
    text = data.decode("utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def _normalize_path(path: str) -> str:
    return path if path.startswith("/") else f"/{path}"


def _smoke_suffix() -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    return f"{timestamp}-{uuid.uuid4().hex[:8]}"


if __name__ == "__main__":
    raise SystemExit(main())
