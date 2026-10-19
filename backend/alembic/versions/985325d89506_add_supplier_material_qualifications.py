"""add supplier material qualifications

Revision ID: 985325d89506
Revises: 1de75d7896c2
Create Date: 2026-09-29 21:25:52.553596

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "985325d89506"
down_revision: Union[str, Sequence[str], None] = "1de75d7896c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add database-side defaults to supplier qualifications."""

    op.alter_column(
        "supplier_material_qualifications",
        "qualification_status",
        existing_type=sa.String(length=30),
        existing_nullable=False,
        server_default=sa.text("'QUALIFIED'"),
    )

    op.alter_column(
        "supplier_material_qualifications",
        "technical_approval",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=sa.false(),
    )

    op.alter_column(
        "supplier_material_qualifications",
        "quality_approval",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=sa.false(),
    )

    op.alter_column(
        "supplier_material_qualifications",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False,
        server_default=sa.func.now(),
    )


def downgrade() -> None:
    """Remove database-side defaults from supplier qualifications."""

    op.alter_column(
        "supplier_material_qualifications",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False,
        server_default=None,
    )

    op.alter_column(
        "supplier_material_qualifications",
        "quality_approval",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=None,
    )

    op.alter_column(
        "supplier_material_qualifications",
        "technical_approval",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=None,
    )

    op.alter_column(
        "supplier_material_qualifications",
        "qualification_status",
        existing_type=sa.String(length=30),
        existing_nullable=False,
        server_default=None,
    )