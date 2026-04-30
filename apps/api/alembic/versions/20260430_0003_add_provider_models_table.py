"""Add provider models table.

Revision ID: 20260430_0003
Revises: 20260430_0002
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260430_0003"
down_revision: str | None = "20260430_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "provider_models",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("provider_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "trim(name) <> ''",
            name="ck_provider_models_name_not_blank",
        ),
        sa.CheckConstraint(
            "sort_order >= 0",
            name="ck_provider_models_sort_order_non_negative",
        ),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["ai_providers.id"],
            ondelete="CASCADE",
            name="fk_provider_models_provider_id_ai_providers",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_provider_models"),
    )
    op.create_index(
        "uq_provider_models_provider_lower_name",
        "provider_models",
        ["provider_id", sa.text("lower(name)")],
        unique=True,
    )
    op.create_index(
        "ix_provider_models_provider_id",
        "provider_models",
        ["provider_id"],
    )
    op.execute(
        """
        INSERT INTO provider_models (id, provider_id, name, sort_order, created_at, updated_at)
        SELECT gen_random_uuid(), id, chat_model, 0, now(), now()
        FROM ai_providers
        WHERE chat_model IS NOT NULL AND trim(chat_model) <> ''
        """
    )


def downgrade() -> None:
    op.drop_index("ix_provider_models_provider_id", table_name="provider_models")
    op.drop_index("uq_provider_models_provider_lower_name", table_name="provider_models")
    op.drop_table("provider_models")
