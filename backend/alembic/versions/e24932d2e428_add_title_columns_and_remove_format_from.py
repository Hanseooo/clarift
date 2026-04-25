"""add title columns and remove format from summaries

Revision ID: e24932d2e428
Revises: b1026b35181a
Create Date: 2026-04-25 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e24932d2e428"
down_revision: Union[str, Sequence[str], None] = "b1026b35181a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add title to summaries (nullable for backward compatibility)
    op.add_column("summaries", sa.Column("title", sa.Text(), nullable=True))
    # Remove format column from summaries
    op.drop_column("summaries", "format")
    # Add title to quizzes (nullable for backward compatibility)
    op.add_column("quizzes", sa.Column("title", sa.Text(), nullable=True))


def downgrade() -> None:
    # Reverse order
    op.drop_column("quizzes", "title")
    op.add_column(
        "summaries",
        sa.Column("format", sa.Text(), nullable=False, server_default="bullet"),
    )
    op.drop_column("summaries", "title")
