from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai import ProviderAdapterError, ProviderTimeoutError
from app.db.session import get_db_session
from app.rag import answer_rag_chat
from app.schemas.rag import RAGAnswerRequest, RAGAnswerResponse
from app.services.conversations import ConversationNotFoundError
from app.services.embeddings import ActiveProviderNotConfiguredError

router = APIRouter(prefix="/api/rag", tags=["rag"])


@router.post(
    "/answer",
    response_model=RAGAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
def rag_answer_endpoint(
    payload: RAGAnswerRequest,
    session: Session = Depends(get_db_session),
) -> RAGAnswerResponse:
    try:
        return RAGAnswerResponse.model_validate(answer_rag_chat(session, payload))
    except ConversationNotFoundError as exc:
        raise _conversation_not_found() from exc
    except ActiveProviderNotConfiguredError as exc:
        raise _active_provider_not_configured() from exc
    except ProviderTimeoutError as exc:
        raise _rag_provider_timeout() from exc
    except ProviderAdapterError as exc:
        raise _rag_provider_error() from exc


def _conversation_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Conversation not found.",
    )


def _active_provider_not_configured() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Active provider is not configured.",
    )


def _rag_provider_timeout() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        detail="Provider request timed out while generating RAG answer.",
    )


def _rag_provider_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Provider failed while generating RAG answer.",
    )
