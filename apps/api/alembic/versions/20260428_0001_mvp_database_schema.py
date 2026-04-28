"""Implement MVP database schema.

Revision ID: 20260428_0001
Revises:
Create Date: 2026-04-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260428_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


class Vector(sa.types.UserDefinedType):
    cache_ok = True

    def __init__(self, dimension: int) -> None:
        self.dimension = dimension

    def get_col_spec(self, **kw: object) -> str:
        return f"vector({self.dimension})"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("trim(name) <> ''", name="ck_projects_name_not_blank"),
        sa.CheckConstraint("sort_order >= 0", name="ck_projects_sort_order_non_negative"),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
    )
    op.create_index(
        "uq_projects_active_lower_name",
        "projects",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
    )
    op.create_index("ix_projects_archived_at", "projects", ["archived_at"])
    op.create_index("ix_projects_sort_order", "projects", ["sort_order"])

    op.create_table(
        "ai_providers",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "provider_type",
            sa.Text(),
            server_default=sa.text("'openai_compatible'"),
            nullable=False,
        ),
        sa.Column("base_url", sa.Text(), nullable=False),
        sa.Column("api_key_ciphertext", sa.Text(), nullable=True),
        sa.Column("chat_model", sa.Text(), nullable=False),
        sa.Column("embedding_model", sa.Text(), nullable=False),
        sa.Column("embedding_dimension", sa.Integer(), server_default=sa.text("1536"), nullable=False),
        sa.Column("timeout_seconds", sa.Integer(), server_default=sa.text("60"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("trim(name) <> ''", name="ck_ai_providers_name_not_blank"),
        sa.CheckConstraint(
            "provider_type = 'openai_compatible'",
            name="ck_ai_providers_provider_type_mvp",
        ),
        sa.CheckConstraint("trim(base_url) <> ''", name="ck_ai_providers_base_url_not_blank"),
        sa.CheckConstraint("trim(chat_model) <> ''", name="ck_ai_providers_chat_model_not_blank"),
        sa.CheckConstraint(
            "trim(embedding_model) <> ''",
            name="ck_ai_providers_embedding_model_not_blank",
        ),
        sa.CheckConstraint(
            "embedding_dimension = 1536",
            name="ck_ai_providers_embedding_dimension_mvp",
        ),
        sa.CheckConstraint(
            "timeout_seconds BETWEEN 1 AND 300",
            name="ck_ai_providers_timeout_seconds_range",
        ),
        sa.CheckConstraint("jsonb_typeof(metadata) = 'object'", name="ck_ai_providers_metadata_is_object"),
        sa.PrimaryKeyConstraint("id", name="pk_ai_providers"),
    )
    op.create_index("uq_ai_providers_lower_name", "ai_providers", [sa.text("lower(name)")], unique=True)
    op.create_index(
        "uq_ai_providers_active",
        "ai_providers",
        ["is_active"],
        unique=True,
        postgresql_where=sa.text("is_active IS TRUE"),
    )

    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("project_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("trim(title) <> ''", name="ck_conversations_title_not_blank"),
        sa.CheckConstraint("jsonb_typeof(metadata) = 'object'", name="ck_conversations_metadata_is_object"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="fk_conversations_project_id_projects",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_conversations"),
    )
    op.create_index("ix_conversations_project_id", "conversations", ["project_id"])
    op.create_index("ix_conversations_updated_at_desc", "conversations", [sa.text("updated_at DESC")])
    op.create_index(
        "ix_conversations_active",
        "conversations",
        [sa.text("updated_at DESC")],
        postgresql_where=sa.text("archived_at IS NULL"),
    )

    op.create_table(
        "knowledge_units",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("project_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), server_default=sa.text("'manual'"), nullable=False),
        sa.Column("source_uri", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'active'"), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("trim(title) <> ''", name="ck_knowledge_units_title_not_blank"),
        sa.CheckConstraint("trim(content) <> ''", name="ck_knowledge_units_content_not_blank"),
        sa.CheckConstraint(
            "source_type IN ('manual', 'import', 'chat', 'excerpt')",
            name="ck_knowledge_units_source_type_allowed",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'archived')",
            name="ck_knowledge_units_status_allowed",
        ),
        sa.CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name="ck_knowledge_units_archived_status_has_archived_at",
        ),
        sa.CheckConstraint("jsonb_typeof(metadata) = 'object'", name="ck_knowledge_units_metadata_is_object"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="fk_knowledge_units_project_id_projects",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_knowledge_units"),
    )
    op.create_index("ix_knowledge_units_project_id", "knowledge_units", ["project_id"])
    op.create_index("ix_knowledge_units_updated_at_desc", "knowledge_units", [sa.text("updated_at DESC")])
    op.create_index("ix_knowledge_units_status", "knowledge_units", ["status"])
    op.create_index(
        "ix_knowledge_units_full_text",
        "knowledge_units",
        [sa.text("to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))")],
        postgresql_using="gin",
    )

    op.create_table(
        "tags",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("trim(name) <> ''", name="ck_tags_name_not_blank"),
        sa.CheckConstraint("trim(slug) <> ''", name="ck_tags_slug_not_blank"),
        sa.CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name="ck_tags_slug_format"),
        sa.PrimaryKeyConstraint("id", name="pk_tags"),
    )
    op.create_index("uq_tags_lower_name", "tags", [sa.text("lower(name)")], unique=True)
    op.create_index("uq_tags_slug", "tags", ["slug"], unique=True)

    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("conversation_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("provider_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column(
            "retrieval_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "role IN ('system', 'user', 'assistant', 'tool')",
            name="ck_messages_role_allowed",
        ),
        sa.CheckConstraint("trim(content) <> ''", name="ck_messages_content_not_blank"),
        sa.CheckConstraint(
            "token_count IS NULL OR token_count >= 0",
            name="ck_messages_token_count_non_negative",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(retrieval_metadata) = 'object'",
            name="ck_messages_retrieval_metadata_is_object",
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            name="fk_messages_conversation_id_conversations",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["ai_providers.id"],
            name="fk_messages_provider_id_ai_providers",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_messages"),
    )
    op.create_index("ix_messages_conversation_created_at", "messages", ["conversation_id", "created_at"])
    op.create_index("ix_messages_provider_id", "messages", ["provider_id"])

    op.create_table(
        "knowledge_unit_tags",
        sa.Column("knowledge_unit_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("tag_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["knowledge_unit_id"],
            ["knowledge_units.id"],
            name="fk_knowledge_unit_tags_knowledge_unit_id_knowledge_units",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["tags.id"],
            name="fk_knowledge_unit_tags_tag_id_tags",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("knowledge_unit_id", "tag_id", name="pk_knowledge_unit_tags"),
    )
    op.create_index("ix_knowledge_unit_tags_tag_id", "knowledge_unit_tags", ["tag_id"])
    op.create_index(
        "ix_knowledge_unit_tags_knowledge_unit_id",
        "knowledge_unit_tags",
        ["knowledge_unit_id"],
    )

    op.create_table(
        "knowledge_embeddings",
        sa.Column("id", sa.Uuid(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("knowledge_unit_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("provider_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("embedding_model", sa.Text(), nullable=False),
        sa.Column("embedding_dimension", sa.Integer(), server_default=sa.text("1536"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "embedding_dimension = 1536",
            name="ck_knowledge_embeddings_embedding_dimension_mvp",
        ),
        sa.CheckConstraint(
            "chunk_index >= 0",
            name="ck_knowledge_embeddings_chunk_index_non_negative",
        ),
        sa.CheckConstraint("trim(chunk_text) <> ''", name="ck_knowledge_embeddings_chunk_text_not_blank"),
        sa.CheckConstraint("trim(content_hash) <> ''", name="ck_knowledge_embeddings_content_hash_not_blank"),
        sa.ForeignKeyConstraint(
            ["knowledge_unit_id"],
            ["knowledge_units.id"],
            name="fk_knowledge_embeddings_knowledge_unit_id_knowledge_units",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["ai_providers.id"],
            name="fk_knowledge_embeddings_provider_id_ai_providers",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_knowledge_embeddings"),
    )
    op.create_index(
        "ix_knowledge_embeddings_knowledge_unit_id",
        "knowledge_embeddings",
        ["knowledge_unit_id"],
    )
    op.create_index("ix_knowledge_embeddings_provider_id", "knowledge_embeddings", ["provider_id"])
    op.create_index(
        "uq_knowledge_embeddings_unit_model_hash_chunk",
        "knowledge_embeddings",
        ["knowledge_unit_id", "embedding_model", "content_hash", "chunk_index"],
        unique=True,
    )
    op.create_index(
        "ix_knowledge_embeddings_embedding_cosine",
        "knowledge_embeddings",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "app_settings",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("trim(key) <> ''", name="ck_app_settings_key_not_blank"),
        sa.PrimaryKeyConstraint("key", name="pk_app_settings"),
    )


def downgrade() -> None:
    op.drop_table("app_settings")

    op.drop_index("ix_knowledge_embeddings_embedding_cosine", table_name="knowledge_embeddings")
    op.drop_index("uq_knowledge_embeddings_unit_model_hash_chunk", table_name="knowledge_embeddings")
    op.drop_index("ix_knowledge_embeddings_provider_id", table_name="knowledge_embeddings")
    op.drop_index("ix_knowledge_embeddings_knowledge_unit_id", table_name="knowledge_embeddings")
    op.drop_table("knowledge_embeddings")

    op.drop_index("ix_knowledge_unit_tags_knowledge_unit_id", table_name="knowledge_unit_tags")
    op.drop_index("ix_knowledge_unit_tags_tag_id", table_name="knowledge_unit_tags")
    op.drop_table("knowledge_unit_tags")

    op.drop_index("ix_messages_provider_id", table_name="messages")
    op.drop_index("ix_messages_conversation_created_at", table_name="messages")
    op.drop_table("messages")

    op.drop_index("uq_tags_slug", table_name="tags")
    op.drop_index("uq_tags_lower_name", table_name="tags")
    op.drop_table("tags")

    op.drop_index("ix_knowledge_units_full_text", table_name="knowledge_units")
    op.drop_index("ix_knowledge_units_status", table_name="knowledge_units")
    op.drop_index("ix_knowledge_units_updated_at_desc", table_name="knowledge_units")
    op.drop_index("ix_knowledge_units_project_id", table_name="knowledge_units")
    op.drop_table("knowledge_units")

    op.drop_index("ix_conversations_active", table_name="conversations")
    op.drop_index("ix_conversations_updated_at_desc", table_name="conversations")
    op.drop_index("ix_conversations_project_id", table_name="conversations")
    op.drop_table("conversations")

    op.drop_index("uq_ai_providers_active", table_name="ai_providers")
    op.drop_index("uq_ai_providers_lower_name", table_name="ai_providers")
    op.drop_table("ai_providers")

    op.drop_index("ix_projects_sort_order", table_name="projects")
    op.drop_index("ix_projects_archived_at", table_name="projects")
    op.drop_index("uq_projects_active_lower_name", table_name="projects")
    op.drop_table("projects")

    op.execute("DROP EXTENSION IF EXISTS vector")
