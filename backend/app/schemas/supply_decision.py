from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SupplyDecisionResponse(BaseModel):
    procurement_request_id: UUID
    procurement_request_item_id: UUID

    required_quantity: Decimal

    local_warehouse_id: UUID | None
    local_warehouse_code: str | None
    local_warehouse_name: str | None

    local_physical_quantity: Decimal
    local_committed_quantity: Decimal
    local_available_to_promise: Decimal

    total_internal_atp: Decimal

    decision: str
    source_type: str

    recommended_quantity: Decimal
    transfer_required: bool
    external_sourcing_required: bool

    shortage_quantity: Decimal

    reason: str
    next_action: str