from __future__ import annotations

from typing import Any
from uuid import UUID

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKeyMixin
from app.db.types import JSONBType


class Message(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(
            "role IN ('system', 'user', 'assistant', 'tool')",
            name="ck_messages_role_allowed",
        ),
        CheckConstraint("trim(content) <> ''", name="ck_messages_content_not_blank"),
        CheckConstraint(
            "token_count IS NULL OR token_count >= 0",
            name="ck_messages_token_count_non_negative",
        ),
    )

    conversation_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("ai_providers.id", ondelete="SET NULL"),
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str | None] = mapped_column(Text)
    token_count: Mapped[int | None] = mapped_column(Integer)
    retrieval_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONBType,
        nullable=False,
        server_default=text("'{}'"),
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    provider: Mapped["AIProvider | None"] = relationship(back_populates="messages")


Index("ix_messages_conversation_created_at", Message.conversation_id, Message.created_at)
Index("ix_messages_provider_id", Message.provider_id)
