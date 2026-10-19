from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.schemas.sourcing_recommendation import (
    SourcingAlternative,
    SourcingRecommendationResponse,
)
from app.services.quote_evaluation_service import evaluate_quotes


def generate_sourcing_recommendation(
    db: Session,
    rfq_id: UUID,
) -> SourcingRecommendationResponse:

    # ---------------------------------------------------------
    # 1. Evaluate all supplier quotes
    # ---------------------------------------------------------

    evaluation = evaluate_quotes(
        db=db,
        rfq_id=rfq_id,
    )

    # ---------------------------------------------------------
    # 2. Keep only quotes that pass all hard gates
    # ---------------------------------------------------------

    eligible_results = [
        result
        for result in evaluation.results
        if result.eligible_for_recommendation
    ]

    if not eligible_results:
        raise ValueError(
            f"No eligible supplier quotes available for "
            f"RFQ {evaluation.rfq_number}."
        )

    # ---------------------------------------------------------
    # 3. Select highest-scoring eligible quote
    # ---------------------------------------------------------

    recommended = max(
        eligible_results,
        key=lambda result: result.overall_score,
    )

    # ---------------------------------------------------------
    # 4. Build recommendation reasons
    # ---------------------------------------------------------

    recommendation_reason: list[str] = []

    recommendation_reason.append(
        f"Highest overall evaluation score among eligible quotes: "
        f"{recommended.overall_score}."
    )

    recommendation_reason.append(
        f"Landed cost is "
        f"{recommended.landed_cost}."
    )

    recommendation_reason.append(
        f"Expected delivery is "
        f"{recommended.expected_delivery_date}, "
        f"which is "
        f"{recommended.days_early_or_late} days before "
        f"the required date."
    )

    if recommended.technical_compliance:
        recommendation_reason.append(
            "Technical requirements are fully compliant."
        )

    if recommended.quality_compliance:
        recommendation_reason.append(
            "Quality requirements are fully compliant."
        )

    # ---------------------------------------------------------
    # 5. Identify risks
    # ---------------------------------------------------------

    risk_flags: list[str] = []

    if recommended.days_early_or_late <= 7:
        risk_flags.append(
            "Limited delivery buffer before the required date."
        )

    if recommended.commercial_score < Decimal("95"):
        risk_flags.append(
            "Commercial score is below 95 due to higher landed cost "
            "relative to the lowest evaluated quote."
        )

    # ---------------------------------------------------------
    # 6. Build alternatives
    # ---------------------------------------------------------

    alternatives: list[SourcingAlternative] = []

    for result in eligible_results:

        if result.quote_id == recommended.quote_id:
            continue

        trade_offs: list[str] = []

        if result.landed_cost < recommended.landed_cost:
            trade_offs.append(
                f"Lower landed cost by "
                f"{recommended.landed_cost - result.landed_cost}."
            )

        elif result.landed_cost > recommended.landed_cost:
            trade_offs.append(
                f"Higher landed cost by "
                f"{result.landed_cost - recommended.landed_cost}."
            )

        if result.days_early_or_late > recommended.days_early_or_late:
            trade_offs.append(
                f"Provides "
                f"{result.days_early_or_late - recommended.days_early_or_late} "
                f"additional days of delivery buffer."
            )

        elif result.days_early_or_late < recommended.days_early_or_late:
            trade_offs.append(
                f"Provides "
                f"{recommended.days_early_or_late - result.days_early_or_late} "
                f"fewer days of delivery buffer."
            )

        if result.overall_score < recommended.overall_score:
            trade_offs.append(
                f"Overall evaluation score is "
                f"{recommended.overall_score - result.overall_score} "
                f"points lower."
            )

        alternatives.append(
            SourcingAlternative(
                quote_id=result.quote_id,
                supplier_id=result.supplier_id,
                supplier_code=result.supplier_code,
                supplier_name=result.supplier_name,
                landed_cost=result.landed_cost,
                lead_time_days=result.lead_time_days,
                expected_delivery_date=result.expected_delivery_date,
                days_early_or_late=result.days_early_or_late,
                overall_score=result.overall_score,
                trade_offs=trade_offs,
            )
        )

    # ---------------------------------------------------------
    # 7. Recommendation requires human approval
    # ---------------------------------------------------------

    approval_required = True
    approval_status = "PENDING"

    # ---------------------------------------------------------
    # 8. Return recommendation
    # ---------------------------------------------------------

    return SourcingRecommendationResponse(
        rfq_id=evaluation.rfq_id,
        rfq_number=evaluation.rfq_number,

        recommended_quote_id=recommended.quote_id,
        recommended_supplier_id=recommended.supplier_id,
        recommended_supplier_code=recommended.supplier_code,
        recommended_supplier_name=recommended.supplier_name,

        recommended_quantity=recommended.quoted_quantity,
        landed_cost=recommended.landed_cost,
        expected_delivery_date=recommended.expected_delivery_date,
        days_early_or_late=recommended.days_early_or_late,
        overall_score=recommended.overall_score,

        recommendation_reason=recommendation_reason,
        risk_flags=risk_flags,

        alternatives=alternatives,

        approval_required=approval_required,
        approval_status=approval_status,
    )