import uuid
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    approval_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
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

    supplier_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    approval_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="SOURCING",
    )

    approval_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )

    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    requested_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    approver: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    comments: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )