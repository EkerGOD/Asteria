import os

from app.core.config import APP_IDENTIFIER, get_settings


def test_settings_reads_database_and_local_api_environment(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv(
        "ASTERIA_API_DATABASE_URL",
        "postgresql+psycopg://env:env@127.0.0.1:5432/envdb",
    )
    monkeypatch.setenv("ASTERIA_API_HOST", "127.0.0.1")
    monkeypatch.setenv("ASTERIA_API_PORT", "8010")
    monkeypatch.setenv("ASTERIA_API_CORS_ORIGINS", "http://localhost:1420,http://127.0.0.1:1420")
    monkeypatch.setenv("ASTERIA_API_SECRET_KEY", "OIOH6EK_-XuDoimnmJdKbBllrq4EmKDlqBqktQeqpjw=")

    settings = get_settings()

    assert settings.database_url == "postgresql+psycopg://env:env@127.0.0.1:5432/envdb"
    assert settings.local_api_url == "http://127.0.0.1:8010"
    assert settings.cors_origin_list == ["http://localhost:1420", "http://127.0.0.1:1420"]
    assert settings.secret_key is not None
    assert settings.secret_key.get_secret_value() == "OIOH6EK_-XuDoimnmJdKbBllrq4EmKDlqBqktQeqpjw="
    get_settings.cache_clear()


def test_settings_resolves_default_app_data_and_models_dirs(monkeypatch, tmp_path):
    get_settings.cache_clear()
    monkeypatch.delenv("ASTERIA_DATA_DIR", raising=False)
    monkeypatch.delenv("ASTERIA_MODELS_DIR", raising=False)
    monkeypatch.setenv("APPDATA", str(tmp_path / "roaming"))
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg-data"))

    settings = get_settings()

    assert settings.app_data_dir is None
    assert settings.models_dir is None
    assert settings.resolved_app_data_dir.endswith(APP_IDENTIFIER)
    assert settings.resolved_models_dir == os.path.join(
        settings.resolved_app_data_dir, "models"
    )
    assert settings.embedding_models_dir == os.path.join(
        settings.resolved_app_data_dir, "models", "embedding"
    )
    get_settings.cache_clear()
