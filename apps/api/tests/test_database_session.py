from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import build_session_factory, get_db_session


def test_base_metadata_has_stable_constraint_names():
    assert Base.metadata.naming_convention["pk"] == "pk_%(table_name)s"
    assert Base.metadata.naming_convention["fk"] == (
        "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
    )


def test_session_factory_creates_database_sessions():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    session_factory = build_session_factory(engine)

    session = session_factory()
    try:
        assert isinstance(session, Session)
        assert session.execute(text("select 1")).scalar_one() == 1
    finally:
        session.close()
        engine.dispose()


def test_database_session_dependency_closes_sessions(monkeypatch):
    class FakeSession:
        closed = False

        def close(self) -> None:
            self.closed = True

    fake_session = FakeSession()
    monkeypatch.setattr(
        "app.db.session.get_session_factory",
        lambda: lambda: fake_session,
    )

    dependency = get_db_session()

    assert next(dependency) is fake_session

    try:
        next(dependency)
    except StopIteration:
        pass

    assert fake_session.closed is True
