from app.database import SessionLocal
from app.services.rfq_issue_service import issue_rfq


RFQ_ID = "c8fec135-9e33-4b99-98a1-d382b62a20bd"


def main():
    db = SessionLocal()

    try:
        rfq = issue_rfq(
            db=db,
            rfq_id=RFQ_ID,
        )

        print("RFQ issued successfully")
        print(f"RFQ ID: {rfq.id}")
        print(f"RFQ Number: {rfq.rfq_number}")
        print(f"Status: {rfq.status}")
        print(f"Issue Date: {rfq.issue_date}")
        print(f"Response Due Date: {rfq.response_due_date}")

    except Exception as exc:
        db.rollback()
        print(f"RFQ issue failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()