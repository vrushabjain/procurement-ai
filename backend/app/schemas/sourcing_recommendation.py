from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SourcingAlternative(BaseModel):
    quote_id: UUID
    supplier_id: UUID
    supplier_code: str
    supplier_name: str

    landed_cost: Decimal
    lead_time_days: int
    expected_delivery_date: str
    days_early_or_late: int
    overall_score: Decimal

    trade_offs: list[str]


class SourcingRecommendationResponse(BaseModel):
    rfq_id: UUID
    rfq_number: str

    recommended_quote_id: UUID
    recommended_supplier_id: UUID
    recommended_supplier_code: str
    recommended_supplier_name: str

    recommended_quantity: Decimal
    landed_cost: Decimal
    expected_delivery_date: str
    days_early_or_late: int
    overall_score: Decimal

    recommendation_reason: list[str]
    risk_flags: list[str]

    alternatives: list[SourcingAlternative]

    approval_required: bool
    approval_status: str