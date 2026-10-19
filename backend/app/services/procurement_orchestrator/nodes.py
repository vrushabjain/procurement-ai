from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.services.agent_tools import (
    get_procurement_request,
    get_supply_decision_tool,
    get_supplier_eligibility_tool,
)
from app.services.procurement_orchestrator.state import (
    ProcurementState,
)

from app.services.procurement_orchestrator.sourcing import (
    build_sourcing_decision,
)

from app.services.sourcing_recommendation_service import (
    generate_sourcing_recommendation,
)

from app.services.rfq_service import (
    create_rfq_from_procurement_request,
)

from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem

def load_request_node(
    state: ProcurementState,
    db: Session,
) -> ProcurementState:
    """
    Load the procurement request and validate that
    the requested request/item IDs are available.
    """

    state["current_stage"] = "REQUEST_INTAKE"
    state["status"] = "IN_PROGRESS"
    state["error"] = None

    request_id = UUID(
        state["procurement_request_id"]
    )

    request = get_procurement_request(
        db=db,
        request_id=request_id,
    )

    state["request"] = request

    state["current_stage"] = "REQUEST_VALIDATED"

    return state


def supply_analysis_node(
    state: ProcurementState,
    db: Session,
) -> ProcurementState:
    """
    Run the deterministic supply decision engine.
    """

    state["current_stage"] = "SUPPLY_ANALYSIS"

    request_id = UUID(
        state["procurement_request_id"]
    )

    item_id = UUID(
        state["procurement_request_item_id"]
    )

    supply_decision = get_supply_decision_tool(
        db=db,
        request_id=request_id,
        item_id=item_id,
    )

    state["supply_decision"] = supply_decision

    state["current_stage"] = "SUPPLY_ANALYZED"

    return state


def supplier_eligibility_node(
    state: ProcurementState,
    db: Session,
) -> ProcurementState:
    """
    Determine which approved suppliers are technically
    and commercially eligible for the requested material.
    """

    state["current_stage"] = "SUPPLIER_ELIGIBILITY"

    request_id = UUID(
        state["procurement_request_id"]
    )

    item_id = UUID(
        state["procurement_request_item_id"]
    )

    supplier_eligibility = (
        get_supplier_eligibility_tool(
            db=db,
            request_id=request_id,
            item_id=item_id,
        )
    )

    state["supplier_eligibility"] = (
        supplier_eligibility
    )

    state["current_stage"] = (
        "SUPPLIER_ELIGIBILITY_ANALYZED"
    )

    return state


def finalize_orchestration_node(
    state: ProcurementState,
    db: Session,
) -> ProcurementState:
    """
    Finalize the orchestration at the appropriate human
    decision boundary.

    The orchestrator does not execute consequential
    procurement actions automatically.
    """

    supplier_recommendation = state.get(
        "supplier_recommendation"
    )

    quote_analysis = state.get(
        "quote_analysis"
    )

    # ---------------------------------------------------------
    # Supplier recommendation requires human approval
    # ---------------------------------------------------------

    if supplier_recommendation:

        approval_required = supplier_recommendation.get(
            "approval_required",
            True,
        )

        approval_status = supplier_recommendation.get(
            "approval_status"
        )

        if approval_required:

            state["current_stage"] = (
                "SUPPLIER_RECOMMENDATION_READY"
            )

            state["status"] = (
                "AWAITING_HUMAN_APPROVAL"
            )

            state["ai_recommendation"] = (
                supplier_recommendation
            )

            return state

    # ---------------------------------------------------------
    # RFQ exists but supplier quotes are not ready
    # ---------------------------------------------------------

    if quote_analysis:

        quote_status = quote_analysis.get(
            "status"
        )

        if quote_status in {
            "WAITING_FOR_RFQ_ISSUANCE",
            "NOT_AVAILABLE",
            "NOT_READY",
        }:

            state["current_stage"] = (
                "WAITING_FOR_SUPPLIER_INPUT"
            )

            state["status"] = (
                "WAITING"
            )

            return state

    # ---------------------------------------------------------
    # Nothing requiring further action
    # ---------------------------------------------------------

    state["current_stage"] = (
        "ANALYSIS_COMPLETE"
    )

    state["status"] = (
        "READY_FOR_RECOMMENDATION"
    )

    return state

def sourcing_decision_node(
    state: ProcurementState,
    db: Session,
) -> ProcurementState:
    """
    Build a deterministic sourcing recommendation.

    No procurement action is executed here.
    """

    state["current_stage"] = "SOURCING_ANALYSIS"

    supply_decision = state.get(
        "supply_decision"
    )

    supplier_eligibility = state.get(
        "supplier_eligibility"
    )

    if not supply_decision:
        raise ValueError(
            "Supply decision is required before "
            "sourcing analysis."
        )

    if not supplier_eligibility:
        raise ValueError(
            "Supplier eligibility is required before "
            "sourcing analysis."
        )

    sourcing_recommendation = (
        build_sourcing_decision(
            supply_decision=supply_decision,
            supplier_eligibility=(
                supplier_eligibility
            ),
        )
    )

    state["sourcing_recommendation"] = (
        sourcing_recommendation
    )

    state["current_stage"] = (
        "SOURCING_ANALYSIS_COMPLETE"
    )

    return state

def quote_analysis_node(
    state: ProcurementState,
    db: Session,
) -> ProcurementState:
    """
    Run the existing RFQ / quote evaluation engine.

    This node does not create or modify procurement transactions.
    It only evaluates the existing RFQ and produces a sourcing
    recommendation.
    """

    state["current_stage"] = "QUOTE_ANALYSIS"

    sourcing_recommendation = state.get(
        "sourcing_recommendation"
    )

    if not sourcing_recommendation:
        raise ValueError(
            "Sourcing recommendation is required before "
            "quote analysis."
        )

    external_sourcing_required = (
        sourcing_recommendation.get(
            "external_sourcing_required",
            False,
        )
    )

    # ---------------------------------------------------------
    # Internal-only requirement
    # ---------------------------------------------------------

    if not external_sourcing_required:
        state["quote_analysis"] = {
            "status": "NOT_REQUIRED",
            "reason": (
                "External sourcing is not required because "
                "the requirement can be fulfilled internally."
            ),
        }

        state["supplier_recommendation"] = None
        state["current_stage"] = "QUOTE_ANALYSIS_COMPLETE"

        return state

    # ---------------------------------------------------------
    # Procurement request validation
    # ---------------------------------------------------------

    request = state.get("request")

    if not request:
        raise ValueError(
            "Procurement request is required before "
            "quote analysis."
        )

    items = request.get("items", [])

    if not items:
        raise ValueError(
            "Procurement request contains no items."
        )

    item_id = state["procurement_request_item_id"]

    item = next(
        (
            item
            for item in items
            if item.get("item_id") == item_id
        ),
        None,
    )

    if item is None:
        raise ValueError(
            "Procurement request item could not be found "
            "in the request."
        )

    # ---------------------------------------------------------
    # RFQ validation
    # ---------------------------------------------------------

    rfq = state.get("rfq")

    if not rfq:
        raise ValueError(
            "RFQ state is required before quote analysis."
        )

    rfq_id = rfq.get("rfq_id")

    if not rfq_id:
        state["quote_analysis"] = {
            "status": "NOT_AVAILABLE",
            "reason": (
                "External sourcing is required, but no RFQ "
                "is currently linked to this procurement "
                "request."
            ),
        }

        state["supplier_recommendation"] = None
        state["current_stage"] = "QUOTE_ANALYSIS_PENDING"

        return state

    # ---------------------------------------------------------
    # RFQ still waiting for issuance
    # ---------------------------------------------------------

    if rfq.get("status") == "DRAFT":
        state["quote_analysis"] = {
            "status": "WAITING_FOR_RFQ_ISSUANCE",
            "rfq_id": rfq_id,
            "reason": (
                "RFQ has been created but has not yet been "
                "issued to suppliers."
            ),
        }

        state["supplier_recommendation"] = None
        state["current_stage"] = (
            "WAITING_FOR_RFQ_ISSUANCE"
        )

        return state

    # ---------------------------------------------------------
    # RFQ is issued — evaluate supplier quotes
    # ---------------------------------------------------------

    if rfq.get("status") != "ISSUED":
        state["quote_analysis"] = {
            "status": "NOT_READY",
            "rfq_id": rfq_id,
            "rfq_status": rfq.get("status"),
            "reason": (
                "RFQ is not in ISSUED status and therefore "
                "cannot proceed to quote evaluation."
            ),
        }

        state["supplier_recommendation"] = None
        state["current_stage"] = "QUOTE_ANALYSIS_PENDING"

        return state

    recommendation = (
        generate_sourcing_recommendation(
            db=db,
            rfq_id=UUID(str(rfq_id)),
        )
    )

    recommendation_data = (
        recommendation.model_dump(mode="json")
    )

    state["quote_analysis"] = {
        "status": "COMPLETE",
        "rfq_id": str(rfq_id),
        "recommendation": recommendation_data,
    }

    state["supplier_recommendation"] = (
        recommendation_data
    )

    state["current_stage"] = (
        "QUOTE_ANALYSIS_COMPLETE"
    )

    return state


def create_rfq_node(
    state: ProcurementState,
    db: Session,
) -> ProcurementState:
    """
    Create an RFQ for the externally required quantity.

    If an RFQ already exists for the procurement request item,
    retrieve and reuse it instead of treating the situation
    as an orchestration failure.
    """

    state["current_stage"] = "RFQ_GENERATION"

    sourcing_recommendation = state.get(
        "sourcing_recommendation"
    )

    if not sourcing_recommendation:
        raise ValueError(
            "Sourcing recommendation is required before "
            "RFQ generation."
        )

    external_sourcing_required = (
        sourcing_recommendation.get(
            "external_sourcing_required",
            False,
        )
    )

    if not external_sourcing_required:
        state["rfq"] = {
            "status": "NOT_REQUIRED",
            "reason": (
                "External sourcing is not required."
            ),
        }

        state["rfq_status"] = "NOT_REQUIRED"
        state["current_stage"] = "RFQ_NOT_REQUIRED"

        return state

    request_id = UUID(
        state["procurement_request_id"]
    )

    item_id = UUID(
        state["procurement_request_item_id"]
    )

    try:
        rfq = create_rfq_from_procurement_request(
            db=db,
            procurement_request_id=request_id,
            procurement_request_item_id=item_id,
        )

    except ValueError as exc:

        error_message = str(exc)

        # -----------------------------------------------------
        # Existing RFQ
        # -----------------------------------------------------
        if "An RFQ already exists" in error_message:

            existing_rfq = (
                db.scalar(
                    select(RFQ)
                    .join(
                        RFQItem,
                        RFQItem.rfq_id == RFQ.id,
                    )
                    .where(
                        RFQItem.procurement_request_item_id
                        == item_id
                    )
                )
            )

            if not existing_rfq:
                raise ValueError(
                    "An existing RFQ was reported, but it "
                    "could not be retrieved."
                )

            state["rfq"] = {
                "rfq_id": str(existing_rfq.id),
                "rfq_number": existing_rfq.rfq_number,
                "status": existing_rfq.status,
                "issue_date": (
                    existing_rfq.issue_date.isoformat()
                    if existing_rfq.issue_date
                    else None
                ),
                "response_due_date": (
                    existing_rfq.response_due_date.isoformat()
                    if existing_rfq.response_due_date
                    else None
                ),
                "currency_code": (
                    existing_rfq.currency_code
                ),
                "delivery_location_id": (
                    str(existing_rfq.delivery_location_id)
                    if existing_rfq.delivery_location_id
                    else None
                ),
                "reused_existing": True,
            }

            state["rfq_status"] = existing_rfq.status

            state["current_stage"] = (
                "RFQ_REUSED"
            )

            return state

        raise

    # ---------------------------------------------------------
    # Newly created RFQ
    # ---------------------------------------------------------

    state["rfq"] = {
        "rfq_id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "status": rfq.status,
        "issue_date": (
            rfq.issue_date.isoformat()
            if rfq.issue_date
            else None
        ),
        "response_due_date": (
            rfq.response_due_date.isoformat()
            if rfq.response_due_date
            else None
        ),
        "currency_code": rfq.currency_code,
        "delivery_location_id": (
            str(rfq.delivery_location_id)
            if rfq.delivery_location_id
            else None
        ),
        "reused_existing": False,
    }

    state["rfq_status"] = rfq.status

    state["current_stage"] = "RFQ_GENERATED"

    return state