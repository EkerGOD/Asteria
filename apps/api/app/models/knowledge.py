from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    Uuid,
    func,
    literal,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONBType, Vector


class KnowledgeUnit(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_units"
    __table_args__ = (
        CheckConstraint("trim(title) <> ''", name="ck_knowledge_units_title_not_blank"),
        CheckConstraint("trim(content) <> ''", name="ck_knowledge_units_content_not_blank"),
        CheckConstraint(
            "source_type IN ('manual', 'import', 'chat', 'excerpt')",
            name="ck_knowledge_units_source_type_allowed",
        ),
        CheckConstraint(
            "status IN ('active', 'archived')",
            name="ck_knowledge_units_status_allowed",
        ),
        CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name="ck_knowledge_units_archived_status_has_archived_at",
        ),
    )

    project_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'manual'"),
        default="manual",
    )
    source_uri: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'active'"),
        default="active",
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONBType,
        nullable=False,
        server_default=text("'{}'"),
        default=dict,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["Project | None"] = relationship(back_populates="knowledge_units")
    tag_links: Mapped[list["KnowledgeUnitTag"]] = relationship(
        back_populates="knowledge_unit",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    tags: Mapped[list["Tag"]] = relationship(
        secondary="knowledge_unit_tags",
        back_populates="knowledge_units",
        viewonly=True,
    )
    embeddings: Mapped[list["KnowledgeEmbedding"]] = relationship(
        back_populates="knowledge_unit",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Tag(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "tags"
    __table_args__ = (
        CheckConstraint("trim(name) <> ''", name="ck_tags_name_not_blank"),
        CheckConstraint("trim(slug) <> ''", name="ck_tags_slug_not_blank"),
        CheckConstraint(
            "slug = lower(slug) AND slug NOT LIKE '% %' AND slug NOT LIKE '-%' "
            "AND slug NOT LIKE '%-' AND slug NOT LIKE '%--%'",
            name="ck_tags_slug_format",
        ),
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    knowledge_unit_links: Mapped[list["KnowledgeUnitTag"]] = relationship(
        back_populates="tag",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    knowledge_units: Mapped[list[KnowledgeUnit]] = relationship(
        secondary="knowledge_unit_tags",
        back_populates="tags",
        viewonly=True,
    )


class KnowledgeUnitTag(Base):
    __tablename__ = "knowledge_unit_tags"

    knowledge_unit_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("knowledge_units.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    knowledge_unit: Mapped[KnowledgeUnit] = relationship(back_populates="tag_links")
    tag: Mapped[Tag] = relationship(back_populates="knowledge_unit_links")


class KnowledgeEmbedding(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_embeddings"
    __table_args__ = (
        CheckConstraint(
            "embedding_dimension = 1536",
            name="ck_knowledge_embeddings_embedding_dimension_mvp",
        ),
        CheckConstraint(
            "chunk_index >= 0",
            name="ck_knowledge_embeddings_chunk_index_non_negative",
        ),
        CheckConstraint(
            "trim(chunk_text) <> ''",
            name="ck_knowledge_embeddings_chunk_text_not_blank",
        ),
        CheckConstraint(
            "trim(content_hash) <> ''",
            name="ck_knowledge_embeddings_content_hash_not_blank",
        ),
    )

    knowledge_unit_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("knowledge_units.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("ai_providers.id", ondelete="SET NULL"),
    )
    embedding_model: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_dimension: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("1536"),
        default=1536,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

    knowledge_unit: Mapped[KnowledgeUnit] = relationship(back_populates="embeddings")
    provider: Mapped["AIProvider | None"] = relationship(back_populates="knowledge_embeddings")


Index("ix_knowledge_units_project_id", KnowledgeUnit.project_id)
Index("ix_knowledge_units_updated_at_desc", KnowledgeUnit.updated_at.desc())
Index("ix_knowledge_units_status", KnowledgeUnit.status)
Index(
    "ix_knowledge_units_full_text",
    func.to_tsvector(
        "simple",
        func.coalesce(KnowledgeUnit.title, "") + literal(" ") + func.coalesce(KnowledgeUnit.content, ""),
    ),
    postgresql_using="gin",
).ddl_if(dialect="postgresql")

Index("uq_tags_lower_name", func.lower(Tag.name), unique=True)
Index("uq_tags_slug", Tag.slug, unique=True)

Index("ix_knowledge_unit_tags_tag_id", KnowledgeUnitTag.tag_id)
Index("ix_knowledge_unit_tags_knowledge_unit_id", KnowledgeUnitTag.knowledge_unit_id)

Index("ix_knowledge_embeddings_knowledge_unit_id", KnowledgeEmbedding.knowledge_unit_id)
Index("ix_knowledge_embeddings_provider_id", KnowledgeEmbedding.provider_id)
Index(
    "uq_knowledge_embeddings_unit_model_hash_chunk",
    KnowledgeEmbedding.knowledge_unit_id,
    KnowledgeEmbedding.embedding_model,
    KnowledgeEmbedding.content_hash,
    KnowledgeEmbedding.chunk_index,
    unique=True,
)
Index(
    "ix_knowledge_embeddings_embedding_cosine",
    KnowledgeEmbedding.embedding,
    postgresql_using="hnsw",
    postgresql_ops={"embedding": "vector_cosine_ops"},
).ddl_if(dialect="postgresql")
