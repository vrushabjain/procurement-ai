from app.database import SessionLocal

from app.models.purchase_requisition import PurchaseRequisition
from app.services.purchase_order_service import (
    create_purchase_order,
)


def main():
    db = SessionLocal()

    try:
        pr = (
            db.query(PurchaseRequisition)
            .filter(
                PurchaseRequisition.pr_number
                == "PR-20261002-0001"
            )
            .first()
        )

        if pr is None:
            raise ValueError(
                "PR-20261002-0001 was not found."
            )

        print("\n" + "=" * 80)
        print("SOURCE PR")
        print("=" * 80)

        print(f"\nPR Number:     {pr.pr_number}")
        print(f"PR ID:         {pr.id}")
        print(f"Status:        {pr.status}")
        print(f"Supplier ID:   {pr.supplier_id}")
        print(f"Required Date: {pr.required_date}")
        print(f"Total Amount:  {pr.total_amount}")

        # -----------------------------------------------------
        # Create PO
        # -----------------------------------------------------
        po = create_purchase_order(
            db=db,
            purchase_requisition_id=pr.id,
            created_by="procurement.manager@epc-demo.com",
        )

        print("\n" + "=" * 80)
        print("PURCHASE ORDER CREATED")
        print("=" * 80)

        print(f"\nPO Number:        {po.po_number}")
        print(f"PO ID:            {po.id}")
        print(f"Status:           {po.status}")
        print(f"PR ID:            {po.purchase_requisition_id}")
        print(f"Supplier ID:      {po.supplier_id}")
        print(f"Order Date:       {po.order_date}")
        print(f"Required Date:    {po.required_date}")
        print(f"Currency:         {po.currency_code}")
        print(f"Total Amount:     {po.total_amount}")
        print(f"Confirmation:     {po.supplier_confirmation_status}")
        print(f"Created By:       {po.created_by}")

        print("\n" + "=" * 80)
        print("PO CREATION SUCCESSFUL")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    main()