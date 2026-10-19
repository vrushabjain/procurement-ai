
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.location import Location
from app.models.material import Material
from app.models.procurement_request import ProcurementRequest
from app.models.procurement_request_item import ProcurementRequestItem
from app.models.project import Project
from app.schemas.procurement_request import ProcurementRequestCreate


def create_procurement_request(
    db: Session,
    request_data: ProcurementRequestCreate,
) -> ProcurementRequest:
    # 1. Validate project
    project = db.scalar(
        select(Project).where(Project.id == request_data.project_id)
    )

    if not project:
        raise ValueError(
            f"Project not found: {request_data.project_id}"
        )

    # 2. Validate all materials and optional delivery locations
    for item in request_data.items:
        material = db.scalar(
            select(Material).where(Material.id == item.material_id)
        )

        if not material:
            raise ValueError(
                f"Material not found: {item.material_id}"
            )

        if item.delivery_location_id:
            location = db.scalar(
                select(Location).where(
                    Location.id == item.delivery_location_id
                )
            )

            if not location:
                raise ValueError(
                    "Delivery location not found: "
                    f"{item.delivery_location_id}"
                )

    # 3. Generate a unique human-readable request number
    request_number = (
        f"REQ-{datetime.utcnow():%Y%m%d}-"
        f"{uuid.uuid4().hex[:8].upper()}"
    )

    # 4. Create request and its line items
    procurement_request = ProcurementRequest(
        request_number=request_number,
        project_id=request_data.project_id,
        requested_by=request_data.requested_by.strip(),
        request_date=request_data.request_date,
        required_date=request_data.required_date,
        priority=request_data.priority,
        status="DRAFT",
        justification=request_data.justification,
    )

    for item in request_data.items:
        procurement_request.items.append(
            ProcurementRequestItem(
                material_id=item.material_id,
                quantity=item.quantity,
                uom=item.uom,
                technical_specification=item.technical_specification,
                delivery_location_id=item.delivery_location_id,
            )
        )

    # 5. Persist request and items in one transaction
    try:
        db.add(procurement_request)
        db.commit()

        # Reload the record with its items
        saved_request = db.scalar(
            select(ProcurementRequest)
            .options(selectinload(ProcurementRequest.items))
            .where(ProcurementRequest.id == procurement_request.id)
        )

        if saved_request is None:
            raise ValueError(
                "Request was saved but could not be reloaded."
            )

        return saved_request

    except Exception:
        db.rollback()
        raise


def get_procurement_request_by_number(
    db: Session,
    request_number: str,
):
    """Retrieve a procurement request by its human-readable number."""

    procurement_request = db.scalar(
        select(ProcurementRequest)
        .options(selectinload(ProcurementRequest.items))
        .where(
            ProcurementRequest.request_number == request_number
        )
    )

    if not procurement_request:
        raise ValueError(
            f"Procurement request {request_number} was not found."
        )

    return {
        "id": procurement_request.id,
        "request_number": procurement_request.request_number,
        "project_id": procurement_request.project_id,
        "requested_by": procurement_request.requested_by,
        "request_date": procurement_request.request_date,
        "required_date": procurement_request.required_date,
        "priority": procurement_request.priority,
        "status": procurement_request.status,
        "justification": procurement_request.justification,
        "items": [
            {
                "id": item.id,
                "material_id": item.material_id,
                "quantity": item.quantity,
                "uom": item.uom,
                "technical_specification": item.technical_specification,
                "delivery_location_id": item.delivery_location_id,
                "item_status": item.item_status,
            }
            for item in procurement_request.items
        ],
    }
