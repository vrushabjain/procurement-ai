from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.goods_receipt import GoodsReceipt
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order import PurchaseOrderItem


PO_CLOSED = "CLOSED"


def close_purchase_order(
    db: Session,
    purchase_order_id: UUID,
) -> PurchaseOrder:

    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == purchase_order_id)
        .first()
    )

    if not purchase_order:
        raise ValueError(
            f"Purchase Order {purchase_order_id} was not found."
        )

    if purchase_order.status == PO_CLOSED:
        raise ValueError(
            f"Purchase Order {purchase_order.po_number} is already CLOSED."
        )

    if purchase_order.status != "ISSUED":
        raise ValueError(
            f"Purchase Order {purchase_order.po_number} must be "
            f"ISSUED before it can be closed."
        )

    ordered_quantity = (
        db.query(
            func.coalesce(
                func.sum(PurchaseOrderItem.quantity),
                0,
            )
        )
        .filter(
            PurchaseOrderItem.purchase_order_id
            == purchase_order.id
        )
        .scalar()
    )

    ordered_quantity = Decimal(
        str(ordered_quantity or 0)
    )

    accepted_quantity = (
        db.query(
            func.coalesce(
                func.sum(GoodsReceipt.quantity_accepted),
                0,
            )
        )
        .filter(
            GoodsReceipt.purchase_order_id
            == purchase_order.id,
            GoodsReceipt.status.in_(
                ["ACCEPTED", "PARTIALLY_ACCEPTED"]
            ),
        )
        .scalar()
    )

    accepted_quantity = Decimal(
        str(accepted_quantity or 0)
    )

    if ordered_quantity <= 0:
        raise ValueError(
            f"Purchase Order {purchase_order.po_number} "
            f"has no ordered quantity."
        )

    if accepted_quantity < ordered_quantity:
        remaining_quantity = (
            ordered_quantity - accepted_quantity
        )

        raise ValueError(
            f"Purchase Order {purchase_order.po_number} "
            f"cannot be closed. "
            f"Accepted quantity is {accepted_quantity}, "
            f"ordered quantity is {ordered_quantity}. "
            f"Remaining quantity: {remaining_quantity}."
        )

    if accepted_quantity > ordered_quantity:
        raise ValueError(
            f"Accepted quantity {accepted_quantity} exceeds "
            f"ordered quantity {ordered_quantity}."
        )

    purchase_order.status = PO_CLOSED

    db.commit()
    db.refresh(purchase_order)

    return purchase_order