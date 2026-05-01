from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.core.config import Settings

router = APIRouter(tags=["health"])


class DirectoryDiagnostic(BaseModel):
    status: Literal["configured", "defaulted", "missing", "unavailable"]
    path: str
    source: str
    configured: bool
    exists: bool
    writable: bool
    message: str
    reason: str | None
    recovery_action: str | None


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    database_configured: bool
    directories: dict[str, DirectoryDiagnostic]


@router.get("/health", response_model=HealthResponse)
def read_health(request: Request) -> HealthResponse:
    settings: Settings = request.app.state.settings
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        database_configured=bool(settings.database_url),
        directories=settings.directory_diagnostics(),
    )
