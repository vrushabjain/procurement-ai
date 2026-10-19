from datetime import date

from app.database import SessionLocal
from app.services.supplier_quote_service import submit_supplier_quote


RFQ_ID = "c8fec135-9e33-4b99-98a1-d382b62a20bd"

SUPPLIER_ID = "11f018ec-7235-4285-8291-1f6f6861076c"

RFQ_ITEM_ID = "ef5b5324-cd2d-4154-92bd-e07cb71216df"


def main():
    db = SessionLocal()

    try:
        quote = submit_supplier_quote(
            db=db,
            rfq_id=RFQ_ID,
            supplier_id=SUPPLIER_ID,
            rfq_item_id=RFQ_ITEM_ID,
            quantity=200,
            unit_price=1180,
            lead_time_days=25,
            technical_compliance=True,
            quality_compliance=True,
            payment_terms="Net 60",
            incoterm="DAP",
            freight_cost=2000,
            insurance_cost=500,
            tax_cost=0,
            supplier_quote_reference="GVI-Q-2026-0915",
            quote_valid_until=date(2026, 10, 15),
            remarks="API 6D Class 600 carbon steel valves. Full technical compliance.",
        )

        print("Supplier quote submitted successfully")
        print(f"Quote ID: {quote.id}")
        print(f"Quote Number: {quote.quote_number}")
        print(f"Status: {quote.status}")
        print(f"Total Quote Value: {quote.total_quote_value}")

    except Exception as exc:
        db.rollback()
        print(f"Supplier quote submission failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()