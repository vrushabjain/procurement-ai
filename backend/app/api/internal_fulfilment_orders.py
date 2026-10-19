
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.internal_fulfilment_order import (
    InternalFulfilmentOrderApprove,
    InternalFulfilmentOrderCreate,
    InternalFulfilmentOrderResponse,
)
from app.services.internal_fulfilment_order_service import (
    approve_internal_fulfilment_order,
    create_internal_fulfilment_order,
)

router = APIRouter(
    prefix="/internal-fulfilment-orders",
    tags=["Internal Fulfilment Orders"],
)


@router.post(
    "",
    response_model=InternalFulfilmentOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    payload: InternalFulfilmentOrderCreate,
    db: Session = Depends(get_db),
):
    try:
        order = create_internal_fulfilment_order(
            db=db,
            procurement_request_id=payload.procurement_request_id,
            procurement_request_item_id=payload.procurement_request_item_id,
            inventory_id=payload.inventory_id,
            quantity=payload.quantity,
            created_by=payload.created_by,
            remarks=payload.remarks,
        )
        db.commit()
        db.refresh(order)
        return order
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception:
        db.rollback()
        raise


@router.post(
    "/{order_id}/approve",
    response_model=InternalFulfilmentOrderResponse,
)
def approve_order(
    order_id: UUID,
    payload: InternalFulfilmentOrderApprove,
    db: Session = Depends(get_db),
):
    try:
        order = approve_internal_fulfilment_order(
            db=db,
            order_id=order_id,
            approved_by=payload.approved_by,
        )
        db.commit()
        db.refresh(order)
        return order
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception:
        db.rollback()
        raise


@router.get(
    "/{order_id}",
    response_model=InternalFulfilmentOrderResponse,
)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.internal_fulfilment_order import InternalFulfilmentOrder

    order = db.scalar(
        select(InternalFulfilmentOrder).where(
            InternalFulfilmentOrder.id == order_id
        )
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Internal fulfilment order not found.",
        )

    return order


@router.get(
    "/by-request/{request_id}",
    response_model=list[InternalFulfilmentOrderResponse],
)
def list_orders_for_request(
    request_id: UUID,
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.internal_fulfilment_order import InternalFulfilmentOrder

    orders = db.scalars(
        select(InternalFulfilmentOrder)
        .where(
            InternalFulfilmentOrder.procurement_request_id == request_id
        )
        .order_by(InternalFulfilmentOrder.created_at.desc())
    ).all()

    return list(orders)
