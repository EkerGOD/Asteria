from __future__ import annotations

from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ModelRole(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "model_roles"

    __table_args__ = (
        CheckConstraint(
            "role_type IN ('chat', 'embedding')",
            name="ck_model_roles_role_type",
        ),
        UniqueConstraint("role_type", name="uq_model_roles_role_type"),
    )

    role_type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    provider_id: Mapped[UUID] = mapped_column(
        ForeignKey("ai_providers.id", ondelete="SET NULL"),
        nullable=True,
    )
    model_name: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    embedding_dimension: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    provider: Mapped[AIProvider | None] = relationship(
        "AIProvider",
        back_populates="model_roles",
    )
