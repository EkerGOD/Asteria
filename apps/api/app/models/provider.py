from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Text, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONBType


class AIProvider(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_providers"
    __table_args__ = (
        CheckConstraint("trim(name) <> ''", name="ck_ai_providers_name_not_blank"),
        CheckConstraint(
            "provider_type = 'openai_compatible'",
            name="ck_ai_providers_provider_type_mvp",
        ),
        CheckConstraint("trim(base_url) <> ''", name="ck_ai_providers_base_url_not_blank"),
        CheckConstraint("trim(chat_model) <> ''", name="ck_ai_providers_chat_model_not_blank"),
        CheckConstraint(
            "trim(embedding_model) <> ''",
            name="ck_ai_providers_embedding_model_not_blank",
        ),
        CheckConstraint(
            "embedding_dimension = 1536",
            name="ck_ai_providers_embedding_dimension_mvp",
        ),
        CheckConstraint(
            "timeout_seconds BETWEEN 1 AND 300",
            name="ck_ai_providers_timeout_seconds_range",
        ),
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    provider_type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'openai_compatible'"),
        default="openai_compatible",
    )
    base_url: Mapped[str] = mapped_column(Text, nullable=False)
    api_key_ciphertext: Mapped[str | None] = mapped_column(Text)
    chat_model: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_model: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_dimension: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("1536"),
        default=1536,
    )
    timeout_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("60"),
        default=60,
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONBType,
        nullable=False,
        server_default=text("'{}'"),
        default=dict,
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="provider",
        passive_deletes=True,
    )
    knowledge_embeddings: Mapped[list["KnowledgeEmbedding"]] = relationship(
        back_populates="provider",
        passive_deletes=True,
    )
    model_roles: Mapped[list["ModelRole"]] = relationship(
        back_populates="provider",
        passive_deletes=True,
    )
    model_entries: Mapped[list["ProviderModel"]] = relationship(
        back_populates="provider",
        cascade="all, delete-orphan",
        order_by="ProviderModel.sort_order",
    )


Index("uq_ai_providers_lower_name", func.lower(AIProvider.name), unique=True)


class ProviderModel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "provider_models"
    __table_args__ = (
        CheckConstraint("trim(name) <> ''", name="ck_provider_models_name_not_blank"),
        CheckConstraint("sort_order >= 0", name="ck_provider_models_sort_order_non_negative"),
    )

    provider_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("ai_providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
        default=0,
    )

    provider: Mapped[AIProvider] = relationship(back_populates="model_entries")


Index(
    "uq_provider_models_provider_lower_name",
    ProviderModel.provider_id,
    func.lower(ProviderModel.name),
    unique=True,
)
Index("ix_provider_models_provider_id", ProviderModel.provider_id)
