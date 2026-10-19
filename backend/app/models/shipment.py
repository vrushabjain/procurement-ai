from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    shipment_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    purchase_order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("purchase_orders.id"),
        nullable=False,
    )

    supplier_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PLANNED",
    )

    quantity_shipped: Mapped[Decimal] = mapped_column(
        Numeric(18, 3),
        nullable=False,
    )

    shipment_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    expected_delivery_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    actual_delivery_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    carrier_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    tracking_reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    delay_days: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
    )

    risk_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ON_TRACK",
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )