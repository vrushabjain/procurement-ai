from app.database import SessionLocal
from app.schemas.approval import CreateApprovalRequest
from app.services.approval_service import create_approval


RFQ_ID = "c8fec135-9e33-4b99-98a1-d382b62a20bd"

# This is the quote recommended by the Sourcing Recommendation Service.
RECOMMENDED_QUOTE_ID = "8a4b495a-4915-4aa6-b259-efab0410856a"


def main():
    db = SessionLocal()

    try:
        request = CreateApprovalRequest(
            rfq_id=RFQ_ID,
            quote_id=RECOMMENDED_QUOTE_ID,
            requested_by="procurement.manager@epc-demo.com",
        )

        result = create_approval(
            db=db,
            request=request,
        )

        print("\n" + "=" * 75)
        print("APPROVAL REQUEST CREATED")
        print("=" * 75)

        print(f"\nApproval Number: {result.approval_number}")
        print(f"RFQ ID:          {result.rfq_id}")
        print(f"Quote ID:        {result.quote_id}")
        print(f"Supplier ID:     {result.supplier_id}")
        print(f"Approval Type:   {result.approval_type}")
        print(f"Approval Level:  {result.approval_level}")
        print(f"Amount:          {result.amount}")
        print(f"Currency:        {result.currency_code}")
        print(f"Status:          {result.status}")
        print(f"Requested By:    {result.requested_by}")
        print(f"Requested At:    {result.requested_at}")

        print("\n" + "=" * 75)

    finally:
        db.close()


if __name__ == "__main__":
    main()