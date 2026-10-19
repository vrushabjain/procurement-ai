
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.internal_fulfilment_order import InternalFulfilmentOrder
from app.models.inventory import Inventory
from app.models.procurement_request import ProcurementRequest
from app.models.procurement_request_item import ProcurementRequestItem
from app.services.inventory_reservation_service import reserve_inventory


def create_internal_fulfilment_order(
    db: Session,
    procurement_request_id: uuid.UUID,
    procurement_request_item_id: uuid.UUID,
    inventory_id: uuid.UUID,
    quantity: Decimal,
    created_by: str,
    remarks: str | None = None,
) -> InternalFulfilmentOrder:
    request = db.scalar(
        select(ProcurementRequest)
        .where(ProcurementRequest.id == procurement_request_id)
        .with_for_update()
    )
    if request is None:
        raise ValueError("Procurement request not found.")

    item = db.scalar(
        select(ProcurementRequestItem)
        .where(
            ProcurementRequestItem.id == procurement_request_item_id,
            ProcurementRequestItem.procurement_request_id
            == procurement_request_id,
        )
        .with_for_update()
    )
    if item is None:
        raise ValueError(
            "The procurement item does not belong to this request."
        )

    inventory = db.scalar(
        select(Inventory)
        .where(Inventory.id == inventory_id)
        .with_for_update()
    )
    if inventory is None:
        raise ValueError("Inventory record not found.")

    if inventory.material_id != item.material_id:
        raise ValueError(
            "The selected inventory record is for a different material."
        )

    if quantity > Decimal(str(item.quantity)):
        raise ValueError(
            "Internal fulfilment quantity cannot exceed the requested quantity."
        )

    if not created_by.strip():
        raise ValueError("Created by is required.")

    # Prevent multiple active internal orders from over-fulfilling
    # the same request line.
    active_orders = db.scalars(
        select(InternalFulfilmentOrder)
        .where(
            InternalFulfilmentOrder.procurement_request_item_id == item.id,
            InternalFulfilmentOrder.status.in_(
                [
                    "PENDING_APPROVAL",
                    "APPROVED",
                    "PICKING",
                    "DISPATCHED",
                    "IN_TRANSIT",
                    "RECEIVED",
                ]
            ),
        )
        .with_for_update()
    ).all()

    already_ordered = sum(
        (Decimal(str(order.quantity)) for order in active_orders),
        Decimal("0"),
    )

    if already_ordered + quantity > Decimal(str(item.quantity)):
        raise ValueError(
            "This order would exceed the remaining unfulfilled quantity."
        )

    order_number = (
        f"IFO-{datetime.utcnow():%Y%m%d}-"
        f"{uuid.uuid4().hex[:8].upper()}"
    )

    order = InternalFulfilmentOrder(
        order_number=order_number,
        procurement_request_id=request.id,
        procurement_request_item_id=item.id,
        inventory_id=inventory.id,
        quantity=quantity,
        status="PENDING_APPROVAL",
        created_by=created_by.strip(),
        remarks=remarks,
    )

    db.add(order)
    db.flush()
    return order


def approve_internal_fulfilment_order(
    db: Session,
    order_id: uuid.UUID,
    approved_by: str,
) -> InternalFulfilmentOrder:
    order = db.scalar(
        select(InternalFulfilmentOrder)
        .where(InternalFulfilmentOrder.id == order_id)
        .with_for_update()
    )
    if order is None:
        raise ValueError("Internal fulfilment order not found.")

    if order.status != "PENDING_APPROVAL":
        raise ValueError(
            f"Only PENDING_APPROVAL orders can be approved. "
            f"Current status: {order.status}."
        )

    if not approved_by.strip():
        raise ValueError("Approved by is required.")

    # Existing service validates available-to-promise stock.
    # The caller commits the order and reservation together.
    reserve_inventory(
        db=db,
        procurement_request_item_id=order.procurement_request_item_id,
        inventory_id=order.inventory_id,
        quantity=Decimal(str(order.quantity)),
        reserved_by=approved_by.strip(),
    )

    order.status = "APPROVED"
    order.approved_by = approved_by.strip()
    order.approved_at = datetime.utcnow()

    db.flush()
    return order
