"""Remove is_active column from ai_providers.

Revision ID: 20260430_0004
Revises: 20260430_0003
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260430_0004"
down_revision: str | None = "20260430_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("uq_ai_providers_active", table_name="ai_providers")
    op.drop_column("ai_providers", "is_active")


def downgrade() -> None:
    op.add_column(
        "ai_providers",
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.create_index(
        "uq_ai_providers_active",
        "ai_providers",
        ["is_active"],
        unique=True,
        postgresql_where=sa.text("is_active IS TRUE"),
    )
