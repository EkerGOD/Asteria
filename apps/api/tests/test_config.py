from app.core.config import get_settings


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
