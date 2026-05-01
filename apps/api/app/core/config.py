from functools import lru_cache
import os
from pathlib import Path
import sys
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_CORS_ORIGINS = (
    "http://localhost:1420,"
    "http://127.0.0.1:1420,"
    "http://localhost:5173,"
    "http://127.0.0.1:5173"
)
APP_IDENTIFIER = "com.asteria.desktop"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = Field(
        default="Asteria API",
        validation_alias=AliasChoices("ASTERIA_API_APP_NAME", "APP_NAME"),
    )
    app_version: str = Field(
        default="0.1.0",
        validation_alias=AliasChoices("ASTERIA_API_APP_VERSION", "APP_VERSION"),
    )
    environment: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias=AliasChoices("ASTERIA_API_ENVIRONMENT", "ENVIRONMENT"),
    )
    host: str = Field(
        default="127.0.0.1",
        validation_alias=AliasChoices("ASTERIA_API_HOST", "API_HOST"),
    )
    port: int = Field(
        default=8000,
        validation_alias=AliasChoices("ASTERIA_API_PORT", "API_PORT"),
    )
    database_url: str = Field(
        default="postgresql+psycopg://asteria:asteria@127.0.0.1:5432/asteria",
        validation_alias=AliasChoices("ASTERIA_API_DATABASE_URL", "DATABASE_URL"),
    )
    secret_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("ASTERIA_API_SECRET_KEY", "SECRET_KEY"),
    )
    cors_origins: str = Field(
        default=DEFAULT_CORS_ORIGINS,
        validation_alias=AliasChoices("ASTERIA_API_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    app_data_dir: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ASTERIA_DATA_DIR"),
    )
    models_dir: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ASTERIA_MODELS_DIR"),
    )

    @property
    def resolved_app_data_dir(self) -> str:
        if self.app_data_dir:
            return _normalize_path(self.app_data_dir)
        return str(_default_app_data_dir())

    @property
    def resolved_models_dir(self) -> str:
        if self.models_dir:
            return _normalize_path(self.models_dir)
        return str(Path(self.resolved_app_data_dir) / "models")

    @property
    def embedding_models_dir(self) -> str:
        return str(Path(self.resolved_models_dir) / "embedding")

    def directory_diagnostics(
        self, *, create: bool = False
    ) -> dict[str, dict[str, object]]:
        app_data_configured = self.app_data_dir is not None
        models_configured = self.models_dir is not None
        derived_from_configured_data = app_data_configured and not models_configured

        return {
            "app_data": _directory_status(
                path=Path(self.resolved_app_data_dir),
                label="application data",
                source="ASTERIA_DATA_DIR" if app_data_configured else "default",
                configured=app_data_configured,
                create=create,
            ),
            "models": _directory_status(
                path=Path(self.resolved_models_dir),
                label="models",
                source=(
                    "ASTERIA_MODELS_DIR"
                    if models_configured
                    else "derived_from_app_data_dir"
                ),
                configured=models_configured or derived_from_configured_data,
                create=create,
            ),
            "embedding_models": _directory_status(
                path=Path(self.embedding_models_dir),
                label="embedding models",
                source="derived_from_models_dir",
                configured=models_configured or derived_from_configured_data,
                create=create,
            ),
        }

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def local_api_url(self) -> str:
        return f"http://{self.host}:{self.port}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def _normalize_path(path: str) -> str:
    return str(Path(path).expanduser())


def _default_app_data_dir() -> Path:
    if os.name == "nt":
        base_dir = os.environ.get("APPDATA")
        if base_dir:
            return Path(base_dir) / APP_IDENTIFIER
        return Path.home() / "AppData" / "Roaming" / APP_IDENTIFIER

    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_IDENTIFIER

    base_dir = os.environ.get("XDG_DATA_HOME")
    if base_dir:
        return Path(base_dir) / APP_IDENTIFIER
    return Path.home() / ".local" / "share" / APP_IDENTIFIER


def _directory_status(
    *,
    path: Path,
    label: str,
    source: str,
    configured: bool,
    create: bool,
) -> dict[str, object]:
    resolved_path = path.expanduser()
    create_error: str | None = None

    if create:
        try:
            resolved_path.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            create_error = str(exc)

    exists = resolved_path.exists()
    is_directory = resolved_path.is_dir() if exists else False
    writable = (
        _is_writable_directory_path(resolved_path)
        if create_error is None
        else False
    )

    if create_error is not None:
        status = "unavailable"
        message = f"Asteria could not prepare the {label} directory."
        reason = create_error
    elif exists and not is_directory:
        status = "unavailable"
        message = f"The configured {label} path exists but is not a directory."
        reason = None
    elif exists and not writable:
        status = "unavailable"
        message = f"The {label} directory is not writable."
        reason = None
    elif exists:
        status = "configured" if configured else "defaulted"
        message = f"The {label} directory is ready."
        reason = None
    else:
        status = "missing" if configured else "defaulted"
        message = (
            f"The {label} directory will be created when Asteria needs it."
            if not configured
            else f"The configured {label} directory does not exist yet."
        )
        reason = None

    return {
        "status": status,
        "path": str(resolved_path),
        "source": source,
        "configured": configured,
        "exists": exists,
        "writable": writable,
        "message": message,
        "reason": reason,
        "recovery_action": _directory_recovery_action(
            status=status,
            label=label,
            source=source,
            configured=configured,
        ),
    }


def _is_writable_directory_path(path: Path) -> bool:
    if path.exists():
        return path.is_dir() and os.access(path, os.W_OK)
    return os.access(_nearest_existing_parent(path), os.W_OK)


def _nearest_existing_parent(path: Path) -> str:
    current = path
    while not current.exists() and current.parent != current:
        current = current.parent
    return str(current if current.exists() else Path.cwd())


def _directory_recovery_action(
    *,
    status: str,
    label: str,
    source: str,
    configured: bool,
) -> str | None:
    if status == "unavailable":
        if source.startswith("derived_"):
            return (
                f"Choose a writable {label} path or update ASTERIA_MODELS_DIR "
                "or ASTERIA_DATA_DIR before retrying."
            )
        return (
            f"Choose a writable {label} directory or update {source} before retrying."
        )
    if status == "missing" and configured:
        if source.startswith("derived_"):
            return (
                f"Create the {label} directory or update ASTERIA_MODELS_DIR "
                "or ASTERIA_DATA_DIR."
            )
        return f"Create the {label} directory or choose a writable {source} path."
    if status == "defaulted" and not configured:
        return (
            "No manual environment variable is required. "
            f"Asteria will use the default {label} path."
        )
    return None
