from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.message import MessageResponse


class ChatSendRequest(BaseModel):
    conversation_id: UUID
    content: str = Field(min_length=1)


class ChatSendResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    provider_id: UUID
    chat_model: str
