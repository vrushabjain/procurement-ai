import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SupplierQuoteItem(Base):
    __tablename__ = "supplier_quote_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    supplier_quote_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("supplier_quotes.id"),
        nullable=False,
    )

    rfq_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rfq_items.id"),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
        Numeric(18, 3),
        nullable=False,
    )

    unit_price: Mapped[float] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    lead_time_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    technical_compliance: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    quality_compliance: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )