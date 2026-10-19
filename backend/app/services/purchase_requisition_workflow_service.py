from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.purchase_requisition import PurchaseRequisition
from app.schemas.purchase_requisition import (
    PurchaseRequisitionDecisionRequest,
)


def submit_purchase_requisition(
    db: Session,
    purchase_requisition_id: UUID,
) -> PurchaseRequisition:
    """
    Submit a draft PR for approval.
    """

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

    if pr.status != "DRAFT":
        raise ValueError(
            f"Purchase Requisition {pr.pr_number} is "
            f"{pr.status}. Only DRAFT PRs can be submitted."
        )

    pr.status = "SUBMITTED"
    pr.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(pr)

    return pr


def approve_purchase_requisition(
    db: Session,
    purchase_requisition_id: UUID,
    decision: PurchaseRequisitionDecisionRequest,
) -> PurchaseRequisition:
    """
    Approve a submitted Purchase Requisition.

    Guardrails:
    - PR must exist.
    - PR must be SUBMITTED.
    - Approver cannot be the requester.
    """

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

    if pr.status != "SUBMITTED":
        raise ValueError(
            f"Purchase Requisition {pr.pr_number} is "
            f"{pr.status}. Only SUBMITTED PRs can be approved."
        )

    if pr.requested_by == decision.approver:
        raise ValueError(
            "Requester cannot approve their own "
            "Purchase Requisition."
        )

    pr.status = "APPROVED"
    pr.updated_at = datetime.utcnow()

    # Store approval information in the existing notes field
    # until we introduce a dedicated PR approval/audit table.
    approval_note = (
        f"PR approved by {decision.approver}"
    )

    if decision.comments:
        approval_note += (
            f". Comments: {decision.comments}"
        )

    if pr.notes:
        pr.notes = (
            f"{pr.notes}\n{approval_note}"
        )
    else:
        pr.notes = approval_note

    db.commit()
    db.refresh(pr)

    return pr


def reject_purchase_requisition(
    db: Session,
    purchase_requisition_id: UUID,
    decision: PurchaseRequisitionDecisionRequest,
) -> PurchaseRequisition:
    """
    Reject a submitted Purchase Requisition.
    """

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

    if pr.status != "SUBMITTED":
        raise ValueError(
            f"Purchase Requisition {pr.pr_number} is "
            f"{pr.status}. Only SUBMITTED PRs can be rejected."
        )

    if pr.requested_by == decision.approver:
        raise ValueError(
            "Requester cannot reject their own "
            "Purchase Requisition."
        )

    pr.status = "REJECTED"
    pr.updated_at = datetime.utcnow()

    rejection_note = (
        f"PR rejected by {decision.approver}"
    )

    if decision.comments:
        rejection_note += (
            f". Comments: {decision.comments}"
        )

    if pr.notes:
        pr.notes = (
            f"{pr.notes}\n{rejection_note}"
        )
    else:
        pr.notes = rejection_note

    db.commit()
    db.refresh(pr)

    return pr