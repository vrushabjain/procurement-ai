from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.approval import (
    ApprovalDecisionRequest,
    ApprovalResponse,
    CreateApprovalRequest,
)
from app.services.approval_service import (
    approve_request,
    create_approval,
    reject_request,
    send_back_request,
)

router = APIRouter(
    prefix="/approvals",
    tags=["Approvals"],
)


@router.post(
    "",
    response_model=ApprovalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_approval_endpoint(
    payload: CreateApprovalRequest,
    db: Session = Depends(get_db),
):
    """
    Create a sourcing approval request from the
    approved sourcing recommendation.
    """

    try:
        return create_approval(
            db=db,
            request=payload,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "/{approval_id}",
    response_model=ApprovalResponse,
)
def get_approval_endpoint(
    approval_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Retrieve a sourcing approval request.
    """

    from app.models.approval import Approval

    approval = (
        db.query(Approval)
        .filter(Approval.id == approval_id)
        .first()
    )

    if approval is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval {approval_id} was not found.",
        )

    return approval


@router.post(
    "/{approval_id}/approve",
    response_model=ApprovalResponse,
)
def approve_approval_endpoint(
    approval_id: UUID,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
):
    """
    Approve a pending sourcing approval.
    """

    try:
        return approve_request(
            db=db,
            approval_id=approval_id,
            decision=payload,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/{approval_id}/reject",
    response_model=ApprovalResponse,
)
def reject_approval_endpoint(
    approval_id: UUID,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
):
    """
    Reject a pending sourcing approval.
    """

    try:
        return reject_request(
            db=db,
            approval_id=approval_id,
            decision=payload,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/{approval_id}/send-back",
    response_model=ApprovalResponse,
)
def send_back_approval_endpoint(
    approval_id: UUID,
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
):
    """
    Send a pending sourcing approval back for rework.
    """

    try:
        return send_back_request(
            db=db,
            approval_id=approval_id,
            decision=payload,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )