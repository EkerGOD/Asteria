from __future__ import annotations

import os
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import httpx


class LocalModelStatus(str, Enum):
    NOT_DOWNLOADED = "not_downloaded"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    FAILED = "failed"


@dataclass
class LocalEmbeddingModel:
    name: str
    dimension: int
    description: str
    huggingface_repo: str
    files: list[str] = field(default_factory=list)

    status: LocalModelStatus = LocalModelStatus.NOT_DOWNLOADED
    progress: int | None = None
    error_message: str | None = None


LOCAL_EMBEDDING_MODELS: dict[str, LocalEmbeddingModel] = {
    "bge-m3": LocalEmbeddingModel(
        name="bge-m3",
        dimension=1024,
        description="BAAI General Embedding (Multi-language, 1024-dim)",
        huggingface_repo="BAAI/bge-m3",
        files=["onnx/model.onnx", "tokenizer.json", "config.json"],
    ),
}


def get_local_model(model_name: str) -> LocalEmbeddingModel | None:
    return LOCAL_EMBEDDING_MODELS.get(model_name)


def list_local_models() -> list[LocalEmbeddingModel]:
    return list(LOCAL_EMBEDDING_MODELS.values())


def resolve_model_local_path(
    embedding_models_dir: str | None, model_name: str
) -> str | None:
    if embedding_models_dir is None:
        return None
    return os.path.join(embedding_models_dir, model_name)


def check_model_downloaded(embedding_models_dir: str | None, model_name: str) -> bool:
    model_path = resolve_model_local_path(embedding_models_dir, model_name)
    if model_path is None:
        return False
    model = get_local_model(model_name)
    if model is None:
        return False
    for file_name in model.files:
        if not os.path.isfile(os.path.join(model_path, file_name)):
            return False
    return True


def get_model_status(
    embedding_models_dir: str | None, model_name: str
) -> dict[str, Any]:
    model = get_local_model(model_name)
    if model is None:
        return {"name": model_name, "status": "unknown"}
    target_path = resolve_model_local_path(embedding_models_dir, model_name)
    is_downloaded = check_model_downloaded(embedding_models_dir, model_name)
    state = _download_state.get(model_name)
    if state is not None:
        status = state["status"]
        return {
            "name": model.name,
            "dimension": model.dimension,
            "description": model.description,
            "status": status,
            "local_path": target_path if status == LocalModelStatus.DOWNLOADED else None,
            "target_path": target_path,
            "progress": state["progress"],
            "error_message": state["error_message"],
            "next_step": _next_step_for_status(status),
        }
    status = (
        LocalModelStatus.DOWNLOADED
        if is_downloaded
        else LocalModelStatus.NOT_DOWNLOADED
    )
    return {
        "name": model.name,
        "dimension": model.dimension,
        "description": model.description,
        "status": status,
        "local_path": target_path if is_downloaded else None,
        "target_path": target_path,
        "next_step": _next_step_for_status(status),
    }


_download_state: dict[str, dict[str, Any]] = {}


def start_model_download(model_name: str, embedding_models_dir: str) -> None:
    model = get_local_model(model_name)
    if model is None:
        return

    if model_name in _download_state and _download_state[model_name]["status"] == "downloading":
        return

    _download_state[model_name] = {
        "status": LocalModelStatus.DOWNLOADING,
        "progress": 0,
        "error_message": None,
    }

    thread = threading.Thread(
        target=_download_model_files,
        args=(model, embedding_models_dir),
        daemon=True,
    )
    thread.start()


def _download_model_files(model: LocalEmbeddingModel, embedding_models_dir: str) -> None:
    base_url = f"https://huggingface.co/{model.huggingface_repo}/resolve/main"
    dest_dir = os.path.join(embedding_models_dir, model.name)

    try:
        total = len(model.files)
        for idx, file_name in enumerate(model.files):
            url = f"{base_url}/{file_name}"
            dest_path = os.path.join(dest_dir, file_name)

            os.makedirs(os.path.dirname(dest_path), exist_ok=True)

            with httpx.stream("GET", url, follow_redirects=True, timeout=600) as response:
                if response.status_code >= 400:
                    raise RuntimeError(
                        f"Download failed for {file_name}: HTTP {response.status_code}"
                    )
                with open(dest_path, "wb") as f:
                    for chunk in response.iter_bytes(chunk_size=1024 * 1024):
                        f.write(chunk)

            file_progress = int(((idx + 1) / total) * 100)
            _download_state[model.name] = {
                "status": LocalModelStatus.DOWNLOADING,
                "progress": file_progress,
                "error_message": None,
            }

        _download_state[model.name] = {
            "status": LocalModelStatus.DOWNLOADED,
            "progress": 100,
            "error_message": None,
        }
    except Exception as exc:
        _download_state[model.name] = {
            "status": LocalModelStatus.FAILED,
            "progress": 0,
            "error_message": str(exc),
        }


def get_download_progress(model_name: str) -> dict[str, Any] | None:
    return _download_state.get(model_name)


def _next_step_for_status(status: LocalModelStatus | str) -> str:
    if status == LocalModelStatus.FAILED:
        return "Check the models directory, network connection, then retry the download."
    if status == LocalModelStatus.DOWNLOADING:
        return "Keep Settings open or refresh model status to track progress."
    if status == LocalModelStatus.DOWNLOADED:
        return "The model is ready for the local embedding role."
    return "Download this model before using it for local embeddings."
