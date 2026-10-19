from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.purchase_order import (
    PurchaseOrder,
    PurchaseOrderItem,
)

from app.models.purchase_requisition import (
    PurchaseRequisition,
    PurchaseRequisitionItem,
)

from app.models.supplier_quote import (
    SupplierQuote,
)

from app.models.supplier_quote_item import (
    SupplierQuoteItem,
)


# =========================================================
# PO NUMBER GENERATION
# =========================================================

def generate_po_number(db: Session) -> str:
    """
    Generate a unique Purchase Order number.

    Format:
        PO-YYYYMMDD-0001
    """

    today = date.today().strftime("%Y%m%d")
    prefix = f"PO-{today}-"

    latest = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.po_number.like(
                f"{prefix}%"
            )
        )
        .order_by(
            PurchaseOrder.po_number.desc()
        )
        .first()
    )

    if latest:
        try:
            last_sequence = int(
                latest.po_number.split("-")[-1]
            )
        except (ValueError, IndexError):
            last_sequence = 0

        next_sequence = last_sequence + 1

    else:
        next_sequence = 1

    return (
        f"{prefix}"
        f"{next_sequence:04d}"
    )


# =========================================================
# CREATE DRAFT PO FROM APPROVED PR
# =========================================================

def create_draft_purchase_order(
    db: Session,
    purchase_requisition_id: UUID,
) -> PurchaseOrder:
    """
    Create a DRAFT Purchase Order from an APPROVED
    Purchase Requisition.

    Lineage:

        Procurement Request
            ↓
        RFQ
            ↓
        Supplier Quote
            ↓
        Approved Sourcing Decision
            ↓
        Purchase Requisition
            ↓
        Purchase Order

    Important:
    - PR must be APPROVED
    - Supplier must match
    - Quote must match
    - Quote items must match PR/RFQ items
    - Technical and quality compliance must be valid
    - Commercial total must reconcile
    - created_by must be populated
    - PO item must retain purchase_requisition_item_id
    """

    # -----------------------------------------------------
    # 1. Retrieve PR
    # -----------------------------------------------------

    pr = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.id
            == purchase_requisition_id
        )
        .first()
    )

    if pr is None:
        raise ValueError(
            f"Purchase Requisition "
            f"{purchase_requisition_id} was not found."
        )

    # -----------------------------------------------------
    # 2. PR must be approved
    # -----------------------------------------------------

    if pr.status != "APPROVED":
        raise ValueError(
            f"Purchase Requisition {pr.pr_number} "
            f"is {pr.status}. "
            "Only APPROVED PRs can create a Purchase Order."
        )

    # -----------------------------------------------------
    # 3. Prevent duplicate PO
    # -----------------------------------------------------

    existing_po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.purchase_requisition_id
            == pr.id
        )
        .first()
    )

    if existing_po is not None:
        raise ValueError(
            f"Purchase Order {existing_po.po_number} "
            f"already exists for Purchase Requisition "
            f"{pr.pr_number}."
        )

    # -----------------------------------------------------
    # 4. Retrieve approved supplier quote
    # -----------------------------------------------------

    quote = (
        db.query(SupplierQuote)
        .filter(
            SupplierQuote.id
            == pr.quote_id
        )
        .first()
    )

    if quote is None:
        raise ValueError(
            f"Supplier Quote {pr.quote_id} "
            "was not found."
        )

    # -----------------------------------------------------
    # 5. Supplier lineage validation
    # -----------------------------------------------------

    if quote.supplier_id != pr.supplier_id:
        raise ValueError(
            "Supplier on the quote does not match "
            "the supplier on the approved PR."
        )

    # -----------------------------------------------------
    # 6. Retrieve PR items
    # -----------------------------------------------------

    pr_items = (
        db.query(PurchaseRequisitionItem)
        .filter(
            PurchaseRequisitionItem
            .purchase_requisition_id
            == pr.id
        )
        .all()
    )

    if not pr_items:
        raise ValueError(
            f"Purchase Requisition {pr.pr_number} "
            "has no line items."
        )

    # -----------------------------------------------------
    # 7. Create PR-item lookup by RFQ item
    #
    # This is the critical lineage mapping:
    #
    # RFQ Item
    #      ↓
    # PR Item
    # -----------------------------------------------------

    pr_items_by_rfq_item = {
        item.rfq_item_id: item
        for item in pr_items
    }

    # -----------------------------------------------------
    # 8. Retrieve quote items
    # -----------------------------------------------------

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
            f"Supplier Quote {quote.quote_number} "
            "has no line items."
        )

    # -----------------------------------------------------
    # 9. Quote item lookup
    # -----------------------------------------------------

    quote_items_by_rfq_item = {
        item.rfq_item_id: item
        for item in quote_items
    }

    # -----------------------------------------------------
    # 10. Validate every PR item has a quote item
    # -----------------------------------------------------

    for pr_item in pr_items:

        if pr_item.rfq_item_id not in (
            quote_items_by_rfq_item
        ):
            raise ValueError(
                f"PR item {pr_item.id} "
                f"does not have a matching supplier quote "
                f"item for RFQ item "
                f"{pr_item.rfq_item_id}."
            )

    # -----------------------------------------------------
    # 11. Validate quote items
    # -----------------------------------------------------

    for quote_item in quote_items:

        if quote_item.quantity <= 0:
            raise ValueError(
                f"Quote item {quote_item.id} "
                "has invalid quantity."
            )

        if quote_item.unit_price < 0:
            raise ValueError(
                f"Quote item {quote_item.id} "
                "has invalid unit price."
            )

        if not quote_item.technical_compliance:
            raise ValueError(
                f"Quote item {quote_item.id} "
                "failed technical compliance."
            )

        if not quote_item.quality_compliance:
            raise ValueError(
                f"Quote item {quote_item.id} "
                "failed quality compliance."
            )

    # -----------------------------------------------------
    # 12. Calculate material value
    # -----------------------------------------------------

    material_value = sum(
        (
            item.quantity
            * item.unit_price
        )
        for item in quote_items
    )

    freight = (
        quote.freight_cost
        or Decimal("0")
    )

    insurance = (
        quote.insurance_cost
        or Decimal("0")
    )

    tax = (
        quote.tax_cost
        or Decimal("0")
    )

    calculated_total = (
        material_value
        + freight
        + insurance
        + tax
    )

    # -----------------------------------------------------
    # 13. Reconcile quote total
    # -----------------------------------------------------

    if (
        calculated_total
        != quote.total_quote_value
    ):
        raise ValueError(
            "Calculated quote total does not match "
            "the stored supplier quote total."
        )

    # -----------------------------------------------------
    # 14. Reconcile PR total
    # -----------------------------------------------------

    if (
        pr.total_amount
        != calculated_total
    ):
        raise ValueError(
            "Approved PR total does not match "
            "the approved supplier quote total."
        )

    # -----------------------------------------------------
    # 15. Determine expected delivery date
    # -----------------------------------------------------

    if quote.delivery_days is not None:

        expected_delivery_date = (
            date.today()
            + timedelta(
                days=quote.delivery_days
            )
        )

    else:

        expected_delivery_date = None

    # -----------------------------------------------------
    # 16. Create PO header
    # -----------------------------------------------------

    po = PurchaseOrder(
        po_number=generate_po_number(db),

        purchase_requisition_id=pr.id,

        supplier_id=pr.supplier_id,

        status="DRAFT",

        order_date=date.today(),

        required_date=pr.required_date,

        currency_code=quote.currency_code,

        payment_terms=quote.payment_terms,

        incoterm=quote.incoterm,

        freight_cost=freight,

        insurance_cost=insurance,

        tax_cost=tax,

        total_amount=calculated_total,

        expected_delivery_date=(
            expected_delivery_date
        ),

        supplier_confirmation_status="PENDING",

        supplier_confirmation_reference=None,

        supplier_confirmed_quantity=None,

        supplier_confirmed_delivery_date=None,

        supplier_confirmation_comments=None,

        supplier_confirmed_at=None,

        notes=(
            f"Generated from approved "
            f"Purchase Requisition "
            f"{pr.pr_number}."
        ),

        # -------------------------------------------------
        # IMPORTANT AUDIT FIELD
        # -------------------------------------------------

        created_by=pr.requested_by,
    )

    db.add(po)

    # Flush so PO ID is generated before creating items
    db.flush()

    # -----------------------------------------------------
    # 17. Create PO line items
    # -----------------------------------------------------

    for quote_item in quote_items:

        # -------------------------------------------------
        # Find the corresponding PR line
        # -------------------------------------------------

        pr_item = pr_items_by_rfq_item.get(
            quote_item.rfq_item_id
        )

        if pr_item is None:
            raise ValueError(
                f"No Purchase Requisition Item "
                f"was found for RFQ item "
                f"{quote_item.rfq_item_id}."
            )

        # -------------------------------------------------
        # Quantity validation
        # -------------------------------------------------

        if quote_item.quantity <= 0:
            raise ValueError(
                f"Quote item {quote_item.id} "
                "has invalid quantity."
            )

        # -------------------------------------------------
        # Create PO item
        # -------------------------------------------------

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,

            # IMPORTANT:
            # Preserve PR → PO lineage
            purchase_requisition_item_id=(
                pr_item.id
            ),

            material_id=pr_item.material_id,

            quantity=quote_item.quantity,

            uom=pr_item.uom,

            unit_price=quote_item.unit_price,

            line_total=(
                quote_item.quantity
                * quote_item.unit_price
            ),

            technical_specification=(
                pr_item.technical_specification
            ),

            expected_delivery_date=(
                expected_delivery_date
            ),
        )

        db.add(po_item)

    # -----------------------------------------------------
    # 18. Commit
    # -----------------------------------------------------

    try:

        db.commit()

    except SQLAlchemyError:

        db.rollback()

        raise

    # -----------------------------------------------------
    # 19. Refresh
    # -----------------------------------------------------

    db.refresh(po)

    return po


# =========================================================
# VALIDATE PURCHASE ORDER
# =========================================================

def validate_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    """
    Validate a DRAFT Purchase Order before issuance.
    """

    # -----------------------------------------------------
    # 1. Retrieve PO
    # -----------------------------------------------------

    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id
            == purchase_order_id
        )
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order "
            f"{purchase_order_id} was not found."
        )

    # -----------------------------------------------------
    # 2. PO must be DRAFT
    # -----------------------------------------------------

    if po.status != "DRAFT":
        raise ValueError(
            f"Purchase Order {po.po_number} "
            f"is {po.status}. "
            "Only DRAFT POs can be validated."
        )

    # -----------------------------------------------------
    # 3. Retrieve source PR
    # -----------------------------------------------------

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
            f"{po.purchase_requisition_id} "
            "was not found."
        )

    # -----------------------------------------------------
    # 4. PR must remain approved
    # -----------------------------------------------------

    if pr.status != "APPROVED":
        raise ValueError(
            f"Source PR {pr.pr_number} "
            f"is {pr.status}. "
            "PO cannot be validated."
        )

    # -----------------------------------------------------
    # 5. Supplier validation
    # -----------------------------------------------------

    if po.supplier_id != pr.supplier_id:
        raise ValueError(
            "PO supplier does not match "
            "the approved PR supplier."
        )

    # -----------------------------------------------------
    # 6. Created-by audit validation
    # -----------------------------------------------------

    if not po.created_by:
        raise ValueError(
            "PO creator is missing."
        )

    # -----------------------------------------------------
    # 7. Commercial fields
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # 8. Required dates
    # -----------------------------------------------------

    if po.required_date < po.order_date:
        raise ValueError(
            "PO required date cannot be before "
            "the PO order date."
        )

    if (
        po.expected_delivery_date is not None
        and po.expected_delivery_date
        > po.required_date
    ):
        raise ValueError(
            "Expected delivery date exceeds "
            "the required date."
        )

    # -----------------------------------------------------
    # 9. Retrieve PO items
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # 10. Validate PO lines
    # -----------------------------------------------------

    calculated_material_total = Decimal("0")

    for item in items:

        # ---------------------------------------------
        # PR lineage must exist
        # ---------------------------------------------

        if not item.purchase_requisition_item_id:
            raise ValueError(
                f"PO item {item.id} "
                "is missing its Purchase Requisition "
                "line-item reference."
            )

        # ---------------------------------------------
        # Quantity
        # ---------------------------------------------

        if item.quantity <= 0:
            raise ValueError(
                f"PO item {item.id} "
                "has invalid quantity."
            )

        # ---------------------------------------------
        # Unit price
        # ---------------------------------------------

        if item.unit_price < 0:
            raise ValueError(
                f"PO item {item.id} "
                "has invalid unit price."
            )

        # ---------------------------------------------
        # Line total
        # ---------------------------------------------

        calculated_line_total = (
            item.quantity
            * item.unit_price
        )

        if (
            calculated_line_total
            != item.line_total
        ):
            raise ValueError(
                f"PO item {item.id} "
                "line total does not reconcile."
            )

        calculated_material_total += (
            calculated_line_total
        )

    # -----------------------------------------------------
    # 11. Validate commercial total
    # -----------------------------------------------------

    calculated_total = (
        calculated_material_total
        + (
            po.freight_cost
            or Decimal("0")
        )
        + (
            po.insurance_cost
            or Decimal("0")
        )
        + (
            po.tax_cost
            or Decimal("0")
        )
    )

    if calculated_total != po.total_amount:
        raise ValueError(
            "PO total does not reconcile with "
            "its line items and commercial costs."
        )

    # -----------------------------------------------------
    # 12. Validate against approved PR
    # -----------------------------------------------------

    if po.total_amount != pr.total_amount:
        raise ValueError(
            "PO total does not match "
            "the approved PR total."
        )

    # -----------------------------------------------------
    # 13. Supplier confirmation
    # -----------------------------------------------------

    if (
        po.supplier_confirmation_status
        != "PENDING"
    ):
        raise ValueError(
            "PO supplier confirmation status is "
            f"{po.supplier_confirmation_status}."
        )

    # -----------------------------------------------------
    # 14. Validation successful
    # -----------------------------------------------------

    po.status = "VALIDATED"

    po.updated_at = datetime.utcnow()

    try:

        db.commit()

    except SQLAlchemyError:

        db.rollback()

        raise

    db.refresh(po)

    return po


# =========================================================
# ENRICH DRAFT PURCHASE ORDER
# =========================================================

def enrich_draft_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    """
    Synchronize commercial and delivery terms on a
    DRAFT PO from its approved supplier quote.

    Only DRAFT POs can be enriched.
    """

    # -----------------------------------------------------
    # 1. Retrieve PO
    # -----------------------------------------------------

    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id
            == purchase_order_id
        )
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order "
            f"{purchase_order_id} was not found."
        )

    # -----------------------------------------------------
    # 2. Must be DRAFT
    # -----------------------------------------------------

    if po.status != "DRAFT":
        raise ValueError(
            f"Purchase Order {po.po_number} "
            f"is {po.status}. "
            "Only DRAFT POs can be enriched."
        )

    # -----------------------------------------------------
    # 3. Retrieve PR
    # -----------------------------------------------------

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
            f"{po.purchase_requisition_id} "
            "was not found."
        )

    # -----------------------------------------------------
    # 4. PR must remain approved
    # -----------------------------------------------------

    if pr.status != "APPROVED":
        raise ValueError(
            f"Source PR {pr.pr_number} "
            f"is {pr.status}. "
            "Only approved PRs can be enriched."
        )

    # -----------------------------------------------------
    # 5. Retrieve quote
    # -----------------------------------------------------

    quote = (
        db.query(SupplierQuote)
        .filter(
            SupplierQuote.id
            == pr.quote_id
        )
        .first()
    )

    if quote is None:
        raise ValueError(
            f"Supplier quote {pr.quote_id} "
            "was not found."
        )

    # -----------------------------------------------------
    # 6. Validate supplier lineage
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # 7. Copy approved commercial terms
    # -----------------------------------------------------

    po.currency_code = (
        quote.currency_code
    )

    po.payment_terms = (
        quote.payment_terms
    )

    po.incoterm = (
        quote.incoterm
    )

    po.freight_cost = (
        quote.freight_cost
        or Decimal("0")
    )

    po.insurance_cost = (
        quote.insurance_cost
        or Decimal("0")
    )

    po.tax_cost = (
        quote.tax_cost
        or Decimal("0")
    )

    # -----------------------------------------------------
    # 8. Calculate expected delivery
    # -----------------------------------------------------

    if quote.delivery_days is not None:

        po.expected_delivery_date = (
            po.order_date
            + timedelta(
                days=quote.delivery_days
            )
        )

    else:

        po.expected_delivery_date = None

    # -----------------------------------------------------
    # 9. Update PO item delivery dates
    # -----------------------------------------------------

    po_items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.purchase_order_id
            == po.id
        )
        .all()
    )

    for item in po_items:

        item.expected_delivery_date = (
            po.expected_delivery_date
        )

    # -----------------------------------------------------
    # 10. Update timestamp
    # -----------------------------------------------------

    po.updated_at = datetime.utcnow()

    try:

        db.commit()

    except SQLAlchemyError:

        db.rollback()

        raise

    db.refresh(po)

    return po


# =========================================================
# ISSUE PURCHASE ORDER
# =========================================================

def issue_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    """
    Issue a VALIDATED Purchase Order to the supplier.

    A PO cannot be issued directly from DRAFT.
    """

    # -----------------------------------------------------
    # 1. Retrieve PO
    # -----------------------------------------------------

    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id
            == purchase_order_id
        )
        .first()
    )

    if po is None:
        raise ValueError(
            f"Purchase Order "
            f"{purchase_order_id} was not found."
        )

    # -----------------------------------------------------
    # 2. PO must be VALIDATED
    # -----------------------------------------------------

    if po.status != "VALIDATED":
        raise ValueError(
            f"Purchase Order {po.po_number} "
            f"is {po.status}. "
            "Only VALIDATED POs can be issued."
        )

    # -----------------------------------------------------
    # 3. Retrieve source PR
    # -----------------------------------------------------

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
            f"{po.purchase_requisition_id} "
            "was not found."
        )

    # -----------------------------------------------------
    # 4. PR must remain approved
    # -----------------------------------------------------

    if pr.status != "APPROVED":
        raise ValueError(
            f"Source PR {pr.pr_number} "
            f"is {pr.status}. "
            "PO cannot be issued."
        )

    # -----------------------------------------------------
    # 5. Supplier lineage
    # -----------------------------------------------------

    if po.supplier_id != pr.supplier_id:
        raise ValueError(
            "PO supplier does not match "
            "the approved PR supplier."
        )

    # -----------------------------------------------------
    # 6. Supplier confirmation starts as pending
    # -----------------------------------------------------

    po.status = "ISSUED"

    po.supplier_confirmation_status = (
        "PENDING"
    )

    po.updated_at = datetime.utcnow()

    try:

        db.commit()

    except SQLAlchemyError:

        db.rollback()

        raise

    db.refresh(po)

    return po

# ============================================================
# SUPPLIER CONFIRMATION
# ============================================================

def process_supplier_confirmation(
    db: Session,
    purchase_order_id: UUID,
    action: str,
    confirmed_quantity: Decimal | None = None,
    confirmed_delivery_date: date | None = None,
    confirmation_reference: str | None = None,
    comments: str | None = None,
):
    """
    Process supplier confirmation for an ISSUED Purchase Order.

    Supported actions:
        CONFIRM
        REVISE_DELIVERY
        PARTIAL_CONFIRM
        REJECT
    """

    po = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if po is None:
        raise ValueError("Purchase Order not found.")

    # --------------------------------------------------------
    # PO lifecycle validation
    # --------------------------------------------------------

    if po.status != "ISSUED":
        raise ValueError(
            f"Supplier confirmation is only allowed for ISSUED "
            f"Purchase Orders. Current status: {po.status}."
        )

    if po.supplier_confirmation_status != "PENDING":
        raise ValueError(
            "Supplier confirmation has already been processed "
            f"with status: {po.supplier_confirmation_status}."
        )

    # --------------------------------------------------------
    # Normalize action
    # --------------------------------------------------------

    action = action.strip().upper()

    allowed_actions = {
        "CONFIRM",
        "REVISE_DELIVERY",
        "PARTIAL_CONFIRM",
        "REJECT",
    }

    if action not in allowed_actions:
        raise ValueError(
            "Invalid supplier confirmation action. "
            "Allowed actions: CONFIRM, REVISE_DELIVERY, "
            "PARTIAL_CONFIRM, REJECT."
        )

    # --------------------------------------------------------
    # Get total ordered quantity
    # --------------------------------------------------------

    po_items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.purchase_order_id == po.id
        )
        .all()
    )

    if not po_items:
        raise ValueError(
            "Purchase Order has no line items."
        )

    ordered_quantity = sum(
        (item.quantity for item in po_items),
        Decimal("0"),
    )

    # --------------------------------------------------------
    # Common validation
    # --------------------------------------------------------

    if confirmed_quantity is not None:
        confirmed_quantity = Decimal(str(confirmed_quantity))

        if confirmed_quantity <= Decimal("0"):
            raise ValueError(
                "Confirmed quantity must be greater than zero."
            )

        if confirmed_quantity > ordered_quantity:
            raise ValueError(
                "Confirmed quantity cannot exceed the "
                "ordered quantity."
            )

    if confirmed_delivery_date is not None:
        if confirmed_delivery_date < po.order_date:
            raise ValueError(
                "Confirmed delivery date cannot be earlier "
                "than the PO order date."
            )

    # --------------------------------------------------------
    # CONFIRM
    # --------------------------------------------------------

    if action == "CONFIRM":

        if confirmed_quantity is None:
            confirmed_quantity = ordered_quantity

        if confirmed_quantity != ordered_quantity:
            raise ValueError(
                "CONFIRM requires the full ordered quantity. "
                "Use PARTIAL_CONFIRM for a lower quantity."
            )

        if confirmed_delivery_date is None:
            confirmed_delivery_date = po.expected_delivery_date

        if confirmed_delivery_date is None:
            raise ValueError(
                "Confirmed delivery date is required."
            )

        po.supplier_confirmation_status = "CONFIRMED"

    # --------------------------------------------------------
    # REVISE DELIVERY
    # --------------------------------------------------------

    elif action == "REVISE_DELIVERY":

        if confirmed_delivery_date is None:
            raise ValueError(
                "A revised delivery date is required."
            )

        if confirmed_quantity is None:
            confirmed_quantity = ordered_quantity

        if confirmed_quantity != ordered_quantity:
            raise ValueError(
                "REVISE_DELIVERY is for delivery-date changes "
                "with the full ordered quantity."
            )

        po.supplier_confirmation_status = "REVISED_DELIVERY"

    # --------------------------------------------------------
    # PARTIAL CONFIRM
    # --------------------------------------------------------

    elif action == "PARTIAL_CONFIRM":

        if confirmed_quantity is None:
            raise ValueError(
                "Confirmed quantity is required for "
                "PARTIAL_CONFIRM."
            )

        if confirmed_quantity >= ordered_quantity:
            raise ValueError(
                "PARTIAL_CONFIRM requires confirmed quantity "
                "to be less than the ordered quantity."
            )

        if confirmed_delivery_date is None:
            raise ValueError(
                "Confirmed delivery date is required for "
                "partial confirmation."
            )

        po.supplier_confirmation_status = "PARTIAL"

    # --------------------------------------------------------
    # REJECT
    # --------------------------------------------------------

    elif action == "REJECT":

        if not comments or not comments.strip():
            raise ValueError(
                "Comments are required when rejecting a "
                "Purchase Order."
            )

        po.supplier_confirmation_status = "REJECTED"

        confirmed_quantity = Decimal("0")
        confirmed_delivery_date = None

    # --------------------------------------------------------
    # Persist supplier response
    # --------------------------------------------------------

    po.supplier_confirmation_reference = (
        confirmation_reference
    )

    po.supplier_confirmed_quantity = confirmed_quantity

    po.supplier_confirmed_delivery_date = (
        confirmed_delivery_date
    )

    po.supplier_confirmation_comments = (
        comments.strip()
        if comments
        else None
    )

    po.supplier_confirmed_at = datetime.utcnow()

    db.commit()
    db.refresh(po)

    return po