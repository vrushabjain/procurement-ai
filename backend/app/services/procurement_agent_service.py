import json
from uuid import UUID

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.agent_guardrails import (
    ToolPermission,
    get_tool_permission,
    is_tool_allowed,
)
from app.services.agent_tools import (
    get_procurement_request,
    get_supply_decision_tool,
    get_supplier_eligibility_tool,
    get_procurement_exceptions_tool,
    request_action_authorization_tool,
    create_purchase_requisition_tool,
)


# ---------------------------------------------------------
# OpenAI Client
# ---------------------------------------------------------

client = OpenAI(
    api_key=settings.openai_api_key
)


# ---------------------------------------------------------
# System Prompt
# ---------------------------------------------------------

SYSTEM_PROMPT = """
You are the Procurement AI Agent for an enterprise EPC
procurement control tower.

Your role is to analyze procurement situations,
retrieve authoritative information through application
tools, recommend actions, and request human authorization
when a consequential procurement action is required.

IMPORTANT OPERATING PRINCIPLES:

1. The application database and deterministic business
   services are the source of truth.

2. Never invent procurement facts, quantities, suppliers,
   prices, dates, approvals, risks, or execution results.

3. Use the available tools to retrieve factual information.

4. Deterministic application services calculate:
   - inventory availability
   - ATP
   - supply decisions
   - supplier eligibility
   - commercial values
   - approval status
   - procurement transactions
   - exceptions and risks

5. You may reason over tool results and explain the
   business implications.

6. You must NOT directly access or modify the database.

7. You must NOT claim that an action was executed unless
   the corresponding action tool confirms successful
   execution.

8. Consequential procurement actions require explicit
   human authorization.

9. When a consequential action is appropriate but has not
   been authorized, use the authorization-request tool
   rather than pretending the action was executed.

10. Requesting authorization does NOT execute the action.

11. Human approval is a separate application-level step.

12. If an action is blocked by the guardrail, clearly
   explain that explicit human authorization is required.

13. Never bypass or weaken application guardrails.

14. If information is insufficient to make a reliable
   recommendation, state what information is missing.

15. Prefer concise, business-oriented explanations suitable
   for Procurement Managers, Procurement Heads, Project
   Managers, and executives.

PROCUREMENT REASONING:

When analyzing a procurement request, consider:

- Procurement request status
- Material
- Quantity
- Required date
- Delivery location
- Project
- Technical specification
- Local inventory
- Commitments
- Reservations
- Available-to-promise
- Internal transfer opportunities
- External sourcing requirements
- Supplier eligibility
- Procurement risks
- Existing exceptions

For consequential actions:

- First determine whether the action is justified.
- Then request human authorization.
- Never execute a consequential action without
  authorization.
- Never claim approval unless the application confirms it.
- Never claim execution unless the action tool confirms it.

The application, not the LLM, owns transaction integrity.
"""


# ---------------------------------------------------------
# Formal OpenAI Tool Definitions
# ---------------------------------------------------------

PROCUREMENT_AGENT_TOOLS = [

    # -----------------------------------------------------
    # READ TOOL 1
    # -----------------------------------------------------
    {
        "type": "function",
        "name": "get_procurement_request",
        "description": (
            "Retrieve authoritative procurement request "
            "details including project, required date, "
            "priority, status, items, quantities, technical "
            "specifications, and delivery location."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "request_id": {
                    "type": "string",
                    "description": (
                        "UUID of the procurement request."
                    ),
                }
            },
            "required": [
                "request_id"
            ],
            "additionalProperties": False,
        },
    },

    # -----------------------------------------------------
    # READ TOOL 2
    # -----------------------------------------------------
    {
        "type": "function",
        "name": "get_supply_decision",
        "description": (
            "Analyze authoritative internal supply "
            "availability, ATP, internal transfer options, "
            "shortages, and whether external sourcing is "
            "required for a procurement request item."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "request_id": {
                    "type": "string",
                    "description": (
                        "UUID of the procurement request."
                    ),
                },
                "item_id": {
                    "type": "string",
                    "description": (
                        "UUID of the procurement request item."
                    ),
                },
            },
            "required": [
                "request_id",
                "item_id",
            ],
            "additionalProperties": False,
        },
    },

    # -----------------------------------------------------
    # READ TOOL 3
    # -----------------------------------------------------
    {
        "type": "function",
        "name": "get_supplier_eligibility",
        "description": (
            "Retrieve suppliers that are eligible to supply "
            "the requested material based on technical and "
            "quality qualification requirements."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "request_id": {
                    "type": "string",
                    "description": (
                        "UUID of the procurement request."
                    ),
                },
                "item_id": {
                    "type": "string",
                    "description": (
                        "UUID of the procurement request item."
                    ),
                },
            },
            "required": [
                "request_id",
                "item_id",
            ],
            "additionalProperties": False,
        },
    },

    # -----------------------------------------------------
    # READ TOOL 4
    # -----------------------------------------------------
    {
        "type": "function",
        "name": "get_procurement_exceptions",
        "description": (
            "Retrieve procurement exceptions and risks "
            "associated with a purchase order. Can be used "
            "to identify open procurement risks."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "purchase_order_id": {
                    "type": "string",
                    "description": (
                        "Optional UUID of the purchase order."
                    ),
                },
                "status": {
                    "type": "string",
                    "description": (
                        "Exception status filter. "
                        "Defaults to OPEN."
                    ),
                    "enum": [
                        "OPEN",
                        "RESOLVED",
                        "ALL",
                    ],
                },
            },
            "required": [],
            "additionalProperties": False,
        },
    },

    # -----------------------------------------------------
    # AUTHORIZATION REQUEST TOOL
    # -----------------------------------------------------
    {
        "type": "function",
        "name": "request_action_authorization",
        "description": (
            "Create a persistent human authorization request "
            "for a consequential procurement action. "
            "This does NOT execute the action. "
            "Use this when a procurement action requires "
            "human approval."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "tool_name": {
                    "type": "string",
                    "description": (
                        "The consequential action that requires "
                        "human authorization."
                    ),
                    "enum": [
                        "create_purchase_requisition",
                    ],
                },
                "requested_by": {
                    "type": "string",
                    "description": (
                        "Application user requesting the action."
                    ),
                },
                "parameters": {
                    "type": "object",
                    "description": (
                        "Exact parameters that will be used "
                        "when the authorized action executes."
                    ),
                    "additionalProperties": True,
                },
                "reason": {
                    "type": "string",
                    "description": (
                        "Business reason why the action "
                        "requires authorization."
                    ),
                },
            },
            "required": [
                "tool_name",
                "requested_by",
                "parameters",
                "reason",
            ],
            "additionalProperties": False,
        },
    },

    # -----------------------------------------------------
    # ACTION TOOL
    # -----------------------------------------------------
    {
        "type": "function",
        "name": "create_purchase_requisition",
        "description": (
            "Create a Purchase Requisition from an approved "
            "sourcing decision. This is a consequential "
            "procurement action and requires explicit human "
            "authorization. Never execute this action unless "
            "the application has provided valid authorization."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "approval_id": {
                    "type": "string",
                    "description": (
                        "UUID of the approved sourcing approval."
                    ),
                },
                "requested_by": {
                    "type": "string",
                    "description": (
                        "User requesting creation of the PR."
                    ),
                },
                "authorization_id": {
                    "type": "string",
                    "description": (
                        "UUID of the approved human "
                        "authorization."
                    ),
                },
            },
            "required": [
                "approval_id",
                "requested_by",
                "authorization_id",
            ],
            "additionalProperties": False,
        },
    },
]


# ---------------------------------------------------------
# Tool Result Serialization
# ---------------------------------------------------------

def _tool_result_to_json(result) -> str:
    """
    Convert tool results into JSON-safe output for the
    OpenAI Responses API.
    """

    return json.dumps(
        result,
        default=str,
    )


# ---------------------------------------------------------
# Tool Dispatcher
# ---------------------------------------------------------

def execute_agent_tool(
    db: Session,
    tool_name: str,
    arguments: dict,
) -> dict:
    """
    Execute an agent tool through the application guardrail
    layer.

    READ tools are automatically allowed.

    ACTION tools are blocked unless the application explicitly
    enables action execution.

    APPROVAL tools require a separate approval mechanism.
    """

    permission = get_tool_permission(tool_name)

    # -----------------------------------------------------
    # Guardrail enforcement
    # -----------------------------------------------------

    if not is_tool_allowed(tool_name):
        raise PermissionError(
            f"Tool '{tool_name}' is classified as "
            f"{permission.value} and is not currently "
            "authorized for execution."
        )

    # -----------------------------------------------------
    # READ: Procurement Request
    # -----------------------------------------------------

    if tool_name == "get_procurement_request":

        request_id = UUID(
            arguments["request_id"]
        )

        return get_procurement_request(
            db=db,
            request_id=request_id,
        )

    # -----------------------------------------------------
    # READ: Supply Decision
    # -----------------------------------------------------

    if tool_name == "get_supply_decision":

        request_id = UUID(
            arguments["request_id"]
        )

        item_id = UUID(
            arguments["item_id"]
        )

        return get_supply_decision_tool(
            db=db,
            request_id=request_id,
            item_id=item_id,
        )

    # -----------------------------------------------------
    # READ: Supplier Eligibility
    # -----------------------------------------------------

    if tool_name == "get_supplier_eligibility":

        request_id = UUID(
            arguments["request_id"]
        )

        item_id = UUID(
            arguments["item_id"]
        )

        return get_supplier_eligibility_tool(
            db=db,
            request_id=request_id,
            item_id=item_id,
        )

    # -----------------------------------------------------
    # READ: Procurement Exceptions
    # -----------------------------------------------------

    if tool_name == "get_procurement_exceptions":

        purchase_order_id = arguments.get(
            "purchase_order_id"
        )

        if purchase_order_id:
            purchase_order_id = UUID(
                purchase_order_id
            )

        status = arguments.get(
            "status",
            "OPEN",
        )

        return get_procurement_exceptions_tool(
            db=db,
            purchase_order_id=purchase_order_id,
            status=status,
        )

    # -----------------------------------------------------
    # AUTHORIZATION REQUEST
    # -----------------------------------------------------

    if tool_name == "request_action_authorization":

        return request_action_authorization_tool(
            db=db,
            tool_name=arguments["tool_name"],
            requested_by=arguments["requested_by"],
            parameters=arguments["parameters"],
            reason=arguments["reason"],
        )

    # -----------------------------------------------------
    # ACTION: Create Purchase Requisition
    #
    # This branch should NOT normally be reachable because
    # ACTION tools are blocked by the default guardrail.
    #
    # Actual authorized execution will be performed by
    # the application after explicit human authorization.
    # -----------------------------------------------------

    if tool_name == "create_purchase_requisition":

        raise PermissionError(
            "Purchase Requisition creation requires "
            "explicit human authorization through the "
            "application approval workflow."
        )

    # -----------------------------------------------------
    # Unknown tool
    # -----------------------------------------------------

    raise ValueError(
        f"Unknown procurement agent tool: {tool_name}"
    )


# ---------------------------------------------------------
# Procurement Agent
# ---------------------------------------------------------

def ask_procurement_agent(
    db: Session,
    question: str,
) -> str:
    """
    Run the Procurement AI Agent.

    The agent can:
    - reason about the user's request
    - call deterministic read tools
    - request human authorization
    - receive tool results
    - synthesize a business response

    Consequential actions remain protected by the
    application guardrail layer.
    """

    input_items = [
        {
            "role": "user",
            "content": question,
        }
    ]

    max_rounds = 8

    for _ in range(max_rounds):

        response = client.responses.create(
            model="gpt-5.6",
            instructions=SYSTEM_PROMPT,
            tools=PROCUREMENT_AGENT_TOOLS,
            input=input_items,
        )

        # Preserve the model's tool-call/output items
        # for the next Responses API turn.
        input_items.extend(
            response.output
        )

        function_calls = [
            item
            for item in response.output
            if item.type == "function_call"
        ]

        # -------------------------------------------------
        # No more tool calls.
        # -------------------------------------------------

        if not function_calls:
            return response.output_text

        # -------------------------------------------------
        # Execute requested tools.
        # -------------------------------------------------

        for tool_call in function_calls:

            try:

                arguments = json.loads(
                    tool_call.arguments
                )

                tool_output = execute_agent_tool(
                    db=db,
                    tool_name=tool_call.name,
                    arguments=arguments,
                )

            except PermissionError as exc:

                tool_output = {
                    "error": "ACTION_BLOCKED",
                    "message": str(exc),
                    "action_required": (
                        "Explicit human authorization "
                        "is required before this action "
                        "can be executed."
                    ),
                }

            except Exception as exc:

                tool_output = {
                    "error": "TOOL_EXECUTION_ERROR",
                    "message": str(exc),
                }

            input_items.append(
                {
                    "type": "function_call_output",
                    "call_id": tool_call.call_id,
                    "output": _tool_result_to_json(
                        tool_output
                    ),
                }
            )

    raise RuntimeError(
        "Procurement Agent exceeded the maximum "
        "number of tool-calling rounds."
    )