from app.database import SessionLocal
from app.services.procurement_policy_service import (
    evaluate_procurement_policy,
)

RFQ_ID = "c8fec135-9e33-4b99-98a1-d382b62a20bd"


def main():
    db = SessionLocal()

    try:
        result = evaluate_procurement_policy(
            db=db,
            rfq_id=RFQ_ID,
        )

        print("\n" + "=" * 75)
        print("PROCUREMENT POLICY EVALUATION")
        print("=" * 75)

        print(f"\nRFQ Number:       {result.rfq_number}")
        print(f"Supplier:         {result.supplier_code} - {result.supplier_name}")
        print(f"Landed Cost:      {result.landed_cost}")

        print("\nPOLICY RESULT")
        print("-" * 75)
        print(f"Policy Passed:    {result.policy_passed}")
        print(f"Approval Required:{result.approval_required}")
        print(f"Approval Level:   {result.approval_level}")

        print("\nPOLICY CHECKS")
        print("-" * 75)

        for check in result.checks:
            status = "PASS" if check.passed else "FAIL"

            print(
                f"[{status}] "
                f"{check.rule_code} | "
                f"{check.rule_name}"
            )
            print(f"       {check.message}")

        print("\nBLOCKING REASONS")
        print("-" * 75)

        if result.blocking_reasons:
            for reason in result.blocking_reasons:
                print(f"- {reason}")
        else:
            print("- None")

        print("\nWARNINGS")
        print("-" * 75)

        if result.warnings:
            for warning in result.warnings:
                print(f"- {warning}")
        else:
            print("- None")

        print("\n" + "=" * 75)

    finally:
        db.close()


if __name__ == "__main__":
    main()