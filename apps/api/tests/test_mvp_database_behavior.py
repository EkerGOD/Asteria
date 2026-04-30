from collections.abc import Iterator
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, delete, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import app.models
from app.db.base import Base
from app.db.session import build_session_factory
from app.models import (
    AIProvider,
    Conversation,
    KnowledgeEmbedding,
    KnowledgeUnit,
    KnowledgeUnitTag,
    Message,
    Project,
    Tag,
)


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, connection_record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_factory = build_session_factory(engine)

    with session_factory() as session:
        yield session

    Base.metadata.drop_all(engine)
    engine.dispose()


def test_key_constraints_are_enforced(db_session: Session):
    db_session.add(Project(id=uuid4(), name="   "))

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()

    db_session.add(
        KnowledgeUnit(
            id=uuid4(),
            title="Archived without timestamp",
            content="Body",
            status="archived",
        )
    )

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()

    db_session.add(Tag(id=uuid4(), name="Upper Slug", slug="Upper"))

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_active_project_names_are_unique_case_insensitively(db_session: Session):
    db_session.add_all(
        [
            Project(id=uuid4(), name="Research"),
            Project(id=uuid4(), name="research"),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_multiple_providers_can_be_created(db_session: Session):
    db_session.add_all(
        [
            AIProvider(
                id=uuid4(),
                name="Local One",
                base_url="http://localhost:11434/v1",
                chat_model="chat-model",
                embedding_model="embedding-model",
            ),
            AIProvider(
                id=uuid4(),
                name="Local Two",
                base_url="http://localhost:11435/v1",
                chat_model="chat-model",
                embedding_model="embedding-model",
            ),
        ]
    )

    db_session.commit()
    count = db_session.query(AIProvider).count()
    assert count == 2


def test_foreign_key_cascade_and_set_null_behavior(db_session: Session):
    project_id = uuid4()
    provider_id = uuid4()
    conversation_id = uuid4()
    message_id = uuid4()
    knowledge_unit_id = uuid4()
    tag_id = uuid4()
    embedding_id = uuid4()

    project = Project(id=project_id, name="Research")
    provider = AIProvider(
        id=provider_id,
        name="Local",
        base_url="http://localhost:11434/v1",
        chat_model="chat-model",
        embedding_model="embedding-model",
    )
    conversation = Conversation(id=conversation_id, project=project, title="Session")
    message = Message(
        id=message_id,
        conversation=conversation,
        provider=provider,
        role="assistant",
        content="Answer",
    )
    knowledge_unit = KnowledgeUnit(
        id=knowledge_unit_id,
        project=project,
        title="Note",
        content="A useful note.",
    )
    tag = Tag(id=tag_id, name="Ideas", slug="ideas")
    tag_link = KnowledgeUnitTag(knowledge_unit=knowledge_unit, tag=tag)
    embedding = KnowledgeEmbedding(
        id=embedding_id,
        knowledge_unit=knowledge_unit,
        provider=provider,
        embedding_model="embedding-model",
        chunk_index=0,
        chunk_text="A useful note.",
        content_hash="hash-1",
        embedding=[0.0, 0.1, 0.2],
    )

    db_session.add_all(
        [project, provider, conversation, message, knowledge_unit, tag, tag_link, embedding]
    )
    db_session.commit()

    db_session.execute(delete(Conversation).where(Conversation.id == conversation_id))
    db_session.commit()
    db_session.expire_all()
    assert db_session.get(Message, message_id) is None

    db_session.execute(delete(AIProvider).where(AIProvider.id == provider_id))
    db_session.commit()
    db_session.expire_all()
    assert db_session.get(KnowledgeEmbedding, embedding_id).provider_id is None

    db_session.execute(delete(Project).where(Project.id == project_id))
    db_session.commit()
    db_session.expire_all()
    assert db_session.get(KnowledgeUnit, knowledge_unit_id).project_id is None

    db_session.execute(delete(Tag).where(Tag.id == tag_id))
    db_session.commit()
    db_session.expire_all()
    assert db_session.get(
        KnowledgeUnitTag,
        {"knowledge_unit_id": knowledge_unit_id, "tag_id": tag_id},
    ) is None

    db_session.execute(delete(KnowledgeUnit).where(KnowledgeUnit.id == knowledge_unit_id))
    db_session.commit()
    db_session.expire_all()
    assert db_session.get(KnowledgeEmbedding, embedding_id) is None
