from __future__ import annotations


class ProviderAdapterError(Exception):
    """Base error for normalized provider adapter failures."""

    default_message = "Provider request failed."

    def __init__(self, message: str | None = None, *, status_code: int | None = None) -> None:
        self.status_code = status_code
        super().__init__(message or self.default_message)


class ProviderAuthError(ProviderAdapterError):
    default_message = "Provider authentication failed."


class ProviderTimeoutError(ProviderAdapterError):
    default_message = "Provider request timed out."


class ProviderConnectionError(ProviderAdapterError):
    default_message = "Could not connect to provider."


class ProviderConfigurationError(ProviderAdapterError):
    default_message = "Provider configuration is invalid."


class ProviderHTTPStatusError(ProviderAdapterError):
    default_message = "Provider returned an error status."


class ProviderMalformedResponseError(ProviderAdapterError):
    default_message = "Provider returned a malformed response."
