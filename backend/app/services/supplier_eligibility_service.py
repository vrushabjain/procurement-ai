from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.material import Material
from app.models.procurement_request import ProcurementRequest
from app.models.procurement_request_item import ProcurementRequestItem
from app.models.supplier import Supplier
from app.models.supplier_material_qualification import (
    SupplierMaterialQualification,
)
from app.schemas.supplier_eligibility import (
    SupplierEligibilityResponse,
    SupplierEligibilityResult,
)


def get_supplier_eligibility(
    db: Session,
    procurement_request_id,
    procurement_request_item_id,
) -> SupplierEligibilityResponse:

    # ---------------------------------------------------------
    # 1. Validate procurement request
    # ---------------------------------------------------------

    procurement_request = db.scalar(
        select(ProcurementRequest).where(
            ProcurementRequest.id == procurement_request_id
        )
    )

    if not procurement_request:
        raise ValueError(
            f"Procurement request not found: {procurement_request_id}"
        )

    # ---------------------------------------------------------
    # 2. Get procurement request item
    # ---------------------------------------------------------

    item = db.scalar(
        select(ProcurementRequestItem).where(
            ProcurementRequestItem.id == procurement_request_item_id,
            ProcurementRequestItem.procurement_request_id
            == procurement_request_id,
        )
    )

    if not item:
        raise ValueError(
            f"Procurement request item not found: "
            f"{procurement_request_item_id}"
        )

    # ---------------------------------------------------------
    # 3. Get material
    # ---------------------------------------------------------

    material = db.scalar(
        select(Material).where(
            Material.id == item.material_id
        )
    )

    if not material:
        raise ValueError(
            f"Material not found: {item.material_id}"
        )

    # ---------------------------------------------------------
    # 4. Get all suppliers
    # ---------------------------------------------------------

    suppliers = db.scalars(
        select(Supplier).order_by(
            Supplier.supplier_code
        )
    ).all()

    results: list[SupplierEligibilityResult] = []

    now = datetime.now(timezone.utc)

    # ---------------------------------------------------------
    # 5. Evaluate every supplier
    # ---------------------------------------------------------

    for supplier in suppliers:

        exclusion_reasons: list[str] = []

        supplier_approved = bool(supplier.is_approved)

        if not supplier_approved:
            exclusion_reasons.append(
                "Supplier is not approved."
            )

        # -----------------------------------------------------
        # Find material-specific qualification
        # -----------------------------------------------------

        qualification = db.scalar(
            select(SupplierMaterialQualification).where(
                SupplierMaterialQualification.supplier_id
                == supplier.id,
                SupplierMaterialQualification.material_id
                == material.id,
            )
        )

        qualification_found = qualification is not None

        if not qualification_found:
            exclusion_reasons.append(
                "No material-specific qualification exists."
            )

        qualification_status = (
            qualification.qualification_status
            if qualification
            else None
        )

        technical_approval = (
            bool(qualification.technical_approval)
            if qualification
            else False
        )

        quality_approval = (
            bool(qualification.quality_approval)
            if qualification
            else False
        )

        qualification_valid_until = (
            qualification.valid_until
            if qualification
            else None
        )

        if qualification and qualification_status != "QUALIFIED":
            exclusion_reasons.append(
                f"Qualification status is "
                f"{qualification_status}, not QUALIFIED."
            )

        if qualification and not technical_approval:
            exclusion_reasons.append(
                "Technical approval is not valid."
            )

        if qualification and not quality_approval:
            exclusion_reasons.append(
                "Quality approval is not valid."
            )

        # -----------------------------------------------------
        # Qualification expiry
        # -----------------------------------------------------

        if (
            qualification
            and qualification.valid_until is not None
            and qualification.valid_until < now
        ):
            exclusion_reasons.append(
                "Material qualification has expired."
            )

        # -----------------------------------------------------
        # Final eligibility decision
        # -----------------------------------------------------

        eligible = (
            supplier_approved
            and qualification_found
            and qualification_status == "QUALIFIED"
            and technical_approval
            and quality_approval
            and not (
                qualification
                and qualification.valid_until is not None
                and qualification.valid_until < now
            )
        )

        results.append(
            SupplierEligibilityResult(
                supplier_id=supplier.id,
                supplier_code=supplier.supplier_code,
                supplier_name=supplier.supplier_name,
                supplier_approved=supplier_approved,
                qualification_found=qualification_found,
                qualification_status=qualification_status,
                technical_approval=technical_approval,
                quality_approval=quality_approval,
                qualification_valid_until=qualification_valid_until,
                eligible=eligible,
                exclusion_reasons=exclusion_reasons,
            )
        )

    # ---------------------------------------------------------
    # 6. Separate eligible suppliers
    # ---------------------------------------------------------

    eligible_suppliers = [
        result
        for result in results
        if result.eligible
    ]

    # ---------------------------------------------------------
    # 7. Return response
    # ---------------------------------------------------------

    return SupplierEligibilityResponse(
        procurement_request_id=procurement_request_id,
        procurement_request_item_id=procurement_request_item_id,
        material_id=material.id,
        material_code=material.material_code,
        material_name=material.material_name,
        eligible_supplier_count=len(eligible_suppliers),
        eligible_suppliers=eligible_suppliers,
        evaluated_suppliers=results,
    )