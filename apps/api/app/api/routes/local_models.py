from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import Settings
from app.services.local_models import (
    get_local_model,
    get_model_status,
    list_local_models,
    start_model_download,
)

router = APIRouter(prefix="/api/local-models", tags=["local-models"])


@router.get("/status")
def local_model_status(request: Request) -> dict:
    settings: Settings = request.app.state.settings
    models_dir = settings.embedding_models_dir
    models = [
        get_model_status(models_dir, m.name) for m in list_local_models()
    ]
    return {"models": models}


@router.post("/{model_name}/download", status_code=status.HTTP_202_ACCEPTED)
def local_model_download(model_name: str, request: Request) -> dict:
    settings: Settings = request.app.state.settings
    models_dir = settings.embedding_models_dir
    if models_dir is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ASTERIA_DATA_DIR or ASTERIA_MODELS_DIR is not configured",
        )
    model = get_local_model(model_name)
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown local model: {model_name}",
        )
    start_model_download(model_name, models_dir)
    return get_model_status(models_dir, model_name)
