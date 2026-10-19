from app.database import SessionLocal
from app.services.rfq_service import (
    create_rfq_from_procurement_request,
)


REQUEST_ID = "741f8458-bbd3-4f0e-ae32-36c28c684701"
ITEM_ID = "2a1a972c-6f1d-4bca-8e50-e638d6f53e29"


def main():
    db = SessionLocal()

    try:
        rfq = create_rfq_from_procurement_request(
            db=db,
            procurement_request_id=REQUEST_ID,
            procurement_request_item_id=ITEM_ID,
        )

        print("RFQ created successfully")
        print(f"RFQ ID: {rfq.id}")
        print(f"RFQ Number: {rfq.rfq_number}")
        print(f"Status: {rfq.status}")
        print(f"Response Due Date: {rfq.response_due_date}")

    except Exception as exc:
        db.rollback()
        print(f"RFQ creation failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()