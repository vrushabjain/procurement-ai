from app.database import SessionLocal
from app.services.purchase_requisition_service import (
    create_purchase_requisition,
)


APPROVAL_ID = "279ba0b6-f9e8-494f-a055-9b2d8f121c20"


def main():
    db = SessionLocal()

    try:
        pr = create_purchase_requisition(
            db=db,
            approval_id=APPROVAL_ID,
            requested_by="procurement.manager@epc-demo.com",
        )

        print("\n" + "=" * 80)
        print("PURCHASE REQUISITION CREATED")
        print("=" * 80)

        print(f"\nPR Number:        {pr.pr_number}")
        print(f"PR ID:            {pr.id}")
        print(f"Status:           {pr.status}")
        print(f"RFQ ID:           {pr.rfq_id}")
        print(f"Quote ID:         {pr.quote_id}")
        print(f"Approval ID:      {pr.approval_id}")
        print(f"Supplier ID:      {pr.supplier_id}")
        print(f"Required Date:    {pr.required_date}")
        print(f"Currency:         {pr.currency_code}")
        print(f"Total Amount:     {pr.total_amount}")
        print(f"Requested By:     {pr.requested_by}")
        print(f"Created At:       {pr.created_at}")

        print("\n" + "-" * 80)
        print("PR CREATION SUCCESSFUL")
        print("-" * 80)

    except Exception as exc:
        print("\n" + "=" * 80)
        print("PR CREATION FAILED")
        print("=" * 80)
        print(f"\nError: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()