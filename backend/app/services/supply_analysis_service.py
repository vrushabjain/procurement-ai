
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

from app.schemas.supply_analysis import (
    InventorySupplyOption,
    SupplyAnalysisResponse,
)


def analyze_supply(
    db: Session,
    procurement_request_id: UUID,
    procurement_request_item_id: UUID,
) -> SupplyAnalysisResponse:

    # 1. Retrieve procurement request
    request = db.scalar(
        select(ProcurementRequest).where(
            ProcurementRequest.id == procurement_request_id
        )
    )

    if not request:
        raise ValueError("Procurement request not found")

    # 2. Retrieve request item
    request_item = db.scalar(
        select(ProcurementRequestItem).where(
            ProcurementRequestItem.id == procurement_request_item_id,
            ProcurementRequestItem.procurement_request_id
            == procurement_request_id,
        )
    )

    if not request_item:
        raise ValueError("Procurement request item not found")

    required_quantity = Decimal(str(request_item.quantity))

    # 3. Retrieve inventory for the requested material
    inventory_records = db.scalars(
        select(Inventory).where(
            Inventory.material_id == request_item.material_id
        )
    ).all()

    options = []
    total_internal_atp = Decimal("0")

    # 4. Calculate ATP consistently for each warehouse
    for inventory in inventory_records:

        warehouse = db.scalar(
            select(Warehouse).where(
                Warehouse.id == inventory.warehouse_id
            )
        )

        if not warehouse:
            continue

        # Sum active commitments
        committed_quantity = db.scalar(
            select(
                func.coalesce(
                    func.sum(InventoryCommitment.quantity),
                    0,
                )
            ).where(
                InventoryCommitment.inventory_id == inventory.id,
                InventoryCommitment.status == "ACTIVE",
            )
        )

        committed_quantity = Decimal(
            str(committed_quantity or 0)
        )

        # Sum active reservations
        reserved_quantity = db.scalar(
            select(
                func.coalesce(
                    func.sum(InventoryReservation.quantity),
                    0,
                )
            ).where(
                InventoryReservation.inventory_id == inventory.id,
                InventoryReservation.status == "ACTIVE",
            )
        )

        reserved_quantity = Decimal(
            str(reserved_quantity or 0)
        )

        physical_quantity = Decimal(
            str(inventory.quantity_on_hand)
        )

        # ATP = physical stock - commitments - reservations
        available_to_promise = max(
            Decimal("0"),
            physical_quantity
            - committed_quantity
            - reserved_quantity,
        )

        total_internal_atp += available_to_promise

        options.append(
            InventorySupplyOption(
                warehouse_id=warehouse.id,
                warehouse_code=warehouse.warehouse_code,
                warehouse_name=warehouse.warehouse_name,
                physical_quantity=physical_quantity,
                reserved_quantity=reserved_quantity,
                committed_quantity=committed_quantity,
                available_to_promise=available_to_promise,
                unit_cost=inventory.unit_cost,
                fulfillable_quantity=min(
                    available_to_promise,
                    required_quantity,
                ),
                shortage_quantity=max(
                    Decimal("0"),
                    required_quantity - available_to_promise,
                ),
            )
        )

    # 5. Calculate the overall network shortage
    internal_fulfillment_possible = (
        total_internal_atp >= required_quantity
    )

    shortage_quantity = max(
        Decimal("0"),
        required_quantity - total_internal_atp,
    )

    return SupplyAnalysisResponse(
        procurement_request_id=request.id,
        procurement_request_item_id=request_item.id,
        required_quantity=required_quantity,
        total_internal_atp=total_internal_atp,
        internal_fulfillment_possible=internal_fulfillment_possible,
        shortage_quantity=shortage_quantity,
        options=options,
    )
