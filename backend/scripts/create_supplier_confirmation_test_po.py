from datetime import date, timedelta
from decimal import Decimal

from app.database import SessionLocal
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_requisition import PurchaseRequisition
from app.models.supplier_quote import SupplierQuote
from app.services.purchase_order_service import create_purchase_order
from app.services.purchase_order_workflow_service import (
    issue_purchase_order,
    validate_purchase_order,
)


PR_NUMBER = "PR-20261002-0001"


def main():
    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # Find approved PR
        # ---------------------------------------------------------

        pr = (
            db.query(PurchaseRequisition)
            .filter(
                PurchaseRequisition.pr_number == PR_NUMBER
            )
            .first()
        )

        if pr is None:
            raise ValueError(
                f"Purchase Requisition {PR_NUMBER} was not found."
            )

        if pr.status != "APPROVED":
            raise ValueError(
                f"PR {pr.pr_number} is {pr.status}. "
                "Expected APPROVED."
            )

        # ---------------------------------------------------------
        # Check existing test PO
        # ---------------------------------------------------------

        existing_po = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.notes
                == "SUPPLIER_CONFIRMATION_TEST_FIXTURE"
            )
            .first()
        )

        if existing_po:
            print("=" * 70)
            print("TEST PO ALREADY EXISTS")
            print("=" * 70)
            print(f"PO Number: {existing_po.po_number}")
            print(f"PO ID: {existing_po.id}")
            print(f"Status: {existing_po.status}")
            print(
                f"Supplier Confirmation: "
                f"{existing_po.supplier_confirmation_status}"
            )
            return

        # ---------------------------------------------------------
        # Create PO
        # ---------------------------------------------------------

        po = create_purchase_order(
            db=db,
            purchase_requisition_id=pr.id,
            created_by="supplier-confirmation-test",
        )

        # ---------------------------------------------------------
        # Mark as test fixture
        # ---------------------------------------------------------

        po.notes = "SUPPLIER_CONFIRMATION_TEST_FIXTURE"

        db.commit()
        db.refresh(po)

        # ---------------------------------------------------------
        # Validate
        # ---------------------------------------------------------

        po = validate_purchase_order(
            db=db,
            purchase_order_id=po.id,
        )

        # ---------------------------------------------------------
        # Issue
        # ---------------------------------------------------------

        po = issue_purchase_order(
            db=db,
            purchase_order_id=po.id,
        )

        # ---------------------------------------------------------
        # Output
        # ---------------------------------------------------------

        print("=" * 70)
        print("SUPPLIER CONFIRMATION TEST PO CREATED")
        print("=" * 70)

        print(f"PO Number: {po.po_number}")
        print(f"PO ID: {po.id}")
        print(f"Status: {po.status}")
        print(
            f"Supplier Confirmation: "
            f"{po.supplier_confirmation_status}"
        )
        print(f"Required Date: {po.required_date}")
        print(f"Total Amount: {po.total_amount}")

        print("\nThis PO is now ready for:")
        print("1. PARTIALLY_CONFIRMED test")
        print("2. REJECTED test")

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