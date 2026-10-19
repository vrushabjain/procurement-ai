from datetime import date

from app.database import SessionLocal
from app.services.supplier_quote_service import submit_supplier_quote


RFQ_ID = "c8fec135-9e33-4b99-98a1-d382b62a20bd"

SUPPLIER_ID = "a0e2961a-cc54-4e12-9e30-a300d61e4c7e"

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
            unit_price=1150,
            lead_time_days=40,
            technical_compliance=True,
            quality_compliance=True,
            payment_terms="Net 30",
            incoterm="DAP",
            freight_cost=1000,
            insurance_cost=300,
            tax_cost=0,
            supplier_quote_reference="EPE-Q-2026-1042",
            quote_valid_until=date(2026, 10, 15),
            remarks="API 6D Class 600 carbon steel valves. Fully compliant.",
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