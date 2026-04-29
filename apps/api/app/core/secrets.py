from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import Settings, get_settings

FERNET_V1_PREFIX = "fernet:v1:"


class SecretConfigurationError(RuntimeError):
    """Raised when API secret encryption is not configured correctly."""


class SecretDecryptionError(RuntimeError):
    """Raised when an encrypted secret cannot be decrypted."""


def encrypt_provider_api_key(
    api_key: str | None,
    settings: Settings | None = None,
) -> str | None:
    if api_key is None:
        return None

    fernet = _build_fernet(settings)
    token = fernet.encrypt(api_key.encode("utf-8")).decode("utf-8")
    return f"{FERNET_V1_PREFIX}{token}"


def decrypt_provider_api_key(
    stored_value: str | None,
    settings: Settings | None = None,
) -> str | None:
    if stored_value is None:
        return None
    if not stored_value.startswith(FERNET_V1_PREFIX):
        return stored_value

    fernet = _build_fernet(settings)
    token = stored_value.removeprefix(FERNET_V1_PREFIX)
    try:
        return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise SecretDecryptionError("Provider API key could not be decrypted.") from exc


def _build_fernet(settings: Settings | None = None) -> Fernet:
    app_settings = settings or get_settings()
    if app_settings.secret_key is None:
        raise SecretConfigurationError("Provider secret encryption is not configured.")

    secret_key = app_settings.secret_key.get_secret_value()
    try:
        return Fernet(secret_key.encode("utf-8"))
    except (TypeError, ValueError) as exc:
        raise SecretConfigurationError("Provider secret encryption key is invalid.") from exc
