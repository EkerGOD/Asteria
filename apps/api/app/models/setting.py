from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import JSONBType


class AppSetting(Base):
    __tablename__ = "app_settings"
    __table_args__ = (
        CheckConstraint("trim(key) <> ''", name="ck_app_settings_key_not_blank"),
    )

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[dict[str, Any] | list[Any] | str | int | float | bool | None] = mapped_column(
        JSONBType,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
