"""add purchase order tables

Revision ID: b5da8a3ceef8
Revises: 22764148e251
Create Date: 2026-10-02 19:03:10.138413

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b5da8a3ceef8"
down_revision: Union[str, Sequence[str], None] = "22764148e251"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create purchase order tables."""

    op.create_table(
        "purchase_orders",

        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "po_number",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "purchase_requisition_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "supplier_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="DRAFT",
        ),

        sa.Column(
            "order_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "required_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "currency_code",
            sa.String(length=3),
            nullable=False,
            server_default="USD",
        ),

        sa.Column(
            "payment_terms",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "incoterm",
            sa.String(length=20),
            nullable=True,
        ),

        sa.Column(
            "freight_cost",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "insurance_cost",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "tax_cost",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "total_amount",
            sa.Numeric(18, 2),
            nullable=False,
        ),

        sa.Column(
            "expected_delivery_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "supplier_confirmation_status",
            sa.String(length=30),
            nullable=False,
            server_default="PENDING",
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_by",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["purchase_requisition_id"],
            ["purchase_requisitions.id"],
        ),

        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "po_number",
            name="uq_purchase_orders_po_number",
        ),
    )

    op.create_table(
        "purchase_order_items",

        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "purchase_order_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "purchase_requisition_item_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "material_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "quantity",
            sa.Numeric(18, 3),
            nullable=False,
        ),

        sa.Column(
            "uom",
            sa.String(length=20),
            nullable=False,
        ),

        sa.Column(
            "unit_price",
            sa.Numeric(18, 2),
            nullable=False,
        ),

        sa.Column(
            "line_total",
            sa.Numeric(18, 2),
            nullable=False,
        ),

        sa.Column(
            "technical_specification",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "expected_delivery_date",
            sa.Date(),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_orders.id"],
        ),

        sa.ForeignKeyConstraint(
            ["purchase_requisition_item_id"],
            ["purchase_requisition_items.id"],
        ),

        sa.ForeignKeyConstraint(
            ["material_id"],
            ["materials.id"],
        ),

        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Drop purchase order tables."""

    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")