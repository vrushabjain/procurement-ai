from datetime import datetime, timezone

from sqlalchemy import select

from app.database import SessionLocal
from app.models.material import Material
from app.models.supplier import Supplier
from app.models.supplier_material_qualification import SupplierMaterialQualification


QUALIFICATIONS = [
    {
        "supplier_code": "SUP-001",
        "material_code": "VAL-API6D-600-CS",
        "qualification_status": "QUALIFIED",
        "technical_approval": True,
        "quality_approval": True,
        "qualification_reference": "VAL-QA-001",
        "remarks": "Approved manufacturer for API 6D Class 600 carbon steel valves.",
    },
    {
        "supplier_code": "SUP-002",
        "material_code": "VAL-API6D-600-CS",
        "qualification_status": "QUALIFIED",
        "technical_approval": True,
        "quality_approval": True,
        "qualification_reference": "VAL-QA-002",
        "remarks": "Technically and quality approved for project valve specification.",
    },
    {
        "supplier_code": "SUP-003",
        "material_code": "VAL-API6D-600-CS",
        "qualification_status": "QUALIFIED",
        "technical_approval": True,
        "quality_approval": False,
        "qualification_reference": "VAL-QA-003",
        "remarks": "Technical approval available, but current quality approval is not valid.",
    },
]


def seed_supplier_qualifications():
    db = SessionLocal()

    try:
        created = 0
        updated = 0

        for record in QUALIFICATIONS:

            supplier = db.scalar(
                select(Supplier).where(
                    Supplier.supplier_code == record["supplier_code"]
                )
            )

            if not supplier:
                raise ValueError(
                    f"Supplier not found: {record['supplier_code']}"
                )

            material = db.scalar(
                select(Material).where(
                    Material.material_code == record["material_code"]
                )
            )

            if not material:
                raise ValueError(
                    f"Material not found: {record['material_code']}"
                )

            qualification = db.scalar(
                select(SupplierMaterialQualification).where(
                    SupplierMaterialQualification.supplier_id == supplier.id,
                    SupplierMaterialQualification.material_id == material.id,
                )
            )

            if qualification:
                qualification.qualification_status = record[
                    "qualification_status"
                ]
                qualification.technical_approval = record[
                    "technical_approval"
                ]
                qualification.quality_approval = record[
                    "quality_approval"
                ]
                qualification.qualification_reference = record[
                    "qualification_reference"
                ]
                qualification.remarks = record["remarks"]

                updated += 1

            else:
                qualification = SupplierMaterialQualification(
                    supplier_id=supplier.id,
                    material_id=material.id,
                    qualification_status=record["qualification_status"],
                    technical_approval=record["technical_approval"],
                    quality_approval=record["quality_approval"],
                    qualification_reference=record[
                        "qualification_reference"
                    ],
                    remarks=record["remarks"],
                    valid_until=None,
                    created_at=datetime.now(timezone.utc),
                )

                db.add(qualification)
                created += 1

        db.commit()

        print("Supplier qualification seed completed.")
        print(f"Created: {created}")
        print(f"Updated: {updated}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_supplier_qualifications()