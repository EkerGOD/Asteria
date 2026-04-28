from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings

SessionFactory = sessionmaker[Session]


def build_engine(settings: Settings | None = None, **engine_kwargs: object) -> Engine:
    app_settings = settings or get_settings()
    options: dict[str, object] = {
        "future": True,
        "pool_pre_ping": True,
    }
    options.update(engine_kwargs)
    return create_engine(app_settings.database_url, **options)


@lru_cache
def get_engine() -> Engine:
    return build_engine()


def build_session_factory(engine: Engine | None = None) -> SessionFactory:
    return sessionmaker(
        bind=engine or get_engine(),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )


@lru_cache
def get_session_factory() -> SessionFactory:
    return build_session_factory()


def get_db_session() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
