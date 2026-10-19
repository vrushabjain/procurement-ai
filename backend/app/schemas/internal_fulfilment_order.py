
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InternalFulfilmentOrderCreate(BaseModel):
    procurement_request_id: UUID
    procurement_request_item_id: UUID
    inventory_id: UUID
    quantity: Decimal = Field(gt=0)
    created_by: str = Field(min_length=1, max_length=255)
    remarks: str | None = None


class InternalFulfilmentOrderApprove(BaseModel):
    approved_by: str = Field(min_length=1, max_length=255)


class InternalFulfilmentOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    procurement_request_id: UUID
    procurement_request_item_id: UUID
    inventory_id: UUID
    quantity: Decimal
    status: str
    created_by: str
    approved_by: str | None
    remarks: str | None
    created_at: datetime
    approved_at: datetime | None
    updated_at: datetime
