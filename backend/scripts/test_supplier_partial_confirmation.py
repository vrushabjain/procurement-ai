from datetime import date
from decimal import Decimal

from app.database import SessionLocal
from app.models.purchase_order import PurchaseOrder
from app.services.purchase_order_workflow_service import (
    partially_confirm_purchase_order,
)


PO_NUMBER = "PO-20261002-0001"


def main():
    db = SessionLocal()

    try:
        po = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.po_number == PO_NUMBER
            )
            .first()
        )

        if po is None:
            raise ValueError(
                f"Purchase Order {PO_NUMBER} was not found."
            )

        print("=" * 70)
        print("SUPPLIER PARTIAL CONFIRMATION TEST")
        print("=" * 70)

        print(f"PO Number: {po.po_number}")
        print(f"PO Status: {po.status}")
        print(
            f"Current Confirmation: "
            f"{po.supplier_confirmation_status}"
        )

        result = partially_confirm_purchase_order(
            db=db,
            purchase_order_id=po.id,
            confirmed_quantity=Decimal("120"),
            confirmed_delivery_date=date(2026, 10, 25),
            confirmation_reference="GVI-PARTIAL-2026-1002",
            comments=(
                "Supplier can confirm 120 units immediately. "
                "Remaining quantity requires additional production."
            ),
        )

        print("\nPARTIAL CONFIRMATION SUCCESSFUL")
        print("-" * 70)
        print(f"PO Number: {result.po_number}")
        print(f"PO Status: {result.status}")
        print(
            f"Supplier Confirmation: "
            f"{result.supplier_confirmation_status}"
        )
        print(
            f"Confirmed Quantity: "
            f"{result.supplier_confirmed_quantity}"
        )
        print(
            f"Remaining Quantity: "
            f"{Decimal('200') - result.supplier_confirmed_quantity}"
        )
        print(
            f"Confirmed Delivery: "
            f"{result.supplier_confirmed_delivery_date}"
        )
        print(
            f"Reference: "
            f"{result.supplier_confirmation_reference}"
        )
        print(
            f"Comments: "
            f"{result.supplier_confirmation_comments}"
        )

    except Exception as exc:
        db.rollback()

        print("\nERROR")
        print("-" * 70)
        print(type(exc).__name__, ":", exc)

        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()