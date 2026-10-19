from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.inventory_commitment import InventoryCommitment
from app.models.inventory_reservation import InventoryReservation
from app.models.procurement_request_item import ProcurementRequestItem


def get_active_reserved_quantity(
    db: Session,
    inventory_id: UUID,
) -> Decimal:
    """
    Calculate the quantity currently reserved against
    a specific inventory record.
    """

    reserved_quantity = db.scalar(
        select(
            func.coalesce(
                func.sum(InventoryReservation.quantity),
                0,
            )
        ).where(
            InventoryReservation.inventory_id == inventory_id,
            InventoryReservation.status == "ACTIVE",
        )
    )

    return Decimal(reserved_quantity or 0)


def get_active_committed_quantity(
    db: Session,
    inventory_id: UUID,
) -> Decimal:
    """
    Calculate the quantity currently committed against
    a specific inventory record.
    """

    committed_quantity = db.scalar(
        select(
            func.coalesce(
                func.sum(InventoryCommitment.quantity),
                0,
            )
        ).where(
            InventoryCommitment.inventory_id == inventory_id,
            InventoryCommitment.status == "ACTIVE",
        )
    )

    return Decimal(committed_quantity or 0)


def reserve_inventory(
    db: Session,
    procurement_request_item_id: UUID,
    inventory_id: UUID,
    quantity: Decimal,
    reserved_by: str,
) -> InventoryReservation:
    """
    Reserve inventory for a procurement request item.

    ATP calculation:

        Physical Quantity
        - Active Commitments
        - Active Reservations
        = Available-to-Promise
    """

    if quantity <= 0:
        raise ValueError(
            "Reservation quantity must be greater than zero."
        )

    # ---------------------------------------------------------
    # 1. Get procurement request item
    # ---------------------------------------------------------

    request_item = db.scalar(
        select(ProcurementRequestItem).where(
            ProcurementRequestItem.id
            == procurement_request_item_id
        )
    )

    if not request_item:
        raise ValueError(
            "Procurement request item not found."
        )

    # ---------------------------------------------------------
    # 2. Lock the inventory row
    # ---------------------------------------------------------
    #
    # This is important.
    #
    # Two users could theoretically try to reserve the same
    # inventory simultaneously.
    #
    # FOR UPDATE prevents both transactions from reserving
    # the same available stock.
    #

    inventory = db.scalar(
        select(Inventory)
        .where(
            Inventory.id == inventory_id
        )
        .with_for_update()
    )

    if not inventory:
        raise ValueError(
            "Inventory record not found."
        )

    # ---------------------------------------------------------
    # 3. Validate material
    # ---------------------------------------------------------

    if inventory.material_id != request_item.material_id:
        raise ValueError(
            "Inventory material does not match "
            "the procurement request item material."
        )

    # ---------------------------------------------------------
    # 4. Calculate current commitments
    # ---------------------------------------------------------

    committed_quantity = get_active_committed_quantity(
        db=db,
        inventory_id=inventory.id,
    )

    # ---------------------------------------------------------
    # 5. Calculate current reservations
    # ---------------------------------------------------------

    reserved_quantity = get_active_reserved_quantity(
        db=db,
        inventory_id=inventory.id,
    )

    # ---------------------------------------------------------
    # 6. Calculate ATP
    # ---------------------------------------------------------

    physical_quantity = Decimal(
        inventory.quantity_on_hand
    )

    available_to_promise = max(
        Decimal("0"),
        physical_quantity
        - committed_quantity
        - reserved_quantity,
    )

    # ---------------------------------------------------------
    # 7. Validate requested quantity
    # ---------------------------------------------------------

    if quantity > available_to_promise:
        raise ValueError(
            f"Insufficient available inventory. "
            f"Requested: {quantity}, "
            f"Available-to-Promise: {available_to_promise}."
        )

    # ---------------------------------------------------------
    # 8. Create reservation
    # ---------------------------------------------------------

    reservation = InventoryReservation(
        inventory_id=inventory.id,
        procurement_request_item_id=(
            procurement_request_item_id
        ),
        quantity=quantity,
        status="ACTIVE",
        reserved_by=reserved_by,
    )

    db.add(reservation)

    # Flush sends the INSERT to PostgreSQL while keeping
    # the transaction open.
    db.flush()

    return reservation