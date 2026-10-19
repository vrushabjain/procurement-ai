import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.procurement_request import ProcurementRequest

class ProcurementRequestItem(Base):
    __tablename__ = "procurement_request_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    procurement_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procurement_requests.id"),
        nullable=False,
    )

    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("materials.id"),
        nullable=False,
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(18, 3),
        nullable=False,
    )

    uom: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    technical_specification: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    delivery_location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id"),
        nullable=True,
    )

    item_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="OPEN",
    )

    procurement_request: Mapped["ProcurementRequest"] = relationship(
        back_populates="items"
    )
