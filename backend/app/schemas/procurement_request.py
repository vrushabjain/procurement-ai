
from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class ProcurementRequestItemCreate(BaseModel):
    material_id: UUID
    quantity: Decimal = Field(gt=0)
    uom: str = Field(min_length=1, max_length=20)
    technical_specification: str | None = None
    delivery_location_id: UUID | None = None


class ProcurementRequestCreate(BaseModel):
    project_id: UUID
    requested_by: str = Field(min_length=1, max_length=255)
    request_date: date
    required_date: date
    priority: str = "NORMAL"
    justification: str | None = None
    items: list[ProcurementRequestItemCreate] = Field(min_length=1)

    @field_validator("requested_by")
    @classmethod
    def validate_requested_by(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("requested_by cannot be blank")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        normalized = value.strip().upper()
        allowed = {"LOW", "NORMAL", "HIGH", "CRITICAL"}

        if normalized not in allowed:
            raise ValueError(
                "priority must be LOW, NORMAL, HIGH, or CRITICAL"
            )

        return normalized

    @field_validator("required_date")
    @classmethod
    def validate_required_date(cls, value: date, info) -> date:
        request_date = info.data.get("request_date")

        if request_date and value < request_date:
            raise ValueError(
                "required_date cannot be earlier than request_date"
            )

        return value


class ProcurementRequestItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    material_id: UUID
    quantity: Decimal
    uom: str
    technical_specification: str | None
    delivery_location_id: UUID | None
    item_status: str


class ProcurementRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_number: str
    project_id: UUID
    requested_by: str
    request_date: date
    required_date: date
    priority: str
    status: str
    justification: str | None
    items: list[ProcurementRequestItemResponse]
