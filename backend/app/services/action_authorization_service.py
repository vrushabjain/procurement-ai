from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.action_authorization import ActionAuthorization
from app.services.agent_guardrails import (
    ToolPermission,
    get_tool_permission,
)


def generate_authorization_number(db: Session) -> str:
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")

    for _ in range(10):
        suffix = uuid4().hex[:8].upper()
        authorization_number = f"AUTH-{date_part}-{suffix}"

        existing = (
            db.query(ActionAuthorization)
            .filter(
                ActionAuthorization.authorization_number
                == authorization_number
            )
            .first()
        )

        if not existing:
            return authorization_number

    raise RuntimeError(
        "Unable to generate a unique authorization number."
    )


def request_action_authorization(
    db: Session,
    tool_name: str,
    requested_by: str,
    parameters: dict,
    reason: str | None = None,
) -> dict:
    permission = get_tool_permission(tool_name)

    if permission != ToolPermission.ACTION:
        raise ValueError(
            f"Tool '{tool_name}' does not require "
            "action authorization."
        )

    now = datetime.now(timezone.utc)

    authorization = ActionAuthorization(
        authorization_number=generate_authorization_number(db),
        tool_name=tool_name,
        requested_by=requested_by,
        parameters=parameters,
        status="PENDING",
        reason=reason,
        created_at=now,
        expires_at=now + timedelta(minutes=15),
    )

    db.add(authorization)
    db.commit()
    db.refresh(authorization)

    return {
        "authorization_id": str(authorization.id),
        "authorization_number": authorization.authorization_number,
        "tool_name": authorization.tool_name,
        "status": authorization.status,
        "requested_by": authorization.requested_by,
        "expires_at": authorization.expires_at,
        "message": (
            "Action authorization requested successfully."
        ),
    }


def approve_action_authorization(
    db: Session,
    authorization_id: UUID,
    approved_by: str,
) -> dict:
    authorization = (
        db.query(ActionAuthorization)
        .filter(ActionAuthorization.id == authorization_id)
        .first()
    )

    if not authorization:
        raise ValueError(
            "Action authorization not found."
        )

    if authorization.status != "PENDING":
        raise ValueError(
            "Only PENDING authorizations can be approved."
        )

    now = datetime.now(timezone.utc)

    if authorization.expires_at <= now:
        authorization.status = "EXPIRED"
        db.commit()

        raise ValueError(
            "Action authorization has expired."
        )

    authorization.status = "APPROVED"
    authorization.approved_by = approved_by
    authorization.approved_at = now

    db.commit()
    db.refresh(authorization)

    return {
        "authorization_id": str(authorization.id),
        "authorization_number": (
            authorization.authorization_number
        ),
        "tool_name": authorization.tool_name,
        "status": authorization.status,
        "requested_by": authorization.requested_by,
        "approved_by": authorization.approved_by,
        "approved_at": authorization.approved_at,
        "expires_at": authorization.expires_at,
        "message": (
            "Action authorization approved successfully."
        ),
    }


def reject_action_authorization(
    db: Session,
    authorization_id: UUID,
    rejected_by: str,
    rejection_reason: str,
) -> dict:
    authorization = (
        db.query(ActionAuthorization)
        .filter(ActionAuthorization.id == authorization_id)
        .first()
    )

    if not authorization:
        raise ValueError(
            "Action authorization not found."
        )

    if authorization.status != "PENDING":
        raise ValueError(
            "Only PENDING authorizations can be rejected."
        )

    now = datetime.now(timezone.utc)

    if authorization.expires_at <= now:
        authorization.status = "EXPIRED"
        db.commit()

        raise ValueError(
            "Action authorization has expired."
        )

    rejection_reason = rejection_reason.strip()

    if not rejection_reason:
        raise ValueError(
            "Rejection reason is required."
        )

    authorization.status = "REJECTED"
    authorization.rejected_by = rejected_by
    authorization.rejected_at = now
    authorization.reason = rejection_reason

    db.commit()
    db.refresh(authorization)

    return {
        "authorization_id": str(authorization.id),
        "authorization_number": (
            authorization.authorization_number
        ),
        "tool_name": authorization.tool_name,
        "status": authorization.status,
        "requested_by": authorization.requested_by,
        "rejected_by": authorization.rejected_by,
        "rejected_at": authorization.rejected_at,
        "rejection_reason": authorization.reason,
        "expires_at": authorization.expires_at,
        "message": (
            "Action authorization rejected successfully."
        ),
    }


def get_action_authorization(
    db: Session,
    authorization_id: UUID,
) -> dict:
    authorization = (
        db.query(ActionAuthorization)
        .filter(ActionAuthorization.id == authorization_id)
        .first()
    )

    if not authorization:
        raise ValueError(
            "Action authorization not found."
        )

    return {
        "authorization_id": str(authorization.id),
        "authorization_number": (
            authorization.authorization_number
        ),
        "tool_name": authorization.tool_name,
        "requested_by": authorization.requested_by,
        "approved_by": authorization.approved_by,
        "rejected_by": authorization.rejected_by,
        "parameters": authorization.parameters,
        "status": authorization.status,
        "reason": authorization.reason,
        "created_at": authorization.created_at,
        "expires_at": authorization.expires_at,
        "approved_at": authorization.approved_at,
        "rejected_at": authorization.rejected_at,
        "consumed_at": authorization.consumed_at,
    }


def consume_action_authorization(
    db: Session,
    authorization_id: UUID,
    tool_name: str,
    parameters: dict,
) -> dict:
    authorization = (
        db.query(ActionAuthorization)
        .filter(ActionAuthorization.id == authorization_id)
        .first()
    )

    if not authorization:
        raise ValueError(
            "Action authorization not found."
        )

    if authorization.status != "APPROVED":
        raise ValueError(
            "Action authorization is not approved "
            "for execution."
        )

    if authorization.tool_name != tool_name:
        raise ValueError(
            "Authorization tool does not match "
            "the requested action."
        )

    now = datetime.now(timezone.utc)

    if authorization.expires_at <= now:
        authorization.status = "EXPIRED"
        db.commit()

        raise ValueError(
            "Action authorization has expired."
        )

    if authorization.parameters != parameters:
        raise ValueError(
            "Authorization parameters do not match "
            "the requested action."
        )

    authorization.status = "CONSUMED"
    authorization.consumed_at = now

    db.commit()
    db.refresh(authorization)

    return {
        "authorization_id": str(authorization.id),
        "authorization_number": (
            authorization.authorization_number
        ),
        "tool_name": authorization.tool_name,
        "status": authorization.status,
        "approved_by": authorization.approved_by,
        "consumed_at": authorization.consumed_at,
        "message": (
            "Action authorization consumed successfully."
        ),
    }