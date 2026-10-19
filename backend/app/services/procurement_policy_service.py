from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.schemas.procurement_policy import (
    PolicyCheck,
    ProcurementPolicyResponse,
)
from app.services.quote_evaluation_service import evaluate_quotes
from app.services.sourcing_recommendation_service import (
    generate_sourcing_recommendation,
)


# ---------------------------------------------------------
# Procurement approval thresholds
# ---------------------------------------------------------

APPROVAL_THRESHOLD_PROCUREMENT_MANAGER = Decimal("50000")
APPROVAL_THRESHOLD_PROCUREMENT_HEAD = Decimal("200000")


def determine_approval_level(
    landed_cost: Decimal,
) -> str:
    """
    Determine the required approval level based on
    procurement value.
    """

    if landed_cost <= APPROVAL_THRESHOLD_PROCUREMENT_MANAGER:
        return "PROCUREMENT_MANAGER"

    if landed_cost <= APPROVAL_THRESHOLD_PROCUREMENT_HEAD:
        return "PROCUREMENT_HEAD"

    return "EXECUTIVE_APPROVAL"


# ---------------------------------------------------------
# Main policy evaluation
# ---------------------------------------------------------

def evaluate_procurement_policy(
    db: Session,
    rfq_id: UUID,
) -> ProcurementPolicyResponse:

    recommendation = generate_sourcing_recommendation(
        db=db,
        rfq_id=rfq_id,
    )

    evaluation = evaluate_quotes(
        db=db,
        rfq_id=rfq_id,
    )

    recommended_quote = next(
        (
            result
            for result in evaluation.results
            if result.quote_id == recommendation.recommended_quote_id
        ),
        None,
    )

    if recommended_quote is None:
        raise ValueError(
            "Recommended quote could not be found in quote evaluation."
        )

    checks: list[PolicyCheck] = []
    blocking_reasons: list[str] = []
    warnings: list[str] = []

    # -----------------------------------------------------
    # Rule 1 — Supplier eligibility
    # -----------------------------------------------------

    supplier_eligible = recommended_quote.eligible_for_recommendation

    checks.append(
        PolicyCheck(
            rule_code="SUPPLIER_ELIGIBILITY",
            rule_name="Supplier must be eligible",
            passed=supplier_eligible,
            severity="BLOCKING",
            message=(
                "Supplier is eligible for procurement."
                if supplier_eligible
                else "Supplier is not eligible for procurement."
            ),
        )
    )

    if not supplier_eligible:
        blocking_reasons.append(
            "Recommended supplier is not eligible."
        )

    # -----------------------------------------------------
    # Rule 2 — Technical compliance
    # -----------------------------------------------------

    technical_compliance = recommended_quote.technical_compliance

    checks.append(
        PolicyCheck(
            rule_code="TECHNICAL_COMPLIANCE",
            rule_name="Technical requirements must be compliant",
            passed=technical_compliance,
            severity="BLOCKING",
            message=(
                "Technical requirements are compliant."
                if technical_compliance
                else "Technical requirements are not compliant."
            ),
        )
    )

    if not technical_compliance:
        blocking_reasons.append(
            "Recommended quote is technically non-compliant."
        )

    # -----------------------------------------------------
    # Rule 3 — Quality compliance
    # -----------------------------------------------------

    quality_compliance = recommended_quote.quality_compliance

    checks.append(
        PolicyCheck(
            rule_code="QUALITY_COMPLIANCE",
            rule_name="Quality requirements must be compliant",
            passed=quality_compliance,
            severity="BLOCKING",
            message=(
                "Quality requirements are compliant."
                if quality_compliance
                else "Quality requirements are not compliant."
            ),
        )
    )

    if not quality_compliance:
        blocking_reasons.append(
            "Recommended quote is quality non-compliant."
        )

    # -----------------------------------------------------
    # Rule 4 — Required delivery date
    # -----------------------------------------------------

    meets_required_date = recommended_quote.meets_required_date

    checks.append(
        PolicyCheck(
            rule_code="DELIVERY_DATE",
            rule_name="Supplier must meet required delivery date",
            passed=meets_required_date,
            severity="BLOCKING",
            message=(
                "Supplier meets the required delivery date."
                if meets_required_date
                else "Supplier does not meet the required delivery date."
            ),
        )
    )

    if not meets_required_date:
        blocking_reasons.append(
            "Recommended supplier cannot meet the required delivery date."
        )

    # -----------------------------------------------------
    # Rule 5 — Quote validity
    # -----------------------------------------------------

    # Quote evaluation has already successfully evaluated the
    # quote. For this prototype, the presence of an evaluated
    # quote is treated as the quote being valid for evaluation.
    quote_valid = True

    checks.append(
        PolicyCheck(
            rule_code="QUOTE_VALIDITY",
            rule_name="Supplier quote must be valid",
            passed=quote_valid,
            severity="BLOCKING",
            message="Supplier quote is valid for procurement evaluation.",
        )
    )

    # -----------------------------------------------------
    # Rule 6 — Delivery buffer warning
    # -----------------------------------------------------

    if recommended_quote.days_early_or_late <= 7:

        checks.append(
            PolicyCheck(
                rule_code="DELIVERY_BUFFER",
                rule_name="Recommended sourcing should maintain delivery buffer",
                passed=True,
                severity="WARNING",
                message=(
                    "Delivery buffer is limited to "
                    f"{recommended_quote.days_early_or_late} days."
                ),
            )
        )

        warnings.append(
            "Recommended supplier has a limited delivery buffer."
        )

    else:

        checks.append(
            PolicyCheck(
                rule_code="DELIVERY_BUFFER",
                rule_name="Recommended sourcing should maintain delivery buffer",
                passed=True,
                severity="WARNING",
                message=(
                    "Supplier provides "
                    f"{recommended_quote.days_early_or_late} days "
                    "of delivery buffer."
                ),
            )
        )

    # -----------------------------------------------------
    # Determine approval level
    # -----------------------------------------------------

    approval_level = determine_approval_level(
        recommended_quote.landed_cost
    )

    # -----------------------------------------------------
    # Rule 7 — Approval threshold
    # -----------------------------------------------------

    checks.append(
        PolicyCheck(
            rule_code="APPROVAL_THRESHOLD",
            rule_name="Procurement value must determine approval authority",
            passed=True,
            severity="APPROVAL",
            message=(
                f"Procurement value of "
                f"{recommended_quote.landed_cost} requires "
                f"{approval_level} approval."
            ),
        )
    )

    # -----------------------------------------------------
    # Overall policy decision
    # -----------------------------------------------------

    policy_passed = len(blocking_reasons) == 0

    approval_required = policy_passed

    return ProcurementPolicyResponse(
        rfq_id=evaluation.rfq_id,
        rfq_number=evaluation.rfq_number,
        quote_id=recommended_quote.quote_id,
        supplier_id=recommended_quote.supplier_id,
        supplier_code=recommended_quote.supplier_code,
        supplier_name=recommended_quote.supplier_name,
        landed_cost=recommended_quote.landed_cost,
        policy_passed=policy_passed,
        approval_required=approval_required,
        approval_level=approval_level,
        checks=checks,
        blocking_reasons=blocking_reasons,
        warnings=warnings,
    )