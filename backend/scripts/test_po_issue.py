from app.database import SessionLocal
from app.models.purchase_order import PurchaseOrder
from app.services.purchase_order_workflow_service import issue_purchase_order


PO_NUMBER = "PO-20261002-0001"


def main():
    db = SessionLocal()

    try:
        po = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.po_number == PO_NUMBER)
            .first()
        )

        if not po:
            raise ValueError(f"PO not found: {PO_NUMBER}")

        print("=" * 70)
        print("PURCHASE ORDER ISSUE")
        print("=" * 70)

        print(f"PO Number: {po.po_number}")
        print(f"Status Before: {po.status}")
        print(f"Supplier Confirmation: {po.supplier_confirmation_status}")

        updated_po = issue_purchase_order(
            db=db,
            purchase_order_id=po.id,
        )

        print("\nPO ISSUED SUCCESSFULLY")
        print("-" * 70)
        print(f"PO Number: {updated_po.po_number}")
        print(f"Status After: {updated_po.status}")
        print(
            f"Supplier Confirmation: "
            f"{updated_po.supplier_confirmation_status}"
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