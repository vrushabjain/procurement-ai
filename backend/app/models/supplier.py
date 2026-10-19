import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    supplier_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    supplier_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    country_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
    )

    supplier_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
    )

    quality_score: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    delivery_score: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    is_approved: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )