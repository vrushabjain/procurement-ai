from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.procurement_exception import ProcurementException
from app.models.purchase_order import PurchaseOrder
from app.models.shipment import Shipment
from app.models.goods_receipt import GoodsReceipt


# Exception types
SHIPMENT_DELAY_RISK = "SHIPMENT_DELAY_RISK"
DELIVERY_DATE_RISK = "DELIVERY_DATE_RISK"
PO_CONFIRMATION_RISK = "PO_CONFIRMATION_RISK"



# Severity
LOW = "LOW"
MEDIUM = "MEDIUM"
HIGH = "HIGH"
CRITICAL = "CRITICAL"


def generate_exception_number(db: Session) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")

    count = (
        db.query(func.count(ProcurementException.id))
        .filter(
            ProcurementException.exception_number.like(
                f"EXC-{today}-%"
            )
        )
        .scalar()
        or 0
    )

    return f"EXC-{today}-{count + 1:04d}"


def _open_exception_exists(
    db: Session,
    exception_type: str,
    purchase_order_id: UUID | None = None,
    shipment_id: UUID | None = None,
) -> bool:

    query = db.query(ProcurementException).filter(
        ProcurementException.exception_type == exception_type,
        ProcurementException.status == "OPEN",
    )

    if purchase_order_id:
        query = query.filter(
            ProcurementException.purchase_order_id == purchase_order_id
        )

    if shipment_id:
        query = query.filter(
            ProcurementException.shipment_id == shipment_id
        )

    return query.first() is not None


def _create_exception(
    db: Session,
    *,
    exception_type: str,
    severity: str,
    title: str,
    description: str,
    business_impact: str,
    recommended_action: str,
    procurement_request_id: UUID | None = None,
    purchase_order_id: UUID | None = None,
    shipment_id: UUID | None = None,
) -> ProcurementException:

    exception = ProcurementException(
        exception_number=generate_exception_number(db),
        procurement_request_id=procurement_request_id,
        purchase_order_id=purchase_order_id,
        shipment_id=shipment_id,
        exception_type=exception_type,
        severity=severity,
        title=title,
        description=description,
        business_impact=business_impact,
        status="OPEN",
        recommended_action=recommended_action,
    )

    db.add(exception)
    db.commit()
    db.refresh(exception)

    return exception


def evaluate_shipment_risk(
    db: Session,
    shipment_id: UUID,
) -> ProcurementException | None:

    shipment = (
        db.query(Shipment)
        .filter(Shipment.id == shipment_id)
        .first()
    )

    if not shipment:
        raise ValueError("Shipment not found.")

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == shipment.purchase_order_id)
        .first()
    )

    if not po:
        raise ValueError("Purchase Order for shipment not found.")

    # Delivered shipments do not have an active delivery risk.
    if shipment.status == "DELIVERED":
        return None

    today = date.today()

    # Explicit shipment delay.
    if shipment.actual_delivery_date:
        delay_days = (
            shipment.actual_delivery_date
            - shipment.expected_delivery_date
        ).days
    else:
        delay_days = (
            today - shipment.expected_delivery_date
        ).days

    if delay_days <= 0:
        return None

    severity = MEDIUM

    if delay_days > 7:
        severity = HIGH

    if delay_days > 14:
        severity = CRITICAL

    if _open_exception_exists(
        db,
        SHIPMENT_DELAY_RISK,
        purchase_order_id=po.id,
        shipment_id=shipment.id,
    ):
        return None

    return _create_exception(
        db,
        exception_type=SHIPMENT_DELAY_RISK,
        severity=severity,
        title=f"Shipment {shipment.shipment_number} is delayed",
        description=(
            f"Shipment {shipment.shipment_number} is "
            f"{delay_days} day(s) beyond its expected delivery date."
        ),
        business_impact=(
            f"Potential delay to Purchase Order {po.po_number} "
            f"and the associated project material requirement."
        ),
        recommended_action=(
            "Contact the supplier/carrier, confirm revised ETA, "
            "and assess project impact."
        ),
        purchase_order_id=po.id,
        shipment_id=shipment.id,
    )


def evaluate_delivery_date_risk(
    db: Session,
    purchase_order_id: UUID,
) -> ProcurementException | None:

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if not po:
        raise ValueError("Purchase Order not found.")

    if po.status == "CLOSED":
        return None

    if not po.expected_delivery_date:
        return None

    today = date.today()

    days_remaining = (
        po.expected_delivery_date - today
    ).days

    # Already past expected delivery date.
    if days_remaining < 0:
        severity = CRITICAL

    # Delivery within 3 days.
    elif days_remaining <= 3:
        severity = HIGH

    # Delivery within 7 days.
    elif days_remaining <= 7:
        severity = MEDIUM

    else:
        return None

    if _open_exception_exists(
        db,
        DELIVERY_DATE_RISK,
        purchase_order_id=po.id,
    ):
        return None

    return _create_exception(
        db,
        exception_type=DELIVERY_DATE_RISK,
        severity=severity,
        title=f"PO {po.po_number} approaching delivery date",
        description=(
            f"Purchase Order {po.po_number} has "
            f"{max(days_remaining, 0)} day(s) remaining until "
            f"the expected delivery date."
        ),
        business_impact=(
            "Late material availability may affect project execution "
            "and procurement commitments."
        ),
        recommended_action=(
            "Verify supplier delivery commitment and monitor shipment "
            "status closely."
        ),
        purchase_order_id=po.id,
    )


def evaluate_po_confirmation_risk(
    db: Session,
    purchase_order_id: UUID,
) -> ProcurementException | None:

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if not po:
        raise ValueError("Purchase Order not found.")

    if po.status not in {"ISSUED"}:
        return None

    if po.supplier_confirmation_status != "PENDING":
        return None

    if _open_exception_exists(
        db,
        PO_CONFIRMATION_RISK,
        purchase_order_id=po.id,
    ):
        return None

    return _create_exception(
        db,
        exception_type=PO_CONFIRMATION_RISK,
        severity=HIGH,
        title=f"Supplier confirmation pending for {po.po_number}",
        description=(
            f"Purchase Order {po.po_number} has been issued but "
            "supplier confirmation is still pending."
        ),
        business_impact=(
            "The organization does not yet have a confirmed supplier "
            "commitment for quantity and delivery."
        ),
        recommended_action=(
            "Follow up with the supplier and obtain formal confirmation."
        ),
        purchase_order_id=po.id,
    )


def evaluate_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> list[ProcurementException]:

    exceptions: list[ProcurementException] = []

    confirmation_exception = evaluate_po_confirmation_risk(
        db,
        purchase_order_id,
    )

    if confirmation_exception:
        exceptions.append(confirmation_exception)

    delivery_exception = evaluate_delivery_date_risk(
        db,
        purchase_order_id,
    )

    if delivery_exception:
        exceptions.append(delivery_exception)

    shipments = (
        db.query(Shipment)
        .filter(
            Shipment.purchase_order_id == purchase_order_id
        )
        .all()
    )

    for shipment in shipments:
        shipment_exception = evaluate_shipment_risk(
            db,
            shipment.id,
        )

        if shipment_exception:
            exceptions.append(shipment_exception)

    return exceptions