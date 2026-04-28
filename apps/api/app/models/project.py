from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint("trim(name) <> ''", name="ck_projects_name_not_blank"),
        CheckConstraint("sort_order >= 0", name="ck_projects_sort_order_non_negative"),
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
        default=0,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="project",
        passive_deletes=True,
    )
    knowledge_units: Mapped[list["KnowledgeUnit"]] = relationship(
        back_populates="project",
        passive_deletes=True,
    )


Index(
    "uq_projects_active_lower_name",
    func.lower(Project.name),
    unique=True,
    postgresql_where=Project.archived_at.is_(None),
    sqlite_where=Project.archived_at.is_(None),
)
Index("ix_projects_archived_at", Project.archived_at)
Index("ix_projects_sort_order", Project.sort_order)
