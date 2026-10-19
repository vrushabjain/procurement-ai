from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    po_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    purchase_requisition_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_requisitions.id"),
        nullable=False,
    )

    supplier_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
    )

    order_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    required_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
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

    freight_cost: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    insurance_cost: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    tax_cost: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0"),
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    expected_delivery_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    supplier_confirmation_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    supplier_confirmation_reference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    supplier_confirmed_quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 3),
        nullable=True,
    )

    supplier_confirmed_delivery_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    supplier_confirmation_comments: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    supplier_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
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


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    purchase_order_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id"),
        nullable=False,
    )

    purchase_requisition_item_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_requisition_items.id"),
        nullable=False,
    )

    material_id: Mapped[UUID] = mapped_column(
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

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    line_total: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    technical_specification: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    expected_delivery_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )