from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class InventorySupplyOption(BaseModel):
    warehouse_id: UUID
    warehouse_code: str
    warehouse_name: str

    physical_quantity: Decimal
    reserved_quantity: Decimal
    committed_quantity: Decimal
    available_to_promise: Decimal

    unit_cost: Decimal | None

    fulfillable_quantity: Decimal
    shortage_quantity: Decimal


class SupplyAnalysisResponse(BaseModel):
    procurement_request_id: UUID
    procurement_request_item_id: UUID

    required_quantity: Decimal

    total_internal_atp: Decimal
    internal_fulfillment_possible: bool

    shortage_quantity: Decimal

    options: list[InventorySupplyOption]