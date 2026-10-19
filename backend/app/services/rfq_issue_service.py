from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem
from app.models.rfq_supplier import RFQSupplier


def issue_rfq(
    db: Session,
    rfq_id: UUID,
) -> RFQ:

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
    # 2. Validate current status
    # ---------------------------------------------------------

    if rfq.status != "DRAFT":
        raise ValueError(
            f"RFQ {rfq.rfq_number} cannot be issued "
            f"because its current status is {rfq.status}."
        )

    # ---------------------------------------------------------
    # 3. Validate RFQ has items
    # ---------------------------------------------------------

    items = db.scalars(
        select(RFQItem).where(
            RFQItem.rfq_id == rfq.id
        )
    ).all()

    if not items:
        raise ValueError(
            f"RFQ {rfq.rfq_number} has no items."
        )

    # ---------------------------------------------------------
    # 4. Validate RFQ has suppliers
    # ---------------------------------------------------------

    suppliers = db.scalars(
        select(RFQSupplier).where(
            RFQSupplier.rfq_id == rfq.id
        )
    ).all()

    if not suppliers:
        raise ValueError(
            f"RFQ {rfq.rfq_number} has no supplier invitations."
        )

    # ---------------------------------------------------------
    # 5. Issue RFQ
    # ---------------------------------------------------------

    rfq.status = "ISSUED"
    rfq.issue_date = datetime.now(timezone.utc).date()
    rfq.updated_at = datetime.now(timezone.utc)

    for invitation in suppliers:
        invitation.invitation_status = "INVITED"

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(rfq)

    return rfq