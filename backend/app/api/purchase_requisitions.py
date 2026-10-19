from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.purchase_requisition import (
    PurchaseRequisition,
    PurchaseRequisitionItem,
)
from app.schemas.purchase_requisition import (
    PurchaseRequisitionDecisionRequest,
    PurchaseRequisitionResponse,
)
from app.services.purchase_requisition_workflow_service import (
    approve_purchase_requisition,
    reject_purchase_requisition,
    submit_purchase_requisition,
)

router = APIRouter(
    prefix="/purchase-requisitions",
    tags=["Purchase Requisitions"],
)


def get_pr_or_404(
    db: Session,
    purchase_requisition_id: UUID,
) -> PurchaseRequisition:

    pr = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.id
            == purchase_requisition_id
        )
        .first()
    )

    if pr is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Purchase Requisition "
                f"{purchase_requisition_id} was not found."
            ),
        )

    return pr


def build_pr_response(
    db: Session,
    pr: PurchaseRequisition,
) -> PurchaseRequisitionResponse:

    items = (
        db.query(PurchaseRequisitionItem)
        .filter(
            PurchaseRequisitionItem.purchase_requisition_id
            == pr.id
        )
        .all()
    )

    return PurchaseRequisitionResponse(
        id=pr.id,
        pr_number=pr.pr_number,
        procurement_request_id=pr.procurement_request_id,
        rfq_id=pr.rfq_id,
        quote_id=pr.quote_id,
        approval_id=pr.approval_id,
        supplier_id=pr.supplier_id,
        status=pr.status,
        required_date=pr.required_date,
        currency_code=pr.currency_code,
        total_amount=pr.total_amount,
        requested_by=pr.requested_by,
        notes=pr.notes,
        created_at=pr.created_at,
        updated_at=pr.updated_at,
        items=items,
    )


@router.get(
    "/{purchase_requisition_id}",
    response_model=PurchaseRequisitionResponse,
)
def get_purchase_requisition(
    purchase_requisition_id: UUID,
    db: Session = Depends(get_db),
):
    pr = get_pr_or_404(
        db,
        purchase_requisition_id,
    )

    return build_pr_response(db, pr)


@router.post(
    "/{purchase_requisition_id}/submit",
    response_model=PurchaseRequisitionResponse,
)
def submit_purchase_requisition_endpoint(
    purchase_requisition_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        pr = submit_purchase_requisition(
            db=db,
            purchase_requisition_id=purchase_requisition_id,
        )

        return build_pr_response(db, pr)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@router.post(
    "/{purchase_requisition_id}/approve",
    response_model=PurchaseRequisitionResponse,
)
def approve_purchase_requisition_endpoint(
    purchase_requisition_id: UUID,
    payload: PurchaseRequisitionDecisionRequest,
    db: Session = Depends(get_db),
):
    try:
        pr = approve_purchase_requisition(
            db=db,
            purchase_requisition_id=purchase_requisition_id,
            decision=payload,
        )

        return build_pr_response(db, pr)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@router.post(
    "/{purchase_requisition_id}/reject",
    response_model=PurchaseRequisitionResponse,
)
def reject_purchase_requisition_endpoint(
    purchase_requisition_id: UUID,
    payload: PurchaseRequisitionDecisionRequest,
    db: Session = Depends(get_db),
):
    try:
        pr = reject_purchase_requisition(
            db=db,
            purchase_requisition_id=purchase_requisition_id,
            decision=payload,
        )

        return build_pr_response(db, pr)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )