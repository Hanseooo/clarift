"""add_quiz_count_to_user_topic_performance

Revision ID: 0d0dc7af00b2
Revises: bda1912fcc31
Create Date: 2026-04-29 23:39:36.059648

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0d0dc7af00b2"
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
