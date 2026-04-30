from functools import lru_cache
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
    def embedding_models_dir(self) -> str | None:
        if self.models_dir:
            return f"{self.models_dir}/embedding"
        if self.app_data_dir:
            return f"{self.app_data_dir}/models/embedding"
        return None

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def local_api_url(self) -> str:
        return f"http://{self.host}:{self.port}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
