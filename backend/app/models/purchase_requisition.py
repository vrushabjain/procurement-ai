import uuid
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PurchaseRequisition(Base):
    __tablename__ = "purchase_requisitions"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    pr_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    procurement_request_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("procurement_requests.id"),
        nullable=False,
    )

    rfq_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("rfqs.id"),
        nullable=False,
    )

    quote_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("supplier_quotes.id"),
        nullable=False,
    )

    approval_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("approvals.id"),
        nullable=False,
    )

    supplier_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
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

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    requested_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
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

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class PurchaseRequisitionItem(Base):
    __tablename__ = "purchase_requisition_items"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    purchase_requisition_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("purchase_requisitions.id"),
        nullable=False,
    )

    procurement_request_item_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("procurement_request_items.id"),
        nullable=False,
    )

    rfq_item_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("rfq_items.id"),
        nullable=False,
    )

    material_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
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

    landed_cost: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    technical_specification: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )