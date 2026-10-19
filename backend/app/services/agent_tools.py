from uuid import UUID

from sqlalchemy.orm import Session

from app.models.procurement_request import ProcurementRequest

from app.services.supply_decision_service import get_supply_decision


from app.services.supplier_eligibility_service import (
    get_supplier_eligibility,
)

from app.models.procurement_exception import ProcurementException

from app.services.purchase_requisition_service import (
    create_purchase_requisition,
)

from app.services.action_authorization_service import (
    request_action_authorization,
)

def get_procurement_request(
    db: Session,
    request_id: UUID,
) -> dict:
    """
    Read-only agent tool.

    Retrieves a procurement request and its line items.
    Does not modify database state.
    """

    request = (
        db.query(ProcurementRequest)
        .filter(ProcurementRequest.id == request_id)
        .first()
    )

    if not request:
        raise ValueError("Procurement request not found.")

    items = []

    for item in request.items:
        items.append(
            {
                "item_id": str(item.id),
                "material_id": str(item.material_id),
                "quantity": str(item.quantity),
                "uom": item.uom,
                "technical_specification": item.technical_specification,
                "delivery_location_id": (
                    str(item.delivery_location_id)
                    if item.delivery_location_id
                    else None
                ),
                "item_status": item.item_status,
            }
        )

    return {
        "request_id": str(request.id),
        "request_number": request.request_number,
        "project_id": str(request.project_id),
        "requested_by": request.requested_by,
        "request_date": request.request_date.isoformat(),
        "required_date": request.required_date.isoformat(),
        "priority": request.priority,
        "status": request.status,
        "justification": request.justification,
        "items": items,
    }

def get_supply_decision_tool(
    db: Session,
    request_id: UUID,
    item_id: UUID,
) -> dict:
    """
    Read-only agent tool.

    Retrieves the deterministic supply decision for a
    procurement request item.
    """

    decision = get_supply_decision(
        db=db,
        procurement_request_id=request_id,
        procurement_request_item_id=item_id,
    )

    return {
        "procurement_request_id": str(
            decision.procurement_request_id
        ),
        "procurement_request_item_id": str(
            decision.procurement_request_item_id
        ),
        "required_quantity": str(
            decision.required_quantity
        ),
        "local_warehouse_id": (
            str(decision.local_warehouse_id)
            if decision.local_warehouse_id
            else None
        ),
        "local_warehouse_code": decision.local_warehouse_code,
        "local_warehouse_name": decision.local_warehouse_name,
        "local_physical_quantity": str(
            decision.local_physical_quantity
        ),
        "local_committed_quantity": str(
            decision.local_committed_quantity
        ),
        "local_available_to_promise": str(
            decision.local_available_to_promise
        ),
        "total_internal_atp": str(
            decision.total_internal_atp
        ),
        "decision": decision.decision,
        "source_type": decision.source_type,
        "recommended_quantity": str(
            decision.recommended_quantity
        ),
        "transfer_required": decision.transfer_required,
        "external_sourcing_required": (
            decision.external_sourcing_required
        ),
        "shortage_quantity": str(
            decision.shortage_quantity
        ),
        "reason": decision.reason,
        "next_action": decision.next_action,
    }

def get_supplier_eligibility_tool(
    db: Session,
    request_id: UUID,
    item_id: UUID,
) -> dict:
    """
    Read-only agent tool.

    Retrieves suppliers eligible to supply the material
    for a procurement request item.
    """

    result = get_supplier_eligibility(
        db=db,
        procurement_request_id=request_id,
        procurement_request_item_id=item_id,
    )

    return {
        "procurement_request_id": str(
            result.procurement_request_id
        ),
        "procurement_request_item_id": str(
            result.procurement_request_item_id
        ),
        "material_id": str(result.material_id),
        "eligible_supplier_count": result.eligible_supplier_count,
        "eligible_suppliers": [
            {
                "supplier_id": str(supplier.supplier_id),
                "supplier_code": supplier.supplier_code,
                "supplier_name": supplier.supplier_name,
                "qualification_status": supplier.qualification_status,
                "technical_approval": supplier.technical_approval,
                "quality_approval": supplier.quality_approval,
            }
            for supplier in result.eligible_suppliers
        ],
    }
def get_procurement_exceptions_tool(
    db: Session,
    purchase_order_id: UUID | None = None,
    status: str = "OPEN",
) -> dict:
    """
    Read-only agent tool.

    Retrieves procurement exceptions relevant to the
    current procurement context.
    """

    query = db.query(ProcurementException).filter(
        ProcurementException.status == status
    )

    if purchase_order_id:
        query = query.filter(
            ProcurementException.purchase_order_id == purchase_order_id
        )

    exceptions = (
        query
        .order_by(ProcurementException.detected_at.desc())
        .all()
    )

    return {
        "exception_count": len(exceptions),
        "exceptions": [
            {
                "exception_id": str(exception.id),
                "exception_number": exception.exception_number,
                "exception_type": exception.exception_type,
                "severity": exception.severity,
                "title": exception.title,
                "description": exception.description,
                "business_impact": exception.business_impact,
                "recommended_action": exception.recommended_action,
                "status": exception.status,
                "purchase_order_id": (
                    str(exception.purchase_order_id)
                    if exception.purchase_order_id
                    else None
                ),
                "shipment_id": (
                    str(exception.shipment_id)
                    if exception.shipment_id
                    else None
                ),
            }
            for exception in exceptions
        ],
    }

def create_purchase_requisition_tool(
    db: Session,
    approval_id: UUID,
    requested_by: str,
    allow_action: bool = False,
    authorization_id: str | None = None,
) -> dict:
    """
    Create a Purchase Requisition only when:

    1. The application explicitly allows actions.
    2. A valid human authorization exists.
    3. The authorization matches this exact action.
    4. The PR is successfully created before the authorization
       is marked as CONSUMED.
    """

    if not allow_action:
        raise PermissionError(
            "Purchase Requisition creation requires "
            "explicit human authorization."
        )

    if not authorization_id:
        raise PermissionError(
            "Authorization ID is required before "
            "Purchase Requisition creation."
        )

    from app.services.action_authorization_service import (
        get_action_authorization,
        consume_action_authorization,
    )

    authorization = get_action_authorization(
        db=db,
        authorization_id=authorization_id,
    )

    if authorization["status"] != "APPROVED":
        raise PermissionError(
            "Action does not have an approved authorization."
        )

    expected_parameters = {
        "approval_id": str(approval_id),
        "requested_by": requested_by,
    }

    if authorization["tool_name"] != "create_purchase_requisition":
        raise PermissionError(
            "Authorization does not match the requested tool."
        )

    if authorization["parameters"] != expected_parameters:
        raise PermissionError(
            "Authorization parameters do not match "
            "the requested action."
        )

    # ---------------------------------------------------------
    # Execute the business action first.
    #
    # purchase_requisition_service commits the PR transaction.
    # ---------------------------------------------------------
    purchase_requisition = create_purchase_requisition(
        db=db,
        approval_id=approval_id,
        requested_by=requested_by,
    )

    # ---------------------------------------------------------
    # Only consume the authorization after the business
    # transaction succeeds.
    # ---------------------------------------------------------
    authorization_result = consume_action_authorization(
        db=db,
        authorization_id=authorization_id,
        tool_name="create_purchase_requisition",
        parameters=expected_parameters,
    )

    return {
        "action": "CREATE_PURCHASE_REQUISITION",
        "status": "CREATED",
        "purchase_requisition_id": str(
            purchase_requisition.id
        ),
        "pr_number": purchase_requisition.pr_number,
        "supplier_id": str(
            purchase_requisition.supplier_id
        ),
        "status_after_creation": purchase_requisition.status,
        "total_amount": str(
            purchase_requisition.total_amount
        ),
        "currency_code": purchase_requisition.currency_code,
        "authorization_id": authorization_result[
            "authorization_id"
        ],
        "authorization_status": authorization_result[
            "status"
        ],
        "authorized_by": authorization_result[
            "approved_by"
        ],
        "message": (
            f"Purchase Requisition "
            f"{purchase_requisition.pr_number} "
            "created successfully under approved "
            "human authorization."
        ),
    }

def request_action_authorization_tool(
    db: Session,
    tool_name: str,
    requested_by: str,
    parameters: dict,
    reason: str,
) -> dict:
    """
    Request human authorization for a consequential action.

    This does NOT execute the action.
    It creates a persistent authorization request
    that must subsequently be approved by a human.
    """

    result = request_action_authorization(
        db=db,
        tool_name=tool_name,
        requested_by=requested_by,
        parameters=parameters,
        reason=reason,
    )

    return {
        "action": "REQUEST_ACTION_AUTHORIZATION",
        "status": "PENDING",
        "authorization_id": result["authorization_id"],
        "authorization_number": result[
            "authorization_number"
        ],
        "tool_name": result["tool_name"],
        "requested_by": result["requested_by"],
        "expires_at": result["expires_at"],
        "message": (
            "Human authorization is required before "
            f"'{tool_name}' can be executed."
        ),
    }

def issue_rfq_tool(
    db: Session,
    rfq_id: UUID,
    allow_action: bool = False,
    authorization_id: str | None = None,
) -> dict:
    """
    Issue an RFQ only after explicit human authorization.
    """

    if not allow_action:
        raise PermissionError(
            "RFQ issuance requires explicit human authorization."
        )

    if not authorization_id:
        raise PermissionError(
            "Authorization ID is required before RFQ issuance."
        )

    from app.services.action_authorization_service import (
        get_action_authorization,
        consume_action_authorization,
    )

    authorization = get_action_authorization(
        db=db,
        authorization_id=authorization_id,
    )

    if authorization["status"] != "APPROVED":
        raise PermissionError(
            "Action does not have an approved authorization."
        )

    expected_parameters = {
        "rfq_id": str(rfq_id),
    }

    if authorization["tool_name"] != "issue_rfq":
        raise PermissionError(
            "Authorization does not match the requested action."
        )

    if authorization["parameters"] != expected_parameters:
        raise PermissionError(
            "Authorization parameters do not match "
            "the requested action."
        )

    from app.services.rfq_issue_service import issue_rfq

    rfq = issue_rfq(
        db=db,
        rfq_id=rfq_id,
    )

    authorization_result = consume_action_authorization(
        db=db,
        authorization_id=authorization_id,
        tool_name="issue_rfq",
        parameters=expected_parameters,
    )

    return {
        "action": "ISSUE_RFQ",
        "status": "ISSUED",
        "rfq_id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "rfq_status": rfq.status,
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
        "authorization_id": authorization_result[
            "authorization_id"
        ],
        "authorization_status": authorization_result[
            "status"
        ],
        "authorized_by": authorization_result[
            "approved_by"
        ],
        "message": (
            f"RFQ {rfq.rfq_number} issued successfully "
            "under approved human authorization."
        ),
    }

    