from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem
from app.database import get_db
from fastapi import HTTPException
from app.schemas.procurement_request import (
    ProcurementRequestCreate,
    ProcurementRequestResponse,
)
from app.schemas.supply_analysis import SupplyAnalysisResponse
from app.services.procurement_request_service import (
    create_procurement_request,
    get_procurement_request_by_number,
)

from app.services.supply_analysis_service import (
    analyze_supply,
)

from app.services.rfq_service import (
    create_rfq_from_procurement_request,
)

from app.schemas.supply_decision import SupplyDecisionResponse
from app.services.supply_decision_service import (
    get_supply_decision,
)

from app.api.internal_fulfilment_orders import (
    router as internal_fulfilment_orders_router,
)
from decimal import Decimal

from app.schemas.inventory_reservation import (
    InventoryReservationResponse,
)

from app.services.inventory_reservation_service import (
    reserve_inventory,
)

from app.services.supplier_eligibility_service import (
    get_supplier_eligibility,
)

from app.schemas.supplier_eligibility import SupplierEligibilityResponse

from datetime import date
from uuid import UUID

from app.schemas.shipment import (
    ShipmentCreateRequest,
    ShipmentResponse,
)

from app.services.shipment_service import (
    create_shipment,
    dispatch_shipment,
    mark_shipment_in_transit,
    deliver_shipment,
    refresh_shipment_risk,
)

from app.schemas.goods_receipt import (
    GoodsReceiptCreateRequest,
    GoodsReceiptInspectionRequest,
    GoodsReceiptResponse,
)

from app.services.goods_receipt_service import (
    create_goods_receipt,
    complete_goods_receipt_inspection,
)

from app.services.procurement_closure_service import close_purchase_order

from app.services.exception_risk_service import evaluate_purchase_order

from app.models.procurement_exception import ProcurementException

from app.api.control_tower import (
    router as control_tower_router,
)
from app.api.authorizations import router as authorizations_router

from app.api.approvals import router as approvals_router

from app.api.purchase_requisitions import (
    router as purchase_requisitions_router,
)

from app.api.purchase_orders import (
    router as purchase_orders_router,
)
from app.models.procurement_request import ProcurementRequest
from app.models.rfq_supplier import RFQSupplier
from app.models.supplier import Supplier
from app.models.supplier_quote import SupplierQuote
from app.models.supplier_quote_item import SupplierQuoteItem
from app.services.quote_evaluation_service import evaluate_quotes
from app.api.catalog import router as catalog_router

router = APIRouter()

router.include_router(control_tower_router)
router.include_router(authorizations_router)
router.include_router(approvals_router)
router.include_router(
    purchase_requisitions_router
)
router.include_router(
    purchase_orders_router
)
router.include_router(catalog_router)
router.include_router(internal_fulfilment_orders_router)
# ============================================================
# HEALTH CHECK
# ============================================================

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "procurement-ai-api",
    }


# ============================================================
# PROCUREMENT REQUESTS
# ============================================================

@router.post(
    "/procurement-requests",
    response_model=ProcurementRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_request(
    request_data: ProcurementRequestCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new procurement request with one or more
    procurement request items.
    """

    try:
        return create_procurement_request(
            db=db,
            request_data=request_data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

@router.get(
    "/procurement-requests",
    response_model=list[ProcurementRequestResponse],
)
def list_procurement_requests(
    db: Session = Depends(get_db),
):
    requests = db.scalars(
        select(ProcurementRequest)
        .options(selectinload(ProcurementRequest.items))
        .order_by(ProcurementRequest.request_date.desc())
    ).all()

    return [
        {
            "id": request.id,
            "request_number": request.request_number,
            "project_id": request.project_id,
            "requested_by": request.requested_by,
            "request_date": request.request_date,
            "required_date": request.required_date,
            "priority": request.priority,
            "status": request.status,
            "justification": request.justification,
            "items": [
                {
                    "id": item.id,
                    "material_id": item.material_id,
                    "quantity": item.quantity,
                    "uom": item.uom,
                    "technical_specification": (
                        item.technical_specification
                    ),
                    "delivery_location_id": (
                        item.delivery_location_id
                    ),
                    "item_status": item.item_status,
                }
                for item in request.items
            ],
        }
        for request in requests
    ]

# ============================================================
# GET PROCUREMENT REQUEST BY REQUEST NUMBER
# ============================================================

@router.get(
    "/procurement-requests/by-number/{request_number}",
    response_model=ProcurementRequestResponse,
)
def get_request_by_number(
    request_number: str,
    db: Session = Depends(get_db),
):
    import traceback

    try:
        return get_procurement_request_by_number(
            db=db,
            request_number=request_number,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# SUPPLY ANALYSIS
# ============================================================

@router.get(
    "/procurement-requests/{request_id}/items/{item_id}/supply-analysis",
    response_model=SupplyAnalysisResponse,
)
def get_supply_analysis(
    request_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Analyze whether the requested material can be fulfilled
    from existing internal inventory.

    Calculates:
        Physical Quantity
        - Active Commitments
        = Available-to-Promise (ATP)
    """

    try:
        return analyze_supply(
            db=db,
            procurement_request_id=request_id,
            procurement_request_item_id=item_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

# ============================================================
# SUPPLY DECISION
# ============================================================

@router.get(
    "/procurement-requests/{request_id}/items/{item_id}/supply-decision",
    response_model=SupplyDecisionResponse,
)
def get_supply_decision_endpoint(
    request_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Determine the recommended supply strategy:

    1. Local inventory
    2. Internal transfer
    3. External sourcing
    """

    try:
        return get_supply_decision(
            db=db,
            procurement_request_id=request_id,
            procurement_request_item_id=item_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

# ============================================================
# INVENTORY RESERVATION
# ============================================================

@router.post(
    "/inventory/{inventory_id}/reserve",
    response_model=InventoryReservationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_reservation(
    inventory_id: UUID,
    procurement_request_item_id: UUID,
    quantity: Decimal,
    reserved_by: str,
    db: Session = Depends(get_db),
):
    """
    Reserve inventory for a procurement request item.

    The reservation is allowed only when:

        Physical
        - Commitments
        - Existing Reservations
        >= Requested Quantity
    """

    try:
        reservation = reserve_inventory(
            db=db,
            procurement_request_item_id=(
                procurement_request_item_id
            ),
            inventory_id=inventory_id,
            quantity=quantity,
            reserved_by=reserved_by,
        )

        db.commit()

        db.refresh(reservation)

        return reservation

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create inventory reservation.",
        )

# ============================================================
# SUPPLIER SERVICE ELIGIBILITY
# ============================================================


@router.get(
    "/procurement-requests/{request_id}/items/{item_id}/supplier-eligibility",
    response_model=SupplierEligibilityResponse,
)
def get_supplier_eligibility_endpoint(
    request_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        return get_supplier_eligibility(
            db=db,
            procurement_request_id=request_id,
            procurement_request_item_id=item_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.post(
    "/shipments",
    response_model=ShipmentResponse,
)
def create_shipment_endpoint(
    payload: ShipmentCreateRequest,
    db: Session = Depends(get_db),
):
    try:
        return create_shipment(
            db=db,
            purchase_order_id=payload.purchase_order_id,
            quantity_shipped=payload.quantity_shipped,
            expected_delivery_date=payload.expected_delivery_date,
            shipment_date=payload.shipment_date,
            carrier_name=payload.carrier_name,
            tracking_reference=payload.tracking_reference,
            remarks=payload.remarks,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/shipments/{shipment_id}/dispatch",
    response_model=ShipmentResponse,
)
def dispatch_shipment_endpoint(
    shipment_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        return dispatch_shipment(
            db=db,
            shipment_id=shipment_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/shipments/{shipment_id}/in-transit",
    response_model=ShipmentResponse,
)
def shipment_in_transit_endpoint(
    shipment_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        return mark_shipment_in_transit(
            db=db,
            shipment_id=shipment_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/shipments/{shipment_id}/deliver",
    response_model=ShipmentResponse,
)
def deliver_shipment_endpoint(
    shipment_id: UUID,
    actual_delivery_date: date,
    db: Session = Depends(get_db),
):
    try:
        return deliver_shipment(
            db=db,
            shipment_id=shipment_id,
            actual_delivery_date=actual_delivery_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/shipments/{shipment_id}/refresh-risk",
    response_model=ShipmentResponse,
)
def refresh_shipment_risk_endpoint(
    shipment_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        return refresh_shipment_risk(
            db=db,
            shipment_id=shipment_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

@router.post(
    "/goods-receipts",
    response_model=GoodsReceiptResponse,
)
def create_goods_receipt_endpoint(
    payload: GoodsReceiptCreateRequest,
    db: Session = Depends(get_db),
):
    try:
        return create_goods_receipt(
            db=db,
            shipment_id=payload.shipment_id,
            quantity_received=payload.quantity_received,
            receipt_date=payload.receipt_date,
            remarks=payload.remarks,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/goods-receipts/{grn_id}/inspect",
    response_model=GoodsReceiptResponse,
)
def inspect_goods_receipt_endpoint(
    grn_id: UUID,
    payload: GoodsReceiptInspectionRequest,
    db: Session = Depends(get_db),
):
    try:
        return complete_goods_receipt_inspection(
            db=db,
            grn_id=grn_id,
            accepted_quantity=payload.accepted_quantity,
            rejected_quantity=payload.rejected_quantity,
            inspection_passed=payload.inspection_passed,
            rejection_reason=payload.rejection_reason,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

@router.post(
    "/purchase-orders/{purchase_order_id}/close",
)
def close_purchase_order_endpoint(
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        purchase_order = close_purchase_order(
            db=db,
            purchase_order_id=purchase_order_id,
        )

        return {
            "purchase_order_id": purchase_order.id,
            "po_number": purchase_order.po_number,
            "status": purchase_order.status,
            "message": (
                f"Purchase Order {purchase_order.po_number} "
                "closed successfully."
            ),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

@router.post(
    "/purchase-orders/{purchase_order_id}/evaluate-risks",
)
def evaluate_purchase_order_risks_endpoint(
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        exceptions = evaluate_purchase_order(
            db=db,
            purchase_order_id=purchase_order_id,
        )

        return {
            "purchase_order_id": purchase_order_id,
            "exception_count": len(exceptions),
            "exceptions": [
                {
                    "id": exception.id,
                    "exception_number": exception.exception_number,
                    "exception_type": exception.exception_type,
                    "severity": exception.severity,
                    "title": exception.title,
                    "description": exception.description,
                    "business_impact": exception.business_impact,
                    "recommended_action": exception.recommended_action,
                    "status": exception.status,
                }
                for exception in exceptions
            ],
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

@router.get(
    "/exceptions",
)
def get_exceptions(
    status_filter: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(ProcurementException)

    if status_filter:
        query = query.filter(
            ProcurementException.status == status_filter
        )

    if severity:
        query = query.filter(
            ProcurementException.severity == severity
        )

    exceptions = query.order_by(
        ProcurementException.detected_at.desc()
    ).all()

    return {
        "count": len(exceptions),
        "exceptions": [
            {
                "id": exception.id,
                "exception_number": exception.exception_number,
                "procurement_request_id": exception.procurement_request_id,
                "purchase_order_id": exception.purchase_order_id,
                "shipment_id": exception.shipment_id,
                "exception_type": exception.exception_type,
                "severity": exception.severity,
                "title": exception.title,
                "description": exception.description,
                "business_impact": exception.business_impact,
                "status": exception.status,
                "owner": exception.owner,
                "recommended_action": exception.recommended_action,
                "detected_at": exception.detected_at,
                "resolved_at": exception.resolved_at,
            }
            for exception in exceptions
        ],
    }

# ============================================================
# CREATE RFQ FROM PROCUREMENT REQUEST ITEM
# ============================================================

@router.post(
    "/procurement-requests/{request_id}/items/{item_id}/rfq",
    status_code=status.HTTP_201_CREATED,
)
def create_rfq_endpoint(
    request_id: UUID,
    item_id: UUID,
    response_due_days: int = 7,
    db: Session = Depends(get_db),
):
    """
    Create a DRAFT RFQ for the externally required quantity.

    This endpoint does not issue the RFQ.
    Issuance must follow the existing authorization workflow.
    """

    if not 1 <= response_due_days <= 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="response_due_days must be between 1 and 90.",
        )

    try:
        rfq = create_rfq_from_procurement_request(
            db=db,
            procurement_request_id=request_id,
            procurement_request_item_id=item_id,
            response_due_days=response_due_days,
        )

        return {
            "id": str(rfq.id),
            "rfq_number": rfq.rfq_number,
            "procurement_request_id": str(
                rfq.procurement_request_id
            ),
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
            "message": (
                "RFQ created as DRAFT. "
                "Human authorization is required before issuance."
            ),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# GET EXISTING RFQ BY PROCUREMENT REQUEST ITEM
# ============================================================

@router.get(
    "/procurement-requests/{request_id}/items/{item_id}/rfq"
)
def get_rfq_for_procurement_item(
    request_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return the RFQ associated with a procurement request item.
    Return 404 when no RFQ exists for the item.
    """

    rfq = db.scalar(
        select(RFQ)
        .join(
            RFQItem,
            RFQItem.rfq_id == RFQ.id,
        )
        .where(
            RFQItem.procurement_request_item_id == item_id,
            RFQ.procurement_request_id == request_id,
        )
    )

    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No RFQ exists for this procurement request item.",
        )

    return {
        "id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "procurement_request_id": str(rfq.procurement_request_id),
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
    }


# ============================================================
# SUPPLIER QUOTATION TRACKING
# ============================================================

@router.get("/rfqs/{rfq_id}/quotations")
def get_rfq_quotations(
    rfq_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Return actual supplier invitations and submitted quotations
    for an RFQ.
    """

    rfq = db.scalar(
        select(RFQ).where(RFQ.id == rfq_id)
    )

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found.",
        )

    invitations = db.execute(
        select(RFQSupplier, Supplier)
        .join(
            Supplier,
            Supplier.id == RFQSupplier.supplier_id,
        )
        .where(RFQSupplier.rfq_id == rfq_id)
    ).all()

    quote_rows = db.execute(
        select(SupplierQuote, Supplier, SupplierQuoteItem)
        .join(
            Supplier,
            Supplier.id == SupplierQuote.supplier_id,
        )
        .join(
            SupplierQuoteItem,
            SupplierQuoteItem.supplier_quote_id
            == SupplierQuote.id,
        )
        .where(SupplierQuote.rfq_id == rfq_id)
    ).all()

    quotes_by_supplier = {}

    for quote, supplier, quote_item in quote_rows:
        supplier_key = str(supplier.id)

        quotes_by_supplier.setdefault(
            supplier_key, []
        ).append(
            {
                "quote_id": str(quote.id),
                "quote_number": quote.quote_number,
                "status": quote.status,
                "quote_date": (
                    quote.quote_date.isoformat()
                    if quote.quote_date else None
                ),
                "valid_until": (
                    quote.valid_until.isoformat()
                    if quote.valid_until else None
                ),
                "currency_code": quote.currency_code,
                "quantity": float(quote_item.quantity),
                "unit_price": float(quote_item.unit_price),
                "lead_time_days": quote_item.lead_time_days,
                "technical_compliance": (
                    quote_item.technical_compliance
                ),
                "quality_compliance": (
                    quote_item.quality_compliance
                ),
                "freight_cost": float(quote.freight_cost or 0),
                "insurance_cost": float(
                    quote.insurance_cost or 0
                ),
                "tax_cost": float(quote.tax_cost or 0),
                "total_quote_value": (
                    float(quote.total_quote_value)
                    if quote.total_quote_value is not None
                    else None
                ),
                "payment_terms": quote.payment_terms,
                "incoterm": quote.incoterm,
                "remarks": quote_item.remarks or quote.notes,
            }
        )

    supplier_results = []

    for invitation, supplier in invitations:
        supplier_quotes = quotes_by_supplier.get(
            str(supplier.id), []
        )

        supplier_results.append(
            {
                "supplier_id": str(supplier.id),
                "supplier_code": supplier.supplier_code,
                "supplier_name": supplier.supplier_name,
                "country_code": supplier.country_code,
                "invitation_status": invitation.invitation_status,
                "invited_at": (
                    invitation.invited_at.isoformat()
                    if invitation.invited_at else None
                ),
                "responded_at": (
                    invitation.responded_at.isoformat()
                    if invitation.responded_at else None
                ),
                "quote_count": len(supplier_quotes),
                "quotes": supplier_quotes,
            }
        )

    received_quote_count = sum(
        len(supplier["quotes"])
        for supplier in supplier_results
    )

    return {
        "rfq_id": str(rfq.id),
        "rfq_number": rfq.rfq_number,
        "rfq_status": rfq.status,
        "currency_code": rfq.currency_code,
        "supplier_count": len(supplier_results),
        "responded_supplier_count": sum(
            1
            for supplier in supplier_results
            if supplier["invitation_status"] == "RESPONDED"
        ),
        "pending_supplier_count": sum(
            1
            for supplier in supplier_results
            if supplier["invitation_status"] != "RESPONDED"
        ),
        "received_quote_count": received_quote_count,
        "suppliers": supplier_results,
    }


# ============================================================
# SUPPLIER QUOTE EVALUATION
# ============================================================

@router.post("/rfqs/{rfq_id}/evaluate")
def evaluate_rfq_quotations(
    rfq_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Evaluate received supplier quotations using the
    existing quote evaluation service.
    """

    try:
        return evaluate_quotes(
            db=db,
            rfq_id=rfq_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.get("/rfqs/{rfq_id}/sourcing-recommendation")
def get_sourcing_recommendation_endpoint(
    rfq_id: UUID,
    db: Session = Depends(get_db),
):
    from app.services.sourcing_recommendation_service import (
        generate_sourcing_recommendation,
    )

    # Verify that the RFQ exists before generating a recommendation.
    rfq = db.scalar(
        select(RFQ).where(RFQ.id == rfq_id)
    )

    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RFQ not found: {rfq_id}",
        )

    try:
        recommendation = generate_sourcing_recommendation(
            db=db,
            rfq_id=rfq_id,
        )

        return recommendation.model_dump(mode="json")

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
