from datetime import date
from decimal import Decimal

from app.database import SessionLocal
from app.models.purchase_order import PurchaseOrder
from app.services.purchase_order_workflow_service import (
    confirm_purchase_order,
)


PO_NUMBER = "PO-20261002-0001"


def main():
    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # Retrieve PO
        # ---------------------------------------------------------

        po = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.po_number == PO_NUMBER)
            .first()
        )

        if po is None:
            raise ValueError(
                f"Purchase Order {PO_NUMBER} was not found."
            )

        print("=" * 70)
        print("SUPPLIER PURCHASE ORDER CONFIRMATION")
        print("=" * 70)

        print(f"PO Number: {po.po_number}")
        print(f"Status Before: {po.status}")
        print(
            f"Supplier Confirmation Before: "
            f"{po.supplier_confirmation_status}"
        )
        print(f"Required Date: {po.required_date}")

        # ---------------------------------------------------------
        # Supplier confirmation
        # ---------------------------------------------------------

        confirmed_po = confirm_purchase_order(
            db=db,
            purchase_order_id=po.id,
            confirmed_quantity=Decimal("200"),
            confirmed_delivery_date=date(2026, 10, 25),
            confirmation_reference="GVI-ACK-2026-1002",
            comments=(
                "Supplier confirms full quantity and "
                "delivery commitment."
            ),
        )

        # ---------------------------------------------------------
        # Output
        # ---------------------------------------------------------

        print("\nSUPPLIER CONFIRMATION SUCCESSFUL")
        print("-" * 70)

        print(f"PO Number: {confirmed_po.po_number}")
        print(f"PO Status: {confirmed_po.status}")
        print(
            f"Supplier Confirmation: "
            f"{confirmed_po.supplier_confirmation_status}"
        )
        print(
            f"Confirmed Quantity: "
            f"{confirmed_po.supplier_confirmed_quantity}"
        )
        print(
            f"Confirmed Delivery Date: "
            f"{confirmed_po.supplier_confirmed_delivery_date}"
        )
        print(
            f"Confirmation Reference: "
            f"{confirmed_po.supplier_confirmation_reference}"
        )
        print(
            f"Comments: "
            f"{confirmed_po.supplier_confirmation_comments}"
        )
        print(
            f"Confirmed At: "
            f"{confirmed_po.supplier_confirmed_at}"
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