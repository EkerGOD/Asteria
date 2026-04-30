from pathlib import Path

from sqlalchemy import CheckConstraint

import app.models
from app.db.base import Base
from app.db.types import Vector


def constraint_names(table_name: str) -> set[str]:
    table = Base.metadata.tables[table_name]
    return {constraint.name for constraint in table.constraints if isinstance(constraint, CheckConstraint)}


def index_names(table_name: str) -> set[str]:
    return {index.name for index in Base.metadata.tables[table_name].indexes}


def test_mvp_schema_registers_all_tables():
    assert set(Base.metadata.tables) == {
        "ai_providers",
        "app_settings",
        "conversations",
        "knowledge_embeddings",
        "knowledge_unit_tags",
        "knowledge_units",
        "messages",
        "model_roles",
        "projects",
        "tags",
    }


def test_mvp_schema_contains_core_constraints():
    assert {
        "ck_projects_name_not_blank",
        "ck_projects_sort_order_non_negative",
    } <= constraint_names("projects")
    assert {
        "ck_conversations_title_not_blank",
    } <= constraint_names("conversations")
    assert {
        "ck_messages_role_allowed",
        "ck_messages_content_not_blank",
        "ck_messages_token_count_non_negative",
    } <= constraint_names("messages")
    assert {
        "ck_knowledge_units_title_not_blank",
        "ck_knowledge_units_content_not_blank",
        "ck_knowledge_units_source_type_allowed",
        "ck_knowledge_units_status_allowed",
        "ck_knowledge_units_archived_status_has_archived_at",
    } <= constraint_names("knowledge_units")
    assert {
        "ck_ai_providers_provider_type_mvp",
        "ck_ai_providers_embedding_dimension_mvp",
        "ck_ai_providers_timeout_seconds_range",
    } <= constraint_names("ai_providers")
    assert {
        "ck_tags_name_not_blank",
        "ck_tags_slug_not_blank",
        "ck_tags_slug_format",
    } <= constraint_names("tags")
    assert {
        "ck_model_roles_role_type",
        "uq_model_roles_role_type",
    } <= {c.name for c in Base.metadata.tables["model_roles"].constraints if c.name}


def test_mvp_schema_contains_key_indexes():
    assert {
        "uq_projects_active_lower_name",
        "ix_projects_archived_at",
        "ix_projects_sort_order",
    } <= index_names("projects")
    assert {
        "ix_conversations_project_id",
        "ix_conversations_updated_at_desc",
        "ix_conversations_active",
    } <= index_names("conversations")
    assert {
        "ix_messages_conversation_created_at",
        "ix_messages_provider_id",
    } <= index_names("messages")
    assert {
        "ix_knowledge_units_project_id",
        "ix_knowledge_units_updated_at_desc",
        "ix_knowledge_units_status",
        "ix_knowledge_units_full_text",
    } <= index_names("knowledge_units")
    assert {
        "uq_tags_lower_name",
        "uq_tags_slug",
    } <= index_names("tags")
    assert {
        "uq_knowledge_embeddings_unit_model_hash_chunk",
        "ix_knowledge_embeddings_embedding_cosine",
    } <= index_names("knowledge_embeddings")
    assert {
        "uq_ai_providers_lower_name",
        "uq_ai_providers_active",
    } <= index_names("ai_providers")


def test_embedding_column_uses_mvp_vector_dimension():
    embedding_column = Base.metadata.tables["knowledge_embeddings"].c.embedding

    assert isinstance(embedding_column.type, Vector)
    assert embedding_column.type.dimension == 1536


def test_migration_creates_required_extensions():
    migration_source = (
        Path(__file__).parents[1]
        / "alembic"
        / "versions"
        / "20260428_0001_mvp_database_schema.py"
    ).read_text(encoding="utf-8")

    assert "CREATE EXTENSION IF NOT EXISTS pgcrypto" in migration_source
    assert "CREATE EXTENSION IF NOT EXISTS vector" in migration_source


def test_relationship_delete_policies_match_schema():
    tables = Base.metadata.tables

    assert next(iter(tables["conversations"].c.project_id.foreign_keys)).ondelete == "SET NULL"
    assert next(iter(tables["knowledge_units"].c.project_id.foreign_keys)).ondelete == "SET NULL"
    assert next(iter(tables["messages"].c.conversation_id.foreign_keys)).ondelete == "CASCADE"
    assert next(iter(tables["messages"].c.provider_id.foreign_keys)).ondelete == "SET NULL"
    assert next(iter(tables["knowledge_unit_tags"].c.knowledge_unit_id.foreign_keys)).ondelete == "CASCADE"
    assert next(iter(tables["knowledge_unit_tags"].c.tag_id.foreign_keys)).ondelete == "CASCADE"
    assert next(iter(tables["knowledge_embeddings"].c.knowledge_unit_id.foreign_keys)).ondelete == "CASCADE"
    assert next(iter(tables["knowledge_embeddings"].c.provider_id.foreign_keys)).ondelete == "SET NULL"
    assert next(iter(tables["model_roles"].c.provider_id.foreign_keys)).ondelete == "SET NULL"
