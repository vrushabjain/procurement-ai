from uuid import UUID

from app.database import SessionLocal
from app.services.procurement_orchestrator.graph import (
    build_procurement_graph,
)


REQUEST_ID = UUID(
    "9287912e-06eb-405f-9587-3ded4e5dd7b6"
)

ITEM_ID = UUID(
    "53ca6f5f-1486-4582-b592-381c35854d20"
)


def main():
    db = SessionLocal()

    try:
        graph = build_procurement_graph(db)

        initial_state = {
            "procurement_request_id": str(REQUEST_ID),
            "procurement_request_item_id": str(ITEM_ID),
            "current_stage": "STARTING",
            "status": "STARTING",
            "error": None,
        }

        result = graph.invoke(initial_state)

        print("\n" + "=" * 70)
        print("PROCUREMENT ORCHESTRATION RESULT")
        print("=" * 70)

        print("\nStage:")
        print(result.get("current_stage"))

        print("\nStatus:")
        print(result.get("status"))

        print("\nRequest:")
        print(result.get("request"))

        print("\nSupply Decision:")
        print(result.get("supply_decision"))

        print("\nSupplier Eligibility:")
        print(result.get("supplier_eligibility"))

        print("\nSourcing Recommendation:")
        print(result.get("sourcing_recommendation"))

        print("RFQ:")
        print(result.get("rfq"))

        print("RFQ Status:")
        print(result.get("rfq_status"))

        print("\nQuote Analysis:")
        print(result.get("quote_analysis"))

        print("\nSupplier Recommendation:")
        print(result.get("supplier_recommendation"))
        
        print("\nError:")
        print(result.get("error"))

        print("\n" + "=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    main()