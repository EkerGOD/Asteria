from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai import ProviderAdapterError, ProviderTimeoutError
from app.db.session import get_db_session
from app.rag import retrieve_relevant_chunks
from app.schemas.search import SemanticSearchRequest, SemanticSearchResponse
from app.services.embeddings import ActiveProviderNotConfiguredError

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("/semantic", response_model=SemanticSearchResponse)
def semantic_search_endpoint(
    payload: SemanticSearchRequest,
    session: Session = Depends(get_db_session),
) -> SemanticSearchResponse:
    try:
        return SemanticSearchResponse.model_validate(
            retrieve_relevant_chunks(
                session,
                payload.query,
                project_id=payload.project_id,
                tag_slugs=payload.tag_slugs,
                top_k=payload.top_k,
                min_score=payload.min_score,
            )
        )
    except ActiveProviderNotConfiguredError as exc:
        raise _active_provider_not_configured() from exc
    except ProviderTimeoutError as exc:
        raise _query_embedding_provider_timeout() from exc
    except ProviderAdapterError as exc:
        raise _query_embedding_provider_error() from exc


def _active_provider_not_configured() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Active provider is not configured.",
    )


def _query_embedding_provider_timeout() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        detail="Provider request timed out while creating query embedding.",
    )


def _query_embedding_provider_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Provider failed while creating query embedding.",
    )
