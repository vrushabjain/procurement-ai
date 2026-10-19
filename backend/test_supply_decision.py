from app.database import SessionLocal
from app.services.supply_decision_service import get_supply_decision


db = SessionLocal()

try:
    result = get_supply_decision(
        db=db,
        procurement_request_id="741f8458-bbd3-4f0e-ae32-36c28c684701",
        procurement_request_item_id="2a1a972c-6f1d-4bca-8e50-e638d6f53e29",
    )

    print("\n=== SUPPLY DECISION ===")
    print(result.model_dump_json(indent=2))

finally:
    db.close()
    