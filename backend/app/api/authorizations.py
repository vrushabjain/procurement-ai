from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.action_authorization import ActionAuthorization
from app.schemas.action_authorization import (
    ActionAuthorizationApproval,
    ActionAuthorizationCreate,
    ActionAuthorizationRejection,
    ActionAuthorizationSummary,
)
from app.services.action_authorization_service import (
    approve_action_authorization,
    get_action_authorization,
    reject_action_authorization,
    request_action_authorization,
)
from app.services.agent_tools import (
    create_purchase_requisition_tool,
    issue_rfq_tool,
)

router = APIRouter(
    prefix="/authorizations",
    tags=["Authorizations"],
)


# ---------------------------------------------------------
# Create Authorization
# ---------------------------------------------------------

@router.post(
    "",
    response_model=dict,
)
def create_authorization(
    payload: ActionAuthorizationCreate,
    db: Session = Depends(get_db),
):
    """
    Create a persistent authorization request for a
    consequential procurement action.
    """

    try:
        result = request_action_authorization(
            db=db,
            tool_name=payload.tool_name,
            requested_by=payload.requested_by,
            parameters=payload.parameters,
            reason=payload.reason,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# ---------------------------------------------------------
# List Authorizations
# ---------------------------------------------------------

@router.get(
    "",
    response_model=list[ActionAuthorizationSummary],
)
def list_authorizations(
    status: str | None = Query(
        default=None,
        description="Filter by authorization status.",
    ),
    db: Session = Depends(get_db),
):
    """
    List authorization requests.

    Supported statuses include:

    PENDING
    APPROVED
    REJECTED
    EXPIRED
    CONSUMED
    """

    query = db.query(ActionAuthorization)

    if status:
        query = query.filter(
            ActionAuthorization.status
            == status.upper()
        )

    authorizations = (
        query
        .order_by(
            ActionAuthorization.created_at.desc()
        )
        .all()
    )

    return [
        ActionAuthorizationSummary(
            authorization_id=authorization.id,
            authorization_number=(
                authorization.authorization_number
            ),
            tool_name=authorization.tool_name,
            requested_by=authorization.requested_by,
            approved_by=authorization.approved_by,
            rejected_by=authorization.rejected_by,
            status=authorization.status,
            reason=authorization.reason,
            created_at=authorization.created_at,
            expires_at=authorization.expires_at,
            approved_at=authorization.approved_at,
            rejected_at=authorization.rejected_at,
            consumed_at=authorization.consumed_at,
        )
        for authorization in authorizations
    ]


# ---------------------------------------------------------
# Get Authorization
# ---------------------------------------------------------

@router.get(
    "/{authorization_id}",
    response_model=dict,
)
def get_authorization(
    authorization_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Retrieve one authorization request.
    """

    try:
        return get_action_authorization(
            db=db,
            authorization_id=authorization_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ---------------------------------------------------------
# Approve Authorization
# ---------------------------------------------------------

@router.post(
    "/{authorization_id}/approve",
    response_model=dict,
)
def approve_authorization(
    authorization_id: UUID,
    payload: ActionAuthorizationApproval,
    db: Session = Depends(get_db),
):
    """
    Approve a pending authorization request.
    """

    try:
        return approve_action_authorization(
            db=db,
            authorization_id=authorization_id,
            approved_by=payload.approved_by,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# ---------------------------------------------------------
# Reject Authorization
# ---------------------------------------------------------

@router.post(
    "/{authorization_id}/reject",
    response_model=dict,
)
def reject_authorization(
    authorization_id: UUID,
    payload: ActionAuthorizationRejection,
    db: Session = Depends(get_db),
):
    """
    Reject a pending authorization request.
    """

    try:
        return reject_action_authorization(
            db=db,
            authorization_id=authorization_id,
            rejected_by=payload.rejected_by,
            rejection_reason=payload.rejection_reason,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# ---------------------------------------------------------
# Execute Authorized Action
# ---------------------------------------------------------

@router.post(
    "/{authorization_id}/execute",
    response_model=dict,
)
def execute_authorized_action(
    authorization_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Execute the exact action that was approved.

    Security principles:

    1. Authorization is loaded from PostgreSQL.
    2. The stored authorization must be APPROVED.
    3. The stored tool_name determines what can execute.
    4. The stored parameters determine what gets executed.
    5. The client cannot change the action parameters.
    6. Consequential action execution requires explicit
       application authorization.
    """

    try:
        authorization = get_action_authorization(
            db=db,
            authorization_id=authorization_id,
        )

        if authorization["status"] != "APPROVED":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Only APPROVED authorizations "
                    "can be executed."
                ),
            )

        tool_name = authorization["tool_name"]
        parameters = authorization["parameters"]

        # -------------------------------------------------
        # CREATE PURCHASE REQUISITION
        # -------------------------------------------------

        if tool_name == "create_purchase_requisition":

            approval_id = UUID(
                parameters["approval_id"]
            )

            requested_by = parameters[
                "requested_by"
            ]

            return create_purchase_requisition_tool(
                db=db,
                approval_id=approval_id,
                requested_by=requested_by,
                allow_action=True,
                authorization_id=str(
                    authorization_id
                ),
            )

        # -------------------------------------------------
        # ISSUE RFQ
        # -------------------------------------------------

        if tool_name == "issue_rfq":

            rfq_id = UUID(
                parameters["rfq_id"]
            )

            return issue_rfq_tool(
                db=db,
                rfq_id=rfq_id,
                allow_action=True,
                authorization_id=str(
                    authorization_id
                ),
            )

        # -------------------------------------------------
        # Unknown / unsupported action
        # -------------------------------------------------

        raise HTTPException(
            status_code=400,
            detail=(
                f"Authorized tool '{tool_name}' "
                "does not have an execution handler."
            ),
        )

    except HTTPException:
        raise

    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail=str(exc),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )