from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.procurement_request import ProcurementRequest
from app.models.rfq import RFQ
from app.models.approval import Approval
from app.models.purchase_requisition import PurchaseRequisition
from app.models.purchase_order import PurchaseOrder
from app.models.shipment import Shipment
from app.models.goods_receipt import GoodsReceipt
from app.models.procurement_exception import ProcurementException


router = APIRouter(
    prefix="/control-tower",
    tags=["Control Tower"],
)


# ============================================================
# LIFECYCLE DEFINITIONS
# ============================================================

LIFECYCLE_INITIATION = "INITIATION"
LIFECYCLE_PROCUREMENT = "PROCUREMENT"
LIFECYCLE_FULFILLMENT = "FULFILLMENT"
LIFECYCLE_EXECUTION = "EXECUTION"
LIFECYCLE_COMPLETED = "COMPLETED"


# ============================================================
# HELPERS
# ============================================================

def _iso(value: Any):
    """
    Convert dates/datetimes to JSON-friendly ISO strings.
    """
    if value is None:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return value


def _request_is_production(request: ProcurementRequest) -> bool:
    """
    Only PRODUCTION records should contribute to executive
    Control Tower metrics.

    TEST records are intentionally excluded.
    DEMO records can also be excluded if desired.
    """
    record_type = getattr(
        request,
        "record_type",
        "PRODUCTION",
    )

    return record_type == "PRODUCTION"


# ============================================================
# PROCUREMENT LIFECYCLE
# ============================================================

def derive_procurement_stage(
    db: Session,
    request: ProcurementRequest,
):
    """
    Determine the current lifecycle stage of ONE procurement
    request.

    IMPORTANT:
    Every downstream object is resolved through the specific
    procurement request's lineage.

    Procurement Request
        ↓
    RFQ
        ↓
    Approval
        ↓
    Purchase Requisition
        ↓
    Purchase Order
        ↓
    Shipment
        ↓
    Goods Receipt
        ↓
    Closed
    """

    # ========================================================
    # 1. GOODS RECEIPT
    # ========================================================

    grn = (
        db.query(GoodsReceipt)
        .join(
            Shipment,
            Shipment.id == GoodsReceipt.shipment_id,
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.id == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .filter(
            PurchaseRequisition.procurement_request_id
            == request.id
        )
        .order_by(
            GoodsReceipt.created_at.desc()
        )
        .first()
    )

    if grn:

        if grn.status in {
            "ACCEPTED",
            "PARTIALLY_ACCEPTED",
        }:
            return (
                "CLOSED",
                "Closed",
                LIFECYCLE_COMPLETED,
            )

        if grn.inspection_status == "PENDING":
            return (
                "INSPECTION",
                "Quality Inspection",
                LIFECYCLE_EXECUTION,
            )

        return (
            "GOODS_RECEIPT",
            "Goods Receipt",
            LIFECYCLE_EXECUTION,
        )

    # ========================================================
    # 2. SHIPMENT
    # ========================================================

    shipment = (
        db.query(Shipment)
        .join(
            PurchaseOrder,
            PurchaseOrder.id == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .filter(
            PurchaseRequisition.procurement_request_id
            == request.id
        )
        .order_by(
            Shipment.created_at.desc()
        )
        .first()
    )

    if shipment:

        if shipment.status == "DELIVERED":
            return (
                "DELIVERED",
                "Delivered",
                LIFECYCLE_EXECUTION,
            )

        if shipment.status == "IN_TRANSIT":
            return (
                "IN_TRANSIT",
                "In Transit",
                LIFECYCLE_EXECUTION,
            )

        if shipment.status == "DISPATCHED":
            return (
                "DISPATCHED",
                "Dispatched",
                LIFECYCLE_EXECUTION,
            )

        return (
            "SHIPMENT_PLANNED",
            "Shipment Planned",
            LIFECYCLE_FULFILLMENT,
        )

    # ========================================================
    # 3. PURCHASE ORDER
    # ========================================================

    purchase_order = (
        db.query(PurchaseOrder)
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .filter(
            PurchaseRequisition.procurement_request_id
            == request.id
        )
        .order_by(
            PurchaseOrder.created_at.desc()
        )
        .first()
    )

    if purchase_order:

        if purchase_order.status == "CLOSED":
            return (
                "CLOSED",
                "Closed",
                LIFECYCLE_COMPLETED,
            )

        if purchase_order.status == "ISSUED":

            if (
                purchase_order.supplier_confirmation_status
                == "CONFIRMED"
            ):
                return (
                    "SUPPLIER_CONFIRMED",
                    "Supplier Confirmed",
                    LIFECYCLE_FULFILLMENT,
                )

            return (
                "SUPPLIER_CONFIRMATION",
                "Supplier Confirmation",
                LIFECYCLE_FULFILLMENT,
            )

        if purchase_order.status == "VALIDATED":
            return (
                "PO_VALIDATED",
                "PO Validated",
                LIFECYCLE_FULFILLMENT,
            )

        return (
            "PURCHASE_ORDER",
            "Purchase Order",
            LIFECYCLE_FULFILLMENT,
        )

    # ========================================================
    # 4. PURCHASE REQUISITION
    # ========================================================

    pr = (
        db.query(PurchaseRequisition)
        .filter(
            PurchaseRequisition.procurement_request_id
            == request.id
        )
        .order_by(
            PurchaseRequisition.created_at.desc()
        )
        .first()
    )

    if pr:

        if pr.status == "APPROVED":
            return (
                "PR_APPROVED",
                "PR Approved",
                LIFECYCLE_PROCUREMENT,
            )

        return (
            "PURCHASE_REQUISITION",
            "Purchase Requisition",
            LIFECYCLE_PROCUREMENT,
        )

    # ========================================================
    # 5. APPROVAL
    # ========================================================

    approval = (
        db.query(Approval)
        .join(
            RFQ,
            RFQ.id == Approval.rfq_id,
        )
        .filter(
            RFQ.procurement_request_id
            == request.id
        )
        .order_by(
            Approval.created_at.desc()
        )
        .first()
    )

    if approval:

        if approval.status == "APPROVED":
            return (
                "APPROVAL_COMPLETE",
                "Approval Complete",
                LIFECYCLE_PROCUREMENT,
            )

        if approval.status == "REJECTED":
            return (
                "APPROVAL_REJECTED",
                "Approval Rejected",
                LIFECYCLE_PROCUREMENT,
            )

        if approval.status == "SENT_BACK":
            return (
                "APPROVAL_SENT_BACK",
                "Approval Sent Back",
                LIFECYCLE_PROCUREMENT,
            )

        return (
            "APPROVAL_PENDING",
            "Awaiting Approval",
            LIFECYCLE_PROCUREMENT,
        )

    # ========================================================
    # 6. RFQ
    # ========================================================

    rfq = (
        db.query(RFQ)
        .filter(
            RFQ.procurement_request_id
            == request.id
        )
        .order_by(
            RFQ.created_at.desc()
        )
        .first()
    )

    if rfq:

        if rfq.status == "ISSUED":
            return (
                "RFQ_ISSUED",
                "RFQ Issued",
                LIFECYCLE_PROCUREMENT,
            )

        if rfq.status == "CLOSED":
            return (
                "RFQ_CLOSED",
                "RFQ Closed",
                LIFECYCLE_PROCUREMENT,
            )

        return (
            "RFQ",
            "RFQ / Quotations",
            LIFECYCLE_PROCUREMENT,
        )

    # ========================================================
    # 7. REQUEST INITIATION
    # ========================================================

    if request.status == "DRAFT":
        return (
            "INITIATION",
            "Requirement Initiation",
            LIFECYCLE_INITIATION,
        )

    return (
        "INITIATION",
        "Requirement Validation",
        LIFECYCLE_INITIATION,
    )


# ============================================================
# REQUEST SUMMARY
# ============================================================

def build_procurement_overview(
    db: Session,
    requests: list[ProcurementRequest],
):
    """
    Build the procurement overview displayed in the Control
    Tower.
    """

    rows = []

    for request in requests:

        (
            stage,
            stage_label,
            lifecycle_category,
        ) = derive_procurement_stage(
            db=db,
            request=request,
        )

        rows.append(
            {
                "id": str(request.id),
                "request_number": request.request_number,
                "project_id": str(request.project_id),
                "requested_by": request.requested_by,
                "required_date": _iso(
                    request.required_date
                ),
                "priority": request.priority,
                "request_status": request.status,
                "record_type": getattr(
                    request,
                    "record_type",
                    "PRODUCTION",
                ),
                "stage": stage,
                "stage_label": stage_label,
                "lifecycle_category": lifecycle_category,
                "updated_at": _iso(
                    request.updated_at
                ),
            }
        )

    return rows


# ============================================================
# SHIPMENT RISK DATA
# ============================================================

def build_shipment_risks(
    db: Session,
):
    """
    Return shipment risks belonging only to production
    procurement requests.
    """

    shipments = (
        db.query(Shipment)
        .join(
            PurchaseOrder,
            PurchaseOrder.id == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            Shipment.risk_status.in_(
                [
                    "AT_RISK",
                    "DELAYED",
                ]
            ),
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .order_by(
            Shipment.updated_at.desc()
        )
        .all()
    )

    return [
        {
            "id": str(shipment.id),
            "shipment_number": shipment.shipment_number,
            "purchase_order_id": str(
                shipment.purchase_order_id
            ),
            "status": shipment.status,
            "risk_status": shipment.risk_status,
            "delay_days": shipment.delay_days,
            "expected_delivery_date": _iso(
                shipment.expected_delivery_date
            ),
            "actual_delivery_date": _iso(
                shipment.actual_delivery_date
            ),
            "carrier_name": shipment.carrier_name,
            "tracking_reference": (
                shipment.tracking_reference
            ),
            "remarks": shipment.remarks,
        }
        for shipment in shipments
    ]


# ============================================================
# EXCEPTION DATA
# ============================================================

def build_exceptions(
    db: Session,
):
    """
    Return open exceptions associated with production
    procurement requests.

    Exceptions without a procurement request are retained,
    because they may be operational exceptions generated
    independently of the request lifecycle.
    """

    exceptions = (
        db.query(ProcurementException)
        .order_by(
            ProcurementException.detected_at.desc()
        )
        .all()
    )

    result = []

    for exception in exceptions:

        if exception.procurement_request_id:

            request = (
                db.query(ProcurementRequest)
                .filter(
                    ProcurementRequest.id
                    == exception.procurement_request_id
                )
                .first()
            )

            if request:

                record_type = getattr(
                    request,
                    "record_type",
                    "PRODUCTION",
                )

                if record_type != "PRODUCTION":
                    continue

        result.append(
            {
                "id": str(exception.id),
                "exception_number": (
                    exception.exception_number
                ),
                "procurement_request_id": (
                    str(exception.procurement_request_id)
                    if exception.procurement_request_id
                    else None
                ),
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
                "exception_type": (
                    exception.exception_type
                ),
                "severity": exception.severity,
                "title": exception.title,
                "description": exception.description,
                "business_impact": (
                    exception.business_impact
                ),
                "status": exception.status,
                "owner": exception.owner,
                "recommended_action": (
                    exception.recommended_action
                ),
                "detected_at": _iso(
                    exception.detected_at
                ),
                "resolved_at": _iso(
                    exception.resolved_at
                ),
            }
        )

    return result


# ============================================================
# CONTROL TOWER SUMMARY
# ============================================================

@router.get("/summary")
def get_control_tower_summary(
    db: Session = Depends(get_db),
):
    """
    Executive Control Tower summary.

    IMPORTANT:

    Only PRODUCTION procurement requests contribute to
    executive metrics.

    TEST / DEMO records are excluded.
    """

    # ========================================================
    # 1. PRODUCTION PROCUREMENT REQUESTS
    # ========================================================

    requests = (
        db.query(ProcurementRequest)
        .filter(
            ProcurementRequest.record_type
            == "PRODUCTION"
        )
        .order_by(
            ProcurementRequest.updated_at.desc()
        )
        .all()
    )

    # ========================================================
    # 2. DERIVE PROCUREMENT LIFECYCLE
    # ========================================================

    procurement_overview = (
        build_procurement_overview(
            db=db,
            requests=requests,
        )
    )

    # ========================================================
    # 3. LIFECYCLE COUNTS
    # ========================================================

    lifecycle_counts = {
        LIFECYCLE_INITIATION: 0,
        LIFECYCLE_PROCUREMENT: 0,
        LIFECYCLE_FULFILLMENT: 0,
        LIFECYCLE_EXECUTION: 0,
        LIFECYCLE_COMPLETED: 0,
    }

    for row in procurement_overview:

        category = row["lifecycle_category"]

        if category in lifecycle_counts:
            lifecycle_counts[category] += 1

    # ========================================================
    # 4. REQUEST COUNTS
    # ========================================================

    total_requests = len(requests)

    completed_requests = sum(
        1
        for row in procurement_overview
        if row["lifecycle_category"]
        == LIFECYCLE_COMPLETED
    )

    open_requests = (
        total_requests
        - completed_requests
    )

    # ========================================================
    # 5. APPROVAL COUNTS
    # ========================================================

    pending_approvals = (
        db.query(Approval)
        .join(
            RFQ,
            RFQ.id == Approval.rfq_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == RFQ.procurement_request_id,
        )
        .filter(
            Approval.status == "PENDING",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    approved_approvals = (
        db.query(Approval)
        .join(
            RFQ,
            RFQ.id == Approval.rfq_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == RFQ.procurement_request_id,
        )
        .filter(
            Approval.status == "APPROVED",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    # ========================================================
    # 6. PURCHASE ORDER COUNTS
    # ========================================================

    active_purchase_orders = (
        db.query(PurchaseOrder)
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            PurchaseOrder.status != "CLOSED",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    completed_purchase_orders = (
        db.query(PurchaseOrder)
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            PurchaseOrder.status == "CLOSED",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    total_purchase_orders = (
        active_purchase_orders
        + completed_purchase_orders
    )

    # ========================================================
    # 7. SHIPMENT COUNTS
    # ========================================================

    total_shipments = (
        db.query(Shipment)
        .join(
            PurchaseOrder,
            PurchaseOrder.id
            == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            ProcurementRequest.record_type
            == "PRODUCTION"
        )
        .count()
    )

    active_shipments = (
        db.query(Shipment)
        .join(
            PurchaseOrder,
            PurchaseOrder.id
            == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            Shipment.status != "DELIVERED",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    delivered_shipments = (
        db.query(Shipment)
        .join(
            PurchaseOrder,
            PurchaseOrder.id
            == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            Shipment.status == "DELIVERED",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    at_risk_shipments = (
        db.query(Shipment)
        .join(
            PurchaseOrder,
            PurchaseOrder.id
            == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            Shipment.risk_status.in_(
                [
                    "AT_RISK",
                    "DELAYED",
                ]
            ),
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    # ========================================================
    # 8. GOODS RECEIPT COUNTS
    # ========================================================

    pending_inspections = (
        db.query(GoodsReceipt)
        .join(
            Shipment,
            Shipment.id
            == GoodsReceipt.shipment_id,
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.id
            == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            GoodsReceipt.inspection_status
            == "PENDING",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    accepted_goods_receipts = (
        db.query(GoodsReceipt)
        .join(
            Shipment,
            Shipment.id
            == GoodsReceipt.shipment_id,
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.id
            == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            GoodsReceipt.status == "ACCEPTED",
            ProcurementRequest.record_type
            == "PRODUCTION",
        )
        .count()
    )

    total_goods_receipts = (
        db.query(GoodsReceipt)
        .join(
            Shipment,
            Shipment.id
            == GoodsReceipt.shipment_id,
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.id
            == Shipment.purchase_order_id,
        )
        .join(
            PurchaseRequisition,
            PurchaseRequisition.id
            == PurchaseOrder.purchase_requisition_id,
        )
        .join(
            ProcurementRequest,
            ProcurementRequest.id
            == PurchaseRequisition.procurement_request_id,
        )
        .filter(
            ProcurementRequest.record_type
            == "PRODUCTION"
        )
        .count()
    )

    # ========================================================
    # 9. EXCEPTIONS
    # ========================================================

    exceptions = build_exceptions(
        db=db,
    )

    open_exceptions = [
        exception
        for exception in exceptions
        if exception["status"]
        not in {
            "RESOLVED",
            "CLOSED",
        }
    ]

    critical_exceptions = [
        exception
        for exception in open_exceptions
        if exception["severity"]
        in {
            "CRITICAL",
            "HIGH",
        }
    ]

    # ========================================================
    # 10. SHIPMENT RISKS
    # ========================================================

    shipment_risks = build_shipment_risks(
        db=db,
    )

    # ========================================================
    # 11. PIPELINE COUNTS
    # ========================================================

    pipeline = {
        "procurement_requests": total_requests,

        "initiation": (
            lifecycle_counts[
                LIFECYCLE_INITIATION
            ]
        ),

        "procurement": (
            lifecycle_counts[
                LIFECYCLE_PROCUREMENT
            ]
        ),

        "fulfillment": (
            lifecycle_counts[
                LIFECYCLE_FULFILLMENT
            ]
        ),

        "execution": (
            lifecycle_counts[
                LIFECYCLE_EXECUTION
            ]
        ),

        "completed": (
            lifecycle_counts[
                LIFECYCLE_COMPLETED
            ]
        ),

        "pending_approvals": pending_approvals,

        "purchase_requisitions": (
            db.query(PurchaseRequisition)
            .join(
                ProcurementRequest,
                ProcurementRequest.id
                == PurchaseRequisition.procurement_request_id,
            )
            .filter(
                ProcurementRequest.record_type
                == "PRODUCTION"
            )
            .count()
        ),

        "purchase_orders": total_purchase_orders,

        "active_purchase_orders": (
            active_purchase_orders
        ),

        "active_shipments": active_shipments,

        "goods_receipts": total_goods_receipts,
    }

    # ========================================================
    # 12. EXECUTIVE KPI BLOCK
    # ========================================================

    kpis = {
        "total_requests": total_requests,

        "open_requests": open_requests,

        "completed_requests": completed_requests,

        "pending_approvals": pending_approvals,

        "active_purchase_orders": (
            active_purchase_orders
        ),

        "completed_purchase_orders": (
            completed_purchase_orders
        ),

        "total_shipments": total_shipments,

        "active_shipments": active_shipments,

        "delivered_shipments": (
            delivered_shipments
        ),

        "at_risk_shipments": at_risk_shipments,

        "open_exceptions": len(
            open_exceptions
        ),

        "critical_exceptions": len(
            critical_exceptions
        ),

        "pending_inspections": (
            pending_inspections
        ),

        "accepted_goods_receipts": (
            accepted_goods_receipts
        ),
    }

    # ========================================================
    # 13. SUMMARY
    # ========================================================

    summary = {
        "total_requests": total_requests,
        "open_requests": open_requests,
        "completed_requests": completed_requests,

        "approved_approvals": approved_approvals,

        "active_purchase_orders": (
            active_purchase_orders
        ),

        "completed_purchase_orders": (
            completed_purchase_orders
        ),

        "active_shipments": active_shipments,

        "delivered_shipments": (
            delivered_shipments
        ),

        "at_risk_shipments": at_risk_shipments,

        "open_exceptions": len(
            open_exceptions
        ),
    }

    # ========================================================
    # 14. FINAL RESPONSE
    # ========================================================

    generated_at = datetime.now(
        timezone.utc
    ).isoformat()

    return {
        "generated_at": generated_at,

        "kpis": kpis,

        "pipeline": pipeline,

        "lifecycle_counts": lifecycle_counts,

        # Correct new name
        "procurement_overview": (
            procurement_overview
        ),

        # ----------------------------------------------------
        # Backward compatibility with current frontend.
        #
        # Remove this later once page.tsx uses
        # procurement_overview.
        # ----------------------------------------------------
        "active_procurement": (
            procurement_overview
        ),

        "exceptions": open_exceptions,

        "shipment_risks": shipment_risks,

        "summary": summary,
    }