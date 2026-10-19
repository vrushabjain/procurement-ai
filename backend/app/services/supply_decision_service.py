from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.inventory_commitment import InventoryCommitment
from app.models.inventory_reservation import InventoryReservation
from app.models.procurement_request import ProcurementRequest
from app.models.procurement_request_item import ProcurementRequestItem
from app.models.warehouse import Warehouse

from app.schemas.supply_decision import SupplyDecisionResponse

from app.services.internal_transfer_service import (
    analyze_internal_transfer,
)


def calculate_committed_quantity(
    db: Session,
    inventory_id: UUID,
) -> Decimal:
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


def calculate_reserved_quantity(
    db: Session,
    inventory_id: UUID,
) -> Decimal:
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


def calculate_available_to_promise(
    db: Session,
    inventory: Inventory,
) -> Decimal:
    physical_quantity = Decimal(
        inventory.quantity_on_hand
    )

    committed_quantity = calculate_committed_quantity(
        db,
        inventory.id,
    )

    reserved_quantity = calculate_reserved_quantity(
        db,
        inventory.id,
    )

    return max(
        Decimal("0"),
        physical_quantity
        - committed_quantity
        - reserved_quantity,
    )


def get_supply_decision(
    db: Session,
    procurement_request_id: UUID,
    procurement_request_item_id: UUID,
) -> SupplyDecisionResponse:

    # ---------------------------------------------------------
    # 1. Get procurement request
    # ---------------------------------------------------------

    procurement_request = db.scalar(
        select(ProcurementRequest).where(
            ProcurementRequest.id == procurement_request_id
        )
    )

    if not procurement_request:
        raise ValueError(
            "Procurement request not found"
        )

    # ---------------------------------------------------------
    # 2. Get procurement request item
    # ---------------------------------------------------------

    request_item = db.scalar(
        select(ProcurementRequestItem).where(
            ProcurementRequestItem.id
            == procurement_request_item_id,
            ProcurementRequestItem.procurement_request_id
            == procurement_request_id,
        )
    )

    if not request_item:
        raise ValueError(
            "Procurement request item not found"
        )

    required_quantity = Decimal(
        request_item.quantity
    )

    delivery_location_id = (
        request_item.delivery_location_id
    )

    if not delivery_location_id:
        raise ValueError(
            "Delivery location is required for supply decision"
        )

    # ---------------------------------------------------------
    # 3. Find all inventory for the material
    # ---------------------------------------------------------

    inventory_records = db.scalars(
        select(Inventory).where(
            Inventory.material_id
            == request_item.material_id
        )
    ).all()

    if not inventory_records:
        return SupplyDecisionResponse(
            procurement_request_id=procurement_request.id,
            procurement_request_item_id=request_item.id,
            required_quantity=required_quantity,
            local_warehouse_id=None,
            local_warehouse_code=None,
            local_warehouse_name=None,
            local_physical_quantity=Decimal("0"),
            local_committed_quantity=Decimal("0"),
            local_available_to_promise=Decimal("0"),
            total_internal_atp=Decimal("0"),
            decision="EXTERNAL_SOURCING_REQUIRED",
            source_type="EXTERNAL_SUPPLIER",
            recommended_quantity=Decimal("0"),
            transfer_required=False,
            external_sourcing_required=True,
            shortage_quantity=required_quantity,
            reason=(
                "No internal inventory was found for "
                "the requested material."
            ),
            next_action=(
                "Start external supplier sourcing."
            ),
        )

    # ---------------------------------------------------------
    # 4. Analyze inventory
    # ---------------------------------------------------------

    local_inventory = None
    local_warehouse = None

    total_internal_atp = Decimal("0")

    local_physical_quantity = Decimal("0")
    local_committed_quantity = Decimal("0")
    local_atp = Decimal("0")

    for inventory in inventory_records:

        warehouse = db.scalar(
            select(Warehouse).where(
                Warehouse.id == inventory.warehouse_id
            )
        )

        if not warehouse:
            continue

        available_to_promise = (
            calculate_available_to_promise(
                db,
                inventory,
            )
        )

        total_internal_atp += available_to_promise

        # -----------------------------------------------------
        # Identify inventory at requested delivery location
        # -----------------------------------------------------

        if (
            warehouse.location_id
            == delivery_location_id
        ):
            local_inventory = inventory
            local_warehouse = warehouse

            local_physical_quantity = Decimal(
                inventory.quantity_on_hand
            )

            local_committed_quantity = (
                calculate_committed_quantity(
                    db,
                    inventory.id,
                )
            )

            local_atp = available_to_promise

    # ---------------------------------------------------------
    # 5. CASE 1 — Local inventory can fulfill everything
    # ---------------------------------------------------------

    if local_atp >= required_quantity:

        return SupplyDecisionResponse(
            procurement_request_id=procurement_request.id,
            procurement_request_item_id=request_item.id,
            required_quantity=required_quantity,
            local_warehouse_id=(
                local_warehouse.id
                if local_warehouse
                else None
            ),
            local_warehouse_code=(
                local_warehouse.warehouse_code
                if local_warehouse
                else None
            ),
            local_warehouse_name=(
                local_warehouse.warehouse_name
                if local_warehouse
                else None
            ),
            local_physical_quantity=local_physical_quantity,
            local_committed_quantity=local_committed_quantity,
            local_available_to_promise=local_atp,
            total_internal_atp=total_internal_atp,
            decision="FULFILL_INTERNAL",
            source_type="LOCAL_INVENTORY",
            recommended_quantity=required_quantity,
            transfer_required=False,
            external_sourcing_required=False,
            shortage_quantity=Decimal("0"),
            reason=(
                f"Local inventory at "
                f"{local_warehouse.warehouse_code} "
                f"has {local_atp} units available-to-promise, "
                f"which fully covers the required "
                f"{required_quantity} units."
            ),
            next_action=(
                "Reserve the required quantity from "
                "local inventory."
            ),
        )

    # ---------------------------------------------------------
    # 6. CASE 2 — Local shortage
    #
    # Ask Internal Transfer Analysis for the actual
    # transfer options instead of simply comparing
    # total internal ATP.
    # ---------------------------------------------------------

    transfer_analysis = analyze_internal_transfer(
        db=db,
        procurement_request_id=procurement_request_id,
        procurement_request_item_id=procurement_request_item_id,
    )

    transfer_quantity_available = sum(
        (
            option.transferable_quantity
            for option in transfer_analysis.options
            if option.can_arrive_by_required_date
        ),
        Decimal("0"),
    )

    # ---------------------------------------------------------
    # 7. CASE 2A — Internal transfer can fulfill
    #             the entire shortage
    # ---------------------------------------------------------

    if transfer_quantity_available >= (
        required_quantity - local_atp
    ):

        transfer_shortage = (
            required_quantity - local_atp
        )

        return SupplyDecisionResponse(
            procurement_request_id=procurement_request.id,
            procurement_request_item_id=request_item.id,
            required_quantity=required_quantity,
            local_warehouse_id=(
                local_warehouse.id
                if local_warehouse
                else None
            ),
            local_warehouse_code=(
                local_warehouse.warehouse_code
                if local_warehouse
                else None
            ),
            local_warehouse_name=(
                local_warehouse.warehouse_name
                if local_warehouse
                else None
            ),
            local_physical_quantity=local_physical_quantity,
            local_committed_quantity=local_committed_quantity,
            local_available_to_promise=local_atp,
            total_internal_atp=total_internal_atp,
            decision="INTERNAL_TRANSFER_REQUIRED",
            source_type="INTERNAL_TRANSFER",
            recommended_quantity=required_quantity,
            transfer_required=True,
            external_sourcing_required=False,
            shortage_quantity=Decimal("0"),
            reason=(
                f"Local inventory provides {local_atp} units. "
                f"Internal transfer options can provide "
                f"{transfer_quantity_available} additional units "
                f"within the required delivery date."
            ),
            next_action=(
                "Review the internal transfer option and "
                "reserve the required source inventory."
            ),
        )

    # ---------------------------------------------------------
    # 8. CASE 2B — Transfer only partially covers shortage
    # ---------------------------------------------------------

    if transfer_quantity_available > Decimal("0"):

        remaining_shortage = (
            required_quantity
            - local_atp
            - transfer_quantity_available
        )

        return SupplyDecisionResponse(
            procurement_request_id=procurement_request.id,
            procurement_request_item_id=request_item.id,
            required_quantity=required_quantity,
            local_warehouse_id=(
                local_warehouse.id
                if local_warehouse
                else None
            ),
            local_warehouse_code=(
                local_warehouse.warehouse_code
                if local_warehouse
                else None
            ),
            local_warehouse_name=(
                local_warehouse.warehouse_name
                if local_warehouse
                else None
            ),
            local_physical_quantity=local_physical_quantity,
            local_committed_quantity=local_committed_quantity,
            local_available_to_promise=local_atp,
            total_internal_atp=total_internal_atp,
            decision="PARTIAL_INTERNAL_TRANSFER",
            source_type="INTERNAL_TRANSFER_PLUS_EXTERNAL",
            recommended_quantity=(
                local_atp
                + transfer_quantity_available
            ),
            transfer_required=True,
            external_sourcing_required=True,
            shortage_quantity=remaining_shortage,
            reason=(
                f"Local inventory provides {local_atp} units. "
                f"Feasible internal transfer options provide "
                f"{transfer_quantity_available} units, leaving "
                f"{remaining_shortage} units to source externally."
            ),
            next_action=(
                f"Transfer {transfer_quantity_available} units "
                f"internally and source the remaining "
                f"{remaining_shortage} units from approved "
                f"external suppliers."
            ),
        )

    # ---------------------------------------------------------
    # 9. CASE 3 — No feasible internal transfer
    # ---------------------------------------------------------

    shortage_quantity = (
        required_quantity
        - local_atp
    )

    return SupplyDecisionResponse(
        procurement_request_id=procurement_request.id,
        procurement_request_item_id=request_item.id,
        required_quantity=required_quantity,
        local_warehouse_id=(
            local_warehouse.id
            if local_warehouse
            else None
        ),
        local_warehouse_code=(
            local_warehouse.warehouse_code
            if local_warehouse
            else None
        ),
        local_warehouse_name=(
            local_warehouse.warehouse_name
            if local_warehouse
            else None
        ),
        local_physical_quantity=local_physical_quantity,
        local_committed_quantity=local_committed_quantity,
        local_available_to_promise=local_atp,
        total_internal_atp=total_internal_atp,
        decision="EXTERNAL_SOURCING_REQUIRED",
        source_type="EXTERNAL_SUPPLIER",
        recommended_quantity=local_atp,
        transfer_required=False,
        external_sourcing_required=True,
        shortage_quantity=shortage_quantity,
        reason=(
            f"Local inventory provides only {local_atp} "
            f"units and no feasible internal transfer "
            f"can cover the remaining requirement."
        ),
        next_action=(
            f"Source {shortage_quantity} units "
            f"from approved external suppliers."
        ),
    )