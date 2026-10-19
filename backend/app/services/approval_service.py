from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.approval import Approval
from app.schemas.approval import (
    ApprovalDecisionRequest,
    ApprovalResponse,
    CreateApprovalRequest,
)
from app.services.procurement_policy_service import (
    evaluate_procurement_policy,
)


def generate_approval_number(db: Session) -> str:
    """
    Generate a sequential approval number for the current day.

    Example:
    APR-20261002-0001
    """

    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"APR-{today}-"

    latest = (
        db.query(Approval)
        .filter(Approval.approval_number.like(f"{prefix}%"))
        .order_by(Approval.approval_number.desc())
        .first()
    )

    if latest:
        last_sequence = int(
            latest.approval_number.split("-")[-1]
        )
        next_sequence = last_sequence + 1
    else:
        next_sequence = 1

    return f"{prefix}{next_sequence:04d}"


def create_approval(
    db: Session,
    request: CreateApprovalRequest,
) -> ApprovalResponse:
    """
    Create an approval request from a sourcing recommendation.

    The approval level, supplier, amount and policy status
    are determined by backend rules and are not supplied
    by the caller.
    """

    # ---------------------------------------------------------
    # Step 1 — Evaluate procurement policy
    # ---------------------------------------------------------

    policy = evaluate_procurement_policy(
        db=db,
        rfq_id=request.rfq_id,
    )

    # ---------------------------------------------------------
    # Step 2 — Ensure policy allows approval
    # ---------------------------------------------------------

    if not policy.policy_passed:
        raise ValueError(
            "Procurement policy failed. Approval cannot be created. "
            + " ".join(policy.blocking_reasons)
        )

    if not policy.approval_required:
        raise ValueError(
            "Approval is not required for this procurement decision."
        )

    # ---------------------------------------------------------
    # Step 3 — Verify requested quote matches recommendation
    # ---------------------------------------------------------

    if request.quote_id != policy.quote_id:
        raise ValueError(
            "The selected quote does not match the approved "
            "sourcing recommendation."
        )

    # ---------------------------------------------------------
    # Step 4 — Prevent duplicate pending approvals
    # ---------------------------------------------------------

    existing_approval = (
        db.query(Approval)
        .filter(
            Approval.rfq_id == request.rfq_id,
            Approval.quote_id == request.quote_id,
            Approval.status == "PENDING",
        )
        .first()
    )

    if existing_approval:
        raise ValueError(
            f"Pending approval already exists: "
            f"{existing_approval.approval_number}"
        )

    # ---------------------------------------------------------
    # Step 5 — Create approval
    # ---------------------------------------------------------

    approval = Approval(
        approval_number=generate_approval_number(db),
        rfq_id=policy.rfq_id,
        quote_id=policy.quote_id,
        supplier_id=policy.supplier_id,
        approval_type="SOURCING",
        approval_level=policy.approval_level,
        amount=policy.landed_cost,
        currency_code="USD",
        status="PENDING",
        requested_by=request.requested_by,
    )

    db.add(approval)
    db.commit()
    db.refresh(approval)

    return ApprovalResponse.model_validate(approval)


def approve_request(
    db: Session,
    approval_id: UUID,
    decision: ApprovalDecisionRequest,
) -> ApprovalResponse:
    """
    Approve a pending approval request.
    """

    approval = (
        db.query(Approval)
        .filter(Approval.id == approval_id)
        .first()
    )

    if approval is None:
        raise ValueError(
            f"Approval {approval_id} was not found."
        )

    if approval.status != "PENDING":
        raise ValueError(
            f"Approval {approval.approval_number} is already "
            f"{approval.status}."
        )

    # Prevent requester from approving their own request.
    if approval.requested_by == decision.approver:
        raise ValueError(
            "Requester cannot approve their own approval request."
        )

    approval.status = "APPROVED"
    approval.approver = decision.approver
    approval.comments = decision.comments
    approval.decided_at = datetime.utcnow()

    db.commit()
    db.refresh(approval)

    return ApprovalResponse.model_validate(approval)


def reject_request(
    db: Session,
    approval_id: UUID,
    decision: ApprovalDecisionRequest,
) -> ApprovalResponse:
    """
    Reject a pending approval request.
    """

    approval = (
        db.query(Approval)
        .filter(Approval.id == approval_id)
        .first()
    )

    if approval is None:
        raise ValueError(
            f"Approval {approval_id} was not found."
        )

    if approval.status != "PENDING":
        raise ValueError(
            f"Approval {approval.approval_number} is already "
            f"{approval.status}."
        )

    if approval.requested_by == decision.approver:
        raise ValueError(
            "Requester cannot reject their own approval request."
        )

    approval.status = "REJECTED"
    approval.approver = decision.approver
    approval.comments = decision.comments
    approval.decided_at = datetime.utcnow()

    db.commit()
    db.refresh(approval)

    return ApprovalResponse.model_validate(approval)


def send_back_request(
    db: Session,
    approval_id: UUID,
    decision: ApprovalDecisionRequest,
) -> ApprovalResponse:
    """
    Send a pending approval back for rework.
    """

    approval = (
        db.query(Approval)
        .filter(Approval.id == approval_id)
        .first()
    )

    if approval is None:
        raise ValueError(
            f"Approval {approval_id} was not found."
        )

    if approval.status != "PENDING":
        raise ValueError(
            f"Approval {approval.approval_number} is already "
            f"{approval.status}."
        )

    if approval.requested_by == decision.approver:
        raise ValueError(
            "Requester cannot send back their own approval request."
        )

    approval.status = "SENT_BACK"
    approval.approver = decision.approver
    approval.comments = decision.comments
    approval.decided_at = datetime.utcnow()

    db.commit()
    db.refresh(approval)

    return ApprovalResponse.model_validate(approval)