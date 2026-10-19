from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

from app.models.purchase_order import (
    PurchaseOrderItem,
)
from app.database import get_db
from app.services.purchase_order_service import (
    create_draft_purchase_order,
    enrich_draft_purchase_order,
    validate_purchase_order,
    issue_purchase_order,
    process_supplier_confirmation,
)

class SupplierConfirmationRequest(BaseModel):
    action: str
    confirmed_quantity: Decimal | None = None
    confirmed_delivery_date: date | None = None
    confirmation_reference: str | None = None
    comments: str | None = None


router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
)


# ============================================================
# CREATE DRAFT PO FROM APPROVED PR
# ============================================================

@router.post("/from-pr/{purchase_requisition_id}")
def create_po_from_pr(
    purchase_requisition_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        po = create_draft_purchase_order(
            db=db,
            purchase_requisition_id=purchase_requisition_id,
        )

        items = (
            db.query(PurchaseOrderItem)
            .filter(
                PurchaseOrderItem.purchase_order_id == po.id
            )
            .all()
        )

        return {
            "message": "Draft Purchase Order created successfully.",
            "purchase_order": {
                "id": po.id,
                "po_number": po.po_number,
                "purchase_requisition_id": po.purchase_requisition_id,
                "supplier_id": po.supplier_id,
                "status": po.status,
                "order_date": po.order_date,
                "required_date": po.required_date,
                "expected_delivery_date": po.expected_delivery_date,
                "currency_code": po.currency_code,
                "payment_terms": po.payment_terms,
                "incoterm": po.incoterm,
                "freight_cost": po.freight_cost,
                "insurance_cost": po.insurance_cost,
                "tax_cost": po.tax_cost,
                "total_amount": po.total_amount,
                "supplier_confirmation_status": (
                    po.supplier_confirmation_status
                ),
                "notes": po.notes,
                "created_at": po.created_at,
                "updated_at": po.updated_at,
                "items": [
                    {
                        "id": item.id,
                        "purchase_order_id": item.purchase_order_id,
                        "material_id": item.material_id,
                        "quantity": item.quantity,
                        "uom": item.uom,
                        "unit_price": item.unit_price,
                        "line_total": item.line_total,
                    }
                    for item in items
                ],
            },
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

# ============================================================
# GET PURCHASE ORDER
# ============================================================

@router.get(
    "/{purchase_order_id}"
)
def get_purchase_order(
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Retrieve a Purchase Order.
    """

    from app.models.purchase_order import (
        PurchaseOrder,
        PurchaseOrderItem,
    )

    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id == purchase_order_id
        )
        .first()
    )

    if po is None:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found.",
        )

    items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.purchase_order_id
            == po.id
        )
        .all()
    )

    return {
        "id": po.id,
        "po_number": po.po_number,
        "purchase_requisition_id": (
            po.purchase_requisition_id
        ),
        "supplier_id": po.supplier_id,
        "status": po.status,
        "order_date": po.order_date,
        "required_date": po.required_date,
        "expected_delivery_date": (
            po.expected_delivery_date
        ),
        "currency_code": po.currency_code,
        "payment_terms": po.payment_terms,
        "incoterm": po.incoterm,
        "freight_cost": po.freight_cost,
        "insurance_cost": po.insurance_cost,
        "tax_cost": po.tax_cost,
        "total_amount": po.total_amount,
        "supplier_confirmation_status": (
            po.supplier_confirmation_status
        ),
        "notes": po.notes,
        "created_at": po.created_at,
        "updated_at": po.updated_at,
        "items": [
            {
                "id": item.id,
                "purchase_order_id": (
                    item.purchase_order_id
                ),
                "material_id": item.material_id,
                "quantity": item.quantity,
                "uom": item.uom,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
            }
            for item in items
        ],
    }


# ============================================================
# ENRICH DRAFT PO
# ============================================================

@router.post(
    "/{purchase_order_id}/enrich"
)
def enrich_purchase_order(
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Enrich a DRAFT PO from its approved supplier quote.
    """

    try:
        po = enrich_draft_purchase_order(
            db=db,
            purchase_order_id=purchase_order_id,
        )

        return {
            "message": (
                "Purchase Order enriched successfully."
            ),
            "purchase_order": po,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# ============================================================
# VALIDATE PO
# ============================================================

@router.post(
    "/{purchase_order_id}/validate"
)
def validate_purchase_order_api(
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Validate a DRAFT Purchase Order.
    """

    try:
        po = validate_purchase_order(
            db=db,
            purchase_order_id=purchase_order_id,
        )

        return {
            "message": (
                "Purchase Order validated successfully."
            ),
            "purchase_order": po,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# ============================================================
# ISSUE PO
# ============================================================

@router.post(
    "/{purchase_order_id}/issue"
)
def issue_purchase_order_api(
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Issue a VALIDATED Purchase Order to the supplier.
    """

    try:
        po = issue_purchase_order(
            db=db,
            purchase_order_id=purchase_order_id,
        )

        return {
            "message": (
                "Purchase Order issued successfully."
            ),
            "purchase_order": po,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

# ============================================================
# SUPPLIER CONFIRMATION
# ============================================================

@router.post(
    "/{purchase_order_id}/supplier-confirmation"
)
def supplier_confirmation(
    purchase_order_id: UUID,
    request: SupplierConfirmationRequest,
    db: Session = Depends(get_db),
):
    """
    Process supplier confirmation for an ISSUED Purchase Order.

    Supported actions:
        CONFIRM
        REVISE_DELIVERY
        PARTIAL_CONFIRM
        REJECT
    """

    try:
        po = process_supplier_confirmation(
            db=db,
            purchase_order_id=purchase_order_id,
            action=request.action,
            confirmed_quantity=request.confirmed_quantity,
            confirmed_delivery_date=request.confirmed_delivery_date,
            confirmation_reference=request.confirmation_reference,
            comments=request.comments,
        )

        return {
            "message": (
                "Supplier confirmation processed successfully."
            ),
            "purchase_order": po,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )