"""add authorization rejection fields

Revision ID: 00768a973ce8
Revises: ab55d92b4a07
Create Date: 2026-10-03 12:58:02.496668

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "00768a973ce8"
down_revision: Union[str, Sequence[str], None] = "ab55d92b4a07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add rejection tracking fields to action authorizations."""

    op.add_column(
        "action_authorizations",
        sa.Column(
            "rejected_by",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "action_authorizations",
        sa.Column(
            "rejected_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove rejection tracking fields."""

    op.drop_column(
        "action_authorizations",
        "rejected_at",
    )

    op.drop_column(
        "action_authorizations",
        "rejected_by",
    )