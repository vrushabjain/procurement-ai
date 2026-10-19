from app.database import SessionLocal

from app.models.purchase_order import PurchaseOrder
from app.services.purchase_order_workflow_service import (
    validate_purchase_order,
)


def main():
    db = SessionLocal()

    try:
        po = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.po_number
                == "PO-20261002-0001"
            )
            .first()
        )

        if po is None:
            raise ValueError(
                "PO-20261002-0001 was not found."
            )

        print("\n" + "=" * 80)
        print("PO BEFORE VALIDATION")
        print("=" * 80)

        print(f"\nPO Number:          {po.po_number}")
        print(f"Status:             {po.status}")
        print(f"Supplier ID:        {po.supplier_id}")
        print(f"Required Date:      {po.required_date}")
        print(f"Currency:           {po.currency_code}")
        print(f"Payment Terms:      {po.payment_terms}")
        print(f"Incoterm:           {po.incoterm}")
        print(f"Freight:            {po.freight_cost}")
        print(f"Insurance:          {po.insurance_cost}")
        print(f"Tax:                {po.tax_cost}")
        print(f"Total:              {po.total_amount}")
        print(
            f"Expected Delivery:  {po.expected_delivery_date}"
        )
        print(
            f"Confirmation:       "
            f"{po.supplier_confirmation_status}"
        )

        # -----------------------------------------------------
        # Validate PO
        # -----------------------------------------------------

        po = validate_purchase_order(
            db=db,
            purchase_order_id=po.id,
        )

        print("\n" + "=" * 80)
        print("PO VALIDATION SUCCESSFUL")
        print("=" * 80)

        print(f"\nPO Number:          {po.po_number}")
        print(f"Status:             {po.status}")
        print(f"Payment Terms:      {po.payment_terms}")
        print(f"Incoterm:           {po.incoterm}")
        print(f"Freight:            {po.freight_cost}")
        print(f"Insurance:          {po.insurance_cost}")
        print(f"Tax:                {po.tax_cost}")
        print(f"Total:              {po.total_amount}")
        print(
            f"Expected Delivery:  "
            f"{po.expected_delivery_date}"
        )

        print("\n" + "=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    main()