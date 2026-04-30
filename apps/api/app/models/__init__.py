"""SQLAlchemy model imports live here for Alembic autogeneration."""

from app.models.conversation import Conversation
from app.models.knowledge import KnowledgeEmbedding, KnowledgeUnit, KnowledgeUnitTag, Tag
from app.models.message import Message
from app.models.model_role import ModelRole
from app.models.project import Project
from app.models.provider import AIProvider, ProviderModel
from app.models.setting import AppSetting

__all__ = [
    "AIProvider",
    "AppSetting",
    "Conversation",
    "KnowledgeEmbedding",
    "KnowledgeUnit",
    "KnowledgeUnitTag",
    "Message",
    "ModelRole",
    "Project",
    "ProviderModel",
    "Tag",
]
