from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GoodsReceiptCreateRequest(BaseModel):
    shipment_id: UUID
    quantity_received: Decimal = Field(gt=0)
    receipt_date: date
    remarks: str | None = None


class GoodsReceiptInspectionRequest(BaseModel):
    accepted_quantity: Decimal = Field(ge=0)
    rejected_quantity: Decimal = Field(ge=0)
    inspection_passed: bool
    rejection_reason: str | None = None


class GoodsReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    grn_number: str
    shipment_id: UUID
    purchase_order_id: UUID
    receipt_date: date
    quantity_received: Decimal
    quantity_accepted: Decimal
    quantity_rejected: Decimal
    inspection_status: str
    status: str
    rejection_reason: str | None
    remarks: str | None