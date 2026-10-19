from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models.country import Country
from app.models.project import Project
from app.models.location import Location
from app.models.warehouse import Warehouse
from app.models.material import Material
from app.models.supplier import Supplier
from app.models.inventory import Inventory
from app.models.inventory_commitment import InventoryCommitment


def get_or_create(db, model, lookup_field, lookup_value, **values):
    """
    Find an existing record by a unique field.
    Create it if it doesn't exist.
    """

    record = db.scalar(
        select(model).where(
            getattr(model, lookup_field) == lookup_value
        )
    )

    if record:
        return record

    record = model(**values)
    db.add(record)
    db.flush()

    return record


def seed_data():

    db = SessionLocal()

    try:

        # ---------------------------------------------------------
        # 1. COUNTRIES
        # ---------------------------------------------------------

        saudi_arabia = get_or_create(
            db,
            Country,
            "code",
            "SA",
            code="SA",
            name="Saudi Arabia",
            currency_code="SAR",
            is_active=True,
        )

        uae = get_or_create(
            db,
            Country,
            "code",
            "AE",
            code="AE",
            name="United Arab Emirates",
            currency_code="AED",
            is_active=True,
        )

        # ---------------------------------------------------------
        # 2. PROJECTS
        # ---------------------------------------------------------

        project_pe104 = get_or_create(
            db,
            Project,
            "project_code",
            "PE-104",
            project_code="PE-104",
            project_name="Saudi Gas Processing Expansion",
            country_id=saudi_arabia.id,
            project_manager="Ahmed Al-Hassan",
            status="ACTIVE",
            start_date=date(2026, 1, 15),
            end_date=date(2028, 12, 31),
        )

        project_pe105 = get_or_create(
            db,
            Project,
            "project_code",
            "PE-105",
            project_code="PE-105",
            project_name="UAE Petrochemical Expansion",
            country_id=uae.id,
            project_manager="Omar Khalid",
            status="ACTIVE",
            start_date=date(2026, 3, 1),
            end_date=date(2028, 6, 30),
        )

        # ---------------------------------------------------------
        # 3. LOCATIONS
        # ---------------------------------------------------------

        riyadh_location = get_or_create(
            db,
            Location,
            "location_code",
            "LOC-RYD-01",
            location_code="LOC-RYD-01",
            location_name="Riyadh Project Logistics Hub",
            location_type="WAREHOUSE",
            city="Riyadh",
            country_code="SA",
            is_active=True,
        )

        dubai_location = get_or_create(
            db,
            Location,
            "location_code",
            "LOC-DXB-01",
            location_code="LOC-DXB-01",
            location_name="Dubai Central Logistics Hub",
            location_type="WAREHOUSE",
            city="Dubai",
            country_code="AE",
            is_active=True,
        )

        # ---------------------------------------------------------
        # 4. WAREHOUSES
        # ---------------------------------------------------------

        riyadh_warehouse = get_or_create(
            db,
            Warehouse,
            "warehouse_code",
            "WH-RYD-01",
            warehouse_code="WH-RYD-01",
            warehouse_name="Riyadh Central Warehouse",
            location_id=riyadh_location.id,
            is_active=True,
        )

        dubai_warehouse = get_or_create(
            db,
            Warehouse,
            "warehouse_code",
            "WH-DXB-01",
            warehouse_code="WH-DXB-01",
            warehouse_name="Dubai Central Warehouse",
            location_id=dubai_location.id,
            is_active=True,
        )

        # ---------------------------------------------------------
        # 5. MATERIALS
        # ---------------------------------------------------------

        valve = get_or_create(
            db,
            Material,
            "material_code",
            "VAL-API6D-600-CS",
            material_code="VAL-API6D-600-CS",
            material_name="API 6D Class 600 Carbon Steel Valve",
            category="VALVES",
            description=(
                "API 6D Class 600 carbon steel process valve"
            ),
            base_uom="EA",
            is_active=True,
        )

        flange = get_or_create(
            db,
            Material,
            "material_code",
            "FLG-CS-600",
            material_code="FLG-CS-600",
            material_name="Carbon Steel Flange Class 600",
            category="FLANGES",
            description="Carbon steel process flange",
            base_uom="EA",
            is_active=True,
        )

        gasket = get_or_create(
            db,
            Material,
            "material_code",
            "GSK-SPW-600",
            material_code="GSK-SPW-600",
            material_name="Spiral Wound Gasket Class 600",
            category="GASKETS",
            description="Spiral wound process gasket",
            base_uom="EA",
            is_active=True,
        )

        # ---------------------------------------------------------
        # 6. SUPPLIERS
        # ---------------------------------------------------------

        supplier_a = get_or_create(
            db,
            Supplier,
            "supplier_code",
            "SUP-001",
            supplier_code="SUP-001",
            supplier_name="Gulf Valve Industries",
            country_code="SA",
            supplier_type="MANUFACTURER",
            status="ACTIVE",
            quality_score=Decimal("94.00"),
            delivery_score=Decimal("91.00"),
            is_approved=True,
        )

        supplier_b = get_or_create(
            db,
            Supplier,
            "supplier_code",
            "SUP-002",
            supplier_code="SUP-002",
            supplier_name="Emirates Process Equipment",
            country_code="AE",
            supplier_type="MANUFACTURER",
            status="ACTIVE",
            quality_score=Decimal("96.00"),
            delivery_score=Decimal("87.00"),
            is_approved=True,
        )

        supplier_c = get_or_create(
            db,
            Supplier,
            "supplier_code",
            "SUP-003",
            supplier_code="SUP-003",
            supplier_name="Global Industrial Valves",
            country_code="SA",
            supplier_type="DISTRIBUTOR",
            status="ACTIVE",
            quality_score=Decimal("89.00"),
            delivery_score=Decimal("95.00"),
            is_approved=True,
        )

        # ---------------------------------------------------------
        # 7. INVENTORY
        # ---------------------------------------------------------

        valve_inventory_riyadh = db.scalar(
            select(Inventory).where(
                Inventory.warehouse_id == riyadh_warehouse.id,
                Inventory.material_id == valve.id,
            )
        )

        if not valve_inventory_riyadh:
            valve_inventory_riyadh = Inventory(
                warehouse_id=riyadh_warehouse.id,
                material_id=valve.id,
                quantity_on_hand=Decimal("1500"),
                unit_cost=Decimal("1250.00"),
            )
            db.add(valve_inventory_riyadh)
            db.flush()

        valve_inventory_dubai = db.scalar(
            select(Inventory).where(
                Inventory.warehouse_id == dubai_warehouse.id,
                Inventory.material_id == valve.id,
            )
        )

        if not valve_inventory_dubai:
            valve_inventory_dubai = Inventory(
                warehouse_id=dubai_warehouse.id,
                material_id=valve.id,
                quantity_on_hand=Decimal("800"),
                unit_cost=Decimal("1180.00"),
            )
            db.add(valve_inventory_dubai)
            db.flush()

        # ---------------------------------------------------------
        # 8. INVENTORY COMMITMENTS
        # ---------------------------------------------------------

        existing_commitment = db.scalar(
            select(InventoryCommitment).where(
                InventoryCommitment.inventory_id
                == valve_inventory_riyadh.id
            )
        )

        if not existing_commitment:

            db.add(
                InventoryCommitment(
                    inventory_id=valve_inventory_riyadh.id,
                    project_id=project_pe105.id,
                    quantity=Decimal("300"),
                    commitment_type="PROJECT_ALLOCATION",
                    status="ACTIVE",
                    required_date=date(2026, 10, 30),
                    reference_number="ALLOC-PE105-001",
                )
            )

            db.add(
                InventoryCommitment(
                    inventory_id=valve_inventory_riyadh.id,
                    project_id=project_pe104.id,
                    quantity=Decimal("200"),
                    commitment_type="PROJECT_ALLOCATION",
                    status="ACTIVE",
                    required_date=date(2026, 11, 5),
                    reference_number="ALLOC-PE104-001",
                )
            )

        db.commit()

        print("")
        print("==============================================")
        print("Procurement AI seed data created successfully")
        print("==============================================")
        print("")
        print("Project:")
        print("  PE-104 - Saudi Gas Processing Expansion")
        print("")
        print("Material:")
        print("  VAL-API6D-600-CS")
        print("  API 6D Class 600 Carbon Steel Valve")
        print("")
        print("Riyadh inventory:")
        print("  Physical quantity: 1,500")
        print("  Committed: 500")
        print("  Available-to-Promise: 1,000")
        print("")
        print("Suppliers:")
        print("  SUP-001 - Gulf Valve Industries")
        print("  SUP-002 - Emirates Process Equipment")
        print("  SUP-003 - Global Industrial Valves")
        print("")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()