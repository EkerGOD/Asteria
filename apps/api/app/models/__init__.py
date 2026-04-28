"""SQLAlchemy model imports live here for Alembic autogeneration."""

from app.models.conversation import Conversation
from app.models.knowledge import KnowledgeEmbedding, KnowledgeUnit, KnowledgeUnitTag, Tag
from app.models.message import Message
from app.models.project import Project
from app.models.provider import AIProvider
from app.models.setting import AppSetting

__all__ = [
    "AIProvider",
    "AppSetting",
    "Conversation",
    "KnowledgeEmbedding",
    "KnowledgeUnit",
    "KnowledgeUnitTag",
    "Message",
    "Project",
    "Tag",
]
