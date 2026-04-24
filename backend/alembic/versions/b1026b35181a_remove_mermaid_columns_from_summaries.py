"""remove mermaid columns from summaries

Revision ID: b1026b35181a
Revises: e4807cf4e66e
Create Date: 2026-04-25 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1026b35181a"
down_revision: Union[str, Sequence[str], None] = "e4807cf4e66e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("summaries", "diagram_syntax")
    op.drop_column("summaries", "diagram_type")


def downgrade() -> None:
    op.add_column("summaries", sa.Column("diagram_syntax", sa.Text(), nullable=True))
    op.add_column("summaries", sa.Column("diagram_type", sa.Text(), nullable=True))
