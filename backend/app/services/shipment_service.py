from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.shipment import Shipment
from app.models.supplier import Supplier


SHIPMENT_STATUS_PLANNED = "PLANNED"
SHIPMENT_STATUS_DISPATCHED = "DISPATCHED"
SHIPMENT_STATUS_IN_TRANSIT = "IN_TRANSIT"
SHIPMENT_STATUS_DELIVERED = "DELIVERED"

RISK_ON_TRACK = "ON_TRACK"
RISK_AT_RISK = "AT_RISK"
RISK_DELAYED = "DELAYED"


def generate_shipment_number(db: Session) -> str:
    today = date.today().strftime("%Y%m%d")

    prefix = f"SHP-{today}-"

    count = (
        db.query(func.count(Shipment.id))
        .filter(Shipment.shipment_number.like(f"{prefix}%"))
        .scalar()
        or 0
    )

    return f"{prefix}{count + 1:04d}"


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


def _get_po_ordered_quantity(
    db: Session,
    purchase_order_id: UUID,
) -> Decimal:
    quantity = (
        db.query(func.coalesce(func.sum(PurchaseOrderItem.quantity), 0))
        .filter(
            PurchaseOrderItem.purchase_order_id == purchase_order_id
        )
        .scalar()
    )

    return Decimal(str(quantity or 0))


def _calculate_risk_status(
    expected_delivery_date: date,
    required_date: date,
    actual_delivery_date: date | None = None,
) -> tuple[str, int]:
    if actual_delivery_date is not None:
        delay_days = max(
            0,
            (actual_delivery_date - required_date).days,
        )

        if delay_days > 0:
            return RISK_DELAYED, delay_days

        return RISK_ON_TRACK, 0

    today = date.today()

    if today > expected_delivery_date:
        delay_days = (today - expected_delivery_date).days
        return RISK_DELAYED, delay_days

    days_until_expected = (
        expected_delivery_date - today
    ).days

    delivery_buffer = (
        required_date - expected_delivery_date
    ).days

    if delivery_buffer <= 7 or days_until_expected <= 3:
        return RISK_AT_RISK, 0

    return RISK_ON_TRACK, 0


def create_shipment(
    db: Session,
    purchase_order_id: UUID,
    quantity_shipped: Decimal,
    expected_delivery_date: date,
    shipment_date: date | None = None,
    carrier_name: str | None = None,
    tracking_reference: str | None = None,
    remarks: str | None = None,
) -> Shipment:

    purchase_order = _get_purchase_order(
        db,
        purchase_order_id,
    )

    if purchase_order.status != "ISSUED":
        raise ValueError(
            f"Purchase Order {purchase_order.po_number} must be "
            f"ISSUED before a shipment can be created."
        )

    if purchase_order.supplier_id is None:
        raise ValueError(
            f"Purchase Order {purchase_order.po_number} has no supplier."
        )

    if purchase_order.supplier_confirmation_status not in {
        "CONFIRMED",
        "PARTIALLY_CONFIRMED",
    }:
        raise ValueError(
            f"Purchase Order {purchase_order.po_number} must have "
            f"a supplier confirmation before shipment creation."
        )

    if quantity_shipped <= 0:
        raise ValueError(
            "Shipment quantity must be greater than zero."
        )

    ordered_quantity = _get_po_ordered_quantity(
        db,
        purchase_order.id,
    )

    existing_shipped_quantity = (
        db.query(
            func.coalesce(func.sum(Shipment.quantity_shipped), 0)
        )
        .filter(
            Shipment.purchase_order_id == purchase_order.id,
            Shipment.status != "CANCELLED",
        )
        .scalar()
    )

    existing_shipped_quantity = Decimal(
        str(existing_shipped_quantity or 0)
    )

    remaining_quantity = (
        ordered_quantity - existing_shipped_quantity
    )

    if quantity_shipped > remaining_quantity:
        raise ValueError(
            f"Shipment quantity {quantity_shipped} exceeds the "
            f"remaining PO quantity {remaining_quantity}."
        )

    if expected_delivery_date > purchase_order.required_date:
        raise ValueError(
            "Expected delivery date cannot be later than the "
            "Purchase Order required date."
        )

    shipment_number = generate_shipment_number(db)

    risk_status, delay_days = _calculate_risk_status(
        expected_delivery_date=expected_delivery_date,
        required_date=purchase_order.required_date,
    )

    shipment = Shipment(
        id=uuid4(),
        shipment_number=shipment_number,
        purchase_order_id=purchase_order.id,
        supplier_id=purchase_order.supplier_id,
        status=(
            SHIPMENT_STATUS_DISPATCHED
            if shipment_date
            else SHIPMENT_STATUS_PLANNED
        ),
        quantity_shipped=quantity_shipped,
        shipment_date=shipment_date,
        expected_delivery_date=expected_delivery_date,
        carrier_name=carrier_name,
        tracking_reference=tracking_reference,
        delay_days=delay_days,
        risk_status=risk_status,
        remarks=remarks,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(shipment)
    db.commit()
    db.refresh(shipment)

    return shipment


def dispatch_shipment(
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

    if shipment.status != SHIPMENT_STATUS_PLANNED:
        raise ValueError(
            f"Shipment {shipment.shipment_number} must be "
            f"PLANNED before it can be dispatched."
        )

    shipment.status = SHIPMENT_STATUS_DISPATCHED

    if shipment.shipment_date is None:
        shipment.shipment_date = date.today()

    shipment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shipment)

    return shipment


def mark_shipment_in_transit(
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

    if shipment.status != SHIPMENT_STATUS_DISPATCHED:
        raise ValueError(
            f"Shipment {shipment.shipment_number} must be "
            f"DISPATCHED before it can be marked IN_TRANSIT."
        )

    shipment.status = SHIPMENT_STATUS_IN_TRANSIT
    shipment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shipment)

    return shipment


def deliver_shipment(
    db: Session,
    shipment_id: UUID,
    actual_delivery_date: date,
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

    if shipment.status not in {
        SHIPMENT_STATUS_DISPATCHED,
        SHIPMENT_STATUS_IN_TRANSIT,
    }:
        raise ValueError(
            f"Shipment {shipment.shipment_number} must be "
            f"DISPATCHED or IN_TRANSIT before delivery."
        )

    shipment.status = SHIPMENT_STATUS_DELIVERED
    shipment.actual_delivery_date = actual_delivery_date

    risk_status, delay_days = _calculate_risk_status(
        expected_delivery_date=shipment.expected_delivery_date,
        required_date=(
            _get_purchase_order(
                db,
                shipment.purchase_order_id,
            ).required_date
        ),
        actual_delivery_date=actual_delivery_date,
    )

    shipment.risk_status = risk_status
    shipment.delay_days = delay_days
    shipment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shipment)

    return shipment


def refresh_shipment_risk(
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

    purchase_order = _get_purchase_order(
        db,
        shipment.purchase_order_id,
    )

    risk_status, delay_days = _calculate_risk_status(
        expected_delivery_date=shipment.expected_delivery_date,
        required_date=purchase_order.required_date,
        actual_delivery_date=shipment.actual_delivery_date,
    )

    shipment.risk_status = risk_status
    shipment.delay_days = delay_days
    shipment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shipment)

    return shipment