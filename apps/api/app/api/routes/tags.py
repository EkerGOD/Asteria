from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.tag import TagCreate, TagResponse
from app.services.tags import (
    TagNameConflictError,
    TagSlugConflictError,
    create_tag,
    list_tags,
)

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag_endpoint(
    payload: TagCreate,
    session: Session = Depends(get_db_session),
) -> TagResponse:
    try:
        return TagResponse.model_validate(create_tag(session, payload))
    except ValueError as exc:
        raise _tag_bad_request(str(exc)) from exc
    except TagNameConflictError as exc:
        raise _tag_name_conflict() from exc
    except TagSlugConflictError as exc:
        raise _tag_slug_conflict() from exc


@router.get("", response_model=list[TagResponse])
def list_tags_endpoint(
    session: Session = Depends(get_db_session),
) -> list[TagResponse]:
    return [TagResponse.model_validate(tag) for tag in list_tags(session)]


def _tag_bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _tag_name_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="A tag with this name already exists.",
    )


def _tag_slug_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="A tag with this slug already exists.",
    )
