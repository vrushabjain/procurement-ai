"""add approval table

Revision ID: 082d2ecfba32
Revises: 4c947a89f5e2
Create Date: 2026-10-02 18:28:28.800718

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "082d2ecfba32"
down_revision: Union[str, Sequence[str], None] = "4c947a89f5e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create approvals table."""

    op.create_table(
        "approvals",

        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "approval_number",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "rfq_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "quote_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "supplier_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),

        sa.Column(
            "approval_type",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "approval_level",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "amount",
            sa.Numeric(precision=18, scale=2),
            nullable=False,
        ),

        sa.Column(
            "currency_code",
            sa.String(length=3),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "requested_by",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "approver",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "comments",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "decided_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["rfq_id"],
            ["rfqs.id"],
        ),

        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["supplier_quotes.id"],
        ),

        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "approval_number",
            name="uq_approvals_approval_number",
        ),
    )


def downgrade() -> None:
    """Drop approvals table."""

    op.drop_table("approvals")