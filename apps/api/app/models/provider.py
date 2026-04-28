from __future__ import annotations

from typing import Any

from sqlalchemy import Boolean, CheckConstraint, Index, Integer, Text, func, text
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
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        default=False,
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


Index("uq_ai_providers_lower_name", func.lower(AIProvider.name), unique=True)
Index(
    "uq_ai_providers_active",
    AIProvider.is_active,
    unique=True,
    postgresql_where=AIProvider.is_active.is_(True),
    sqlite_where=AIProvider.is_active.is_(True),
)
