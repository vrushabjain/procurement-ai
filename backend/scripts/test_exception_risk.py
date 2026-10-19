from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from app.database import SessionLocal
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order import PurchaseOrderItem
from app.models.purchase_requisition import PurchaseRequisition
from app.models.supplier import Supplier
from app.services.exception_risk_service import evaluate_purchase_order


db = SessionLocal()

try:
    # ---------------------------------------------------------
    # Find an existing supplier and approved PR
    # ---------------------------------------------------------

    supplier = db.query(Supplier).first()

    if not supplier:
        raise ValueError("No supplier found.")

    pr = db.query(PurchaseRequisition).first()

    if not pr:
        raise ValueError("No Purchase Requisition found.")

    # ---------------------------------------------------------
    # Create temporary PO
    # ---------------------------------------------------------

    po = PurchaseOrder(
        id=uuid4(),
        po_number=f"PO-RISK-TEST-{uuid4().hex[:8].upper()}",
        purchase_requisition_id=pr.id,
        supplier_id=supplier.id,
        status="ISSUED",
        order_date=date.today(),
        required_date=date.today() + timedelta(days=30),
        currency_code="USD",
        payment_terms="Net 30",
        incoterm="DAP",
        freight_cost=Decimal("0"),
        insurance_cost=Decimal("0"),
        tax_cost=Decimal("0"),
        total_amount=Decimal("1000"),
        expected_delivery_date=date.today() + timedelta(days=20),
        supplier_confirmation_status="PENDING",
        created_by="risk-engine-test",
    )

    db.add(po)
    db.commit()
    db.refresh(po)

    print("\nTEMPORARY PO CREATED")
    print(f"PO Number: {po.po_number}")
    print(f"PO ID: {po.id}")
    print(f"Status: {po.status}")
    print(
        f"Supplier Confirmation: "
        f"{po.supplier_confirmation_status}"
    )

    # ---------------------------------------------------------
    # Evaluate risk
    # ---------------------------------------------------------

    exceptions = evaluate_purchase_order(
        db=db,
        purchase_order_id=po.id,
    )

    print("\nRISK EVALUATION RESULT")
    print(f"Exception Count: {len(exceptions)}")

    for exception in exceptions:
        print("----------------------------------------")
        print(f"Exception Number: {exception.exception_number}")
        print(f"Type: {exception.exception_type}")
        print(f"Severity: {exception.severity}")
        print(f"Title: {exception.title}")
        print(f"Description: {exception.description}")
        print(f"Recommended Action: {exception.recommended_action}")

    # ---------------------------------------------------------
    # Validate expected result
    # ---------------------------------------------------------

    confirmation_risks = [
        exception
        for exception in exceptions
        if exception.exception_type == "PO_CONFIRMATION_RISK"
    ]

    if len(confirmation_risks) != 1:
        raise AssertionError(
            "Expected exactly one PO_CONFIRMATION_RISK."
        )

    if confirmation_risks[0].severity != "HIGH":
        raise AssertionError(
            "Expected PO_CONFIRMATION_RISK severity to be HIGH."
        )

    print("\nRISK ENGINE TEST PASSED")

finally:
    db.rollback()
    db.close()