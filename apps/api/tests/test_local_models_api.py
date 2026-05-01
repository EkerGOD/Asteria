import os
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.local_models import get_model_status


def _client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))


def test_local_model_status_reports_directory_diagnostics(settings: Settings, tmp_path):
    settings.app_data_dir = str(tmp_path / "asteria-data")

    with _client(settings) as client:
        response = client.get("/api/local-models/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["directories"]["app_data"]["path"] == settings.resolved_app_data_dir
    assert payload["directories"]["models"]["path"] == settings.resolved_models_dir
    assert (
        payload["directories"]["embedding_models"]["path"]
        == settings.embedding_models_dir
    )
    assert payload["directories"]["embedding_models"]["recovery_action"]
    assert payload["models"][0]["target_path"] == os.path.join(
        settings.embedding_models_dir, "bge-m3"
    )


def test_local_model_status_uses_embedding_models_dir_without_double_embedding(tmp_path):
    embedding_models_dir = tmp_path / "models" / "embedding"
    model_dir = embedding_models_dir / "bge-m3"
    _create_bge_m3_files(model_dir)

    status = get_model_status(str(embedding_models_dir), "bge-m3")

    assert status["status"] == "downloaded"
    assert status["local_path"] == str(model_dir)
    assert status["target_path"] == str(model_dir)
    assert "embedding/embedding" not in status["local_path"].replace("\\", "/")


def test_download_rejects_unusable_models_dir_with_structured_error(
    settings: Settings,
    tmp_path,
):
    models_path = tmp_path / "models-file"
    models_path.write_text("not a directory", encoding="utf-8")
    settings.models_dir = str(models_path)

    with _client(settings) as client:
        response = client.post("/api/local-models/bge-m3/download")

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "embedding_models_directory_unavailable"
    assert "ASTERIA_DATA_DIR or ASTERIA_MODELS_DIR is not configured" not in str(detail)
    assert detail["path"] == os.path.join(str(models_path), "embedding")
    assert detail["recovery_action"]


def _create_bge_m3_files(model_dir: Path) -> None:
    for file_name in ["onnx/model.onnx", "tokenizer.json", "config.json"]:
        file_path = model_dir / file_name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text("fixture", encoding="utf-8")
