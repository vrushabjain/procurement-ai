from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SupplierEligibilityResult(BaseModel):
    supplier_id: UUID
    supplier_code: str
    supplier_name: str

    supplier_approved: bool
    qualification_found: bool
    qualification_status: str | None

    technical_approval: bool
    quality_approval: bool

    qualification_valid_until: datetime | None

    eligible: bool
    exclusion_reasons: list[str]


class SupplierEligibilityResponse(BaseModel):
    procurement_request_id: UUID
    procurement_request_item_id: UUID

    material_id: UUID
    material_code: str
    material_name: str

    eligible_supplier_count: int
    eligible_suppliers: list[SupplierEligibilityResult]

    evaluated_suppliers: list[SupplierEligibilityResult]