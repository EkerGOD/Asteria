"""Shared Pydantic helpers for request/response schemas."""


def normalize_optional_text(value: str | None) -> str | None:
    """Strip whitespace; return None if the result is empty."""
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None
