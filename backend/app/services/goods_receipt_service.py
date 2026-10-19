from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.goods_receipt import GoodsReceipt
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.shipment import Shipment


INSPECTION_PENDING = "PENDING"
INSPECTION_PASSED = "PASSED"
INSPECTION_FAILED = "FAILED"

GRN_DRAFT = "DRAFT"
GRN_INSPECTED = "INSPECTED"
GRN_ACCEPTED = "ACCEPTED"
GRN_PARTIALLY_ACCEPTED = "PARTIALLY_ACCEPTED"
GRN_REJECTED = "REJECTED"


def generate_grn_number(db: Session) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"GRN-{today}-"

    count = (
        db.query(func.count(GoodsReceipt.id))
        .filter(GoodsReceipt.grn_number.like(f"{prefix}%"))
        .scalar()
        or 0
    )

    return f"{prefix}{count + 1:04d}"


def _get_shipment(
    db: Session,
    shipment_id: UUID,
) -> Shipment:
    shipment = (
        db.query(Shipment)
        .filter(Shipment.id == shipment_id)
        .first()
    )

    if not shipment:
        raise ValueError(
            f"Shipment {shipment_id} was not found."
        )

    return shipment


def _get_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if not purchase_order:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    return purchase_order


def _get_existing_received_quantity(
    db: Session,
    shipment_id: UUID,
) -> Decimal:
    quantity = (
        db.query(
            func.coalesce(
                func.sum(GoodsReceipt.quantity_received),
                0,
            )
        )
        .filter(
            GoodsReceipt.shipment_id == shipment_id,
            GoodsReceipt.status != "REJECTED",
        )
        .scalar()
    )

    return Decimal(str(quantity or 0))


def create_goods_receipt(
    db: Session,
    shipment_id: UUID,
    quantity_received: Decimal,
    receipt_date: date,
    remarks: str | None = None,
) -> GoodsReceipt:

    shipment = _get_shipment(
        db,
        shipment_id,
    )

    if shipment.status != "DELIVERED":
        raise ValueError(
            f"Shipment {shipment.shipment_number} must be "
            f"DELIVERED before creating a Goods Receipt."
        )

    purchase_order = _get_purchase_order(
        db,
        shipment.purchase_order_id,
    )

    if quantity_received <= 0:
        raise ValueError(
            "Quantity received must be greater than zero."
        )

    already_received = _get_existing_received_quantity(
        db,
        shipment.id,
    )

    remaining_quantity = (
        shipment.quantity_shipped - already_received
    )

    if quantity_received > remaining_quantity:
        raise ValueError(
            f"Quantity received {quantity_received} exceeds "
            f"the remaining shipment quantity "
            f"{remaining_quantity}."
        )

    grn = GoodsReceipt(
        id=uuid4(),
        grn_number=generate_grn_number(db),
        shipment_id=shipment.id,
        purchase_order_id=purchase_order.id,
        receipt_date=receipt_date,
        quantity_received=quantity_received,
        quantity_accepted=Decimal("0"),
        quantity_rejected=Decimal("0"),
        inspection_status=INSPECTION_PENDING,
        status=GRN_DRAFT,
        remarks=remarks,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(grn)
    db.commit()
    db.refresh(grn)

    return grn


def complete_goods_receipt_inspection(
    db: Session,
    grn_id: UUID,
    accepted_quantity: Decimal,
    rejected_quantity: Decimal,
    inspection_passed: bool,
    rejection_reason: str | None = None,
) -> GoodsReceipt:

    grn = (
        db.query(GoodsReceipt)
        .filter(GoodsReceipt.id == grn_id)
        .first()
    )

    if not grn:
        raise ValueError(
            f"Goods Receipt {grn_id} was not found."
        )

    if grn.status != GRN_DRAFT:
        raise ValueError(
            f"Goods Receipt {grn.grn_number} must be "
            f"DRAFT before inspection."
        )

    if accepted_quantity < 0:
        raise ValueError(
            "Accepted quantity cannot be negative."
        )

    if rejected_quantity < 0:
        raise ValueError(
            "Rejected quantity cannot be negative."
        )

    if (
        accepted_quantity + rejected_quantity
        != grn.quantity_received
    ):
        raise ValueError(
            "Accepted quantity plus rejected quantity must "
            "equal the quantity received."
        )

    if inspection_passed:
        if rejected_quantity > 0:
            raise ValueError(
                "A passed inspection cannot have rejected quantity."
            )

        if accepted_quantity != grn.quantity_received:
            raise ValueError(
                "A passed inspection must accept the full "
                "received quantity."
            )

        grn.inspection_status = INSPECTION_PASSED
        grn.status = GRN_ACCEPTED

    else:
        if rejected_quantity <= 0:
            raise ValueError(
                "A failed inspection must have rejected quantity."
            )

        grn.inspection_status = INSPECTION_FAILED

        if accepted_quantity > 0:
            grn.status = GRN_PARTIALLY_ACCEPTED
        else:
            grn.status = GRN_REJECTED

        if not rejection_reason:
            raise ValueError(
                "Rejection reason is required when inspection fails."
            )

        grn.rejection_reason = rejection_reason

    grn.quantity_accepted = accepted_quantity
    grn.quantity_rejected = rejected_quantity
    grn.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(grn)

    return grn

    