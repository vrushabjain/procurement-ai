from decimal import Decimal
from typing import Any


def build_sourcing_decision(
    supply_decision: dict[str, Any],
    supplier_eligibility: dict[str, Any],
) -> dict[str, Any]:
    """
    Build a deterministic sourcing strategy from the
    supply decision and eligible supplier information.

    This function does not call an LLM and does not
    execute any procurement action.
    """

    decision = supply_decision.get("decision")
    source_type = supply_decision.get("source_type")

    required_quantity = Decimal(
        str(
            supply_decision.get(
                "required_quantity",
                "0",
            )
        )
    )

    recommended_internal_quantity = Decimal(
        str(
            supply_decision.get(
                "recommended_quantity",
                "0",
            )
        )
    )

    shortage_quantity = Decimal(
        str(
            supply_decision.get(
                "shortage_quantity",
                "0",
            )
        )
    )

    eligible_suppliers = (
        supplier_eligibility.get(
            "eligible_suppliers",
            [],
        )
    )

    eligible_supplier_count = len(
        eligible_suppliers
    )

    # ---------------------------------------------------------
    # Determine sourcing strategy
    # ---------------------------------------------------------

    if decision == "FULFILL_INTERNAL":
        strategy = "INTERNAL_ONLY"

    elif decision == "INTERNAL_TRANSFER_REQUIRED":
        strategy = "INTERNAL_TRANSFER_ONLY"

    elif decision == "PARTIAL_INTERNAL_TRANSFER":
        if shortage_quantity > 0:
            strategy = (
                "INTERNAL_TRANSFER_PLUS_EXTERNAL"
            )
        else:
            strategy = "INTERNAL_TRANSFER_ONLY"

    elif decision == "EXTERNAL_SOURCING_REQUIRED":
        strategy = "EXTERNAL_ONLY"

    else:
        strategy = "REVIEW_REQUIRED"

    # ---------------------------------------------------------
    # Determine external sourcing status
    # ---------------------------------------------------------

    if shortage_quantity > 0:
        external_sourcing_required = True
    else:
        external_sourcing_required = False

    # ---------------------------------------------------------
    # Supplier availability
    # ---------------------------------------------------------

    if external_sourcing_required:
        if eligible_supplier_count == 0:
            supplier_status = "NO_ELIGIBLE_SUPPLIER"
        else:
            supplier_status = "ELIGIBLE_SUPPLIERS_AVAILABLE"
    else:
        supplier_status = "NOT_REQUIRED"

    # ---------------------------------------------------------
    # Recommendation status
    # ---------------------------------------------------------

    if strategy == "REVIEW_REQUIRED":
        recommendation_status = "REVIEW_REQUIRED"

    elif (
        external_sourcing_required
        and eligible_supplier_count == 0
    ):
        recommendation_status = "BLOCKED"

    else:
        recommendation_status = "READY_FOR_REVIEW"

    # ---------------------------------------------------------
    # Reason
    # ---------------------------------------------------------

    if strategy == "INTERNAL_ONLY":
        reason = (
            "The requirement can be fulfilled from "
            "available internal inventory."
        )

    elif strategy == "INTERNAL_TRANSFER_ONLY":
        reason = (
            f"Internal inventory can fulfill the "
            f"requirement through warehouse transfer. "
            f"Recommended internal quantity: "
            f"{recommended_internal_quantity}."
        )

    elif strategy == "INTERNAL_TRANSFER_PLUS_EXTERNAL":
        reason = (
            f"Internal transfer can provide "
            f"{recommended_internal_quantity} units, "
            f"leaving {shortage_quantity} units to be "
            f"sourced externally."
        )

    elif strategy == "EXTERNAL_ONLY":
        reason = (
            "Internal inventory cannot fulfill the "
            "requirement. External sourcing is required."
        )

    else:
        reason = (
            "The sourcing situation requires additional "
            "procurement review."
        )

    if (
        external_sourcing_required
        and eligible_supplier_count == 0
    ):
        reason += (
            " No eligible suppliers are currently "
            "available for external sourcing."
        )

    # ---------------------------------------------------------
    # Recommended external quantity
    # ---------------------------------------------------------

    external_quantity = (
        shortage_quantity
        if external_sourcing_required
        else Decimal("0")
    )

    return {
        "strategy": strategy,
        "required_quantity": str(
            required_quantity
        ),
        "internal_quantity": str(
            recommended_internal_quantity
        ),
        "external_quantity": str(
            external_quantity
        ),
        "shortage_quantity": str(
            shortage_quantity
        ),
        "external_sourcing_required": (
            external_sourcing_required
        ),
        "eligible_supplier_count": (
            eligible_supplier_count
        ),
        "supplier_status": supplier_status,
        "recommendation_status": (
            recommendation_status
        ),
        "recommended_supplier": None,
        "reason": reason,
        "requires_human_review": True,
        "action_executed": False,
    }