from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.inventory_commitment import InventoryCommitment
from app.models.inventory_reservation import InventoryReservation
from app.models.location import Location
from app.models.procurement_request import ProcurementRequest
from app.models.procurement_request_item import ProcurementRequestItem
from app.models.warehouse import Warehouse
from app.models.warehouse_transfer_lane import WarehouseTransferLane
from app.schemas.internal_transfer import (
    InternalTransferAnalysisResponse,
    TransferOptionResponse,
)


ZERO = Decimal("0")


def get_active_committed_quantity(
    db: Session,
    inventory_id: UUID,
) -> Decimal:
    result = db.execute(
        select(InventoryCommitment.quantity).where(
            InventoryCommitment.inventory_id == inventory_id,
            InventoryCommitment.status == "ACTIVE",
        )
    )

    total = sum(
        (row[0] for row in result.all()),
        ZERO,
    )

    return Decimal(total)


def get_active_reserved_quantity(
    db: Session,
    inventory_id: UUID,
) -> Decimal:
    result = db.execute(
        select(InventoryReservation.quantity).where(
            InventoryReservation.inventory_id == inventory_id,
            InventoryReservation.status == "ACTIVE",
        )
    )

    total = sum(
        (row[0] for row in result.all()),
        ZERO,
    )

    return Decimal(total)


def calculate_atp(
    db: Session,
    inventory: Inventory,
) -> Decimal:
    committed_quantity = get_active_committed_quantity(
        db,
        inventory.id,
    )

    reserved_quantity = get_active_reserved_quantity(
        db,
        inventory.id,
    )

    atp = (
        Decimal(inventory.quantity_on_hand)
        - committed_quantity
        - reserved_quantity
    )

    return max(atp, ZERO)


def analyze_internal_transfer(
    db: Session,
    procurement_request_id: UUID,
    procurement_request_item_id: UUID,
) -> InternalTransferAnalysisResponse:

    # ---------------------------------------------------------
    # 1. Load procurement request
    # ---------------------------------------------------------

    procurement_request = db.execute(
        select(ProcurementRequest).where(
            ProcurementRequest.id == procurement_request_id
        )
    ).scalar_one_or_none()

    if not procurement_request:
        raise ValueError("Procurement request not found.")

    # ---------------------------------------------------------
    # 2. Load procurement request item
    # ---------------------------------------------------------

    item = db.execute(
        select(ProcurementRequestItem).where(
            ProcurementRequestItem.id == procurement_request_item_id,
            ProcurementRequestItem.procurement_request_id
            == procurement_request_id,
        )
    ).scalar_one_or_none()

    if not item:
        raise ValueError("Procurement request item not found.")

    # ---------------------------------------------------------
    # 3. Validate delivery location
    # ---------------------------------------------------------

    if not item.delivery_location_id:
        raise ValueError(
            "Procurement request item does not have a delivery location."
        )

    destination_location = db.execute(
        select(Location).where(
            Location.id == item.delivery_location_id
        )
    ).scalar_one_or_none()

    if not destination_location:
        raise ValueError("Delivery location not found.")

    # ---------------------------------------------------------
    # 4. Find destination warehouse(s)
    # ---------------------------------------------------------

    destination_warehouses = db.execute(
        select(Warehouse).where(
            Warehouse.location_id == destination_location.id,
            Warehouse.is_active.is_(True),
        )
    ).scalars().all()

    if not destination_warehouses:
        raise ValueError(
            "No active warehouse found at the delivery location."
        )

    destination_warehouse_ids = {
        warehouse.id for warehouse in destination_warehouses
    }

    # ---------------------------------------------------------
    # 5. Calculate local ATP
    # ---------------------------------------------------------

    local_inventories = db.execute(
        select(Inventory).where(
            Inventory.material_id == item.material_id,
            Inventory.warehouse_id.in_(destination_warehouse_ids),
        )
    ).scalars().all()

    local_atp = ZERO

    for inventory in local_inventories:
        local_atp += calculate_atp(
            db,
            inventory,
        )

    required_quantity = Decimal(item.quantity)

    local_fulfillable_quantity = min(
        local_atp,
        required_quantity,
    )

    transfer_quantity_required = max(
        required_quantity - local_fulfillable_quantity,
        ZERO,
    )

    transfer_required = transfer_quantity_required > ZERO

    # ---------------------------------------------------------
    # 6. If no transfer is required, return cleanly
    # ---------------------------------------------------------

    if not transfer_required:
        return InternalTransferAnalysisResponse(
            procurement_request_id=procurement_request_id,
            procurement_request_item_id=procurement_request_item_id,
            required_quantity=required_quantity,
            local_available_to_promise=local_atp,
            local_fulfillable_quantity=local_fulfillable_quantity,
            transfer_required=False,
            transfer_quantity_required=ZERO,
            remaining_shortage=ZERO,
            options=[],
        )

    # ---------------------------------------------------------
    # 7. Find all potential source inventory
    # ---------------------------------------------------------

    source_inventories = db.execute(
        select(Inventory).where(
            Inventory.material_id == item.material_id,
            ~Inventory.warehouse_id.in_(destination_warehouse_ids),
        )
    ).scalars().all()

    # ---------------------------------------------------------
    # 8. Analyze each source warehouse
    # ---------------------------------------------------------

    options: list[TransferOptionResponse] = []

    remaining_requirement = transfer_quantity_required

    for inventory in source_inventories:

        source_atp = calculate_atp(
            db,
            inventory,
        )

        if source_atp <= ZERO:
            continue

        source_warehouse = db.execute(
            select(Warehouse).where(
                Warehouse.id == inventory.warehouse_id,
                Warehouse.is_active.is_(True),
            )
        ).scalar_one_or_none()

        if not source_warehouse:
            continue

        # -----------------------------------------------------
        # Find active transfer lane
        # -----------------------------------------------------

        lane = db.execute(
            select(WarehouseTransferLane).where(
                WarehouseTransferLane.source_warehouse_id
                == source_warehouse.id,
                WarehouseTransferLane.destination_warehouse_id.in_(
                    destination_warehouse_ids
                ),
                WarehouseTransferLane.is_active.is_(True),
            )
        ).scalars().first()

        if not lane:
            continue

        destination_warehouse = db.execute(
            select(Warehouse).where(
                Warehouse.id == lane.destination_warehouse_id
            )
        ).scalar_one()

        transferable_quantity = min(
            source_atp,
            remaining_requirement,
        )

        if transferable_quantity <= ZERO:
            continue

        total_transfer_cost = (
            Decimal(lane.fixed_transfer_cost)
            + (
                transferable_quantity
                * Decimal(lane.cost_per_unit)
            )
        )

        expected_arrival_date = (
            date.today()
            + timedelta(
                days=float(lane.transit_days)
            )
        )

        can_arrive_by_required_date = (
            expected_arrival_date
            <= procurement_request.required_date
        )

        options.append(
            TransferOptionResponse(
                source_warehouse_id=source_warehouse.id,
                source_warehouse_code=source_warehouse.warehouse_code,
                source_warehouse_name=source_warehouse.warehouse_name,
                destination_warehouse_id=destination_warehouse.id,
                destination_warehouse_code=(
                    destination_warehouse.warehouse_code
                ),
                destination_warehouse_name=(
                    destination_warehouse.warehouse_name
                ),
                available_to_promise=source_atp,
                transferable_quantity=transferable_quantity,
                distance_km=Decimal(lane.distance_km),
                transit_days=Decimal(lane.transit_days),
                fixed_transfer_cost=Decimal(
                    lane.fixed_transfer_cost
                ),
                cost_per_unit=Decimal(
                    lane.cost_per_unit
                ),
                total_transfer_cost=total_transfer_cost,
                currency_code=lane.currency_code,
                expected_arrival_date=expected_arrival_date,
                required_date=procurement_request.required_date,
                can_arrive_by_required_date=(
                    can_arrive_by_required_date
                ),
            )
        )

        remaining_requirement -= transferable_quantity

        if remaining_requirement <= ZERO:
            break

    # ---------------------------------------------------------
    # 9. Return analysis
    # ---------------------------------------------------------

    return InternalTransferAnalysisResponse(
        procurement_request_id=procurement_request_id,
        procurement_request_item_id=procurement_request_item_id,
        required_quantity=required_quantity,
        local_available_to_promise=local_atp,
        local_fulfillable_quantity=local_fulfillable_quantity,
        transfer_required=True,
        transfer_quantity_required=transfer_quantity_required,
        remaining_shortage=max(
            remaining_requirement,
            ZERO,
        ),
        options=options,
    )