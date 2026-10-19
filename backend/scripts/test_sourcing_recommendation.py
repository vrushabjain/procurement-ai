from app.database import SessionLocal
from app.services.sourcing_recommendation_service import (
    generate_sourcing_recommendation,
)

RFQ_ID = "c8fec135-9e33-4b99-98a1-d382b62a20bd"


def main():
    db = SessionLocal()

    try:
        result = generate_sourcing_recommendation(
            db=db,
            rfq_id=RFQ_ID,
        )

        print("\n" + "=" * 70)
        print("SOURCING RECOMMENDATION")
        print("=" * 70)

        print(f"\nRFQ Number: {result.rfq_number}")

        print("\nRECOMMENDED SUPPLIER")
        print("-" * 70)
        print(f"Supplier Code:       {result.recommended_supplier_code}")
        print(f"Supplier Name:       {result.recommended_supplier_name}")
        print(f"Quantity:             {result.recommended_quantity}")
        print(f"Landed Cost:          {result.landed_cost}")
        print(f"Expected Delivery:   {result.expected_delivery_date}")
        print(f"Delivery Buffer:     {result.days_early_or_late} days")
        print(f"Overall Score:       {result.overall_score}")

        print("\nRECOMMENDATION REASON")
        print("-" * 70)
        for reason in result.recommendation_reason:
            print(f"- {reason}")

        print("\nRISK FLAGS")
        print("-" * 70)

        if result.risk_flags:
            for risk in result.risk_flags:
                print(f"- {risk}")
        else:
            print("- None")

        print("\nALTERNATIVES")
        print("-" * 70)

        for alternative in result.alternatives:
            print(
                f"\n{alternative.supplier_code} - "
                f"{alternative.supplier_name}"
            )
            print(f"  Landed Cost:        {alternative.landed_cost}")
            print(f"  Delivery:           {alternative.expected_delivery_date}")
            print(
                f"  Delivery Buffer:    "
                f"{alternative.days_early_or_late} days"
            )
            print(f"  Overall Score:      {alternative.overall_score}")

            for tradeoff in alternative.trade_offs:
                print(f"  - {tradeoff}")

        print("\nAPPROVAL")
        print("-" * 70)
        print(f"Approval Required: {result.approval_required}")
        print(f"Approval Status:   {result.approval_status}")

        print("\n" + "=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    main()