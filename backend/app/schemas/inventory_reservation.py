from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class InventoryReservationResponse(BaseModel):
    id: UUID

    inventory_id: UUID

    procurement_request_item_id: UUID

    quantity: Decimal

    status: str

    reserved_by: str

    reserved_at: datetime