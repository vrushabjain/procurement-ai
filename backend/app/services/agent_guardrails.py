from enum import Enum


class ToolPermission(str, Enum):
    READ = "READ"
    ACTION = "ACTION"
    APPROVAL = "APPROVAL"


TOOL_PERMISSIONS = {
    "get_procurement_request": ToolPermission.READ,
    "get_supply_decision": ToolPermission.READ,
    "get_supplier_eligibility": ToolPermission.READ,
    "get_procurement_exceptions": ToolPermission.READ,
    "request_action_authorization": ToolPermission.READ,

    "create_purchase_requisition": ToolPermission.ACTION,
    "reserve_inventory": ToolPermission.ACTION,
    "create_internal_transfer": ToolPermission.ACTION,
    "generate_po_draft": ToolPermission.ACTION,
    "issue_rfq": ToolPermission.ACTION,
    "request_approval": ToolPermission.APPROVAL,
}


def get_tool_permission(tool_name: str) -> ToolPermission:
    """
    Return the permission class for an agent tool.
    """

    permission = TOOL_PERMISSIONS.get(tool_name)

    if permission is None:
        raise ValueError(
            f"Tool '{tool_name}' is not registered "
            "in the agent guardrails."
        )

    return permission


def is_tool_allowed(
    tool_name: str,
    *,
    allow_actions: bool = False,
    allow_approvals: bool = False,
) -> bool:
    """
    Determine whether an agent tool can currently execute.

    READ tools are always allowed.

    ACTION tools require explicit action authorization.

    APPROVAL tools require explicit approval authorization.
    """

    permission = get_tool_permission(tool_name)

    if permission == ToolPermission.READ:
        return True

    if permission == ToolPermission.ACTION:
        return allow_actions

    if permission == ToolPermission.APPROVAL:
        return allow_approvals

    return False