"""Add model_roles table.

Revision ID: 20260430_0002
Revises: 20260428_0001
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260430_0002"
down_revision: str | None = "20260428_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "model_roles",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("role_type", sa.Text(), nullable=False),
        sa.Column("provider_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("model_name", sa.Text(), nullable=False),
        sa.Column("embedding_dimension", sa.Integer(), nullable=True),
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
            "role_type IN ('chat', 'embedding')",
            name="ck_model_roles_role_type",
        ),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["ai_providers.id"],
            ondelete="SET NULL",
            name="fk_model_roles_provider_id",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_model_roles"),
        sa.UniqueConstraint("role_type", name="uq_model_roles_role_type"),
    )


def downgrade() -> None:
    op.drop_table("model_roles")
