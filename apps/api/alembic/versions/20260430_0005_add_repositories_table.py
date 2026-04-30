"""Add repositories table.

Revision ID: 20260430_0005
Revises: 20260430_0004
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260430_0005"
down_revision: str | None = "20260430_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "repositories",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("root_path", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default=sa.text("'active'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("unlinked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("trim(name) <> ''", name="ck_repositories_name_not_blank"),
        sa.CheckConstraint("trim(root_path) <> ''", name="ck_repositories_root_path_not_blank"),
        sa.CheckConstraint(
            "status IN ('active', 'unlinked')",
            name="ck_repositories_status_allowed",
        ),
        sa.CheckConstraint(
            "status <> 'unlinked' OR unlinked_at IS NOT NULL",
            name="ck_repositories_unlinked_status_has_unlinked_at",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_repositories"),
    )
    op.create_index(
        "uq_repositories_active_lower_name",
        "repositories",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
        sqlite_where=sa.text("status = 'active'"),
    )
    op.create_index(
        "uq_repositories_active_lower_root_path",
        "repositories",
        [sa.text("lower(root_path)")],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
        sqlite_where=sa.text("status = 'active'"),
    )
    op.create_index("ix_repositories_status", "repositories", ["status"])


def downgrade() -> None:
    op.drop_index("ix_repositories_status", table_name="repositories")
    op.drop_index("uq_repositories_active_lower_root_path", table_name="repositories")
    op.drop_index("uq_repositories_active_lower_name", table_name="repositories")
    op.drop_table("repositories")
