"""Add user_preferences to users

Revision ID: e4807cf4e66e
Revises: 9f2b1d3c4a55
Create Date: 2026-04-21 18:18:52.209255

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4807cf4e66e"
down_revision: Union[str, Sequence[str], None] = "9f2b1d3c4a55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("user_preferences", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.execute(
        """
        UPDATE users
        SET user_preferences = jsonb_build_object('output_format', up.output_format)
        FROM user_preferences up
        WHERE users.id = up.user_id
        """
    )

    op.drop_table("user_preferences")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        "user_preferences",
        sa.Column("user_id", sa.UUID(), autoincrement=False, nullable=False),
        sa.Column(
            "output_format",
            sa.TEXT(),
            server_default=sa.text("'bullet'::text"),
            autoincrement=False,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("user_preferences_user_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("user_preferences_pkey")),
    )

    op.execute(
        """
        INSERT INTO user_preferences (user_id, output_format)
        SELECT id, COALESCE(user_preferences->>'output_format', 'bullet')
        FROM users
        WHERE user_preferences IS NOT NULL
        """
    )

    op.drop_column("users", "user_preferences")
