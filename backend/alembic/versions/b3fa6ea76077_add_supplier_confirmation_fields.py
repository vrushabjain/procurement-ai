"""add supplier confirmation fields

Revision ID: b3fa6ea76077
Revises: b5da8a3ceef8
Create Date: 2026-10-02 19:34:13.832597

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3fa6ea76077"
down_revision: Union[str, Sequence[str], None] = "b5da8a3ceef8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add supplier confirmation fields to purchase orders."""

    op.add_column(
        "purchase_orders",
        sa.Column(
            "supplier_confirmation_reference",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "purchase_orders",
        sa.Column(
            "supplier_confirmed_quantity",
            sa.Numeric(18, 3),
            nullable=True,
        ),
    )

    op.add_column(
        "purchase_orders",
        sa.Column(
            "supplier_confirmed_delivery_date",
            sa.Date(),
            nullable=True,
        ),
    )

    op.add_column(
        "purchase_orders",
        sa.Column(
            "supplier_confirmation_comments",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "purchase_orders",
        sa.Column(
            "supplier_confirmed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove supplier confirmation fields from purchase orders."""

    op.drop_column(
        "purchase_orders",
        "supplier_confirmed_at",
    )

    op.drop_column(
        "purchase_orders",
        "supplier_confirmation_comments",
    )

    op.drop_column(
        "purchase_orders",
        "supplier_confirmed_delivery_date",
    )

    op.drop_column(
        "purchase_orders",
        "supplier_confirmed_quantity",
    )

    op.drop_column(
        "purchase_orders",
        "supplier_confirmation_reference",
    )