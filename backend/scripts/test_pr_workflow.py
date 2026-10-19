from app.database import SessionLocal

from app.services.purchase_requisition_service import (
    create_purchase_requisition,
)

from app.services.purchase_requisition_workflow_service import (
    submit_purchase_requisition,
    approve_purchase_requisition,
)

from app.schemas.purchase_requisition import (
    PurchaseRequisitionDecisionRequest,
)


PR_ID = None


def main():
    db = SessionLocal()

    try:
        # -----------------------------------------------------
        # Find the existing PR
        # -----------------------------------------------------
        from app.models.purchase_requisition import (
            PurchaseRequisition,
        )

        pr = (
            db.query(PurchaseRequisition)
            .filter(
                PurchaseRequisition.pr_number
                == "PR-20261002-0001"
            )
            .first()
        )

        if pr is None:
            raise ValueError(
                "PR-20261002-0001 was not found."
            )

        print("\n" + "=" * 80)
        print("CURRENT PR")
        print("=" * 80)

        print(f"\nPR Number: {pr.pr_number}")
        print(f"Status:    {pr.status}")

        # -----------------------------------------------------
        # Submit PR
        # -----------------------------------------------------
        pr = submit_purchase_requisition(
            db=db,
            purchase_requisition_id=pr.id,
        )

        print("\n" + "-" * 80)
        print("PR SUBMITTED")
        print("-" * 80)

        print(f"PR Number: {pr.pr_number}")
        print(f"Status:    {pr.status}")

        # -----------------------------------------------------
        # Approve PR
        # -----------------------------------------------------
        decision = PurchaseRequisitionDecisionRequest(
            approver="procurement.head@epc-demo.com",
            comments=(
                "PR reviewed against the approved "
                "sourcing recommendation."
            ),
        )

        pr = approve_purchase_requisition(
            db=db,
            purchase_requisition_id=pr.id,
            decision=decision,
        )

        print("\n" + "-" * 80)
        print("PR APPROVED")
        print("-" * 80)

        print(f"PR Number: {pr.pr_number}")
        print(f"Status:    {pr.status}")
        print(f"Notes:     {pr.notes}")

        print("\n" + "=" * 80)
        print("PR WORKFLOW SUCCESSFUL")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    main()