import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship

class ProcurementRequest(Base):
    __tablename__ = "procurement_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    request_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id"),
        nullable=False,
    )

    requested_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    request_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    required_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    priority: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="NORMAL",
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="DRAFT",
    )

    record_type: Mapped[str] = mapped_column(
    String(20),
    nullable=False,
    default="PRODUCTION",
    server_default="PRODUCTION",
    )

    justification: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    items: Mapped[list["ProcurementRequestItem"]] = relationship(
        back_populates="procurement_request",
        cascade="all, delete-orphan",
    )