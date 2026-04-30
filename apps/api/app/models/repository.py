from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Repository(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "repositories"
    __table_args__ = (
        CheckConstraint("trim(name) <> ''", name="ck_repositories_name_not_blank"),
        CheckConstraint("trim(root_path) <> ''", name="ck_repositories_root_path_not_blank"),
        CheckConstraint(
            "status IN ('active', 'unlinked')",
            name="ck_repositories_status_allowed",
        ),
        CheckConstraint(
            "status <> 'unlinked' OR unlinked_at IS NOT NULL",
            name="ck_repositories_unlinked_status_has_unlinked_at",
        ),
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    root_path: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'active'"),
        default="active",
    )
    unlinked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


Index(
    "uq_repositories_active_lower_name",
    func.lower(Repository.name),
    unique=True,
    postgresql_where=Repository.status == "active",
    sqlite_where=Repository.status == "active",
)
Index(
    "uq_repositories_active_lower_root_path",
    func.lower(Repository.root_path),
    unique=True,
    postgresql_where=Repository.status == "active",
    sqlite_where=Repository.status == "active",
)
Index("ix_repositories_status", Repository.status)
