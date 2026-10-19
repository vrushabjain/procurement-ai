"""add warehouse transfer lanes

Revision ID: 2c51a64ad2e9
Revises: 103f11b1fa85
Create Date: 2026-09-29 21:00:43.255505

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2c51a64ad2e9"
down_revision: Union[str, Sequence[str], None] = "103f11b1fa85"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create warehouse transfer lanes table."""

    op.create_table(
        "warehouse_transfer_lanes",

        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),

        sa.Column(
            "source_warehouse_id",
            sa.UUID(),
            nullable=False,
        ),

        sa.Column(
            "destination_warehouse_id",
            sa.UUID(),
            nullable=False,
        ),

        sa.Column(
            "distance_km",
            sa.Numeric(12, 2),
            nullable=False,
        ),

        sa.Column(
            "transit_days",
            sa.Numeric(8, 2),
            nullable=False,
        ),

        sa.Column(
            "fixed_transfer_cost",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "cost_per_unit",
            sa.Numeric(18, 2),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "currency_code",
            sa.String(length=3),
            nullable=False,
            server_default="USD",
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.ForeignKeyConstraint(
            ["source_warehouse_id"],
            ["warehouses.id"],
        ),

        sa.ForeignKeyConstraint(
            ["destination_warehouse_id"],
            ["warehouses.id"],
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "source_warehouse_id",
            "destination_warehouse_id",
            name="uq_transfer_lane_source_destination",
        ),
    )


def downgrade() -> None:
    """Drop warehouse transfer lanes table."""

    op.drop_table("warehouse_transfer_lanes")