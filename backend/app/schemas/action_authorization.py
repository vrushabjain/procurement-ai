from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ActionAuthorizationCreate(BaseModel):
    tool_name: str
    requested_by: str
    parameters: dict[str, Any] = Field(
        default_factory=dict
    )
    reason: str | None = None


class ActionAuthorizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    authorization_id: UUID
    authorization_number: str
    tool_name: str
    requested_by: str
    approved_by: str | None
    rejected_by: str | None
    parameters: dict[str, Any]
    status: str
    reason: str | None
    created_at: datetime
    expires_at: datetime
    approved_at: datetime | None
    rejected_at: datetime | None
    consumed_at: datetime | None


class ActionAuthorizationApproval(BaseModel):
    approved_by: str


class ActionAuthorizationRejection(BaseModel):
    rejected_by: str
    rejection_reason: str


class ActionAuthorizationSummary(BaseModel):
    authorization_id: UUID
    authorization_number: str
    tool_name: str
    requested_by: str
    approved_by: str | None
    rejected_by: str | None
    status: str
    reason: str | None
    created_at: datetime
    expires_at: datetime
    approved_at: datetime | None
    rejected_at: datetime | None
    consumed_at: datetime | None