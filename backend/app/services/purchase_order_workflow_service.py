from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.purchase_order import (
    PurchaseOrder,
    PurchaseOrderItem,
)

from app.models.purchase_requisition import (
    PurchaseRequisition,
)

from app.models.supplier_quote import SupplierQuote

def validate_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    """
    Validate a draft Purchase Order before issuance.
    """

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    if po.status != "DRAFT":
        raise ValueError(
            f"Purchase Order {po.po_number} is "
            f"{po.status}. Only DRAFT POs can be validated."
        )

    # ---------------------------------------------------------
    # Retrieve source PR
    # ---------------------------------------------------------

    pr = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.id
            == po.purchase_requisition_id
        )
        .first()
    )

    if pr is None:
        raise ValueError(
            f"Source Purchase Requisition "
            f"{po.purchase_requisition_id} was not found."
        )

    # ---------------------------------------------------------
    # PR must remain approved
    # ---------------------------------------------------------

    if pr.status != "APPROVED":
        raise ValueError(
            f"Source PR {pr.pr_number} is "
            f"{pr.status}. PO cannot be validated."
        )

    # ---------------------------------------------------------
    # Supplier must match
    # ---------------------------------------------------------

    if po.supplier_id != pr.supplier_id:
        raise ValueError(
            "PO supplier does not match the "
            "approved PR supplier."
        )

    # ---------------------------------------------------------
    # Required commercial fields
    # ---------------------------------------------------------

    if not po.currency_code:
        raise ValueError(
            "PO currency is missing."
        )

    if not po.payment_terms:
        raise ValueError(
            "PO payment terms are missing."
        )

    if not po.incoterm:
        raise ValueError(
            "PO Incoterm is missing."
        )

    # ---------------------------------------------------------
    # Required dates
    # ---------------------------------------------------------

    if po.required_date < po.order_date:
        raise ValueError(
            "PO required date cannot be before "
            "the PO order date."
        )

    if (
        po.expected_delivery_date is not None
        and po.expected_delivery_date > po.required_date
    ):
        raise ValueError(
            "Expected delivery date exceeds "
            "the required date."
        )

    # ---------------------------------------------------------
    # Retrieve PO items
    # ---------------------------------------------------------

    items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.purchase_order_id
            == po.id
        )
        .all()
    )

    if not items:
        raise ValueError(
            f"Purchase Order {po.po_number} "
            "has no line items."
        )

    # ---------------------------------------------------------
    # Reconcile line totals
    # ---------------------------------------------------------

    calculated_total = 0

    for item in items:

        if item.quantity <= 0:
            raise ValueError(
                f"PO item {item.id} has invalid quantity."
            )

        if item.unit_price < 0:
            raise ValueError(
                f"PO item {item.id} has invalid unit price."
            )

        calculated_line_total = (
            item.quantity * item.unit_price
        )

        if calculated_line_total != item.line_total:
            raise ValueError(
                f"PO item {item.id} line total does "
                "not reconcile."
            )

        calculated_total += calculated_line_total

    # ---------------------------------------------------------
    # Validate commercial total
    # ---------------------------------------------------------

    calculated_total += (
        po.freight_cost
        + po.insurance_cost
        + po.tax_cost
    )

    if calculated_total != po.total_amount:
        raise ValueError(
            "PO total does not reconcile with "
            "its line items and commercial costs."
        )

    # ---------------------------------------------------------
    # Validate against approved PR
    # ---------------------------------------------------------

    if po.total_amount != pr.total_amount:
        raise ValueError(
            "PO total does not match the "
            "approved PR total."
        )

    # ---------------------------------------------------------
    # Supplier confirmation must still be pending
    # ---------------------------------------------------------

    if po.supplier_confirmation_status != "PENDING":
        raise ValueError(
            "PO supplier confirmation status is "
            f"{po.supplier_confirmation_status}."
        )

    # ---------------------------------------------------------
    # Validation successful
    # ---------------------------------------------------------

    po.status = "VALIDATED"
    po.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(po)

    return po

def enrich_draft_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    """
    Synchronize commercial and delivery terms on a DRAFT PO
    from its approved supplier quote.

    This is allowed only while the PO is still DRAFT.
    Once validated or issued, these fields cannot be
    silently changed.
    """

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    if po.status != "DRAFT":
        raise ValueError(
            f"Purchase Order {po.po_number} is "
            f"{po.status}. Only DRAFT POs can be enriched."
        )

    # ---------------------------------------------------------
    # Retrieve source PR
    # ---------------------------------------------------------

    pr = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.id
            == po.purchase_requisition_id
        )
        .first()
    )

    if pr is None:
        raise ValueError(
            f"Source Purchase Requisition "
            f"{po.purchase_requisition_id} was not found."
        )

    # ---------------------------------------------------------
    # Retrieve approved supplier quote
    # ---------------------------------------------------------

    quote = (
        db.query(SupplierQuote)
        .filter(
            SupplierQuote.id == pr.quote_id
        )
        .first()
    )

    if quote is None:
        raise ValueError(
            f"Supplier quote {pr.quote_id} was not found."
        )

    # ---------------------------------------------------------
    # Validate supplier lineage
    # ---------------------------------------------------------

    if quote.supplier_id != pr.supplier_id:
        raise ValueError(
            "Supplier on the quote does not match "
            "the supplier on the approved PR."
        )

    if quote.supplier_id != po.supplier_id:
        raise ValueError(
            "Supplier on the quote does not match "
            "the supplier on the PO."
        )

    # ---------------------------------------------------------
    # Copy approved commercial terms
    # ---------------------------------------------------------

    po.currency_code = quote.currency_code

    po.payment_terms = quote.payment_terms

    po.incoterm = quote.incoterm

    po.freight_cost = (
        quote.freight_cost or Decimal("0")
    )

    po.insurance_cost = (
        quote.insurance_cost or Decimal("0")
    )

    po.tax_cost = (
        quote.tax_cost or Decimal("0")
    )

    # ---------------------------------------------------------
    # Calculate expected delivery
    # ---------------------------------------------------------

    if quote.delivery_days is not None:

        po.expected_delivery_date = (
            po.order_date
            + timedelta(days=quote.delivery_days)
        )

    else:

        po.expected_delivery_date = None

    # ---------------------------------------------------------
    # Update timestamp
    # ---------------------------------------------------------

    po.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(po)

    return po


def issue_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    """
    Issue a validated Purchase Order to the supplier.
    """

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    if po.status != "VALIDATED":
        raise ValueError(
            f"Purchase Order {po.po_number} is "
            f"{po.status}. Only VALIDATED POs can be issued."
        )

    po.status = "ISSUED"
    po.supplier_confirmation_status = "PENDING"
    po.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(po)

    return po

def confirm_purchase_order(
    db: Session,
    purchase_order_id: UUID,
    confirmed_quantity: Decimal,
    confirmed_delivery_date: date,
    confirmation_reference: str | None = None,
    comments: str | None = None,
) -> PurchaseOrder:
    """
    Confirm an issued Purchase Order with the supplier.

    The supplier must confirm the full ordered quantity.
    Partial confirmation and rejection will be handled
    by separate workflow functions.
    """

    # ---------------------------------------------------------
    # Retrieve PO
    # ---------------------------------------------------------

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    # ---------------------------------------------------------
    # PO must be issued
    # ---------------------------------------------------------

    if po.status != "ISSUED":
        raise ValueError(
            f"Purchase Order {po.po_number} is "
            f"{po.status}. Only ISSUED POs can be confirmed."
        )

    # ---------------------------------------------------------
    # Supplier confirmation must still be pending
    # ---------------------------------------------------------

    if po.supplier_confirmation_status != "PENDING":
        raise ValueError(
            f"Purchase Order {po.po_number} has already been "
            f"processed with supplier confirmation status "
            f"{po.supplier_confirmation_status}."
        )

    # ---------------------------------------------------------
    # Retrieve PO items
    # ---------------------------------------------------------

    items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.purchase_order_id == po.id
        )
        .all()
    )

    if not items:
        raise ValueError(
            f"Purchase Order {po.po_number} has no line items."
        )

    # ---------------------------------------------------------
    # Calculate ordered quantity
    #
    # Current golden path assumes one material line.
    # We will extend this to line-level confirmation later.
    # ---------------------------------------------------------

    ordered_quantity = sum(
        (item.quantity for item in items),
        Decimal("0"),
    )

    # ---------------------------------------------------------
    # Validate confirmed quantity
    # ---------------------------------------------------------

    if confirmed_quantity <= 0:
        raise ValueError(
            "Confirmed quantity must be greater than zero."
        )

    if confirmed_quantity != ordered_quantity:
        raise ValueError(
            f"Confirmed quantity {confirmed_quantity} does not "
            f"match ordered quantity {ordered_quantity}. "
            "Use the partial confirmation workflow for "
            "quantities below the ordered quantity."
        )

    # ---------------------------------------------------------
    # Validate confirmation delivery date
    # ---------------------------------------------------------

    if confirmed_delivery_date is None:
        raise ValueError(
            "Supplier confirmed delivery date is required."
        )

    if confirmed_delivery_date > po.required_date:
        raise ValueError(
            f"Supplier confirmed delivery date "
            f"{confirmed_delivery_date} exceeds the required "
            f"date {po.required_date}."
        )

    # ---------------------------------------------------------
    # Record supplier confirmation
    # ---------------------------------------------------------

    po.supplier_confirmation_status = "CONFIRMED"

    po.supplier_confirmation_reference = (
        confirmation_reference
    )

    po.supplier_confirmed_quantity = confirmed_quantity

    po.supplier_confirmed_delivery_date = (
        confirmed_delivery_date
    )

    po.supplier_confirmation_comments = comments

    po.supplier_confirmed_at = datetime.utcnow()

    po.updated_at = datetime.utcnow()

    # ---------------------------------------------------------
    # Commit
    # ---------------------------------------------------------

    db.commit()
    db.refresh(po)

    return po

def partially_confirm_purchase_order(
    db: Session,
    purchase_order_id: UUID,
    confirmed_quantity: Decimal,
    confirmed_delivery_date: date,
    confirmation_reference: str | None = None,
    comments: str | None = None,
) -> PurchaseOrder:
    """
    Record a supplier partial confirmation.

    The PO remains ISSUED, while the supplier confirmation
    status becomes PARTIALLY_CONFIRMED.
    """

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    if po.status != "ISSUED":
        raise ValueError(
            f"Purchase Order {po.po_number} is "
            f"{po.status}. Only ISSUED POs can be confirmed."
        )

    if po.supplier_confirmation_status != "PENDING":
        raise ValueError(
            f"Purchase Order {po.po_number} has already been "
            f"processed with supplier confirmation status "
            f"{po.supplier_confirmation_status}."
        )

    items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.purchase_order_id == po.id
        )
        .all()
    )

    if not items:
        raise ValueError(
            f"Purchase Order {po.po_number} has no line items."
        )

    ordered_quantity = sum(
        (item.quantity for item in items),
        Decimal("0"),
    )

    if confirmed_quantity <= 0:
        raise ValueError(
            "Confirmed quantity must be greater than zero."
        )

    if confirmed_quantity >= ordered_quantity:
        raise ValueError(
            f"Partial confirmation quantity must be less than "
            f"ordered quantity {ordered_quantity}."
        )

    if confirmed_delivery_date > po.required_date:
        raise ValueError(
            f"Supplier confirmed delivery date "
            f"{confirmed_delivery_date} exceeds the required "
            f"date {po.required_date}."
        )

    po.supplier_confirmation_status = "PARTIALLY_CONFIRMED"

    po.supplier_confirmation_reference = (
        confirmation_reference
    )

    po.supplier_confirmed_quantity = confirmed_quantity

    po.supplier_confirmed_delivery_date = (
        confirmed_delivery_date
    )

    po.supplier_confirmation_comments = comments

    po.supplier_confirmed_at = datetime.utcnow()
    po.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(po)

    return po


def reject_purchase_order(
    db: Session,
    purchase_order_id: UUID,
    rejection_reason: str,
    confirmation_reference: str | None = None,
) -> PurchaseOrder:
    """
    Record supplier rejection of an issued Purchase Order.
    """

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    if po.status != "ISSUED":
        raise ValueError(
            f"Purchase Order {po.po_number} is "
            f"{po.status}. Only ISSUED POs can be rejected."
        )

    if po.supplier_confirmation_status != "PENDING":
        raise ValueError(
            f"Purchase Order {po.po_number} has already been "
            f"processed with supplier confirmation status "
            f"{po.supplier_confirmation_status}."
        )

    if not rejection_reason or not rejection_reason.strip():
        raise ValueError(
            "Supplier rejection reason is required."
        )

    po.supplier_confirmation_status = "REJECTED"

    po.supplier_confirmation_reference = (
        confirmation_reference
    )

    po.supplier_confirmation_comments = (
        rejection_reason.strip()
    )

    po.supplier_confirmed_quantity = Decimal("0")

    po.supplier_confirmed_delivery_date = None

    po.supplier_confirmed_at = datetime.utcnow()
    po.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(po)

    return po