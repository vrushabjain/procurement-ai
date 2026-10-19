from app.database import SessionLocal
from app.schemas.approval import ApprovalDecisionRequest
from app.services.approval_service import approve_request


APPROVAL_ID = "279ba0b6-f9e8-494f-a055-9b2d8f121c20"


def main():
    db = SessionLocal()

    try:
        decision = ApprovalDecisionRequest(
            approver="procurement.head@epc-demo.com",
            comments=(
                "Sourcing recommendation reviewed. "
                "Delivery buffer and supplier compliance "
                "are acceptable."
            ),
        )

        result = approve_request(
            db=db,
            approval_id=APPROVAL_ID,
            decision=decision,
        )

        print("\n" + "=" * 75)
        print("APPROVAL DECISION")
        print("=" * 75)

        print(f"\nApproval Number: {result.approval_number}")
        print(f"Status:          {result.status}")
        print(f"Approval Level:  {result.approval_level}")
        print(f"Amount:          {result.amount}")
        print(f"Requested By:    {result.requested_by}")
        print(f"Approver:        {result.approver}")
        print(f"Comments:        {result.comments}")
        print(f"Decided At:      {result.decided_at}")

        print("\n" + "=" * 75)

    finally:
        db.close()


if __name__ == "__main__":
    main()