from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.procurement_request import ProcurementRequest
from app.models.procurement_request_item import ProcurementRequestItem
from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem
from app.models.rfq_supplier import RFQSupplier
from app.schemas.supplier_eligibility import (
    SupplierEligibilityResponse,
)
from app.services.supplier_eligibility_service import (
    get_supplier_eligibility,
)
from app.services.supply_decision_service import (
    get_supply_decision,
)


def generate_rfq_number(db: Session) -> str:
    """
    Generate a unique RFQ number.
    """

    today = date.today().strftime("%Y%m%d")

    prefix = f"RFQ-{today}-"

    # Simple sequential generation.
    # We determine the next number from existing RFQs.
    existing_rfqs = db.scalars(
        select(RFQ.rfq_number).where(
            RFQ.rfq_number.like(f"{prefix}%")
        )
    ).all()

    next_number = len(existing_rfqs) + 1

    return f"{prefix}{next_number:04d}"


def create_rfq_from_procurement_request(
    db: Session,
    procurement_request_id: UUID,
    procurement_request_item_id: UUID,
    response_due_days: int = 7,
) -> RFQ:

    # ---------------------------------------------------------
    # 1. Validate procurement request
    # ---------------------------------------------------------

    procurement_request = db.scalar(
        select(ProcurementRequest).where(
            ProcurementRequest.id == procurement_request_id
        )
    )

    if not procurement_request:
        raise ValueError(
            f"Procurement request not found: "
            f"{procurement_request_id}"
        )

    # ---------------------------------------------------------
    # 2. Validate procurement request item
    # ---------------------------------------------------------

    item = db.scalar(
        select(ProcurementRequestItem).where(
            ProcurementRequestItem.id == procurement_request_item_id,
            ProcurementRequestItem.procurement_request_id
            == procurement_request_id,
        )
    )

    if not item:
        raise ValueError(
            f"Procurement request item not found: "
            f"{procurement_request_item_id}"
        )

    # ---------------------------------------------------------
    # 3. Determine current supply decision
    # ---------------------------------------------------------

    supply_decision = get_supply_decision(
        db=db,
        procurement_request_id=procurement_request_id,
        procurement_request_item_id=procurement_request_item_id,
    )

    external_quantity = supply_decision.shortage_quantity

    if external_quantity <= 0:
        raise ValueError(
            "External sourcing is not required for this item."
        )

    if not supply_decision.external_sourcing_required:
        raise ValueError(
            "Supply decision does not require external sourcing."
        )

    # ---------------------------------------------------------
    # 4. Determine eligible suppliers
    # ---------------------------------------------------------

    eligibility: SupplierEligibilityResponse = (
        get_supplier_eligibility(
            db=db,
            procurement_request_id=procurement_request_id,
            procurement_request_item_id=procurement_request_item_id,
        )
    )

    eligible_suppliers = eligibility.eligible_suppliers

    if not eligible_suppliers:
        raise ValueError(
            "No eligible suppliers are available for this material."
        )

    # ---------------------------------------------------------
    # 5. Prevent duplicate RFQ for same request item
    # ---------------------------------------------------------

    existing_rfq = db.scalar(
        select(RFQ)
        .join(
            RFQItem,
            RFQItem.rfq_id == RFQ.id,
        )
        .where(
            RFQItem.procurement_request_item_id
            == procurement_request_item_id
        )
    )

    if existing_rfq:
        raise ValueError(
            f"An RFQ already exists for procurement request item "
            f"{procurement_request_item_id}: "
            f"{existing_rfq.rfq_number}"
        )

    # ---------------------------------------------------------
    # 6. Create RFQ
    # ---------------------------------------------------------

    today = date.today()

    rfq = RFQ(
        rfq_number=generate_rfq_number(db),
        procurement_request_id=procurement_request_id,
        status="DRAFT",
        issue_date=today,
        response_due_date=today + timedelta(
            days=response_due_days
        ),
        currency_code="USD",
        delivery_location_id=item.delivery_location_id,
        notes=(
            "RFQ automatically generated from procurement request "
            f"{procurement_request.request_number}."
        ),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(rfq)
    db.flush()

    # ---------------------------------------------------------
    # 7. Create RFQ item
    # ---------------------------------------------------------

    rfq_item = RFQItem(
        rfq_id=rfq.id,
        procurement_request_item_id=item.id,
        material_id=item.material_id,
        quantity=external_quantity,
        uom=item.uom,
        technical_specification=item.technical_specification,
    )

    db.add(rfq_item)
    db.flush()

    # ---------------------------------------------------------
    # 8. Invite eligible suppliers
    # ---------------------------------------------------------

    for supplier in eligible_suppliers:

        invitation = RFQSupplier(
            rfq_id=rfq.id,
            supplier_id=supplier.supplier_id,
            invitation_status="INVITED",
            invited_at=datetime.now(timezone.utc),
        )

        db.add(invitation)

    # ---------------------------------------------------------
    # 9. Commit entire RFQ transaction
    # ---------------------------------------------------------

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(rfq)

    return rfq