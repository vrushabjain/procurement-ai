from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PolicyCheck(BaseModel):
    rule_code: str
    rule_name: str
    passed: bool
    severity: str
    message: str


class ProcurementPolicyResponse(BaseModel):
    rfq_id: UUID
    rfq_number: str

    quote_id: UUID
    supplier_id: UUID
    supplier_code: str
    supplier_name: str

    landed_cost: Decimal

    policy_passed: bool
    approval_required: bool
    approval_level: str

    checks: list[PolicyCheck]
    blocking_reasons: list[str]
    warnings: list[str]