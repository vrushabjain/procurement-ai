from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class QuoteEvaluationResult(BaseModel):
    quote_id: UUID
    supplier_id: UUID
    supplier_code: str
    supplier_name: str

    quoted_quantity: Decimal
    unit_price: Decimal

    material_value: Decimal
    freight_cost: Decimal
    insurance_cost: Decimal
    tax_cost: Decimal

    landed_cost: Decimal

    lead_time_days: int
    expected_delivery_date: str
    required_date: str
    days_early_or_late: int
    meets_required_date: bool

    technical_compliance: bool
    quality_compliance: bool

    payment_terms: str | None
    incoterm: str | None

    technical_score: Decimal
    quality_score: Decimal
    delivery_score: Decimal
    commercial_score: Decimal
    overall_score: Decimal

    eligible_for_recommendation: bool
    evaluation_flags: list[str]


class QuoteEvaluationResponse(BaseModel):
    rfq_id: UUID
    rfq_number: str

    required_date: str
    evaluated_quote_count: int

    results: list[QuoteEvaluationResult]