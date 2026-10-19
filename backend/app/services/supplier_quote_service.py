from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem
from app.models.rfq_supplier import RFQSupplier
from app.models.supplier_quote import SupplierQuote
from app.models.supplier_quote_item import SupplierQuoteItem


def generate_quote_number(
    db: Session,
    supplier_id: UUID,
) -> str:
    """
    Generate a unique internal quote reference.

    This is our application's reference for the supplier quotation.
    The actual supplier-provided quote number is stored separately.
    """

    today = date.today().strftime("%Y%m%d")

    prefix = f"QT-{today}-"

    existing_quotes = db.scalars(
        select(SupplierQuote.quote_number).where(
            SupplierQuote.quote_number.like(f"{prefix}%")
        )
    ).all()

    next_number = len(existing_quotes) + 1

    return f"{prefix}{next_number:04d}"


def submit_supplier_quote(
    db: Session,
    rfq_id: UUID,
    supplier_id: UUID,
    rfq_item_id: UUID,
    quantity,
    unit_price,
    lead_time_days: int,
    technical_compliance: bool,
    quality_compliance: bool,
    payment_terms: str,
    incoterm: str,
    freight_cost=0,
    insurance_cost=0,
    tax_cost=0,
    supplier_quote_reference: str | None = None,
    quote_valid_until: date | None = None,
    remarks: str | None = None,
) -> SupplierQuote:

    # ---------------------------------------------------------
    # 1. Find RFQ
    # ---------------------------------------------------------

    rfq = db.scalar(
        select(RFQ).where(
            RFQ.id == rfq_id
        )
    )

    if not rfq:
        raise ValueError(
            f"RFQ not found: {rfq_id}"
        )

    # ---------------------------------------------------------
    # 2. RFQ must be issued
    # ---------------------------------------------------------

    if rfq.status != "ISSUED":
        raise ValueError(
            f"Supplier quotes can only be submitted against "
            f"an ISSUED RFQ. Current status: {rfq.status}"
        )

    # ---------------------------------------------------------
    # 3. Verify supplier was invited
    # ---------------------------------------------------------

    invitation = db.scalar(
        select(RFQSupplier).where(
            RFQSupplier.rfq_id == rfq_id,
            RFQSupplier.supplier_id == supplier_id,
        )
    )

    if not invitation:
        raise ValueError(
            "Supplier is not invited to this RFQ."
        )

    # ---------------------------------------------------------
    # 4. Find RFQ item
    # ---------------------------------------------------------

    rfq_item = db.scalar(
        select(RFQItem).where(
            RFQItem.id == rfq_item_id,
            RFQItem.rfq_id == rfq_id,
        )
    )

    if not rfq_item:
        raise ValueError(
            f"RFQ item not found: {rfq_item_id}"
        )

    # ---------------------------------------------------------
    # 5. Validate quantity
    # ---------------------------------------------------------

    if quantity <= 0:
        raise ValueError(
            "Quoted quantity must be greater than zero."
        )

    # ---------------------------------------------------------
    # 6. Prevent duplicate supplier quote
    # ---------------------------------------------------------

    existing_quote = db.scalar(
        select(SupplierQuote).where(
            SupplierQuote.rfq_id == rfq_id,
            SupplierQuote.supplier_id == supplier_id,
        )
    )

    if existing_quote:
        raise ValueError(
            f"Supplier has already submitted a quote for "
            f"this RFQ: {existing_quote.quote_number}"
        )

    # ---------------------------------------------------------
    # 7. Calculate total quote value
    # ---------------------------------------------------------

    material_value = quantity * unit_price

    total_quote_value = (
        material_value
        + freight_cost
        + insurance_cost
        + tax_cost
    )

    # ---------------------------------------------------------
    # 8. Create supplier quote
    # ---------------------------------------------------------

    quote = SupplierQuote(
        rfq_id=rfq_id,
        supplier_id=supplier_id,
        quote_number=generate_quote_number(
            db=db,
            supplier_id=supplier_id,
        ),
        status="RECEIVED",
        quote_date=date.today(),
        valid_until=quote_valid_until,
        currency_code=rfq.currency_code,
        payment_terms=payment_terms,
        incoterm=incoterm,
        delivery_days=lead_time_days,
        freight_cost=freight_cost,
        insurance_cost=insurance_cost,
        tax_cost=tax_cost,
        total_quote_value=total_quote_value,
        notes=remarks,
        created_at=datetime.now(timezone.utc),
    )

    db.add(quote)
    db.flush()

    # ---------------------------------------------------------
    # 9. Create quote line item
    # ---------------------------------------------------------

    quote_item = SupplierQuoteItem(
        supplier_quote_id=quote.id,
        rfq_item_id=rfq_item.id,
        quantity=quantity,
        unit_price=unit_price,
        lead_time_days=lead_time_days,
        technical_compliance=technical_compliance,
        quality_compliance=quality_compliance,
        remarks=remarks,
    )

    db.add(quote_item)

    # ---------------------------------------------------------
    # 10. Update invitation
    # ---------------------------------------------------------

    invitation.invitation_status = "RESPONDED"
    invitation.responded_at = datetime.now(timezone.utc)

    # ---------------------------------------------------------
    # 11. Commit transaction
    # ---------------------------------------------------------

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(quote)

    return quote