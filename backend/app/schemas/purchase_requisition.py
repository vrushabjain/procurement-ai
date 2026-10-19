from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PurchaseRequisitionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    purchase_requisition_id: UUID
    procurement_request_item_id: UUID
    rfq_item_id: UUID
    material_id: UUID
    quantity: Decimal
    uom: str
    unit_price: Decimal
    landed_cost: Decimal
    technical_specification: str | None = None


class PurchaseRequisitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    pr_number: str
    procurement_request_id: UUID
    rfq_id: UUID
    quote_id: UUID
    approval_id: UUID
    supplier_id: UUID
    status: str
    required_date: date
    currency_code: str
    total_amount: Decimal
    requested_by: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[PurchaseRequisitionItemResponse] = Field(default_factory=list)


class PurchaseRequisitionDecisionRequest(BaseModel):
    approver: str
    comments: str | None = None
