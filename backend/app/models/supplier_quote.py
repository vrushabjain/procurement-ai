import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SupplierQuote(Base):
    __tablename__ = "supplier_quotes"

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

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    quote_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="RECEIVED",
    )

    quote_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    valid_until: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
    )

    payment_terms: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    incoterm: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    delivery_days: Mapped[int | None] = mapped_column(
        nullable=True,
    )

    freight_cost: Mapped[float] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=0,
    )

    insurance_cost: Mapped[float] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=0,
    )

    tax_cost: Mapped[float] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=0,
    )

    total_quote_value: Mapped[float | None] = mapped_column(
        Numeric(18, 2),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )