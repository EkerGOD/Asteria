from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.core.config import Settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    database_configured: bool


@router.get("/health", response_model=HealthResponse)
def read_health(request: Request) -> HealthResponse:
    settings: Settings = request.app.state.settings
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        database_configured=bool(settings.database_url),
    )
