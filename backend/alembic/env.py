from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import settings
from app.models.base import Base

# Import all models so SQLAlchemy registers their tables
from app.models import (
    Country,
    Project,
    Location,
    Warehouse,
    Material,
    Supplier,
    Inventory,
    InventoryCommitment,
    ProcurementRequest,
    ProcurementRequestItem,
    InventoryReservation,
    WarehouseTransferLane,
    SupplierMaterialQualification,
    RFQ,
    RFQItem,
    RFQSupplier,
    SupplierQuote,
    SupplierQuoteItem,
    Approval,
    PurchaseRequisition,
    PurchaseRequisitionItem,
    PurchaseOrder,
    PurchaseOrderItem,
    Shipment,
    GoodsReceipt,
    ProcurementException,
     ActionAuthorization,
)


# Alembic Config object
config = context.config


# Configure Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# SQLAlchemy metadata used by Alembic
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations without creating a database connection.
    """

    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations using a live database connection.
    """

    connectable = create_engine(
        settings.database_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()