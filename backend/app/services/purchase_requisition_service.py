from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.approval import Approval
from app.models.procurement_request import ProcurementRequest
from app.models.purchase_requisition import (
    PurchaseRequisition,
    PurchaseRequisitionItem,
)

from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem
from app.models.supplier_quote import SupplierQuote
from app.models.supplier_quote_item import SupplierQuoteItem


def generate_pr_number(db: Session) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"PR-{today}-"

    latest = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.pr_number.like(f"{prefix}%")
        )
        .order_by(PurchaseRequisition.pr_number.desc())
        .first()
    )

    if latest:
        last_sequence = int(
            latest.pr_number.split("-")[-1]
        )
        next_sequence = last_sequence + 1
    else:
        next_sequence = 1

    return f"{prefix}{next_sequence:04d}"


def create_purchase_requisition(
    db: Session,
    approval_id: UUID,
    requested_by: str,
) -> PurchaseRequisition:
    """
    Generate a Purchase Requisition from an APPROVED
    sourcing decision.

    Critical guardrails:
    - Approval must exist.
    - Approval must be APPROVED.
    - RFQ must match approval.
    - Quote must match approval.
    - Supplier must match approval.
    - Quote items must be technically and
      quality compliant.
    - Quote totals must reconcile.
    - Duplicate PRs are blocked.
    """

    # ---------------------------------------------------------
    # 1. Retrieve approval
    # ---------------------------------------------------------
    approval = (
        db.query(Approval)
        .filter(Approval.id == approval_id)
        .first()
    )

    if approval is None:
        raise ValueError(
            f"Approval {approval_id} was not found."
        )

    # ---------------------------------------------------------
    # 2. Approval must be APPROVED
    # ---------------------------------------------------------
    if approval.status != "APPROVED":
        raise ValueError(
            f"Approval {approval.approval_number} is "
            f"{approval.status}. Only APPROVED approvals "
            f"can generate a Purchase Requisition."
        )

    # ---------------------------------------------------------
    # 3. Retrieve RFQ
    # ---------------------------------------------------------
    rfq = (
        db.query(RFQ)
        .filter(RFQ.id == approval.rfq_id)
        .first()
    )

    if rfq is None:
        raise ValueError(
            f"RFQ {approval.rfq_id} was not found."
        )

    # ---------------------------------------------------------
    # 4. Retrieve procurement request
    # ---------------------------------------------------------
    procurement_request = (
        db.query(ProcurementRequest)
        .filter(
            ProcurementRequest.id
            == rfq.procurement_request_id
        )
        .first()
    )

    if procurement_request is None:
        raise ValueError(
            f"Procurement Request "
            f"{rfq.procurement_request_id} was not found."
        )

    # ---------------------------------------------------------
    # 5. Retrieve approved quote
    # ---------------------------------------------------------
    quote = (
        db.query(SupplierQuote)
        .filter(
            SupplierQuote.id == approval.quote_id
        )
        .first()
    )

    if quote is None:
        raise ValueError(
            f"Supplier quote {approval.quote_id} "
            "was not found."
        )

    # ---------------------------------------------------------
    # 6. Quote must belong to RFQ
    # ---------------------------------------------------------
    if quote.rfq_id != rfq.id:
        raise ValueError(
            "Approved quote does not belong to "
            "the approved RFQ."
        )

    # ---------------------------------------------------------
    # 7. Supplier must match approval
    # ---------------------------------------------------------
    if quote.supplier_id != approval.supplier_id:
        raise ValueError(
            "Supplier on the approved quote does not "
            "match the supplier recorded on the approval."
        )

    # ---------------------------------------------------------
    # 8. Prevent duplicate PR
    # ---------------------------------------------------------
    existing_pr = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.approval_id
            == approval.id
        )
        .first()
    )

    if existing_pr:
        raise ValueError(
            f"Purchase Requisition "
            f"{existing_pr.pr_number} already exists "
            f"for approval "
            f"{approval.approval_number}."
        )

    # ---------------------------------------------------------
    # 9. Retrieve RFQ items
    # ---------------------------------------------------------
    rfq_items = (
        db.query(RFQItem)
        .filter(RFQItem.rfq_id == rfq.id)
        .all()
    )

    if not rfq_items:
        raise ValueError(
            f"RFQ {rfq.rfq_number} has no items."
        )

    # ---------------------------------------------------------
    # 10. Retrieve quote items
    # ---------------------------------------------------------
    quote_items = (
        db.query(SupplierQuoteItem)
        .filter(
            SupplierQuoteItem.supplier_quote_id
            == quote.id
        )
        .all()
    )

    if not quote_items:
        raise ValueError(
            f"Supplier quote {quote.quote_number} "
            "has no items."
        )

    quote_items_by_rfq_item = {
        item.rfq_item_id: item
        for item in quote_items
    }

    # ---------------------------------------------------------
    # 11. Validate RFQ ↔ quote item mapping
    # ---------------------------------------------------------
    for rfq_item in rfq_items:

        if rfq_item.id not in quote_items_by_rfq_item:
            raise ValueError(
                f"RFQ item {rfq_item.id} does not have "
                "a corresponding supplier quote item."
            )

    # ---------------------------------------------------------
    # 12. Validate quote items
    # ---------------------------------------------------------
    for quote_item in quote_items:

        if quote_item.quantity <= 0:
            raise ValueError(
                f"Quote item {quote_item.id} has "
                "invalid quantity."
            )

        if quote_item.unit_price < 0:
            raise ValueError(
                f"Quote item {quote_item.id} has "
                "invalid unit price."
            )

        if not quote_item.technical_compliance:
            raise ValueError(
                f"Quote item {quote_item.id} failed "
                "technical compliance."
            )

        if not quote_item.quality_compliance:
            raise ValueError(
                f"Quote item {quote_item.id} failed "
                "quality compliance."
            )

    # ---------------------------------------------------------
    # 13. Calculate material value
    # ---------------------------------------------------------
    material_value = sum(
        item.quantity * item.unit_price
        for item in quote_items
    )

    freight = quote.freight_cost or 0
    insurance = quote.insurance_cost or 0
    tax = quote.tax_cost or 0

    calculated_total = (
        material_value
        + freight
        + insurance
        + tax
    )

    # ---------------------------------------------------------
    # 14. Reconcile quote total
    # ---------------------------------------------------------
    if calculated_total != quote.total_quote_value:
        raise ValueError(
            "Calculated quote total does not match "
            "the stored supplier quote total."
        )

    # ---------------------------------------------------------
    # 15. Create PR header
    # ---------------------------------------------------------
    pr = PurchaseRequisition(
        pr_number=generate_pr_number(db),
        procurement_request_id=(
            procurement_request.id
        ),
        rfq_id=rfq.id,
        quote_id=quote.id,
        approval_id=approval.id,
        supplier_id=quote.supplier_id,
        status="DRAFT",

        # IMPORTANT:
        # This is the original project requirement date,
        # NOT the RFQ response deadline.
        required_date=procurement_request.required_date,

        currency_code=quote.currency_code,
        total_amount=calculated_total,
        requested_by=requested_by,
        notes=(
            f"Generated from approved sourcing decision "
            f"{approval.approval_number}."
        ),
    )

    db.add(pr)
    db.flush()

    # ---------------------------------------------------------
    # 16. Create PR line items
    # ---------------------------------------------------------
    for rfq_item in rfq_items:

        quote_item = quote_items_by_rfq_item[
            rfq_item.id
        ]

        pr_item = PurchaseRequisitionItem(
            purchase_requisition_id=pr.id,
            procurement_request_item_id=(
                rfq_item.procurement_request_item_id
            ),
            rfq_item_id=rfq_item.id,
            material_id=rfq_item.material_id,
            quantity=quote_item.quantity,
            uom=rfq_item.uom,
            unit_price=quote_item.unit_price,
            landed_cost=(
                quote_item.quantity
                * quote_item.unit_price
            ),
            technical_specification=(
                rfq_item.technical_specification
            ),
        )

        db.add(pr_item)

    # ---------------------------------------------------------
    # 17. Commit
    # ---------------------------------------------------------
    db.commit()
    db.refresh(pr)

    return pr