from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    grn_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    shipment_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("shipments.id"),
        nullable=False,
    )

    purchase_order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("purchase_orders.id"),
        nullable=False,
    )

    receipt_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    quantity_received: Mapped[Decimal] = mapped_column(
        Numeric(18, 3),
        nullable=False,
    )

    quantity_accepted: Mapped[Decimal] = mapped_column(
        Numeric(18, 3),
        nullable=False,
        default=0,
    )

    quantity_rejected: Mapped[Decimal] = mapped_column(
        Numeric(18, 3),
        nullable=False,
        default=0,
    )

    inspection_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
    )

    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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