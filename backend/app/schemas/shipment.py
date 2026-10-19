from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ShipmentCreateRequest(BaseModel):
    purchase_order_id: UUID
    quantity_shipped: Decimal = Field(gt=0)
    expected_delivery_date: date
    shipment_date: date | None = None
    carrier_name: str | None = None
    tracking_reference: str | None = None
    remarks: str | None = None


class ShipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_number: str
    purchase_order_id: UUID
    supplier_id: UUID
    status: str
    quantity_shipped: Decimal
    shipment_date: date | None
    expected_delivery_date: date
    actual_delivery_date: date | None
    carrier_name: str | None
    tracking_reference: str | None
    delay_days: int
    risk_status: str
    remarks: str | None