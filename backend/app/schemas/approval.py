from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    approval_number: str

    rfq_id: UUID
    quote_id: UUID
    supplier_id: UUID

    approval_type: str
    approval_level: str

    amount: Decimal
    currency_code: str

    status: str

    requested_by: str
    approver: str | None = None
    comments: str | None = None

    requested_at: datetime
    decided_at: datetime | None = None


class CreateApprovalRequest(BaseModel):
    rfq_id: UUID
    quote_id: UUID
    requested_by: str


class ApprovalDecisionRequest(BaseModel):
    approver: str
    comments: str | None = None