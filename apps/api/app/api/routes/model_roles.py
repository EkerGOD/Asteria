from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.model_role import ModelRoleResponse, ModelRoleUpsertRequest
from app.services.model_roles import (
    InvalidModelRoleConfigurationError,
    ProviderModelNotFoundError,
    ProviderNotFoundError,
    list_model_roles,
    upsert_model_role,
)

router = APIRouter(prefix="/api/model-roles", tags=["model-roles"])


@router.get("", response_model=list[ModelRoleResponse])
def list_model_roles_endpoint(
    session: Session = Depends(get_db_session),
) -> list[ModelRoleResponse]:
    return [ModelRoleResponse.model_validate(mr) for mr in list_model_roles(session)]


@router.put("/{role_type}", response_model=ModelRoleResponse)
def upsert_model_role_endpoint(
    role_type: str,
    payload: ModelRoleUpsertRequest,
    session: Session = Depends(get_db_session),
) -> ModelRoleResponse:
    if role_type not in ("chat", "embedding"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role_type must be 'chat' or 'embedding'.",
        )
    try:
        return ModelRoleResponse.model_validate(
            upsert_model_role(session, role_type, payload)
        )
    except ProviderNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found.",
        )
    except ProviderModelNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model is not configured on the selected provider.",
        )
    except InvalidModelRoleConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Chat roles must select a provider model. "
                "Embedding roles must use a local model entry."
            ),
        )
