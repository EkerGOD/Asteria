from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import JSONBType


class Conversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint("trim(title) <> ''", name="ck_conversations_title_not_blank"),
    )

    project_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONBType,
        nullable=False,
        server_default=text("'{}'"),
        default=dict,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["Project | None"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


Index("ix_conversations_project_id", Conversation.project_id)
Index("ix_conversations_updated_at_desc", Conversation.updated_at.desc())
Index(
    "ix_conversations_active",
    Conversation.updated_at.desc(),
    postgresql_where=Conversation.archived_at.is_(None),
    sqlite_where=Conversation.archived_at.is_(None),
)
