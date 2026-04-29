"""add_quiz_count_to_user_topic_performance

Revision ID: b0b2631e291c
Revises: bda1912fcc31
Create Date: 2026-04-29 23:45:13.463669

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b0b2631e291c"
down_revision: Union[str, Sequence[str], None] = "bda1912fcc31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_topic_performance",
        sa.Column("quiz_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("user_topic_performance", "quiz_count")
