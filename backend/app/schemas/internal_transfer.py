from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TransferOptionResponse(BaseModel):
    source_warehouse_id: UUID
    source_warehouse_code: str
    source_warehouse_name: str

    destination_warehouse_id: UUID
    destination_warehouse_code: str
    destination_warehouse_name: str

    available_to_promise: Decimal
    transferable_quantity: Decimal

    distance_km: Decimal
    transit_days: Decimal

    fixed_transfer_cost: Decimal
    cost_per_unit: Decimal
    total_transfer_cost: Decimal
    currency_code: str

    expected_arrival_date: date
    required_date: date
    can_arrive_by_required_date: bool


class InternalTransferAnalysisResponse(BaseModel):
    procurement_request_id: UUID
    procurement_request_item_id: UUID

    required_quantity: Decimal

    local_available_to_promise: Decimal
    local_fulfillable_quantity: Decimal

    transfer_required: bool
    transfer_quantity_required: Decimal

    remaining_shortage: Decimal

    options: list[TransferOptionResponse]