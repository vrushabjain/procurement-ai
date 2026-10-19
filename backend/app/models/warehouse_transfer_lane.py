import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class WarehouseTransferLane(Base):
    __tablename__ = "warehouse_transfer_lanes"

    __table_args__ = (
        UniqueConstraint(
            "source_warehouse_id",
            "destination_warehouse_id",
            name="uq_transfer_lane_source_destination",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    source_warehouse_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey("warehouses.id"),
    nullable=False,
)

    destination_warehouse_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey("warehouses.id"),
    nullable=False,
)

    distance_km: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    transit_days: Mapped[Decimal] = mapped_column(
        Numeric(8, 2),
        nullable=False,
    )

    fixed_transfer_cost: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=0,
    )

    cost_per_unit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=0,
    )

    currency_code: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )