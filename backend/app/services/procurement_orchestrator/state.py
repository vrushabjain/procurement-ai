from typing import Any, TypedDict


class ProcurementState(TypedDict, total=False):
    procurement_request_id: str
    procurement_request_item_id: str

    request: dict[str, Any]
    requirement_analysis: dict[str, Any]

    supply_decision: dict[str, Any]
    supplier_eligibility: dict[str, Any]

    sourcing_recommendation: dict[str, Any]

    # RFQ / Quote intelligence
    rfq: dict[str, Any]
    rfq_status: str

    quote_analysis: dict[str, Any]
    supplier_recommendation: dict[str, Any]

    risk_assessment: dict[str, Any]

    ai_recommendation: dict[str, Any]
    ai_reasoning: str | None

    authorization: dict[str, Any]
    execution_result: dict[str, Any]

    exceptions: list[dict[str, Any]]

    current_stage: str
    status: str
    error: str | None