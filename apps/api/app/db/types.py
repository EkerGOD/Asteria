from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import JSON, Text
from sqlalchemy.dialects import postgresql
from sqlalchemy.types import UserDefinedType


JSONBType = JSON().with_variant(
    postgresql.JSONB(astext_type=Text()),
    "postgresql",
)


class Vector(UserDefinedType):
    cache_ok = True

    def __init__(self, dimension: int) -> None:
        self.dimension = dimension

    def get_col_spec(self, **kw: Any) -> str:
        return f"vector({self.dimension})"

    @property
    def python_type(self) -> type[list[float]]:
        return list

    def bind_processor(self, dialect: Any) -> Any:
        def process(value: object) -> str | None:
            if value is None:
                return None
            if isinstance(value, str):
                return value
            if isinstance(value, Sequence):
                return "[" + ",".join(str(float(item)) for item in value) + "]"
            raise TypeError("Vector values must be a sequence of numbers or a pgvector string.")

        return process
