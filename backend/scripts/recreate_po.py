from app.database import SessionLocal
from app.models.purchase_requisition import PurchaseRequisition
from app.models.purchase_order import PurchaseOrder
from app.services.purchase_order_service import create_purchase_order


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

        print("=" * 70)
        print("RECREATE PURCHASE ORDER")
        print("=" * 70)

        print(f"PR Number: {pr.pr_number}")
        print(f"PR Status: {pr.status}")
        print(f"PR Total: {pr.total_amount}")
        print(f"Supplier ID: {pr.supplier_id}")

        # ---------------------------------------------------------
        # Create PO from approved PR
        # ---------------------------------------------------------

        po = create_purchase_order(
            db=db,
            purchase_requisition_id=pr.id,
            created_by="procurement.manager@epc-demo.com",
        )

        print("\nPURCHASE ORDER CREATED")
        print("-" * 70)

        print(f"PO Number: {po.po_number}")
        print(f"PO ID: {po.id}")
        print(f"Status: {po.status}")
        print(f"Supplier ID: {po.supplier_id}")
        print(f"Required Date: {po.required_date}")
        print(f"Currency: {po.currency_code}")
        print(f"Total Amount: {po.total_amount}")
        print(f"Payment Terms: {po.payment_terms}")
        print(f"Incoterm: {po.incoterm}")
        print(f"Freight: {po.freight_cost}")
        print(f"Insurance: {po.insurance_cost}")
        print(f"Tax: {po.tax_cost}")
        print(f"Expected Delivery: {po.expected_delivery_date}")
        print(
            f"Supplier Confirmation: "
            f"{po.supplier_confirmation_status}"
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


    