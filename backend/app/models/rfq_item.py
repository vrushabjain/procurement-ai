import uuid

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RFQItem(Base):
    __tablename__ = "rfq_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    rfq_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rfqs.id"),
        nullable=False,
    )

    procurement_request_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procurement_request_items.id"),
        nullable=False,
    )

    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("materials.id"),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
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