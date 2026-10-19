from app.database import SessionLocal
from app.services.quote_evaluation_service import evaluate_quotes


RFQ_ID = "c8fec135-9e33-4b99-98a1-d382b62a20bd"


def main():
    db = SessionLocal()

    try:
        result = evaluate_quotes(
            db=db,
            rfq_id=RFQ_ID,
        )

        print("Quote evaluation completed successfully")
        print(f"RFQ: {result.rfq_number}")
        print(f"Required Date: {result.required_date}")
        print(f"Quotes Evaluated: {result.evaluated_quote_count}")
        print()

        for quote in result.results:
            print("----------------------------------------")
            print(f"Supplier: {quote.supplier_code}")
            print(f"Supplier Name: {quote.supplier_name}")
            print(f"Landed Cost: {quote.landed_cost}")
            print(f"Lead Time: {quote.lead_time_days} days")
            print(
                f"Expected Delivery: "
                f"{quote.expected_delivery_date}"
            )
            print(
                f"Days Early/Late: "
                f"{quote.days_early_or_late}"
            )
            print(
                f"Meets Required Date: "
                f"{quote.meets_required_date}"
            )
            print(
                f"Technical Score: "
                f"{quote.technical_score}"
            )
            print(
                f"Quality Score: "
                f"{quote.quality_score}"
            )
            print(
                f"Delivery Score: "
                f"{quote.delivery_score}"
            )
            print(
                f"Commercial Score: "
                f"{quote.commercial_score}"
            )
            print(
                f"Overall Score: "
                f"{quote.overall_score}"
            )
            print(
                f"Eligible: "
                f"{quote.eligible_for_recommendation}"
            )

            if quote.evaluation_flags:
                print("Flags:")
                for flag in quote.evaluation_flags:
                    print(f"  - {flag}")

    except Exception as exc:
        db.rollback()
        print(f"Quote evaluation failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()